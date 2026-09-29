import express from "express";
import { TestRoutes } from "../modules/testModule/test.route";
import postRouter from "../modules/HouseListing/houseListing.route";
import UserRoutes from "../modules/User/user.route";


const router = express.Router();

const moduleRoutes = [
  {
    path: "/test",
    route: TestRoutes,

  },
  {
    path: "/house_list",
    route: postRouter
  },
  {
    path:"/user",
    route:UserRoutes
  }

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;