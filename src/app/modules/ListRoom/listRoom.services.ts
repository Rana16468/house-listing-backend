import { ListRoom, Prisma, PropertyCategory, Role } from "@prisma/client";
import { IListRoomInput, IUpdateListRoomInput } from "./listRoom.interface";
import { prisma } from "../../../prisma";
import AppError from "../../errors/AppError";
import status from "http-status";
import { sendMultipleFilesToCloudinary } from "../../utils/Cloudinary/sendFileToCloudinary";
import catchError from "../../errors/catchError";
import deleteFileFromCloudinary from "../../utils/Cloudinary/deleteFileFromCloudinary";
import { QueryParams } from "../../builder/QueryBuilder";
import { cacheAside, invalidateCacheDomains } from "../../redis/cache";
import { cacheKeys, cacheTtlSeconds } from "../../redis/cacheKeys";

const DAILY_LISTING_LIMIT = 5;

interface RoomQueryFilters {
  search?: string;
  area?: string;
  types?: PropertyCategory;
  neighborhood?: string;
  page?: string | number;
  limit?: string | number;
  description?: string
  address?: string
  id?: string
}

const pageOptions = (query: QueryParams) => {
  const pageValue = Number(query.page);
  const limitValue = Number(query.limit);
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const limit =
    Number.isInteger(limitValue) && limitValue > 0
      ? Math.min(limitValue, 100)
      : 10;

  return { page, limit, skip: (page - 1) * limit };
};

