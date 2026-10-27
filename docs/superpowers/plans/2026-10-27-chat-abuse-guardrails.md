# pao-gpt Abuse Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cap what `/api/chat` can spend per request, per IP, per chat, per day and per month, adapt the per-chat allowance to real monthly spend, and show a friendly out-of-office reply when a limit is hit.

**Architecture:** Pure modules (config, cost/tier math, sanitizing, copy) plus a `limiter` that takes an injected store (in-memory for tests and local dev, Upstash Redis in production, in-memory fallback if Redis fails). The chat handler moves into a testable `createHandler(deps)`; a limit hit is returned as a normal SSE reply plus a new `limit` event, and the React client renders it as an "out-of-office strip" and locks the input.

**Tech Stack:** Node ESM serverless functions (`api/`), `node --test`, React 19 + Vite, `@upstash/redis` (new), Langfuse tracing (existing).

**Spec:** `docs/superpowers/specs/2026-10-27-chat-abuse-guardrails-design.md` (read it first; it is the source of every value below). Both the spec and this plan are untracked on `main`; commit them on the feature branch first. Do the work in a new git worktree + PR (Paolo's convention), never on `main`.

## Global Constraints

- Rates (one config module): input $0.30 / 1M tokens, output $2.50 / 1M tokens; output = `candidatesTokenCount + thoughtsTokenCount`. Spend stored as integer micro-dollars.
- Always-on: `query` <= 2,000 chars (existing); history = roles `user`/`assistant` only, string content, last 5, each truncated to 4,000 chars, total <= 12,000 chars (drop oldest first); per-IP 6 requests/min, 150 turns/day; site-wide daily spend ceiling $2.
- Monthly trip budget $15 (`MONTHLY_TRIP_BUDGET_USD` env override); `f = monthSpend / tripBudget`: `f<0.25` -> chat cap 50, `<0.5` -> 30, `<0.75` -> 20, `<1.0` -> 10, `>=1.0` -> ceiling (everyone gets the out-of-office reply).
- `sessionId`: string, <= 64 chars, UUID-like; otherwise fall back to a per-IP-hash bucket. Per-chat keys TTL 24h. Store only a salted hash of the IP (`LIMITS_IP_SALT`), source `x-vercel-forwarded-for`, fallback first `x-forwarded-for`.
- The greeting (`query === '__greeting'`) is exempt from every counter and cap.
- Labels (exact): `chat limit · N / N` (used/cap, clamped so used never exceeds cap) and `out of office · talkative this month`. Input notes: `chat's full — email paolo to keep going` / `pao-gpt is resting until next month`.
- Limit replies cost no Gemini call, show no Retry button, and include a `contact` embed block (existing `ContactCard`, mailto `pjsandejas@gmail.com`).
- Redis failure => fail open (in-memory fallback limiter + size caps), never take the chat down.
- Copy pool: copy verbatim from the spec section "Message pool (copy)".
- Style: match surrounding code (ESM, `node:test` + `node:assert/strict`, terse comments that explain why). No new dependencies except `@upstash/redis`.

## Review Focus

1. Malformed or hostile `history` (null/number entries, `role:'system'`, non-string content, one multi-MB message) must never throw or reach Gemini unbounded. (Tasks 2, 7)
2. Concurrent requests racing past a cap; N parallel requests must never admit more than the cap. (Task 4)
3. Store errors or timeouts mid-request: chat still answers, per-minute limit still enforced by the fallback. (Task 4)
4. The tier shrinking below a chat's already-used count: the chat limits immediately and the label reads `20 / 20`, never `25 / 20`. (Tasks 3, 4)
5. Missing/odd `usageMetadata` (cost 0, never `NaN`) and UTC day/month rollover resetting daily/monthly counters. (Tasks 1, 4)

---

### Task 1: Config, cost, and tier math

**Files:**
- Create: `api/_lib/limits-config.js`, `api/_lib/spend.js`
- Test: `api/_lib/spend.test.js`

**Interfaces:**
- Produces: `loadLimits(env = process.env) -> Limits` and `export const LIMITS` (shape: `{ rates:{inputPerM,outputPerM}, history:{lastN,perMessageChars,totalChars}, ip:{perMinute,perDay}, siteDailyUsd, tripBudgetUsd, tiers:[{below,cap}], chatKeyTtlSeconds }`); `costUsd(usage?: {promptTokenCount?, candidatesTokenCount?, thoughtsTokenCount?}) -> number`; `tierForSpend(monthSpendUsd: number, limits = LIMITS) -> { ceiling: boolean, chatCap: number | null }`.

- [ ] **Step 1: Write failing tests** in `spend.test.js`: `costUsd` for `{5000, 500, 300}` equals `(5000*0.30 + 800*2.50)/1e6` (use `assert.ok(Math.abs(...) < 1e-12)`); `costUsd(undefined)` and `costUsd({})` are exactly `0` (never `NaN`); `tierForSpend` returns caps 50/30/20/10 at spend 0, 3.75, 7.5, 11.25 and `{ceiling:true, chatCap:null}` at 15; `loadLimits({MONTHLY_TRIP_BUDGET_USD:'1'})` changes `tripBudgetUsd` so `tierForSpend(1, loadLimits(...)).ceiling` is true.
- [ ] **Step 2: Run** `node --test api/_lib/spend.test.js`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** both files with the Global Constraints values; `tiers` is data (`[{below:0.25,cap:50},...]`), not code.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(chat): spend cost + adaptive tier math`.

### Task 2: History and session sanitizing

**Files:**
- Create: `api/_lib/sanitize.js`
- Test: `api/_lib/sanitize.test.js`

**Interfaces:**
- Consumes: `LIMITS.history` from Task 1.
- Produces: `sanitizeHistory(history: unknown, limits = LIMITS.history) -> {role:'user'|'assistant', content:string}[]`; `sessionKeyFor(rawSessionId: unknown, ipHash: string) -> string` (`s:<id>` when valid, else `ip:<ipHash>`).

- [ ] **Step 1: Write failing tests:** non-array input -> `[]`; entries that are `null`, numbers, `{role:'system',content:'x'}`, or have non-string `content` are dropped; keeps only the last 5 valid entries; each content truncated to 4,000 chars; five 4,000-char messages -> only the last 3 survive (total <= 12,000, oldest dropped); a single 5,000,000-char message -> exactly 4,000 chars; `sessionKeyFor` accepts a UUID, rejects `''`, `undefined`, 65 chars, `'../x'`, a number (all -> `ip:<hash>`).
- [ ] **Step 2: Run** `node --test api/_lib/sanitize.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Order: filter valid, take last N, truncate, then drop oldest until total fits.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(chat): sanitize history and session ids`.

### Task 3: Limit copy and labels

**Files:**
- Create: `api/_lib/limitMessages.js`
- Test: `api/_lib/limitMessages.test.js`

**Interfaces:**
- Produces: `limitKind(reason: 'rate'|'session'|'ip-daily'|'monthly'|'site-daily') -> 'session'|'monthly'|null` (`session` for `session` and `ip-daily`; `monthly` for `monthly` and `site-daily`; `null` for `rate`); `pickLimitMessage(kind: 'session'|'monthly', cap: number, rand = Math.random) -> string` (shared pool + that kind's pool; `{N}` replaced by `cap`); `limitLabel(kind, used: number, cap: number) -> string`.

- [ ] **Step 1: Write failing tests:** `limitKind` mapping incl. `null` for `rate`; `pickLimitMessage('session', 20, () => 0)` equals the first shared line from the spec (`"sorry... paolo's token budget is spent... but maybe you can change that ;) shoot him an email"`); for both kinds, over every `rand` value in `[0,0.25,0.5,0.99]` no result contains `{N}`; `monthly` never returns a session-only line and vice versa; `limitLabel('session', 25, 20) === 'chat limit · 20 / 20'`; `limitLabel('monthly', 0, 0) === 'out of office · talkative this month'`.
- [ ] **Step 2: Run** `node --test api/_lib/limitMessages.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** with the pools copied verbatim from the spec; index by `Math.floor(rand() * pool.length)`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(chat): out-of-office copy pool and labels`.

### Task 4: Store interface, in-memory store, and limiter

**Files:**
- Create: `api/_lib/store.js` (interface + `createMemoryStore` only in this task), `api/_lib/limiter.js`
- Test: `api/_lib/limiter.test.js`

**Interfaces:**
- Consumes: `LIMITS`, `tierForSpend` (Task 1).
- Produces:
  - `Store = { incr(key, ttlSeconds): Promise<number>, incrBy(key, amount, ttlSeconds): Promise<number>, get(key): Promise<number> }`. `incr`/`incrBy` are atomic and set the TTL only when the key is created (fixed window, never extended).
  - `createMemoryStore(now = () => Date.now()) -> Store`.
  - `createLimiter({ store, fallback = createMemoryStore(), limits = LIMITS, now = () => new Date() }) -> { admit, recordSpend }`.
  - `admit({ ipHash: string, sessionKey: string }) -> Promise<{ok:true} | {ok:false, reason:'rate'|'session'|'ip-daily'|'monthly'|'site-daily', used?:number, cap?:number, retryAfterSeconds?:number}>`.
  - `recordSpend({ ipHash, sessionKey, costUsd }) -> Promise<void>` (adds micro-dollars to UTC-day and UTC-month counters; never throws).

- [ ] **Step 1: Write failing tests** (memory store, injected `now`): 7th request in one minute -> `{ok:false, reason:'rate', retryAfterSeconds <= 60}`; after advancing 61s the same IP is admitted again even after many rejected attempts (rejections keep incrementing, TTL not extended); 151st turn in a UTC day (spread over minutes) -> `'ip-daily'`; 51st turn on one `sessionKey` -> `{reason:'session', used:50, cap:50}`; after `recordSpend` of 8 USD the cap is 20, and a chat already at 25 turns returns `{reason:'session', used:20, cap:20}`; `recordSpend` 15 USD -> `'monthly'` for any session; `recordSpend` 2 USD in one UTC day -> `'site-daily'`, and admitted again next UTC day; spend recorded Oct 31 23:59Z does not count on Nov 1; 20 concurrent `admit` calls with `Promise.all` on a fresh limiter and one IP -> exactly 6 `ok:true`; a `store` whose methods all reject -> `admit` resolves `{ok:true}` (no throw), the 7th call in a minute is `'rate'` via the fallback, and `recordSpend` resolves without throwing.
- [ ] **Step 2: Run** `node --test api/_lib/limiter.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Per attempt: increment minute, IP-day and session counters, read month and site-day spend, then decide in order `rate`, `monthly`, `site-daily`, `ip-daily`, `session`. Wrap every store call so an error logs once via `console.error` and reroutes that request to `fallback` (minute + session rules only). Counter keys include the UTC minute/day/month bucket; session key TTL = `LIMITS.chatKeyTtlSeconds`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(chat): limiter with memory store and fail-open fallback`.

### Task 5: Redis store and default wiring

**Files:**
- Modify: `api/_lib/store.js`, `package.json` (add `@upstash/redis`)
- Test: `api/_lib/store.test.js`

**Interfaces:**
- Produces: `createRedisStore({ url: string, token: string }) -> Store`; `getDefaultStore(env = process.env) -> Store | null` (reads `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, falling back to `KV_REST_API_URL`/`KV_REST_API_TOKEN`; `null` when neither pair is set).

