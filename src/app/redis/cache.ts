import {
  getCache,
  getCacheVersion,
  isRedisAlive,
  incrementCacheVersion,
  setCache,
} from "./redis";
import { CacheDomain } from "./cacheKeys";

const versionedKey = (domain: CacheDomain, version: string, key: string) =>
  `cache:v1:${domain}:${version}:${key}`;

export async function invalidateCacheDomains(
  ...domains: CacheDomain[]
): Promise<void> {
  await Promise.all(domains.map((domain) => incrementCacheVersion(domain)));
}

export async function cacheAside<T>(
  domain: CacheDomain,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const version = await getCacheVersion(domain);
  if (!isRedisAlive()) return loader();

  const keyAtVersion = versionedKey(domain, version, key);

  try {
    const cached = await getCache(keyAtVersion);
    if (isRedisAlive() && cached !== null && cached !== undefined) {
      return cached as T;
    }
  } catch {
    // Cache failures must not change the API's database-backed behavior.
  }

  const fresh = await loader();
  if (fresh !== null && fresh !== undefined) {
    try {
      if (
        isRedisAlive() &&
        (await getCacheVersion(domain)) === version &&
        isRedisAlive()
      ) {
        await setCache(keyAtVersion, fresh, ttlSeconds);
      }
    } catch {
      // The fresh database result is still returned when caching is unavailable.
    }
  }

  return fresh;
}