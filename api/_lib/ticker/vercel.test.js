import { test } from 'node:test';
import assert from 'node:assert/strict';
import { head, fetchLines } from './vercel.js';

const NOW = Date.parse('2026-06-16T12:00:00Z');
const BODY = { deployments: [{ uid: 'dpl_9', readyState: 'READY', target: 'production', ready: NOW - 3 * 3600_000 }] };

function fakeFetch(ok = true, body = BODY) {
  return async () => ({ ok, status: ok ? 200 : 500, json: async () => body });
}

test('head returns latest deployment uid', async () => {
  assert.equal(await head(fakeFetch()), 'dpl_9');
});

test('fetchLines formats relative time in ticker voice', async () => {
  const lines = await fetchLines(NOW, fakeFetch());
  assert.equal(lines[0].id, 'vercel:last');
  assert.equal(lines[0].label, 'last shipped');
  assert.equal(lines[0].source, 'vercel');
  assert.equal(lines[0].text, '3h ago');
});

test('errors degrade to null / empty', async () => {
  assert.equal(await head(fakeFetch(false)), null);
  assert.deepEqual(await fetchLines(NOW, fakeFetch(false)), []);
});