- [ ] **Step 1: Write failing tests:** `getDefaultStore({})` is `null`; with the env pair set it returns an object with `incr`, `incrBy`, `get` (no network call made); memory store contract test run against both memory and, when `UPSTASH_REDIS_REST_URL` is set, Redis (skip otherwise, same pattern as the gated integration test in `rag.test.js`): `incr` twice returns 1 then 2; TTL not extended on the second call.
- [ ] **Step 2: Run** `node --test api/_lib/store.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** with `@upstash/redis`; atomic `INCR` + `EXPIRE key ttl NX` in one pipeline; `incrBy` likewise.
- [ ] **Step 4: Run.** Expected: PASS (Redis contract test skipped locally).
- [ ] **Step 5: Commit** `feat(chat): upstash redis store`.

### Task 6: Accurate usage from Gemini (Langfuse fix + spend hook)

**Files:**
- Modify: `api/_lib/rag.js` (`generate`, around the `usageDetails` block)
- Test: `api/_lib/rag.test.js`

**Interfaces:**
- Produces: `usageDetailsFrom(usageMetadata?) -> {input:number, output:number, total:number}` (`output` = candidates + thoughts; zeros when missing); `generate(query, history, { projectIds, workIds, onUsage })` calls `onUsage?.(response.usageMetadata)` right after the Gemini response (including the unparseable-output path); return type unchanged.

- [ ] **Step 1: Write failing tests:** `usageDetailsFrom({promptTokenCount:4118, candidatesTokenCount:86, thoughtsTokenCount:408, totalTokenCount:4612})` is `{input:4118, output:494, total:4612}`; `usageDetailsFrom(undefined)` is all zeros.
- [ ] **Step 2: Run** `node --test api/_lib/rag.test.js`. Expected: FAIL (export missing).
- [ ] **Step 3: Implement** and use it in `generation.update({ usageDetails })`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `fix(chat): count thinking tokens in Langfuse usage; expose onUsage`.

### Task 7: Handler integration

**Files:**
- Create: `api/_lib/chatHandler.js` (the current `api/chat.js` handler moved here as `createHandler`)
- Modify: `api/chat.js` (thin entry: keep `import './_lib/tracing.js'` first, then `export default createHandler(...)` with real deps)
- Test: `api/_lib/chatHandler.test.js`

**Interfaces:**
- Consumes: everything above.
- Produces: `createHandler({ generate, limiter, salt, now }) -> (req, res) => Promise<void>`. Limit reply SSE sequence: token events (text), `{"type":"limit","kind":"session"|"monthly","label":"..."}`, `{"type":"embeds","blocks":[{"type":"contact"}]}`, `[DONE]`. Rate limit: status 429, header `Retry-After`, JSON `{error:'rate_limited', message, retryAfterSeconds}`, sent before SSE headers.

- [ ] **Step 1: Write failing tests** with fake `req`/`res` and spy deps: greeting calls neither `limiter.admit` nor `generate`; a 5,000,000-char history entry reaches `generate` as <= 4,000 chars; happy path calls `admit` with a 64-hex `ipHash` (the raw IP string never appears in any limiter call), then `generate`, then `recordSpend` with `costUsd` computed from the usage passed to `onUsage`; `admit -> {reason:'session', used:20, cap:20}` skips `generate` and writes the `limit` event with label `chat limit · 20 / 20`, a `contact` embed and `[DONE]`; `{reason:'monthly'}` uses label `out of office · talkative this month`; `{reason:'rate', retryAfterSeconds:30}` gives 429 + `Retry-After: 30` + JSON body; `limiter.admit` throwing still lets the request reach `generate`; `generate` rejecting still yields the existing 500 JSON behavior.
- [ ] **Step 2: Run** `node --test api/_lib/chatHandler.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Order after existing validation: sanitize history -> greeting short-circuit -> client IP + hash -> `admit` (429 before `setSseHeaders`) -> existing `guard.check` -> `generate({ onUsage })` -> `recordSpend`. Limit replies reuse `streamText` and `sendEvent`.
- [ ] **Step 4: Run** `node --test api/_lib/*.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(chat): enforce limits in chat handler`.

