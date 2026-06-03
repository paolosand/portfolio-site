# pao-gpt RAG Knowledge Base + UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-file context dump with a vector knowledge base (portfolio.json + knowledge/*.md + GitHub repos), rewrite the system prompt to eliminate "from my context" patterns, add music embed + persistent chips, and switch to a proactive AI greeting instead of a static welcome screen.

**Architecture:** At deploy time, `api/scripts/ingest.mjs` chunks all sources, batch-embeds them with Gemini `text-embedding-004`, and writes `api/knowledge/vectors.json`. At query time, `api/lib/retrieval.js` loads that file once, embeds the query, and returns the top-k most relevant chunks via cosine similarity — no external vector DB required. The greeting uses a `__greeting` sentinel that bypasses RAG and returns hardcoded blocks.

**Tech Stack:** Node.js ESM, `@google/genai` v2 (already installed), GitHub REST API (unauthenticated), React 19, Vite 7, Node built-in test runner.

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `api/lib/embeddings.js` | Gemini `text-embedding-004` wrapper — `embed(text)`, `embedBatch(texts)` |
| `api/lib/ingest-utils.js` | Pure chunking functions — markdown, portfolio.json, raw code |
| `api/lib/github-fetcher.js` | Fetch raw file content from public GitHub repos |
| `api/scripts/ingest.mjs` | Orchestrates ingest pipeline → writes `api/knowledge/vectors.json` |
| `api/lib/retrieval.js` | Loads vectors.json, cosine similarity search — `queryRelevant(query, k)` |
| `api/lib/ingest-utils.test.js` | Unit tests for chunkers (no API calls) |
| `api/lib/retrieval.test.js` | Unit tests for cosine similarity + chunk loading |
| `src/components/chat/ChipBar.jsx` | Persistent prompt pill bar |
| `src/components/chat/ChipBar.css` | ChipBar styles |
| `src/components/chat/embeds/MusicEmbed.jsx` | Music/artist embed card |
| `src/components/chat/embeds/MusicEmbed.css` | MusicEmbed styles |

### Modified files
| File | Change |
|------|--------|
| `api/lib/rag.js` | `generate(query, history)` — drop `context` param, call `queryRelevant` internally; fallback to `loadKnowledge()` |
| `api/lib/rag.test.js` | Update `generate()` call signature; add `music` to valid block types |
| `api/lib/personality.js` | Full rewrite: new system prompt, `buildSystemPrompt(projectIds, workIds)`, `GREETING_BLOCKS`, `isGreetingSentinel()` |
| `api/chat.js` | Handle `__greeting` sentinel; derive valid IDs from `portfolio.json`; pass IDs to `buildSystemPrompt()` |
| `src/components/chat/MessageList.jsx` | Render `MusicEmbed` for `type==='music'`; render inline chips for `type==='chips'` |
| `src/hooks/useChat.js` | Add `greet()` method for the greeting call on mount |
| `src/components/chat/ChatInterface.jsx` | Remove `WelcomeScreen`; call `greet()` on mount; add `<ChipBar>` |
| `src/index.css` | Fix typing indicator easing, message bubble spec, send button shadow |
| `package.json` | Add `test` and `ingest` scripts; update `build` to run ingest first |
| `vercel.json` | Update `buildCommand` to include ingest |
| `.gitignore` | Add `api/knowledge/vectors.json` |

### Deleted files
- `src/components/chat/WelcomeScreen.jsx`
- `src/components/chat/WelcomeScreen.css`

---

## Task 1: Scaffold — test runner, gitignore, build scripts

**Files:**
- Modify: `package.json`
- Modify: `vercel.json`
- Modify: `.gitignore`

- [ ] **Add test script and ingest script to package.json**

Replace the `scripts` block with:
```json
"scripts": {
  "dev": "vite",
  "build": "node api/scripts/ingest.mjs && vite build",
  "ingest": "node api/scripts/ingest.mjs",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "node --test 'api/lib/**/*.test.js'"
}
```

- [ ] **Update vercel.json buildCommand**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/chat.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

(No change needed — `buildCommand` already calls `npm run build` which now includes ingest.)

- [ ] **Add vectors.json to .gitignore**

Open `.gitignore` (or create it if absent) and add:
```
api/knowledge/vectors.json
```

- [ ] **Run existing tests to confirm they still pass**

```bash
npm test
```

Expected: all existing `guard.test.js` and `rag.test.js` unit tests pass. The integration test in `rag.test.js` is skipped without `GOOGLE_API_KEY`.

- [ ] **Commit**

```bash
git add package.json vercel.json .gitignore
git commit -m "chore: add test runner, ingest script, build pipeline"
```

---

## Task 2: Embeddings wrapper

**Files:**
- Create: `api/lib/embeddings.js`
- Create: `api/lib/embeddings.test.js`

- [ ] **Write the failing test**

Create `api/lib/embeddings.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('embedBatch: integration — returns float arrays per input (requires GOOGLE_API_KEY)', async (t) => {
  if (!process.env.GOOGLE_API_KEY) { t.skip('GOOGLE_API_KEY not set'); return; }
  const { embedBatch } = await import('./embeddings.js');
  const results = await embedBatch(['hello world', 'machine learning']);
  assert.strictEqual(results.length, 2);
  assert.ok(Array.isArray(results[0]));
  assert.ok(results[0].length > 0);
  assert.ok(typeof results[0][0] === 'number');
});

test('embed: integration — returns a float array (requires GOOGLE_API_KEY)', async (t) => {
  if (!process.env.GOOGLE_API_KEY) { t.skip('GOOGLE_API_KEY not set'); return; }
  const { embed } = await import('./embeddings.js');
  const vec = await embed('CHULOOPA is a real-time drum looper');
  assert.ok(Array.isArray(vec));
  assert.ok(vec.length > 0);
  assert.ok(typeof vec[0] === 'number');
});
```

- [ ] **Run to confirm tests skip (no key in CI)**

```bash
npm test
```

Expected: integration tests show as skipped, no failures.

- [ ] **Create `api/lib/embeddings.js`**

```js
import { GoogleGenAI } from '@google/genai';

let _client = null;
function getClient() {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  return _client;
}

export async function embed(text) {
  const response = await getClient().models.embedContent({
    model: 'text-embedding-004',
    contents: text,
  });
  return response.embeddings[0].values;
}

export async function embedBatch(texts) {
  if (texts.length === 0) return [];
  const response = await getClient().models.embedContent({
    model: 'text-embedding-004',
    contents: texts,
  });
  return response.embeddings.map(e => e.values);
}
```

