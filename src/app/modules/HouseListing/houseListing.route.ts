import express, { NextFunction, Request, Response } from 'express';
import upload, { compressImage } from '../../utils/uplodeFile';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import validationRequest from '../../middlewares/validationRequest';
import PostValidation from './houseListing.validation';
import PostController from './houseListing.controller';

const router = express.Router();

router.post(
    '/',
    upload.fields([{ name: 'photo', maxCount: 5 }]),
    compressImage({ maxWidth: 1200, quality: 80 }),
    (req: Request, _res: Response, next: NextFunction) => {
        try {
            // 1. Safe JSON parsing from multipart/form-data
            if (req.body?.data && typeof req.body.data === 'string') {
                req.body = JSON.parse(req.body.data);
            } else if (typeof req.body === 'string') {
                req.body = JSON.parse(req.body);
            }

            const files = req.files as {
                [fieldname: string]: Express.Multer.File[];
            };

            // 2. Extract all uploaded photo paths into an Array
            const photoFiles = files?.photo;

            if (photoFiles && photoFiles.length > 0) {
                req.body.images = photoFiles.map((file) =>
                    file.path.replace(/\\/g, '/')
                );
            } else {
                req.body.images = [];
            }

            next();
        } catch (error: any) {
            next(
                new AppError(
                    httpStatus.BAD_REQUEST,
                    'Invalid JSON data format in form body'
                )
            );
        }
    },
    validationRequest(PostValidation.CreatePostSchema),
    PostController.houseListing
);

router.get("/live_reasigon_requiring_attention",
    PostController.liveReasigonRequiringAttention
)

router.get("/find_by_house_list",
    PostController.findByHouseList)
router.get("/:id", PostController.findBySpecifcHouseInfo);
router.get("/my_house_listing/:deviceId", PostController.findMyHouseListing)
router.delete("/delete_my_house_listing/:id/:deviceId", PostController.softDeleteMyHouseListing)


const postRouter = router;
export default postRouter;