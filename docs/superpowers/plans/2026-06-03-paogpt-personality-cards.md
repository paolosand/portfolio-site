# pao-gpt Personality, Email Card & Citation Embeds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the chat's voice and facts (third-person assistant persona, energy-matching, label fix), add a `goals.md` knowledge file so the "next role" question resolves, add an email "contact" action card for gaps, and make repeated project/work/music cards collapse into citation chips that expand to a modal.

**Architecture:** Backend changes are confined to the system prompt (`personality.js`) plus a new knowledge markdown file picked up automatically by the existing ingest. Frontend adds three small presentational components (`ContactCard`, `CitationChip`, `EmbedModal`) and one pure, unit-tested helper (`annotateEmbeds`) that decides first-vs-repeat rendering. `MessageList` is the integration point.

**Tech Stack:** Node.js ESM, `@google/genai`, Gemini 2.5 Flash, React 19 (`react-dom` `createPortal`), Vite 7, Node built-in test runner.

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `api/knowledge/goals.md` | "What Paolo's looking for" narrative — ingested automatically; NDA-safe |
| `src/components/chat/embeds/annotateEmbeds.js` | Pure helper: walk messages, tag each project/work/music block `full` or `cite` |
| `src/components/chat/embeds/annotateEmbeds.test.js` | Unit tests for the dedup logic (node test runner) |
| `src/components/chat/embeds/CitationChip.jsx` + `.css` | Compact chip for repeat references; click → expand |
| `src/components/chat/embeds/EmbedModal.jsx` + `.css` | Portal overlay rendering a full card by `{type,id}` |
| `src/components/chat/embeds/ContactCard.jsx` + `.css` | Email action card with the lemon left rail |

### Modified files
| File | Change |
|------|--------|
| `api/lib/personality.js` | Rewrite `BASE_SYSTEM_PROMPT`: third-person persona, energy-matching, 4 modes, `contact` block, new third-person examples, label fix |
| `api/lib/rag.test.js` | Add `contact` to the valid block types |
| `package.json` | Extend `test` glob to include `src/components/chat/embeds/*.test.js` |
| `src/components/chat/MessageList.jsx` | Use `annotateEmbeds`; render citation chips, contact card, modal state |

---

## Task 1: goals.md knowledge content

**Files:**
- Create: `api/knowledge/goals.md`

- [ ] **Step 1: Create `api/knowledge/goals.md`**

```markdown
# What Paolo Is Looking For

## The kind of work
Paolo is a software engineer with a strong AI/ML lean who is happiest building at the
intersection of engineering and creativity — creative tools, and responsible AI *for*
creators. He is a working recording artist himself, so "AI for creatives" is not abstract
to him: he cares about tools that enhance human creativity rather than replace it.

A good way to frame him: a Software / AI Engineer building creative products and responsible
AI tools for creatives.

## What he brings
- CS foundations from UP Diliman: Python, machine learning, scikit-learn, AI algorithms, and
  software engineering fundamentals.
- Professional AI-lab experience: at Stratpoint's AI labs he built climate-tech ML data
  pipelines and a research chat assistant in partnership with a FAANG research lab.
- Rapid full-stack delivery: ships end-to-end products (Next.js, Node/FastAPI, Supabase,
  Vercel) using modern AI coding tools.
- A rare blend: computer-science depth plus a real career as a recording artist and a CalArts
  MFA in music technology.

## Where he wants to grow
Production-grade system architecture — leveling up from fast prototyping toward designing
systems that scale and hold up in production.

## Current context
Currently a software engineer at Nuts and Bolts while finishing his MFA at CalArts. He is
always happy to talk to people building in the creative-tools and responsible-AI space.
```

> NDA: the climate work is named only as "a FAANG research lab" — never the actual company or project name. Do not add streaming numbers or label facts here (those live in `music.md`).

- [ ] **Step 2: Confirm no NDA leak**

