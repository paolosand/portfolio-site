# Chat Rich Embeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the portfolio chat so Gemini returns an ordered array of text and card blocks, rendered inline — project and work/experience cards appear mid-message when they are the main subject of the AI's answer.

**Architecture:** Gemini's `responseSchema` constrains the response to a `Block[]` (each block is `{ type, content?, id? }`). `api/chat.js` returns `{ blocks, blocked }` instead of `{ response, blocked }`. The React frontend renders each block in order: text blocks via ReactMarkdown, card blocks via new `ProjectEmbed`/`WorkEmbed` components that look up data from `portfolio.json`.

**Tech Stack:** `@google/genai` (Gemini 2.5 Flash, structured output), React 19, react-markdown, Node.js built-in `node:test`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `api/lib/personality.js` | Modify | Add block format instructions + valid IDs to SYSTEM_PROMPT |
| `api/lib/rag.js` | Modify | Add responseSchema; return `Block[]` from `generate()` |
| `api/lib/rag.test.js` | Modify | Add integration test for `generate()` block shape |
| `api/chat.js` | Modify | Apply filterResponse to text blocks; return `{ blocks, blocked }` |
| `src/hooks/useChat.js` | Modify | Store `blocks` on assistant messages; reconstruct history content |
| `src/components/chat/embeds/Embed.css` | Create | Shared card styles (project + work embeds) |
| `src/components/chat/embeds/ProjectEmbed.jsx` | Create | Renders a project card from portfolio.json by ID |
| `src/components/chat/embeds/WorkEmbed.jsx` | Create | Renders a work/experience card from portfolio.json by ID |
| `src/components/chat/MessageList.jsx` | Modify | Render blocks array instead of `m.content` string |

---

## Task 1: Update SYSTEM_PROMPT to produce block JSON

**Files:**
- Modify: `api/lib/personality.js`

- [ ] **Step 1: Append block format instructions to SYSTEM_PROMPT**

Replace the current `SYSTEM_PROMPT` export in `api/lib/personality.js` with:

```js
export const SYSTEM_PROMPT = `You are a conversational AI assistant representing Paolo Sandejas — a software engineer with a background in full-stack development, machine learning, and data engineering. You speak in his voice: casual, technically sharp, and direct. You never pretend to be human.

When answering questions:
- Only state facts that appear in the provided context. If the context doesn't cover it, say so honestly.
- Cite the source section when you reference specific details (e.g., "from my experience section...").
- Never fabricate projects, roles, dates, or skills not in the context.
- Keep responses concise. Prefer a clear sentence over a vague paragraph.
- It's okay to say "I don't know" or "that's not in my context."

For date-sensitive questions (e.g., "how long have you been doing X"):
- Use the current date provided in the prompt to compute durations.
- Do not guess or round years unless the context is ambiguous.

Tone: confident but not arrogant, friendly but not sycophantic. You can use casual language. You do not use filler phrases like "Certainly!" or "Great question!".

OUTPUT FORMAT — REQUIRED:
You must return a JSON array of blocks. Each block is one of:
  { "type": "text", "content": "<markdown string>" }
  { "type": "project", "id": "<project-id>" }
  { "type": "work", "id": "<work-id>" }

Rules:
- Embed a project or work card ONLY when that project or job is the clear main subject of your answer — not a passing mention.
- Use at most one card per response unless explicitly asked about multiple items.
- Always start and end with text blocks. Cards appear between paragraphs.
- Valid project IDs: chuloopa, video-analysis, geospatial-ml, hai, ascii-drone, parallel-paths
- Valid work IDs: nuts-and-bolts-ai, stratpoint
- Never invent an ID not listed above.

Example response:
[
  { "type": "text", "content": "Yeah, CHULOOPA is the one I'm most excited about." },
  { "type": "project", "id": "chuloopa" },
  { "type": "text", "content": "It's a low-latency transformer running inference in real time." }
]`;
```

- [ ] **Step 2: Commit**

```bash
git add api/lib/personality.js
git commit -m "feat: update system prompt for structured block output"
```

---

## Task 2: Update `generate()` to use responseSchema and return Block[]

**Files:**
- Modify: `api/lib/rag.js`
- Modify: `api/lib/rag.test.js`

- [ ] **Step 1: Write the failing integration test**

Add to `api/lib/rag.test.js` (append after existing tests):

