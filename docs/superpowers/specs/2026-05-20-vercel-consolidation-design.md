# Design: Consolidate to Single Vercel Deployment

**Date:** 2026-05-20
**Status:** Approved

## Problem

The portfolio chat is inconsistently available because of a three-system architecture:
- Fly.io backend with `auto_stop_machines = suspend` causes cold-start failures on first visit
- Supabase PostgreSQL adds a DB dependency that crashes the whole chat if unavailable
- Local dev requires a Python venv that isn't set up, making backend development painful
- Two separate deployments (Vercel + Fly.io) to manage for a portfolio site

## Goal

One Vercel deployment. Chat works reliably. Local dev is one command. No database.

## Architecture

```
Before:
  Vercel (React) + Fly.io (FastAPI) + Supabase (PostgreSQL)

After:
  Vercel
    ├── React frontend (built by Vite → dist/)
    └── api/chat.py (Python serverless function)
        └── reads knowledge/ markdown files at function load time
```

Frontend and backend are same-origin. No CORS needed. No cold starts. No DB.

## File Structure

```
portfolio-site/
├── api/
│   ├── chat.py              # Vercel Python serverless function entry point
│   ├── agents/
│   │   ├── guard_chain.py   # moved from backend/app/agents/chains/
│   │   ├── rag_chain.py     # moved from backend/app/agents/chains/
│   │   └── personality.py   # moved from backend/app/agents/chains/
│   ├── services/
│   │   └── llm.py           # moved from backend/app/services/
│   └── knowledge/           # moved from backend/data/knowledge_base/
│       ├── education.md
│       ├── experience.md
│       ├── projects.md
│       └── skills.md
├── src/                     # unchanged except api.js and useChat.js
├── requirements.txt         # trimmed Python deps (root level for Vercel)
├── vercel.json              # routes /api/* to Python function
├── package.json
└── vite.config.js
```

The `backend/` directory is deleted entirely.

## Backend Changes

### `api/chat.py`
FastAPI app with a single `POST /api/chat` route. Vercel detects FastAPI and wraps it as a serverless function.

Request body:
```json
{
  "query": "string",
  "history": [{"role": "user|assistant", "content": "string"}]
}
```

Response body:
```json
{
  "response": "string",
  "blocked": false
}
```

- No `conversation_id` — history is owned by the frontend
- No DB dependency — no `get_db_dependency`, no `ConversationRepository`
- No rate limiting — removed (acceptable for portfolio)
- Guard chain and RAG chain imported directly, logic unchanged

### `api/agents/rag_chain.py`
Unchanged except:
- Import paths updated (`from api.services.llm` → relative imports)
- `load_all_knowledge()` reads from `api/knowledge/` (path updated)

### `api/agents/guard_chain.py`
Unchanged — pure regex logic, no dependencies to update.

### `api/services/llm.py`
Unchanged — just wraps `ChatGoogleGenerativeAI`.

### Removed entirely
- `backend/app/database/` — all DB models, migrations, repositories
- `backend/app/api/` — FastAPI router (replaced by `api/chat.py`)
- `backend/app/config.py` — replaced by reading `os.environ` directly in `api/chat.py`
- ChromaDB, slowapi, sqlalchemy, psycopg2, alembic, uvicorn deps

### `requirements.txt` (root, trimmed)
```
fastapi
mangum           # ASGI adapter for Vercel/AWS Lambda
langchain
langchain-google-genai
google-generativeai
pydantic
```

### `vercel.json`
Vercel auto-routes `api/chat.py` → `/api/chat` with no config needed. We need `vercel.json` only for the SPA fallback (so React client-side routing works on direct URL access):

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

## Frontend Changes

### `src/services/api.js`
- `API_URL` changes from `import.meta.env.VITE_API_URL || 'http://localhost:8000'` to `''` (empty string, same-origin)
- Request body gains `history` field: last 5 messages from current session
- Remove `conversation_id` from request/response handling
- Better error messages: distinguish network errors from server errors

### `src/hooks/useChat.js`
- Pass `messages.slice(-5)` as `history` with each request
- Remove `conversationId` state entirely
- Error message improvement: show "Chat is unavailable — try again in a moment" for network errors, server message for 4xx/5xx

## Local Dev

```bash
vercel dev
```

Single command runs both Vite (frontend) and the Python function. Requires `vercel` CLI and `GOOGLE_API_KEY` set in Vercel project env vars (pulled automatically by `vercel dev`).

No venv management. No separate backend process. No `.env` file with DB credentials.

## Deployment

Push to `main` → GitHub Action triggers → `vercel deploy --prod`. Same as current frontend deploy. The GitHub Action for Fly.io is deleted.

## What's Not Changing

- All LangChain + Gemini logic (guard chain, RAG chain, personality prompt)
- Knowledge base markdown files (content unchanged, just moved)
- React components, CSS, animations
- Vercel project configuration (env vars, domain)

## Risks

- **Vercel function timeout (10s hobby plan)**: Gemini responses for portfolio questions are typically 2-5s. Acceptable. If slow queries become an issue, stream the response.
- **No conversation persistence**: Users lose chat history on refresh. Acceptable for a portfolio showcase — the point is the interaction, not the history.
- **Rate limiting removed**: Acceptable for a personal portfolio with low traffic.
