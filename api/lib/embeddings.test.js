import { test } from 'node:test';
import assert from 'node:assert/strict';

test('embedBatch: integration — returns float arrays per input (requires GOOGLE_API_KEY)', async (t) => {
  if (!process.env.GOOGLE_API_KEY) { t.skip('GOOGLE_API_KEY not set'); return; }
  const { embedBatch } = await import('./embeddings.js');
  const results = await embedBatch(['hello world', 'machine learning']);
  assert.strictEqual(results.length, 2);
  assert.ok(Array.isArray(results[0]));
  assert.ok(results[0].length > 0);
  assert.ok(typeof results[0][0] === 'number');
});

test('embed: integration — returns a float array (requires GOOGLE_API_KEY)', async (t) => {
  if (!process.env.GOOGLE_API_KEY) { t.skip('GOOGLE_API_KEY not set'); return; }
  const { embed } = await import('./embeddings.js');
  const vec = await embed('CHULOOPA is a real-time drum looper');
  assert.ok(Array.isArray(vec));
  assert.ok(vec.length > 0);
  assert.ok(typeof vec[0] === 'number');
});
