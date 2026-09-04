import express from "express";
import { TestRoutes } from "../modules/testModule/test.route";
import UserRoutes from "../modules/user/user.route";
import AuthRoutes from "../modules/auth/auth.route";
import { SubscriptionPlanRoutes } from "../modules/subscriptionPlan/subscriptionPlan.route";
import UserSubscriptionRoutes from "../modules/userSubscription/userSubscription.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/test",
    route: TestRoutes,
  },
  {
    path:"/user",
    route: UserRoutes
  },
  {
    path:"/auth",
    route: AuthRoutes
  },
  {
    path:"/subscription-plan",
    route: SubscriptionPlanRoutes
  },
  {
    path:"/user_subscription",
    route: UserSubscriptionRoutes
  }
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;