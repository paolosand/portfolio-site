import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TICKER_FALLBACK, TICKER_SPEED_PX_PER_SEC, formatStatusLine, buildTickerLines, tickerDurationSeconds, tickerFeedKey,
} from './tickerFallback.js';

const D = new Date('2026-06-16T09:14:00-07:00'); // 9:14am PT

test('fallback lines are well-formed', () => {
  assert.ok(TICKER_FALLBACK.length >= 3);
  for (const l of TICKER_FALLBACK) {
    assert.ok(l.id && l.label && l.text);
  }
});

test('status line is los-angeles-labelled and includes the time', () => {
  const line = formatStatusLine(D);
  assert.equal(line.label, 'los angeles');
  assert.match(line.text, /9:14/);
});

test('buildTickerLines prepends time and uses feed when present', () => {
  const feed = { lines: [{ id: 'gh:x', label: 'building', text: 'stuff', source: 'github' }] };
  const lines = buildTickerLines(feed, D);
  assert.equal(lines[0].label, 'los angeles');
  assert.equal(lines[1].id, 'gh:x');
});

test('buildTickerLines falls back when feed empty', () => {
  const lines = buildTickerLines({ lines: [] }, D);
  assert.equal(lines[0].label, 'los angeles');
  assert.equal(lines[1].id, TICKER_FALLBACK[0].id);
});

test('ticker duration scales with loop width so speed stays constant', () => {
  const short = tickerDurationSeconds(3000);
  const long = tickerDurationSeconds(4700);
  assert.equal(3000 / short, TICKER_SPEED_PX_PER_SEC);
  assert.equal(4700 / long, TICKER_SPEED_PX_PER_SEC);
});

test('ticker duration has a floor for unmeasured or tiny strips', () => {
  assert.ok(tickerDurationSeconds(0) > 0);
  assert.ok(tickerDurationSeconds(NaN) > 0);
});

test('feed key only changes when live lines replace the fallback', () => {
  assert.equal(tickerFeedKey(null), tickerFeedKey({ lines: [] }));
  const live = { lines: [{ id: 'gh:x', label: 'building', text: 'stuff', source: 'github' }] };
  assert.notEqual(tickerFeedKey(live), tickerFeedKey(null));
});
