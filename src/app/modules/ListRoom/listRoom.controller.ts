import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import ListRoomService from "./listRoom.services";
import sendResponse from "../../utils/sendResponse";
import status from "http-status";


const createRoomListing:RequestHandler=catchAsync(async(req , res)=>{

     const result = await ListRoomService.createRoomListingIntoDb(req.body, req.user.id);
    sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Recorded",
        data: result,
    })

});

const findByAllList:RequestHandler=catchAsync(async(req , res)=>{
     const result=await ListRoomService.findByAllListIntoDb(req.query);
      sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Find By All Room List",
        data: result,
    })

});

const findBySpecificRoomList:RequestHandler=catchAsync(async(req , res)=>{
    const result=await ListRoomService.findBySpecificRoomListIntoDb(req.params.id as string);
    sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Find By Specifc List",
        data: result,
    })
});

const deleteListRoom:RequestHandler=catchAsync(async(req , res)=>{

     const result=await ListRoomService.deleteListRoomIntoDb(req.params.id as string, req.user.id);
      sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Delete Specifc Room List",
        data: result,
    })
});

const findMyHouseListings:RequestHandler=catchAsync(async(req , res)=>{
     const result=await ListRoomService.findMyHouseListingsIntoDb(req.user.id, req.query);
      sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Find My House Listings",
        data: result,
    })
});
const ListRoomController={
    createRoomListing,
    findByAllList,
    findBySpecificRoomList,
    deleteListRoom,
    findMyHouseListings
};
export default ListRoomController