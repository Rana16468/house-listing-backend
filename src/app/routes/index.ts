import express from "express";
import { TestRoutes } from "../modules/testModule/test.route";
import UserRoutes from "../modules/user/user.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/test",
    route: TestRoutes,
  },
  {
    path:"/user",
    route: UserRoutes
  }
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;