import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stickyTopFor,
  activeIndexFor,
  stopFractionsFor,
  staticOffsetsFor,
} from './deckMath.js';

test('stickyTopFor pins short cards at 0', () => {
  assert.equal(stickyTopFor(800, 800), 0);
  assert.equal(stickyTopFor(500, 800), 0);
});

test('stickyTopFor gives tall cards a negative top so they scroll through', () => {
  assert.equal(stickyTopFor(2000, 800), -1200);
});

test('activeIndexFor picks the chapter whose start is within half a viewport', () => {
  const offsets = [0, 800, 1600, 4000];
  assert.equal(activeIndexFor(0, offsets, 800), 0);
  assert.equal(activeIndexFor(399, offsets, 800), 0);
  assert.equal(activeIndexFor(400, offsets, 800), 1);   // 800 - 800*0.5
  assert.equal(activeIndexFor(1300, offsets, 800), 2);
  assert.equal(activeIndexFor(2000, offsets, 800), 2);  // inside the long chapter
  assert.equal(activeIndexFor(3600, offsets, 800), 3);
  assert.equal(activeIndexFor(99999, offsets, 800), 3); // clamped to last
});

test('activeIndexFor handles empty offsets', () => {
  assert.equal(activeIndexFor(100, [], 800), 0);
});

test('stopFractionsFor maps chapter offsets to trail fractions', () => {
  assert.deepEqual(stopFractionsFor([0, 500, 1000], 1000), [0, 0.5, 1]);
  assert.deepEqual(stopFractionsFor([0, 2000], 1000), [0, 1]); // clamped
  assert.deepEqual(stopFractionsFor([0, 500], 0), [0, 0]);     // degenerate
});

test('staticOffsetsFor accumulates deck top plus preceding card heights', () => {
  assert.deepEqual(staticOffsetsFor(44, [800, 917, 2000]), [44, 844, 1761]);
  assert.deepEqual(staticOffsetsFor(0, []), []);
});