const roomWhere = (
  query: RoomQueryFilters,
  userId?: string,
): Prisma.ListRoomWhereInput => {
  const conditions: Prisma.ListRoomWhereInput[] = [{ isDeleted: false }];
  
  if (query.id?.trim()) {
    conditions.push({ id: query.id.trim() });
  }

  if (query.search?.trim()) {
    const search = query.search.trim();
    const matchingTypes = Object.values(PropertyCategory).filter((type) =>
      type.toLowerCase().includes(search.toLowerCase()),
    );
    conditions.push({
      OR: [
        { address: { contains: search, mode: "insensitive" } },
        { area: { contains: search, mode: "insensitive" } },
        ...(matchingTypes.length > 0 ? [{ types: { in: matchingTypes } }] : []),
        { neighborhood: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (query.area?.trim()) {
    conditions.push({
      area: { contains: query.area.trim(), mode: "insensitive" },
    });
  }

  if (query.types && Object.values(PropertyCategory).includes(query.types)) {
    conditions.push({ types: query.types });
  }

  if (query.neighborhood?.trim()) {
    conditions.push({
      neighborhood: {
        contains: query.neighborhood.trim(),
        mode: "insensitive",
      },
    });
  }

  if (userId) {
    conditions.push({ userId });
  }

  return { AND: conditions };
};

const createRoomListingIntoDb = async (
  payload: IListRoomInput,
  userId: string,
): Promise<ListRoom> => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayListingsCount = await prisma.listRoom.count({
    where: {
      userId,
      isDeleted: false,
      createdAt: { gte: startOfToday },
    },
  });

  if (todayListingsCount >= DAILY_LISTING_LIMIT) {
    throw new AppError(
      status.TOO_MANY_REQUESTS,
      `You have reached the limit of ${DAILY_LISTING_LIMIT} room listings per day.`,
    );
  }

  let uploadedPhotoUrls: string[] = [];
  let result: ListRoom;

  try {
    if (payload.photos?.length) {
      uploadedPhotoUrls = await sendMultipleFilesToCloudinary(
        payload.photos,
        "room-listings",
      );
    }

    result = await prisma.listRoom.create({
      data: {
        address: payload.address,
        area: payload.area,
        types: payload.types,
        description: payload.description,
        neighborhood: payload.neighborhood,
        photos: uploadedPhotoUrls,
        userId,
      },
    });
  } catch (error) {
    await Promise.allSettled(
      uploadedPhotoUrls.map((imageUrl) => deleteFileFromCloudinary(imageUrl)),
    );
    throw catchError(error, "Error occurred while creating room listing");
  }

  await invalidateCacheDomains("rooms");
  return result;
};

const findByAllListIntoDb = async (queryParams: QueryParams) => {
  const filters = queryParams as RoomQueryFilters;
  console.log(filters)
  const { page, limit, skip } = pageOptions(queryParams);
  const where = roomWhere(filters);

  return cacheAside(
    "rooms",
    cacheKeys.rooms.list(queryParams),
    cacheTtlSeconds.list,
    async () => {
      const [data, totalCount] = await prisma.$transaction([
        prisma.listRoom.findMany({
          where,
          select: {
            id: true,
            address: true,
            area: true,
            types: true,
            description: true,
            neighborhood: true,
            photos: true,
            viewCount: true,
            reportCount:true,
            createdAt: true,
            user: {
              select: {
                name: true,
                phone: true


              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.listRoom.count({ where }),
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

const findBySpecificRoomListIntoDb = async (id: string) => {
  try {
    return await cacheAside(
      "rooms",
      cacheKeys.rooms.detail(id),
      cacheTtlSeconds.detail,
      async () => {
        const room = await prisma.listRoom.findFirst({
          where: { id, isDeleted: false },
          select: {
            id: true,
            address: true,
            area: true,
            types: true,
            description: true,
            neighborhood: true,
            viewCount: true,
            photos: true,
            createdAt: true,
            updatedAt: true
          },
        });

        if (!room) {
          throw new AppError(status.NOT_FOUND, "Room listing not found.");
        }
        return room;
      },
    );
  } catch (error) {
    throw catchError(error, "Failed to find room listing");
  }
};

const updateRoomListingIntoDb = async (
  id: string,
  payload: IUpdateListRoomInput,
  userId: string,
  role: Role,
): Promise<ListRoom> => {
  const currentRoom = await prisma.listRoom.findFirst({
    where: {
      id,
      isDeleted: false,
      ...(role === Role.ADMIN ? {} : { userId }),
    },
    select: { photos: true },
  });

  if (!currentRoom) {
    throw new AppError(
      status.NOT_FOUND,
      "Room listing not found or unauthorized access.",
    );
  }

  let uploadedPhotoUrls: string[] = [];
  const data: Prisma.ListRoomUpdateInput = {};

  if (payload.address !== undefined) data.address = payload.address;
  if (payload.area !== undefined) data.area = payload.area;
  if (payload.types !== undefined) data.types = payload.types;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.neighborhood !== undefined)
    data.neighborhood = payload.neighborhood;

  if (payload.photos !== undefined) {
    if (payload.photos.length > 0) {
      uploadedPhotoUrls = await sendMultipleFilesToCloudinary(
        payload.photos,
        "room-listings",
      );
    }
    data.photos = uploadedPhotoUrls;
  }

  let result: ListRoom;
  try {
    result = await prisma.listRoom.update({
      where: { id },
      data,
    });
  } catch (error) {
    await Promise.allSettled(
      uploadedPhotoUrls.map((imageUrl) => deleteFileFromCloudinary(imageUrl)),
    );
    throw catchError(error, "Failed to update room listing");
  }

  await invalidateCacheDomains("rooms", "saved-rooms");
  if (payload.photos !== undefined) {
    await Promise.all(
      currentRoom.photos.map((imageUrl) => deleteFileFromCloudinary(imageUrl)),
    );
  }
  return result;
};

const deleteListRoomIntoDb = async (
  id: string,
  userId: string,
  role: Role,
): Promise<boolean> => {
  try {
    const room = await prisma.listRoom.findFirst({
      where: {
        id,
        isDeleted: false,
        ...(role === Role.ADMIN ? {} : { userId }),
      },
      select: { id: true, photos: true },
    });

    if (!room) {
      throw new AppError(
        status.NOT_FOUND,
        "Listing not found or unauthorized access.",
      );
    }

    await prisma.$transaction([

      prisma.listRoom.update({
        where: { id },
        data: { isDeleted: true },
      }),
    ]);
    prisma.roomView.deleteMany({
      where: {
        roomId: id,
        isDeleted: false
      }
    });
    prisma.reportRoom.deleteMany({
      where: {
        roomId: id,
        isDeleted: false
      }
    })

    await invalidateCacheDomains("rooms", "saved-rooms");

    await Promise.all(
      room.photos.map((imageUrl) => deleteFileFromCloudinary(imageUrl)),
    );
    return true;
  } catch (error) {
    throw catchError(error, "Failed to delete room listing");
  }
};

const findMyHouseListingsIntoDb = async (
  userId: string,
  queryParams: QueryParams,
) => {
  try {
    const filters = queryParams as RoomQueryFilters;
    const { page, limit, skip } = pageOptions(queryParams);
    const where = roomWhere(filters, userId);

    return await cacheAside(
      "rooms",
      cacheKeys.rooms.byUser(userId, queryParams),
      cacheTtlSeconds.list,
      async () => {
        const [data, totalCount] = await prisma.$transaction([
          prisma.listRoom.findMany({
            where,
            select: {
              id: true,
              address: true,
              area: true,
              types: true,
              description: true,
              neighborhood: true,
              photos: true,
              viewCount: true,
              reportCount: true,
              createdAt: true,
              updatedAt: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.listRoom.count({ where }),
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
  } catch (error) {
    throw catchError(error, "Failed to find your room listings");
  }
};



const viewCountIntoDb = async (payload: { roomId: string; ipAddress: string }) => {
  try {
    const { roomId, ipAddress } = payload;

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const existingView = await prisma.roomView.findFirst({
      where: {
        roomId: roomId,
        ipAddress: ipAddress,
        createdAt: {
          gte: thirtyMinutesAgo,
        },
      },
    });

    // যদি ইতিমধ্যে এই সময়ের মধ্যে ভিউ হয়ে থাকে, তবে নতুন করে কাউন্ট বাড়বে না
    if (existingView) {
      return { success: false, message: 'View already counted for this IP recently' };
    }

    // ৩. নতুন ইউনিক আইপি হলে ডাটাবেজে রেকর্ড সেভ করা এবং মূল রুমের ভিউ ১ বাড়ানো
    const result = await prisma.$transaction([

      prisma.listRoom.update({
        where: { id: roomId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return { success: true, message: 'View counted successfully' };
  } catch (error) {
    throw catchError(error, "Failed to update room view count");
  }
};
const ListRoomService = {
  createRoomListingIntoDb,
  findByAllListIntoDb,
  findBySpecificRoomListIntoDb,
  updateRoomListingIntoDb,
  deleteListRoomIntoDb,
  findMyHouseListingsIntoDb,
  viewCountIntoDb
};

export default ListRoomService;
