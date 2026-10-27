import { LIMITS } from './limits-config.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// History is client-supplied, so bound it before it reaches the model (cost + prompt-stuffing).
export function sanitizeHistory(history, limits = LIMITS.history) {
  if (!Array.isArray(history)) return [];

  const kept = history
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string',
    )
    .slice(-limits.lastN)
    // Rebuild so extra client-supplied fields never pass through.
    .map((m) => ({ role: m.role, content: m.content.slice(0, limits.perMessageChars) }));

  let total = kept.reduce((n, m) => n + m.content.length, 0);
  while (kept.length > 0 && total > limits.totalChars) {
    total -= kept.shift().content.length; // oldest first
  }
  return kept;
}

// Per-chat counter key; invalid ids share the caller's per-IP bucket so they can't mint fresh chats.
export function sessionKeyFor(rawSessionId, ipHash) {
  const ok =
    typeof rawSessionId === 'string' &&
    rawSessionId.length <= 64 &&
    UUID_RE.test(rawSessionId);
  return ok ? `s:${rawSessionId}` : `ip:${ipHash}`;
}