### Task 8: Client protocol (`limit` event and 429)

**Files:**
- Modify: `src/services/api.js` (`sendMessageStream`), `package.json` (`test` script: add `src/services/*.test.js`)
- Test: `src/services/api.test.js`

**Interfaces:**
- Produces: `sendMessageStream(message, history, { ..., onLimit?: ({kind, label}) => void, onRateLimit?: ({message, retryAfterSeconds}) => void })`. A 429 calls `onRateLimit` and never `onError`; a `limit` SSE event calls `onLimit` and the stream still ends with `onDone`.

- [ ] **Step 1: Write failing tests** stubbing `globalThis.fetch`: a `Response` with SSE body containing a `limit` event, a token, and `[DONE]` -> `onLimit` gets `{kind:'session', label:'chat limit · 20 / 20'}` once and `onDone` once; a 429 JSON response -> `onRateLimit` gets `{message, retryAfterSeconds:30}`, `onError` not called.
- [ ] **Step 2: Run** `node --test src/services/api.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the 429 branch before the generic `!response.ok` branch, and the `limit` case in the event loop.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(chat): client handles limit event and 429`.

### Task 9: Chat state for limits

**Files:**
- Create: `src/components/chat/limitState.js`
- Modify: `src/hooks/useChat.js`
- Test: `src/components/chat/limitState.test.js`

