import { createHash } from "crypto";

export type CacheDomain = "posts" | "rooms" | "saved-rooms" | "users";

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, stableValue(nestedValue)])
    );
  }
  return value;
};

const hash = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");

const safePart = (value: string) => encodeURIComponent(value);

export const cacheKeys = {
  posts: {
    list: (query: unknown) => `list:${hash(query)}`,
    detail: (id: string) => `detail:${safePart(id)}`,
    byDevice: (deviceId: string, query: unknown) =>
      `device:${hash(deviceId)}:${hash(query)}`,
    regions: () => "regions",
  },
  rooms: {
    list: (query: unknown) => `list:${hash(query)}`,
    detail: (id: string) => `detail:${safePart(id)}`,
    byUser: (userId: string, query: unknown) =>
      `user:${hash(userId)}:${hash(query)}`,
  },
  savedRooms: {
    byUser: (userId: string, query: unknown) =>
      `user:${hash(userId)}:${hash(query)}`,
  },
  users: {
    profile: (userId: string) => `profile:${safePart(userId)}`,
  },
};

export const cacheTtlSeconds = {
  detail: 300,
  list: 60,
  aggregate: 120,
  profile: 300,
} as const;