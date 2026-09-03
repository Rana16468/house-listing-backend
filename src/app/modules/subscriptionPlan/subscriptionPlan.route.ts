import express from 'express';
import validationRequest from '../../middlewares/validationRequest';
import SubscriptionPlanValidation from './subscriptionPlan.validation';
import SubscriptionPlanController from './subscriptionPlan.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';


const router = express.Router();

router.post(
  '/create-subscription-plan',
  auth(Role.ADMIN),
  validationRequest(SubscriptionPlanValidation.createSubscriptionPlanZodSchema),
  SubscriptionPlanController.createSubscriptionPlan
);
router.get(
  '/get-all-subscription-plans',
  auth(Role.ADMIN, Role.LANDLORD, Role.TENANT),
  SubscriptionPlanController.getAllSubscriptionPlans,
  
);

router.get("/get-specific-subscription-plan/:id",
     auth(Role.ADMIN, Role.LANDLORD, Role.TENANT),
   SubscriptionPlanController.getSingleSubscriptionPlan
)



export const SubscriptionPlanRoutes = router;