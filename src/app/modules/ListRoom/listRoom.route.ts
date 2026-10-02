import express, { NextFunction, Request, Response } from 'express';
import upload, { compressImage } from '../../utils/uplodeFile';
import status from 'http-status';
import AppError from '../../errors/AppError';
import validationRequest from '../../middlewares/validationRequest';
import { ListRoomValidation } from './listRoom.validation';
import ListRoomController from './listRoom.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';

const router = express.Router();

router.post(
    '/',
    auth(Role.USER),
    upload.fields([{ name: 'photos', maxCount: 5 }]),
    compressImage({ maxWidth: 1200, quality: 80 }),
    (req: Request, _res: Response, next: NextFunction) => {
        try {
            // 1. Safe JSON Parsing
            if (req.body?.data) {
                if (typeof req.body.data === 'string') {
                    try {
                        req.body = JSON.parse(req.body.data);
                    } catch (err) {
                        throw new AppError(
                            status.BAD_REQUEST,
                            'JSON structure inside "data" field is invalid'
                        );
                    }
                }
            } else if (typeof req.body === 'string') {
                try {
                    req.body = JSON.parse(req.body);
                } catch (err) {
                    // If body is plain string but not JSON
                    throw new AppError(
                        status.BAD_REQUEST,
                        'Request body is not a valid JSON string'
                    );
                }
            }

            // 2. Attach Auth User ID (যদি Zod-এ userId লাগে এবং auth থেকে আসে)
            if (req.user?.id && !req.body.userId) {
                req.body.userId = req.user.id;
            }

            // 3. Extract uploaded photo paths
            const files = req.files as {
                [fieldname: string]: Express.Multer.File[];
            };
            const photoFiles = files?.photos || files?.photo;

            if (photoFiles && photoFiles.length > 0) {
                req.body.photos = photoFiles.map((file) =>
                    file.path.replace(/\\/g, '/')
                );
            } else if (!req.body.photos) {
                req.body.photos = [];
            }

            // 4. Cast Numeric Values
            if (req.body.rent !== undefined) {
                req.body.rent = Number(req.body.rent);
            }
            if (req.body.serviceCharge !== undefined && req.body.serviceCharge !== null) {
                req.body.serviceCharge = Number(req.body.serviceCharge);
            }

            next();
        } catch (error: any) {
            next(error);
        }
    },
    validationRequest(ListRoomValidation.createRoomListingValidationSchema),
    ListRoomController.createRoomListing
);
router.get("/my-listings", auth(Role.USER), ListRoomController.findMyHouseListings);
router.get("/", ListRoomController.findByAllList);
router.get("/:id", auth(Role.USER, Role.ADMIN), ListRoomController.findBySpecificRoomList)
router.delete("/:id",
    auth(Role.USER, Role.ADMIN),
    ListRoomController.deleteListRoom
);

const listRoomRouter = router;
export default listRoomRouter;