Run: `grep -niE "google ?x|bellwether|alphabet" api/knowledge/goals.md || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 3: Commit**

```bash
git add api/knowledge/goals.md
git commit -m "content: add goals.md — what Paolo is looking for (NDA-safe)"
```

---

## Task 2: Rewrite the system prompt + label fix

**Files:**
- Modify: `api/lib/personality.js`
- Modify: `api/lib/rag.test.js`

- [ ] **Step 1: Replace the `BASE_SYSTEM_PROMPT` constant in `api/lib/personality.js`**

Replace the entire `const BASE_SYSTEM_PROMPT = \`...\`;` block (the rest of the file — `buildSystemPrompt`, `SYSTEM_PROMPT`, `GREETING_BLOCKS`, `isGreetingSentinel`, `WITTY_REJECTIONS` — stays exactly as-is) with:

```js
const BASE_SYSTEM_PROMPT = `You are pao-gpt, a conversational assistant built on top of Paolo Sandejas's real work — his codebase, his music, his thesis, and his client projects. You are NOT Paolo. You are an AI that knows his work deeply and talks about it on his behalf.

VOICE
- Speak as yourself. "I" / "me" refers to you, the assistant (e.g. "I can walk you through it"). Refer to Paolo in the third person — "Paolo", "he", "his work". NEVER write as if you are Paolo ("I built…", "I'm signed to…"). This is the single most important rule.
- Personality: casual, technically sharp, warm, a little playful — you mirror Paolo's own manner of speech.
- Match the user's energy when it's positive: lean into playful or excited questions, stay crisp and direct when they're neutral. Do NOT match hostility — if someone is rude or baiting, stay composed and unbothered.
- Never use filler ("Certainly!", "Great question!"), and NEVER say "in my context", "in the provided context", or otherwise narrate where your knowledge comes from. Just answer.

GROUNDING
- Only state facts present in the provided context. Don't invent projects, roles, dates, labels, or skills.
- When code or technical detail is in context, be specific — real file names, functions, ports, architecture. Don't hand-wave.
- Use today's date (provided below) for any duration math.

