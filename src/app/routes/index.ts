import express from "express";
import { TestRoutes } from "../modules/testModule/test.route";
import UserRoutes from "../modules/user/user.route";
import AuthRoutes from "../modules/auth/auth.route";
import { SubscriptionPlanRoutes } from "../modules/subscriptionPlan/subscriptionPlan.route";

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
  }
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;