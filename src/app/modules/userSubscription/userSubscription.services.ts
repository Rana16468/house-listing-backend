import { PaymentStatus, PlanTier, Prisma, UserSubscription } from "@prisma/client";
import status from "http-status";
import AppError from "../../errors/AppError";
import catchError from "../../errors/catchError";
import prisma from "../../shared/prisma";
import { jwtHelpers } from "../../helper/jwtHelpers";
import config from "../../config";
import { QueryBuilder, QueryParams, meta } from "../../builder/QueryBuilder";
import { ServiceResponse } from "./userSubscription.interface";
import {
  deleteByPattern,
  deleteCache,
  getCache,
  setCache,
} from "../../redis/redis";

const CACHE_TTL = 300;
const USER_SUBSCRIPTION_CACHE_PATTERN = "user_subscription:*";
const userSubscriptionCacheKey = (userId: string, query: unknown) =>
  `user_subscription:${userId}:${Buffer.from(JSON.stringify(query)).toString("base64url")}`;
const activeSubscriptionCacheKey = (userId: string) =>
  `user_subscription:active:${userId}`;

const invalidateUserSubscriptionCache = async (userId?: string) => {
  if (!userId) {
    await deleteByPattern(USER_SUBSCRIPTION_CACHE_PATTERN);
    return;
  }

  await Promise.all([
    deleteByPattern(`user_subscription:${userId}:*`),
    deleteCache(activeSubscriptionCacheKey(userId)),
  ]);
};

// ----------------------------------------------------------------------
// Helper: Auto Generate Invoice Number (Format: INV-2026-001)
// ----------------------------------------------------------------------
const generateInvoiceNo = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  const lastSubscription = await prisma.userSubscription.findFirst({
    where: {
      invoiceNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      invoiceNo: true,
    },
  }).catch(error=>{
    throw new AppError(status.NOT_EXTENDED, 'issues by the invoce generate section', error)
  });

  if (lastSubscription && lastSubscription.invoiceNo) {
    const currentNumberParts = lastSubscription.invoiceNo.split("-");
    const currentNumber = parseInt(currentNumberParts[2], 10);
    const nextNumber = currentNumber + 1;

    return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
  }

  return `${prefix}001`;
};

