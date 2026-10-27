import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore } from './store.js';
import { createLimiter } from './limiter.js';
import { loadLimits } from './limits-config.js';

const limits = loadLimits({});

// One mutable clock drives both the store TTLs (ms) and the limiter's UTC buckets.
function setup(start = '2026-10-15T12:00:00Z', { store } = {}) {
  const clock = { t: Date.parse(start) };
  const ms = () => clock.t;
  const primary = store ?? createMemoryStore(ms);
  const limiter = createLimiter({
    store: primary,
    fallback: createMemoryStore(ms),
    limits,
    now: () => new Date(clock.t),
  });
  const advance = (seconds) => { clock.t += seconds * 1000; };
  return { limiter, advance, clock, store: primary };
}

test('memory store: incr sets TTL once at creation; repeated hits do not extend it', async () => {
  let t = 0;
  const store = createMemoryStore(() => t);
  assert.equal(await store.incr('k', 60), 1);
  t += 30_000;
  assert.equal(await store.incr('k', 60), 2);
  t += 31_000; // 61s after creation, 31s after the last hit
  assert.equal(await store.get('k'), 0);
  assert.equal(await store.incr('k', 60), 1);
});

test('memory store: incrBy accumulates and get reads missing keys as 0', async () => {
  const store = createMemoryStore(() => 0);
  assert.equal(await store.get('nope'), 0);
  assert.equal(await store.incrBy('s', 250, 60), 250);
  assert.equal(await store.incrBy('s', 750, 60), 1000);
  assert.equal(await store.get('s'), 1000);
});

