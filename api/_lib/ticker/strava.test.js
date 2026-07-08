import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLines } from './strava.js';

const ACTS = [{ id: 99, name: 'Morning Run', distance: 8200, type: 'Run' }];

function fakeFetch() {
  let n = 0;
  return async () => {
    n += 1;
    if (n === 1) return { ok: true, json: async () => ({ access_token: 'a' }) };
    return { ok: true, json: async () => ACTS };
  };
}

test('fetchLines formats latest run with distance in km', async () => {
  const lines = await fetchLines(fakeFetch());
  assert.equal(lines[0].id, 'strava:last');
  assert.equal(lines[0].label, 'ran');
  assert.match(lines[0].text, /8\.2k/);
});
