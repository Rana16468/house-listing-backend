import { prisma } from "../../prisma";
import catchError from "../errors/catchError";
import deleteFileFromCloudinary from "./Cloudinary/deleteFileFromCloudinary";
import { logger } from "../redis/logger";
import { invalidateCacheDomains } from "../redis/cache";

const BATCH_SIZE = 50;


const safeDeleteCloudinaryImages = async (images: string[]): Promise<void> => {
  if (!images || images.length === 0) return;

  const results = await Promise.allSettled(
    images.map((url) => deleteFileFromCloudinary(url))
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      logger.warn({ err: result.reason }, 'Cloudinary cleanup failed');
    }
  });
};

const autoDeleteAvailableFrom = async () => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const expiredCount = await prisma.post.count({
      where: {
        availableFrom: { lt: todayStr },
        isDelete: false,
      },
    });

    if (expiredCount === 0) {
      return { success: true, processedCount: 0 };
    }

    await invalidateCacheDomains("posts");
    let processedTotal = 0;

    while (processedTotal < expiredCount) {
      const expiredPosts = await prisma.post.findMany({
        where: {
          availableFrom: { lt: todayStr },
          isDelete: false,
        },
        select: {
          id: true,
          images: true,
        },
        take: BATCH_SIZE,
      });

      if (expiredPosts.length === 0) break;


      await Promise.allSettled(
        expiredPosts.map((post) => safeDeleteCloudinaryImages(post.images))
      );

      const postIds = expiredPosts.map((post) => post.id);

      await prisma.post.updateMany({
        where: {
          id: { in: postIds },
        },
        data: {
          images: [],
          isDelete: true,
          updatedAt: new Date(),
        },
      });
      await invalidateCacheDomains("posts");

      processedTotal += expiredPosts.length;
    }

    console.log(
      `[Cron Job Completed] Successfully processed & soft-deleted ${processedTotal} expired posts.`
    );

    return { success: true, processedCount: processedTotal };
  } catch (error) {
    throw catchError(error, "Error in autoDeleteAvailableFrom function:");
  }
};

export default autoDeleteAvailableFrom;