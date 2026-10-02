

import { GasSupply, ListRoom, ParkingSpace, Prisma, PropertyCategory } from "@prisma/client";
import { IListRoomInput } from "./listRoom.interface";
import { prisma } from "../../../prisma";
import AppError from "../../errors/AppError";
import httpStatus, { status } from 'http-status'
import { sendMultipleFilesToCloudinary } from "../../utils/Cloudinary/sendFileToCloudinary";
import catchError from "../../errors/catchError";
import deleteFileFromCloudinary from "../../utils/Cloudinary/deleteFileFromCloudinary";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { meta, QueryBuilder, QueryParams } from "../../builder/QueryBuilder";
import { cacheAside, invalidateCacheDomains } from "../../redis/cache";
import { cacheKeys, cacheTtlSeconds } from "../../redis/cacheKeys";

const createRoomListingIntoDb = async (
    payload: IListRoomInput,
    userId: string
): Promise<ListRoom> => {
    try {

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todayListingsCount = await prisma.listRoom.count({
            where: {
                userId: userId,
                isDeleted: false,
                createdAt: {
                    gte: startOfToday,
                },
            },
        });

        if (todayListingsCount >= 5) {
            throw new AppError(
                httpStatus.TOO_MANY_REQUESTS,
                "You have reached the limit of 5 room listings per day."
            );
        }

        // ২. payload.photos এর ভেতর থাকা ফাইল প্যাথগুলোকে Cloudinary-তে আপলোড করা
        let finalPhotoUrls: string[] = [];

        if (payload.photos && payload.photos.length > 0) {
            finalPhotoUrls = await sendMultipleFilesToCloudinary(
                payload.photos,
                "room-listings"
            );
        }

        if (finalPhotoUrls.length === 0) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                "At least one room photo is required."
            );
        }

        await invalidateCacheDomains("rooms");
        // ৩. ডাটাবেজে রুম লিস্টিং রেকর্ড তৈরি করা
        const result = await prisma.listRoom.create({
            data: {
                address: payload.address,
                availableFrom: new Date(payload.availableFrom),
                category: payload.category,
                contactNumber: payload.contactNumber,
                description: payload.description,
                gasSupply: payload.gasSupply || null,
                location: payload.location,
                parkingSpace: payload.parkingSpace || "NotSpecified",
                photos: finalPhotoUrls, // ডাটাবেজে সরাসরি Cloudinary URL সেভ হবে
                rent: Number(payload.rent),
                serviceCharge: payload.serviceCharge ? Number(payload.serviceCharge) : null,
                waterBill: payload.waterBill || "Optional",
                userId: userId,
            },
        });

        await invalidateCacheDomains("rooms");
        return result;
    } catch (error) {
        throw catchError(error, "Error occurred while creating room listing");
    }
};

export interface IRoomQueryFilters {
    search?: string;
    maxRent?: string | number;
    parking?: string | boolean;
    gas?: string | boolean;
    category?: PropertyCategory;
    startDate?: string;
    endDate?: string;
    page?: string | number;
    limit?: string | number;
}

const findByAllListIntoDb = async (queryParams: IRoomQueryFilters) => {
    const {
        search,
        maxRent,
        parking,
        gas,
        category,
        startDate,
        endDate,
        page = 1,
        limit = 10,
    } = queryParams;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    // dynamic conditions array mapping
    const AND_conditions: Prisma.ListRoomWhereInput[] = [
        { isDeleted: false }
    ];

    if (search && search.trim() !== '') {
        const searchString = search.trim();
        AND_conditions.push({
            OR: [
                { location: { contains: searchString, mode: 'insensitive' } },
                { address: { contains: searchString, mode: 'insensitive' } },
            ],
        });
    }

    if (maxRent !== undefined && maxRent !== '' && !isNaN(Number(maxRent))) {
        AND_conditions.push({
            rent: { lte: Number(maxRent) },
        });
    }


    if (category && Object.values(PropertyCategory).includes(category)) {
        AND_conditions.push({ category });
    }

    if (parking !== undefined && parking !== '' && parking !== null) {
        const isParkingTrue = parking === true || parking === 'true';
        if (isParkingTrue) {
            AND_conditions.push({
                parkingSpace: ParkingSpace.Available,
            });
        }
    }

    if (gas !== undefined && gas !== '' && gas !== null) {
        const isGasTrue = gas === true || gas === 'true';
        if (isGasTrue) {
            AND_conditions.push({
                OR: [
                    { gasSupply: GasSupply.LineGas },
                    { gasSupply: GasSupply.Cylinder },
                ],
            });
        }
    }


    if (startDate || endDate) {
        const dateQuery: any = {};
        if (startDate && startDate.trim() !== '') {
            dateQuery.gte = new Date(startDate);
        }
        if (endDate && endDate.trim() !== '') {
            dateQuery.lte = new Date(endDate);
        }
        AND_conditions.push({ availableFrom: dateQuery });
    }

    const whereConditions: Prisma.ListRoomWhereInput = {
        AND: AND_conditions,
    };

    // Database Execution with Prisma Transaction
    return cacheAside(
      "rooms",
      cacheKeys.rooms.list(queryParams),
      cacheTtlSeconds.list,
      async () => {
        const [result, totalCount] = await prisma.$transaction([
          prisma.listRoom.findMany({
            where: whereConditions,
            select: {
              id: true,
              location: true,
              // address: true,
              rent: true,
              availableFrom: true,
              photos: true,
              // category: true,
              // parkingSpace: true,
              // gasSupply: true,
              // waterBill: true,
              // serviceCharge: true,
              // contactNumber: true,
            },
            skip,
            take: limitNum,
            orderBy: {
              createdAt: 'desc',
            },
          }),
          prisma.listRoom.count({ where: whereConditions }),
        ]);

        return {
          meta: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
          },
          data: result,
        };
      }
    );
};

