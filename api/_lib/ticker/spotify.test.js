import { test } from 'node:test';
import assert from 'node:assert/strict';
import { head, fetchLines } from './spotify.js';

const PLAYLIST_META = { snapshot_id: 'snap123' };
const TRACKS = {
  items: [
    { track: { name: 'Xerrox Voyage', artists: [{ name: 'Alva Noto' }] } },
    { track: { name: 'Smooth Operator', artists: [{ name: 'Sade' }] } },
    { track: null }, // removed/unavailable track slots come back null
  ],
};

function fakeFetch({ tokenOk = true, apiOk = true } = {}) {
  return async (url) => {
    if (url.includes('accounts.spotify.com')) {
      return { ok: tokenOk, status: tokenOk ? 200 : 400, json: async () => ({ access_token: 'tok' }) };
    }
    if (!apiOk) return { ok: false, status: 500, json: async () => ({}) };
    if (url.includes('/tracks')) return { ok: true, status: 200, json: async () => TRACKS };
    return { ok: true, status: 200, json: async () => PLAYLIST_META };
  };
}

function withCreds(fn) {
  return async () => {
    process.env.SPOTIFY_CLIENT_ID = 'id';
    process.env.SPOTIFY_CLIENT_SECRET = 'secret';
    try { await fn(); } finally {
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;
    }
  };
}

test('head is playlist snapshot bucketed by utc day', withCreds(async () => {
  const h = await head(fakeFetch());
  assert.match(h, /^snap123:\d{4}-\d{2}-\d{2}$/);
}));

test('fetchLines picks a playlist track as the listening line', withCreds(async () => {
  const lines = await fetchLines(fakeFetch());
  assert.equal(lines.length, 1);
  assert.equal(lines[0].label, 'listening');
  assert.equal(lines[0].source, 'spotify');
  assert.equal(lines[0].id, 'spotify:pick');
  assert.ok(
    ['xerrox voyage — alva noto', 'smooth operator — sade'].includes(lines[0].text),
    `unexpected pick: "${lines[0].text}"`
  );
}));

test('missing creds skip without a network call', async () => {
  const neverCalled = async () => { throw new Error('should not fetch'); };
  assert.equal(await head(neverCalled), null);
  assert.deepEqual(await fetchLines(neverCalled), []);
});

test('errors degrade to null / empty', withCreds(async () => {
  assert.equal(await head(fakeFetch({ tokenOk: false })), null);
  assert.deepEqual(await fetchLines(fakeFetch({ tokenOk: false })), []);
  assert.deepEqual(await fetchLines(fakeFetch({ apiOk: false })), []);
}));