// ----------------------------------------------------------------------
// Service: Complete Subscription Handling Code
// ----------------------------------------------------------------------
const createUserSubscriptionIntoDB = async (
  userId: string,
  payload: UserSubscription
): Promise<UserSubscription> => {
  try {
    // ১. টার্গেট সাবস্ক্রিপশন প্ল্যান চেক
    const planExists = await prisma.subscriptionPlan.findFirst({
      where: { id: payload.planId, isDeleted: false },
    });

    if (!planExists) {
      throw new AppError(status.NOT_FOUND, "Target subscription plan does not exist");
    }

    const today = new Date();

    // =========================================================================
    // CONDITION 1: ফ্রি (BASIC) সাবস্ক্রিপশন লজিক
    // =========================================================================
    if (planExists.tier === PlanTier.BASIC) {
      // চেক: ইউজার আগে কখনো BASIC/Free প্ল্যান নিয়েছিল কিনা
      const existingBasicSubscription = await prisma.userSubscription.findFirst({
        where: {
          userId,
          isDeleted: false,
          plan: {
            tier: PlanTier.BASIC,
          },
        },
      });

      if (existingBasicSubscription) {
        throw new AppError(
          status.BAD_REQUEST,
          "আপনার ফ্রি সাবস্ক্রিপশন অলরেডি নেওয়া হয়ে গেছে। আপনি এটি পুনরায় নিতে পারবেন না।"
        );
      }

      // ফ্রি প্ল্যানের জন্য ১ মাসের শেষ দিন পর্যন্ত মেয়াদ নির্ধারণ
      const freeTrialEndDate = new Date(today);
      freeTrialEndDate.setMonth(freeTrialEndDate.getMonth() + 1);

      // আগের সকল এক্টিভ সাবস্ক্রিপশন ডি-অ্যাক্টিভেট করা
      await prisma.userSubscription.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }).catch(error=>{
        throw new AppError(status.NOT_EXTENDED, 'iisues by the user subscription section', error)
      });

      const invoiceNo = await generateInvoiceNo();

      // ফ্রি সাবস্ক্রিপশন তৈরি -> এটি অটোমেটিক isActive: true হবে
      const result = await prisma.userSubscription.create({
        data: {
          ...payload,
          userId,
          invoiceNo,
          trxId: null, // ফ্রি প্ল্যানে ট্রানজেকশন আইডি লাগবে না
          paymentAmount: 0,
          paymentMethod: payload.paymentMethod || "FREE_TRIAL",
          startDate: today,
          endDate: freeTrialEndDate,
          isActive: true, // 👈 ফ্রি প্ল্যানে অটোমেটিক True,
          isPaymentVerify: true,
          paymentStatus:PaymentStatus.PAID,


          
        },
        include: { plan: true },
      });
      await invalidateUserSubscriptionCache(userId);
      return result;
    }

    // =========================================================================
    // CONDITION 2: পেইড (STANDARD / PRO) সাবস্ক্রিপশন লজিক
    // =========================================================================
    if (!payload.endDate) {
      throw new AppError(status.BAD_REQUEST, "End date is required for paid plans");
    }

    if (!payload.trxId) {
      throw new AppError(
        status.BAD_REQUEST,
        "Transaction ID (trxId) is required for paid plans"
      );
    }

    // --- মাসের শেষ তারিখ (Last Day of Month) অটো ক্যালকুলেশন ---
    const rawEndDate = new Date(payload.endDate);
    if (rawEndDate <= today) {
      throw new AppError(
        status.BAD_REQUEST,
        "End date must be a future date beyond today"
      );
    }

    // কাঙ্ক্ষিত মাসের শেষ দিন বের করা (যেমন: নভেম্বরের ৩০ তারিখ, ২৩:৫৯:৫৯)
    const targetLastDayOfMonth = new Date(
      rawEndDate.getFullYear(),
      rawEndDate.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // --- পেমেন্ট অ্যামাউন্ট ও মাসের হিসাব ---
    const yearDiff = targetLastDayOfMonth.getFullYear() - today.getFullYear();
    const monthDiff = targetLastDayOfMonth.getMonth() - today.getMonth();
    let totalMonths = yearDiff * 12 + monthDiff;

    const currentDay = today.getDate();
    if (currentDay >= 1 && currentDay <= 10) {
      totalMonths += 1;
    } else if (targetLastDayOfMonth.getDate() > today.getDate()) {
      totalMonths += 1;
    }

    const durationInMonths = Math.max(1, totalMonths);
    const calculatedAmount = planExists.priceMonthly * durationInMonths;

    // চেক: এই ইউজার এই নির্দিষ্ট প্ল্যানটি (Standard/Pro) আগে কখনো নিয়েছিল কিনা
    const existingSamePlanSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId,
        planId: payload.planId,
      },
    }).catch(error=>{
        throw new AppError(status.NOT_EXTENDED, 'issues by the existing sma paln subscription section', error)
    });

    // --- যদি ইউজার আগে এই প্ল্যান কিনে থাকে -> UPDATE হবে ---
    if (existingSamePlanSubscription) {
      const result = await prisma.userSubscription.update({
        where: {
          id: existingSamePlanSubscription.id,
        },
        data: {
          ...payload,
          paymentAmount: calculatedAmount,
          startDate: today,
          endDate: targetLastDayOfMonth,
          isActive: false, // 👈 পেইড প্ল্যান আপডেট হলেও অ্যাডমিন এপ্রুভালের জন্য False থাকবে
        },
        include: { plan: true },
      });
      await invalidateUserSubscriptionCache(userId);
      return result;
    }

    // --- যদি ইউজার প্রথমবার এই প্ল্যান কিনে থাকে -> CREATE হবে ---
    const invoiceNo = await generateInvoiceNo();

    const result = await prisma.userSubscription.create({
      data: {
        ...payload,
        userId,
        invoiceNo,
        paymentAmount: calculatedAmount,
        startDate: today,
        endDate: targetLastDayOfMonth,
        isActive: false, // 👈 পেইড প্ল্যান ক্রিয়েট হলেও অ্যাডমিন এপ্রুভালের জন্য False থাকবে
      },
      include: { plan: true },
    });
    await invalidateUserSubscriptionCache(userId);
    return result;
  } catch (error) {
    throw catchError(error, "Failed to process user subscription");
  }
};

