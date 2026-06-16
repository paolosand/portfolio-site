# Live Ticker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hero's hardcoded ticker lines with a live feed of Paolo's current activity (GitHub, Vercel deploys, local time, curated notes; later Spotify + Strava), cached in Vercel Blob and refreshed on-read.

**Architecture:** A `/api/ticker` read endpoint serves a cached `ticker.json` from Vercel Blob and, when stale, claims a refresh slot and rebuilds in the background via `waitUntil`. `build-feed` fingerprints cheap "head" signals and skips the Gemini summarization + rewrite when nothing changed. The browser prepends a client-computed local-time line and falls back to hardcoded lines if the fetch fails.

**Tech Stack:** Node 20 Vercel serverless functions (`export default async function handler(req, res)`), `@vercel/blob`, `@vercel/functions` (`waitUntil`), `@google/genai` (`gemini-2.5-flash`, structured output), React 19 + Vite, `node --test`.

## Global Constraints

- **Plan:** Vercel **Hobby** — no sub-daily cron. Refresh is on-read; at most one optional daily cron (`0 9 * * *`).
- **Line shape (every source returns this):** `{ id: string, label: string, text: string, source: string }`. Rendered as `● {label} : {text} /`.
- **Voice:** lowercase, terse, no trailing punctuation, no emoji. Gemini text capped at **60 chars**.
- **Source modules must not throw** — on any error they log and return `[]` (or `null` for `head`).
- **Gemini scope:** git commits only. Deploy/curated/time lines are deterministic formatting (no LLM).
- **Reuse existing helpers:** `withRetry` from `api/_lib/retry.js`; `GoogleGenAI` init pattern + `Type` from `api/_lib/rag.js`.
- **Constants (define in `api/_lib/ticker/constants.js`):** `TTL_MS = 30 * 60 * 1000`, `BLOB_PATHNAME = 'ticker.json'`, `GITHUB_USERNAME = 'paolosand'`, `MAX_TEXT = 60`, `GEMINI_MODEL = 'gemini-2.5-flash'`.
- **Tests** run via the existing `npm test` (`node --test api/_lib/*.test.js ...`). Add new test globs to the `test` script as needed.
- **Commit** after every task with the shown message.

## File Structure

| File | Responsibility |
|---|---|
| `api/_lib/ticker/constants.js` | Shared constants. |
| `api/_lib/ticker/curated.js` | Read curated JSON → `Line[]`; `head` = content hash. |
| `api/_lib/ticker/github.js` | Fetch public push events → grouped raw commit messages; `head` = latest event id. |
| `api/_lib/ticker/vercel.js` | Fetch latest prod deployment → one deterministic `Line`; `head` = deployment uid. |
| `api/_lib/ticker/summarize.js` | Gemini: commit groups → one `Line` per repo, with deterministic fallback. |
| `api/_lib/ticker/fingerprint.js` | Build fingerprint from heads; diff vs previous. |
| `api/_lib/ticker/build-feed.js` | Orchestrate: heads → diff → rebuild changed sources → merged feed object. |
| `api/_lib/ticker/blob.js` | Read/write `ticker.json` in Vercel Blob. |
| `api/ticker.js` | Read endpoint: serve cached, claim + background rebuild when stale; daily-cron guard. |
| `api/_data/ticker-curated.json` | Hand-written curated lines. |
| `src/components/shared/tickerFallback.js` | `TICKER_FALLBACK` lines + `buildTickerLines(feed, date)` + `formatStatusLine(date)`. |
| `src/hooks/useTicker.js` | Fetch `/api/ticker`, build lines, expose `{ lines }`. |
| `src/components/Hero.jsx` | Render `useTicker()` output (modify). |

---

### Task 1: Constants + curated source

**Files:**
- Create: `api/_lib/ticker/constants.js`
- Create: `api/_data/ticker-curated.json`
- Create: `api/_lib/ticker/curated.js`
- Test: `api/_lib/ticker/curated.test.js`
- Modify: `package.json` (extend `test` script glob)

**Interfaces:**
- Produces:
  - `constants.js`: `export const TTL_MS, BLOB_PATHNAME, GITHUB_USERNAME, MAX_TEXT, GEMINI_MODEL`
  - `curated.js`: `export function head(): string` (stable hash of the JSON), `export function fetchLines(): Line[]`

- [ ] **Step 1: Write the curated data file**

Create `api/_data/ticker-curated.json`:

```json
[
  { "label": "reading", "text": "\"the art of doing science and engineering\"" },
  { "label": "building", "text": "real-time drum machine in pytorch" }
]
```

- [ ] **Step 2: Write the failing test**

Create `api/_lib/ticker/curated.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLines, head } from './curated.js';

test('fetchLines maps curated json to Line shape with curated source + stable id', () => {
  const lines = fetchLines();
  assert.ok(lines.length >= 1);
  for (const l of lines) {
    assert.equal(l.source, 'curated');
    assert.ok(typeof l.id === 'string' && l.id.startsWith('curated:'));
    assert.ok(typeof l.label === 'string' && l.label.length > 0);
    assert.ok(typeof l.text === 'string' && l.text.length > 0);
  }
});

test('head is a stable non-empty string', () => {
  assert.equal(head(), head());
  assert.ok(head().length > 0);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test api/_lib/ticker/curated.test.js`
