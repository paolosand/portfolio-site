import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLines } from './spotify.js';

const RECENT = { items: [{ track: { id: 't1', name: 'Xerrox', artists: [{ name: 'Alva Noto' }] } }] };

function fakeFetch() {
  // First call: token exchange. Second call: recently-played.
  let n = 0;
  return async () => {
    n += 1;
    if (n === 1) return { ok: true, json: async () => ({ access_token: 'a' }) };
    return { ok: true, json: async () => RECENT };
  };
}

test('fetchLines formats now playing', async () => {
  const lines = await fetchLines(fakeFetch());
  assert.equal(lines[0].id, 'spotify:now');
  assert.equal(lines[0].label, 'now playing');
  assert.equal(lines[0].text, 'xerrox — alva noto');
});