test('7th request in a minute is rate-limited', async () => {
  const { limiter } = setup();
  for (let i = 0; i < 6; i++) {
    assert.deepEqual(await limiter.admit({ ipHash: 'ip', sessionKey: 's' }), { ok: true });
  }
  const r = await limiter.admit({ ipHash: 'ip', sessionKey: 's' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'rate');
  assert.ok(r.retryAfterSeconds > 0 && r.retryAfterSeconds <= 60);
});

test('rejected attempts keep counting but do not extend the window', async () => {
  const { limiter, advance } = setup();
  for (let i = 0; i < 6; i++) await limiter.admit({ ipHash: 'ip', sessionKey: 's' });
  for (let i = 0; i < 20; i++) {
    assert.equal((await limiter.admit({ ipHash: 'ip', sessionKey: 's' })).reason, 'rate');
    advance(1);
  }
  advance(41); // 61s after the first request
  assert.deepEqual(await limiter.admit({ ipHash: 'ip', sessionKey: 's' }), { ok: true });
});

test('151st turn in a UTC day is ip-daily', async () => {
  const { limiter, advance } = setup('2026-10-15T00:00:00Z');
  for (let i = 0; i < 150; i++) {
    if (i > 0 && i % 5 === 0) advance(60);
    const r = await limiter.admit({ ipHash: 'ip', sessionKey: `s${Math.floor(i / 25)}` });
    assert.deepEqual(r, { ok: true }, `turn ${i + 1}`);
  }
  advance(60);
  const r = await limiter.admit({ ipHash: 'ip', sessionKey: 'fresh' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'ip-daily');
});

test('51st turn on one chat is session-limited with used/cap 50', async () => {
  const { limiter } = setup();
  for (let i = 0; i < 50; i++) {
    assert.deepEqual(await limiter.admit({ ipHash: `ip${i}`, sessionKey: 'chat' }), { ok: true });
  }
  const r = await limiter.admit({ ipHash: 'other', sessionKey: 'chat' });
  assert.deepEqual(r, { ok: false, reason: 'session', used: 50, cap: 50 });
});

test('$8 of monthly spend shrinks the cap to 20; a chat past it reports used === cap', async () => {
  const { limiter, advance } = setup('2026-10-14T20:00:00Z');
  for (let i = 0; i < 25; i++) {
    assert.deepEqual(await limiter.admit({ ipHash: `ip${i}`, sessionKey: 'long' }), { ok: true });
  }
  await limiter.recordSpend({ ipHash: 'ip0', sessionKey: 'long', costUsd: 8 });
  advance(6 * 3600); // next UTC day (site-daily resets), same month, chat key still alive

  assert.deepEqual(
    await limiter.admit({ ipHash: 'late', sessionKey: 'long' }),
    { ok: false, reason: 'session', used: 20, cap: 20 },
  );

  for (let i = 0; i < 20; i++) {
    assert.deepEqual(await limiter.admit({ ipHash: `n${i}`, sessionKey: 'new' }), { ok: true });
  }
  assert.deepEqual(
    await limiter.admit({ ipHash: 'n-last', sessionKey: 'new' }),
    { ok: false, reason: 'session', used: 20, cap: 20 },
  );
});

test('$15 monthly spend blocks every session', async () => {
  const { limiter } = setup();
  await limiter.recordSpend({ ipHash: 'x', sessionKey: 'x', costUsd: 15 });
  for (const sessionKey of ['a', 'b']) {
    const r = await limiter.admit({ ipHash: `ip-${sessionKey}`, sessionKey });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'monthly');
  }
});

test('$2 in one UTC day trips site-daily; next UTC day is admitted again', async () => {
  const { limiter, advance } = setup('2026-10-15T22:00:00Z');
  await limiter.recordSpend({ ipHash: 'x', sessionKey: 'x', costUsd: 1.5 });
  assert.deepEqual(await limiter.admit({ ipHash: 'ip', sessionKey: 's' }), { ok: true });
  await limiter.recordSpend({ ipHash: 'x', sessionKey: 'x', costUsd: 0.5 });
  const r = await limiter.admit({ ipHash: 'ip', sessionKey: 's' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'site-daily');
  advance(3 * 3600);
  assert.deepEqual(await limiter.admit({ ipHash: 'ip', sessionKey: 's' }), { ok: true });
});

test('spend recorded Oct 31 23:59Z does not count on Nov 1', async () => {
  const { limiter, advance } = setup('2026-10-31T23:59:00Z');
  await limiter.recordSpend({ ipHash: 'x', sessionKey: 'x', costUsd: 15 });
  assert.equal((await limiter.admit({ ipHash: 'ip', sessionKey: 's' })).reason, 'monthly');
  advance(120);
  assert.deepEqual(await limiter.admit({ ipHash: 'ip', sessionKey: 's2' }), { ok: true });
});

test('spend is stored as integer micro-dollars', async () => {
  const inner = createMemoryStore(() => 0);
  const amounts = [];
  const store = { ...inner, incrBy: (k, a, ttl) => { amounts.push(a); return inner.incrBy(k, a, ttl); } };
  const { limiter } = setup(undefined, { store });
  await limiter.recordSpend({ ipHash: 'x', sessionKey: 'x', costUsd: 0.0012345678 });
  assert.ok(amounts.length > 0);
  for (const a of amounts) assert.equal(a, 1235);
});

test('20 concurrent admits from one IP: exactly 6 succeed', async () => {
  const { limiter } = setup();
  const results = await Promise.all(
    Array.from({ length: 20 }, () => limiter.admit({ ipHash: 'ip', sessionKey: 's' })),
  );
  assert.equal(results.filter((r) => r.ok).length, 6);
  assert.ok(results.filter((r) => !r.ok).every((r) => r.reason === 'rate'));
});

test('failing store: fail open, fallback enforces minute + chat rules, recordSpend never throws', async () => {
  const boom = async () => { throw new Error('boom'); };
  const { limiter } = setup(undefined, { store: { incr: boom, incrBy: boom, get: boom } });
  const originalError = console.error;
  let errors = 0;
  console.error = () => { errors++; };
  try {
    for (let i = 0; i < 6; i++) {
      assert.deepEqual(await limiter.admit({ ipHash: 'ip', sessionKey: 's' }), { ok: true });
    }
    const r = await limiter.admit({ ipHash: 'ip', sessionKey: 's' });
    assert.equal(r.reason, 'rate');

    // Per-chat cap via fallback: 6 turns already on 's', so 44 more fit under 50.
    for (let i = 0; i < 43; i++) {
      assert.deepEqual(await limiter.admit({ ipHash: `ip${i}`, sessionKey: 's' }), { ok: true });
    }
    // The rate-rejected attempt also counted on the chat, so this is attempt 51.
    assert.deepEqual(
      await limiter.admit({ ipHash: 'last', sessionKey: 's' }),
      { ok: false, reason: 'session', used: 50, cap: 50 },
    );

    await assert.doesNotReject(limiter.recordSpend({ ipHash: 'ip', sessionKey: 's', costUsd: 1 }));
    assert.ok(errors > 0);
  } finally {
    console.error = originalError;
  }
});
