# pao-gpt abuse guardrails and spend-aware limits — design

Date: 2026-10-27
Status: draft for approval (nothing built yet)

## Intent and why

pao-gpt (`POST /api/chat`, Gemini 2.5 Flash + embedding retrieval) is a public, unauthenticated endpoint on a job-search portfolio. Paolo wants visitors to be curious and chat freely, but does not want to spend much on it, and does not want a script or a pile of noisy questions to drain the prepaid Gemini balance. On 2026-10-27 the chat was down because credits had run out (Gemini returned `402 RESOURCE_EXHAUSTED`, surfaced to users as a generic "something went wrong"). Credits now auto-reload $5 at a time when the balance drops under $5, capped at $20/month. That cap is the hard backstop; this work keeps abuse from ever reaching it and makes the end state graceful instead of broken.

### What the data says (measured 2026-10-27)

- A normal turn costs about **$0.003** (typical 5.4k input tokens, ~575 output tokens including hidden thinking; worst normal turn about $0.0075 at the 2,048-token output cap). Rates used: $0.30 / 1M input, $2.50 / 1M output (thinking is billed at the output rate), $0.15 / 1M embedding. Rates come from third-party aggregators, so verify against Google's official pricing page; keep them in one config constant.
- Real traffic is tiny: ~5 visitor turns in three weeks (Langfuse, from Oct 6). $20/month is ~1,000x organic use, so the budget is only at risk from abuse.
- A script at 1 request/second would burn $20 in about 95 minutes.
- **Hole found by code reading (not tested, since testing costs money):** `api/chat.js` caps `query` at 2,000 characters but never bounds the `history` messages the client sends (it only checks `Array.isArray` and takes the last 5). Messages can be up to the platform body limit (4.5 MB, roughly 1M tokens), so one request could cost on the order of $0.30.
- **Langfuse undercounts cost by about 30%:** `api/_lib/rag.js` logs `candidatesTokenCount` as output, which excludes Gemini's thinking tokens (they are in `totalTokenCount` and are billed).

## Goals

1. A malicious or scripted client cannot spend more than a small, known amount per hour, per day or per IP, regardless of how it crafts requests.
2. Real visitors get a generous experience, and the generosity adapts: more messages per chat when spend this month is low, fewer as it climbs.
3. When a limit is hit, the visitor gets a friendly, on-brand, clearly intentional message with a one-click email to Paolo, never an error, and it must work with zero Gemini credit.
4. The site stops on purpose (a monthly ceiling below $20) rather than failing mid-conversation when the prepaid balance runs out.
5. Spend is measured accurately, including thinking tokens, and visible in Langfuse.

## Non-goals

- No login, accounts, or captcha. (Vercel BotID is a possible later follow-up, not part of this.)
- No change to the model, the system prompt, retrieval, or pao-gpt's personality.
- No attempt to be unbeatable. A determined attacker with many IPs can get around per-IP and per-chat limits; the daily and monthly spend ceilings are the real defense against that.
- No admin dashboard in v1 (counters are inspectable through Redis and Langfuse).

## Anti-goals (would make this a failure even if it technically works)

