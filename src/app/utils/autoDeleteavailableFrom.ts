import { prisma } from "../../prisma";
import catchError from "../errors/catchError";
import deleteFileFromCloudinary from "./Cloudinary/deleteFileFromCloudinary";

const BATCH_SIZE = 50;


const safeDeleteCloudinaryImages = async (images: string[]): Promise<void> => {
  if (!images || images.length === 0) return;

  const results = await Promise.allSettled(
    images.map((url) => deleteFileFromCloudinary(url))
  );

  results.forEach((result, idx) => {
    if (result.status === "rejected") {
      console.error(
        `[Cloudinary Cleanup Failed] Image URL: ${images[idx]} | Reason:`,
        result.reason
      );
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