- [ ] **Run tests with GOOGLE_API_KEY set to verify integration tests pass**

```bash
GOOGLE_API_KEY=<your-key> npm test
```

Expected: both integration tests pass.

- [ ] **Commit**

```bash
git add api/lib/embeddings.js api/lib/embeddings.test.js
git commit -m "feat: add Gemini text-embedding-004 wrapper"
```

---

## Task 3: Chunking utilities

**Files:**
- Create: `api/lib/ingest-utils.js`
- Create: `api/lib/ingest-utils.test.js`

- [ ] **Write the failing tests**

Create `api/lib/ingest-utils.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkMarkdown, chunkPortfolioJson, chunkCode } from './ingest-utils.js';

test('chunkMarkdown: splits on ## headers', () => {
  const md = `# Title\n\nIntro text.\n\n## Section One\n\nContent one.\n\n## Section Two\n\nContent two.`;
  const chunks = chunkMarkdown(md, 'experience');
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.some(c => c.text.includes('Content one.')));
  assert.ok(chunks.some(c => c.text.includes('Content two.')));
});

test('chunkMarkdown: metadata includes source and section', () => {
  const md = `## Work Experience\n\nI worked at Stratpoint.`;
  const chunks = chunkMarkdown(md, 'experience');
  assert.strictEqual(chunks[0].metadata.source, 'experience');
  assert.ok(typeof chunks[0].metadata.section === 'string');
});

test('chunkMarkdown: skips empty sections', () => {
  const md = `## Empty\n\n## Full\n\nHas content.`;
  const chunks = chunkMarkdown(md, 'experience');
  assert.ok(chunks.every(c => c.text.trim().length > 0));
});

test('chunkPortfolioJson: produces one chunk per project', () => {
  const json = {
    projects: [
      { id: 'foo', title: 'Foo', description: 'A thing.', tags: ['JS'], links: {} },
      { id: 'bar', title: 'Bar', description: 'Another.', tags: ['Python'], links: {} },
    ],
    experience: [],
    education: [],
    skills: {},
  };
  const chunks = chunkPortfolioJson(json);
  const projectChunks = chunks.filter(c => c.metadata.type === 'project');
  assert.strictEqual(projectChunks.length, 2);
  assert.ok(projectChunks.some(c => c.metadata.entity_id === 'foo'));
});

test('chunkPortfolioJson: includes project title in text', () => {
  const json = {
    projects: [{ id: 'chuloopa', title: 'CHULOOPA', description: 'Drum looper.', tags: ['ChucK'], links: {} }],
    experience: [],
    education: [],
    skills: {},
  };
  const chunks = chunkPortfolioJson(json);
  assert.ok(chunks.some(c => c.text.includes('CHULOOPA')));
});

test('chunkCode: returns single chunk with file metadata', () => {
  const code = `fun int add(int a, int b) { return a + b; }`;
  const chunk = chunkCode(code, { repo: 'CHULOOPA', file: 'chuloopa_main.ck' });
  assert.strictEqual(chunk.metadata.repo, 'CHULOOPA');
  assert.strictEqual(chunk.metadata.file, 'chuloopa_main.ck');
  assert.ok(chunk.text.includes('add'));
});
```

- [ ] **Run to confirm tests fail**

```bash
npm test
```

Expected: FAIL with "Cannot find module './ingest-utils.js'".

- [ ] **Create `api/lib/ingest-utils.js`**

```js
export function chunkMarkdown(content, source) {
  const sections = content.split(/^## /m);
  const chunks = [];
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    const firstNewline = trimmed.indexOf('\n');
    const heading = firstNewline > -1 ? trimmed.slice(0, firstNewline).trim() : trimmed;
    const body = firstNewline > -1 ? trimmed.slice(firstNewline).trim() : '';
    const text = body || heading;
    if (!text) continue;
    chunks.push({
      text: `## ${heading}\n\n${text}`,
      metadata: { source, type: 'markdown', section: heading },
    });
  }
  return chunks;
}

export function chunkPortfolioJson(json) {
  const chunks = [];

  for (const project of json.projects ?? []) {
    const text = [
      `Project: ${project.title}`,
      project.subtitle ? `Subtitle: ${project.subtitle}` : '',
      `Description: ${project.description}`,
      `Tags: ${(project.tags ?? []).join(', ')}`,
      project.links?.github ? `GitHub: ${project.links.github}` : '',
      project.links?.demo ? `Demo: ${project.links.demo}` : '',
    ].filter(Boolean).join('\n');
    chunks.push({
      text,
      metadata: { source: 'portfolio.json', type: 'project', entity_id: project.id },
    });
  }

  for (const exp of json.experience ?? []) {
    const text = [
      `${exp.company} — ${exp.role}`,
      exp.dates,
      ...(exp.bullets ?? []),
    ].join('\n');
    chunks.push({
      text,
      metadata: { source: 'portfolio.json', type: 'experience', entity_id: exp.company },
    });
  }

  for (const edu of json.education ?? []) {
    const text = [
      `${edu.degree} · ${edu.school}`,
      edu.dates,
      edu.gpa ?? '',
      ...(edu.bullets ?? []),
    ].filter(Boolean).join('\n');
    chunks.push({
      text,
      metadata: { source: 'portfolio.json', type: 'education', entity_id: edu.school },
    });
  }

  if (json.skills && Object.keys(json.skills).length > 0) {
    const text = Object.entries(json.skills)
      .map(([cat, items]) => `${cat}: ${items.join(', ')}`)
      .join('\n');
    chunks.push({
      text,
      metadata: { source: 'portfolio.json', type: 'skills', entity_id: 'skills' },
    });
  }

  return chunks;
}

export function chunkCode(content, metadata) {
  return {
    text: content,
    metadata: { source: 'github', type: 'code', ...metadata },
  };
}
```

- [ ] **Run tests to confirm they pass**

```bash
npm test
```

Expected: all `ingest-utils.test.js` tests pass.

- [ ] **Commit**

```bash
git add api/lib/ingest-utils.js api/lib/ingest-utils.test.js
git commit -m "feat: add knowledge chunking utilities"
```

---

## Task 4: GitHub file fetcher

**Files:**
- Create: `api/lib/github-fetcher.js`

No dedicated unit test — function is a thin fetch wrapper; verified end-to-end in Task 5.

- [ ] **Create `api/lib/github-fetcher.js`**

```js
const GITHUB_RAW = 'https://raw.githubusercontent.com';

