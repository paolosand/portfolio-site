import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costUsd, tierForSpend } from './spend.js';
import { loadLimits } from './limits-config.js';

test('costUsd: output = candidates + thoughts tokens', () => {
  const got = costUsd({ promptTokenCount: 5000, candidatesTokenCount: 500, thoughtsTokenCount: 300 });
  const want = (5000 * 0.30 + 800 * 2.50) / 1e6;
  assert.ok(Math.abs(got - want) < 1e-12);
});

test('costUsd: missing usage is exactly 0, never NaN', () => {
  assert.equal(costUsd(undefined), 0);
  assert.equal(costUsd({}), 0);
});

test('tierForSpend: caps step down as the trip budget is consumed', () => {
  assert.deepEqual(tierForSpend(0), { ceiling: false, chatCap: 50 });
  assert.deepEqual(tierForSpend(3.75), { ceiling: false, chatCap: 30 });
  assert.deepEqual(tierForSpend(7.5), { ceiling: false, chatCap: 20 });
  assert.deepEqual(tierForSpend(11.25), { ceiling: false, chatCap: 10 });
  assert.deepEqual(tierForSpend(15), { ceiling: true, chatCap: null });
});

test('loadLimits: MONTHLY_TRIP_BUDGET_USD overrides the trip budget', () => {
  const limits = loadLimits({ MONTHLY_TRIP_BUDGET_USD: '1' });
  assert.equal(limits.tripBudgetUsd, 1);
  assert.equal(tierForSpend(1, limits).ceiling, true);
});

test('loadLimits: bad override falls back to 15', () => {
  assert.equal(loadLimits({ MONTHLY_TRIP_BUDGET_USD: 'abc' }).tripBudgetUsd, 15);
  assert.equal(loadLimits({ MONTHLY_TRIP_BUDGET_USD: '0' }).tripBudgetUsd, 15);
  assert.equal(loadLimits({}).tripBudgetUsd, 15);
});
