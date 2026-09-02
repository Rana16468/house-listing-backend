import express, { Application, Request, Response } from "express";
import cors from "cors";
import config from "./app/config";
import router from "./app/routes";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import cookieParser  from 'cookie-parser';

const app: Application = express();

// parsers
app.use(express.json());
app.use(
  cors({
    origin: ["*"],
    credentials: true,
  })
);
app.use(cookieParser());
// parser


// router setup
app.use("/api/v1", router);

app.get("/", (req: Request, res: Response) => {
  res.send(`Server Running on port ${config.port}`);
});


app.use(globalErrorHandler);

app.use(notFound);

export default app;