import { RequestHandler } from "express";
import sendResponse from "../../utils/sendResponse";
import status from "http-status";
import catchAsync from "../../utils/asyncCatch";
import SaveRoomService from "./saveRoom.services";


const saveRoom: RequestHandler = catchAsync(async (req, res) => {
    const result = await SaveRoomService.saveRoomIntoDb(req.user.id, req.body.listRoomId);
    sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Saved Room",
        data: result,
    })
});

const findSavedRoomsByUserId: RequestHandler = catchAsync(async (req, res) => {
   
    const result = await SaveRoomService.findSavedRoomsByUserIdIntoDb(
        req.user.id, req.query
        
    );
    sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Found Saved Rooms",
        data: result,
    })
});
const deleteSavedRoom: RequestHandler = catchAsync(async (req, res) => {
    const result = await SaveRoomService.deleteSavedRoomIntoDb(req.user.id, req.params.listRoomId as string);
    sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Deleted Saved Room",
        data: result,
    })
});


const SaveRoomController = {
    saveRoom,
    findSavedRoomsByUserId,
    deleteSavedRoom
}
export default SaveRoomController;