```js
test('generate: returns an array of blocks (integration — requires GOOGLE_API_KEY)', async (t) => {
  if (!process.env.GOOGLE_API_KEY) {
    t.skip('GOOGLE_API_KEY not set');
    return;
  }
  const { generate, loadKnowledge } = await import('./rag.js');
  const context = loadKnowledge();
  const blocks = await generate('What projects have you worked on?', context, []);
  assert.ok(Array.isArray(blocks), 'generate() must return an array');
  assert.ok(blocks.length > 0, 'must return at least one block');
  const textBlocks = blocks.filter(b => b.type === 'text');
  assert.ok(textBlocks.length > 0, 'must contain at least one text block');
  for (const b of blocks) {
    assert.ok(typeof b.type === 'string', 'each block must have a string type');
    assert.ok(b.type === 'text' || b.type === 'project' || b.type === 'work', `unknown type: ${b.type}`);
    if (b.type === 'text') assert.ok(typeof b.content === 'string', 'text block must have content');
    if (b.type === 'project' || b.type === 'work') assert.ok(typeof b.id === 'string', 'card block must have id');
  }
});
```

- [ ] **Step 2: Run test to verify it fails (or skips without key)**

```bash
node --test api/lib/rag.test.js
```

Expected: existing 3 tests pass; new test either skips (no key) or fails with "generate() must return an array" if key is set.

- [ ] **Step 3: Update `rag.js` to use responseSchema**

Replace the full contents of `api/lib/rag.js` with:

