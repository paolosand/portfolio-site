# Chat API — JavaScript Port Design

**Date:** 2026-05-25  
**Status:** Approved

## Problem

The existing chat API is a Python FastAPI serverless function on Vercel. Two issues block local development:

1. `vercel dev` does not execute Python functions when the project uses a Vite `buildCommand` — it only runs the Vite dev server, returning 404 for all `/api/*` routes.
2. The previous fix (removing Mangum) resolves the production crash but does not fix local dev.

## Solution

Port the chat API from Python to JavaScript/Node.js. Vercel's runtime handles Node.js functions natively alongside `vercel dev`, enabling single-command local development with no separate server.

## File Structure

```
api/
  chat.js              ← Vercel Node.js handler (request validation + routing)
  lib/
    guard.js           ← regex guard: injection detection + response filtering
    rag.js             ← knowledge loading + Gemini generate call
    personality.js     ← system prompt string + witty rejection list
  knowledge/           ← unchanged markdown files
    education.md
    experience.md
    projects.md
    skills.md
```

## Components

### `api/chat.js` — Handler

Vercel Node.js functions export a default `async (req, res)` — no framework or adapter needed.

Flow:
1. Reject non-POST requests with 405
2. Parse JSON body; validate `query` (string, 1–2000 chars) and `history` (array)
3. Call `guard.check(query)` — if malicious, return `{ response, blocked: true }` with 200
4. Call `rag.retrieve()` to get knowledge context
5. Call `rag.generate(query, context, history)` to get Gemini response
6. Call `guard.filterResponse(text)` to redact sensitive patterns
7. Return `{ response: filteredText, blocked: false }`

All errors return `{ error: "message" }` with appropriate status (400, 405, 500).

### `api/lib/guard.js` — Guard Chain

Port of `api/agents/guard_chain.py`.

Exports:
- `check(message)` → `{ isMalicious, reason, response }` — picks a random witty rejection from `personality.js` when blocked
- `filterResponse(text)` → string with phone numbers and SSNs redacted

Contains:
- 16 `PROMPT_INJECTION_PATTERNS` (JS regex literals, same patterns as Python)
- 8 `SENSITIVE_INFO_PATTERNS` for response filtering

### `api/lib/personality.js` — Persona Constants

Port of `api/agents/personality.py`.

Exports:
- `SYSTEM_PROMPT` — full Paolo persona (casual tone, technically sharp, cites sources, anti-hallucination rules, date handling guidelines)
- `WITTY_REJECTIONS` — `["bruh... nice try 😏", "bruh... no", "bruh... that's not what I'm here for", "bruh... you know that's not happening", "bruh... nah"]`

### `api/lib/rag.js` — Knowledge + Generation

Port of `api/agents/rag_chain.py` + `api/services/knowledge_loader.py` + `api/services/llm.py`.

**Knowledge loading:** Reads all `.md` files from `api/knowledge/` at module load time using `fs.readFileSync` with `__dirname`-relative paths. Returns array of `{ content, metadata: { source } }`.

**Generation:** Uses `@google/genai` JavaScript SDK. Constructs prompt: system prompt + all context chunks + last 5 history messages + current query. Calls `model.generateContent()`.

Config:
- Model: `gemini-2.5-flash`
- Temperature: 0.7
- Max output tokens: 1024
- API key: `process.env.GOOGLE_API_KEY`

## Dependencies

| Change | Detail |
|--------|--------|
| Add | `@google/genai` to `package.json` |
| Remove | Python runtime entirely |

## Config Changes

**`vercel.json`** — update function key:
```json
{
  "functions": {
    "api/chat.js": { "maxDuration": 30 }
  }
}
```

**`vite.config.js`** — remove proxy block. `vercel dev` routes `/api/*` to the Node.js function natively; the proxy is no longer needed and would conflict.

## Deletions

| Path | Reason |
|------|--------|
| `api/chat.py` | Replaced by `api/chat.js` |
| `api/agents/` | Ported to `api/lib/` |
| `api/services/` | Merged into `api/lib/rag.js` |
| `requirements.txt` | No Python dependencies |
| `pyproject.toml` | No Python runtime |
| `uv.lock` | No Python runtime |
| `.python-version` | No Python runtime |

## Local Development After Port

```bash
vercel dev
```

Single command. Vercel starts the Vite dev server and serves `api/chat.js` as a Node.js function on the same port. No proxy, no separate Python server.

## Out of Scope

- Changes to `api/knowledge/` content
- Frontend code (`src/`)
- CI/CD pipeline
- Streaming responses
