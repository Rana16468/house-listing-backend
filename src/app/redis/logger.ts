import pino from "pino";
import config from "../config";


const isProduction = config.NODE_ENV === "development";

export const logger = pino({
  level: isProduction ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.confirmPassword",
      "req.body.oldPassword",
      "req.body.newPassword",
      "req.body.oldpassword",
      "req.body.newpassword",
      "req.body.refreshToken",
      "req.body.token",
      "response.body.refreshToken",
      "response.body.data.refreshToken",
      "response.body.data.accessToken",
      "err.stack",
    ],
    censor: "[REDACTED]",
  },
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: false,
          ignore: "pid,hostname",
        },
      },
});