import { Server } from "http";
import app from "./app";
import config from "./app/config/index";
import { connectRedis, disconnectRedis, isRedisAlive } from "./app/redis/redis";
import { logger } from "./app/redis/logger";

let server: Server;

async function main() {
  try {
    // 1. Redis Connection Attempt
    await connectRedis();

    // 2. Start HTTP Server
    server = app.listen(config.port, () => {
      console.log(`🚀 Server running on http://${config.host}:${config.port}`);

      if (isRedisAlive()) {
        console.log(
          `✅ Redis connected successfully: ${
            config.redis.url || `${config.redis.host}:${config.redis.port}`
          }`
        );
      } else {
        console.log("⚠️ Redis unavailable. Falling back to in-memory cache.");
      }
    });

    // 3. Handle Port Errors
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.syscall !== "listen") throw error;

      switch (error.code) {
        case "EACCES":
          logger.error(`❌ Port ${config.port} requires elevated privileges`);
          process.exit(1);
          break;
        case "EADDRINUSE":
          logger.error(`❌ Port ${config.port} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
  } catch (err) {
    logger.error({ err }, "❌ Failed to start the server");
    process.exit(1);
  }
}

main();

// Graceful Shutdown Function
const handleShutdown = async (signal: string) => {
  logger.info(`🟡 ${signal} received. Shutting down gracefully...`);
  try {
    if (server) {
      server.close(async () => {
        logger.info("HTTP server closed.");
        await disconnectRedis();
        logger.info("✅ Process terminated gracefully");
        process.exit(0);
      });
    } else {
      await disconnectRedis();
      process.exit(0);
    }
  } catch (err) {
    logger.error({ err }, "Error during graceful shutdown");
    process.exit(1);
  }
};

// Process Event Listeners
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "🔴 Unhandled Rejection detected.");
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "🔴 Uncaught Exception detected.");
  process.exit(1);
});

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));