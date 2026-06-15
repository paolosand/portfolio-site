import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry, isTransient } from './retry.js';

test('isTransient: 429/5xx and overload/network are transient', () => {
  assert.ok(isTransient({ status: 429 }));
  assert.ok(isTransient({ status: 503 }));
  assert.ok(isTransient(new Error('503 Service Unavailable')));
  assert.ok(isTransient(new Error('The model is overloaded')));
  assert.ok(isTransient(new Error('fetch failed: ECONNRESET')));
});

test('isTransient: client errors are NOT transient', () => {
  assert.ok(!isTransient({ status: 400 }));
  assert.ok(!isTransient({ status: 401 }));
  assert.ok(!isTransient(new Error('invalid argument')));
});

test('withRetry: succeeds after transient failures', async () => {
  let calls = 0;
  const fn = async () => {
    calls++;
    if (calls < 3) { const e = new Error('overloaded'); e.status = 503; throw e; }
    return 'ok';
  };
  const result = await withRetry(fn, { retries: 3, baseMs: 1 });
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('withRetry: does not retry non-transient errors', async () => {
  let calls = 0;
  const fn = async () => { calls++; const e = new Error('bad request'); e.status = 400; throw e; };
  await assert.rejects(() => withRetry(fn, { retries: 3, baseMs: 1 }));
  assert.equal(calls, 1);
});

test('withRetry: gives up after retries exhausted', async () => {
  let calls = 0;
  const fn = async () => { calls++; const e = new Error('overloaded'); e.status = 503; throw e; };
  await assert.rejects(() => withRetry(fn, { retries: 2, baseMs: 1 }));
  assert.equal(calls, 3); // 1 initial + 2 retries
});