**Interfaces:**
- Produces: `getLimitState(messages) -> {kind, label, inputNote} | null` (non-null only when the last message is an assistant message with `limit`; `inputNote` strings from Global Constraints). `useChat()` additionally returns `notice: string | null` (set by `onRateLimit`, auto-cleared after `retryAfterSeconds`); assistant messages carry `limit: {kind, label}` set by `onLimit` and saved with the existing sessionStorage persistence. On rate limit, drop the empty assistant placeholder and the unanswered user message so history stays clean.

- [ ] **Step 1: Write failing tests:** empty list -> `null`; last message assistant with `limit.kind:'session'` -> note `chat's full — email paolo to keep going`; `monthly` -> `pao-gpt is resting until next month`; limit message followed by a user message -> `null`; plain assistant message -> `null`.
- [ ] **Step 2: Run** `node --test src/components/chat/limitState.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `getLimitState`, then wire `onLimit` (attach to the final assistant message in `onDone`, which today only rewrites it when embeds exist) and `onRateLimit` in `useChat.js`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(chat): persist limit state on messages`.

### Task 10: Out-of-office strip UI and visual verification

**Files:**
- Modify: `src/components/chat/MessageList.jsx`, `MessageList.css`, `ChatInput.jsx`, `ChatInput.css`, `ChatInterface.jsx`, `ChatInterface.css`

