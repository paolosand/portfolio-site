import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sanitizeHistory, sessionKeyFor } from './sanitize.js';

const msg = (role, content) => ({ role, content });

test('sanitizeHistory: non-array input -> []', () => {
  for (const bad of [undefined, null, 'x', 42, { length: 3 }]) {
    assert.deepEqual(sanitizeHistory(bad), []);
  }
});

test('sanitizeHistory: drops malformed entries', () => {
  const out = sanitizeHistory([
    null,
    7,
    msg('system', 'x'),
    { role: 'user', content: 123 },
    { role: 'user' },
    msg('user', 'ok'),
  ]);
  assert.deepEqual(out, [msg('user', 'ok')]);
});

test('sanitizeHistory: returns fresh {role, content} objects only', () => {
  const input = { role: 'assistant', content: 'hi', extra: 'x' };
  const [out] = sanitizeHistory([input]);
  assert.deepEqual(out, msg('assistant', 'hi'));
  assert.notEqual(out, input);
});

test('sanitizeHistory: keeps only the last 5 valid entries', () => {
  const input = Array.from({ length: 8 }, (_, i) => msg('user', `m${i}`));
  const out = sanitizeHistory(input);
  assert.deepEqual(out.map((m) => m.content), ['m3', 'm4', 'm5', 'm6', 'm7']);
});

test('sanitizeHistory: invalid entries do not count toward the last 5', () => {
  const input = [msg('user', 'a'), msg('user', 'b'), null, msg('user', 'c'), msg('system', 's')];
  assert.deepEqual(sanitizeHistory(input).map((m) => m.content), ['a', 'b', 'c']);
});

test('sanitizeHistory: truncates each message to 4000 chars', () => {
  const [out] = sanitizeHistory([msg('user', 'a'.repeat(5_000_000))]);
  assert.equal(out.content.length, 4000);
});

test('sanitizeHistory: total <= 12000, oldest dropped first', () => {
  const input = ['1', '2', '3', '4', '5'].map((c) => msg('user', c.repeat(4000)));
  const out = sanitizeHistory(input);
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((m) => m.content[0]), ['3', '4', '5']);
});

test('sessionKeyFor: accepts a UUID', () => {
  const id = randomUUID();
  assert.equal(sessionKeyFor(id, 'abc'), `s:${id}`);
});

test('sessionKeyFor: falls back to the ip hash for bad ids', () => {
  for (const bad of ['', undefined, null, 'a'.repeat(65), '../x', 12345, {}]) {
    assert.equal(sessionKeyFor(bad, 'abc'), 'ip:abc');
  }
});
