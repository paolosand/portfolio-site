import { test } from 'node:test';
import assert from 'node:assert/strict';
import { head, fetchCommitGroups } from './github.js';

// GitHub's events API no longer includes commit messages in PushEvent
// payloads — only {ref, head, before}. Messages come from the compare API.
const EVENTS = [
  { id: '300', type: 'PushEvent', repo: { name: 'paolosand/pao-gpt' },
    payload: { ref: 'refs/heads/main', before: 'aaa', head: 'bbb' } },
  { id: '299', type: 'WatchEvent', repo: { name: 'paolosand/x' }, payload: {} },
  { id: '298', type: 'PushEvent', repo: { name: 'paolosand/portfolio-site' },
    payload: { ref: 'refs/heads/main', before: 'ccc', head: 'ddd' } },
];

const COMPARES = {
  'repos/paolosand/pao-gpt/compare/aaa...bbb':
    { commits: [{ commit: { message: 'feat: rerank' } }, { commit: { message: 'fix: cutoff' } }] },
  'repos/paolosand/portfolio-site/compare/ccc...ddd':
    { commits: [{ commit: { message: 'fix: header mask' } }] },
};

function fakeFetch({ eventsOk = true, compareOk = true } = {}) {
  return async (url) => {
    if (url.includes('/events/public')) {
      return { ok: eventsOk, status: eventsOk ? 200 : 500, json: async () => EVENTS };
    }
    const key = Object.keys(COMPARES).find(k => url.includes(k));
    if (!compareOk || !key) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => COMPARES[key] };
  };
}

test('head returns latest event id', async () => {
  assert.equal(await head(fakeFetch()), '300');
});

test('fetchCommitGroups resolves messages via compare API, grouped by repo', async () => {
  const groups = await fetchCommitGroups(fakeFetch());
  assert.deepEqual(groups, [
    { repo: 'pao-gpt', commits: ['feat: rerank', 'fix: cutoff'] },
    { repo: 'portfolio-site', commits: ['fix: header mask'] },
  ]);
});

test('compare failures degrade to empty groups, not a throw', async () => {
  assert.deepEqual(await fetchCommitGroups(fakeFetch({ compareOk: false })), []);
});

test('errors degrade to null / empty', async () => {
  assert.equal(await head(fakeFetch({ eventsOk: false })), null);
  assert.deepEqual(await fetchCommitGroups(fakeFetch({ eventsOk: false })), []);
});
