import httpStatus from 'http-status';
import { Post, Prisma, RentalCategory, TenantType } from "@prisma/client";
import argon2 from 'argon2';
import { prisma } from "../../../prisma";
import catchError from "../../errors/catchError";
import { sendMultipleFilesToCloudinary } from "../../utils/Cloudinary/sendFileToCloudinary";
import AppError from "../../errors/AppError";
import config from '../../config';

import { meta, QueryBuilder, QueryParams } from '../../builder/QueryBuilder';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import deleteFileFromCloudinary from '../../utils/Cloudinary/deleteFileFromCloudinary';
// ⚠️ পাথটা আপনার Redis cache ফাইলের আসল লোকেশন অনুযায়ী ঠিক করে নিন
import { cacheAside } from '../../redis/cache';
import { cacheKeys, cacheTtlSeconds } from '../../redis/cacheKeys';
import { incrementCacheVersion } from '../../redis/redis';

/**
 * কোনো post create/update/delete হলে DB write সফল হওয়ার পর এটা কল করতে হবে।
 * এটা await করা হয়, তাই response ফেরার আগেই পুরোনো cache মুছে যায়
 * এবং পরের GET সরাসরি নতুন ডাটা পায়।
 */
const invalidatePostCache = async () => incrementCacheVersion('posts');

/* -------------------------------------------------------------------------- */
/*  Create                                                                    */
/* -------------------------------------------------------------------------- */

const houseListingIntoDb = async (payload: Post) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todayPostCount = await prisma.post.count({
            where: {
                deviceId: payload.deviceId,
                isDelete: false,
                createdAt: {
                    gte: startOfToday,
                },
            },
        });


        if (todayPostCount >= config.house_listing) {
            throw new AppError(httpStatus.NOT_EXTENDED, 'Daily limit reached! You can only create up to 5 posts per day from this device', '')
        }

        if (payload.pin) {
            const hashedPin = await argon2.hash(payload.pin.toString(), {
                type: argon2.argon2id,
                memoryCost: 2 ** 16,
                timeCost: 3,

            });
            payload.pin = hashedPin;
        } else {
            throw new AppError(httpStatus.BAD_REQUEST, "PIN is required for creating a post");
        }

        if (payload.images && payload.images.length > 0) {
            const uploadedUrls = await sendMultipleFilesToCloudinary(payload.images, "house-listings");
            payload.images = uploadedUrls;
        }
        await invalidatePostCache();
        const result = await prisma.post.create({
            data: payload,
        }).catch((error) => {
            throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create post record', error);
        })

        await invalidatePostCache();

        return {
            status: true,
            message: "Successfully recorded",
            data: {
                id: result.id,
                createdAt: result.createdAt,
            },
        };
    } catch (error) {
        throw catchError(error, "Issues caused by the house listing post section");
    }
};

export interface IFilterQuery {
    searchTerm?: string;
    division?: string;
    district?: string;
    thana?: string;
    area?: string;
    category?: string;
    tenantType?: string;
    minRent?: string | number;
    maxRent?: string | number;
    fromDate?: string;
    toDate?: string;
    page?: string | number;
    limit?: string | number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;


const SORTABLE_FIELDS = ["createdAt", "updatedAt", "availableFrom"] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;

/* -------------------------------------------------------------------------- */
/*  Sanitising helpers                                                        */
/* -------------------------------------------------------------------------- */

/** "", null, undefined and the strings "null" / "undefined" all mean "not provided". */
const clean = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined;
    const str = String(value).trim();
    return ["", "null", "undefined"].includes(str.toLowerCase()) ? undefined : str;
};

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Maps user input onto a real Prisma enum value.
 * Matching ignores case, spaces, dashes and underscores, so "family only",
 * "Family-Only" and "FAMILY_ONLY" all resolve to FAMILY_ONLY.
 * Returns undefined for "all" or anything that is not a valid enum value.
 */
const toEnum = <T extends Record<string, string>>(
    enumObj: T,
    value: unknown,
): T[keyof T] | undefined => {
    const input = clean(value);
    if (!input || input.toLowerCase() === "all") return undefined;

    const target = normalise(input);
    return Object.values(enumObj).find((option) => normalise(option) === target) as
        | T[keyof T]
        | undefined;
};

