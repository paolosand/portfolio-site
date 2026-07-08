import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTicker } from './ticker.js';

const NOW = Date.parse('2026-06-16T12:00:00Z');
const FRESH = { generatedAt: '2026-06-16T11:50:00Z', nextRefreshAt: '2026-06-16T12:20:00Z', fingerprint: {}, lines: [{ id: 'a', label: 'x', text: 'y', source: 'curated' }] };
const STALE = { ...FRESH, nextRefreshAt: '2026-06-16T11:30:00Z' };

function fakeBlob(feed) {
  const calls = { writes: [] };
  return {
    calls,
    readFeed: async () => feed,
    writeFeed: async (f) => { calls.writes.push(f); },
  };
}

test('missing cache → empty body + rebuild', async () => {
  const blob = fakeBlob(null);
  const { body, rebuild } = await resolveTicker({ now: NOW, blob });
  assert.deepEqual(body.lines, []);
  assert.equal(rebuild, true);
});

test('fresh cache → cached body, no rebuild, no write', async () => {
  const blob = fakeBlob(FRESH);
  const { body, rebuild } = await resolveTicker({ now: NOW, blob });
  assert.deepEqual(body.lines, FRESH.lines);
  assert.equal(rebuild, false);
  assert.equal(blob.calls.writes.length, 0);
});

test('stale cache → cached body now, claims slot, rebuild', async () => {
  const blob = fakeBlob(STALE);
  const { body, rebuild } = await resolveTicker({ now: NOW, blob });
  assert.deepEqual(body.lines, STALE.lines);
  assert.equal(rebuild, true);
  assert.equal(blob.calls.writes.length, 1, 'claims the slot');
  assert.ok(Date.parse(blob.calls.writes[0].nextRefreshAt) > NOW);
});
