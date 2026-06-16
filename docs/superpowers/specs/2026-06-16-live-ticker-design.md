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
| Strava | OAuth refresh token | 2 | `ran` / `logged` | Latest activity or weekly mileage. **MCP can't be used server-side** (interactive auth) — needs direct Strava OAuth. |

## Architecture

**Refresh-on-read (stale-while-revalidate).** This project is on the Vercel **Hobby**
plan, where cron jobs are capped at **once per day** (a `*/30` expression fails at
deploy time). So instead of a cron driving refreshes, a thin read endpoint serves the
cached feed instantly and triggers a background rebuild only when the cache is stale
*and* a visitor actually arrives.

```
Visitor → Hero mounts → GET /api/ticker                 (CDN-cached, s-maxage≈300s)
   api/ticker.js:
     read ticker.json from Blob
     ├─ missing      → return fallback lines + waitUntil(build)   (first ever load)
     ├─ fresh        → return cached lines
     └─ stale (>TTL) → claim refresh slot, return cached lines now,
                        waitUntil(build-feed → write blob)        ← background, non-blocking
        ↓ (background)
   build-feed.js:
     fetch cheap "head" signals → fingerprint → compare to cached
       ├─ unchanged → bump generatedAt only, skip Gemini + skip rewrite   (near-zero cost)
       └─ changed   → fetch full data for changed sources only:
              GitHub  /users/{user}/events/public   (public)
              Vercel  deployments API               (VERCEL_TOKEN)
              Spotify recently-played/now-playing   (wave 2)
              Strava  latest activity               (wave 2)
              Curated api/_data/ticker-curated.json
              Gemini  group+summarize git/deploy (only changed repos)
            → normalize → dedupe → cap → write ticker.json to Blob

Client: prepend computed "glendale : <time> · <status>" line → render scroll
        on fetch error / empty → render existing hardcoded fallback lines
```

A **once-daily cron** (the one cadence Hobby allows) is added as an optional safety
floor so the feed still refreshes even in a day with zero visitor traffic. Same
`build-feed` entry point.

### Why this shape

- **Refresh-on-read over cron** (forced by Hobby): the read endpoint sets a modest
  `Cache-Control: s-maxage=300, stale-while-revalidate=...`, so most reads are served
  straight from Vercel's CDN with no function invocation, and only ~once per 5 min does
  a real invocation happen to check staleness. Cost scales with the cache window, not
  with traffic. A rebuild is **backgrounded via `waitUntil`**, so the visitor never
  waits for it.
- **Build-time generation rejected:** stale until the next deploy. **Per-visitor live
  fetch rejected:** exposes secrets + burns rate limits on every load. Refresh-on-read
  gives near-live freshness at near-zero cost.
