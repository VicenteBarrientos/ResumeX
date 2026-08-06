import "server-only";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Short-lived in-process cache for jobs / metadata.
 * Never cache credentials or decrypted secrets.
 */
export function atsCacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function atsCacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function atsCacheInvalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function atsCacheClearAll(): void {
  store.clear();
}

export const ATS_JOB_CACHE_TTL_MS = 60_000;
export const ATS_METADATA_CACHE_TTL_MS = 5 * 60_000;