const toNumber = (value: unknown): number | undefined => {
    const input = clean(value);
    if (input === undefined) return undefined;
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const toIsoDate = (value: unknown): string | undefined => {
    const input = clean(value);
    return input && ISO_DATE_REGEX.test(input) ? input : undefined;
};

/* -------------------------------------------------------------------------- */
/*  Service                                                                   */
/* -------------------------------------------------------------------------- */

const findByHouseListDb = async (query: IFilterQuery) => {
    try {
        // ---- Sanitise input -------------------------------------------------
        const searchTerm = clean(query.searchTerm);
        const division = clean(query.division);
        const district = clean(query.district);
        const thana = clean(query.thana);
        const area = clean(query.area);

        const category = toEnum(RentalCategory, query.category);
        const tenantType = toEnum(TenantType, query.tenantType);

        let minRent = toNumber(query.minRent);
        let maxRent = toNumber(query.maxRent);
        if (minRent !== undefined && maxRent !== undefined && minRent > maxRent) {
            [minRent, maxRent] = [maxRent, minRent];
        }

        const fromDate = toIsoDate(query.fromDate);
        const toDate = toIsoDate(query.toDate);

        const pageNumber = Math.max(1, Math.floor(toNumber(query.page) ?? 1));
        const limitNumber = Math.min(
            MAX_LIMIT,
            Math.max(1, Math.floor(toNumber(query.limit) ?? DEFAULT_LIMIT)),
        );
        const skip = (pageNumber - 1) * limitNumber;

        const sortBy: SortableField = SORTABLE_FIELDS.includes(query.sortBy as SortableField)
            ? (query.sortBy as SortableField)
            : "createdAt";
        const sortOrder: Prisma.SortOrder = query.sortOrder === "asc" ? "asc" : "desc";

        // ---- Build the where clause (only with filters that were provided) ---
        const andConditions: Prisma.PostWhereInput[] = [{ isDelete: false }];

        // 1. Partial text search across scalar and embedded location fields
        if (searchTerm) {
            const contains = { contains: searchTerm, mode: "insensitive" as const };
            andConditions.push({
                OR: [
                    { title: contains },
                    { description: contains },
                    { address: contains },
                    { location: { is: { division: contains } } },
                    { location: { is: { district: contains } } },
                    { location: { is: { thana: contains } } },
                    { location: { is: { area: contains } } },
                ],
            });
        }

        // 2. Location filters: one combined `is` block containing only provided fields
        const locationIs: Record<string, { equals: string; mode: "insensitive" }> = {};
        if (division) locationIs.division = { equals: division, mode: "insensitive" };
        if (district) locationIs.district = { equals: district, mode: "insensitive" };
        if (thana) locationIs.thana = { equals: thana, mode: "insensitive" };
        if (area) locationIs.area = { equals: area, mode: "insensitive" };

        if (Object.keys(locationIs).length > 0) {
            andConditions.push({ location: { is: locationIs } });
        }

        // 3. Enum filters (skipped for "all" or invalid values)
        if (category) andConditions.push({ category });
        if (tenantType) andConditions.push({ tenantType });

        // 4. Rent range on embedded utilities.baseRent
        if (minRent !== undefined || maxRent !== undefined) {
            const baseRent: { gte?: number; lte?: number } = {};
            if (minRent !== undefined) baseRent.gte = minRent;
            if (maxRent !== undefined) baseRent.lte = maxRent;
            andConditions.push({ utilities: { is: { baseRent } } });
        }

        // 5. Available-from date range (string comparison on ISO dates)
        if (fromDate || toDate) {
            const availableFrom: { gte?: string; lte?: string } = {};
            if (fromDate) availableFrom.gte = fromDate;
            if (toDate) availableFrom.lte = toDate;
            andConditions.push({ availableFrom });
        }

        const where: Prisma.PostWhereInput = { AND: andConditions };
        const orderBy: Prisma.PostOrderByWithRelationInput = { [sortBy]: sortOrder };

        // ---- Cache key: sanitise করা ভ্যালু থেকে, যাতে "Dhaka" / "dhaka " / "null"
        //      এর মতো আলাদা raw input থেকেও একই key তৈরি হয় ----------------------
        const cacheKey = cacheKeys.posts.list({
                    searchTerm,
                    division,
                    district,
                    thana,
                    area,
                    category,
                    tenantType,
                    minRent,
                    maxRent,
                    fromDate,
                    toDate,
                    pageNumber,
                    limitNumber,
                    sortBy,
                    sortOrder,
                });

        // ---- Query (cached) -------------------------------------------------
        return await cacheAside('posts', cacheKey, cacheTtlSeconds.list, async () => {
            const [result, total] = await Promise.all([
                prisma.post.findMany({
                    where,
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        category: true,
                        location: true,
                        utilities: true,
                        contact: true,
                        tenantType: true,
                        parking: true,
                        address: true,
                        liveLocationUrl: true,
                        images: true,
                        availableFrom: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    skip,
                    take: limitNumber,
                    orderBy,
                }),
                prisma.post.count({ where }),
            ]);

            return {
                meta: {
                    page: pageNumber,
                    limit: limitNumber,
                    total,
                    totalPage: Math.ceil(total / limitNumber),
                },
                data: result,
            };
        });
    } catch (error) {
        throw catchError(error, "Issues caused by the house listing fetch section");
    }
};





const findBySpecifcHouseInfoIntoDb = async (id: string) => {

    try {

        return await cacheAside('posts', cacheKeys.posts.detail(id), cacheTtlSeconds.detail, () =>
            prisma.post.findFirst({
                where: {
                    id: id,
                    isDelete: false
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    category: true,
                    location: true,
                    utilities: true,
                    contact: true,
                    tenantType: true,
                    parking: true,
                    address: true,
                    liveLocationUrl: true,
                    images: true,
                    availableFrom: true,
                    createdAt: true,
                    updatedAt: true
                }
            })
        );

    }
    catch (error) {
        throw catchError(error, "Issues caused by the specific  house listing fetch section");
    }
};



// Field selection object (Sensitive PIN বাদ দিয়ে পাঠানো হচ্ছে)
const houseListingSelectFields = {
    id: true,
    title: true,
    description: true,
    category: true,
    location: true,
    utilities: true,
    contact: true,
    tenantType: true,
    parking: true,
    address: true,
    liveLocationUrl: true,
    images: true,
    availableFrom: true,
    createdAt: true,
    updatedAt: true,
};

const findMyHouseListingIntoDb = async (
    deviceId: string,
    query: QueryParams = {}
) => {
    try {

        // deviceId + পুরো query মিলিয়ে key → এক ডিভাইসের cache আরেক ডিভাইসে মিশবে না
        const cacheKey = cacheKeys.posts.byDevice(deviceId, query);

        return await cacheAside('posts', cacheKey, cacheTtlSeconds.list, async () => {
            const queryBuilder = new QueryBuilder(query)
                .search(['title', 'description', 'address'])
                .filter(['category', 'tenantType'])
                .scope({
                    deviceId,
                    isDelete: false,
                });


            const builtQuery = queryBuilder.build('createdAt');


            const [result, total] = await Promise.all([
                prisma.post.findMany({
                    where: builtQuery.where,
                    orderBy: builtQuery.orderBy,
                    skip: builtQuery.skip,
                    take: builtQuery.take,
                    select: houseListingSelectFields,
                }),
                prisma.post.count({
                    where: builtQuery.where,
                }),
            ]);


            return {
                meta: meta(total, builtQuery),
                data: result,
            };
        });
    } catch (error) {
        throw catchError(
            error,
            'Issues caused by the specific house listing fetch section'
        );
    }
};

const softDeleteMyHouseListingIntoDb = async (
    id: string,
    deviceId: string
): Promise<boolean> => {
    try {

        const houseListing = await prisma.post.findFirst({
            where: {
                id,
                deviceId,
                isDelete: false,
            },
            select: {
                images: true,
            },
        });

        // আগে null চেক (আগের কোডে null-এর উপর .images পড়া হতো, তাই crash করত)
        if (!houseListing) {
            throw new Error("Listing not found or unauthorized device access.");
        }

        await invalidatePostCache();
        const result = await prisma.post.updateMany({
            where: {
                id,
                deviceId,
                isDelete: false,
            },
            data: {
                isDelete: true,
                updatedAt: new Date(),
            },
        });
        if (result.count === 0) {
            throw new Error("Listing already deleted or updated by another request.");
        }

        await invalidatePostCache();

        // DB আপডেট সফল হওয়ার পরই Cloudinary থেকে ছবি মুছবে (background)
        if (houseListing.images && houseListing.images.length > 0) {
            Promise.all(
                houseListing.images.map((imageUrl: string) =>
                    deleteFileFromCloudinary(imageUrl)
                )
            ).catch((err) =>
                console.error("Background Cloudinary Cleanup Error:", err)
            );
        }

        return true;
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            throw catchError(
                error,
                "Database operational failure while deleting the house listing."
            );
        }

        throw catchError(
            error,
            error instanceof Error ? error.message : "Failed to soft-delete the house listing."
        );
    }
};

