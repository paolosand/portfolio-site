const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);
const TRANSIENT_MESSAGE = /(ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|fetch failed|network|timeout|overloaded|unavailable|rate.?limit)/i;

export function isTransient(err) {
  const status = err?.status ?? err?.code ?? err?.response?.status;
  if (typeof status === 'number' && TRANSIENT_STATUS.has(status)) return true;
  const msg = String(err?.message ?? '');
  if (/\b(429|500|502|503|504)\b/.test(msg)) return true;
  return TRANSIENT_MESSAGE.test(msg);
}

// Retry an async fn on transient errors only, with exponential backoff + jitter.
export async function withRetry(fn, { retries = 3, baseMs = 400 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isTransient(err)) throw err;
      const backoff = baseMs * 2 ** attempt;
      const jitter = Math.random() * backoff * 0.25;
      await new Promise(r => setTimeout(r, backoff + jitter));
    }
  }
  throw lastErr;
}
