import Redis, { Redis as RedisType } from "ioredis";
import config from "../config";
import { logger } from "./logger";

let redisClient: RedisType | null = null;
let isRedisConnected = false;
let redisDisabledUntil = 0;
let redisFailureLogged = false;
let consecutiveFailures = 0;

type MemoryCacheEntry = {
  value: string;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryCacheEntry>();

// Base backoff window + exponential growth, capped, so a dead Redis host
// doesn't force every single request to eat a full connect/handshake
// timeout. This applies to ALL connection failures, not just auth errors.
const REDIS_DISABLE_BASE_MS = 5 * 1000;
const REDIS_DISABLE_MAX_MS = 5 * 60 * 1000;

const isAuthError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toUpperCase();
  return message.includes("NOAUTH") || message.includes("WRONGPASS");
};

const markRedisUnavailable = (error?: unknown) => {
  isRedisConnected = false;
  consecutiveFailures += 1;

  // Previously this backoff only kicked in for NOAUTH/WRONGPASS, so any
  // other failure (wrong host/port, network unreachable, TLS/timeout,
  // Redis down) caused every single request to re-attempt a full
  // connect handshake before falling back to memory cache — that retry
  // was the source of the ~900ms tax on every "cached" GET call.
  // Now ANY connection failure triggers an exponential backoff window.
  const backoff = Math.min(
    REDIS_DISABLE_BASE_MS * 2 ** (consecutiveFailures - 1),
    REDIS_DISABLE_MAX_MS
  );
  redisDisabledUntil = Date.now() + backoff;

  if (isAuthError(error)) {
    // Auth errors won't self-resolve without a config change, so don't
    // bother retrying quickly at all.
    redisDisabledUntil = Date.now() + REDIS_DISABLE_MAX_MS;
  }
};

const markRedisAvailable = () => {
  isRedisConnected = true;
  consecutiveFailures = 0;
  redisDisabledUntil = 0;
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
    // Fail fast instead of hanging: if a connect attempt can't establish
    // within this window, bail out so we fall back to memory cache
    // quickly rather than blocking the request.
    connectTimeout: 2000,
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
  });

  redisClient.on("ready", () => {
    logger.info("Redis ready");
    markRedisAvailable();
    redisFailureLogged = false;
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
    if (!isRedisTemporarilyDisabled()) {
      await connectRedis();

      if (isRedisConnected && redisClient) {
        await redisClient.set(key, JSON.stringify(value), "EX", ttl);
        logger.info({ key, ttl }, "Redis cache set");
        return;
      }
    }
  } catch (err) {
    markRedisUnavailable(err);
  }

  setMemoryCache(key, value, ttl);
};

export const getCache = async (key: string) => {
  try {
    if (!isRedisTemporarilyDisabled()) {
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
    }
  } catch (err) {
    markRedisUnavailable(err);
  }

  return getMemoryCache(key);
};

export const deleteCache = async (key: string) => {
  deleteMemoryCache(key); // সবসময় memory থেকেও মুছবে
  try {
    if (!isRedisTemporarilyDisabled()) {
      await connectRedis();
      if (isRedisConnected && redisClient) {
        await redisClient.del(key);
        logger.info({ key }, "Redis cache delete");
      }
    }
  } catch (err) {
    markRedisUnavailable(err);
  }
};

export const deleteByPattern = async (pattern: string) => {
  try {
    if (!isRedisTemporarilyDisabled()) {
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
    if (!isRedisTemporarilyDisabled()) {
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