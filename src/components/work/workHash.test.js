import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkHash, workHashFor, isWorkHashShaped } from './workHash.js';

const registry = { chuloopa: () => Promise.resolve({}) };

test('parseWorkHash extracts a registered id', () => {
  assert.equal(parseWorkHash('#/work/chuloopa', registry), 'chuloopa');
});

test('parseWorkHash rejects unregistered ids', () => {
  assert.equal(parseWorkHash('#/work/nope', registry), null);
});

test('parseWorkHash rejects malformed and unrelated hashes', () => {
  assert.equal(parseWorkHash('#/work/', registry), null);
  assert.equal(parseWorkHash('#/work/UPPER', registry), null);
  assert.equal(parseWorkHash('#projects', registry), null);
  assert.equal(parseWorkHash('', registry), null);
  assert.equal(parseWorkHash(undefined, registry), null);
});

test('parseWorkHash does not match inherited object properties', () => {
  assert.equal(parseWorkHash('#/work/constructor', registry), null);
});

test('workHashFor builds the canonical hash', () => {
  assert.equal(workHashFor('chuloopa'), '#/work/chuloopa');
});

test('isWorkHashShaped detects work-shaped hashes regardless of validity', () => {
  assert.equal(isWorkHashShaped('#/work/anything'), true);
  assert.equal(isWorkHashShaped('#projects'), false);
  assert.equal(isWorkHashShaped(''), false);
});
