import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore, createRedisStore, getDefaultStore } from './store.js';

// Minimal fake of the @upstash/redis surface the adapter uses. Models EXPIRE ... NX
// faithfully (TTL only applied when none is set) so the fixed-window contract is real.
function fakeRedis(now) {
  const data = new Map(); // key -> { value, expiresAt|null }
  const live = (k) => {
    const e = data.get(k);
    if (e && e.expiresAt !== null && e.expiresAt <= now()) { data.delete(k); return null; }
    return e ?? null;
  };
  const ops = {
    incrby: (k, n) => {
      const e = live(k) ?? { value: 0, expiresAt: null };
      e.value += n; data.set(k, e); return e.value;
    },
    expire: (k, ttl, mode) => {
      const e = live(k);
      if (!e) return 0;
      if (mode === 'NX' && e.expiresAt !== null) return 0;
      e.expiresAt = now() + ttl * 1000; return 1;
    },
  };
  return {
    get: async (k) => live(k)?.value ?? null,
    pipeline() {
      const queue = [];
      const p = {
        incr: (k) => { queue.push(() => ops.incrby(k, 1)); return p; },
        incrby: (k, n) => { queue.push(() => ops.incrby(k, n)); return p; },
        expire: (k, ttl, mode) => { queue.push(() => ops.expire(k, ttl, mode)); return p; },
        exec: async () => queue.map((f) => f()),
      };
      return p;
    },
  };
}

test('getDefaultStore returns null when no env pair is complete', () => {
  assert.equal(getDefaultStore({}), null);
  assert.equal(getDefaultStore({ UPSTASH_REDIS_REST_URL: 'https://x' }), null);
  assert.equal(getDefaultStore({ KV_REST_API_TOKEN: 't' }), null);
});

test('getDefaultStore builds a store from either env pair without network', () => {
  for (const env of [
    { UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 't' },
    { KV_REST_API_URL: 'https://x.upstash.io', KV_REST_API_TOKEN: 't' },
  ]) {
    const s = getDefaultStore(env);
    for (const m of ['incr', 'incrBy', 'get']) assert.equal(typeof s[m], 'function');
  }
});

test('getDefaultStore trims a trailing newline from the URL and token', () => {
  const s = getDefaultStore({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io\n', UPSTASH_REDIS_REST_TOKEN: ' t\n' });
  assert.notEqual(s, null);
  for (const m of ['incr', 'incrBy', 'get']) assert.equal(typeof s[m], 'function');
});

test('getDefaultStore treats whitespace-only values as unset', () => {
  assert.equal(getDefaultStore({ UPSTASH_REDIS_REST_URL: '  \n', UPSTASH_REDIS_REST_TOKEN: 't' }), null);
  assert.equal(getDefaultStore({ KV_REST_API_URL: 'https://x.upstash.io', KV_REST_API_TOKEN: ' ' }), null);
  // A blank half of one family never borrows from the other.
  assert.equal(
    getDefaultStore({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: ' ', KV_REST_API_URL: ' ', KV_REST_API_TOKEN: 't' }),
    null,
  );
});

test('getDefaultStore returns null and logs once (without the token) on an invalid URL', () => {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(' '));
  try {
    assert.equal(getDefaultStore({ UPSTASH_REDIS_REST_URL: 'not a url', UPSTASH_REDIS_REST_TOKEN: 'sekrit-token' }), null);
  } finally {
    console.error = original;
  }
  assert.equal(logged.length, 1);
  assert.ok(!logged[0].includes('sekrit-token'));
});

test('redis store: the Upstash client is built with retry disabled', () => {
  const configs = [];
  class FakeRedis { constructor(config) { configs.push(config); } }
  createRedisStore({ url: 'https://x.upstash.io', token: 't', Client: FakeRedis });
  assert.deepEqual(configs, [{ url: 'https://x.upstash.io', token: 't', retry: false }]);
});

// Same contract for every store implementation.
function contract(name, make) {
  test(`${name}: incr counts up and does not extend the TTL`, async () => {
    const { store, advance } = make();
    const key = `test:${name}:${Date.now()}:${Math.random()}`;
    assert.equal(await store.incr(key, 10), 1);
    advance(6);
    assert.equal(await store.incr(key, 10), 2);
    // 12s after creation: the original window is over even though we hit it at 6s.
    advance(6);
    assert.equal(await store.get(key), 0);
  });

  test(`${name}: incrBy adds and get returns 0 when missing`, async () => {
    const { store } = make();
    const key = `test:${name}:${Date.now()}:${Math.random()}`;
    assert.equal(await store.get(key), 0);
    assert.equal(await store.incrBy(key, 5, 10), 5);
    assert.equal(await store.incrBy(key, 7, 10), 12);
    assert.equal(await store.get(key), 12);
  });
}

contract('memory', () => {
  const clock = { t: 1000 };
  const store = createMemoryStore(() => clock.t);
  return { store, advance: (s) => { clock.t += s * 1000; } };
});

contract('fake-redis', () => {
  const clock = { t: 1000 };
  const client = fakeRedis(() => clock.t);
  const store = createRedisStore({ client });
  return { store, advance: (s) => { clock.t += s * 1000; } };
});

test('redis store: expire is sent with NX in the same pipeline as the increment', async () => {
  const sent = [];
  const client = {
    pipeline() {
      const p = {
        incr: (...a) => { sent.push(['incr', ...a]); return p; },
        incrby: (...a) => { sent.push(['incrby', ...a]); return p; },
        expire: (...a) => { sent.push(['expire', ...a]); return p; },
        exec: async () => [3, 1],
      };
      return p;
    },
  };
  const store = createRedisStore({ client });
  assert.equal(await store.incr('k', 60), 3);
  assert.deepEqual(sent, [['incr', 'k'], ['expire', 'k', 60, 'NX']]);
  sent.length = 0;
  assert.equal(await store.incrBy('k', 4, 90), 3);
  assert.deepEqual(sent, [['incrby', 'k', 4], ['expire', 'k', 90, 'NX']]);
});

test('redis store: get coerces string/null replies to numbers', async () => {
  const replies = { a: '7', b: null, c: 9 };
  const store = createRedisStore({ client: { get: async (k) => replies[k] } });
  assert.equal(await store.get('a'), 7);
  assert.equal(await store.get('b'), 0);
  assert.equal(await store.get('c'), 9);
});

test('redis store: errors propagate (limiter fails open)', async () => {
  const store = createRedisStore({ client: { get: async () => { throw new Error('down'); } } });
  await assert.rejects(store.get('k'), /down/);
});

// Real Redis, only when configured. Unique keys per run; short TTL cleans them up.
test('redis contract against live Upstash', async (t) => {
  if (!process.env.UPSTASH_REDIS_REST_URL) { t.skip('UPSTASH_REDIS_REST_URL not set'); return; }
  const store = getDefaultStore(process.env);
  const key = `test:store-contract:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  assert.equal(await store.incr(key, 30), 1);
  assert.equal(await store.incr(key, 30), 2);
  assert.equal(await store.incrBy(key, 5, 30), 7);
  assert.equal(await store.get(key), 7);
});
