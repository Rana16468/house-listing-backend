import express, { Application, Request, Response } from "express";
import cors from "cors";
import cron from "node-cron";
import router from "./app/routes";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import cookieParser from "cookie-parser";
import monitorRouter, { recordRequestMetrics } from "./app/utils/metrics/metricsMiddleware";
import systemArtc from "./app/utils/metrics/systemArtc";
import autoDeleteAvailableFrom from "./app/utils/autoDeleteavailableFrom";

const app: Application = express();

// CORS কনফিগারেশন সংশোধন করা হয়েছে
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

// parsers
app.use(express.json());
app.use(cookieParser());
app.use(recordRequestMetrics);

// router setup
app.use("/api/v1", router);
app.use("/api/v1/monitor", monitorRouter); // ← metrics endpoint

app.get("/", (req: Request, res: Response) => {
  res.send(systemArtc());
});
cron.schedule("*/30 * * * *", async () => {
  await autoDeleteAvailableFrom();
});
app.use(globalErrorHandler);

app.use(notFound);

export default app;

//docker build command 
/*
1. docker-compose down
2. docker-compose up --build -d
3. docker-compose logs -f backend
*/

// radis 

/* docker stop ts_express_redis
docker start ts_express_redis */

// radis run docker run -d --name ts_express_redis -p 6379:6379 redis:7-alpine