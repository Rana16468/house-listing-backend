import { PlanTier } from '@prisma/client';
import { z } from 'zod';

const createSubscriptionPlanZodSchema = z.object({
  body: z.object({
    tier: z.nativeEnum(PlanTier, { error: 'Plan tier is required' }),
    nameEn: z.string({ error: 'English name is required' }).min(1),
    nameBn: z.string({ error: 'Bengali name is required' }).min(1),
    maxUnits: z.number({ error: 'Max units is required' }).int().positive(),
    unitDetailsEn: z.string({ error: 'English unit details required' }).min(1),
    unitDetailsBn: z.string({ error: 'Bengali unit details required' }).min(1),
    featuresEn: z.array(z.string()).min(1, 'At least one English feature required'),
    featuresBn: z.array(z.string()).min(1, 'At least one Bengali feature required'),
    priceMonthly: z.number({ error: 'Monthly price is required' }).nonnegative(),
    flat: z.number({ error: 'Flat is required' }).int().positive(),
  }),
});

const updateSubscriptionPlanZodSchema = z.object({
  body: createSubscriptionPlanZodSchema.shape.body.partial().extend({
    addFeaturesEn: z.array(z.string().min(1)).optional(),
    addFeaturesBn: z.array(z.string().min(1)).optional(),

    // Custom Array Remove Operations
    removeFeaturesEn: z.array(z.string().min(1)).optional(),
    removeFeaturesBn: z.array(z.string().min(1)).optional(),
  }),
});

 const SubscriptionPlanValidation = {
  createSubscriptionPlanZodSchema,
  updateSubscriptionPlanZodSchema,
};

export default SubscriptionPlanValidation;