import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limitKind, pickLimitMessage, limitLabel } from './limitMessages.js';

const SESSION_ONLY = [
  'we covered a lot of ground. for the deep dive, paolo is the better call, so email him.',
  '20 messages in and i\'m out of small talk. take it to paolo.',
];
const MONTHLY_ONLY = [
  "i've been very talkative this month and the budget noticed. paolo still checks his email.",
  'pao-gpt is on a social-media-fast until next month. paolo isn\'t.',
];

test('limitKind: maps reasons to session / monthly / null', () => {
  assert.equal(limitKind('session'), 'session');
  assert.equal(limitKind('ip-daily'), 'session');
  assert.equal(limitKind('monthly'), 'monthly');
  assert.equal(limitKind('site-daily'), 'monthly');
  assert.equal(limitKind('rate'), null);
});

test('pickLimitMessage: rand 0 returns the first shared line', () => {
  assert.equal(
    pickLimitMessage('session', 20, () => 0),
    "sorry... paolo's token budget is spent... but maybe you can change that ;) shoot him an email"
  );
});

test('pickLimitMessage: never leaves {N} and respects kind pools', () => {
  for (const kind of ['session', 'monthly']) {
    for (const r of [0, 0.25, 0.5, 0.99, 1]) {
      const msg = pickLimitMessage(kind, 20, () => r);
      assert.ok(!msg.includes('{N}'), `${kind} ${r}`);
      if (kind === 'monthly') assert.ok(!SESSION_ONLY.includes(msg));
      else assert.ok(!MONTHLY_ONLY.includes(msg));
    }
  }
});

test('pickLimitMessage: kind-specific lines are reachable, N templated', () => {
  const s = new Set();
  const m = new Set();
  for (let i = 0; i < 100; i++) {
    s.add(pickLimitMessage('session', 20, () => i / 100));
    m.add(pickLimitMessage('monthly', 20, () => i / 100));
  }
  for (const l of SESSION_ONLY) assert.ok(s.has(l));
  for (const l of MONTHLY_ONLY) assert.ok(m.has(l));
});

test('limitLabel: clamps used to cap; monthly label is fixed', () => {
  assert.equal(limitLabel('session', 25, 20), 'chat limit · 20 / 20');
  assert.equal(limitLabel('session', 7, 20), 'chat limit · 7 / 20');
  assert.equal(limitLabel('monthly', 0, 0), 'out of office · talkative this month');
});
