import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICKER_FALLBACK, formatStatusLine, buildTickerLines } from './tickerFallback.js';

const D = new Date('2026-06-16T09:14:00-07:00'); // 9:14am PT

test('fallback lines are well-formed', () => {
  assert.ok(TICKER_FALLBACK.length >= 3);
  for (const l of TICKER_FALLBACK) {
    assert.ok(l.id && l.label && l.text);
  }
});

test('status line is glendale-labelled and includes the time', () => {
  const line = formatStatusLine(D);
  assert.equal(line.label, 'glendale');
  assert.match(line.text, /9:14/);
});

test('buildTickerLines prepends time and uses feed when present', () => {
  const feed = { lines: [{ id: 'gh:x', label: 'building', text: 'stuff', source: 'github' }] };
  const lines = buildTickerLines(feed, D);
  assert.equal(lines[0].label, 'glendale');
  assert.equal(lines[1].id, 'gh:x');
});

test('buildTickerLines falls back when feed empty', () => {
  const lines = buildTickerLines({ lines: [] }, D);
  assert.equal(lines[0].label, 'glendale');
  assert.equal(lines[1].id, TICKER_FALLBACK[0].id);
});