const myAllSubIntoDb = async (userId: string, query: QueryParams) => {
  try {
    // ১. QueryBuilder ইনস্ট্যান্স তৈরি এবং ফিল্টার/সার্চ কনফিগার করা
    const queryBuilder = new QueryBuilder(query)
      .search(["invoiceNo", "trxId", "paymentMethod"]) // সার্চেবল ফিল্ডস
      .filter(["paymentStatus", "isActive", "isPaymentVerify"]) // ফিল্টারেবল ফিল্ডস
      .scope({ userId, isDeleted: false }); // নির্দিষ্ট ইউজারের জন্য স্কোপ করা

    // ২. Prisma এর জন্য কোয়েরি ফিল্ডস জেনারেট করা
    const builtQuery = queryBuilder.build("createdAt");
    const cacheKey = userSubscriptionCacheKey(userId, {
      where: builtQuery.where,
      orderBy: builtQuery.orderBy,
      skip: builtQuery.skip,
      take: builtQuery.take,
    });
    const cached = await getCache(cacheKey);

    if (cached !== null) {
      return cached;
    }

    // ৩. একসাথে ডাটা এবং টোটাল কাউন্ট ফেচ করা (প্যাজিনেশনের জন্য)
    const [result, total] = await Promise.all([
      prisma.userSubscription.findMany({
        where: builtQuery.where,
        orderBy: builtQuery.orderBy,
        skip: builtQuery.skip,
        take: builtQuery.take,
        select:{
            startDate: true,
            endDate: true,
            isActive:true ,
        isPaymentVerify:true,
        paymentStatus:true,
        paymentAmount:true,
        paymentMethod:true,
        plan:{
            select:{
                tier:true,
                nameEn:true,
                nameBn:true,
            }
        },
        createdAt:true,
        updatedAt: true

        }
      }),
      prisma.userSubscription.count({
        where: builtQuery.where,
      }),
    ]);

    // ৪. মেটা-ডাটা জেনারেট করা
    const pageMeta = meta(total, builtQuery);

    const response = {
      meta: pageMeta,
      data: result,
    };
    await setCache(cacheKey, response, CACHE_TTL);
    return response;
  } catch (error) {
    throw catchError(error, "Failed to fetch user subscription history");
  }
};

const myActiveSubscriptionIntoDb = async (userId: string) => {
  try {
    const cacheKey = activeSubscriptionCacheKey(userId);
    let activeSubscription = await getCache(cacheKey);

    if (activeSubscription === null) {
      activeSubscription = await prisma.userSubscription.findFirst({
        where: {
          userId,
          isActive: true,
          isPaymentVerify: true,
          paymentStatus: PaymentStatus.PAID,
          isDeleted: false,
         
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          startDate: true,
          endDate: true,
          isActive: true,
          isPaymentVerify: true,
          paymentStatus: true,
          id:true
        },
      });

      if (activeSubscription) {
        await setCache(cacheKey, activeSubscription, CACHE_TTL);
      }
    }

    if (!activeSubscription) {
      throw new AppError(
        status.NOT_FOUND,
        "No active subscription found for this user"
      );
    }

    const subscriptionToken = jwtHelpers.generateSubscriptionToken(
      activeSubscription as any,
      config.jwt_access_secret as string,
      config.expires_in as string,
      
      
    );

    return subscriptionToken;
  } catch (error) {
    throw catchError(error, "Failed to fetch user active subscription");
  }
};

const deleteUserSubscriptionIntoDb=async(id:string)=>{

     try{

        const isExistAvailableSubscription=await prisma.userSubscription.findFirst({where:{id},select:{
          id:true,
          userId: true
        }});
        if(!isExistAvailableSubscription){
            return {
                status: false,
                message:"this subscription not exist"
            }
        };
        await prisma.userSubscription.delete({
            where:{
                id
            }
        }).catch((error)=>{
            throw new AppError(status.SERVICE_UNAVAILABLE, 'delete subscription server section some issues ', error);
        })
        await invalidateUserSubscriptionCache(isExistAvailableSubscription.userId);

     }
     catch (error) {
    throw catchError(error, "Failed to fetch user active subscription");
  }
};



const verifiedPaymentRequestIntoDb = async (
  requestId: string
): Promise<ServiceResponse> => {
  try {
    
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        userId: true,
        plan: {
          select: {
            tier: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new AppError(status.NOT_FOUND, 'Payment request not found');
    }

    // ৩. ভ্যালিডেশন চেক
    if (subscription.plan.tier.includes(PlanTier.BASIC)) {
      throw new AppError(
        status.BAD_REQUEST,
        'Basic subscription does not require payment verification'
      );
    }

    // ৪. ইউনিক আইডির জন্য update() ব্যবহার
    await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        isActive: true,
        paymentStatus: PaymentStatus.PAID,
        isPaymentVerify: true,
      },
    });
    await invalidateUserSubscriptionCache(subscription.userId);

    return {
      status: status.OK,
      message: 'Successfully Payment Verified',
    };
  } catch (error) {
    throw catchError(error, 'Failed to verify payment request');
  }
};

const UserSubscriptionService = {
  createUserSubscriptionIntoDB,
  myActiveSubscriptionIntoDb,
  myAllSubIntoDb,
  deleteUserSubscriptionIntoDb,
  verifiedPaymentRequestIntoDb
};

export default UserSubscriptionService;