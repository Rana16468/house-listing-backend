import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import UnitService from "./unit.services";
import sendResponse from "../../utils/sendResponse";
import status from "http-status";
import { string } from "zod";


const  recordedUnit:RequestHandler=catchAsync(async (req, res) => {

    const result = await UnitService.recordedUnitIntoDb(req.user.id,req.body);
    sendResponse(res, {
        success: true,
        statusCode: status.CREATED,
        message: "Successfully Recorded",
        data: result,
    })
});

const getAllUnitsFrom:RequestHandler=catchAsync(async(req , res)=>{

      const result= await UnitService.getAllUnitsFromDb(req.query, req.user.id);
       sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Find My All Listed Unit",
        data: result,
    })
});

const  findBySpecifcUnit:RequestHandler=catchAsync(async(req , res)=>{

      const result=await UnitService.findBySpecifcUnitIntoDb(req.params.id as string);
      sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Find By Specific Unit List",
        data: result,
    })
});

const updateUnit:RequestHandler=catchAsync(async(req , res)=>{

      const result=await UnitService.updateUnitIntoDb(req.params.id as string , req.user.id, req.body);
      sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully  Update",
        data: result,
    })
});

const hardDeleteUnit:RequestHandler=catchAsync(async(req , res)=>{

     const result=await UnitService.hardDeleteUnitIntoDb(req.params.id as string, req.user.id);
     sendResponse(res, {
        success: true,
        statusCode: status.OK,
        message: "Successfully  Delete",
        data: result,
    })
})

const UnitController={
    recordedUnit,
    getAllUnitsFrom,
    findBySpecifcUnit,
    updateUnit,
    hardDeleteUnit
};
export default UnitController