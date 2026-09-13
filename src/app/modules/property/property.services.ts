import { Property } from '@prisma/client';
import prisma from '../../shared/prisma';
import catchError from '../../errors/catchError';
import AppError from '../../errors/AppError';
import status from 'http-status';
import { QueryBuilder, QueryParams, meta } from '../../builder/QueryBuilder';
import { getCache, setCache, deleteByPattern } from '../../redis/redis'; // আপনার Redis হেলপার ইম্পোর্ট
import { jwtHelpers } from '../../helper/jwtHelpers';
import config from '../../config';


const createPropertyIntoDb = async (
  payload: Property & { currentSubToken: string },
  userId: string
) => {
  try {
   
    const {
      currentSubToken,
      landlordId,
      id: propertyId, // যদি আইডি রিকোয়েস্ট পে লোডে এসে থাকে তবে তা রিমুভ করার জন্য
      createdAt,
      updatedAt,
      ...propertyData
    } = payload;

    // ২. JWT Verify করে Subscription ID বের করা
    const verifiedToken = jwtHelpers.verifyToken(
      currentSubToken,
      config.jwt_access_secret as string
    ) as { planId: string, id: string  };

    const subscriptionId = verifiedToken.planId;
    
    // ৩. Prisma Transaction শুরু
    const result = await prisma.$transaction(async (tx) => {
      
      const subscription = await tx.userSubscription.findFirst({
        where: {
          id:verifiedToken.id,
          userId,
        },
        select: {
          isActive: true,
          plan: {
            select: {
              flat: true,
            },
          },
        },
      });
     

      if (!subscription) {
        throw new AppError(status.NOT_FOUND, 'Subscription not found');
      }

      if (!subscription.isActive) {
        throw new AppError(
          status.FORBIDDEN,
          'Your subscription is inactive. Please renew to continue.'
        );
      }

      // বর্তমান প্রপার্টি সংখ্যা গণনা
      const existingPropertiesCount = await tx.property.count({
        where: {
          currentSubId: subscriptionId,
          landlordId: userId,
         
        },
      });

    
      const allowedFlats = subscription.plan.flat ?? 0;

      if (existingPropertiesCount >= allowedFlats) {
        throw new AppError(
          status.FORBIDDEN,
          'Subscription limit reached. Please upgrade or renew your plan.'
        );
      }

      // ৪. নতুন প্রপার্টি তৈরি করা (Unchecked Input Pattern - Clean and Direct)
      const newProperty = await tx.property.create({
        data: {
          ...propertyData,
          landlordId: userId,
          currentSubId: verifiedToken.id,
        },
        include: {
          landlord: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          userSubscriptionPlan: true,
        },
      });

      return newProperty;
    });

    // ৫. প্রপার্টি ক্যাশ ক্লিয়ার করা
    await deleteByPattern(`properties:${userId}:*`);

    return {
      status: true,
      message: 'Property created successfully',
      data: result,
    };
  } catch (error) {
    throw catchError(error, 'Error creating property');
  }
};


const getAllPropertiesIntoDb = async (
    userId: string,
    currentSubId: string,
    query: QueryParams
) => {
    try {
        const cacheKey = `properties:${userId}:${currentSubId}:${JSON.stringify(query)}`;

        // ২. ক্যাশ চেক করা
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        const formattedQuery = { ...query };

        if (formattedQuery.Floor !== undefined && formattedQuery.Floor !== '') {
            formattedQuery.Floor = Number(formattedQuery.Floor);
        }

        const queryBuilder = new QueryBuilder(formattedQuery)
            .search(['flatName', 'address'])
            .filter(['Floor'])
            .scope({
                landlordId: userId,
                currentSubId,
                isDeleted: false,
            });

        const builtQuery = queryBuilder.build('createdAt');

        const [data, total] = await Promise.all([
            prisma.property.findMany({
                where: builtQuery.where,
                orderBy: builtQuery.orderBy,
                skip: builtQuery.skip,
                take: builtQuery.take,
                select: {
                    id: true,
                    flatName: true,
                    Floor: true,
                    address: true,
                    createdAt: true,
                    updatedAt: true,

                },
            }),
            prisma.property.count({
                where: builtQuery.where,
            }),
        ]);

        const pageMeta = meta(total, builtQuery);

        const result = {
            meta: pageMeta,
            data,
        };

        // ৩. ক্যাশে ডাটা সেভ করা (TTL: ১ ঘণ্টা / ৩৬০০ সেকেন্ড)
        await setCache(cacheKey, result, 3600);

        return result;
    } catch (error) {
        throw catchError(error, 'Failed to fetch properties');
    }
};

// 3. GET PROPERTY BY ID
const getPropertyByIdIntoDb = async (id: string, userId: string) => {
    try {
        const cacheKey = `property:${id}`;

        // ক্যাশ চেক
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        const result = await prisma.property.findFirst({
            where: {
                id,
                landlordId: userId,

            },
            select: {
                id: true,
                flatName: true,
                address: true,
                Floor: true,
                createdAt: true,
                updatedAt: true,


            },
        });

        if (!result) {
            throw new AppError(status.NOT_FOUND, 'Property not found');
        }
        await setCache(cacheKey, result, 3600);

        return result;
    } catch (error) {
        throw catchError(error);
    }
};

// 4. UPDATE PROPERTY
const updatePropertyIntoDb = async (
    id: string,
    userId: string,
    payload: Partial<Property>
) => {
    try {
        const existingProperty = await prisma.property.findFirst({
            where: {
                id,
                landlordId: userId,
                isDeleted: false,
            },
            select: { id: true },
        });

        if (!existingProperty) {
            throw new AppError(
                status.NOT_FOUND,
                'Property not found or unauthorized'
            );
        }

        await prisma.property.update({
            where: { id },
            data: payload
        }).catch(error => {
            throw new AppError(status.NOT_EXTENDED,
                'issues by the update property section ', error)
        });


        await deleteByPattern(`property:${id}`);
        await deleteByPattern(`properties:${userId}:*`);

        return {
            status: true,
            message: 'Property updated successfully',

        };
    } catch (error) {
        throw catchError(error, 'Failed to update property');
    }
};

export const PropertyService = {
    createPropertyIntoDb,
    getAllPropertiesIntoDb,
    getPropertyByIdIntoDb,
    updatePropertyIntoDb,
};