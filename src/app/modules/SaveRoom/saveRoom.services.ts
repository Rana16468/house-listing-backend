import status from "http-status";
import { prisma } from "../../../prisma";
import catchError from "../../errors/catchError";
import AppError from "../../errors/AppError";
import { meta, QueryBuilder, QueryParams } from "../../builder/QueryBuilder";
import { cacheAside, invalidateCacheDomains } from "../../redis/cache";
import { cacheKeys, cacheTtlSeconds } from "../../redis/cacheKeys";


const saveRoomIntoDb = async (userId: string, listRoomId: string) => {
    try {
        const existingSave = await prisma.saveRoom.findUnique({
            where: {
                userId_listRoomId: {
                    userId,
                    listRoomId,

                }
            },
            select: {
                id: true,
            }
        });

        if (existingSave) {
            throw new AppError(status.NOT_EXTENDED, "This room is already saved by the user.");
        }

        await invalidateCacheDomains("saved-rooms");
        await prisma.saveRoom.create({
            data: {
                userId,
                listRoomId
            }
        }).catch((error) => {
            if (error.code === 'P2002') {
                throw new AppError(status.CONFLICT, "This room is already saved by the user.");
            }
            throw catchError(error, "Failed to save room into database");
        });
        await invalidateCacheDomains("saved-rooms");

    } catch (error) {
        throw catchError(error, "Failed to save room into database");
    }
};

const findSavedRoomsByUserIdIntoDb = async (
    userId: string,
    queryParams: QueryParams = {}
) => {
    try {

        const queryBuilder = new QueryBuilder(queryParams);

        queryBuilder.scope({
            userId,
            listRoom: {
                isDeleted: false,
            },
        });

        const query = queryBuilder.build('createdAt');
        return await cacheAside(
            "saved-rooms",
            cacheKeys.savedRooms.byUser(userId, queryParams),
            cacheTtlSeconds.list,
            async () => {
                const [savedRooms, totalCount] = await prisma.$transaction([
                    prisma.saveRoom.findMany({
                        where: query.where,
                        select: {
                            id: true,
                            createdAt: true,
                            listRoom: {
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
                                },
                            },
                            user: {
                                select: { name: true, photo: true },
                            },
                        },
                        skip: query.skip,
                        take: query.take,
                        orderBy: query.orderBy,
                    }),
                    prisma.saveRoom.count({ where: query.where }),
                ]);
                return {
                    meta: meta(totalCount, query),
                    data: savedRooms,
                };
            }
        );
    } catch (error) {
        throw catchError(error, "Failed to find saved rooms");
    }
};

const deleteSavedRoomIntoDb = async (userId: string, listRoomId: string) => {
    try {

        const existingSave = await prisma.saveRoom.findFirst({
            where: {
                userId,
                id: listRoomId


            }
        });

        if (!existingSave) {
            throw new AppError(status.NOT_FOUND, "This room is not saved by the user.");
        }

        await invalidateCacheDomains("saved-rooms");
        await prisma.saveRoom.delete({
            where: {
                userId,
                id: listRoomId
            }
        });
        await invalidateCacheDomains("saved-rooms");
    } catch (error) {
        throw catchError(error, "Failed to delete saved room");
    }
};

const SaveRoomService = {
    saveRoomIntoDb,
    findSavedRoomsByUserIdIntoDb,
    deleteSavedRoomIntoDb
}
export default SaveRoomService;
