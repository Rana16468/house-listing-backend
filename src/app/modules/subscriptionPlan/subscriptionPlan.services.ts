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

  return plan

 }
 catch(error){
    throw catchError(error, "Failed to fetch subscription plan");
 }
};

const updateSubscriptionPlanIntoDB = async (
  id: string,
  payload: Partial<SubscriptionPlan & {
  addFeaturesEn?: string[];
  addFeaturesBn?: string[];
  removeFeaturesEn?: string[];
  removeFeaturesBn?: string[];
}>
): Promise<{status:boolean, message:string}> => {
  try {
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingPlan) {
      throw new AppError(status.NOT_FOUND, "Subscription plan not found");
    }

    // Extract custom operation fields from payload
    const {
      addFeaturesEn,
      addFeaturesBn,
      removeFeaturesEn,
      removeFeaturesBn,
      featuresEn,
      featuresBn,
      ...otherFields
    } = payload;

    
    let updatedFeaturesEn = featuresEn !== undefined ? featuresEn : [...existingPlan.featuresEn];

    // Add new English features (Duplicate avoid using Set)
    if (addFeaturesEn && addFeaturesEn.length > 0) {
      updatedFeaturesEn = Array.from(new Set([...updatedFeaturesEn, ...addFeaturesEn]));
    }
    if (removeFeaturesEn && removeFeaturesEn.length > 0) {
      updatedFeaturesEn = updatedFeaturesEn.filter(
        (feature) => !removeFeaturesEn.includes(feature)
      );
    }

    // --- Process Bengali Features ---
    // Direct array replace override or existing array baseline
    let updatedFeaturesBn = featuresBn !== undefined ? featuresBn : [...existingPlan.featuresBn];

    // Add new Bengali features
    if (addFeaturesBn && addFeaturesBn.length > 0) {
      updatedFeaturesBn = Array.from(new Set([...updatedFeaturesBn, ...addFeaturesBn]));
    }

    // Remove specific Bengali features
    if (removeFeaturesBn && removeFeaturesBn.length > 0) {
      updatedFeaturesBn = updatedFeaturesBn.filter(
        (feature) => !removeFeaturesBn.includes(feature)
      );
    }

    // 2. Perform Database Update
    const result = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...otherFields,
        featuresEn: updatedFeaturesEn,
        featuresBn: updatedFeaturesBn,
      },
    });

    return result && {
        status: true ,
        message:"successfully subscription update"
    };
  } catch (error) {
    throw catchError(error, "Failed to update subscription plan");
  }
};

const SubscriptionPlanService = {
  createSubscriptionPlanIntoDB,
  getAllSubscriptionPlansFromDB,
  getSingleSubscriptionPlanFromDB,
  updateSubscriptionPlanIntoDB
};

export default SubscriptionPlanService;