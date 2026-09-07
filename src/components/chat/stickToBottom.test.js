import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAtBottom, BOTTOM_THRESHOLD_PX } from './stickToBottom.js';

test('true when scrolled exactly to the bottom', () => {
  // distance = 1000 - 400 - 600 = 0
  assert.equal(isAtBottom({ scrollTop: 400, scrollHeight: 1000, clientHeight: 600 }), true);
});

test('true when within the given threshold of the bottom', () => {
  // distance = 1000 - 398 - 600 = 2
  assert.equal(isAtBottom({ scrollTop: 398, scrollHeight: 1000, clientHeight: 600 }, 8), true);
});

test('false when scrolled up beyond the given threshold', () => {
  // distance = 1000 - 300 - 600 = 100
  assert.equal(isAtBottom({ scrollTop: 300, scrollHeight: 1000, clientHeight: 600 }, 8), false);
});

test('threshold boundary counts as at the bottom (inclusive)', () => {
  // distance = 1000 - 392 - 600 = 8, exactly the threshold
  assert.equal(isAtBottom({ scrollTop: 392, scrollHeight: 1000, clientHeight: 600 }, 8), true);
});

test('tolerates the sub-pixel gap browsers leave after pinning scrollTop', () => {
  // distance = 0.5 — a fractional residual after scrollTop = scrollHeight
  assert.equal(isAtBottom({ scrollTop: 399.5, scrollHeight: 1000, clientHeight: 600 }), true);
});

test('true when the content is shorter than the viewport', () => {
  // nothing to scroll: distance is negative
  assert.equal(isAtBottom({ scrollTop: 0, scrollHeight: 400, clientHeight: 600 }), true);
});

test('defaults to stuck before the list has laid out (all zeros)', () => {
  assert.equal(isAtBottom({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 }), true);
});

test('applies a sane default threshold when none is given', () => {
  // ~10px from the bottom still counts as stuck
  assert.equal(isAtBottom({ scrollTop: 390, scrollHeight: 1000, clientHeight: 600 }), true);
  // far from the bottom does not
  assert.equal(isAtBottom({ scrollTop: 300, scrollHeight: 1000, clientHeight: 600 }), false);
  assert.ok(BOTTOM_THRESHOLD_PX >= 8 && BOTTOM_THRESHOLD_PX < 100);
});
