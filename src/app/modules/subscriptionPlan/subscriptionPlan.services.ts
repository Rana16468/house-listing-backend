import { SubscriptionPlan } from "@prisma/client";
import status from "http-status";
import AppError from "../../errors/AppError";
import catchError from "../../errors/catchError";
import { prisma } from "../../../prisma";

const createSubscriptionPlanIntoDB = async (
  payload: SubscriptionPlan
): Promise<SubscriptionPlan> => {
  try {
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: {
        tier: payload.tier,
      },
    });

    if (existingPlan) {
      throw new AppError(
        status.CONFLICT,
        `Subscription plan with tier '${payload.tier}' already exists.`
      );
    }
    const result = await prisma.subscriptionPlan.create({
      data: payload,
    });

    return result;
  } catch (error) {
    throw catchError(error, "Failed to create subscription plan");
  }
};

// 📖 Get All Plans (Filtered by Language)
const getAllSubscriptionPlansFromDB = async (lang: string = 'en') => {
  try{
    const plans = await prisma.subscriptionPlan.findMany({
    where: { isDeleted: false },
  });

  return plans?.map((plan) => ({
    id: plan.id,
    tier: plan.tier,
    maxUnits: plan.maxUnits,
    flat: plan.flat, 
    priceMonthly: plan.priceMonthly,
    name: lang === 'bn' ? plan.nameBn : plan.nameEn,
    unitDetails: lang === 'bn' ? plan.unitDetailsBn : plan.unitDetailsEn,
    features: lang === 'bn' ? plan.featuresBn : plan.featuresEn,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }));

  }
  catch (error) {
    throw catchError(error, "Failed to fetch subscription plans");
  }
};

const getSingleSubscriptionPlanFromDB = async (id: string, lang: string = 'en') => {
 try{
     const plan = await prisma.subscriptionPlan.findFirstOrThrow({
    where: { id, isDeleted: false },
  });

  return {
    id: plan.id,
    tier: plan.tier,
    flat: plan.flat, 
    maxUnits: plan.maxUnits,
    priceMonthly: plan.priceMonthly,
    name: lang === 'bn' ? plan.nameBn : plan.nameEn,
    unitDetails: lang === 'bn' ? plan.unitDetailsBn : plan.unitDetailsEn,
    features: lang === 'bn' ? plan.featuresBn : plan.featuresEn,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };

 }
 catch(error){
    throw catchError(error, "Failed to fetch subscription plan");
 }
};

const SubscriptionPlanService = {
  createSubscriptionPlanIntoDB,
  getAllSubscriptionPlansFromDB,
  getSingleSubscriptionPlanFromDB
};

export default SubscriptionPlanService;