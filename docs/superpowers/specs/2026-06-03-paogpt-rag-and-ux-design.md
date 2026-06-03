# pao-gpt — RAG Knowledge Base + UX Redesign

**Date:** 2026-06-03
**Scope:** Approach B (vector RAG + knowledge depth) + UI/UX bucket improvements. Approach C (live ReAct agent) is the next phase, built on top of this.

---

## Problem Statement

pao-gpt currently gives generic, hollow responses. Two root causes:

1. **Backend:** All 5 knowledge markdown files are dumped as a single context block on every request, regardless of relevance. The system prompt instructs the AI to say "from my context" when referencing details. No code-level knowledge exists — the AI can describe CHULOOPA but cannot reference actual variables, logic, or architecture.

2. **UI/UX:** The welcome screen is a static authored page; prompt chips disappear after the first message; known design system violations (mobile ASCII banner, bounce easing, border-left bubble stripe, pink shadow on send button); no music embed type; project embed ID mismatch (`geospatial-ml` vs `climate-ml`).

---

## Architecture Overview

### Indexing Pipeline (runs at deploy time / on demand)

```
Sources → Chunker → Embedder → ChromaDB
```

**Sources (4 inputs):**

| Source | Path | Purpose |
|--------|------|---------|
| `portfolio.json` | `src/data/portfolio.json` | Site source of truth — projects, IDs, links, dates. Ensures AI knows exactly what the site displays. Fixes geospatial-ml/climate-ml mismatch automatically. |
| Knowledge markdown | `api/knowledge/*.md` | Narrative layer — experience depth, music career, personality context. Rewritten to remove citation patterns. |
| GitHub repos | `github.com/paolosand/*` | Public repos only: CHULOOPA, Violence-Detector-with-Aggressor-Identification, ascii_drone. Key files fetched at index time via GitHub API. |
| System metadata | generated | Valid embed IDs derived from `portfolio.json` at index time, injected into system prompt dynamically. |

**Chunking strategy:**
- Markdown files: split by `##` section headers, ~400 tokens/chunk
- `portfolio.json`: one chunk per entity (project, experience entry, education entry)
- GitHub repo files: one chunk per file (README, core code files); skip test files, lock files, binaries
- Metadata attached to every chunk: `{ source, type, entity_id, file_path, repo }`

**Embedding model:** `text-embedding-004` (Gemini, 768-dim) — consistent with the existing Gemini SDK already in use.

**Vector store:** ChromaDB, collection name `portfolio`. Already initialized at `backend/data/chroma/`.

**Indexer script:** `api/scripts/ingest.mjs` — Node.js, runs as a standalone script. Called as a Vercel build step or manually via `npm run ingest`.

### GitHub Repo Scope

| Repo | Files to index |
|------|---------------|
| CHULOOPA | `README.md`, `chuloopa_main.ck`, `spice_detector.ck`, Python variation generator (`*.py`) |
| Violence-Detector | `README.md`, core detection scripts |
| ascii_drone | `README.md`, main JS entry point |

GitHub API: unauthenticated (60 req/hr) is sufficient for 3 small repos at deploy time. Add `GITHUB_TOKEN` env var for higher limits if needed.

### Query Flow (per request)

1. Embed the user query via `text-embedding-004`
2. ChromaDB similarity search → top 6 chunks, ranked by cosine similarity
3. Format context: each chunk prefixed with its metadata (`[source · type]`)
4. Inject as `--- CONTEXT ---` block into the prompt (replaces current full-file dump)
5. Send to Gemini 2.5 Flash with updated system prompt

**Fallback:** If ChromaDB is unavailable (cold start, deploy gap), fall back to the existing `loadKnowledge()` full-file context. Log the fallback.

---

## System Prompt Rewrite

### What changes

**Remove:**
- `"Cite the source section when you reference specific details (e.g., 'from my experience section...')"` — this is the direct cause of generic "from my context" phrasing. Deleted entirely.
- Hardcoded valid project/work ID lists — replaced with dynamically injected lists derived from `portfolio.json` at startup.

**Add:**
- Instruction to reference specific code details (variable names, function names, architecture) when code chunks appear in context. Don't summarize — be specific.
- 3 high-quality few-shot examples replacing the single generic one:
  - Technical deep-dive (CHULOOPA spice system — references actual code)
  - Music career question (artist background — triggers music embed)
  - Cross-domain question (how musician background informs engineering approach)
- Explicit voice note: speak as Paolo, not as a document reader. Don't meta-comment on the source of your knowledge.
- `music` as a valid embed type with ID `artist-profile`.

### Valid embed IDs (dynamically injected)

Derived from `portfolio.json` at startup:
- Projects: `chuloopa`, `ascii-drone`, `climate-ml`, `hai`, `parallel-paths`, `video-analysis`
- Work: `nuts-and-bolts-ai`, `stratpoint`
- Music: `artist-profile`

---

## UI/UX Changes

### Welcome paradigm → Proactive AI Greeting

Replace the static `WelcomeScreen` component with an AI-initiated first message. On mount, `ChatInterface` fires one API call to `/api/chat` with a fixed hardcoded query: `"__greeting"`. The backend detects this sentinel and responds with a short self-introduction in Paolo's voice (under 3 sentences), without performing a RAG lookup.

