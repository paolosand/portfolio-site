import { test } from 'node:test';
import assert from 'node:assert/strict';
import { head, fetchCommitGroups } from './github.js';

const EVENTS = [
  { id: '300', type: 'PushEvent', repo: { name: 'paolosand/pao-gpt' },
    payload: { commits: [{ message: 'feat: rerank' }, { message: 'fix: cutoff' }] } },
  { id: '299', type: 'WatchEvent', repo: { name: 'paolosand/x' }, payload: {} },
  { id: '298', type: 'PushEvent', repo: { name: 'paolosand/portfolio-site' },
    payload: { commits: [{ message: 'fix: header mask' }] } },
];

function fakeFetch(ok = true, body = EVENTS) {
  return async () => ({ ok, status: ok ? 200 : 500, json: async () => body });
}

test('head returns latest event id', async () => {
  assert.equal(await head(fakeFetch()), '300');
});

test('fetchCommitGroups groups push commits by repo, ignores non-push', async () => {
  const groups = await fetchCommitGroups(fakeFetch());
  assert.deepEqual(groups, [
    { repo: 'pao-gpt', commits: ['feat: rerank', 'fix: cutoff'] },
    { repo: 'portfolio-site', commits: ['fix: header mask'] },
  ]);
});

test('errors degrade to null / empty', async () => {
  assert.equal(await head(fakeFetch(false)), null);
  assert.deepEqual(await fetchCommitGroups(fakeFetch(false)), []);
});
