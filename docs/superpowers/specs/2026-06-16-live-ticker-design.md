# Live Ticker — Design

**Date:** 2026-06-16
**Status:** Approved design, pending implementation plan

## Problem

The hero ticker (`src/components/Hero.jsx:50-62`) scrolls five hardcoded lines
("now playing", "shipping", "reading", "listening", "building"). They're static —
they don't reflect what Paolo is actually doing. The goal is to feed the ticker
from live signals so it becomes a real-time pulse of current work and life,
matching the "Engineer's Sketchbook" register: tactile, honest, alive.

## Goals

- Ticker lines reflect **real, current activity** across multiple sources.
- **Zero added latency** on page load and **no rate-limit risk** from visitor traffic.
- **Never looks broken** — graceful degradation to last-known-good and ultimately
  to the existing hardcoded lines.
- Voice stays consistent with the current ticker: lowercase, terse,
  `● label : text /`.

## Non-Goals

- Real-time "this exact second" accuracy. A ~30 min refresh is fine for everything
  except local time (computed client-side).
- A general-purpose activity dashboard. This is one scrolling line of text.
- Visitor-facing personalization or interactivity.

## Sources (six feed types)

| Source | Auth | Wave | Label(s) | Notes |
|---|---|---|---|---|
| GitHub activity | none (public events) | 1 | `building` / `shipping` | All public activity for the user. Gemini groups commits per-repo into one thematic line. |
| Vercel deploy | `VERCEL_TOKEN` | 1 | `last shipped` | Most recent production deployment + relative time. |
| Local time / status | none | 1 | `glendale` | **Computed client-side** at render, never cached. |
| Curated | none | 1 | `reading` / `building` / free | Hand-written lines from a repo JSON, edited occasionally. |
| Spotify | OAuth refresh token | 2 | `now playing` | Most recent / currently playing track. |
| Strava | OAuth refresh token | 2 | `ran` / `logged` | Latest activity or weekly mileage. **MCP cannot be used in cron** — needs direct Strava OAuth. |

## Architecture

**One cron job builds a cached feed; the page reads it.**

```
Vercel Cron (every 30 min)  →  api/ticker-refresh.js
  ├─ GitHub   /users/{user}/events/public      (public)
  ├─ Vercel   deployments API                  (VERCEL_TOKEN)
  ├─ Spotify  recently-played / now-playing    (wave 2)
  ├─ Strava   latest activity                  (wave 2)
  ├─ Curated  read api/_data/ticker-curated.json
  └─ Gemini   group+summarize git/deploy noise into voice
        ↓
   normalize → dedupe → cap length → write ticker.json to Vercel Blob (public)

Visitor → Hero mounts → fetch <blob public url> (CDN-cached)
        → prepend client-computed "glendale : <time> · <status>" line
        → render scrolling ticker
        → on fetch error → render existing hardcoded fallback lines
```

### Why this shape

- **Cron + cache** (chosen over build-time or per-visitor fetch): build-time goes
  stale until the next deploy; per-visitor exposes secrets and burns rate limits.
  Cron refreshes ~48×/day regardless of traffic.
- **Vercel Blob** as the cache: cron writes one small public JSON; the page fetches
  it directly from the CDN with **zero read-side function invocations**. Simpler and
  cheaper than a `/api/ticker` read endpoint, and we already deploy on Vercel.
- **Time computed client-side**, so it's accurate even though the rest is 30 min old.

## Components

All backend modules live in `api/_lib/ticker/` and are pure/independently testable.
Each source module exports `async fetchLines(env): Promise<Line[]>` and **must not
throw** — on any error it logs and returns `[]` (or last-known is handled by the
orchestrator, see Error Handling).

| Module | Responsibility | Depends on |
|---|---|---|
| `api/_lib/ticker/github.js` | Fetch public events, group raw commit messages by repo. | `fetch`, `GITHUB_TOKEN?` |
| `api/_lib/ticker/vercel.js` | Fetch latest prod deployment + relative time. | `fetch`, `VERCEL_TOKEN` |
| `api/_lib/ticker/spotify.js` *(wave 2)* | Refresh token → recently-played/now-playing. | `fetch`, Spotify env |
| `api/_lib/ticker/strava.js` *(wave 2)* | Refresh token → latest activity. | `fetch`, Strava env |
| `api/_lib/ticker/curated.js` | Read `api/_data/ticker-curated.json`. | fs/import |
| `api/_lib/ticker/summarize.js` | Gemini: group commits/deploys → ticker lines. | `@google/genai` (`GOOGLE_API_KEY`), `withRetry` |
| `api/_lib/ticker/build-feed.js` | Orchestrate: call sources, summarize, normalize, dedupe, cap. | all the above |
| `api/_lib/ticker/blob.js` | Read/write `ticker.json` in Vercel Blob. | `@vercel/blob` |
| `api/ticker-refresh.js` | Cron entry point: `build-feed` → write blob. | `build-feed`, `blob` |
| `src/hooks/useTicker.js` | Fetch blob, inject client time, expose `{ lines, status }`. | `fetch` |
| `src/components/Hero.jsx` (edit) | Replace hardcoded spans with `useTicker()` output + fallback. | `useTicker` |

