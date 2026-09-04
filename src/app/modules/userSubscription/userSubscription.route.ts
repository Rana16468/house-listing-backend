import express from 'express';
import validationRequest from '../../middlewares/validationRequest';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';
import UserSubscriptionController from './userSubscription.controller';
import UserSubscriptionValidation from './userSubscription.validation';


const router = express.Router();

router.post("/buy_subscription", auth(Role.ADMIN, Role.LANDLORD),
 validationRequest(UserSubscriptionValidation.createUserSubscriptionZodSchema),
 UserSubscriptionController.createUserSubscription
)
router.get("/my-all-sub",
    auth(Role.LANDLORD),
    UserSubscriptionController.myAllSub
)
router.get("/my-latest-active-sub",
    auth(Role.LANDLORD),
    UserSubscriptionController.myActiveSubscription
)


 const UserSubscriptionRoutes = router;
 export default UserSubscriptionRoutes