The response populates the first assistant message in the normal `MessageList`. No special rendering — it's a regular assistant message.

**No static welcome screen component.** The ASCII banner, lead paragraph, and contact card are all removed. The header bar (`pao-gpt · ↺ restart`) provides the only persistent chrome.

### Persistent Prompt Chips

Two distinct things — don't confuse them:

1. **Greeting inline chips** — rendered as part of the first AI message content. The greeting API response includes a `chips` block: `{ "type": "chips", "items": ["CHULOOPA", "production AI work", "music + code", "what's next"] }`. `MessageList` renders these as clickable pills inline below the greeting text. These appear once and then are replaced by conversation content.

2. **Persistent `<ChipBar>`** — a separate component anchored between the message list and the chat input. Rendered unconditionally once `messages.length > 0`. Always shows the same 4 default chips. Clicking fires the chip text as a user message via `onPick`. Props: `chips: string[]`, `onPick: (text) => void`.

The chip text is identical in both: the greeting inline chips are the first introduction to them; `<ChipBar>` keeps them accessible for the rest of the conversation.

### Music Embed Card

New component: `MusicEmbed` (`src/components/chat/embeds/MusicEmbed.jsx`).

**Layout (top to bottom):**
1. Dark header bar: `♪` glyph (lemon), artist name, label/genre sub, `★ recording artist` badge
2. 2-stat grid: streams (28.1M+) · followers (127K+)
3. Discography rows: title, type label, year — hardcoded in the component from `music.md` (streams, followers, discography, links). No new `portfolio.json` section needed.
4. Streaming links: ↗ Spotify · ↗ Apple Music · ↗ SoundCloud

Trigger: `{ "type": "music", "id": "artist-profile" }` block in the API response. Same embed rules: at most one card per response, flanked by text blocks.

### Design System Fixes

| Issue | Fix |
|-------|-----|
| Mobile ASCII banner overflows at <880px | `display: none` on `.welcome-banner` in `@media (max-width: 880px)` — removed from new design entirely |
| h1 star orphans on mobile | Moot — welcome screen removed |
| Typing indicator bounce easing | Replace `ease-in-out` with `cubic-bezier(0.22, 1, 0.36, 1)` in `index.css` |
| Message bubble border-left stripe | Implement DESIGN.md spec: user bubbles get ink bg / paper text; assistant bubbles get paper-2 bg / ink border / ink shadow |
| Send button shadow pink | `box-shadow: 3px 3px 0 var(--ink)` |
| Project embed ID mismatch | `geospatial-ml` → `climate-ml` in `personality.js` (short-term); long-term: IDs derived from `portfolio.json` at runtime |
| Last.fm stat | Removed from `music.md` (done). Not included in music embed card. |

---

## Data Consistency Model

`portfolio.json` is the single source of truth for:
- Project IDs, titles, descriptions, tags, links
- Experience entries and bullets
- Education entries
- Skills

`api/knowledge/*.md` provides the **narrative layer** on top of `portfolio.json` — deeper context, voice, personality, specifics not in the structured JSON. The two should not duplicate — the markdown files should extend, not restate.

At index time, both are ingested. The vector store is the union. If `portfolio.json` and a markdown file contradict on a fact (e.g., a date), `portfolio.json` wins — it's what the site displays.

---

## File Changes Summary

### New files
- `api/scripts/ingest.mjs` — indexer script
- `api/lib/embeddings.js` — wrapper for `text-embedding-004`
- `api/lib/retrieval.js` — ChromaDB query wrapper
- `src/components/chat/embeds/MusicEmbed.jsx`
- `src/components/chat/ChipBar.jsx`

### Modified files
- `api/lib/rag.js` — replace `loadKnowledge()` full-dump with vector retrieval
- `api/lib/personality.js` — system prompt rewrite; dynamic ID injection
- `api/chat.js` — pass embed ID lists from `portfolio.json` into `generate()`
- `src/components/chat/ChatInterface.jsx` — proactive greeting on mount; add `<ChipBar>`; remove `<WelcomeScreen>`
- `src/components/chat/MessageList.jsx` — render `MusicEmbed` for `type === 'music'`
- `api/knowledge/music.md` — Last.fm line removed (done)
- `package.json` — add `ingest` script; add `@google/genai` embedding dependency if not present

### Deleted files
- `src/components/chat/WelcomeScreen.jsx` — replaced by proactive greeting
- `src/components/chat/WelcomeScreen.css`

---

## Approach C — ReAct Agent (next phase)

This design is Phase 1. Phase 2 converts `generate()` into a ReAct agent with tools:
- `search_knowledge_base(query)` — queries ChromaDB (built in Phase 1)
- `get_github_file(repo, path)` — fetches a file from a public repo on demand
- `search_github_code(repo, query)` — searches code via GitHub search API

Phase 1 (this spec) is a prerequisite: the vector store and embedding infrastructure built here become the `search_knowledge_base` tool in Phase 2. Phase 2 adds the agent loop, tool definitions, and live GitHub calls on top.

---

## Out of Scope

- Auth / rate limiting changes (existing SlowAPI guard unchanged)
- Real LLM streaming (token-by-token from Gemini) — deferred to Phase 2
- Analytics / conversation logging changes
- Any changes to the portfolio page sections (Hero, Projects, Experience, etc.)
