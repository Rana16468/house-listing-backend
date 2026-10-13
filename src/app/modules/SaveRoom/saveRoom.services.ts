import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import status from "http-status";
import { prisma } from "../../../prisma";
import catchError from "../../errors/catchError";
import AppError from "../../errors/AppError";
import { QueryBuilder, QueryParams, meta } from "../../builder/QueryBuilder";
import { cacheAside, invalidateCacheDomains } from "../../redis/cache";
import { cacheKeys, cacheTtlSeconds } from "../../redis/cacheKeys";

const saveRoomIntoDb = async (userId: string, listRoomId: string) => {
  try {
    const room = await prisma.listRoom.findFirst({
      where: { id: listRoomId, isDeleted: false },
      select: { id: true },
    });

    if (!room) {
      throw new AppError(status.NOT_FOUND, "Room listing not found.");
    }

    const existingSave = await prisma.saveRoom.findUnique({
      where: {
        userId_listRoomId: { userId, listRoomId },
      },
      select: { id: true, isDeleted: true },
    });

    if (existingSave && !existingSave.isDeleted) {
      throw new AppError(
        status.CONFLICT,
        "This room is already saved by the user.",
      );
    }

    const result = existingSave
      ? await prisma.saveRoom.update({
          where: { id: existingSave.id },
          data: { isDeleted: false },
        })
      : await prisma.saveRoom.create({
          data: { userId, listRoomId },
        });
    await invalidateCacheDomains("saved-rooms");
    return result;
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        status.CONFLICT,
        "This room is already saved by the user.",
      );
    }
    throw catchError(error, "Failed to save room into database");
  }
};

const findSavedRoomsByUserIdIntoDb = async (
  userId: string,
  queryParams: QueryParams = {},
) => {
  try {
    const query = new QueryBuilder(queryParams);
    query.scope({ userId, isDeleted: false });
    const builtQuery = query.build("createdAt");

    return await cacheAside(
      "saved-rooms",
      cacheKeys.savedRooms.byUser(userId, queryParams),
      cacheTtlSeconds.list,
      async () => {
        const [savedRows, totalCount] = await prisma.$transaction([
          prisma.saveRoom.findMany({
            where: builtQuery.where as Prisma.SaveRoomWhereInput,
            select: {
              id: true,
              listRoomId: true,
              createdAt: true,
              user: { select: { name: true, photo: true } },
            },
            skip: builtQuery.skip,
            take: builtQuery.take,
            orderBy: builtQuery.orderBy,
          }),
          prisma.saveRoom.count({
            where: builtQuery.where as Prisma.SaveRoomWhereInput,
          }),
        ]);

        const rooms = await prisma.listRoom.findMany({
          where: {
            id: { in: savedRows.map((saved) => saved.listRoomId) },
            isDeleted: false,
          },
          select: {
            id: true,
            address: true,
            area: true,
            types: true,
            description: true,
            neighborhood: true,
            photos: true,
            createdAt: true,
          },
        });
        const roomsById = new Map(rooms.map((room) => [room.id, room]));

        return {
          meta: meta(totalCount, builtQuery),
          data: savedRows.flatMap((saved) => {
            const listRoom = roomsById.get(saved.listRoomId);
            return listRoom ? [{ ...saved, listRoom }] : [];
          }),
        };
      },
    );
  } catch (error) {
    throw catchError(error, "Failed to find saved rooms");
  }
};

const deleteSavedRoomIntoDb = async (userId: string, listRoomId: string) => {
  try {
    const existingSave = await prisma.saveRoom.findUnique({
      where: {
        userId_listRoomId: { userId, listRoomId },
      },
      select: { id: true, isDeleted: true },
    });

    if (!existingSave || existingSave.isDeleted) {
      throw new AppError(
        status.NOT_FOUND,
        "This room is not saved by the user.",
      );
    }

    await prisma.saveRoom.delete({
      where: { id: existingSave.id },
    });
    await invalidateCacheDomains("saved-rooms");
    return true;
  } catch (error) {
    throw catchError(error, "Failed to delete saved room");
  }
};

const SaveRoomService = {
  saveRoomIntoDb,
  findSavedRoomsByUserIdIntoDb,
  deleteSavedRoomIntoDb,
};

export default SaveRoomService;