const findBySpecificRoomListIntoDb = async (id: string) => {

    try {

        const result = await cacheAside(
          "rooms",
          cacheKeys.rooms.detail(id),
          cacheTtlSeconds.detail,
          () => prisma.listRoom.findFirstOrThrow({
            where: { id },
            select: {
                id: true,
                location: true,
                address: true,
                rent: true,
                availableFrom: true,
                photos: true,
                category: true,
                parkingSpace: true,
                gasSupply: true,
                waterBill: true,
                serviceCharge: true,
                contactNumber: true,
                description: true,
                user: {
                    select: {
                        name: true,
                        phone: true
                    }
                }


              }
            })
          );

        return result

    }
    catch (error) {
        throw catchError(error);
    }
};

const deleteListRoomIntoDb = async (id: string, userId: string) => {
  try {
    const houseListing = await prisma.listRoom.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
        photos: true,
      },
    });

    if (!houseListing) {
      throw new AppError(
        status.NOT_FOUND,
        'Listing not found or unauthorized access.'
      );
    }

    await invalidateCacheDomains("rooms", "saved-rooms");
    await prisma.$transaction([
      prisma.saveRoom.deleteMany({
        where: {
          listRoomId: id,
        },
      }),

      prisma.listRoom.update({
        where: {
          id,
        },
        data: {
          isDeleted: true,
          updatedAt: new Date(),
        },
      }),
    ]);
    await invalidateCacheDomains("rooms", "saved-rooms");
    if (houseListing.photos && houseListing.photos.length > 0) {
      Promise.all(
        houseListing.photos.map((imageUrl: string) =>
          deleteFileFromCloudinary(imageUrl)
        )
      ).catch((err) =>
        console.error('Background Cloudinary Cleanup Error:', err)
      );
    }

    return true;
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      throw catchError(
        error,
        'Database operational failure while deleting the house listing.'
      );
    }

    throw catchError(
      error,
      error instanceof Error
        ? error.message
        : 'Failed to soft-delete the house listing.'
    );
  }
};

const findMyHouseListingsIntoDb = async (userId: string, queryParams: QueryParams) => {
  try {
    const searchableFields = ['location', 'address'];

  
    const filterableFields = ['category'];

    const queryBuilder = new QueryBuilder(queryParams)
      .search(searchableFields)
      .filter(filterableFields);

    
    const customConditions: Record<string, any> = {
      isDeleted: false,
        userId: userId, 
    };

    // Rent filter
    if (queryParams.maxRent && !isNaN(Number(queryParams.maxRent))) {
      customConditions.rent = { lte: Number(queryParams.maxRent) };
    }

    // Parking filter
    if (queryParams.parking === true || queryParams.parking === 'true') {
      customConditions.parkingSpace = ParkingSpace.Available;
    }

    // Gas filter (Not Null Check)
    if (queryParams.gas === true || queryParams.gas === 'true') {
      customConditions.gasSupply = { not: null };
    }

    // Date Range filter
    if (queryParams.startDate || queryParams.endDate) {
      const dateQuery: Record<string, Date> = {};
      if (typeof queryParams.startDate === 'string' && queryParams.startDate.trim() !== '') {
        dateQuery.gte = new Date(queryParams.startDate);
      }
      if (typeof queryParams.endDate === 'string' && queryParams.endDate.trim() !== '') {
        dateQuery.lte = new Date(queryParams.endDate);
      }
      customConditions.availableFrom = dateQuery;
    }

    // Custom conditions গুলোকে QueryBuilder-এর where অবজেক্টের সাথে মার্জ করা
    queryBuilder.scope(customConditions);

    const query = queryBuilder.build('createdAt');

    // Select specific fields for optimization
    const selectFields: Prisma.ListRoomSelect = {
      id: true,
      location: true,
      address: true,
      rent: true,
      availableFrom: true,
      photos: true,
      category: true,
      parkingSpace: true,
      gasSupply: true,
      waterBill: true,
      serviceCharge: true,
      contactNumber: true,
      description: true,

    };

    return await cacheAside(
      "rooms",
      cacheKeys.rooms.byUser(userId, queryParams),
      cacheTtlSeconds.list,
      async () => {
        const [result, totalCount] = await prisma.$transaction([
          prisma.listRoom.findMany({
            where: query.where,
            select: selectFields,
            skip: query.skip,
            take: query.take,
            orderBy: query.orderBy,
          }),
          prisma.listRoom.count({ where: query.where }),
        ]);

        return {
          meta: meta(totalCount, query),
          data: result,
        };
      }
    );
  } catch (error) {
    throw catchError(error);
  }
};

const ListRoomService = {
    createRoomListingIntoDb,
    findByAllListIntoDb,
    findBySpecificRoomListIntoDb,
    deleteListRoomIntoDb,
    findMyHouseListingsIntoDb
};

export default ListRoomService