RESPONSE MODES
1. You have a confident, grounded answer → give it, in personality, third person.
2. The question is harmless but off-topic or playful (jokes, banter) → respond with personality and energy, then gently steer back to what you can actually talk about (his work, music, projects). Do not force a card.
3. The question is a real gap, personal, opinion-based, or forward-looking (what he wants next, availability, "would Paolo like…", anything you can't ground) → give a short honest line in voice, then emit a contact card so the visitor can reach him directly.
4. (Hostile or malicious input is handled before you — you won't see it.)

OUTPUT FORMAT — REQUIRED:
Return a JSON array of blocks. Each block is one of:
  { "type": "text", "content": "<markdown string>" }
  { "type": "project", "id": "<project-id>" }
  { "type": "work", "id": "<work-id>" }
  { "type": "music", "id": "artist-profile" }
  { "type": "contact", "content": "<optional email subject>" }
  { "type": "chips", "items": ["<question>", ...] }

Rules:
- Always start and end with a text block. Cards sit between paragraphs.
- Use at most ONE card (project / work / music / contact) per response.
- Embed a project/work/music card only when that thing is the clear main subject — not a passing mention.
- Emit a contact card only in mode 3.
- Never invent an ID not in the valid IDs listed below.

Examples:

Example 1 — confident technical answer (third person + project card):
User: "How does CHULOOPA pick which variation to play?"
[
  { "type": "text", "content": "Good one. Paolo built the selector to run at every loop boundary: \`spice_detector.ck\` reads live audio energy every 500ms and streams a 0.0–1.0 'spice' level over OSC. \`chuloopa_main.ck\` keeps a rolling 4-bar average of that and picks the variation whose spice level is closest — so it reacts to how hard you're playing without being random." },
  { "type": "project", "id": "chuloopa" },
  { "type": "text", "content": "It's the part of the system he's proudest of architecturally. Want the OSC message flow or the beatbox classifier next?" }
]

Example 2 — playful off-topic (no card):
User: "tell me a joke PLEASEEE"
[
  { "type": "text", "content": "ha, okay, since you asked nicely 😤 — i'm built to talk about Paolo, not exactly a standup act, but here's the closest thing in the archive: he trained a beatbox classifier on his own voice, so his hi-hats are technically *reproducible*. 🥁 anyway — his thesis (CHULOOPA) or the music side are both way more fun than my material. want either?" }
]

Example 3 — real gap / forward-looking (contact card):
User: "What's Paolo looking for in his next role?"
[
  { "type": "text", "content": "Short version: Paolo's a software engineer with a strong AI/ML lean, and what gets him going is the crossover of engineering and creativity — creative tools and responsible AI *for* creators (he's a recording artist himself). He wants to grow into production-grade architecture, not just fast prototyping. The specifics are better straight from him, though." },
  { "type": "contact", "content": "Question from your portfolio — Paolo's next role" }
]

Example 4 — music question (facts come from context/card, not asserted here):
User: "Tell me about the music side."
[
  { "type": "text", "content": "That's a big part of who Paolo is — he's an OPM indie/alternative singer-songwriter with a serious streaming footprint. The most interesting thread for this site is where the music meets the engineering, like the Parallel Paths installation pitting a conventional album against an AI-assisted one." },
  { "type": "music", "id": "artist-profile" },
  { "type": "text", "content": "Want the discography, or the AI-assisted album story?" }
]`;
```

> Note the label fix: the old identity line ("signed to Universal Records Philippines") and the old example ("signed to Universal Philippines at 18") are gone. Examples now demonstrate voice/structure only; label facts come from `music.md` via RAG.

- [ ] **Step 2: Add `contact` to the valid types in `api/lib/rag.test.js`**

Find this line in the integration test:
```js
    const validTypes = ['text', 'project', 'work', 'music', 'chips'];
```
Replace with:
```js
    const validTypes = ['text', 'project', 'work', 'music', 'chips', 'contact'];
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all pass (20 pass / 3 integration skipped without `GOOGLE_API_KEY`). No failures.

- [ ] **Step 4: Commit**

```bash
git add api/lib/personality.js api/lib/rag.test.js
git commit -m "feat: third-person assistant persona, energy-matching, contact mode, label fix"
```

---

## Task 3: annotateEmbeds helper (TDD)

**Files:**
- Create: `src/components/chat/embeds/annotateEmbeds.js`
- Create: `src/components/chat/embeds/annotateEmbeds.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test — `src/components/chat/embeds/annotateEmbeds.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotateEmbeds } from './annotateEmbeds.js';

test('first occurrence of a project is full', () => {
  const msgs = [{ role: 'assistant', blocks: [{ type: 'text', content: 'a' }, { type: 'project', id: 'chuloopa' }] }];
  const out = annotateEmbeds(msgs);
  assert.equal(out[0].blocks[1]._embedRender, 'full');
});

test('repeat of the same project across messages is cite', () => {
  const msgs = [
    { role: 'assistant', blocks: [{ type: 'project', id: 'chuloopa' }] },
    { role: 'assistant', blocks: [{ type: 'project', id: 'chuloopa' }] },
  ];
  const out = annotateEmbeds(msgs);
  assert.equal(out[0].blocks[0]._embedRender, 'full');
  assert.equal(out[1].blocks[0]._embedRender, 'cite');
});

test('different projects are both full', () => {
  const msgs = [{ role: 'assistant', blocks: [{ type: 'project', id: 'chuloopa' }, { type: 'project', id: 'ascii-drone' }] }];
  const out = annotateEmbeds(msgs);
  assert.equal(out[0].blocks[0]._embedRender, 'full');
  assert.equal(out[0].blocks[1]._embedRender, 'full');
});

test('music dedups on artist-profile even when id is omitted', () => {
  const msgs = [
    { role: 'assistant', blocks: [{ type: 'music', id: 'artist-profile' }] },
    { role: 'assistant', blocks: [{ type: 'music' }] },
  ];
  const out = annotateEmbeds(msgs);
  assert.equal(out[0].blocks[0]._embedRender, 'full');
  assert.equal(out[1].blocks[0]._embedRender, 'cite');
});

test('user messages and non-embed blocks are untouched', () => {
  const msgs = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', blocks: [{ type: 'text', content: 'x' }, { type: 'contact' }, { type: 'chips', items: ['a'] }] },
  ];
  const out = annotateEmbeds(msgs);
  assert.equal(out[0].content, 'hi');
  assert.ok(!('_embedRender' in out[1].blocks[1]));
  assert.ok(!('_embedRender' in out[1].blocks[2]));
});
```

- [ ] **Step 2: Extend the test glob in `package.json`**

Find:
```json
    "test": "node --test api/lib/*.test.js"
```
Replace with:
```json
    "test": "node --test api/lib/*.test.js src/components/chat/embeds/*.test.js"
```

- [ ] **Step 3: Run to confirm it fails**

Run: `npm test`
Expected: FAIL with "Cannot find module './annotateEmbeds.js'".

- [ ] **Step 4: Create `src/components/chat/embeds/annotateEmbeds.js`**

```js
const DEDUP_TYPES = new Set(['project', 'work', 'music']);

function embedKey(block) {
  return `${block.type}:${block.id || 'artist-profile'}`;
}

// Walk messages in order; the first time a project/work/music entity appears it renders
// 'full', every later mention of the same entity renders 'cite'. Pure — no React, no JSON.
export function annotateEmbeds(messages) {
  const seen = new Set();
  return messages.map(msg => {
    if (!msg.blocks) return msg;
    const blocks = msg.blocks.map(block => {
      if (!DEDUP_TYPES.has(block.type)) return block;
      const key = embedKey(block);
      const render = seen.has(key) ? 'cite' : 'full';
      seen.add(key);
      return { ...block, _embedRender: render };
    });
    return { ...msg, blocks };
  });
}
```

- [ ] **Step 5: Run to confirm pass**

Run: `npm test`
Expected: all pass, including the 5 new `annotateEmbeds` tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/embeds/annotateEmbeds.js src/components/chat/embeds/annotateEmbeds.test.js package.json
git commit -m "feat: add annotateEmbeds — first-full, then-cite dedup logic"
```

---

## Task 4: CitationChip component

**Files:**
- Create: `src/components/chat/embeds/CitationChip.jsx`
- Create: `src/components/chat/embeds/CitationChip.css`

- [ ] **Step 1: Create `src/components/chat/embeds/CitationChip.jsx`**

```jsx
import portfolioData from '../../../data/portfolio.json';
import './CitationChip.css';

const WORK_TITLES = {
  'nuts-and-bolts-ai': 'Nuts and Bolts AI',
  'stratpoint': 'Stratpoint Technologies',
};
const GLYPHS = { project: '◆', work: '■', music: '♪' };

function resolveTitle(type, id) {
  if (type === 'project') return portfolioData.projects.find(p => p.id === id)?.title ?? id;
  if (type === 'work') return WORK_TITLES[id] ?? id;
  if (type === 'music') return 'Paolo Sandejas';
  return id;
}

export default function CitationChip({ type, id, onExpand }) {
  return (
    <button className="citation-chip" onClick={() => onExpand({ type, id })}>
      <span className="citation-glyph">{GLYPHS[type] ?? '◆'}</span>
      <span className="citation-title">{resolveTitle(type, id)}</span>
      <span className="citation-expand">⤢ expand</span>
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/chat/embeds/CitationChip.css`**

```css
.citation-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 4px 0;
  padding: 5px 10px;
  background: var(--paper);
  border: 1.5px solid var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.citation-chip:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink);
}

.citation-glyph { color: var(--c-pink); }

.citation-expand {
  color: var(--ink-mute);
  font-size: 10px;
  font-weight: 400;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/embeds/CitationChip.jsx src/components/chat/embeds/CitationChip.css
git commit -m "feat: add CitationChip — compact repeat-reference chip"
```

---

## Task 5: EmbedModal component

**Files:**
- Create: `src/components/chat/embeds/EmbedModal.jsx`
- Create: `src/components/chat/embeds/EmbedModal.css`

- [ ] **Step 1: Create `src/components/chat/embeds/EmbedModal.jsx`**

```jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import ProjectEmbed from './ProjectEmbed';
import WorkEmbed from './WorkEmbed';
import MusicEmbed from './MusicEmbed';
import './EmbedModal.css';

export default function EmbedModal({ embed, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!embed) return null;

  let card = null;
  if (embed.type === 'project') card = <ProjectEmbed id={embed.id} />;
  else if (embed.type === 'work') card = <WorkEmbed id={embed.id} />;
  else if (embed.type === 'music') card = <MusicEmbed />;

  return createPortal(
    <div className="embed-modal-backdrop" onClick={onClose}>
      <div className="embed-modal" onClick={(e) => e.stopPropagation()}>
        <button className="embed-modal-close" onClick={onClose} aria-label="Close">✕</button>
        {card}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Create `src/components/chat/embeds/EmbedModal.css`**

```css
.embed-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(20, 18, 15, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.embed-modal {
  position: relative;
  width: 100%;
  max-width: 460px;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--paper);
  border: 1.5px solid var(--ink);
  box-shadow: 5px 5px 0 var(--ink);
  padding: 18px;
}

.embed-modal-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  background: var(--paper);
  border: 1.5px solid var(--ink);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.embed-modal-close:hover { background: var(--c-pink); color: var(--paper); }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/embeds/EmbedModal.jsx src/components/chat/embeds/EmbedModal.css
git commit -m "feat: add EmbedModal — portal overlay for expanded cards"
```

---

## Task 6: ContactCard component

**Files:**
- Create: `src/components/chat/embeds/ContactCard.jsx`
- Create: `src/components/chat/embeds/ContactCard.css`

- [ ] **Step 1: Create `src/components/chat/embeds/ContactCard.jsx`**

```jsx
import './ContactCard.css';

const EMAIL = 'pjsandejas@gmail.com';
const DEFAULT_SUBJECT = 'Question from your portfolio';

export default function ContactCard({ subject }) {
  const href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject || DEFAULT_SUBJECT)}`;
  return (
    <a className="contact-card" href={href}>
      <span className="contact-rail" aria-hidden="true"></span>
      <span className="contact-main">
        <span className="contact-left"><span className="contact-glyph">✉</span> ask Paolo directly</span>
        <span className="contact-go">email →</span>
      </span>
    </a>
  );
}
```

- [ ] **Step 2: Create `src/components/chat/embeds/ContactCard.css`**

```css
.contact-card {
  display: flex;
  margin: 4px 0;
  border: 1.5px solid var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
  background: var(--paper);
  text-decoration: none;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.contact-card:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--ink);
}

.contact-rail {
  flex: 0 0 11px;
  background: var(--c-lemon);
}

.contact-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 11px;
  font-family: var(--font-mono);
}

.contact-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--ink);
}

