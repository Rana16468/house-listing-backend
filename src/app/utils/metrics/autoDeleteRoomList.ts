import { logger } from "../../redis/logger";
import prisma from "../../shared/prisma";
import deleteFileFromCloudinary from "../Cloudinary/deleteFileFromCloudinary";
import { MongoClient } from 'mongodb';

const safeDeleteCloudinaryImages = async (photosList: string[][]): Promise<void> => {
    const allUrls = photosList.flat();
    if (allUrls.length === 0) return;

    const results = await Promise.allSettled(allUrls.map((url) => deleteFileFromCloudinary(url)));

    results.forEach((res) => {
        if (res.status === "rejected") {
            logger.warn({ err: res.reason }, 'Cloudinary cleanup failed');
        }
    });
};

const autoDeleteRoomList = async (): Promise<void> => {
    const uri = process.env.DATABASE_URL;
    if (!uri) return logger.error('DATABASE_URL missing');

    const client = new MongoClient(uri);

    try {

        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 15);

        const oldRooms = await prisma.listRoom.findMany({
            where: { createdAt: { lte: tenDaysAgo }, isDeleted: false },
            select: { id: true, photos: true }
        });

        if (!oldRooms.length) return;

        const postIds = oldRooms.map((room) => room.id);
        const queryFilter = { room_id: { $in: postIds } };
        safeDeleteCloudinaryImages(oldRooms.map((r) => r.photos)).catch((err) =>
            logger.error({ err }, 'Cloudinary bg cleanup error')
        );

        await client.connect();
        const db = client.db();


        const [_, docDel, statsDel] = await Promise.all([
            // (A) Prisma: ListRoom Soft Update + ReportRoom Hard Delete
            prisma.$transaction([
                prisma.listRoom.updateMany({
                    where: { id: { in: postIds } },
                    data: { photos: [], isDeleted: true, updatedAt: new Date() }
                }),
                prisma.reportRoom.deleteMany({
                    where: { roomId: { in: postIds } }
                })
            ]),

            db.collection("rec_impressions").deleteMany(queryFilter),
            db.collection("rec_room_stats").deleteMany(queryFilter)
        ]);

        logger.info(
            `Auto cleanup success: Updated ${postIds.length} rooms | ` +
            `Deleted ${docDel.deletedCount} impressions & ${statsDel.deletedCount} stats.`
        );

    } catch (error) {
        logger.error({ err: error }, 'Failed autoDeleteRoomList execution');
    } finally {
        await client.close();
    }
};

export default autoDeleteRoomList;