import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextRevealCount } from './typewriter.js';

test('advances by step toward the target', () => {
  assert.equal(nextRevealCount(0, 10, 2), 2);
  assert.equal(nextRevealCount(2, 10, 2), 4);
});

test('clamps to the target length on the final step', () => {
  assert.equal(nextRevealCount(9, 10, 2), 10);
});

test('stays put once the whole target is revealed', () => {
  assert.equal(nextRevealCount(10, 10, 2), 10);
});

test('restarts when the target shrinks (message replaced, e.g. retry)', () => {
  assert.equal(nextRevealCount(50, 5, 2), 0);
});

test('handles an empty target', () => {
  assert.equal(nextRevealCount(0, 0, 2), 0);
});

test('defaults to a sane step when none is given', () => {
  assert.ok(nextRevealCount(0, 10) > 0);
});
