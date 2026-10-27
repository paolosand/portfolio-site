import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sendMessageStream } from './api.js';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const stubFetch = (response) => { globalThis.fetch = async () => response; };

// Records every callback invocation so tests can assert counts and payloads.
function makeHandlers() {
  const calls = { onToken: [], onEmbeds: [], onDone: [], onError: [], onLimit: [], onRateLimit: [] };
  const handlers = {};
  for (const name of Object.keys(calls)) handlers[name] = (arg) => calls[name].push(arg);
  return { calls, handlers };
}

const sse = (...events) =>
  events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join('');

test('limit event calls onLimit once and the stream still ends with onDone once', async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sse(
        { type: 'limit', kind: 'session', label: 'chat limit · 20 / 20' },
        { type: 'token', text: 'hi' },
        '[DONE]',
      )));
      controller.close();
    },
  });
  stubFetch(new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
  const { calls, handlers } = makeHandlers();

  await sendMessageStream('hello', [], handlers);

  assert.deepEqual(calls.onLimit, [{ kind: 'session', label: 'chat limit · 20 / 20' }]);
  assert.deepEqual(calls.onToken, ['hi']);
  assert.equal(calls.onDone.length, 1);
  assert.equal(calls.onError.length, 0);
});

test('429 JSON calls onRateLimit, never onError or onDone', async () => {
  stubFetch(new Response(
    JSON.stringify({ error: 'rate_limited', message: 'slow down', retryAfterSeconds: 30 }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '30' } },
  ));
  const { calls, handlers } = makeHandlers();

  await sendMessageStream('hello', [], handlers);

  assert.deepEqual(calls.onRateLimit, [{ message: 'slow down', retryAfterSeconds: 30 }]);
  assert.equal(calls.onError.length, 0);
  assert.equal(calls.onDone.length, 0);
});

test('429 with a non-JSON body falls back to the default message and Retry-After header', async () => {
  stubFetch(new Response('<html>nope</html>', { status: 429, headers: { 'Retry-After': '7' } }));
  const { calls, handlers } = makeHandlers();

  await sendMessageStream('hello', [], handlers);

  assert.deepEqual(calls.onRateLimit, [
    { message: 'easy there — try again in a few seconds', retryAfterSeconds: 7 },
  ]);
  assert.equal(calls.onError.length, 0);
});

test('500 still maps to the generic error message', async () => {
  stubFetch(new Response('boom', { status: 500 }));
  const { calls, handlers } = makeHandlers();

  await sendMessageStream('hello', [], handlers);

  assert.deepEqual(calls.onError, ['Something went wrong — try again in a moment']);
  assert.equal(calls.onRateLimit.length, 0);
  assert.equal(calls.onDone.length, 0);
});