Expected: FAIL with "Cannot find module './curated.js'".

- [ ] **Step 4: Write constants.js**

Create `api/_lib/ticker/constants.js`:

```js
export const TTL_MS = 30 * 60 * 1000;
export const BLOB_PATHNAME = 'ticker.json';
export const GITHUB_USERNAME = 'paolosand';
export const MAX_TEXT = 60;
export const GEMINI_MODEL = 'gemini-2.5-flash';
```

- [ ] **Step 5: Write curated.js**

Create `api/_lib/ticker/curated.js`:

```js
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', '..', '_data', 'ticker-curated.json');

function load() {
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return [];
  }
}

export function head() {
  return createHash('sha256').update(JSON.stringify(load())).digest('hex').slice(0, 12);
}

export function fetchLines() {
  return load().map((entry, i) => ({
    id: `curated:${i}`,
    label: entry.label,
    text: entry.text,
    source: 'curated',
  }));
}
```

- [ ] **Step 6: Extend the test script**

In `package.json`, change the `test` script to also match the ticker tests:

```json
"test": "node --test api/_lib/*.test.js api/_lib/ticker/*.test.js src/components/chat/*.test.js src/components/chat/embeds/*.test.js src/components/shared/*.test.js"
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node --test api/_lib/ticker/curated.test.js`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add api/_lib/ticker/constants.js api/_lib/ticker/curated.js api/_data/ticker-curated.json api/_lib/ticker/curated.test.js package.json
git commit -m "feat(ticker): constants + curated source"
```

---

### Task 2: GitHub source

**Files:**
- Create: `api/_lib/ticker/github.js`
- Test: `api/_lib/ticker/github.test.js`

**Interfaces:**
- Consumes: `GITHUB_USERNAME` from `constants.js`; optional `process.env.GITHUB_TOKEN`.
- Produces:
  - `export async function head(fetchImpl = fetch): Promise<string|null>` — latest public event id, or `null` on error.
  - `export async function fetchCommitGroups(fetchImpl = fetch): Promise<{ repo: string, commits: string[] }[]>` — push events grouped by repo, newest first, `[]` on error. (Summarized into `Line[]` by `summarize.js`.)

- [ ] **Step 1: Write the failing test**

Create `api/_lib/ticker/github.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/ticker/github.test.js`
Expected: FAIL with "Cannot find module './github.js'".

- [ ] **Step 3: Write github.js**

Create `api/_lib/ticker/github.js`:

```js
import { GITHUB_USERNAME } from './constants.js';

const API = `https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=30`;

