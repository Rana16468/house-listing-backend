import { NextFunction, Request, Response, Router } from "express";

import httpStatus from "http-status";
import { metricsService } from "./metrics.service";



const monitorRouter = Router();

export const recordRequestMetrics = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.path.startsWith("/monitor")) {
    next();
    return;
  }

  const startedAt = Date.now();
  res.on("finish", () => {
    metricsService.recordRequest(
      Date.now() - startedAt,
      res.statusCode < httpStatus.BAD_REQUEST
    );
  });
  next();
};

monitorRouter.get("/metrics", async (_req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.status(httpStatus.OK).json(metrics);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch metrics" });
  }
});

export default monitorRouter;