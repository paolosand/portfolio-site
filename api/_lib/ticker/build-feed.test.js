import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeed } from './build-feed.js';

const NOW = Date.parse('2026-06-16T12:00:00Z');

function makeDeps(over = {}) {
  return {
    spotify: {
      head: async () => 'sp1',
      fetchLines: async () => [{ id: 'spotify:now', label: 'now playing', text: 'a song', source: 'spotify' }],
    },
    github: {
      head: async () => 'gh1',
      fetchCommitGroups: async () => [{ repo: 'portfolio-site', commits: ['fix: x'] }],
    },
    vercel: {
      head: async () => 'dpl1',
      fetchLines: async () => [{ id: 'vercel:last', label: 'last shipped', text: '3h ago', source: 'vercel' }],
    },
    curated: {
      head: () => 'cur1',
      fetchLines: () => [{ id: 'curated:0', label: 'reading', text: 'a book', source: 'curated' }],
    },
    summarize: {
      summarizeCommitGroups: async (groups) => groups.map(g => ({ id: `gh:${g.repo}`, label: 'building', text: 'building stuff', source: 'github' })),
    },
    ...over,
  };
}

test('cold build (no cache) produces all lines + fingerprint + timestamps', async () => {
  const { changed, feed } = await buildFeed({ cached: null, now: NOW, client: {}, deps: makeDeps() });
  assert.equal(changed, true);
  assert.deepEqual(feed.fingerprint, { spotify: 'sp1', github: 'gh1', vercel: 'dpl1', curated: 'cur1' });
  assert.deepEqual(feed.lines.map(l => l.source), ['spotify', 'github', 'vercel', 'curated']);
  assert.equal(feed.generatedAt, new Date(NOW).toISOString());
  assert.equal(feed.nextRefreshAt, new Date(NOW + 30 * 60 * 1000).toISOString());
});

test('unchanged heads → changed:false, returns cached untouched', async () => {
  const cached = {
    generatedAt: '2026-06-16T11:00:00Z', nextRefreshAt: '2026-06-16T11:30:00Z',
    fingerprint: { spotify: 'sp1', github: 'gh1', vercel: 'dpl1', curated: 'cur1' },
    lines: [{ id: 'curated:0', label: 'reading', text: 'a book', source: 'curated' }],
  };
  let summarizeCalls = 0;
  const deps = makeDeps({ summarize: { summarizeCommitGroups: async () => { summarizeCalls++; return []; } } });
  const { changed, feed } = await buildFeed({ cached, now: NOW, client: {}, deps });
  assert.equal(changed, false);
  assert.equal(feed, cached);
  assert.equal(summarizeCalls, 0, 'Gemini must not run when nothing changed');
});

test('only changed source is rebuilt; unchanged source keeps cached lines', async () => {
  const cached = {
    generatedAt: '2026-06-16T11:00:00Z', nextRefreshAt: '2026-06-16T11:30:00Z',
    fingerprint: { spotify: 'sp1', github: 'OLD', vercel: 'dpl1', curated: 'cur1' },
    lines: [
      { id: 'spotify:now', label: 'now playing', text: 'a song', source: 'spotify' },
      { id: 'gh:portfolio-site', label: 'building', text: 'old git line', source: 'github' },
      { id: 'vercel:last', label: 'last shipped', text: 'CACHED deploy', source: 'vercel' },
      { id: 'curated:0', label: 'reading', text: 'a book', source: 'curated' },
    ],
  };
  let vercelFetched = false;
  const deps = makeDeps({
    vercel: { head: async () => 'dpl1', fetchLines: async () => { vercelFetched = true; return []; } },
  });
  const { changed, feed } = await buildFeed({ cached, now: NOW, client: {}, deps });
  assert.equal(changed, true);
  assert.equal(vercelFetched, false, 'unchanged vercel source must not be refetched');
  const vercelLine = feed.lines.find(l => l.id === 'vercel:last');
  assert.equal(vercelLine.text, 'CACHED deploy');
  const ghLine = feed.lines.find(l => l.source === 'github');
  assert.equal(ghLine.text, 'building stuff');
});
