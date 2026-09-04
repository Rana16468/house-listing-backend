import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import UserSubscriptionService from "./userSubscription.services";
import sendResponse from "../../utils/sendResponse";
import httpStatus from 'http-status'

const createUserSubscription:RequestHandler=catchAsync(async(req ,res)=>{

    const result = await UserSubscriptionService.createUserSubscriptionIntoDB(req.user.id,req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'User subscription initialized successfully',
    data: result,
  });

});

const myAllSub:RequestHandler=catchAsync(async(req , res)=>{

     const result=await UserSubscriptionService.myAllSubIntoDb(req.user.id, req.query);
      sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User subscription initialized successfully',
    data: result,
  });

});

const  myActiveSubscription:RequestHandler=catchAsync(async(req , res)=>{

     const result=await UserSubscriptionService.myActiveSubscriptionIntoDb(req.user.id);
     sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'my latest active subscription',
    data: result,
  });
})
const UserSubscriptionController ={
    createUserSubscription,
    myAllSub,
    myActiveSubscription
}

export default UserSubscriptionController;
