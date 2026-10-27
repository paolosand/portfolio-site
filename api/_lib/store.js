// Counter store for the chat limiter.
//
// Store = {
//   incr(key, ttlSeconds): Promise<number>
//   incrBy(key, amount, ttlSeconds): Promise<number>
//   get(key): Promise<number>          // missing/expired -> 0
// }
// incr/incrBy are atomic and set the TTL only when they create the key: a fixed
// window, so a client hammering a key can never keep it alive past its window.

const SWEEP_EVERY = 500;

// Used for tests and as the fail-open fallback when Redis is down. Per-instance only.
export function createMemoryStore(now = () => Date.now()) {
  const entries = new Map(); // key -> { value, expiresAt }
  let writes = 0;

  const live = (key, t) => {
    const e = entries.get(key);
    if (!e) return null;
    if (e.expiresAt <= t) { entries.delete(key); return null; }
    return e;
  };

  // Lazy expiry alone would leak keys for IPs that never return in a warm lambda.
  const sweep = (t) => {
    for (const [k, e] of entries) if (e.expiresAt <= t) entries.delete(k);
  };

  // No await anywhere in here: the read-modify-write must finish within one tick
  // so concurrent callers each see a distinct count.
  const add = (key, amount, ttlSeconds) => {
    const t = now();
    if (++writes % SWEEP_EVERY === 0) sweep(t);
    let e = live(key, t);
    if (!e) {
      e = { value: 0, expiresAt: t + ttlSeconds * 1000 };
      entries.set(key, e);
    }
    e.value += amount;
    return e.value;
  };

  return {
    incr: async (key, ttlSeconds) => add(key, 1, ttlSeconds),
    incrBy: async (key, amount, ttlSeconds) => add(key, amount, ttlSeconds),
    get: async (key) => live(key, now())?.value ?? 0,
  };
}
