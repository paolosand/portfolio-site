import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLimitState } from './limitState.js';

const SESSION_NOTE = "chat's full — email paolo to keep going";
const MONTHLY_NOTE = 'pao-gpt is resting until next month';

const assistant = (extra = {}) => ({
  role: 'assistant',
  blocks: [{ type: 'text', content: 'hi' }],
  ...extra,
});
const user = { role: 'user', content: 'hello' };

test('empty list -> null', () => {
  assert.equal(getLimitState([]), null);
});

test('non-array -> null', () => {
  assert.equal(getLimitState(undefined), null);
});

test('session limit on last assistant message', () => {
  const r = getLimitState([user, assistant({ limit: { kind: 'session', label: 'chat full' } })]);
  assert.deepEqual(r, { kind: 'session', label: 'chat full', inputNote: SESSION_NOTE });
});

test('monthly limit on last assistant message', () => {
  const r = getLimitState([assistant({ limit: { kind: 'monthly', label: 'resting' } })]);
  assert.deepEqual(r, { kind: 'monthly', label: 'resting', inputNote: MONTHLY_NOTE });
});

test('limit message followed by a user message -> null', () => {
  assert.equal(
    getLimitState([assistant({ limit: { kind: 'session', label: 'x' } }), user]),
    null,
  );
});

test('plain assistant message -> null', () => {
  assert.equal(getLimitState([user, assistant()]), null);
});

test('malformed limit: string / null / array -> null', () => {
  assert.equal(getLimitState([assistant({ limit: 'session' })]), null);
  assert.equal(getLimitState([assistant({ limit: null })]), null);
  assert.equal(getLimitState([assistant({ limit: ['session'] })]), null);
});

test('missing or unknown kind -> session note; missing label -> empty string', () => {
  assert.deepEqual(getLimitState([assistant({ limit: {} })]), {
    kind: 'session',
    label: '',
    inputNote: SESSION_NOTE,
  });
  const r = getLimitState([assistant({ limit: { kind: 'weird', label: 'l' } })]);
  assert.equal(r.inputNote, SESSION_NOTE);
  assert.equal(r.label, 'l');
});

test('limit on a user message is ignored', () => {
  assert.equal(getLimitState([{ ...user, limit: { kind: 'session', label: 'x' } }]), null);
});