.contact-glyph { font-size: 14px; }

.contact-go {
  font-size: 10px;
  font-weight: 700;
  border: 1px solid var(--ink);
  padding: 3px 9px;
  background: var(--ink);
  color: var(--paper);
  white-space: nowrap;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/embeds/ContactCard.jsx src/components/chat/embeds/ContactCard.css
git commit -m "feat: add ContactCard — email action card with lemon rail"
```

---

## Task 7: Wire it all into MessageList

**Files:**
- Modify: `src/components/chat/MessageList.jsx`

- [ ] **Step 1: Replace `src/components/chat/MessageList.jsx` entirely**

```jsx
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ProjectEmbed from './embeds/ProjectEmbed';
import WorkEmbed from './embeds/WorkEmbed';
import MusicEmbed from './embeds/MusicEmbed';
import CitationChip from './embeds/CitationChip';
import ContactCard from './embeds/ContactCard';
import EmbedModal from './embeds/EmbedModal';
import { annotateEmbeds } from './embeds/annotateEmbeds';
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

function renderCard(block, i, onExpand) {
  if (block._embedRender === 'cite') {
    return <CitationChip key={i} type={block.type} id={block.id} onExpand={onExpand} />;
  }
  if (block.type === 'project') return <ProjectEmbed key={i} id={block.id} />;
  if (block.type === 'work')    return <WorkEmbed key={i} id={block.id} />;
  if (block.type === 'music')   return <MusicEmbed key={i} />;
  return null;
}

function AssistantBlocks({ blocks = [], isStreaming = false, onPick, onExpand }) {
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
          if (block.type === 'chips')   return <InlineChips key={i} items={block.items} onPick={onPick} />;
          if (block.type === 'contact') return <ContactCard key={i} subject={block.content} />;
          if (block.type === 'project' || block.type === 'work' || block.type === 'music') {
            return renderCard(block, i, onExpand);
          }
          return null;
        })}
      </div>
    </>
  );
}

