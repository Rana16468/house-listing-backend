import { Prisma, ReportType } from "@prisma/client";
import status from "http-status";
import { prisma } from "../../../prisma";
import AppError from "../../errors/AppError";
import catchError from "../../errors/catchError";
import { cacheAside, invalidateCacheDomains } from "../../redis/cache";
import { cacheKeys, cacheTtlSeconds } from "../../redis/cacheKeys";

interface ReportRoomQuery {
  roomId?: string;
  reportType?: ReportType;
  page?: number;
  limit?: number;
}

const createReportRoomIntoDb = async (
  userId: string,
  roomId: string,
  reportType: ReportType,
) => {
  try {

    const [room, existingReport] = await Promise.all([
      prisma.listRoom.findUnique({
        where: { id: roomId },
        select: { id: true, isDeleted: true },
      }),
      prisma.reportRoom.findFirst({
        where: {
          roomId,
          userId,
          isDeleted: false, // আপনার স্কিমার ফিল্ড অনুযায়ী 'sDeleted' ব্যবহার করা হয়েছে
        },
        select: { id: true },
      }),
    ]);


    if (!room || room.isDeleted) {
      throw new AppError(status.NOT_FOUND, "Room listing not found.");
    }


    if (existingReport) {
      return {
        success: false,
        message: "You have already submitted a report for this room.",
      };
    }

    const report = await prisma.reportRoom.create({
      data: {
        userId,
        roomId,
        reportType

      },
    });

    invalidateCacheDomains("report-rooms").catch((err) => {
      console.error("Cache invalidation failed:", err);
    });

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw catchError(error, "Failed to create room report");
  }
};

const findReportRoomsIntoDb = async (query: ReportRoomQuery) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  const skip = (page - 1) * limit;
  const where: Prisma.reportRoomWhereInput = {
    isDeleted: false,
    ...(query.roomId ? { roomId: query.roomId } : {}),
    ...(query.reportType ? { reportType: query.reportType } : {}),
  };

  return cacheAside(
    "report-rooms",
    cacheKeys.reportRooms.list(query),
    cacheTtlSeconds.list,
    async () => {
      const [data, totalCount] = await prisma.$transaction([
        prisma.reportRoom.findMany({
          where,
          select: {
            id: true,
            roomId: true,
            userId: true,
            reportType: true,
            listRooms: {
              select: {
                id: true,
                address: true,
                area: true,
                types: true,
                neighborhood: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                photo: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { id: "desc" },
        }),
        prisma.reportRoom.count({ where }),
      ]);

      return {
        meta: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        data,
      };
    },
  );
};

const ReportRoomService = {
  createReportRoomIntoDb,
  findReportRoomsIntoDb,
};

export default ReportRoomService;
