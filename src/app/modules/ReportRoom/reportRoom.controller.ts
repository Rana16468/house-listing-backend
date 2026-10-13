import { RequestHandler } from "express";
import status from "http-status";
import catchAsync from "../../utils/asyncCatch";
import sendResponse from "../../utils/sendResponse";
import ReportRoomService from "./reportRoom.services";

const createReportRoom: RequestHandler = catchAsync(async (req, res) => {
  const result = await ReportRoomService.createReportRoomIntoDb(
    req.user.id,
    req.body.roomId,
    req.body.reportType,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.CREATED,
    message: "Room report submitted successfully",
    data: result,
  });
});

const findReportRooms: RequestHandler = catchAsync(async (req, res) => {
  const result = await ReportRoomService.findReportRoomsIntoDb(req.query);

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "Room reports retrieved successfully",
    data: result,
  });
});

const ReportRoomController = {
  createReportRoom,
  findReportRooms,
};

export default ReportRoomController;
