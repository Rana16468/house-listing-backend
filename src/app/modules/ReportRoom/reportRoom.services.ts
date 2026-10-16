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
  roomId: string,
  reportType: ReportType,
  ipAddress: string
) => {
  try {
    // ১. রুম ভ্যালিডেশন এবং আগের রিপোর্ট চেক একসাথে প্যারালালি রান করা (ডাটাবেজ রাউন্ড-ট্রিপ কমাতে)
    const [room, existingReport] = await Promise.all([
      prisma.listRoom.findUnique({
        where: { id: roomId },
        select: { id: true, isDeleted: true },
      }),
      prisma.reportRoom.findFirst({
        where: {
          roomId,
          ipAddress,
          isDeleted: false,
        },
        select: { id: true },
      }),
    ]);

    // ২. রুম না থাকলে বা ডিলিট হয়ে গেলে দ্রুত থ্রো করা
    if (!room || room.isDeleted) {
      throw new AppError(status.NOT_FOUND, "Room listing not found.");
    }

    // ৩. ডুপ্লিকেট রিপোর্ট চেক
    if (existingReport) {
      return {
        success: false,
        message: "You have already submitted a report for this room.",
      };
    }

    // ৪. ট্রানজ্যাকশন ব্যবহার করে এক সাথে রিপোর্ট ক্রিয়েট এবং কাউন্ট আপডেট করা
    const report = await prisma.$transaction(async (tx) => {
      
      await tx.listRoom.update({
        where: { id: roomId },
        data: {
          reportCount: {
            increment: 1,
          },
        },
      });

      
      return await tx.reportRoom.create({
        data: {
          ipAddress,
          roomId,
          reportType,
        },
      });
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
            reportType: true,
            ipAddress: true,
            listRooms: {
              select: {
                id: true,
                address: true,
                area: true,
                types: true,
                neighborhood: true,
              },
            }
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
