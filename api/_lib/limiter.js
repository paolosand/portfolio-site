import { LIMITS } from './limits-config.js';
import { tierForSpend } from './spend.js';
import { createMemoryStore } from './store.js';

const DAY = 86400;
// Keys carry their UTC bucket, so TTLs only need to outlive the bucket (with slack).
const MINUTE_TTL = 120;
const DAY_TTL = 2 * DAY;
const MONTH_TTL = 35 * DAY;

const secondsUntil = (ms, from) => Math.max(1, Math.ceil((ms - from) / 1000));

function buckets(d) {
  const iso = d.toISOString(); // always UTC
  const t = d.getTime();
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  return {
    minute: iso.slice(0, 16),
    day: iso.slice(0, 10),
    month: iso.slice(0, 7),
    toNextMinute: secondsUntil((Math.floor(t / 60000) + 1) * 60000, t),
    toNextDay: secondsUntil(Date.UTC(y, m, day + 1), t),
    toNextMonth: secondsUntil(Date.UTC(y, m + 1, 1), t),
  };
}

export function createLimiter({
  store,
  fallback = createMemoryStore(),
  limits = LIMITS,
  now = () => new Date(),
}) {
  const keys = (b, ipHash, sessionKey) => ({
    minute: `rl:ip:${ipHash}:m:${b.minute}`,
    ipDay: `rl:ip:${ipHash}:d:${b.day}`,
    chat: `rl:chat:${sessionKey}`, // per-chat window is 24h from the first turn, not a calendar bucket
    ...spendKeys(b),
  });
  const spendKeys = (b) => ({ spendDay: `spend:d:${b.day}`, spendMonth: `spend:m:${b.month}` });

  const sessionReject = (count, cap) =>
    count > cap ? { ok: false, reason: 'session', used: Math.min(count - 1, cap), cap } : null;

  // Full rules against the shared store. Any rejection propagates to admit's catch.
  async function decide(b, ipHash, sessionKey) {
    const k = keys(b, ipHash, sessionKey);
    // Count first, rejected or not: a client retrying in a loop keeps paying for it.
    const [minute, ipDay, chat] = await Promise.all([
      store.incr(k.minute, MINUTE_TTL),
      store.incr(k.ipDay, DAY_TTL),
      store.incr(k.chat, limits.chatKeyTtlSeconds),
    ]);
    const [monthMicros, dayMicros] = await Promise.all([store.get(k.spendMonth), store.get(k.spendDay)]);

    if (minute > limits.ip.perMinute) return { ok: false, reason: 'rate', retryAfterSeconds: b.toNextMinute };
    const tier = tierForSpend(monthMicros / 1e6, limits);
    if (tier.ceiling) return { ok: false, reason: 'monthly', retryAfterSeconds: b.toNextMonth };
    if (dayMicros / 1e6 >= limits.siteDailyUsd) {
      return { ok: false, reason: 'site-daily', retryAfterSeconds: b.toNextDay };
    }
    if (ipDay > limits.ip.perDay) return { ok: false, reason: 'ip-daily', retryAfterSeconds: b.toNextDay };
    return sessionReject(chat, tier.chatCap) ?? { ok: true };
  }

  // Store is down: no spend data, so only the per-instance minute and per-chat rules
  // apply, with the chat cap of an unspent month. Keeps the chat up without going blind.
  async function decideFallback(b, ipHash, sessionKey) {
    const k = keys(b, ipHash, sessionKey);
    const [minute, chat] = await Promise.all([
      fallback.incr(k.minute, MINUTE_TTL),
      fallback.incr(k.chat, limits.chatKeyTtlSeconds),
    ]);
    if (minute > limits.ip.perMinute) return { ok: false, reason: 'rate', retryAfterSeconds: b.toNextMinute };
    const { chatCap } = tierForSpend(0, limits);
    return (chatCap != null && sessionReject(chat, chatCap)) || { ok: true };
  }

  async function admit({ ipHash, sessionKey }) {
    let b;
    try {
      b = buckets(now());
      return await decide(b, ipHash, sessionKey);
    } catch (err) {
      console.error('[limiter] store failed, using in-memory fallback:', err?.message ?? err);
      try {
        return await decideFallback(b ?? buckets(new Date()), ipHash, sessionKey);
      } catch {
        return { ok: true }; // fail open: never take the chat down over limiter trouble
      }
    }
  }

  // Never throws: spend is recorded after the reply is already sent.
  async function recordSpend({ costUsd }) {
    try {
      const micros = Math.round(Number(costUsd) * 1e6);
      if (!(micros > 0)) return;
      const k = spendKeys(buckets(now()));
      await Promise.all([
        store.incrBy(k.spendDay, micros, DAY_TTL),
        store.incrBy(k.spendMonth, micros, MONTH_TTL),
      ]);
    } catch (err) {
      console.error('[limiter] recordSpend failed:', err?.message ?? err);
    }
  }

  return { admit, recordSpend };
}