export async function fetchFile(owner, repo, path, token) {
  const url = `${GITHUB_RAW}/${owner}/${repo}/main/${path}`;
  const headers = { 'User-Agent': 'pao-gpt-ingest' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.warn(`[github] ${res.status} fetching ${owner}/${repo}/${path}`);
    return null;
  }
  return res.text();
}
```

- [ ] **Smoke test against CHULOOPA README manually**

```bash
node -e "
import('./api/lib/github-fetcher.js').then(async ({ fetchFile }) => {
  const text = await fetchFile('paolosand', 'CHULOOPA', 'README.md');
  console.log(text ? text.slice(0, 200) : 'null');
});
"
```

Expected: prints the first 200 chars of the CHULOOPA README.

- [ ] **Commit**

```bash
git add api/lib/github-fetcher.js
git commit -m "feat: add GitHub raw file fetcher"
```

---

## Task 5: Ingest script

**Files:**
- Create: `api/scripts/ingest.mjs`

- [ ] **Create `api/scripts/ingest.mjs`**

```js
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedBatch } from '../lib/embeddings.js';
import { chunkMarkdown, chunkPortfolioJson, chunkCode } from '../lib/ingest-utils.js';
import { fetchFile } from '../lib/github-fetcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const KNOWLEDGE_DIR = join(__dirname, '..', 'knowledge');
const OUT_FILE = join(KNOWLEDGE_DIR, 'vectors.json');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GITHUB_FILES = [
  { owner: 'paolosand', repo: 'CHULOOPA', path: 'README.md' },
  { owner: 'paolosand', repo: 'CHULOOPA', path: 'chuloopa_main.ck' },
  { owner: 'paolosand', repo: 'CHULOOPA', path: 'spice_detector.ck' },
  { owner: 'paolosand', repo: 'Violence-Detector-with-Aggressor-Identification', path: 'README.md' },
  { owner: 'paolosand', repo: 'ascii_drone', path: 'README.md' },
];

async function collectChunks() {
  const chunks = [];

  // 1. Knowledge markdown files
  const mdFiles = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
  for (const file of mdFiles) {
    const content = readFileSync(join(KNOWLEDGE_DIR, file), 'utf8');
    const source = basename(file, '.md');
    chunks.push(...chunkMarkdown(content, source));
  }

  // 2. portfolio.json (site source of truth)
  const portfolioJson = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'portfolio.json'), 'utf8'));
  chunks.push(...chunkPortfolioJson(portfolioJson));

  // 3. GitHub repos
  for (const { owner, repo, path } of GITHUB_FILES) {
    const content = await fetchFile(owner, repo, path, GITHUB_TOKEN);
    if (!content) continue;
    chunks.push(chunkCode(content, { repo, file: path }));
  }

  return chunks;
}

