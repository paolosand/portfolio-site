import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotateEmbeds } from './annotateEmbeds.js';

test('first occurrence of a project is full', () => {
  const msgs = [{ role: 'assistant', blocks: [{ type: 'text', content: 'a' }, { type: 'project', id: 'chuloopa' }] }];
  const out = annotateEmbeds(msgs);
  assert.equal(out[0].blocks[1]._embedRender, 'full');
});

test('repeat of the same project across messages is cite', () => {
  const msgs = [
    { role: 'assistant', blocks: [{ type: 'project', id: 'chuloopa' }] },
    { role: 'assistant', blocks: [{ type: 'project', id: 'chuloopa' }] },
  ];
  const out = annotateEmbeds(msgs);
  assert.equal(out[0].blocks[0]._embedRender, 'full');
  assert.equal(out[1].blocks[0]._embedRender, 'cite');
});

test('different projects are both full', () => {
  const msgs = [{ role: 'assistant', blocks: [{ type: 'project', id: 'chuloopa' }, { type: 'project', id: 'ascii-drone' }] }];
  const out = annotateEmbeds(msgs);
  assert.equal(out[0].blocks[0]._embedRender, 'full');
  assert.equal(out[0].blocks[1]._embedRender, 'full');
});

test('music dedups on artist-profile even when id is omitted', () => {
  const msgs = [
    { role: 'assistant', blocks: [{ type: 'music', id: 'artist-profile' }] },
    { role: 'assistant', blocks: [{ type: 'music' }] },
  ];
  const out = annotateEmbeds(msgs);
  assert.equal(out[0].blocks[0]._embedRender, 'full');
  assert.equal(out[1].blocks[0]._embedRender, 'cite');
});

test('user messages and non-embed blocks are untouched', () => {
  const msgs = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', blocks: [{ type: 'text', content: 'x' }, { type: 'contact' }, { type: 'chips', items: ['a'] }] },
  ];
  const out = annotateEmbeds(msgs);
  assert.equal(out[0].content, 'hi');
  assert.ok(!('_embedRender' in out[1].blocks[1]));
  assert.ok(!('_embedRender' in out[1].blocks[2]));
});