**Interfaces:**
- Consumes: `getLimitState`, `notice`, `message.limit` (Task 9).
- Produces: assistant bubble with a hazard-tape strip header when `message.limit` is set; `ChatInput` accepts `lockedNote?: string` (input `disabled`, dashed, shows the note); `ChatInterface` passes `lockedNote`, renders `notice` in a neutral note bar (not `.chat-error`, no Retry).

- [ ] **Step 1: Implement** following option B of `/Users/paolosandejas/Documents/PortfolioProjects/portfolio-site/.superpowers/brainstorm/63818-1793126590/content/limit-reply-treatments.html` (gitignored, exists only in the main checkout; copy its `.B` rules) using the site's existing CSS tokens (`DESIGN.md`: paper, ink, `#3E3424`, lemon, pink; label 10px / 0.18em / uppercase). The label text comes from `message.limit.label`; the email button is the existing `ContactCard` block.
- [ ] **Step 2: Run `npm run dev`, then in the browser (Playwright MCP) stub `window.fetch` for `/api/chat`** to return, in turn: a normal SSE reply, a `limit` (session) reply, a `limit` (monthly) reply, a 500, and a 429. Screenshot each. Expected: normal reply unchanged; limit replies show the strip, email button, disabled input with the right note and no Retry; the 500 still shows the pink error bar with Retry; the 429 shows the neutral note with no Retry and the input still usable; reloading after a limit reply keeps the input disabled; Restart clears it. Check at 390px width too.
- [ ] **Step 3: Run** `npm run lint && npm test`. Expected: PASS.
- [ ] **Step 4: Commit** `feat(chat): out-of-office limit reply UI`.

### Task 11: Provision Redis, configure, document, verify live

**Files:**
- Modify: `README.md` (short "Chat limits" section: config values, env vars, how to change them)

This task needs Paolo: the Vercel CLI token is invalid (ask him to run `! vercel login`) and adding a Marketplace integration is an outward-facing, billing-adjacent action, so confirm before installing. Use the `vercel:marketplace` skill for current commands.

- [ ] **Step 1:** With Paolo's go-ahead, add the Upstash Redis integration to the `portfolio-site` Vercel project; confirm the injected env var names match `getDefaultStore` (adjust the fallback names in Task 5 if not). Set `LIMITS_IP_SALT` (random 32+ chars) in all environments, and `MONTHLY_TRIP_BUDGET_USD=0.01` in **Preview only** (for the ceiling test below).
- [ ] **Step 2:** Open a PR; on the Vercel preview run: `for i in 1..8` `curl` POSTs of a real query -> the 7th returns 429 with `Retry-After`; after ~1 minute with the tiny trip budget set, a real query returns the SSE `limit` event with the `monthly` label. Expected: both observed. Then remove the preview budget override.
- [ ] **Step 3:** Run `npm test && npm run lint && npm run build`. Expected: all pass.
- [ ] **Step 4:** After merge and production deploy: send one normal question on the live site (works), and confirm in Langfuse that the next generation's reported output tokens now include thinking. Commit the README as `docs(chat): document limits`.
