import * as github from './github.js';
import * as vercel from './vercel.js';
import * as curated from './curated.js';
import * as summarize from './summarize.js';
import * as fingerprint from './fingerprint.js';
import { TTL_MS } from './constants.js';

const defaultDeps = { github, vercel, curated, summarize, fingerprint };

const SOURCE_ORDER = ['github', 'vercel', 'curated'];

async function gatherHeads(deps) {
  const [gh, vc] = await Promise.all([deps.github.head(), deps.vercel.head()]);
  return { github: gh, vercel: vc, curated: deps.curated.head() };
}

async function linesForSource(source, now, client, deps) {
  if (source === 'github') {
    const groups = await deps.github.fetchCommitGroups();
    return deps.summarize.summarizeCommitGroups(groups, client);
  }
  if (source === 'vercel') return deps.vercel.fetchLines(now);
  if (source === 'curated') return deps.curated.fetchLines();
  return [];
}

function cachedLinesForSource(cached, source) {
  return (cached?.lines ?? []).filter(l => l.source === source);
}

export async function buildFeed({ cached = null, now = Date.now(), client = null, deps: injectedDeps = {} } = {}) {
  const deps = { ...defaultDeps, ...injectedDeps };
  const fp = deps.fingerprint.build(await gatherHeads(deps));
  const { changed, anyChanged } = deps.fingerprint.diff(cached?.fingerprint ?? null, fp);

  if (!anyChanged && cached) {
    return { changed: false, feed: cached };
  }

  const changedSet = new Set(changed);
  const linesBySource = {};
  for (const source of SOURCE_ORDER) {
    linesBySource[source] = changedSet.has(source)
      ? await linesForSource(source, now, client, deps)
      : cachedLinesForSource(cached, source);
  }

  const seen = new Set();
  const lines = SOURCE_ORDER.flatMap(s => linesBySource[s]).filter(l => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });

  return {
    changed: true,
    feed: {
      generatedAt: new Date(now).toISOString(),
      nextRefreshAt: new Date(now + TTL_MS).toISOString(),
      fingerprint: fp,
      lines,
    },
  };
}
