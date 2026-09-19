import express from "express";
import { TestRoutes } from "../modules/testModule/test.route";
import postRouter from "../modules/HouseListing/houseListing.route";


const router = express.Router();

const moduleRoutes = [
  {
    path: "/test",
    route: TestRoutes,

  },
  {
    path: "/house_list",
    route: postRouter
  }

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;