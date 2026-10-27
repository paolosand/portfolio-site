import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from './chatHandler.js';
import { costUsd } from './spend.js';

const RAW_IP = '203.0.113.7';
const SESSION_ID = '123e4567-e89b-42d3-a456-426614174000';
const USAGE = { promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 300 };

function fakeReq(body, headers = { 'x-vercel-forwarded-for': RAW_IP }) {
  return { method: 'POST', headers, body };
}

function fakeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    writes: [],
    body: undefined,
    headersSent: false,
    ended: false,
    setHeader(name, value) { res.headers[name.toLowerCase()] = value; },
    status(code) { res.statusCode = code; return res; },
    json(body) { res.body = body; res.headersSent = true; res.ended = true; return res; },
    write(chunk) { res.writes.push(chunk); res.headersSent = true; return true; },
    end() { res.ended = true; },
  };
  return res;
}

// Parsed SSE payloads; '[DONE]' stays a string.
function events(res) {
  return res.writes.map((w) => {
    const data = w.replace(/^data: /, '').trim();
    return data === '[DONE]' ? data : JSON.parse(data);
  });
}

function spyLimiter(admitResult = { ok: true }) {
  const calls = { admit: [], recordSpend: [] };
  return {
    calls,
    admit: async (args) => {
      calls.admit.push(args);
      return typeof admitResult === 'function' ? admitResult(args) : admitResult;
    },
    recordSpend: async (args) => { calls.recordSpend.push(args); },
  };
}

function spyGenerate(impl) {
  const calls = [];
  const fn = async (query, history, opts) => {
    calls.push({ query, history, opts });
    if (impl) return impl(query, history, opts);
    opts?.onUsage?.(USAGE);
    return [{ type: 'text', content: 'hello there' }];
  };
  fn.calls = calls;
  return fn;
}

function build({ generate = spyGenerate(), limiter = spyLimiter() } = {}) {
  return {
    generate,
    limiter,
    handler: createHandler({ generate, limiter, salt: 'test-salt', projectIds: [], workIds: [] }),
  };
}

// Silences console.error for code paths that log on purpose.
async function quietly(fn) {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    await fn();
  } finally {
    console.error = original;
  }
  return logged;
}

test('greeting calls neither limiter.admit nor generate', async () => {
  const { handler, generate, limiter } = build();
  const res = fakeRes();
  await handler(fakeReq({ query: '__greeting' }), res);
  assert.equal(limiter.calls.admit.length, 0);
  assert.equal(generate.calls.length, 0);
  assert.equal(events(res).at(-1), '[DONE]');
});

test('a 5,000,000-char history entry reaches generate as <= 4,000 chars', async () => {
  const { handler, generate } = build();
  const history = [{ role: 'user', content: 'x'.repeat(5_000_000) }];
  await handler(fakeReq({ query: 'hi', history, sessionId: SESSION_ID }), fakeRes());
  assert.equal(generate.calls.length, 1);
  const sent = generate.calls[0].history;
  assert.ok(sent.every((m) => m.content.length <= 4000));
  assert.ok(sent.length >= 1);
});

test('happy path: admit gets a hashed IP, then generate, then recordSpend with costUsd', async () => {
  const order = [];
  const limiter = spyLimiter();
  const admit = limiter.admit;
  limiter.admit = async (args) => { order.push('admit'); return admit(args); };
  const recordSpend = limiter.recordSpend;
  limiter.recordSpend = async (args) => { order.push('recordSpend'); return recordSpend(args); };
  const generate = spyGenerate(async (q, h, opts) => {
    order.push('generate');
    opts.onUsage(USAGE);
    return [{ type: 'text', content: 'hello there' }];
  });
  const { handler } = build({ generate, limiter });
  const res = fakeRes();
  await handler(fakeReq({ query: 'hi', sessionId: SESSION_ID }), res);

  assert.deepEqual(order, ['admit', 'generate', 'recordSpend']);
  const [admitArgs] = limiter.calls.admit;
  assert.match(admitArgs.ipHash, /^[0-9a-f]{64}$/);
  assert.equal(admitArgs.sessionKey, `s:${SESSION_ID}`);
  assert.equal(limiter.calls.recordSpend.length, 1);
  assert.equal(limiter.calls.recordSpend[0].costUsd, costUsd(USAGE));
  assert.ok(limiter.calls.recordSpend[0].costUsd > 0);
  const allLimiterArgs = JSON.stringify(limiter.calls);
  assert.ok(!allLimiterArgs.includes(RAW_IP), 'raw IP leaked into a limiter call');
  assert.equal(events(res).at(-1), '[DONE]');
});

test('falls back to the first x-forwarded-for entry when x-vercel-forwarded-for is absent', async () => {
  const limiter = spyLimiter();
  const { handler } = build({ limiter });
  await handler(fakeReq({ query: 'hi' }, { 'x-forwarded-for': `${RAW_IP}, 10.0.0.1` }), fakeRes());
  const other = spyLimiter();
  await build({ limiter: other }).handler(
    fakeReq({ query: 'hi' }, { 'x-vercel-forwarded-for': RAW_IP }),
    fakeRes(),
  );
  assert.equal(limiter.calls.admit[0].ipHash, other.calls.admit[0].ipHash);
  assert.ok(!JSON.stringify(limiter.calls).includes(RAW_IP));
});

