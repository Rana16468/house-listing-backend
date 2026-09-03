import { PlanTier } from '@prisma/client';

export interface TSubscriptionPlan {
  tier: PlanTier;
  nameEn: string;
  nameBn: string;
  maxUnits: number;
  unitDetailsEn: string;
  unitDetailsBn: string;
  featuresEn: string[];
  featuresBn: string[];
  priceMonthly: number;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Utility type for transformed response after language filtering
export interface TFormattedSubscriptionPlan {
  id: string;
  tier: PlanTier;
  name: string;
  maxUnits: number;
  unitDetails: string;
  features: string[];
  priceMonthly: number;
  createdAt: Date;
  updatedAt: Date;
}