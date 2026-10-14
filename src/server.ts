import { Server } from "http";
import app from "./app";

import { connectRedis, disconnectRedis, isRedisAlive } from "./app/redis/redis";
import { logger } from "./app/redis/logger";
import config from "./app/config";
import { connectSocket } from "./socket/connectSocket";

let server: Server;

const logRedisStatus = () => {
  if (isRedisAlive()) {
    logger.info(
      `✅ Redis connected successfully: ${config.redis.host}:${config.redis.port}`
    );
  } else {
    logger.warn("⚠️ Redis unavailable. Falling back to in-memory cache.");
  }
};

const connectToRedis = async () => {
  try {
    await connectRedis();
  } catch (err) {
    logger.error({ err }, "Redis connection failed. Using in-memory cache.");
  } finally {
    setTimeout(logRedisStatus, 500);
  }
};

const startServer = () => {
  server = app.listen(Number(config.port), "0.0.0.0", () => {
    logger.info(`🚀 Server running on http://${config.host}:${config.port}`);
    connectSocket(server);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.syscall !== "listen") {
      logger.error({ err: error }, "Server error");
      process.exit(1);
    }

    switch (error.code) {
      case "EACCES":
        logger.error(`❌ Port ${config.port} requires elevated privileges`);
        break;
      case "EADDRINUSE":
        logger.error(`❌ Port ${config.port} is already in use`);
        break;
      default:
        logger.error({ err: error }, "Failed to bind the server port");
    }

    process.exit(1);
  });
};

startServer();
void connectToRedis();

const handleShutdown = async (signal: string) => {
  logger.info(`🟡 ${signal} received. Shutting down gracefully...`);

  try {
    if (server) {
      server.close(async () => {
        await disconnectRedis();
        logger.info("✅ Process terminated gracefully");
        process.exit(0);
      });
      return;
    }

    await disconnectRedis();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during graceful shutdown");
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "🔴 Unhandled rejection detected.");
  if (server) {
    server.close(() => process.exit(1));
    return;
  }

  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "🔴 Uncaught exception detected.");
  process.exit(1);
});

process.on("SIGTERM", () => void handleShutdown("SIGTERM"));
process.on("SIGINT", () => void handleShutdown("SIGINT"));