- **Vercel Blob** as the cache: `build-feed` writes one small JSON; `/api/ticker` reads
  it. (We can't read the Blob URL directly from the browser anymore because the read
  path needs to run the staleness/rebuild logic — that's the cost of the Hobby model.)
- **Time computed client-side**, so it's accurate even when the rest is ~30 min old.
- **Change-detection** (see below) makes the steady state nearly free: a rebuild with
  no new activity is a few cheap GETs and an early return — no Gemini call, no rewrite.

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
| `api/_lib/ticker/fingerprint.js` | Build a fingerprint from cheap "head" signals; diff against cached. | source modules' head calls |
| `api/_lib/ticker/build-feed.js` | Orchestrate: fingerprint check → (skip or) call sources, summarize, normalize, dedupe, cap. | all the above |
| `api/_lib/ticker/blob.js` | Read/write `ticker.json` in Vercel Blob; claim refresh slot. | `@vercel/blob` |
| `api/ticker.js` | **Read endpoint.** Serve cached feed; on stale, `waitUntil(build-feed)`. Sets `Cache-Control`. | `build-feed`, `blob`, `waitUntil` |
| `src/hooks/useTicker.js` | Fetch `/api/ticker`, inject client time, expose `{ lines, status }`. | `fetch` |
| `src/components/Hero.jsx` (edit) | Replace hardcoded spans with `useTicker()` output + fallback. | `useTicker` |

A once-daily cron (optional safety floor) reuses `build-feed` via the same
`api/ticker.js` handler triggered by Vercel Cron, or a tiny `api/ticker-cron.js`
wrapper — decided during planning.

Reuse existing `api/_lib/retry.js` (`withRetry`) and the `GoogleGenAI` init pattern
from `api/_lib/rag.js`. The existing `api/_lib/github-fetcher.js` is for raw file
content (ingest) — the ticker needs the **events** API, so a new `ticker/github.js`
is correct rather than overloading the existing fetcher.

## Data model

`ticker.json` (in Blob):

```json
{
  "generatedAt": "2026-06-16T09:00:00Z",
  "nextRefreshAt": "2026-06-16T09:30:00Z",
  "fingerprint": { "github": "a1b2…", "vercel": "dpl_…", "spotify": "trk_…", "strava": "act_…", "curated": "sha256:…" },
  "lines": [
    { "id": "gh:portfolio-site", "label": "building", "text": "rebuilding my own portfolio, live", "source": "github" },
    { "id": "vercel:last", "label": "last shipped", "text": "3h ago · portfolio v2.4", "source": "vercel" },
    { "id": "curated:reading", "label": "reading", "text": "\"the art of doing science and engineering\"", "source": "curated" }
  ]
}
```

`fingerprint` holds the cheap per-source "head" identifiers from the last build.
`nextRefreshAt = generatedAt + TTL` (TTL ≈ 30 min) drives the stale check and the
refresh-slot claim (see Change-detection and Error handling).

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
- **Cached, never re-run for the same input:** the summarized line for a repo is keyed
  by its set of commit SHAs (see Change-detection). A frequently-changing source like
  Spotify never forces a git re-summarization.

## Change-detection (skip work when nothing changed)

Most refresh windows have no new activity, so the build is gated on a cheap fingerprint
before any expensive work:

1. **Fetch only "head" signals** (cheap, single calls): latest GitHub event/commit
   SHA(s), latest deploy ID, latest Spotify track ID, latest Strava activity ID, and a
   hash of the curated JSON. Assemble into `fingerprint` (per-source).
2. **Compare to the cached `fingerprint`.**
   - **No source changed →** bump `generatedAt`/`nextRefreshAt` only and return. **No
     Gemini call, no line rebuild, no new Blob content.** Steady-state cost ≈ a handful
     of GETs.
   - **Some sources changed →** fetch full data and rebuild lines **only for the changed
     sources**; unchanged sources keep their existing lines verbatim.
3. **Gemini is scoped to changed git/deploy data only**, and its output is reused when
   the commit-set for a repo is unchanged — so a new track or a new run never triggers a
   git re-summarization.

This is what keeps the refresh-on-read model nearly free: a visitor hitting a stale
cache in a quiet hour triggers only the cheap head-check, not the full pipeline.

## Error handling & degradation

Four layers, so the ticker never looks broken and rebuilds never stampede:

1. **Per-source isolation:** each source module catches its own errors and returns
   `[]`. One dead API never blocks the others.
2. **Last-known-good:** `build-feed` merges fresh results with the previous
   `ticker.json`; a source that returns `[]` this run keeps its prior lines (stamped
   with age) rather than vanishing. If the *whole* build fails, the existing blob is
   left untouched.
3. **Refresh-slot claim (anti-stampede):** when `/api/ticker` finds a stale cache, it
   first writes `nextRefreshAt = now + TTL` to claim the slot, *then* backgrounds the
   rebuild. Concurrent/later visitors in the same window see a fresh `nextRefreshAt` and
   don't trigger duplicate rebuilds. At portfolio traffic levels a rare double-rebuild is
   harmless; this just keeps it tidy.
4. **Client fallback:** if `useTicker` can't fetch `/api/ticker` (or it returns empty),
   it renders the current hardcoded lines from `Hero.jsx`. These move into a
   `TICKER_FALLBACK` constant so they're shared, not deleted.

Minimum bar: a fresh deploy with no blob yet, or total outage, still shows a sensible
scrolling ticker (fallback lines + live client-side time).

## Environment variables

Wave 1: `GOOGLE_API_KEY` (exists), `GITHUB_TOKEN` (exists, optional — raises rate
limit), `VERCEL_TOKEN` (new), `BLOB_READ_WRITE_TOKEN` (auto-added when a Blob store is
created), `CRON_SECRET` (for the optional daily safety-floor cron).

Wave 2: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`,
`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`. Each requires a
one-time OAuth dance (documented as a `_scripts/` helper or README steps).

## Refresh strategy & cost

**Trigger:** refresh-on-read. `/api/ticker` serves the cached feed and backgrounds a
rebuild (`waitUntil`) when `now > nextRefreshAt` (TTL ≈ 30 min). Read responses set
`Cache-Control: public, s-maxage=300, stale-while-revalidate=86400` so the CDN absorbs
the bulk of traffic and the function runs at most ~once per 5 min regardless of load.

**Optional daily safety floor** (the one cadence Hobby allows) in `vercel.json`:

```json
"crons": [{ "path": "/api/ticker?cron=1", "schedule": "0 9 * * *" }]
```

Guard the cron path with `Authorization: Bearer ${CRON_SECRET}` per Vercel convention.
Hobby timing is approximate (fires sometime in the 9–9:59 am hour), which is fine for a
floor.

**Cost (Hobby):** essentially free.
- Functions billed as normal usage under **Active CPU pricing** — `await`ing on network
  I/O bills at the low memory-only rate, so each rebuild is ~1–2s of real CPU. With CDN
  caching the function fires ≲ a few hundred times/day even under steady traffic.
- **Change-detection** means most rebuilds early-return after cheap head GETs — no Gemini
  call. Gemini runs only when git/deploy actually changed: a few small Flash calls/day.
- **Blob**: one small JSON, written only when content changes — within free allowance.
- Net: rounds to **$0/month** at portfolio traffic. The Hobby cron cap, not cost, was the
  binding constraint — solved by refresh-on-read.

## Testing

Follow the existing `node --test` setup (`api/_lib/*.test.js`). Pure modules with
injected `fetch`/clients:

- `github.js`: groups multiple commits per repo; ignores non-push events; empty on error.
- `summarize.js`: respects char cap + lowercase; deterministic fallback when Gemini errors.
- `fingerprint.js`: equal heads → "unchanged"; one changed source → only that source flagged.
- `build-feed.js`: per-source isolation (one throwing source doesn't kill the feed);
  **unchanged fingerprint skips Gemini + rewrite**; changed source rebuilds only its lines;
  last-known-good merge; dedupe by `id`; length cap.
- `vercel.js` / `spotify.js` / `strava.js`: parse fixtures into `Line[]`; empty on error.
- `ticker.js` (read endpoint): fresh cache → no rebuild; stale cache → claims slot +
  backgrounds rebuild + returns cached now; missing cache → fallback + build.
- `useTicker` (frontend, `src/.../*.test.js`): injects client time line; falls back to
  `TICKER_FALLBACK` on fetch failure.

Manual verification: run `build-feed` locally against real APIs, inspect written blob,
load the page, confirm live lines + client time + fallback (by blocking `/api/ticker`),
and confirm a second run with no new activity early-returns without a Gemini call.

## Phasing

- **Wave 1 — pipeline + low/no-auth sources:** `_lib/ticker/*` scaffold, `fingerprint`,
  `build-feed`, Blob read/write + slot-claim, `api/ticker.js` read endpoint (+ optional
  daily cron), `useTicker`, Hero wiring + fallback, and the GitHub / Vercel-deploy /
  client-time / curated sources. Fully live and shippable.
- **Wave 2 — OAuth sources:** add `spotify.js` + `strava.js` and their one-time token
  setup, drop them into `build-feed` and the fingerprint.

Each wave is independently shippable; Wave 1 stands alone if Wave 2 is deferred.

## Open questions / future

- TTL value (30 min assumed) and whether the daily safety-floor cron is worth wiring in v1.
- Whether to weight/shuffle line order so the ticker varies between loads.
- Strava "latest activity" vs "weekly mileage" framing — decide during Wave 2.
