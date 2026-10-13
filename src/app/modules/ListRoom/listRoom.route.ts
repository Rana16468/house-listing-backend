import express, { NextFunction, Request, RequestHandler } from "express";
import upload, { compressImage } from "../../utils/uplodeFile";
import status from "http-status";
import AppError from "../../errors/AppError";
import validationRequest from "../../middlewares/validationRequest";
import { ListRoomValidation } from "./listRoom.validation";
import ListRoomController from "./listRoom.controller";
import auth from "../../middlewares/auth";
import { Role } from "@prisma/client";

const router = express.Router();

const parseRoomFormData =
  (requirePhotos: boolean): RequestHandler =>
    (req: Request, _res, next: NextFunction) => {
      try {
        if (typeof req.body?.data === "string") {
          req.body = JSON.parse(req.body.data);
        } else if (typeof req.body === "string") {
          req.body = JSON.parse(req.body);
        }

        if (
          !req.body ||
          typeof req.body !== "object" ||
          Array.isArray(req.body)
        ) {
          throw new AppError(
            status.BAD_REQUEST,
            "Request body must be a JSON object.",
          );
        }

        const files = req.files;
        const photoFiles =
          files && !Array.isArray(files)
            ? (files.photos ?? files.photo)
            : undefined;

        if (photoFiles?.length) {
          req.body.photos = photoFiles.map((file) =>
            file.path.replace(/\\/g, "/"),
          );
        } else if (requirePhotos && req.body.photos === undefined) {
          req.body.photos = [];
        }

        next();
      } catch {
        next(
          new AppError(
            status.BAD_REQUEST,
            "Invalid JSON data format in form body; expected a JSON object.",
          ),
        );
      }
    };

const uploadRoomPhotos = [
  upload.fields([{ name: "photos", maxCount: 5 }]),
  compressImage({ maxWidth: 1200, quality: 80 }),
];

router.post(
  "/",
  auth(Role.USER),
  ...uploadRoomPhotos,
  parseRoomFormData(true),
  validationRequest(ListRoomValidation.createRoomListingValidationSchema),
  ListRoomController.createRoomListing,
);

router.get(
  "/my-listings",
  auth(Role.USER),
  validationRequest(ListRoomValidation.listRoomQueryValidationSchema),
  ListRoomController.findMyHouseListings,
);
router.get(
  "/",
  validationRequest(ListRoomValidation.listRoomQueryValidationSchema),
  ListRoomController.findByAllList,
);
router.patch(
  "/:id",
  auth(Role.USER, Role.ADMIN),
  ...uploadRoomPhotos,
  parseRoomFormData(false),
  validationRequest(ListRoomValidation.updateRoomListingValidationSchema),
  ListRoomController.updateRoomListing,
);
router.get(
  "/:id",
  auth(Role.USER, Role.ADMIN),
  validationRequest(ListRoomValidation.roomIdParamsValidationSchema),
  ListRoomController.findBySpecificRoomList,
);
router.delete(
  "/:id",
  auth(Role.USER, Role.ADMIN),
  validationRequest(ListRoomValidation.roomIdParamsValidationSchema),
  ListRoomController.deleteListRoom,
);
router.post('/view_count',
  validationRequest(ListRoomValidation.viewCountSchema),
  ListRoomController.viewCount)

const listRoomRouter = router;
export default listRoomRouter;