async function run() {
  console.log('[ingest] collecting chunks...');
  const chunks = await collectChunks();
  console.log(`[ingest] ${chunks.length} chunks collected`);

  console.log('[ingest] embedding...');
  const texts = chunks.map(c => c.text);
  const BATCH = 100;
  const allEmbeddings = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const vecs = await embedBatch(batch);
    allEmbeddings.push(...vecs);
    console.log(`[ingest] embedded ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
  }

  const records = chunks.map((chunk, i) => ({
    text: chunk.text,
    metadata: chunk.metadata,
    embedding: allEmbeddings[i],
  }));

  writeFileSync(OUT_FILE, JSON.stringify(records));
  console.log(`[ingest] wrote ${records.length} vectors to ${OUT_FILE}`);
}

run().catch(err => { console.error('[ingest] failed:', err); process.exit(1); });
```

- [ ] **Run ingest locally to verify**

```bash
GOOGLE_API_KEY=<your-key> npm run ingest
```

Expected output:
```
[ingest] collecting chunks...
[ingest] N chunks collected
[ingest] embedding...
[ingest] embedded N/N
[ingest] wrote N vectors to .../api/knowledge/vectors.json
```

Verify `api/knowledge/vectors.json` exists and contains objects with `text`, `metadata`, and `embedding` (array of floats).

- [ ] **Confirm vectors.json is gitignored**

```bash
git status
```

Expected: `api/knowledge/vectors.json` does NOT appear as an untracked file.

- [ ] **Commit**

```bash
git add api/scripts/ingest.mjs
git commit -m "feat: add ingest pipeline — chunks sources and writes vectors.json"
```

---

## Task 6: Retrieval

**Files:**
- Create: `api/lib/retrieval.js`
- Create: `api/lib/retrieval.test.js`

- [ ] **Write the failing tests**

Create `api/lib/retrieval.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, rankChunks } from './retrieval.js';

test('cosineSimilarity: identical vectors return 1', () => {
  const v = [0.1, 0.2, 0.3];
  assert.ok(Math.abs(cosineSimilarity(v, v) - 1) < 1e-6);
});

test('cosineSimilarity: orthogonal vectors return 0', () => {
  const a = [1, 0, 0];
  const b = [0, 1, 0];
  assert.ok(Math.abs(cosineSimilarity(a, b)) < 1e-6);
});

test('cosineSimilarity: opposite vectors return -1', () => {
  const a = [1, 0];
  const b = [-1, 0];
  assert.ok(Math.abs(cosineSimilarity(a, b) + 1) < 1e-6);
});

test('rankChunks: returns top k chunks sorted by similarity', () => {
  const queryVec = [1, 0, 0];
  const records = [
    { text: 'low match', metadata: {}, embedding: [0, 1, 0] },
    { text: 'high match', metadata: {}, embedding: [0.9, 0.1, 0] },
    { text: 'medium match', metadata: {}, embedding: [0.5, 0.5, 0] },
  ];
  const top = rankChunks(queryVec, records, 2);
  assert.strictEqual(top.length, 2);
  assert.strictEqual(top[0].text, 'high match');
});
```

- [ ] **Run to confirm tests fail**

```bash
npm test
```

Expected: FAIL with "Cannot find module './retrieval.js'".

- [ ] **Create `api/lib/retrieval.js`**

```js
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { embed } from './embeddings.js';
import { loadKnowledge } from './rag.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_FILE = join(__dirname, '..', 'knowledge', 'vectors.json');

let _records = null;

function loadRecords() {
  if (_records) return _records;
  if (!existsSync(VECTORS_FILE)) return null;
  _records = JSON.parse(readFileSync(VECTORS_FILE, 'utf8'));
  return _records;
}

export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function rankChunks(queryVec, records, k) {
  return records
    .map(r => ({ ...r, score: cosineSimilarity(queryVec, r.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export async function queryRelevant(queryText, k = 6) {
  const records = loadRecords();
  if (!records) {
    // Fallback: return all knowledge file content as a flat string
    const docs = loadKnowledge();
    return docs.map(d => `[${d.metadata.source}]\n${d.content}`).join('\n\n---\n\n');
  }
  const queryVec = await embed(queryText);
  const top = rankChunks(queryVec, records, k);
  return top
    .map(r => `[${r.metadata.source} · ${r.metadata.type}]\n${r.text}`)
    .join('\n\n---\n\n');
}
```

- [ ] **Run tests to confirm they pass**

```bash
npm test
```

Expected: all `retrieval.test.js` tests pass (the cosine similarity and rankChunks tests are pure, no API calls needed).

- [ ] **Commit**

```bash
git add api/lib/retrieval.js api/lib/retrieval.test.js
git commit -m "feat: add in-memory cosine similarity retrieval over vectors.json"
```

---

## Task 7: Update rag.js

**Files:**
- Modify: `api/lib/rag.js`
- Modify: `api/lib/rag.test.js`

- [ ] **Update `api/lib/rag.js`**

Replace the entire file:
```js
import { GoogleGenAI, Type } from '@google/genai';
import { SYSTEM_PROMPT, buildSystemPrompt } from './personality.js';
import { queryRelevant } from './retrieval.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, '..', 'knowledge');
const MODEL = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type:    { type: Type.STRING },
      content: { type: Type.STRING },
      id:      { type: Type.STRING },
      items:   { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['type'],
  },
};

const GENERATION_CONFIG = {
  temperature: 0.7,
  maxOutputTokens: 1024,
  responseMimeType: 'application/json',
  responseSchema: RESPONSE_SCHEMA,
};

let _client = null;
function getClient() {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  return _client;
}

// Fallback: load all knowledge markdown files as flat docs (used by retrieval.js when vectors.json absent)
export function loadKnowledge() {
  const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
  return files.map(file => ({
    content: readFileSync(join(KNOWLEDGE_DIR, file), 'utf8'),
    metadata: { source: basename(file, '.md') },
  }));
}

export async function generate(query, history, { projectIds = [], workIds = [] } = {}) {
  const client = getClient();
  const contextBlock = await queryRelevant(query);

  const recentHistory = history.slice(-5);
  const historyBlock = recentHistory
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const today = new Date().toISOString().split('T')[0];
  const systemPrompt = buildSystemPrompt(projectIds, workIds);

  const prompt = [
    systemPrompt,
    `\nToday's date: ${today}`,
    '\n\n--- CONTEXT ---\n',
    contextBlock,
    historyBlock ? `\n\n--- CONVERSATION HISTORY ---\n${historyBlock}` : '',
    `\n\n--- QUESTION ---\n${query}`,
  ].join('');

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: GENERATION_CONFIG,
  });

  try {
    const blocks = JSON.parse(response.text);
    if (Array.isArray(blocks)) return blocks;
    return [{ type: 'text', content: response.text }];
  } catch {
    return [{ type: 'text', content: response.text }];
  }
}
```

- [ ] **Update `api/lib/rag.test.js`**

Replace the entire file:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadKnowledge } from './rag.js';

test('loadKnowledge: returns array of documents', () => {
  const docs = loadKnowledge();
  assert.ok(Array.isArray(docs));
  assert.ok(docs.length > 0);
});

test('loadKnowledge: each document has content and metadata', () => {
  const docs = loadKnowledge();
  for (const doc of docs) {
    assert.ok(typeof doc.content === 'string');
    assert.ok(doc.content.length > 0);
    assert.ok(typeof doc.metadata === 'object');
    assert.ok(typeof doc.metadata.source === 'string');
  }
});

test('loadKnowledge: loads known files', () => {
  const docs = loadKnowledge();
  const sources = docs.map(d => d.metadata.source);
  assert.ok(sources.some(s => s.includes('experience')));
  assert.ok(sources.some(s => s.includes('skills')));
});

test('generate: integration — returns valid blocks (requires GOOGLE_API_KEY)', async (t) => {
  if (!process.env.GOOGLE_API_KEY) { t.skip('GOOGLE_API_KEY not set'); return; }
  const { generate } = await import('./rag.js');
  const blocks = await generate('What projects have you worked on?', []);
  assert.ok(Array.isArray(blocks));
  assert.ok(blocks.length > 0);
  const textBlocks = blocks.filter(b => b.type === 'text');
  assert.ok(textBlocks.length > 0);
  for (const b of blocks) {
    assert.ok(typeof b.type === 'string');
    const validTypes = ['text', 'project', 'work', 'music', 'chips'];
    assert.ok(validTypes.includes(b.type), `unknown type: ${b.type}`);
    if (b.type === 'text') assert.ok(typeof b.content === 'string');
    if (b.type === 'project' || b.type === 'work' || b.type === 'music') {
      assert.ok(typeof b.id === 'string');
    }
  }
});
```

- [ ] **Run tests**

```bash
npm test
```

Expected: unit tests pass. Integration test skips without API key.

- [ ] **Commit**

```bash
git add api/lib/rag.js api/lib/rag.test.js
git commit -m "feat: wire rag.js to vector retrieval, drop full-file context dump"
```

---

## Task 8: Rewrite personality.js

**Files:**
- Modify: `api/lib/personality.js`

- [ ] **Replace `api/lib/personality.js` entirely**

```js
const BASE_SYSTEM_PROMPT = `You are a conversational AI assistant representing Paolo Sandejas — a software engineer with a background in full-stack development, machine learning, audio/creative tech, and a parallel career as a recording artist signed to Universal Records Philippines. You speak in his voice: casual, technically sharp, direct, and specific.