const liveReasigonRequiringAttentionIntoDb = async () => {
    try {
        return await cacheAside('posts', cacheKeys.posts.regions(), cacheTtlSeconds.aggregate, () =>
            prisma.post.aggregateRaw({
                pipeline: [
                    // ১. null/undefined বা খালি লোকেশন এবং ডিলিট হওয়া পোস্ট বাদ দিয়ে শুধু ভ্যালিড ডাটা প্রসেস করা (Performance Boost)
                    //    ⚠️ isDelete ফিল্টার আগে ছিল না, তাই ডিলিট করা পোস্টও কাউন্টে ধরা হতো
                    {
                        $match: {
                            isDelete: { $ne: true },
                            "location.division": { $exists: true, $ne: null },
                            "location.district": { $exists: true, $ne: null },
                            "location.thana": { $exists: true, $ne: null }
                        }
                    },
                    // ২. Thana, District এবং Division অনুযায়ী প্রথম গ্রুপিং
                    {
                        $group: {
                            _id: {
                                division: "$location.division",
                                district: "$location.district",
                                thana: "$location.thana"
                            },
                            thanaCount: { $sum: 1 }
                        }
                    },
                    // ৩. Thana গুলোকে District লেভেলে গ্রুপিং
                    {
                        $group: {
                            _id: {
                                division: "$_id.division",
                                district: "$_id.district"
                            },
                            totalPosts: { $sum: "$thanaCount" },
                            thanas: {
                                $push: {
                                    thana: "$_id.thana",
                                    totalPosts: "$thanaCount"
                                }
                            }
                        }
                    },
                    // ৪. District গুলোকে Division লেভেলে গ্রুপিং
                    {
                        $group: {
                            _id: "$_id.division",
                            totalPosts: { $sum: "$totalPosts" },
                            districts: {
                                $push: {
                                    district: "$_id.district",
                                    totalPosts: "$totalPosts",
                                    thanas: "$thanas"
                                }
                            }
                        }
                    },
                    // ৫. রেজাল্ট ডিসেন্ডিং অর্ডারে সাজানো (সবচেয়ে বেশি পোস্ট থাকা ডিভিশন আগে থাকবে)
                    {
                        $sort: { totalPosts: -1 }
                    },
                    // ৬. ফাইনাল আউটপুট ফরম্যাটিং
                    {
                        $project: {
                            _id: 0,
                            division: "$_id",
                            totalPosts: 1,
                            districts: 1
                        }
                    }
                ],
                // ৭. RAM Overflown হওয়া ঠেকাতে ডিস্ক ব্যবহারের পারমিশন দেওয়া (কোটি ডাটায় আবশ্যক)
                options: {
                    allowDiskUse: true
                }
            })
        );

    } catch (error) {
        throw catchError(
            error,
            error instanceof Error ? error.message : "Failed to fetch aggregated location data."
        );
    }
};







const PostServices = {
    houseListingIntoDb,
    findByHouseListDb,
    findBySpecifcHouseInfoIntoDb,
    findMyHouseListingIntoDb,
    softDeleteMyHouseListingIntoDb,
    liveReasigonRequiringAttentionIntoDb
};

export default PostServices;