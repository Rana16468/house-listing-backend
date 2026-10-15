import express from "express";
import { Role } from "@prisma/client";
import auth from "../../middlewares/auth";
import validationRequest from "../../middlewares/validationRequest";
import ReportRoomController from "./reportRoom.controller";
import ReportRoomValidation from "./reportRoom.validation";

const router = express.Router();

router.post(
  "/",
  validationRequest(ReportRoomValidation.createReportRoomSchema),
  ReportRoomController.createReportRoom,
);

router.get(
  "/",
  auth(Role.ADMIN),
  validationRequest(ReportRoomValidation.listReportRoomsSchema),
  ReportRoomController.findReportRooms,
);

export default router;
