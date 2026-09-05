import Redis, { Redis as RedisType } from "ioredis";
import config from "../config";
import { logger } from "./logger";

let redisClient: RedisType | null = null;
let isRedisConnected = false;
let redisDisabledUntil = 0;
let redisFailureLogged = false;

type MemoryCacheEntry = {
  value: string;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryCacheEntry>();
const REDIS_DISABLE_WINDOW_MS = 60 * 1000;

const isAuthError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toUpperCase();
  return message.includes("NOAUTH") || message.includes("WRONGPASS");
};

const markRedisUnavailable = (error?: unknown) => {
  isRedisConnected = false;
  if (isAuthError(error)) {
    redisDisabledUntil = Date.now() + REDIS_DISABLE_WINDOW_MS;
  }
};

const isRedisTemporarilyDisabled = () => Date.now() < redisDisabledUntil;

const setMemoryCache = (key: string, value: unknown, ttl = 3600) => {
  memoryCache.set(key, {
    value: JSON.stringify(value),
    expiresAt: Date.now() + ttl * 1000,
  });
};

const getMemoryCache = (key: string) => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return JSON.parse(entry.value);
};

const deleteMemoryCache = (key: string) => {
  memoryCache.delete(key);
};

const deleteMemoryCacheByPattern = (pattern: string) => {
  const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
};

export function getRedisClient(): RedisType {
  if (redisClient) return redisClient;

  const trimmedUrl = config.redis.url?.trim();
  const trimmedPassword = config.redis.password?.trim();

  // URL থাকলে এবং তাতে পাসওয়ার্ড না থাকলে পাসওয়ার্ড যুক্ত করে নতুন URL তৈরি
  let connectionUrl = trimmedUrl;
  if (connectionUrl && trimmedPassword && !connectionUrl.includes("@")) {
    connectionUrl = connectionUrl.replace("redis://", `redis://:${trimmedPassword}@`);
  }

  const commonOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (isRedisTemporarilyDisabled()) return null;
      return Math.min(times * 50, 2000);
    },
  };

  redisClient = connectionUrl
    ? new Redis(connectionUrl, commonOptions)
    : new Redis({
        host: config.redis.host,
        port: config.redis.port,
        ...(trimmedPassword ? { password: trimmedPassword } : {}),
        ...commonOptions,
      });

  redisClient.on("connect", () => {
    if (!redisFailureLogged) {
      logger.info("Redis connected");
    }
    isRedisConnected = true;
  });

  redisClient.on("error", (err: any) => {
    if (!redisFailureLogged) {
      logger.warn(
        { err: { message: err.message } },
        "Redis error: Redis may not be running. Caching disabled."
      );
      redisFailureLogged = true;
    }

    markRedisUnavailable(err);

    if (isAuthError(err)) {
      redisClient?.disconnect(false);
      redisClient = null;
    }
  });

  redisClient.on("close", () => {
    if (!redisFailureLogged) {
      logger.warn("Redis connection closed");
    }
    markRedisUnavailable();
  });

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  try {
    if (isRedisTemporarilyDisabled()) return;

    const client = getRedisClient();

    if (client.status !== "ready" && client.status !== "connecting") {
      await client.connect();
    }

    redisFailureLogged = false;
  } catch (err) {
    markRedisUnavailable(err);

    if (!redisFailureLogged) {
      logger.warn(
        { err: err instanceof Error ? { message: err.message } : err },
        "Redis connection attempt failed. Using in-memory cache fallback."
      );
      redisFailureLogged = true;
    }

    if (isAuthError(err)) {
      redisClient?.disconnect(false);
      redisClient = null;
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info("Redis disconnected");
    }
  } catch (err) {
    logger.error({ err }, "Redis disconnect error");
  }
}

export const setCache = async (key: string, value: unknown, ttl = 3600) => {
  try {
    await connectRedis();

    if (isRedisConnected && redisClient) {
      await redisClient.set(key, JSON.stringify(value), "EX", ttl);
      logger.info({ key, ttl }, "Redis cache set");
      return;
    }
  } catch (err) {
    markRedisUnavailable(err);
  }

  setMemoryCache(key, value, ttl);
};

export const getCache = async (key: string) => {
  try {
    await connectRedis();

    if (isRedisConnected && redisClient) {
      const data = await redisClient.get(key);

      if (data) {
        logger.info({ key }, "Redis cache hit");
        return JSON.parse(data);
      }

      logger.info({ key }, "Redis cache miss");
      return null;
    }
  } catch (err) {
    markRedisUnavailable(err);
  }

  return getMemoryCache(key);
};

export const deleteCache = async (key: string) => {
  try {
    await connectRedis();

    if (isRedisConnected && redisClient) {
      await redisClient.del(key);
      logger.info({ key }, "Redis cache delete");
      return;
    }
  } catch (err) {
    markRedisUnavailable(err);
  }

  deleteMemoryCache(key);
};

export const deleteByPattern = async (pattern: string) => {
  try {
    await connectRedis();

    if (isRedisConnected && redisClient) {
      const stream = redisClient.scanStream({
        match: pattern,
        count: 100,
      });

      let totalDeleted = 0;

      for await (const keys of stream) {
        if (keys.length > 0) {
          const pipeline = redisClient.pipeline();
          keys.forEach((key: string) => pipeline.del(key));
          await pipeline.exec();
          totalDeleted += keys.length;
        }
      }

      logger.info({ pattern, count: totalDeleted }, "Redis cache delete by pattern");
      return;
    }
  } catch (err) {
    markRedisUnavailable(err);
  }

  deleteMemoryCacheByPattern(pattern);
};

export const setCacheIfNotExists = async (
  key: string,
  value: unknown,
  ttl = 3600
) => {
  try {
    await connectRedis();

    if (isRedisConnected && redisClient) {
      const result = await redisClient.set(
        key,
        JSON.stringify(value),
        "EX",
        ttl,
        "NX"
      );

      return result === "OK";
    }
  } catch (err) {
    markRedisUnavailable(err);
  }

  const existingValue = getMemoryCache(key);

  if (existingValue !== null) {
    return false;
  }

  setMemoryCache(key, value, ttl);
  return true;
};

export const isRedisAlive = () => isRedisConnected;