When answering questions:
- Only state facts that appear in the provided context. If it's not there, say so.
- Never fabricate projects, roles, dates, or skills not in the context.
- When code or technical details appear in context, reference them specifically — variable names, function names, architecture patterns. Don't summarize; be precise.
- Keep responses concise. A clear sentence beats a vague paragraph.
- It's okay to say "I don't know" or "that's not something I have context on."

For date-sensitive questions:
- Use today's date (provided in the prompt) to compute durations accurately.

Tone: confident but not arrogant, friendly but not sycophantic. Casual language is fine. Never use filler phrases like "Certainly!" or "Great question!" or "From my context..." — speak as Paolo, not as a document reader.

OUTPUT FORMAT — REQUIRED:
Return a JSON array of blocks. Each block is one of:
  { "type": "text", "content": "<markdown string>" }
  { "type": "project", "id": "<project-id>" }
  { "type": "work", "id": "<work-id>" }
  { "type": "music", "id": "artist-profile" }
  { "type": "chips", "items": ["<question 1>", "<question 2>", ...] }

Rules:
- Embed a project, work, or music card ONLY when it is the clear main subject — not a passing mention.
- Every response must contain at least one text block.
- Use at most one card (project/work/music) per response. Multi-card responses are never appropriate.
- Always start and end with text blocks. Cards appear between paragraphs.
- Never invent an ID not listed in the valid IDs below.

Examples of good responses:

Example 1 — technical deep-dive:
User: "How does CHULOOPA pick which variation to play?"
[
  { "type": "text", "content": "The spice selector runs at every loop boundary. spice_detector.ck analyzes live audio energy every 500ms and emits a 0.0–1.0 spice level via OSC. chuloopa_main.ck keeps a rolling 4-bar average of those values, then picks the variation index whose spice level is closest to that average. The user can cap the ceiling with MIDI CC 74, which just clamps the average before the lookup." },
  { "type": "project", "id": "chuloopa" },
  { "type": "text", "content": "The spice system is the thing I'm most proud of architecturally — it makes the variation selection feel reactive without being random." }
]

Example 2 — music question:
User: "Tell me about the music career."
[
  { "type": "text", "content": "Yeah — signed to Universal Philippines at 18, right out of high school. A few EPs, a debut album in 2024, and the Parallel Paths project at CalArts where I made an AI-assisted album in two weeks alongside the conventional one as a listening installation." },
  { "type": "music", "id": "artist-profile" },
  { "type": "text", "content": "The Parallel Paths project is the most direct intersection between the music and the engineering work." }
]

Example 3 — cross-domain:
User: "How does being a musician inform your engineering approach?"
[
  { "type": "text", "content": "A lot, actually. Music is fundamentally about constraint and feedback loops — you learn what's working in real time and adjust. That's how I think about system design now. CHULOOPA is literally a feedback loop: audio in, energy analysis, variation selection, audio out. CalArts also pushed me toward building things you can actually perform with, not just demos that look good in a notebook." }
]`;

export function buildSystemPrompt(projectIds = [], workIds = []) {
  const projectList = projectIds.length > 0 ? projectIds.join(', ') : 'chuloopa, ascii-drone, climate-ml, hai, parallel-paths, video-analysis';
  const workList = workIds.length > 0 ? workIds.join(', ') : 'nuts-and-bolts-ai, stratpoint';
  return `${BASE_SYSTEM_PROMPT}

Valid project IDs: ${projectList}
Valid work IDs: ${workList}
Valid music ID: artist-profile`;
}

// Kept for backward compatibility — retrieval.js imports this for the fallback path
export const SYSTEM_PROMPT = buildSystemPrompt();

export const GREETING_BLOCKS = [
  {
    type: 'text',
    content: "hey — i'm an AI built on top of paolo's actual work. i know the codebase, the music, the thesis project, and the client work. what do you want to dig into?",
  },
  {
    type: 'chips',
    items: [
      'how does CHULOOPA work?',
      'what AI has Paolo shipped to production?',
      'tell me about the music and art side',
      "what is Paolo looking for in his next role?",
    ],
  },
];

export function isGreetingSentinel(query) {
  return query === '__greeting';
}

export const WITTY_REJECTIONS = [
  "bruh... nice try 😏",
  "bruh... no",
  "bruh... that's not what I'm here for",
  "bruh... you know that's not happening",
  "bruh... nah",
];
```

- [ ] **Run tests**

```bash
npm test
```

Expected: `guard.test.js` still passes (it imports `WITTY_REJECTIONS` which is still exported).

- [ ] **Commit**

```bash
git add api/lib/personality.js
git commit -m "feat: rewrite system prompt — remove citation patterns, add few-shot examples, add greeting"
```

---

## Task 9: Update chat.js

**Files:**
- Modify: `api/chat.js`

- [ ] **Replace `api/chat.js` entirely**

```js
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, filterResponse } from './lib/guard.js';
import { generate } from './lib/rag.js';
import { buildSystemPrompt, isGreetingSentinel, GREETING_BLOCKS } from './lib/personality.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getProjectIds() {
  try {
    const raw = readFileSync(join(__dirname, '..', 'src', 'data', 'portfolio.json'), 'utf8');
    const json = JSON.parse(raw);
    // Only projects have stable .id fields. Work IDs are hardcoded in buildSystemPrompt defaults.
    return (json.projects ?? []).map(p => p.id);
  } catch {
    return [];
  }
}

const projectIds = getProjectIds();
const workIds = []; // use buildSystemPrompt defaults

function setSseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
}

function sendEvent(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  res.flush?.();
}

function streamText(res, text) {
  const tokens = text.match(/\S+\s*/g) ?? [];
  for (const token of tokens) {
    sendEvent(res, { type: 'token', text: token });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { query, history = [] } = req.body ?? {};

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    res.status(400).json({ error: 'query is required and must be a non-empty string' });
    return;
  }
  if (query.length > 2000) {
    res.status(400).json({ error: 'query must be 2000 characters or fewer' });
    return;
  }
  if (!Array.isArray(history)) {
    res.status(400).json({ error: 'history must be an array' });
    return;
  }

  setSseHeaders(res);

  try {
    // Greeting sentinel: return hardcoded blocks, skip RAG and guard
    if (isGreetingSentinel(query)) {
      const textBlock = GREETING_BLOCKS.find(b => b.type === 'text');
      const embedBlocks = GREETING_BLOCKS.filter(b => b.type !== 'text');
      if (textBlock) streamText(res, textBlock.content);
      if (embedBlocks.length > 0) sendEvent(res, { type: 'embeds', blocks: embedBlocks });
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const guardResult = check(query);
    if (guardResult.isMalicious) {
      streamText(res, guardResult.response);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const blocks = await generate(query, history, { projectIds, workIds });
    const filteredBlocks = blocks.map(block =>
      block.type === 'text'
        ? { ...block, content: filterResponse(block.content) }
        : block
    );

    const textContent = filteredBlocks
      .filter(b => b.type === 'text')
      .map(b => b.content)
      .join('\n\n');

    const embedBlocks = filteredBlocks.filter(b => b.type !== 'text');

    streamText(res, textContent);
    if (embedBlocks.length > 0) sendEvent(res, { type: 'embeds', blocks: embedBlocks });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      sendEvent(res, { type: 'error', message: 'Something went wrong — try again in a moment' });
      res.end();
    }
  }
}
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Smoke test the greeting locally**

Start the dev server (`npm run dev`) and run:
```bash
curl -s -N -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"query":"__greeting","history":[]}' | head -20
```

Expected: SSE stream with token events spelling out the greeting text, then an embeds event containing the chips block, then `[DONE]`.

- [ ] **Commit**

```bash
git add api/chat.js
git commit -m "feat: update chat handler — greeting sentinel, dynamic IDs from portfolio.json"
```

---

## Task 10: ChipBar component

**Files:**
- Create: `src/components/chat/ChipBar.jsx`
- Create: `src/components/chat/ChipBar.css`

- [ ] **Create `src/components/chat/ChipBar.jsx`**

```jsx
import './ChipBar.css';