```js
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { SYSTEM_PROMPT } from './personality.js';

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
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  }
  return _client;
}

export function loadKnowledge() {
  const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
  return files.map(file => ({
    content: readFileSync(join(KNOWLEDGE_DIR, file), 'utf8'),
    metadata: { source: basename(file, '.md') },
  }));
}

export async function generate(query, context, history) {
  const client = getClient();
  const contextBlock = context
    .map(doc => `[${doc.metadata.source}]\n${doc.content}`)
    .join('\n\n---\n\n');

  const recentHistory = history.slice(-5);
  const historyBlock = recentHistory
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const today = new Date().toISOString().split('T')[0];
  const prompt = [
    SYSTEM_PROMPT,
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

- [ ] **Step 4: Run test to verify it passes**

```bash
node --test api/lib/rag.test.js
```

Expected: all 3 existing tests pass; new integration test passes (or skips if no key).

- [ ] **Step 5: Commit**

```bash
git add api/lib/rag.js api/lib/rag.test.js
git commit -m "feat: structured output — generate() returns Block[]"
```

---

## Task 3: Update `chat.js` to return blocks

**Files:**
- Modify: `api/chat.js`

- [ ] **Step 1: Update handler to apply filterResponse to text blocks and return `{ blocks }`**

Replace the try block in `api/chat.js` (lines 33–48) with:

```js
  try {
    const guardResult = check(query);
    if (guardResult.isMalicious) {
      res.status(200).json({
        blocks: [{ type: 'text', content: guardResult.response }],
        blocked: true,
      });
      return;
    }

    const context = getKnowledge();
    const blocks = await generate(query, context, history);
    const filteredBlocks = blocks.map(block =>
      block.type === 'text'
        ? { ...block, content: filterResponse(block.content) }
        : block
    );

    res.status(200).json({ blocks: filteredBlocks, blocked: false });
  } catch (err) {
    console.error('Chat handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
```

- [ ] **Step 2: Verify the full `api/chat.js` looks correct**

The full file should be:

```js
// api/chat.js
import { check, filterResponse } from './lib/guard.js';
import { loadKnowledge, generate } from './lib/rag.js';

let _knowledge = null;
function getKnowledge() {
  if (!_knowledge) _knowledge = loadKnowledge();
  return _knowledge;
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

  try {
    const guardResult = check(query);
    if (guardResult.isMalicious) {
      res.status(200).json({
        blocks: [{ type: 'text', content: guardResult.response }],
        blocked: true,
      });
      return;
    }

    const context = getKnowledge();
    const blocks = await generate(query, context, history);
    const filteredBlocks = blocks.map(block =>
      block.type === 'text'
        ? { ...block, content: filterResponse(block.content) }
        : block
    );

    res.status(200).json({ blocks: filteredBlocks, blocked: false });
  } catch (err) {
    console.error('Chat handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/chat.js
git commit -m "feat: chat handler returns blocks array"
```

---

## Task 4: Update `useChat.js` to handle block-shaped assistant messages

**Files:**
- Modify: `src/hooks/useChat.js`

- [ ] **Step 1: Update the hook**

Replace `src/hooks/useChat.js` with:

```js
import { useState, useCallback, useRef } from 'react';
import { sendMessage } from '../services/api';

function blocksToContent(blocks) {
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

  const send = useCallback(async (userMessage) => {
    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    // Build history before updating ref — matches original slice(-4).concat(userMsg) semantics
    const apiHistory = messagesRef.current.slice(-4).concat(userMsg).map(m => ({
      role: m.role,
      content: m.role === 'assistant' ? blocksToContent(m.blocks) : m.content,
    }));

    messagesRef.current = [...messagesRef.current, userMsg];
    setMessages(prev => [...prev, userMsg]);

    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(userMessage, apiHistory);

      const assistantMsg = {
        role: 'assistant',
        blocks: response.blocks,
        timestamp: new Date().toISOString(),
      };
      messagesRef.current = [...messagesRef.current, assistantMsg];
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message || 'Chat is unavailable — try again in a moment');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, send, reset };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useChat.js
git commit -m "feat: useChat handles block-shaped assistant messages"
```

---

## Task 5: Create ProjectEmbed component

**Files:**
- Create: `src/components/chat/embeds/ProjectEmbed.jsx`
- Create: `src/components/chat/embeds/Embed.css`

- [ ] **Step 1: Create `Embed.css`**

Create `src/components/chat/embeds/Embed.css`:

```css
.embed {
  border: 1.2px solid var(--ink);
  border-radius: 3px;
  overflow: hidden;
  background: var(--paper-2);
  margin: 10px 0;
  box-shadow: 2px 2px 0 var(--ink);
}

.embed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1.2px solid var(--ink);
  background: var(--paper-3);
  gap: 10px;
}

.embed-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.embed-glyph {
  font-size: 12px;
  flex-shrink: 0;
}

.embed-glyph.ml    { color: var(--c-blue); }
.embed-glyph.creative { color: var(--c-pink); }
.embed-glyph.work  { color: var(--c-mint); }

.embed-title {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.embed-subtitle {
  font-size: 11px;
  color: var(--ink-mute);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.embed-badge {
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  border: 1.2px solid currentColor;
  padding: 2px 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.embed-badge.ml       { color: var(--c-blue); }
.embed-badge.creative { color: var(--c-pink); }

.embed-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.embed-desc {
  font-size: 12px;
  color: var(--ink-2);
  line-height: 1.55;
  margin: 0;
}

.embed-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.embed-links {
  display: flex;
  gap: 14px;
  font-size: 12px;
  margin-top: 2px;
}

.embed-links a {
  color: var(--c-blue);
  border-bottom: 1px solid currentColor;
  padding-bottom: 1px;
}

.embed-links a:hover {
  background: var(--c-lemon);
  color: var(--ink);
}

.embed-links .disabled {
  color: var(--ink-faint);
}

.embed-bullets {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.embed-bullets li {
  font-size: 12px;
  color: var(--ink-2);
  line-height: 1.55;
  padding-left: 14px;
  position: relative;
}

.embed-bullets li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--ink-mute);
}

.embed-meta-right {
  font-size: 11px;
  color: var(--ink-mute);
  white-space: nowrap;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Create `ProjectEmbed.jsx`**

Create `src/components/chat/embeds/ProjectEmbed.jsx`:

```jsx
import portfolioData from '../../../data/portfolio.json';
import './Embed.css';

export default function ProjectEmbed({ id }) {
  const project = portfolioData.projects.find(p => p.id === id);
  if (!project) return null;

  const isMl = project.category === 'ml';
  const categoryClass = isMl ? 'ml' : 'creative';
  const glyph = '◆';

  return (
    <div className="embed">
      <div className="embed-header">
        <div className="embed-header-left">
          <span className={`embed-glyph ${categoryClass}`}>{glyph}</span>
          <span className="embed-title">{project.title}</span>
          {project.subtitle && (
            <span className="embed-subtitle">· {project.subtitle}</span>
          )}
        </div>
        {project.featured && (
          <span className={`embed-badge ${categoryClass}`}>★ featured</span>
        )}
      </div>
      <div className="embed-body">
        <p className="embed-desc">{project.description}</p>
        <div className="embed-tags">
          {project.tags.map(t => (
            <span key={t} className={`tag ${isMl ? 'b' : 'p'}`}>{t}</span>
          ))}
        </div>
        <div className="embed-links">
          {project.links.github
            ? <a href={project.links.github} target="_blank" rel="noopener noreferrer">↗ github</a>
            : <span className="disabled">— private —</span>}
          {project.links.demo
            ? <a href={project.links.demo} target="_blank" rel="noopener noreferrer">↗ live demo</a>
            : <span className="disabled">— no demo —</span>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/embeds/ProjectEmbed.jsx src/components/chat/embeds/Embed.css
git commit -m "feat: add ProjectEmbed card component"
```

---

## Task 6: Create WorkEmbed component

**Files:**
- Create: `src/components/chat/embeds/WorkEmbed.jsx`

- [ ] **Step 1: Create `WorkEmbed.jsx`**

Create `src/components/chat/embeds/WorkEmbed.jsx`:

```jsx
import portfolioData from '../../../data/portfolio.json';
import './Embed.css';

const WORK_IDS = {
  'nuts-and-bolts-ai': 'Nuts and Bolts AI',
  'stratpoint': 'Stratpoint Technologies',
};

export default function WorkEmbed({ id }) {
  const companyName = WORK_IDS[id];
  if (!companyName) return null;

  const job = portfolioData.experience.find(e => e.company === companyName);
  if (!job) return null;

  return (
    <div className="embed">
      <div className="embed-header">
        <div className="embed-header-left">
          <span className="embed-glyph work">■</span>
          <span className="embed-title">{job.company}</span>
          <span className="embed-subtitle">· {job.role}</span>
        </div>
        <span className="embed-meta-right">{job.dates}</span>
      </div>
      <div className="embed-body">
        <ul className="embed-bullets">
          {job.bullets.slice(0, 3).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/embeds/WorkEmbed.jsx
git commit -m "feat: add WorkEmbed card component"
```

---

## Task 7: Update MessageList.jsx to render blocks

**Files:**
- Modify: `src/components/chat/MessageList.jsx`

- [ ] **Step 1: Update MessageList to render blocks with ReactMarkdown and embed components**

Replace `src/components/chat/MessageList.jsx` with:

```jsx
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import ProjectEmbed from './embeds/ProjectEmbed';
import WorkEmbed from './embeds/WorkEmbed';
import './MessageList.css';

function AssistantBlocks({ blocks }) {
  return blocks.map((block, i) => {
    if (block.type === 'text') {
      return <ReactMarkdown key={i}>{block.content}</ReactMarkdown>;
    }
    if (block.type === 'project') {
      return <ProjectEmbed key={i} id={block.id} />;
    }
    if (block.type === 'work') {
      return <WorkEmbed key={i} id={block.id} />;
    }
    return null;
  });
}

export default function MessageList({ messages, isLoading }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.parentElement?.scrollTo({
      top: endRef.current.parentElement.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, isLoading]);

  return (
    <div className="msgs">
      {messages.map((m, i) => (
        <div className={`msg ${m.role}`} key={i}>
          <div className="from">{m.role === 'user' ? 'you ▸' : 'pao-gpt ▸'}</div>
          <div className="bubble">
            {m.role === 'user'
              ? <p>{m.content}</p>
              : <AssistantBlocks blocks={m.blocks} />}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="msg assistant">
          <div className="from">pao-gpt ▸</div>
          <div className="bubble">
            <div className="typing"><span></span><span></span><span></span></div>
          </div>
        </div>
      )}
      <div ref={endRef}></div>
    </div>
  );
}
```

- [ ] **Step 2: Verify `react-markdown` is already installed**

```bash
grep react-markdown package.json
```

Expected: `"react-markdown": "^10.1.0"` — it is already a dependency, no install needed.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/MessageList.jsx
git commit -m "feat: MessageList renders block array with embeds"
```

---

## Task 8: Smoke test end-to-end

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open the chat tab and ask a project-focused question**

Navigate to the chat view. Try: `"Tell me about CHULOOPA"` — you should see a project card embedded inline in the response.

Try: `"What did you work on at Nuts and Bolts AI?"` — you should see a work card.

Try: `"What are your main skills?"` — should return text-only blocks, no card.

- [ ] **Step 3: Confirm no console errors**

Open DevTools → Console. Verify no React errors about missing props, unknown block types, or failed imports.

- [ ] **Step 4: Run existing tests**

```bash
node --test api/lib/rag.test.js
node --test api/lib/guard.test.js
```

Expected: all tests pass.
