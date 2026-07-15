import type { EventBus } from './event-bus';
import type { Unsubscribe } from './types';

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  storedAt: number;
  /** True once `staleMs` has elapsed — reads still succeed but trigger revalidation. */
  isStale: boolean;
}

export interface SwrOptions {
  /** Time until an entry counts as stale and is revalidated in the background. Default 30s. */
  staleMs?: number;
  /** Hard expiry — after this the entry is treated as a miss. Default 5min. */
  ttlMs?: number;
  /** Skip the cache read and always hit the fetcher (still deduped in-flight). */
  forceRevalidate?: boolean;
}

/**
 * Host-owned stale-while-revalidate cache shared by all remotes.
 *
 * CONTRACT: keys are a shared namespace (`fleet-data`, `task:<id>:result`, ...).
 * Two remotes requesting the same key concurrently — or within the freshness
 * window — trigger exactly ONE network request. In-flight promises are
 * deduped, so navigating reports → analytics never refetches `fleet-data`.
 */
export interface DataCache {
  /** SWR read-through: cached value when fresh, deduped fetch otherwise. */
  fetch<T>(key: string, fetcher: () => Promise<T>, options?: SwrOptions): Promise<T>;
  /** Synchronous peek without side effects (no revalidation). */
  peek<T>(key: string): T | undefined;
  getEntry<T>(key: string): CacheEntry<T> | undefined;
  set<T>(key: string, value: T): void;
  invalidate(key: string): void;
  /** Notifies whenever `key` is written or invalidated. */
  subscribe(key: string, listener: (entry: CacheEntry | undefined) => void): Unsubscribe;
  keys(): string[];
}

interface InternalEntry {
  value: unknown;
  storedAt: number;
}

export function createDataCache(bus: EventBus): DataCache {
  const store = new Map<string, InternalEntry>();
  const inFlight = new Map<string, Promise<unknown>>();
  const listeners = new Map<string, Set<(entry: CacheEntry | undefined) => void>>();

  const DEFAULT_STALE_MS = 30_000;
  const DEFAULT_TTL_MS = 300_000;

  const toEntry = (key: string, entry: InternalEntry, staleMs: number): CacheEntry => ({
    key,
    value: entry.value,
    storedAt: entry.storedAt,
    isStale: Date.now() - entry.storedAt > staleMs,
  });

  const notify = (key: string) => {
    const entry = store.get(key);
    const snapshot = entry ? toEntry(key, entry, DEFAULT_STALE_MS) : undefined;
    listeners.get(key)?.forEach((listener) => listener(snapshot));
  };

  const write = (key: string, value: unknown) => {
    store.set(key, { value, storedAt: Date.now() });
    bus.emit('cache:updated', { key });
    notify(key);
  };

  const revalidate = <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T>;
    const promise = Promise.resolve()
      .then(fetcher)
      .then((value) => {
        write(key, value);
        return value;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  };

  return {
    async fetch<T>(key: string, fetcher: () => Promise<T>, options: SwrOptions = {}): Promise<T> {
      const { staleMs = DEFAULT_STALE_MS, ttlMs = DEFAULT_TTL_MS, forceRevalidate = false } = options;
      const entry = store.get(key);
      const age = entry ? Date.now() - entry.storedAt : Infinity;

      if (entry && !forceRevalidate && age <= ttlMs) {
        if (age > staleMs) {
          // Stale: serve instantly, refresh in the background.
          void revalidate(key, fetcher).catch((err) =>
            console.warn(`[bridge:cache] background revalidation of "${key}" failed`, err),
          );
        }
        return entry.value as T;
      }
      return revalidate(key, fetcher);
    },
    peek<T>(key: string): T | undefined {
      return store.get(key)?.value as T | undefined;
    },
    getEntry<T>(key: string): CacheEntry<T> | undefined {
      const entry = store.get(key);
      return entry ? (toEntry(key, entry, DEFAULT_STALE_MS) as CacheEntry<T>) : undefined;
    },
    set(key, value) {
      write(key, value);
    },
    invalidate(key) {
      store.delete(key);
      bus.emit('cache:invalidated', { key });
      notify(key);
    },
    subscribe(key, listener) {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(listener);
      return () => set.delete(listener);
    },
    keys: () => [...store.keys()],
  };
}
