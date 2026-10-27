import { createHash } from 'node:crypto';
import { startActiveObservation, updateActiveObservation, propagateAttributes } from '@langfuse/tracing';
import { flushTracing } from './tracing.js';
import { check, filterResponse, scrubConfidential } from './guard.js';
import { isGreetingSentinel, GREETING_BLOCKS } from './personality.js';
import { sanitizeHistory, sessionKeyFor } from './sanitize.js';
import { limitKind, pickLimitMessage, limitLabel } from './limitMessages.js';
import { costUsd } from './spend.js';
import { LIMITS } from './limits-config.js';

const RATE_LIMIT_MESSAGE = 'easy there — try again in a few seconds';

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

function firstHeaderEntry(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return '';
  return raw.split(',')[0].trim();
}

// x-vercel-forwarded-for is set by Vercel's edge and can't be spoofed by the client.
function clientIp(req) {
  const headers = req.headers ?? {};
  return firstHeaderEntry(headers['x-vercel-forwarded-for']) || firstHeaderEntry(headers['x-forwarded-for']);
}

// Only this salted hash ever leaves the handler; the raw IP is never stored or logged.
function hashIp(ip, salt) {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

// ip-daily rejections carry no counts, so show the per-IP cap as reached.
function limitCounts(verdict) {
  if (verdict.reason === 'ip-daily' && verdict.cap == null) {
    return { used: LIMITS.ip.perDay, cap: LIMITS.ip.perDay };
  }
  return { used: verdict.used, cap: verdict.cap };
}

// Gemini out of prepaid credit: 402 RESOURCE_EXHAUSTED "Your prepayment credits are
// depleted". A generic 429 is NOT this (it can be a per-minute quota blip).
function isBillingExhausted(err) {
  if (err?.status === 402 || err?.code === 402) return true;
  return /prepayment credits are depleted/i.test(String(err?.message ?? ''));
}

// Out-of-office reply on an already-SSE response: text, limit pill, contact card, done.
function sendLimitReply(res, { kind, used, cap, reason }) {
  const text = pickLimitMessage(kind, cap);
  streamText(res, text);
  sendEvent(res, { type: 'limit', kind, label: limitLabel(kind, used, cap) });
  sendEvent(res, { type: 'embeds', blocks: [{ type: 'contact' }] });
  updateActiveObservation({ output: text, metadata: { outcome: 'limited', reason } });
  res.write('data: [DONE]\n\n');
  res.end();
}

export function createHandler({ generate, limiter, salt = '', projectIds = [], workIds = [] }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { query, history: rawHistory = [], sessionId } = req.body ?? {};

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'query is required and must be a non-empty string' });
      return;
    }
    if (query.length > 2000) {
      res.status(400).json({ error: 'query must be 2000 characters or fewer' });
      return;
    }
    if (!Array.isArray(rawHistory)) {
      res.status(400).json({ error: 'history must be an array' });
      return;
    }
    const history = sanitizeHistory(rawHistory);
    // Groups a conversation's traces in Langfuse — telemetry only, so a missing or
    // malformed value is never a request error, just an ungrouped trace. Capped to
    // Langfuse's own 200-char attribute limit.
    const traceSessionId = typeof sessionId === 'string' && sessionId.length > 0
      ? sessionId.slice(0, 200)
      : undefined;

    // Spend write started from onUsage; awaited in finally so the function isn't frozen
    // before it lands. Always settles to undefined, so it can never throw out of here.
    let pendingSpend = null;

    try {
      // tags is a trace-level attribute: it must go through propagateAttributes (context
      // propagation to every observation in this callback), not updateActiveObservation
      // (which only ever touches the single currently-active observation) — the latter
      // silently drops unrecognized fields rather than erroring, so this is easy to get
      // wrong quietly. Confirmed by direct trace inspection during instrumentation.
      await propagateAttributes({ tags: ['pao-gpt'], ...(traceSessionId && { sessionId: traceSessionId }) }, async () => {
        await startActiveObservation('chat-response', async () => {
          updateActiveObservation({
            input: query,
            metadata: { historyLength: rawHistory.length },
          });

          try {
            // Greeting sentinel: return hardcoded blocks, skip RAG, guard and all limits
            if (isGreetingSentinel(query)) {
              setSseHeaders(res);
              const textBlock = GREETING_BLOCKS.find(b => b.type === 'text');
              const embedBlocks = GREETING_BLOCKS.filter(b => b.type !== 'text');
              if (textBlock) streamText(res, textBlock.content);
              if (embedBlocks.length > 0) sendEvent(res, { type: 'embeds', blocks: embedBlocks });
              updateActiveObservation({ output: textBlock?.content ?? '', metadata: { outcome: 'greeting' } });
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }

            const ipHash = hashIp(clientIp(req), salt);
            const sessionKey = sessionKeyFor(sessionId, ipHash);

            let verdict;
            try {
              verdict = await limiter.admit({ ipHash, sessionKey });
            } catch (err) {
              // Fail open: limiter trouble must never take the chat down.
              console.error('[chat] limiter.admit failed, admitting:', err?.message ?? err);
              verdict = { ok: true };
            }

            if (verdict?.ok === false && verdict.reason === 'rate') {
              const retryAfterSeconds = verdict.retryAfterSeconds ?? 1;
              updateActiveObservation({ metadata: { outcome: 'limited', reason: 'rate' } });
              res.setHeader('Retry-After', String(retryAfterSeconds));
              res.status(429).json({ error: 'rate_limited', message: RATE_LIMIT_MESSAGE, retryAfterSeconds });
              return;
            }

            setSseHeaders(res);

            const kind = verdict?.ok === false ? limitKind(verdict.reason) : null;
            if (kind) {
              sendLimitReply(res, { kind, ...limitCounts(verdict), reason: verdict.reason });
              return;
            }

            const guardResult = check(query);
            if (guardResult.isMalicious) {
              streamText(res, guardResult.response);
              updateActiveObservation({
                output: guardResult.response,
                metadata: { outcome: 'blocked', reason: guardResult.reason },
              });
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }

            const onUsage = (usage) => {
              pendingSpend = Promise.resolve()
                .then(() => limiter.recordSpend({ ipHash, sessionKey, costUsd: costUsd(usage) }))
                .catch((err) => console.error('[chat] recordSpend failed:', err?.message ?? err));
            };

            let blocks;
            try {
              blocks = await generate(query, history, { projectIds, workIds, onUsage });
            } catch (err) {
              if (!isBillingExhausted(err)) throw err; // everything else keeps the 500 path
              console.error(`[chat] Gemini billing exhausted (${err?.status ?? err?.code ?? 'message match'}), sending the monthly reply`);
              sendLimitReply(res, { kind: 'monthly', used: 0, cap: 0, reason: 'billing' });
              return;
            }
            // Order matters: scrub client names across the WHOLE response first (a hit
            // replaces everything with a uniform refusal, so no per-term signal escapes),
            // then apply the per-block PII redaction to whatever survives.
            const safeBlocks = scrubConfidential(blocks);
            const filteredBlocks = safeBlocks.map(block =>
              block.type === 'text'
                ? { ...block, content: filterResponse(block.content) }
                : block
            );

            const textContent = filteredBlocks
              .filter(b => b.type === 'text')
              .map(b => b.content)
              .join('\n\n');

            const embedBlocks = filteredBlocks.filter(b => b.type !== 'text');

            updateActiveObservation({
              output: textContent,
              metadata: { outcome: 'generated', embedCount: embedBlocks.length },
            });

            streamText(res, textContent);
            if (embedBlocks.length > 0) sendEvent(res, { type: 'embeds', blocks: embedBlocks });

            res.write('data: [DONE]\n\n');
            res.end();
          } catch (err) {
            updateActiveObservation({ level: 'ERROR', statusMessage: err.message });
            throw err;
          }
        });
      });
    } catch (err) {
      console.error('Chat handler error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      } else {
        sendEvent(res, { type: 'error', message: 'Something went wrong — try again in a moment' });
        res.end();
      }
    } finally {
      await pendingSpend;
      // Awaited, not waitUntil(): the SSE response is already fully sent by this point
      // (res.end() above), so this can't add latency for the client — it only keeps the
      // function invocation itself open until the trace is actually delivered, which the
      // platform guarantees regardless of whether request-context/waitUntil is wired up.
      await flushTracing();
    }
  };
}
