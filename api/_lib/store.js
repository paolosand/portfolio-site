// Counter store for the chat limiter.
//
// Store = {
//   incr(key, ttlSeconds): Promise<number>
//   incrBy(key, amount, ttlSeconds): Promise<number>
//   get(key): Promise<number>          // missing/expired -> 0
// }
// incr/incrBy are atomic and set the TTL only when they create the key: a fixed
// window, so a client hammering a key can never keep it alive past its window.

import { Redis } from '@upstash/redis';

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

// EXPIRE ... NX in the same pipeline keeps the window fixed: the TTL is applied only
// when the key has none, i.e. on creation. Errors propagate; the limiter fails open.
// `client` is injectable so tests can run without a network.
export function createRedisStore({ url, token, client = new Redis({ url, token }) }) {
  const bump = async (key, amount, ttlSeconds) => {
    const p = client.pipeline();
    (amount === 1 ? p.incr(key) : p.incrby(key, amount)).expire(key, ttlSeconds, 'NX');
    const [count] = await p.exec();
    return Number(count);
  };
  return {
    incr: (key, ttlSeconds) => bump(key, 1, ttlSeconds),
    incrBy: (key, amount, ttlSeconds) => bump(key, amount, ttlSeconds),
    // Upstash may return the stored integer as a number or string; missing -> null.
    get: async (key) => Number(await client.get(key)) || 0,
  };
}

// Env names differ between a manual Upstash setup and the Vercel Marketplace (KV_*).
export function getDefaultStore(env = process.env) {
  // Take a complete pair; never mix a URL from one family with a token from the other.
  const pair = [
    [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN],
    [env.KV_REST_API_URL, env.KV_REST_API_TOKEN],
  ].find(([u, t]) => u && t);
  if (!pair) return null;
  const [url, token] = pair;
  return createRedisStore({ url, token });
}
