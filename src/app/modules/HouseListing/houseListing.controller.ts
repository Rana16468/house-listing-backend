import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import PostServices from "./houseListing.services";
import sendResponse from "../../utils/sendResponse";
import status from 'http-status'

const houseListing: RequestHandler = catchAsync(async (req, res) => {

    const result = await PostServices.houseListingIntoDb(req.body);
    sendResponse(res, {
        success: true,
        statusCode: status.CREATED,
        message: "Successfully Recorded",
        data: result,
    })
});

const findByHouseList: RequestHandler = catchAsync(async (req, res) => {

    const result = await PostServices.findByHouseListDb(req.query);
    sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Find By House List",
        data: result,
    })



});

const findBySpecifcHouseInfo: RequestHandler = catchAsync(async (req, res) => {

    const result = await PostServices.findBySpecifcHouseInfoIntoDb(req.params.id as string);
    sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Find Specific By House List",
        data: result,
    })
});

const findMyHouseListing: RequestHandler = catchAsync(async (req, res) => {

    const result = await PostServices.findMyHouseListingIntoDb(req.params.deviceId as string);
    sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Find Specific By House List",
        data: result,
    })
});

const softDeleteMyHouseListing: RequestHandler = catchAsync(async (req, res) => {

    const result = await PostServices.softDeleteMyHouseListingIntoDb(req.params.id as string, req.params.deviceId as string);
    sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Delete",
        data: result,
    })
});

const liveReasigonRequiringAttention:RequestHandler=catchAsync(async(req, res)=>{
    const result=await PostServices.liveReasigonRequiringAttentionIntoDb();
     sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Find",
        data: result,
    })
})

const PostController = {
    houseListing,
    findByHouseList,
    findBySpecifcHouseInfo,
    findMyHouseListing,
    softDeleteMyHouseListing,
    liveReasigonRequiringAttention
};
export default PostController;