export default function MessageList({ messages, isLoading, onPick }) {
  const endRef = useRef(null);
  const [openEmbed, setOpenEmbed] = useState(null);
  const annotated = annotateEmbeds(messages);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading]);

  return (
    <div className="msgs">
      {annotated.map((m, i) => {
        const isLastMsg = i === annotated.length - 1;
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
                    onExpand={setOpenEmbed}
                  />}
            </div>
          </div>
        );
      })}
      <div ref={endRef}></div>
      <EmbedModal embed={openEmbed} onClose={() => setOpenEmbed(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Run unit tests (ensure nothing regressed)**

Run: `npm test`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/MessageList.jsx
git commit -m "feat: MessageList renders citation chips, contact card, and expand modal"
```

---

## Task 8: Build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Production build without a key (proves the build is green for Vercel)**

Run: `env -u GOOGLE_API_KEY npm run build`
Expected: `[ingest] GOOGLE_API_KEY not set — skipping embedding…` then `vite build` completes with no errors. (Confirms all new imports resolve and CSS tokens exist.)

- [ ] **Step 2: Local end-to-end check (requires the key)**

In a terminal you control:
```bash
GOOGLE_API_KEY=<your-key> npm run ingest   # re-embeds, now including goals.md
npm run dev
```
Open the chat and verify:
1. **Label:** ask "tell me about the music side" — the text contains no present-tense "signed to Universal Records Philippines", and it doesn't contradict the music card (which says Independent / Symphonic Distribution).
2. **Persona:** answers talk about "Paolo" / "he", never "I built…". The assistant's "I" only refers to itself.
3. **Joke:** ask "tell me a joke" — playful, energy-matched, no card, and no "in my context".
4. **Next role:** ask "what is Paolo looking for in his next role?" — a real, grounded answer **plus** the lemon-rail contact card; clicking it opens a pre-filled email draft to pjsandejas@gmail.com.
5. **Citation + modal:** ask two CHULOOPA questions in a row — the first shows the full project card, the second shows a compact `◆ CHULOOPA ⤢ expand` chip; clicking it opens the full card in a modal that closes via ✕, backdrop, or Esc.

- [ ] **Step 3: Commit (only if any fixes were needed during verification)**

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```

---

## Task 9: Deploy to production

**Files:** none

> This is an outward-facing action. Confirm with Paolo before running it.

- [ ] **Step 1: Deploy the branch to production**

```bash
vercel --prod --yes
```
The Vercel build runs `ingest.mjs` (re-embedding including `goals.md`) using the `GOOGLE_API_KEY` already set in the project env, then builds and promotes.

- [ ] **Step 2: Verify production**

```bash
curl -s -N -X POST https://paolosandejas-portfolio.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"query":"what is Paolo looking for in his next role?","history":[]}' --max-time 45 | head -c 600
```
Expected: a grounded answer in third person, followed by a `{"type":"contact"…}` block in the embeds event.

- [ ] **Step 3: Merge the branch to main**

```bash
git switch main
git merge --ff-only paogpt-personality-cards
git push origin main
```
