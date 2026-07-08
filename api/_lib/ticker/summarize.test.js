import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCommitGroups } from './summarize.js';
import { MAX_TEXT } from './constants.js';

const GROUPS = [
  { repo: 'portfolio-site', commits: ['fix: header mask', 'feat: ascii portrait'] },
  { repo: 'pao-gpt', commits: ['feat: rerank'] },
];

test('deterministic fallback when no client', async () => {
  const lines = await summarizeCommitGroups(GROUPS, null);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].id, 'gh:portfolio-site');
  assert.equal(lines[0].label, 'building');
  assert.equal(lines[0].source, 'github');
  assert.equal(lines[0].text, '2 commits on portfolio-site');
  assert.equal(lines[1].text, '1 commit on pao-gpt');
});

test('uses Gemini output, enforces lowercase + length cap', async () => {
  const fakeClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify([
          { repo: 'portfolio-site', text: 'REBUILDING My Own Portfolio, LIVE And Then Some Very Long Tail Words' },
          { repo: 'pao-gpt', text: 'sharper rag retrieval' },
        ]),
      }),
    },
  };
  const lines = await summarizeCommitGroups(GROUPS, fakeClient);
  assert.equal(lines[0].text, lines[0].text.toLowerCase());
  assert.ok(lines[0].text.length <= MAX_TEXT);
  assert.equal(lines[1].text, 'sharper rag retrieval');
});

test('over-long Gemini output truncates at a word boundary with ellipsis', async () => {
  const fakeClient = {
    models: {
      generateContent: async () => ({
        text: JSON.stringify([
          { repo: 'portfolio-site', text: 'fixed wizard download crash and improved dev environment setup flow' },
          { repo: 'pao-gpt', text: 'sharper rag retrieval' },
        ]),
      }),
    },
  };
  const lines = await summarizeCommitGroups(GROUPS, fakeClient);
  assert.ok(lines[0].text.length <= MAX_TEXT);
  assert.ok(lines[0].text.endsWith('…'), `expected ellipsis, got "${lines[0].text}"`);
  assert.ok(!/\s…$/.test(lines[0].text), 'no dangling space before ellipsis');
  const words = lines[0].text.slice(0, -1).trim();
  assert.ok('fixed wizard download crash and improved dev environment setup flow'.startsWith(words),
    `truncation broke a word: "${lines[0].text}"`);
  assert.ok(words.endsWith('dev') || words.endsWith('environment') || words.endsWith('improved'),
    `expected cut on a whole word, got "${lines[0].text}"`);
});

test('falls back deterministically when Gemini throws', async () => {
  const throwing = { models: { generateContent: async () => { throw new Error('boom'); } } };
  const lines = await summarizeCommitGroups(GROUPS, throwing);
  assert.equal(lines[0].text, '2 commits on portfolio-site');
});

test('empty input yields empty output', async () => {
  assert.deepEqual(await summarizeCommitGroups([], null), []);
});
