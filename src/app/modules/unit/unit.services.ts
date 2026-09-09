import { meta, QueryBuilder, QueryParams } from "../../builder/QueryBuilder";
import config from "../../config";
import AppError from "../../errors/AppError";
import catchError from "../../errors/catchError";
import { jwtHelpers } from "../../helper/jwtHelpers";
import prisma from "../../shared/prisma";
import { IUnit } from "./unit.interface";
import httpStatus from 'http-status'

const recordedUnitIntoDb = async (userId: string, payload: IUnit) => {

    try {
        const isExistProperty = await prisma.property.findUnique({
            where: {
                id: payload.propertyId,

            },
        });

        if (!isExistProperty) {
            throw new AppError(httpStatus.NOT_FOUND, 'Property not found!');
        }


        if (payload.parentUnitId) {
            const parentUnit = await prisma.unit.findUnique({
                where: { id: payload.parentUnitId, isDeleted: false },
            });

            if (!parentUnit) {
                throw new AppError(httpStatus.NOT_FOUND, 'Parent unit not found!');
            }
        }
        const { id } = jwtHelpers.verifyToken(payload.currentSubToken, config.jwt_access_secret as string)
        // ৩. ডাটাবেজে ইউনিট তৈরি করা
        const result = await prisma.unit.create({
            data: {
                propertyId: payload.propertyId,
                parentUnitId: payload.parentUnitId ?? null,
                name: payload.name,
                type: payload.type,
                seats: payload.seats ?? null,
                baseRent: payload.baseRent,
                landlordId: userId,
                currentSubId: id,
                status: payload.status ?? 'VACANT',

            },
            include: {
                parentUnit: true,
                subUnits: true,
            },
        });

        return result;

    }
    catch (error) {
        throw catchError(error)
    }
};

const getAllUnitsFromDb = async (query: QueryParams, landlordId: string) => {
    if (!query.currentSubToken) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired sub token');
    }

    const decoded = jwtHelpers.verifyToken(
        query.currentSubToken as string,
        config.jwt_access_secret as string
    );

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // ১. ডাইরেক্ট প্রপার্টি লেভেল Dynamic Where Clause (Database-level)
    const propertyWhere: any = {
        isDeleted: false,
        landlordId: landlordId,
        currentSubId: decoded.id,
    };

    if (query.propertyId) {
        propertyWhere.id = query.propertyId as string;
    }

    // ২. ইউনিট লেভেল Dynamic Where Clause (Nested Level Filter)
    const unitWhere: any = {
        isDeleted: false,
        parentUnitId: null, // শুধুমাত্র Top-Level Units (Flat/Office)
    };

    if (query.status) unitWhere.status = query.status;
    if (query.type) unitWhere.type = query.type;
    if (query.baseRent) unitWhere.baseRent = Number(query.baseRent);
    if (query.seats) unitWhere.seats = Number(query.seats);

    if (query.searchTerm) {
        unitWhere.name = {
            contains: query.searchTerm as string,
            mode: 'insensitive',
        };
    }

    // ৩. ডাটাবেজ কোয়েরি (Prisma Direct Hierarchy Query)
    const [properties, totalProperties] = await Promise.all([
        prisma.property.findMany({
            where: {
                ...propertyWhere,
                // শুধুমাত্র যেসব প্রপার্টিতে ফিল্টার অনুযায়ী ইউনিট আছে সেগুলোই ফেচ করবে
                units: {
                    some: unitWhere,
                },
            },
            skip,
            take: limit,
            select: {
                id: true,
                flatName: true,
                Floor: true,
                units: {
                    where: unitWhere,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        status: true,
                        baseRent: true,
                        seats: true,
                        subUnits: {
                            where: { isDeleted: false },
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                status: true,
                                baseRent: true,
                                seats: true,
                                subUnits: {
                                    where: { isDeleted: false },
                                    select: {
                                        id: true,
                                        name: true,
                                        type: true,
                                        status: true,
                                        baseRent: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),
        prisma.property.count({
            where: {
                ...propertyWhere,
                units: {
                    some: unitWhere,
                },
            },
        }),
    ]);

    return {
        meta: {
            page,
            limit,
            totalProperties,
            totalPage: Math.ceil(totalProperties / limit),
        },
        data: properties,
    };
};

const findBySpecifcUnitIntoDb = async (id: string) => {

    try {

        return await prisma.unit.findFirstOrThrow({
            where: {
                id
            }, select: {
                id: true,
                name: true,
                type: true,
                baseRent: true,
                seats: true,
                status: true,
                createdAt: true,
                updatedAt: true
            }
        });


    }
    catch (error) {
        throw catchError(error);
    }
};

const updateUnitIntoDb = async (id: string, userId: string, payload: Partial<IUnit>) => {

    try {
        const isUnitExist = await prisma.unit.findFirst({
    where: {
      id,
      landlordId: userId,
     
    },
    select: { id: true },
  });

  if (!isUnitExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Unit not found or unauthorized access');
  }

        await prisma.unit.update({
            where: { id, landlordId: userId },
            data: payload
        }).catch(error => {
            throw new AppError(httpStatus.INTERNAL_SERVER_ERROR,
                'issues by the unit update section', error);

        })


    }
    catch (error) {
        throw catchError(error);
    }
}
const UnitService = {
    recordedUnitIntoDb,
    getAllUnitsFromDb,
    findBySpecifcUnitIntoDb,
    updateUnitIntoDb
}

export default UnitService