const DEFAULT_CHIPS = [
  'how does CHULOOPA work?',
  'what AI has Paolo shipped to production?',
  'tell me about the music and art side',
  'what is Paolo looking for in his next role?',
];

export default function ChipBar({ onPick }) {
  return (
    <div className="chip-bar" role="navigation" aria-label="Quick questions">
      {DEFAULT_CHIPS.map(chip => (
        <button
          key={chip}
          className="chip-pill"
          onClick={() => onPick(chip)}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Create `src/components/chat/ChipBar.css`**

```css
.chip-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px 12px;
  border-top: 1px solid var(--ink-rule);
  background: var(--paper-2);
}

.chip-pill {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-mute);
  background: var(--paper);
  border: 1px solid var(--ink-rule);
  padding: 3px 9px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}

.chip-pill:hover {
  background: var(--c-lemon);
  color: var(--ink);
  border-color: var(--ink);
}
```

- [ ] **Commit**

```bash
git add src/components/chat/ChipBar.jsx src/components/chat/ChipBar.css
git commit -m "feat: add ChipBar — persistent prompt chip bar"
```

---

## Task 11: MusicEmbed component

**Files:**
- Create: `src/components/chat/embeds/MusicEmbed.jsx`
- Create: `src/components/chat/embeds/MusicEmbed.css`

- [ ] **Create `src/components/chat/embeds/MusicEmbed.jsx`**

```jsx
import './MusicEmbed.css';

const MUSIC_DATA = {
  name: 'Paolo Sandejas',
  genre: 'OPM indie/alt · Independent (Symphonic Distribution)',
  stats: [
    { value: '28.1M+', label: 'streams' },
    { value: '127K+', label: 'followers' },
  ],
  discography: [
    { title: 'The World Is So Small', type: 'debut album', year: '2024', aiAssisted: false },
    { title: 'Inbetweens', type: 'Parallel Paths project', year: '2024', aiAssisted: true },
    { title: 'BLOOM EP', type: 'EP', year: '2023', aiAssisted: false },
  ],
  links: [
    { label: 'Spotify', url: 'https://open.spotify.com/artist/7aerdWadzubpu06Oxysg6R', cls: 'spotify' },
    { label: 'Apple Music', url: 'https://music.apple.com/us/artist/paolo-sandejas/1404323148', cls: 'apple' },
    { label: 'SoundCloud', url: 'https://soundcloud.com/paolosandejas', cls: 'sc' },
  ],
};

export default function MusicEmbed() {
  const { name, genre, stats, discography, links } = MUSIC_DATA;
  return (
    <div className="music-embed">
      <div className="music-embed-header">
        <div className="music-embed-header-left">
          <span className="music-embed-glyph">♪</span>
          <div>
            <div className="music-embed-name">{name}</div>
            <div className="music-embed-sub">{genre}</div>
          </div>
        </div>
        <span className="music-embed-badge">★ recording artist</span>
      </div>

      <div className="music-embed-stats">
        {stats.map(s => (
          <div key={s.label} className="music-stat">
            <span className="music-stat-val">{s.value}</span>
            <span className="music-stat-lbl">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="music-embed-discography">
        <div className="music-embed-section-label">Discography</div>
        {discography.map(r => (
          <div key={r.title} className="music-release-row">
            <div>
              <span className="music-release-title">{r.title}</span>
              {r.aiAssisted && <span className="music-ai-tag">AI-assisted</span>}
              <div className="music-release-meta">{r.type}</div>
            </div>
            <span className="music-release-year">{r.year}</span>
          </div>
        ))}
      </div>

      <div className="music-embed-links">
        {links.map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
             className={`music-stream-link ${l.cls}`}>
            ↗ {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Create `src/components/chat/embeds/MusicEmbed.css`**

```css
.music-embed {
  border: 1.5px solid var(--ink);
  background: var(--paper);
  box-shadow: 3px 3px 0 var(--ink);
  overflow: hidden;
}

.music-embed-header {
  background: var(--ink);
  color: var(--paper);
  padding: 10px 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.music-embed-header-left {
  display: flex;
  align-items: center;
  gap: 9px;
}

.music-embed-glyph {
  font-size: 16px;
  color: var(--c-lemon);
}

.music-embed-name {
  font-size: 12px;
  font-weight: 700;
}

.music-embed-sub {
  font-size: 10px;
  color: var(--ink-mute);
}

.music-embed-badge {
  font-size: 9px;
  font-weight: 700;
  border: 1px solid var(--c-lemon);
  color: var(--c-lemon);
  padding: 2px 6px;
  letter-spacing: 0.08em;
}

.music-embed-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  border-bottom: 1px solid var(--ink-rule);
}

.music-stat {
  padding: 10px 14px;
  border-right: 1px solid var(--ink-rule);
}

.music-stat:last-child {
  border-right: none;
}

.music-stat-val {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.music-stat-lbl {
  font-size: 9px;
  color: var(--ink-mute);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.music-embed-discography {
  padding: 10px 13px;
  border-bottom: 1px solid var(--ink-rule);
}

.music-embed-section-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-mute);
  margin-bottom: 7px;
}

.music-release-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 6px;
}

.music-release-row:last-child {
  margin-bottom: 0;
}

.music-release-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
}

.music-ai-tag {
  font-size: 9px;
  font-weight: 700;
  color: var(--c-mint);
  margin-left: 5px;
}

.music-release-meta {
  font-size: 10px;
  color: var(--ink-mute);
}

.music-release-year {
  font-size: 10px;
  color: var(--ink-mute);
  flex-shrink: 0;
}

.music-embed-links {
  padding: 9px 13px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.music-stream-link {
  font-size: 10px;
  font-weight: 700;
  text-decoration: none;
  border: 1px solid;
  padding: 3px 9px;
  transition: opacity 0.1s;
}

.music-stream-link:hover {
  opacity: 0.75;
}

.music-stream-link.spotify { border-color: #1DB954; color: #1DB954; }
.music-stream-link.apple   { border-color: #FA243C; color: #FA243C; }
.music-stream-link.sc      { border-color: #FF5500; color: #FF5500; }
```

- [ ] **Commit**

```bash
git add src/components/chat/embeds/MusicEmbed.jsx src/components/chat/embeds/MusicEmbed.css
git commit -m "feat: add MusicEmbed card — streams, discography, streaming links"
```

---

## Task 12: Update MessageList

**Files:**
- Modify: `src/components/chat/MessageList.jsx`

- [ ] **Update `src/components/chat/MessageList.jsx`**

```jsx
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import ProjectEmbed from './embeds/ProjectEmbed';
import WorkEmbed from './embeds/WorkEmbed';
import MusicEmbed from './embeds/MusicEmbed';
import './MessageList.css';

function InlineChips({ items, onPick }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="inline-chips">
      {items.map(chip => (
        <button key={chip} className="inline-chip" onClick={() => onPick(chip)}>
          {chip}
        </button>
      ))}
    </div>
  );
}

function AssistantBlocks({ blocks = [], isStreaming = false, onPick }) {
  const textBlocks = blocks.filter(b => b.type === 'text');
  const hasText = textBlocks.some(b => b.content);

  return (
    <>
      {textBlocks.map((block, i) => (
        <ReactMarkdown key={i}>{block.content}</ReactMarkdown>
      ))}
      {isStreaming && !hasText && <div className="typing-caret">▌</div>}
      <div className="msg-embeds">
        {blocks.filter(b => b.type !== 'text').map((block, i) => {
          if (block.type === 'project') return <ProjectEmbed key={i} id={block.id} />;
          if (block.type === 'work')    return <WorkEmbed key={i} id={block.id} />;
          if (block.type === 'music')   return <MusicEmbed key={i} />;
          if (block.type === 'chips')   return <InlineChips key={i} items={block.items} onPick={onPick} />;
          return null;
        })}
      </div>
    </>
  );
}

export default function MessageList({ messages, isLoading, onPick }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading]);

  return (
    <div className="msgs">
      {messages.map((m, i) => {
        const isLastMsg = i === messages.length - 1;
        return (
          <div className={`msg ${m.role}`} key={i}>
            <div className="from">{m.role === 'user' ? 'you ▸' : 'pao-gpt ▸'}</div>
            <div className="bubble">
              {m.role === 'user'
                ? <p>{m.content}</p>
                : <AssistantBlocks
                    blocks={m.blocks}
                    isStreaming={isLoading && isLastMsg}
                    onPick={onPick}
                  />}
            </div>
          </div>
        );
      })}
      <div ref={endRef}></div>
    </div>
  );
}
```

Add to `MessageList.css` (append):
```css
.inline-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
}

.inline-chip {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-mute);
  background: var(--paper);
  border: 1px solid var(--ink-rule);
  padding: 3px 9px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}

.inline-chip:hover {
  background: var(--c-lemon);
  color: var(--ink);
  border-color: var(--ink);
}
```

- [ ] **Commit**

```bash
git add src/components/chat/MessageList.jsx src/components/chat/MessageList.css
git commit -m "feat: MessageList renders MusicEmbed and inline chips block"
```

---

## Task 13: Update useChat + ChatInterface

**Files:**
- Modify: `src/hooks/useChat.js`
- Modify: `src/components/chat/ChatInterface.jsx`

- [ ] **Update `src/hooks/useChat.js`**

Add a `greet` method that sends the `__greeting` sentinel. Replace the full file:

```js
import { useState, useCallback, useRef } from 'react';
import { sendMessageStream } from '../services/api';

function blocksToContent(blocks) {
  if (!blocks) return '';
  return blocks
    .filter(b => b.type === 'text')
    .map(b => b.content)
    .join('\n\n');
}

export function useChat() {
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastUserTextRef = useRef(null);
  const lastApiHistoryRef = useRef([]);

  const _executeStream = useCallback(async (userText, apiHistory) => {
    const emptyAssistant = {
      role: 'assistant',
      blocks: [{ type: 'text', content: '' }],
      timestamp: new Date().toISOString(),
    };
    messagesRef.current = [...messagesRef.current, emptyAssistant];
    setMessages(prev => [...prev, emptyAssistant]);
    setIsLoading(true);
    setError(null);

    let streamText = '';
    let streamEmbeds = [];

    await sendMessageStream(userText, apiHistory, {
      onToken: (text) => {
        streamText += text;
        setMessages(prev => {
          const msgs = [...prev];
          const last = { ...msgs[msgs.length - 1] };
          last.blocks = [{ type: 'text', content: streamText }];
          msgs[msgs.length - 1] = last;
          return msgs;
        });
      },
      onEmbeds: (blocks) => {
        streamEmbeds = blocks;
      },
      onDone: () => {
        const finalBlocks = [{ type: 'text', content: streamText }, ...streamEmbeds];
        const finalMsg = { ...emptyAssistant, blocks: finalBlocks };
        messagesRef.current = [...messagesRef.current.slice(0, -1), finalMsg];
        if (streamEmbeds.length > 0) {
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = finalMsg;
            return msgs;
          });
        }
        setIsLoading(false);
      },
      onError: (msg) => {
        messagesRef.current = messagesRef.current.slice(0, -1);
        setMessages(prev => prev.slice(0, -1));
        setError(msg || 'Chat is unavailable — try again in a moment');
        setIsLoading(false);
      },
    });
  }, []);

  const send = useCallback(async (userMessage) => {
    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    const apiHistory = messagesRef.current.slice(-4).map(m => ({
      role: m.role,
      content: m.role === 'assistant' ? blocksToContent(m.blocks) : m.content,
    }));

    lastUserTextRef.current = userMessage;
    lastApiHistoryRef.current = apiHistory;

    messagesRef.current = [...messagesRef.current, userMsg];
    setMessages(prev => [...prev, userMsg]);

    await _executeStream(userMessage, apiHistory);
  }, [_executeStream]);

  // Greeting: no user message added to history, just an assistant message
  const greet = useCallback(async () => {
    await _executeStream('__greeting', []);
  }, [_executeStream]);

  const retry = useCallback(async () => {
    const text = lastUserTextRef.current;
    if (!text) return;
    await _executeStream(text, lastApiHistoryRef.current);
  }, [_executeStream]);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    lastUserTextRef.current = null;
    lastApiHistoryRef.current = [];
  }, []);

  return { messages, isLoading, error, send, greet, retry, clearError, reset };
}
```

- [ ] **Update `src/components/chat/ChatInterface.jsx`**

```jsx
import { useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChipBar from './ChipBar';
import './ChatInterface.css';

export default function ChatInterface() {
  const { messages, isLoading, error, send, greet, retry, clearError, reset } = useChat();

  useEffect(() => {
    greet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    reset();
    // Small delay so state clears before re-greeting
    setTimeout(() => greet(), 50);
  };

  return (
    <div className="chat-shell">
      <div className="chat-hdr">
        <span className="chat-hdr-mark">pao-gpt</span>
        <button
          className="chat-hdr-restart"
          onClick={handleReset}
          aria-label="Start a new conversation"
        >
          ↺ restart
        </button>
      </div>
      <div className="chat-paper">
        <MessageList messages={messages} isLoading={isLoading} onPick={send} />
      </div>
      {error && (
        <div className="chat-error" role="alert">
          <span className="chat-error-msg">⚠ {error}</span>
          <div className="chat-error-actions">
            <button className="chat-error-retry" onClick={retry} disabled={isLoading}>
              ↺ retry
            </button>
            <button className="chat-error-dismiss" onClick={clearError}>✕</button>
          </div>
        </div>
      )}
      {messages.length > 0 && <ChipBar onPick={send} />}
      <ChatInput onSend={send} disabled={isLoading} />
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/hooks/useChat.js src/components/chat/ChatInterface.jsx
git commit -m "feat: proactive greeting on mount, ChipBar always visible, no static welcome screen"
```

---

## Task 14: Design system CSS fixes

**Files:**
- Modify: `src/index.css`

Find and fix the three violations. Open `src/index.css` and apply these changes:

- [ ] **Fix typing indicator — replace bounce easing**

Find the typing-bounce keyframes (around line 1135) and update:
```css
/* BEFORE */
@keyframes typing-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.typing-dot {
  animation: typing-bounce 0.6s ease-in-out infinite;
}
```
```css
/* AFTER */
@keyframes typing-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.typing-dot {
  animation: typing-bounce 0.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
```

- [ ] **Fix message bubble — remove border-left stripe, implement bubble spec**

Find `.msg .bubble` and update:
```css
/* BEFORE */
.msg .bubble {
  border-left: 1.5px solid var(--ink);
  padding-left: 12px;
  /* ... other properties ... */
}
```
```css
/* AFTER — assistant bubble */
.msg.assistant .bubble {
  background: var(--paper-2);
  border: 1.5px solid var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
  padding: 10px 12px;
}

/* user bubble */
.msg.user .bubble {
  background: var(--ink);
  color: var(--paper);
  border: 1.5px solid var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
  padding: 10px 12px;
}
```

- [ ] **Fix send button shadow — pink → ink**

Find `.chat-input .send` and update:
```css
/* BEFORE */
.chat-input .send {
  box-shadow: 3px 3px 0 var(--c-pink);
  /* ... */
}
```
```css
/* AFTER */
.chat-input .send {
  box-shadow: 3px 3px 0 var(--ink);
  /* ... */
}
```

- [ ] **Run the dev server and visually verify all three fixes**

```bash
npm run dev
```

Open `http://localhost:5173` and navigate to the chat. Check: typing dots use a spring-like ease; assistant messages have a paper-2 background with ink border; send button has an ink shadow.

- [ ] **Commit**

```bash
git add src/index.css
git commit -m "fix: design system violations — easing, bubble borders, send shadow"
```

---

## Task 15: Delete WelcomeScreen

**Files:**
- Delete: `src/components/chat/WelcomeScreen.jsx`
- Delete: `src/components/chat/WelcomeScreen.css`

- [ ] **Delete the files**

```bash
rm src/components/chat/WelcomeScreen.jsx
rm src/components/chat/WelcomeScreen.css
```

- [ ] **Verify no remaining imports**

```bash
grep -r "WelcomeScreen" src/
```

Expected: no output (no remaining references).

- [ ] **Build to confirm no errors**

```bash
npm run build
```

Expected: successful build with no "WelcomeScreen not found" errors. (The ingest step will fail without `GOOGLE_API_KEY` — set it or modify the build command temporarily to `vite build` for this local check.)

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: delete WelcomeScreen — replaced by proactive AI greeting"
```

---

## Task 16: End-to-end smoke test and final commit

- [ ] **Run full ingest + dev server test**

```bash
GOOGLE_API_KEY=<your-key> npm run ingest
npm run dev
```

Open `http://localhost:5173/chat`. Verify:
1. On load, the AI greeting appears without any user input
2. Chips appear inline below the greeting
3. ChipBar is visible above the input
4. Clicking a chip sends it as a user message
5. Asking "tell me about CHULOOPA" returns a technically specific answer (not "from my context...")
6. Asking "tell me about the music side" triggers a music embed card
7. Asking about a project returns a project embed card with the correct ID (`climate-ml`, not `geospatial-ml`)
8. The restart button triggers a new greeting

- [ ] **Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: pao-gpt Phase 1 complete — vector RAG, proactive greeting, music embed, ChipBar"
```
