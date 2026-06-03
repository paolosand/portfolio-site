import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, rankChunks } from './retrieval.js';

test('cosineSimilarity: identical vectors return 1', () => {
  const v = [0.1, 0.2, 0.3];
  assert.ok(Math.abs(cosineSimilarity(v, v) - 1) < 1e-6);
});

test('cosineSimilarity: orthogonal vectors return 0', () => {
  const a = [1, 0, 0];
  const b = [0, 1, 0];
  assert.ok(Math.abs(cosineSimilarity(a, b)) < 1e-6);
});

test('cosineSimilarity: opposite vectors return -1', () => {
  const a = [1, 0];
  const b = [-1, 0];
  assert.ok(Math.abs(cosineSimilarity(a, b) + 1) < 1e-6);
});

test('rankChunks: returns top k chunks sorted by similarity', () => {
  const queryVec = [1, 0, 0];
  const records = [
    { text: 'low match', metadata: {}, embedding: [0, 1, 0] },
    { text: 'high match', metadata: {}, embedding: [0.9, 0.1, 0] },
    { text: 'medium match', metadata: {}, embedding: [0.5, 0.5, 0] },
  ];
  const top = rankChunks(queryVec, records, 2);
  assert.strictEqual(top.length, 2);
  assert.strictEqual(top[0].text, 'high match');
});
