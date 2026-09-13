import { meta, QueryBuilder, QueryParams } from "../../builder/QueryBuilder";
import config from "../../config";
import AppError from "../../errors/AppError";
import catchError from "../../errors/catchError";
import { jwtHelpers } from "../../helper/jwtHelpers";
import prisma from "../../shared/prisma";
import { IUnit } from "./unit.interface";
import httpStatus from 'http-status'
import { getCache, setCache, deleteCache, deleteByPattern } from '../../redis/redis'; // adjust path to your redis.ts

// ---- Cache key helpers -----------------------------------------------
// Same convention as property.service.ts: one prefix, deterministic keys,
// so invalidation can never miss a key that population actually wrote.
const UNIT_CACHE_PREFIX = 'units';

const unitByIdKey = (id: string) => `${UNIT_CACHE_PREFIX}:byId:${id}`;

const unitListKey = (
    landlordId: string,
    currentSubId: string,
    params: Record<string, unknown>
) => {
    const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
            acc[key] = params[key];
            return acc;
        }, {} as Record<string, unknown>);

    return `${UNIT_CACHE_PREFIX}:list:${landlordId}:${currentSubId}:${JSON.stringify(sortedParams)}`;
};

// Matches every cached list page for a landlord regardless of subscription
// or filters — used so ANY create/update/delete by that landlord can't
// leave a stale page (wrong status, stale nested subUnits, wrong count)
// sitting in cache.
const unitListPatternForLandlord = (landlordId: string) =>
    `${UNIT_CACHE_PREFIX}:list:${landlordId}:*`;

const UNIT_LIST_TTL = 300;   // 5 min — lists change often (status flips, new units)
const UNIT_BY_ID_TTL = 600;  // 10 min — a single unit record changes less often

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

        // Invalidate AFTER the DB write succeeds — a rollback/thrown error
        // above never reaches this line, so we never clear cache for a
        // create that didn't actually happen.
        //
        // 1. Every list page for this landlord is cleared — a new unit
        //    changes counts, "some: unitWhere" matches, and nested
        //    subUnits arrays for its parent property.
        // 2. If this is a sub-unit, its parent's byId cache is cleared too,
        //    since a parent record fetched again may expose subUnits
        //    elsewhere in the future — safe to clear even if not currently
        //    selected, costs nothing and prevents drift later.
        await Promise.all([
            deleteByPattern(unitListPatternForLandlord(userId)),
            payload.parentUnitId ? deleteCache(unitByIdKey(payload.parentUnitId)) : Promise.resolve(),
        ]);

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

    const cacheKeyParams = {
        page,
        limit,
        propertyId: query.propertyId ?? '',
        status: query.status ?? '',
        type: query.type ?? '',
        baseRent: query.baseRent ?? '',
        seats: query.seats ?? '',
        searchTerm: query.searchTerm ?? '',
    };
    const cacheKey = unitListKey(landlordId, decoded.id, cacheKeyParams);

    const cached = await getCache(cacheKey);
    if (cached) {
        return cached;
    }

    // ১. প্রপার্টি লেভেল Where Clause
    const propertyWhere: any = {
        landlordId: landlordId,
        currentSubId: decoded.id,
        isDeleted: false, // 삭제된 Property বাদ দেওয়া ভালো
    };

    if (query.propertyId) {
        propertyWhere.id = query.propertyId as string;
    }

    // ২. ইউনিট লেভেল Dynamic Where Clause
    const unitWhere: any = {
        isDeleted: false,
        parentUnitId: null,
    };

    let hasUnitFilter = false; // কোনো ইউনিট ফিল্টার আছে কিনা ট্র্যাক রাখার জন্য

    if (query.status) { unitWhere.status = query.status; hasUnitFilter = true; }
    if (query.type) { unitWhere.type = query.type; hasUnitFilter = true; }
    if (query.baseRent) { unitWhere.baseRent = Number(query.baseRent); hasUnitFilter = true; }
    if (query.seats) { unitWhere.seats = Number(query.seats); hasUnitFilter = true; }

    if (query.searchTerm) {
        unitWhere.name = {
            contains: query.searchTerm as string,
            mode: 'insensitive',
        };
        hasUnitFilter = true;
    }

    // ৩. Dynamic Main Where: ফিল্টার থাকলে তবেই 'units: { some: unitWhere }' অ্যাপ্লাই হবে
    const mainWhere: any = {
        ...propertyWhere,
    };

    if (hasUnitFilter) {
        mainWhere.units = {
            some: unitWhere,
        };
    }

    // ৪. ডাটাবেজ কোয়েরি
    const [properties, totalProperties] = await Promise.all([
        prisma.property.findMany({
            where: mainWhere,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                flatName: true,
                Floor: true,
                address: true,
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
            where: mainWhere,
        }),
    ]);

    const result = {
        meta: {
            page,
            limit,
            totalProperties,
            totalPage: Math.ceil(totalProperties / limit),
        },
        data: properties,
    };

    await setCache(cacheKey, result, UNIT_LIST_TTL);

    return result;
};