async function getEvents(fetchImpl) {
  const headers = { 'User-Agent': 'pao-portfolio-ticker', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetchImpl(API, { headers });
  if (!res.ok) {
    console.warn(`[ticker/github] ${res.status}`);
    return null;
  }
  return res.json();
}

export async function head(fetchImpl = fetch) {
  try {
    const events = await getEvents(fetchImpl);
    return events?.[0]?.id ?? null;
  } catch (err) {
    console.warn('[ticker/github] head failed', err);
    return null;
  }
}

export async function fetchCommitGroups(fetchImpl = fetch) {
  try {
    const events = await getEvents(fetchImpl);
    if (!events) return [];
    const byRepo = new Map();
    for (const e of events) {
      if (e.type !== 'PushEvent') continue;
      const repo = (e.repo?.name ?? '').split('/').pop();
      if (!repo) continue;
      const msgs = (e.payload?.commits ?? []).map(c => c.message).filter(Boolean);
      if (!msgs.length) continue;
      if (!byRepo.has(repo)) byRepo.set(repo, []);
      byRepo.get(repo).push(...msgs);
    }
    return [...byRepo.entries()].map(([repo, commits]) => ({ repo, commits }));
  } catch (err) {
    console.warn('[ticker/github] fetchCommitGroups failed', err);
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/ticker/github.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/ticker/github.js api/_lib/ticker/github.test.js
git commit -m "feat(ticker): github public-events source"
```

---

### Task 3: Vercel deploy source

**Files:**
- Create: `api/_lib/ticker/vercel.js`
- Test: `api/_lib/ticker/vercel.test.js`

**Interfaces:**
- Consumes: `process.env.VERCEL_TOKEN`, optional `process.env.VERCEL_PROJECT_ID`.
- Produces:
  - `export async function head(fetchImpl = fetch): Promise<string|null>` — latest READY production deployment uid.
  - `export async function fetchLines(now = Date.now(), fetchImpl = fetch): Promise<Line[]>` — one line `{ id: 'vercel:last', label: 'last shipped', text: '<rel> ago', source: 'vercel' }`, `[]` on error.

- [ ] **Step 1: Write the failing test**

Create `api/_lib/ticker/vercel.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { head, fetchLines } from './vercel.js';

const NOW = Date.parse('2026-06-16T12:00:00Z');
const BODY = { deployments: [{ uid: 'dpl_9', readyState: 'READY', target: 'production', ready: NOW - 3 * 3600_000 }] };

function fakeFetch(ok = true, body = BODY) {
  return async () => ({ ok, status: ok ? 200 : 500, json: async () => body });
}

test('head returns latest deployment uid', async () => {
  assert.equal(await head(fakeFetch()), 'dpl_9');
});

test('fetchLines formats relative time in ticker voice', async () => {
  const lines = await fetchLines(NOW, fakeFetch());
  assert.equal(lines[0].id, 'vercel:last');
  assert.equal(lines[0].label, 'last shipped');
  assert.equal(lines[0].source, 'vercel');
  assert.equal(lines[0].text, '3h ago');
});

test('errors degrade to null / empty', async () => {
  assert.equal(await head(fakeFetch(false)), null);
  assert.deepEqual(await fetchLines(NOW, fakeFetch(false)), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/ticker/vercel.test.js`
Expected: FAIL with "Cannot find module './vercel.js'".

- [ ] **Step 3: Write vercel.js**

Create `api/_lib/ticker/vercel.js`:

```js
const API = 'https://api.vercel.com/v6/deployments?limit=1&state=READY&target=production';

function relTime(ms) {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

async function latest(fetchImpl) {
  if (!process.env.VERCEL_TOKEN) return null;
  const project = process.env.VERCEL_PROJECT_ID ? `&projectId=${process.env.VERCEL_PROJECT_ID}` : '';
  const res = await fetchImpl(`${API}${project}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
  });
  if (!res.ok) {
    console.warn(`[ticker/vercel] ${res.status}`);
    return null;
  }
  const body = await res.json();
  return body?.deployments?.[0] ?? null;
}

export async function head(fetchImpl = fetch) {
  try {
    return (await latest(fetchImpl))?.uid ?? null;
  } catch (err) {
    console.warn('[ticker/vercel] head failed', err);
    return null;
  }
}

export async function fetchLines(now = Date.now(), fetchImpl = fetch) {
  try {
    const dep = await latest(fetchImpl);
    if (!dep?.ready) return [];
    return [{ id: 'vercel:last', label: 'last shipped', text: relTime(now - dep.ready), source: 'vercel' }];
  } catch (err) {
    console.warn('[ticker/vercel] fetchLines failed', err);
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/ticker/vercel.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/ticker/vercel.js api/_lib/ticker/vercel.test.js
git commit -m "feat(ticker): vercel deploy source"
```

---

### Task 4: Gemini commit summarizer

**Files:**
- Create: `api/_lib/ticker/summarize.js`
- Test: `api/_lib/ticker/summarize.test.js`

**Interfaces:**
- Consumes: commit groups from `github.js` (`{ repo, commits }[]`); `GEMINI_MODEL`, `MAX_TEXT`; `withRetry`.
- Produces: `export async function summarizeCommitGroups(groups, client = null): Promise<Line[]>` — one `Line` per repo: `{ id: 'gh:<repo>', label: 'building', text, source: 'github' }`, lowercase, ≤ `MAX_TEXT`. Deterministic fallback when `client` is null or Gemini fails. `client` is a `GoogleGenAI` instance (injected for tests).

- [ ] **Step 1: Write the failing test**

Create `api/_lib/ticker/summarize.test.js`:

```js
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

test('falls back deterministically when Gemini throws', async () => {
  const throwing = { models: { generateContent: async () => { throw new Error('boom'); } } };
  const lines = await summarizeCommitGroups(GROUPS, throwing);
  assert.equal(lines[0].text, '2 commits on portfolio-site');
});

test('empty input yields empty output', async () => {
  assert.deepEqual(await summarizeCommitGroups([], null), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/ticker/summarize.test.js`
Expected: FAIL with "Cannot find module './summarize.js'".

- [ ] **Step 3: Write summarize.js**

Create `api/_lib/ticker/summarize.js`:

```js
import { Type } from '@google/genai';
import { withRetry } from '../retry.js';
import { GEMINI_MODEL, MAX_TEXT } from './constants.js';

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: { repo: { type: Type.STRING }, text: { type: Type.STRING } },
    required: ['repo', 'text'],
  },
};

function fallbackText(group) {
  const n = group.commits.length;
  return `${n} commit${n === 1 ? '' : 's'} on ${group.repo}`;
}

function toLine(repo, text) {
  const clean = String(text).toLowerCase().replace(/[.\s]+$/, '').slice(0, MAX_TEXT).trim();
  return { id: `gh:${repo}`, label: 'building', text: clean, source: 'github' };
}

function fallbackLines(groups) {
  return groups.map(g => toLine(g.repo, fallbackText(g)));
}

export async function summarizeCommitGroups(groups, client = null) {
  if (!groups.length) return [];
  if (!client) return fallbackLines(groups);

  const prompt = [
    'Summarize what the developer is working on, ONE line per repo.',
    'Voice: lowercase, terse, truthful to the commits, no trailing punctuation, no emoji.',
    `Each "text" must be <= ${MAX_TEXT} characters. Do not invent facts.`,
    'Return JSON array of { repo, text }.',
    '',
    JSON.stringify(groups),
  ].join('\n');

  try {
    const res = await withRetry(() => client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
    }));
    const parsed = JSON.parse(res.text);
    const byRepo = new Map(parsed.map(p => [p.repo, p.text]));
    return groups.map(g => byRepo.has(g.repo) ? toLine(g.repo, byRepo.get(g.repo)) : toLine(g.repo, fallbackText(g)));
  } catch (err) {
    console.warn('[ticker/summarize] gemini failed, using fallback', err);
    return fallbackLines(groups);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/ticker/summarize.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/ticker/summarize.js api/_lib/ticker/summarize.test.js
git commit -m "feat(ticker): gemini commit summarizer with fallback"
```

---

### Task 5: Fingerprint + diff

**Files:**
- Create: `api/_lib/ticker/fingerprint.js`
- Test: `api/_lib/ticker/fingerprint.test.js`

**Interfaces:**
- Produces:
  - `export function build(heads): Record<string,string|null>` — passthrough copy of `{ github, vercel, curated, ... }`.
  - `export function diff(prev, next): { changed: string[], anyChanged: boolean }` — sources whose value differs (a missing prev counts as changed).

- [ ] **Step 1: Write the failing test**

Create `api/_lib/ticker/fingerprint.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, diff } from './fingerprint.js';

test('build copies head values', () => {
  assert.deepEqual(build({ github: 'a', vercel: 'b', curated: 'c' }), { github: 'a', vercel: 'b', curated: 'c' });
});

test('diff reports unchanged', () => {
  const fp = { github: 'a', vercel: 'b', curated: 'c' };
  assert.deepEqual(diff(fp, { ...fp }), { changed: [], anyChanged: false });
});

test('diff reports only changed sources', () => {
  const prev = { github: 'a', vercel: 'b', curated: 'c' };
  const next = { github: 'a2', vercel: 'b', curated: 'c' };
  assert.deepEqual(diff(prev, next), { changed: ['github'], anyChanged: true });
});

test('missing prev means everything changed', () => {
  const next = { github: 'a', vercel: 'b', curated: 'c' };
  assert.deepEqual(diff(null, next), { changed: ['github', 'vercel', 'curated'], anyChanged: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/ticker/fingerprint.test.js`
Expected: FAIL with "Cannot find module './fingerprint.js'".

- [ ] **Step 3: Write fingerprint.js**

Create `api/_lib/ticker/fingerprint.js`:

```js
export function build(heads) {
  return { ...heads };
}

export function diff(prev, next) {
  const changed = Object.keys(next).filter(k => !prev || prev[k] !== next[k]);
  return { changed, anyChanged: changed.length > 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/ticker/fingerprint.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/ticker/fingerprint.js api/_lib/ticker/fingerprint.test.js
git commit -m "feat(ticker): fingerprint + diff"
```

---

### Task 6: Feed orchestrator

**Files:**
- Create: `api/_lib/ticker/build-feed.js`
- Test: `api/_lib/ticker/build-feed.test.js`

**Interfaces:**
- Consumes: source modules + `summarize` + `fingerprint` (all injectable via a `deps` object for tests); `TTL_MS`. A `cached` feed object (or `null`).
- Produces: `export async function buildFeed({ cached = null, now = Date.now(), client = null, deps = defaultDeps }): Promise<{ changed: boolean, feed: Feed }>` where
  `Feed = { generatedAt: ISOstring, nextRefreshAt: ISOstring, fingerprint: object, lines: Line[] }`.
  - When no head changed vs `cached.fingerprint`: returns `{ changed: false, feed: cached }` (caller does not rewrite content).
  - When changed: rebuilds **only changed sources'** lines, keeps unchanged sources' lines from `cached`, and returns `{ changed: true, feed }`.
- Line ordering in `feed.lines`: github, vercel, curated (source priority), deduped by `id`.

- [ ] **Step 1: Write the failing test**

Create `api/_lib/ticker/build-feed.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeed } from './build-feed.js';

const NOW = Date.parse('2026-06-16T12:00:00Z');

function makeDeps(over = {}) {
  return {
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
  assert.deepEqual(feed.fingerprint, { github: 'gh1', vercel: 'dpl1', curated: 'cur1' });
  assert.deepEqual(feed.lines.map(l => l.source), ['github', 'vercel', 'curated']);
  assert.equal(feed.generatedAt, new Date(NOW).toISOString());
  assert.equal(feed.nextRefreshAt, new Date(NOW + 30 * 60 * 1000).toISOString());
});

test('unchanged heads → changed:false, returns cached untouched', async () => {
  const cached = {
    generatedAt: '2026-06-16T11:00:00Z', nextRefreshAt: '2026-06-16T11:30:00Z',
    fingerprint: { github: 'gh1', vercel: 'dpl1', curated: 'cur1' },
    lines: [{ id: 'curated:0', label: 'reading', text: 'a book', source: 'curated' }],
  };
  let summarizeCalls = 0;
  const deps = makeDeps({ summarize: { summarizeCommitGroups: async (g) => { summarizeCalls++; return []; } } });
  const { changed, feed } = await buildFeed({ cached, now: NOW, client: {}, deps });
  assert.equal(changed, false);
  assert.equal(feed, cached);
  assert.equal(summarizeCalls, 0, 'Gemini must not run when nothing changed');
});

test('only changed source is rebuilt; unchanged source keeps cached lines', async () => {
  const cached = {
    generatedAt: '2026-06-16T11:00:00Z', nextRefreshAt: '2026-06-16T11:30:00Z',
    fingerprint: { github: 'OLD', vercel: 'dpl1', curated: 'cur1' },
    lines: [
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/ticker/build-feed.test.js`
Expected: FAIL with "Cannot find module './build-feed.js'".

- [ ] **Step 3: Write build-feed.js**

Create `api/_lib/ticker/build-feed.js`:

```js
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

export async function buildFeed({ cached = null, now = Date.now(), client = null, deps = defaultDeps } = {}) {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/ticker/build-feed.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/ticker/build-feed.js api/_lib/ticker/build-feed.test.js
git commit -m "feat(ticker): feed orchestrator with change-detection"
```

---

### Task 7: Blob read/write + dependency install

**Files:**
- Create: `api/_lib/ticker/blob.js`
- Modify: `package.json` (add `@vercel/blob`, `@vercel/functions`)

**Interfaces:**
- Consumes: `BLOB_PATHNAME`; `BLOB_READ_WRITE_TOKEN` (auto-injected env on Vercel).
- Produces:
  - `export async function readFeed(): Promise<Feed|null>` — fetch latest `ticker.json`, or `null` if absent/error.
  - `export async function writeFeed(feed): Promise<void>` — overwrite `ticker.json` (public, stable pathname).

This task is thin I/O over the Vercel Blob SDK; it is verified manually in Task 10 rather than unit-tested (no SDK mock).

- [ ] **Step 1: Install dependencies**

Run: `npm install @vercel/blob @vercel/functions`
Expected: both added to `dependencies` in `package.json`.

- [ ] **Step 2: Write blob.js**

Create `api/_lib/ticker/blob.js`:

```js
import { put, list } from '@vercel/blob';
import { BLOB_PATHNAME } from './constants.js';

export async function readFeed() {
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    const url = blobs?.[0]?.url;
    if (!url) return null;
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn('[ticker/blob] readFeed failed', err);
    return null;
  }
}

export async function writeFeed(feed) {
  await put(BLOB_PATHNAME, JSON.stringify(feed), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
```

- [ ] **Step 3: Verify the build still compiles**

Run: `npm run lint`
Expected: no errors for `api/_lib/ticker/blob.js`.

- [ ] **Step 4: Commit**

```bash
git add api/_lib/ticker/blob.js package.json package-lock.json
git commit -m "feat(ticker): vercel blob read/write"
```

---

### Task 8: Read endpoint `/api/ticker`

**Files:**
- Create: `api/ticker.js`
- Test: `api/ticker.test.js`

**Interfaces:**
- Consumes: `blob.readFeed/writeFeed`, `buildFeed`, `GoogleGenAI`, `waitUntil`, `TTL_MS`.
- Produces: HTTP handler `export default async function handler(req, res)`.
  - Returns `{ lines, generatedAt }` JSON. Sets `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`.
  - Missing cache → respond `{ lines: [] }` and background a build.
  - Stale cache (`now > nextRefreshAt`) → claim slot (`writeFeed` with advanced `nextRefreshAt`), respond cached, background a rebuild.
  - Fresh cache → respond cached, no rebuild.
  - For testability, the orchestration is a pure exported helper `export async function resolveTicker({ now, blob, runRebuild })` returning `{ body, rebuild: boolean }`.

- [ ] **Step 1: Write the failing test**

Create `api/ticker.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTicker } from './ticker.js';

const NOW = Date.parse('2026-06-16T12:00:00Z');
const FRESH = { generatedAt: '2026-06-16T11:50:00Z', nextRefreshAt: '2026-06-16T12:20:00Z', fingerprint: {}, lines: [{ id: 'a', label: 'x', text: 'y', source: 'curated' }] };
const STALE = { ...FRESH, nextRefreshAt: '2026-06-16T11:30:00Z' };

function fakeBlob(feed) {
  const calls = { writes: [] };
  return {
    calls,
    readFeed: async () => feed,
    writeFeed: async (f) => { calls.writes.push(f); },
  };
}

test('missing cache → empty body + rebuild', async () => {
  const blob = fakeBlob(null);
  const { body, rebuild } = await resolveTicker({ now: NOW, blob });
  assert.deepEqual(body.lines, []);
  assert.equal(rebuild, true);
});

test('fresh cache → cached body, no rebuild, no write', async () => {
  const blob = fakeBlob(FRESH);
  const { body, rebuild } = await resolveTicker({ now: NOW, blob });
  assert.deepEqual(body.lines, FRESH.lines);
  assert.equal(rebuild, false);
  assert.equal(blob.calls.writes.length, 0);
});

test('stale cache → cached body now, claims slot, rebuild', async () => {
  const blob = fakeBlob(STALE);
  const { body, rebuild } = await resolveTicker({ now: NOW, blob });
  assert.deepEqual(body.lines, STALE.lines);
  assert.equal(rebuild, true);
  assert.equal(blob.calls.writes.length, 1, 'claims the slot');
  assert.ok(Date.parse(blob.calls.writes[0].nextRefreshAt) > NOW);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/ticker.test.js`
Expected: FAIL with "Cannot find module './ticker.js'".

- [ ] **Step 3: Write ticker.js**

Create `api/ticker.js`:

```js
import { GoogleGenAI } from '@google/genai';
import { waitUntil } from '@vercel/functions';
import * as blobStore from './_lib/ticker/blob.js';
import { buildFeed } from './_lib/ticker/build-feed.js';
import { TTL_MS } from './_lib/ticker/constants.js';

export async function resolveTicker({ now, blob }) {
  const cached = await blob.readFeed();
  if (!cached) return { body: { lines: [] }, rebuild: true };

  const stale = now > Date.parse(cached.nextRefreshAt);
  if (stale) {
    // Claim the refresh slot so concurrent visitors don't all rebuild.
    await blob.writeFeed({ ...cached, nextRefreshAt: new Date(now + TTL_MS).toISOString() });
  }
  return { body: { lines: cached.lines, generatedAt: cached.generatedAt }, rebuild: stale };
}

async function rebuild(now) {
  try {
    const cached = await blobStore.readFeed();
    const client = process.env.GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY }) : null;
    const { changed, feed } = await buildFeed({ cached, now, client });
    if (changed) await blobStore.writeFeed(feed);
  } catch (err) {
    console.error('[ticker] rebuild failed', err);
  }
}

export default async function handler(req, res) {
  // Optional daily safety-floor cron (Hobby allows once/day).
  if (req.query?.cron === '1') {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    await rebuild(Date.now());
    res.status(200).json({ ok: true });
    return;
  }

  const now = Date.now();
  const { body, rebuild: needsRebuild } = await resolveTicker({ now, blob: blobStore });
  if (needsRebuild) waitUntil(rebuild(now));

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).json(body);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/ticker.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Register the function + optional cron in vercel.json**

In `vercel.json`, add `api/ticker.js` to `functions` and add the daily cron. Result:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/chat.js": { "maxDuration": 30 },
    "api/ticker.js": { "maxDuration": 30 }
  },
  "crons": [{ "path": "/api/ticker?cron=1", "schedule": "0 9 * * *" }],
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

- [ ] **Step 6: Commit**

```bash
git add api/ticker.js api/ticker.test.js vercel.json
git commit -m "feat(ticker): refresh-on-read endpoint + daily cron floor"
```

---

### Task 9: Frontend — fallback module + line builder

**Files:**
- Create: `src/components/shared/tickerFallback.js`
- Test: `src/components/shared/tickerFallback.test.js`

**Interfaces:**
- Produces:
  - `export const TICKER_FALLBACK: Line[]` — the current hardcoded lines, in `{ id, label, text, source: 'fallback' }` shape.
  - `export function formatStatusLine(date): Line` — `{ id: 'time', label: 'glendale', text: '<h:mma> · <status>', source: 'time' }` using America/Los_Angeles.
  - `export function buildTickerLines(feed, date): Line[]` — `[formatStatusLine(date), ...(feed?.lines?.length ? feed.lines : TICKER_FALLBACK)]`.

- [ ] **Step 1: Write the failing test**

Create `src/components/shared/tickerFallback.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TICKER_FALLBACK, formatStatusLine, buildTickerLines } from './tickerFallback.js';

const D = new Date('2026-06-16T09:14:00-07:00'); // 9:14am PT

test('fallback lines are well-formed', () => {
  assert.ok(TICKER_FALLBACK.length >= 3);
  for (const l of TICKER_FALLBACK) {
    assert.ok(l.id && l.label && l.text);
  }
});

test('status line is glendale-labelled and includes the time', () => {
  const line = formatStatusLine(D);
  assert.equal(line.label, 'glendale');
  assert.match(line.text, /9:14/);
});

test('buildTickerLines prepends time and uses feed when present', () => {
  const feed = { lines: [{ id: 'gh:x', label: 'building', text: 'stuff', source: 'github' }] };
  const lines = buildTickerLines(feed, D);
  assert.equal(lines[0].label, 'glendale');
  assert.equal(lines[1].id, 'gh:x');
});

test('buildTickerLines falls back when feed empty', () => {
  const lines = buildTickerLines({ lines: [] }, D);
  assert.equal(lines[0].label, 'glendale');
  assert.equal(lines[1].id, TICKER_FALLBACK[0].id);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/shared/tickerFallback.test.js`
Expected: FAIL with "Cannot find module './tickerFallback.js'".

- [ ] **Step 3: Write tickerFallback.js**

Create `src/components/shared/tickerFallback.js`:

```js
export const TICKER_FALLBACK = [
  { id: 'fb:playing', label: 'now playing', text: 'transformer experiments', source: 'fallback' },
  { id: 'fb:shipping', label: 'shipping', text: 'multi-modal video pipelines', source: 'fallback' },
  { id: 'fb:reading', label: 'reading', text: '"the art of doing science and engineering"', source: 'fallback' },
  { id: 'fb:listening', label: 'listening', text: 'alva noto · oneohtrix · sade', source: 'fallback' },
  { id: 'fb:building', label: 'building', text: 'real-time drum machine in pytorch', source: 'fallback' },
];

export function formatStatusLine(date) {
  const t = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date).toLowerCase().replace(/\s/g, '');
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false,
  }).format(date));
  const status = hour < 5 ? 'probably still up' : hour < 12 ? 'caffeinating' : hour < 18 ? 'heads down' : 'shipping';
  return { id: 'time', label: 'glendale', text: `${t} · ${status}`, source: 'time' };
}

export function buildTickerLines(feed, date) {
  const lines = feed?.lines?.length ? feed.lines : TICKER_FALLBACK;
  return [formatStatusLine(date), ...lines];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/shared/tickerFallback.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/tickerFallback.js src/components/shared/tickerFallback.test.js
git commit -m "feat(ticker): frontend fallback + line builder"
```

---

### Task 10: Frontend — hook + Hero wiring + manual verification

**Files:**
- Create: `src/hooks/useTicker.js`
- Modify: `src/components/Hero.jsx:50-62`

**Interfaces:**
- Consumes: `buildTickerLines`, `TICKER_FALLBACK` from `tickerFallback.js`.
- Produces: `export function useTicker(): { lines: Line[] }` — fetches `/api/ticker` once on mount, builds lines with the current `Date`, falls back to `buildTickerLines(null, new Date())` on error.

- [ ] **Step 1: Write useTicker.js**

Create `src/hooks/useTicker.js`:

```js
import { useEffect, useState } from 'react';
import { buildTickerLines } from '../components/shared/tickerFallback.js';

export function useTicker() {
  const [feed, setFeed] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/ticker')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (alive) setFeed(data); })
      .catch(() => { if (alive) setFeed(null); });
    return () => { alive = false; };
  }, []);

  return { lines: buildTickerLines(feed, new Date()) };
}
```

- [ ] **Step 2: Wire Hero.jsx to the hook**

In `src/components/Hero.jsx`, add the import at the top:

```jsx
import { useTicker } from '../hooks/useTicker.js';
```

Inside the component, add after `const { personal, valueProps } = portfolioData;`:

```jsx
  const { lines } = useTicker();
```

Replace the ticker block (the current `<div className="ticker">…</div>`, lines 50-62) with:

```jsx
      <div className="ticker">
        <div className="ticker-inner">
          {[0, 1].map((k) => (
            <span key={k} style={{ display: 'contents' }}>
              {lines.map((line) => (
                <span key={`${k}:${line.id}`}>
                  ● {line.label} : {line.text} <em className="sep">/</em>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
```

- [ ] **Step 3: Verify the app builds and lints**

Run: `npm run lint && npm run build`
Expected: no errors; `dist/` is produced.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass (existing + new ticker tests).

- [ ] **Step 5: Manual verification (records evidence)**

Provision and verify against the real platform:

1. Create a Vercel Blob store for the project (dashboard → Storage → Blob, or `vercel blob` CLI); this injects `BLOB_READ_WRITE_TOKEN`.
2. Create a `VERCEL_TOKEN` (Account Settings → Tokens) and add it via `vercel env add VERCEL_TOKEN`. Optionally add `VERCEL_PROJECT_ID` and `CRON_SECRET`.
3. `vercel env pull .env.local` so local dev has the tokens.
4. `npm run dev`, then in another shell: `curl -s localhost:3000/api/ticker | jq`.
   - First call: expect `{ "lines": [] }` (cold) and a background build kicks off.
   - Second call (after ~2s): expect real `lines` (github/vercel/curated) with `generatedAt`.
5. Load the page in a browser; confirm the ticker shows the live lines plus a leading `● glendale : <time> · <status>` line.
6. Confirm fallback: temporarily block `/api/ticker` (e.g. stop dev server's API or return 500) and reload — ticker still shows fallback lines + time.
7. Confirm change-detection: call `/api/ticker` twice after the cache is warm and `nextRefreshAt` has passed; check Vercel function logs show the rebuild early-returns (no Gemini call) when no new commits/deploys.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTicker.js src/components/Hero.jsx
git commit -m "feat(ticker): wire hero ticker to live feed with fallback"
```

---

## Wave 2 — OAuth sources (Spotify + Strava)

> Build only after Wave 1 ships. Each needs a one-time OAuth token. Both follow the
> exact source-module contract from Tasks 2-3 (`head` + `fetchLines`) and slot into
> `build-feed.js` `SOURCE_ORDER` + `gatherHeads`.

### Task 11: Spotify source

**Files:**
- Create: `api/_lib/ticker/spotify.js`
- Create: `api/_scripts/spotify-auth.mjs` (one-time refresh-token helper)
- Test: `api/_lib/ticker/spotify.test.js`
- Modify: `api/_lib/ticker/build-feed.js` (register source)

**Interfaces:**
- Consumes: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.
- Produces: `export async function head(fetchImpl = fetch): Promise<string|null>` (latest track id); `export async function fetchLines(fetchImpl = fetch): Promise<Line[]>` → `{ id: 'spotify:now', label: 'now playing', text: '<track> — <artist>', source: 'spotify' }`.

- [ ] **Step 1: Write the failing test**

Create `api/_lib/ticker/spotify.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/ticker/spotify.test.js`
Expected: FAIL with "Cannot find module './spotify.js'".

- [ ] **Step 3: Write spotify.js**

Create `api/_lib/ticker/spotify.js`:

```js
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const RECENT_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

async function accessToken(fetchImpl) {
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: process.env.SPOTIFY_REFRESH_TOKEN }),
  });
  if (!res.ok) return null;
  return (await res.json()).access_token;
}

async function latestTrack(fetchImpl) {
  const token = await accessToken(fetchImpl);
  if (!token) return null;
  const res = await fetchImpl(RECENT_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return (await res.json())?.items?.[0]?.track ?? null;
}

export async function head(fetchImpl = fetch) {
  try { return (await latestTrack(fetchImpl))?.id ?? null; }
  catch (err) { console.warn('[ticker/spotify] head failed', err); return null; }
}

export async function fetchLines(fetchImpl = fetch) {
  try {
    const track = await latestTrack(fetchImpl);
    if (!track) return [];
    const text = `${track.name} — ${track.artists?.[0]?.name ?? ''}`.toLowerCase().trim();
    return [{ id: 'spotify:now', label: 'now playing', text, source: 'spotify' }];
  } catch (err) {
    console.warn('[ticker/spotify] fetchLines failed', err);
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/ticker/spotify.test.js`
Expected: PASS.

- [ ] **Step 5: Register the source in build-feed.js**

In `api/_lib/ticker/build-feed.js`: import `* as spotify`, add `spotify` to `defaultDeps`, add `'spotify'` to the front of `SOURCE_ORDER`, add `spotify: await deps.spotify.head()` to `gatherHeads` (run it inside the `Promise.all`), and add a `spotify` branch to `linesForSource` returning `deps.spotify.fetchLines()`.

- [ ] **Step 6: Write the one-time auth helper**

Create `api/_scripts/spotify-auth.mjs` — a short Node script that prints the Spotify authorize URL (scope `user-read-recently-played`), accepts the redirected `code`, exchanges it for a refresh token, and prints `SPOTIFY_REFRESH_TOKEN`. Document the three env vars in the script header.

- [ ] **Step 7: Run tests + commit**

```bash
npm test
git add api/_lib/ticker/spotify.js api/_lib/ticker/spotify.test.js api/_scripts/spotify-auth.mjs api/_lib/ticker/build-feed.js
git commit -m "feat(ticker): spotify now-playing source"
```

---

### Task 12: Strava source

**Files:**
- Create: `api/_lib/ticker/strava.js`
- Create: `api/_scripts/strava-auth.mjs`
- Test: `api/_lib/ticker/strava.test.js`
- Modify: `api/_lib/ticker/build-feed.js` (register source)

**Interfaces:**
- Consumes: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`.
- Produces: `export async function head(fetchImpl = fetch): Promise<string|null>` (latest activity id); `export async function fetchLines(fetchImpl = fetch): Promise<Line[]>` → `{ id: 'strava:last', label: 'ran', text: '<distance>k · <name>', source: 'strava' }`.

- [ ] **Step 1: Write the failing test**

Create `api/_lib/ticker/strava.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/ticker/strava.test.js`
Expected: FAIL with "Cannot find module './strava.js'".

- [ ] **Step 3: Write strava.js**

Create `api/_lib/ticker/strava.js`:

```js
const TOKEN_URL = 'https://www.strava.com/oauth/token';
const ACT_URL = 'https://www.strava.com/api/v3/athlete/activities?per_page=1';

async function accessToken(fetchImpl) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) return null;
  return (await res.json()).access_token;
}

async function latestActivity(fetchImpl) {
  const token = await accessToken(fetchImpl);
  if (!token) return null;
  const res = await fetchImpl(ACT_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return (await res.json())?.[0] ?? null;
}

export async function head(fetchImpl = fetch) {
  try { const a = await latestActivity(fetchImpl); return a ? String(a.id) : null; }
  catch (err) { console.warn('[ticker/strava] head failed', err); return null; }
}

export async function fetchLines(fetchImpl = fetch) {
  try {
    const a = await latestActivity(fetchImpl);
    if (!a) return [];
    const km = (a.distance / 1000).toFixed(1);
    const verb = a.type === 'Run' ? 'ran' : 'logged';
    return [{ id: 'strava:last', label: verb, text: `${km}k · ${a.name}`.toLowerCase(), source: 'strava' }];
  } catch (err) {
    console.warn('[ticker/strava] fetchLines failed', err);
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/ticker/strava.test.js`
Expected: PASS.

- [ ] **Step 5: Register the source + write auth helper**

Register `strava` in `build-feed.js` exactly as Spotify was (add to `defaultDeps`, `SOURCE_ORDER`, `gatherHeads`, `linesForSource`). Create `api/_scripts/strava-auth.mjs` mirroring the Spotify helper (scope `activity:read`).

- [ ] **Step 6: Run tests + commit**

```bash
npm test
git add api/_lib/ticker/strava.js api/_lib/ticker/strava.test.js api/_scripts/strava-auth.mjs api/_lib/ticker/build-feed.js
git commit -m "feat(ticker): strava latest-activity source"
```

---

## Self-Review Notes

- **Spec coverage:** sources (github/vercel/curated/time = Wave 1; spotify/strava = Wave 2) ✓; cron→refresh-on-read + slot-claim (Task 8) ✓; change-detection/fingerprint (Tasks 5-6) ✓; Gemini group+summarize (Task 4) ✓; Blob cache (Task 7) ✓; client-side time (Task 9) ✓; four-layer degradation — per-source `[]` (Tasks 2-4), last-known-good (Task 6), slot-claim (Task 8), client fallback (Tasks 9-10) ✓; cost = covered by change-detection + s-maxage (Task 8).
- **Deferred deploy-via-Gemini:** spec mentioned Gemini cleaning "git/deploy"; this plan scopes Gemini to git only and formats deploy deterministically (simpler, no quality risk). Noted in Global Constraints.
- **Type consistency:** `Line = { id, label, text, source }` used uniformly; `Feed = { generatedAt, nextRefreshAt, fingerprint, lines }`; `head()`/`fetchLines()`/`fetchCommitGroups()`/`summarizeCommitGroups()` signatures match across producer and consumer tasks.
