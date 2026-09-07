import { prisma } from './../../../prisma';
import { SubscriptionPlan } from "@prisma/client";
import status from "http-status";
import AppError from "../../errors/AppError";
import catchError from "../../errors/catchError";
import { getCache, setCache, deleteByPattern } from "./../../redis/redis";
const CACHE_TTL = 3600; // 1 hour
const ALL_PLANS_CACHE_PATTERN = "subscription_plan:all:*";
const allPlansCacheKey = (lang: string) => `subscription_plan:all:${lang}`;
const singlePlanCacheKey = (id: string, lang: string) =>
  `subscription_plan:one:${id}:${lang}`;

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

    // Invalidate all cached listings — a new plan changes every "get all" response
    await deleteByPattern(ALL_PLANS_CACHE_PATTERN);

    return result;
  } catch (error) {
    throw catchError(error, "Failed to create subscription plan");
  }
};

// 📖 Get All Plans (Filtered by Language)
const getAllSubscriptionPlansFromDB = async (lang: string = 'en') => {
  try {
    const cacheKey = allPlansCacheKey(lang);

    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where: { isDeleted: false },
    });

    const mapped = plans?.map((plan) => ({
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

    await setCache(cacheKey, mapped, CACHE_TTL);

    return mapped;
  }
  catch (error) {
    throw catchError(error, "Failed to fetch subscription plans");
  }
};

const getSingleSubscriptionPlanFromDB = async (id: string, lang: string = 'en') => {
  try {
    const cacheKey = singlePlanCacheKey(id, lang);

    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const plan = await prisma.subscriptionPlan.findFirstOrThrow({
      where: { id, isDeleted: false },
    });

    const mapped = {
      id: plan.id,
      tier: plan.tier,
      maxUnits: plan.maxUnits,
      flat: plan.flat,
      priceMonthly: plan.priceMonthly,
      name: lang === "bn" ? plan.nameBn : plan.nameEn,
      unitDetails: lang === "bn" ? plan.unitDetailsBn : plan.unitDetailsEn,
      features: lang === "bn" ? plan.featuresBn : plan.featuresEn,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };

    await setCache(cacheKey, mapped, CACHE_TTL);

    return mapped;
  }
  catch (error) {
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
): Promise<{ status: boolean, message: string }> => {
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

    // Invalidate the specific plan's cache and every cached listing
    await Promise.all([
      deleteByPattern(`subscription_plan:one:${id}:*`),
      deleteByPattern(ALL_PLANS_CACHE_PATTERN),
    ]);

    return result && {
      status: true,
      message: "successfully subscription update"
    };
  } catch (error) {
    throw catchError(error, "Failed to update subscription plan");
  }
};

const deleteSubscriptionIntoDb = async (subscriptionId: string): Promise<{
  status: number,
  message: string
}> => {

  try {

    await prisma.subscriptionPlan.findFirstOrThrow({
      where: { id: subscriptionId }
    }).catch(error => {
      throw new AppError(status.NOT_FOUND, 'this subscription is not founded', error);
    });
    // delete all subscriber user
    await prisma.userSubscription.deleteMany({
      where: {
        planId: subscriptionId
      }
    }).catch(error => {
      throw new AppError(status.NOT_EXTENDED,
        'some issues  by the user subscription collection section', error);

    });
    // delete subscription 
    await prisma.subscriptionPlan.delete({
      where: {
        id: subscriptionId
      }
    }).catch(error => {
      throw new AppError(status.NOT_EXTENDED,
        'issues by the delete subscription section', error);
    });

    // Invalidate the specific plan's cache and every cached listing
    await Promise.all([
      deleteByPattern(`subscription_plan:one:${subscriptionId}:*`),
      deleteByPattern(ALL_PLANS_CACHE_PATTERN),
    ]);

    return {
      status: status.OK,
      message: "Successfully delete Subscription"
    }

  }
  catch (error) {
    throw catchError(error, "Failed to update subscription plan");
  }
}

const SubscriptionPlanService = {
  createSubscriptionPlanIntoDB,
  getAllSubscriptionPlansFromDB,
  getSingleSubscriptionPlanFromDB,
  updateSubscriptionPlanIntoDB,
  deleteSubscriptionIntoDb
};

export default SubscriptionPlanService;