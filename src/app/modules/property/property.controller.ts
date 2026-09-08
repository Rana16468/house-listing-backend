import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import { PropertyService } from "./property.services";
import status from 'http-status'
import sendResponse from "../../utils/sendResponse";

const createProperty: RequestHandler = catchAsync(async (req, res) => {

    const result = await PropertyService.createPropertyIntoDb(req.body, req.user.id);
    sendResponse(res, {
        success: true,
        statusCode: status.CREATED,
        message: "Successfully Recorded",
        data: result,
    })
});

const getAllProperties = catchAsync(async (req, res) => {
    const { meta, data } = await PropertyService.getAllPropertiesIntoDb(
        req.user.id,
        req.params.currentSubId as string,
        req.query
    );

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: 'Successfully Find My All Property',
        data: {
            meta: meta,
            data: data,
        }
    });
});

const getPropertyById:RequestHandler=catchAsync(async(req , res)=>{

     const result=await PropertyService.getPropertyByIdIntoDb(req.params.id as string, req.user.id);
     sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully Specific Property",
        data: result,
    })
});

const updateProperty:RequestHandler=catchAsync(async(req , res)=>{

     const result=await PropertyService.updatePropertyIntoDb(req.params.id as string, req.user.id, req.body);
      sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message:result.message,
        data: result,
    })
})



const PropertyController = {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty
};
export default PropertyController;