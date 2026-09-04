import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import SubscriptionPlanService from "./subscriptionPlan.services";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
const createSubscriptionPlan:RequestHandler = catchAsync(async (req, res) => {
  const result = await SubscriptionPlanService.createSubscriptionPlanIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Subscription plan created successfully',
    data: result,
  });
});

const getAllSubscriptionPlans:RequestHandler = catchAsync(async (req, res) => {
  const lang = req.query.lang as string || 'en';
  const result = await SubscriptionPlanService.getAllSubscriptionPlansFromDB(lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription plans fetched successfully',
    data: result,
  });
});

const getSingleSubscriptionPlan:RequestHandler = catchAsync(async (req, res) => {
  const lang = req.query.lang as string || 'en';
  const result = await SubscriptionPlanService.getSingleSubscriptionPlanFromDB(req.params.id as string, lang);
    sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription plans fetched successfully',
    data: result,
  });
});

const updateSubscriptionPlan:RequestHandler=catchAsync(async(req , res)=>{

    const result=await SubscriptionPlanService.updateSubscriptionPlanIntoDB(req.params.id as string, req.body);
     sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription Update successfully',
    data: result,
  });
})




const SubscriptionPlanController={
    createSubscriptionPlan,
    getAllSubscriptionPlans,

    getSingleSubscriptionPlan,
    updateSubscriptionPlan
}
export default SubscriptionPlanController;