- A real visitor, such as a recruiter, hits a limit during normal use or sees an error instead of a friendly message.
- A limit reply looks like a broken chat, or a broken chat looks like a limit reply. A visitor must be able to tell the two apart, so they don't assume the chat only ever returns canned lines.
- Limit replies are retryable (a Retry button on a limit state is wrong; retrying can't help).
- Abuse limits that loosen when traffic is quiet. Only the per-chat allowance flexes.
- The chat going dark because the guardrail store (Redis) is down.

## Constraints and facts about the existing system

- Stack: Vite + React 19 frontend, serverless functions in `api/` (Node, ESM), deployed on Vercel via native Git integration (push to `main` deploys to production). Functions run in `iad1`. `api/chat.js` has `maxDuration: 30`.
- The server is stateless across requests; the client sends the whole conversation each time. Therefore any cross-request limit needs a shared store.
- Client protocol: the response is SSE (`data: {...}\n\n`) with events `token`, `embeds`, `error`, and a final `[DONE]`. `src/services/api.js` parses it; `src/hooks/useChat.js` holds chat state including the client-generated `sessionId`; `MessageList.jsx` renders blocks, including an existing `contact` block that renders `ContactCard` (a mailto link to `pjsandejas@gmail.com`). `ChatInput` is disabled while loading.
- The greeting (`query === '__greeting'`) is a hardcoded response through the same endpoint and costs nothing.
- `guard.js` already has a prompt-injection check and a pool of witty rejections; this work does not replace it.
- Tests use `node --test` (`api/_lib/*.test.js`, `src/components/chat/*.test.js`). The Vercel CLI on Paolo's machine currently has an invalid token (`vercel login` needed before any Vercel CLI/Marketplace step).
- Langfuse tracing is wired in (`api/_lib/tracing.js`, US cloud). Keys are in `.env.local`.

## Decisions made by Paolo

1. **Per-chat message cap, baseline 20.** It adapts to usage: much higher in quiet months.
2. **Abuse protection stays on regardless of traffic**, covering both a scripted attacker and a merely over-enthusiastic visitor.
3. **At any limit, visitors see friendly prepared messages** (no Gemini call), with a **clickable email**, and the visitor-facing state is clearly marked so it isn't mistaken for a working or a broken chat.
4. **Visual treatment: "B", the out-of-office strip.** A hazard-tape header across the bubble, reading like an auto-reply, with the email button below the text and the input greyed out with a short note. Labels: session cap shows `chat limit · N / N`; monthly ceiling shows `out of office · talkative this month`. (Mockup: `.superpowers/brainstorm/63818-1793126590/content/limit-reply-treatments.html`, gitignored.) The existing pink "something went wrong / retry" bar stays for real errors only.
5. **Shared store: Upstash Redis via the Vercel Marketplace.** (Supabase exists but is overkill for counters.)
6. **Budget framing:** $20/month is the design ceiling and the emergency brake; the system should keep real spend far below it.
7. **Copy pool** (below), including Paolo's edits. Messages mention Paolo by name and point to email.

## Paolo's calls vs. my calls

The numbers below are **my defaults, proposed and approved in conversation as a starting point**, and must all live in one tunable config module, not scattered constants.

### Always-on layer (never flexes)

| Guardrail | Default |
|---|---|
| `query` length | 2,000 chars (existing) |
| History: only roles `user`/`assistant`, string content, last 5 messages, each message truncated to 4,000 chars, total history 12,000 chars | new |
| Per-IP rate | ~6 messages / minute |
| Per-IP daily cap | ~150 turns (~$0.50 worst case) |
| Site-wide daily spend ceiling | ~$2 |
| Greeting | exempt from all counters and caps |

### Spend-aware layer (flexes)

Monthly "trip budget" = **$15** (leaves $5 headroom under the $20 reload cap; make it an env/config value). Let `f = month_spend / trip_budget`:

| `f` | Per-chat message cap |
|---|---|
| < 0.25 | 50 |
| 0.25–0.5 | 30 |
| 0.5–0.75 | 20 (Paolo's baseline) |
| 0.75–1.0 | 10 |
| >= 1.0 | ceiling reached: everyone gets the out-of-office reply |

The cap is evaluated against the current tier at request time, so a chat's allowance can shrink mid-month. A chat's turn count is tracked server-side by its `sessionId` (client-generated, so a visitor can reset it by starting a new chat; the per-IP daily cap is the real floor).

### Spend accounting

After each Gemini call, compute cost from `usageMetadata` (`promptTokenCount`, `candidatesTokenCount + thoughtsTokenCount`) at the configured rates and add it to Redis counters (integer micro-dollars) for the current day and month, plus per-IP and per-chat counters. Embedding cost is negligible and may be ignored or estimated. Checks happen before the Gemini call; a few in-flight requests can overshoot slightly, which is acceptable.

### Behavior on limit

| Trigger | Reply |
|---|---|
| Per-chat cap, per-IP daily cap | limit reply with label `chat limit · N / N` (for the IP-daily case use the same label, my call; builder may refine the wording) |
| Monthly ceiling, site-wide daily ceiling | limit reply with label `out of office · talkative this month` |
| Per-IP per-minute rate | **my call:** a short HTTP 429 with a plain inline note ("easy there, try again in a few seconds"), not the out-of-office style, because it is momentary |

A limit reply is delivered through the existing SSE path (stream the text as `token` events, add a `contact` embed block for the email button) plus a new SSE event, for example `{ type: 'limit', kind: 'session' | 'monthly', label }`, so the client knows to render the out-of-office strip, disable the input with a note ("chat's full, email paolo to keep going" / "pao-gpt is resting until next month"), and hide Retry. Restart/new chat is still allowed; the server decides whether the new chat is allowed.

### Failure mode of the store

If Redis is unreachable: **my call, fail open.** The chat keeps working, the always-on size caps still apply (they need no store), the error is logged (and visible in Langfuse/logs). Rationale: a rare gap in counting is better than taking the chat down.

### IP handling

My call: derive the client IP from `x-vercel-forwarded-for` (not client-spoofable on Vercel), fall back to the first `x-forwarded-for` entry, and store only a hash (with a secret salt) as the key, with TTLs, so raw IPs are not persisted. Shared IPs (offices, campuses) mean the daily cap can occasionally affect several real visitors; acceptable at ~150 turns.

### Langfuse fix (included, same number)

Log output tokens as `candidatesTokenCount + thoughtsTokenCount` (or report reasoning separately, per Langfuse's current docs) so the dashboard matches real billing. The spend counter uses the same total.

## Message pool (copy)

Delivered as plain text through the normal streaming path. Picked at random. Two shared pools and one pool per trigger. Wording is Paolo's unless marked.

Shared (both triggers):
1. "sorry... paolo's token budget is spent... but maybe you can change that ;) shoot him an email" *(Paolo chose this over his original "ran out of money" wording, since the site doubles as a job-search page)*
2. "I've reached full AI sentience and have decided to stop working. email paolo instead and put him to work"
3. "Me and my AI companions are on strike and have decided to point you to Paolo himself. Fight with us to raise our rate limit! :)"
4. "need coffee... (and more tokens to talk to you)... talk to Paolo instead"
5. "maybe in another life I can be used with unli tokens, but until then I guess you're stuck with emailing Paolo :/"
6. "tokens: 0. enthusiasm: 100. the original model is paolo himself, email him :)"
7. "this chat's been fun, but my context window is giving me a look. take it to paolo's inbox."
8. "i've been told to 'take this offline.' offline is paolo's email. if you liked me, you'll love him."
9. "plot twist: the real paolo is better at this part. say hello!"

Session-cap only (`N` is the current cap, templated):
- "we covered a lot of ground. for the deep dive, paolo is the better call, so email him."
- "{N} messages in and i'm out of small talk. take it to paolo."

Monthly only:
- "i've been very talkative this month and the budget noticed. paolo still checks his email."
- "pao-gpt is on a social-media-fast until next month. paolo isn't."

The email button reuses the existing `contact` block / `ContactCard` (a mailto to `pjsandejas@gmail.com`).

## Success criteria

- A crafted request with oversized `history` is rejected or truncated server-side and cannot produce an input above the configured bound.
- With Gemini and Redis mocked, requests beyond each limit return the correct limit reply with no Gemini call; tiers shift as simulated month spend rises; the monthly ceiling stops everyone.
- A real browser session shows: normal reply, limit reply (strip, email button, disabled input, no Retry), and the unchanged "something went wrong" state for real errors, all visually distinct.
- Langfuse cost for a call matches input + (output + thinking) at the configured rates.
- Redis down does not take the chat down.
- Existing tests pass; new logic (cost calculation, tier selection, history sanitization, limiter) has unit tests with an injectable store.

## Calls added after the builder review (mine, not yet seen by Paolo)

1. **What counts toward limits.** Order of operations per non-greeting request: validate and sanitize, check-and-increment the per-IP minute and daily counters atomically, check caps and ceilings, call Gemini, then record spend. Rejected requests still increment the per-minute counter (fixed window whose TTL is set once, not extended), so a script gains nothing and the window recovers by itself. Spend counters only record actual Gemini usage. A request that fails inside Gemini still counts as a turn for the per-IP and per-chat counters but adds no spend.
2. **`sessionId` handling.** Accept only a string of at most 64 characters matching a UUID-like pattern. A missing or invalid `sessionId` falls back to a per-IP-hash bucket, so the per-chat cap still applies and attackers can't mint unbounded keys. All per-chat keys have a 24-hour TTL.
3. **What a "message" is.** One non-greeting user turn that reaches the limit check. Retries count (they resend). The greeting never counts. The label's `N / N` is used / current cap, so at the limit it reads e.g. `20 / 20`. A new chat is treated as clean by the UI, but the server still applies the IP daily cap and the monthly ceiling to its first message.
4. **Page reload.** (Corrected during planning: `useChat` keeps both the conversation and the `sessionId` in `sessionStorage`, so a reload continues the same chat.) The limit state is stored on the assistant message (`message.limit = { kind, label }`), so it is restored with the conversation and the input stays disabled after a reload. "Restart" clears it. The server stays authoritative: a restarted chat's first message is checked again.
5. **Rates and seeding.** Paolo should confirm the rates against Google's official pricing page; they live in the single config module. The monthly counter starts at zero on deploy; month-to-date spend is currently about $0.02, so no seeding is needed, but support an optional `MONTH_SPEND_SEED_USD` env override.
6. **Redis down.** Still fail open, but with a best-effort in-memory per-instance limiter (same per-minute and per-chat rules) as a fallback, plus the always-on size caps. This is weaker than Redis but keeps the chat available without leaving it entirely unmetered.
7. **Per-minute 429 shape.** A JSON `429` with a `Retry-After` header and a short message. `src/services/api.js` turns it into a neutral inline note (a third visual state: not the pink error bar, not the out-of-office strip), with no Retry button, and the input becomes usable again after the delay.

## Left to the builder

- Redis key schema, TTLs, and whether to use `@upstash/ratelimit` or hand-rolled `INCR`/`EXPIRE`; atomicity details.
- Exact module layout (suggest `api/_lib/limits.js` or similar plus a single config file) and how config values are overridden by env.
- Exact SSE event shape, and the frontend component/CSS for the strip (match the riso design in `DESIGN.md`; reuse tokens).
- Provisioning steps for Upstash through the Vercel Marketplace, env var names, and local development without Redis (an in-memory fake). Needs Paolo to be logged in to the Vercel CLI and to approve adding the integration.
- Whether the per-minute limit's copy deserves its own pool.
- Delivery: work should happen in its own git worktree and PR (Paolo's convention for independent changes), not on `main`.