Reuse existing `api/_lib/retry.js` (`withRetry`) and the `GoogleGenAI` init pattern
from `api/_lib/rag.js`. The existing `api/_lib/github-fetcher.js` is for raw file
content (ingest) — the ticker needs the **events** API, so a new `ticker/github.js`
is correct rather than overloading the existing fetcher.

## Data model

`ticker.json` (in Blob):

```json
{
  "generatedAt": "2026-06-16T09:00:00Z",
  "lines": [
    { "id": "gh:portfolio-site", "label": "building", "text": "rebuilding my own portfolio, live", "source": "github" },
    { "id": "vercel:last", "label": "last shipped", "text": "3h ago · portfolio v2.4", "source": "vercel" },
    { "id": "curated:reading", "label": "reading", "text": "\"the art of doing science and engineering\"", "source": "curated" }
  ]
}
```

`Line` shape (shared by source modules): `{ id, label, text, source }`.
Rendered as `● {label} : {text} /`. The client prepends a computed
`{ label: "glendale", text: "<time> · <status>" }` line before render.

`api/_data/ticker-curated.json`: `[{ "label": "reading", "text": "..." }, ...]`.

## Gemini's role (group + summarize)

- **Input:** raw commit messages grouped by repo (e.g. 5 commits on `portfolio-site`).
- **Output:** ONE thematic line per repo in ticker voice — lowercase, terse, truthful
  to the commits, no fabrication. Example: 5 portfolio commits →
  `● building : rebuilding my own portfolio, live /`.
- **Constraints:** hard char cap (~60), lowercase, no trailing punctuation, no emoji,
  no hallucinated facts. Use structured output (`Type` schema, as in `rag.js`) to get
  back `{ repo, label, text }[]`.
- **Failure:** if Gemini errors, fall back to a deterministic non-LLM summary
  ("N commits on {repo}") so the line still appears.

## Error handling & degradation

Three layers, so the ticker never looks broken:

1. **Per-source isolation:** each source module catches its own errors and returns
   `[]`. One dead API never blocks the others.
2. **Last-known-good in cron:** `build-feed` merges fresh results with the previous
   `ticker.json`; a source that returns `[]` this run keeps its prior lines (stamped
   with age) rather than vanishing. If the *whole* build fails, the cron leaves the
   existing blob untouched.
3. **Client fallback:** if `useTicker` can't fetch the blob (or it's empty), it
   renders the current hardcoded lines from `Hero.jsx`. These move into a
   `TICKER_FALLBACK` constant so they're shared, not deleted.

Minimum bar: a fresh deploy with no blob yet, or total outage, still shows a sensible
scrolling ticker.

## Environment variables

Wave 1: `GOOGLE_API_KEY` (exists), `GITHUB_TOKEN` (exists, optional — raises rate
limit), `VERCEL_TOKEN` (new), `BLOB_READ_WRITE_TOKEN` (auto-added when a Blob store is
created), `TICKER_BLOB_URL` (public read URL, exposed to the frontend via Vite as
`VITE_TICKER_URL`).

Wave 2: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`,
`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`. Each requires a
one-time OAuth dance (documented as a `_scripts/` helper or README steps).

## Cron configuration

Add to `vercel.json`:

```json
"crons": [{ "path": "/api/ticker-refresh", "schedule": "*/30 * * * *" }]
```

Add `api/ticker-refresh.js` to `functions` with a modest `maxDuration` (e.g. 30s).
Protect the endpoint so only Vercel Cron can trigger a rebuild (check
`Authorization: Bearer ${CRON_SECRET}` per Vercel's cron-security convention).

## Testing

Follow the existing `node --test` setup (`api/_lib/*.test.js`). Pure modules with
injected `fetch`/clients:

- `github.js`: groups multiple commits per repo; ignores non-push events; empty on error.
- `summarize.js`: respects char cap + lowercase; deterministic fallback when Gemini errors.
- `build-feed.js`: per-source isolation (one throwing source doesn't kill the feed);
  last-known-good merge; dedupe by `id`; length cap.
- `vercel.js` / `spotify.js` / `strava.js`: parse fixtures into `Line[]`; empty on error.
- `useTicker` (frontend, `src/.../*.test.js`): injects client time line; falls back to
  `TICKER_FALLBACK` on fetch failure.

Manual verification: run cron handler locally against real APIs, inspect written blob,
load the page, confirm live lines + client time + fallback (by blocking the blob fetch).

## Phasing

- **Wave 1 — pipeline + low/no-auth sources:** `_lib/ticker/*` scaffold, `build-feed`,
  Blob read/write, `ticker-refresh.js` cron, `useTicker`, Hero wiring + fallback, and
  the GitHub / Vercel-deploy / client-time / curated sources. Fully live and shippable.
- **Wave 2 — OAuth sources:** add `spotify.js` + `strava.js` and their one-time token
  setup, drop them into `build-feed`.

Each wave is independently shippable; Wave 1 stands alone if Wave 2 is deferred.

## Open questions / future

- Exact refresh cadence (30 min assumed; could tune per cost).
- Whether to weight/shuffle line order so the ticker varies between loads.
- Strava "latest activity" vs "weekly mileage" framing — decide during Wave 2.