const findBySpecifcUnitIntoDb = async (id: string) => {

    try {
        const cacheKey = unitByIdKey(id);

        const cached = await getCache(cacheKey);
        if (cached) {
            return cached;
        }

        const result = await prisma.unit.findFirstOrThrow({
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

        await setCache(cacheKey, result, UNIT_BY_ID_TTL);

        return result;
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
            // parentUnitId is fetched too, so we know whether a parent's
            // cache also needs to be invalidated after this update.
            select: { id: true, parentUnitId: true },
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

        // Invalidate AFTER the update resolves — never before, so a failed
        // update (caught above and rethrown) never wipes a valid cache.
        //
        // 1. This unit's own byId cache — a direct GET by id must return
        //    the new status/name/rent immediately, not the value cached
        //    before this update.
        // 2. Every list page for this landlord — status/type/rent changes
        //    can move a unit in or out of filtered list results, and the
        //    nested subUnits array embedded in property list responses
        //    would otherwise still show the old values.
        // 3. If this unit has (or had) a parentUnitId, the parent's own
        //    byId cache is cleared too, in case the parent's payload ever
        //    embeds subUnits.
        // 4. If parentUnitId itself was CHANGED by this update (unit moved
        //    to a different parent), both the old and new parent's caches
        //    are cleared.
        const newParentUnitId = payload.parentUnitId;
        const parentIdsToInvalidate = new Set<string>();
        if (isUnitExist.parentUnitId) parentIdsToInvalidate.add(isUnitExist.parentUnitId);
        if (newParentUnitId) parentIdsToInvalidate.add(newParentUnitId);

        await Promise.all([
            deleteCache(unitByIdKey(id)),
            deleteByPattern(unitListPatternForLandlord(userId)),
            ...Array.from(parentIdsToInvalidate).map((parentId) => deleteCache(unitByIdKey(parentId))),
        ]);

    }
    catch (error) {
        throw catchError(error);
    }
}

const hardDeleteUnitIntoDb = async (id: string, landlordId: string) => {

    const isUnitExist = await prisma.unit.findFirst({
        where: {
            id,
            landlordId,
        },
        // parentUnitId is needed to invalidate the parent's cache too.
        select: { id: true, parentUnitId: true },
    });

    if (!isUnitExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Unit not found or unauthorized access');
    }

    // Grab child unit ids BEFORE deleting them, purely so we know which
    // byId cache keys to clear afterward — deleteMany doesn't return the
    // rows it removed.
    const childUnits = await prisma.unit.findMany({
        where: { parentUnitId: id },
        select: { id: true },
    });

    // ২. Transaction ব্যবহার করে মূল ইউনিট এবং তার নিচের সব Sub-Units স্থায়ীভাবে ডিলিট করা
    const result = await prisma.$transaction(async (tx) => {
        // ১ম ধাপ: চাইল্ড ইউনিটগুলো (Room/Seat) আগে ডিলিট করা (Foreign Key constraint এর জন্য)
        await tx.unit.deleteMany({
            where: { parentUnitId: id },
        });

        // ২য় ধাপ: মূল প্যারেন্ট ইউনিটটি (Flat/Room) ডিলিট করা
        const deletedUnit = await tx.unit.delete({
            where: { id },
        });

        return deletedUnit;
    });

    // Invalidate AFTER the transaction commits — if it throws, we never
    // reach here and no cache is touched for a delete that didn't happen.
    //
    // A GET on a deleted unit's id must NOT return stale cached data —
    // clearing the key means the next findFirstOrThrow correctly 404s
    // instead of a stale getCache() hit resurrecting a deleted record.
    const idsToInvalidate = [id, ...childUnits.map((u) => u.id)];
    if (isUnitExist.parentUnitId) idsToInvalidate.push(isUnitExist.parentUnitId);

    await Promise.all([
        ...idsToInvalidate.map((unitId) => deleteCache(unitByIdKey(unitId))),
        deleteByPattern(unitListPatternForLandlord(landlordId)),
    ]);

    return result;
};
const UnitService = {
    recordedUnitIntoDb,
    getAllUnitsFromDb,
    findBySpecifcUnitIntoDb,
    updateUnitIntoDb,
    hardDeleteUnitIntoDb
}

export default UnitService