test('session limit streams a limit event, a contact embed and [DONE] without generating', async () => {
  const limiter = spyLimiter({ ok: false, reason: 'session', used: 20, cap: 20 });
  const { handler, generate } = build({ limiter });
  const res = fakeRes();
  await handler(fakeReq({ query: 'hi', sessionId: SESSION_ID }), res);

  assert.equal(generate.calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'text/event-stream');
  const evs = events(res);
  assert.ok(evs[0].type === 'token' && evs[0].text.length > 0);
  const limitIdx = evs.findIndex((e) => e.type === 'limit');
  assert.deepEqual(evs[limitIdx], { type: 'limit', kind: 'session', label: 'chat limit · 20 / 20' });
  assert.ok(evs.slice(0, limitIdx).every((e) => e.type === 'token'));
  assert.deepEqual(evs[limitIdx + 1], { type: 'embeds', blocks: [{ type: 'contact' }] });
  assert.equal(evs[limitIdx + 2], '[DONE]');
  assert.equal(evs.length, limitIdx + 3);
  assert.ok(res.ended);
});

test('monthly limit uses the out-of-office label', async () => {
  const limiter = spyLimiter({ ok: false, reason: 'monthly', retryAfterSeconds: 1000 });
  const { handler, generate } = build({ limiter });
  const res = fakeRes();
  await handler(fakeReq({ query: 'hi' }), res);

  assert.equal(generate.calls.length, 0);
  const limit = events(res).find((e) => e.type === 'limit');
  assert.deepEqual(limit, { type: 'limit', kind: 'monthly', label: 'out of office · talkative this month' });
  assert.equal(events(res).at(-1), '[DONE]');
});

test('rate limit gives a 429 with Retry-After and a JSON body, no SSE headers', async () => {
  const limiter = spyLimiter({ ok: false, reason: 'rate', retryAfterSeconds: 30 });
  const { handler, generate } = build({ limiter });
  const res = fakeRes();
  await handler(fakeReq({ query: 'hi' }), res);

  assert.equal(generate.calls.length, 0);
  assert.equal(res.statusCode, 429);
  assert.equal(String(res.headers['retry-after']), '30');
  assert.equal(res.body.error, 'rate_limited');
  assert.equal(res.body.retryAfterSeconds, 30);
  assert.equal(typeof res.body.message, 'string');
  assert.ok(res.body.message.length > 0);
  assert.equal(res.headers['content-type'], undefined);
  assert.equal(res.writes.length, 0);
});

test('limiter.admit throwing still lets the request reach generate', async () => {
  const limiter = spyLimiter(() => { throw new Error('redis exploded'); });
  const { handler, generate } = build({ limiter });
  const res = fakeRes();
  await quietly(() => handler(fakeReq({ query: 'hi' }), res));

  assert.equal(generate.calls.length, 1);
  assert.equal(events(res).at(-1), '[DONE]');
});

test('recordSpend rejecting never fails the reply', async () => {
  const limiter = spyLimiter();
  limiter.recordSpend = async () => { throw new Error('spend write failed'); };
  const { handler } = build({ limiter });
  const res = fakeRes();
  await quietly(() => handler(fakeReq({ query: 'hi' }), res));

  assert.equal(res.statusCode, 200);
  assert.ok(events(res).some((e) => e.type === 'token'));
  assert.equal(events(res).at(-1), '[DONE]');
});

function assertMonthlyReply(res) {
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'text/event-stream');
  const evs = events(res);
  assert.ok(evs[0].type === 'token' && evs[0].text.length > 0);
  const limitIdx = evs.findIndex((e) => e.type === 'limit');
  assert.deepEqual(evs[limitIdx], { type: 'limit', kind: 'monthly', label: 'out of office · talkative this month' });
  assert.deepEqual(evs[limitIdx + 1], { type: 'embeds', blocks: [{ type: 'contact' }] });
  assert.equal(evs[limitIdx + 2], '[DONE]');
  assert.equal(evs.length, limitIdx + 3);
  assert.ok(!evs.some((e) => e.type === 'error'));
  assert.ok(res.ended);
}

test('Gemini billing exhaustion (402) gets the monthly out-of-office reply, not a 500', async () => {
  for (const err of [
    Object.assign(new Error('{"error":{"code":402,"status":"RESOURCE_EXHAUSTED"}}'), { status: 402 }),
    Object.assign(new Error('payment required'), { code: 402 }),
    new Error('RESOURCE_EXHAUSTED: Your Prepayment Credits Are Depleted. Please top up.'),
  ]) {
    const generate = spyGenerate(async () => { throw err; });
    const { handler } = build({ generate });
    const res = fakeRes();
    const logged = await quietly(() => handler(fakeReq({ query: 'hi' }), res));
    assertMonthlyReply(res);
    assert.equal(logged.length, 1);
    assert.ok(!logged.some((args) => args[0] === 'Chat handler error:'));
  }
});

test('a generic 429 from generate is not mapped to the monthly reply', async () => {
  const generate = spyGenerate(async () => { throw Object.assign(new Error('RESOURCE_EXHAUSTED quota'), { status: 429 }); });
  const { handler } = build({ generate });
  const res = fakeRes();
  await quietly(() => handler(fakeReq({ query: 'hi' }), res));
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Internal server error' });
});

test('generate rejecting still yields the existing 500 JSON', async () => {
  const generate = spyGenerate(async () => { throw new Error('gemini down'); });
  const { handler } = build({ generate });
  const res = fakeRes();
  const logged = await quietly(() => handler(fakeReq({ query: 'hi' }), res));

  assert.equal(generate.calls.length, 1);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Internal server error' });
  assert.ok(logged.some((args) => args[0] === 'Chat handler error:'));
});
