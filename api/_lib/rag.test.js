import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadKnowledge, usageDetailsFrom, notifyUsage } from './rag.js';

test('loadKnowledge: returns array of documents', () => {
  const docs = loadKnowledge();
  assert.ok(Array.isArray(docs));
  assert.ok(docs.length > 0);
});

test('loadKnowledge: each document has content and metadata', () => {
  const docs = loadKnowledge();
  for (const doc of docs) {
    assert.ok(typeof doc.content === 'string');
    assert.ok(doc.content.length > 0);
    assert.ok(typeof doc.metadata === 'object');
    assert.ok(typeof doc.metadata.source === 'string');
  }
});

test('loadKnowledge: loads known files', () => {
  const docs = loadKnowledge();
  const sources = docs.map(d => d.metadata.source);
  assert.ok(sources.some(s => s.includes('experience')));
  assert.ok(sources.some(s => s.includes('skills')));
});

test('generate: integration — returns valid blocks (requires GOOGLE_API_KEY)', async (t) => {
  if (!process.env.GOOGLE_API_KEY) { t.skip('GOOGLE_API_KEY not set'); return; }
  const { generate } = await import('./rag.js');
  const blocks = await generate('What projects have you worked on?', []);
  assert.ok(Array.isArray(blocks));
  assert.ok(blocks.length > 0);
  const textBlocks = blocks.filter(b => b.type === 'text');
  assert.ok(textBlocks.length > 0);
  for (const b of blocks) {
    assert.ok(typeof b.type === 'string');
    const validTypes = ['text', 'project', 'work', 'music', 'chips', 'contact'];
    assert.ok(validTypes.includes(b.type), `unknown type: ${b.type}`);
    if (b.type === 'text') assert.ok(typeof b.content === 'string');
    if (b.type === 'project' || b.type === 'work' || b.type === 'music') {
      assert.ok(typeof b.id === 'string');
    }
  }
});

test('usageDetailsFrom: output includes thinking tokens', () => {
  assert.deepEqual(
    usageDetailsFrom({ promptTokenCount: 4118, candidatesTokenCount: 86, thoughtsTokenCount: 408, totalTokenCount: 4612 }),
    { input: 4118, output: 494, total: 4612 },
  );
});

test('usageDetailsFrom: missing metadata gives zeros', () => {
  assert.deepEqual(usageDetailsFrom(undefined), { input: 0, output: 0, total: 0 });
});

test('usageDetailsFrom: missing thoughts counts as 0; total falls back to input+output', () => {
  assert.deepEqual(
    usageDetailsFrom({ promptTokenCount: 10, candidatesTokenCount: 5 }),
    { input: 10, output: 5, total: 15 },
  );
});

test('notifyUsage: passes metadata to the hook', () => {
  const seen = [];
  notifyUsage((u) => seen.push(u), { promptTokenCount: 1 });
  assert.deepEqual(seen, [{ promptTokenCount: 1 }]);
});

test('notifyUsage: no hook is fine; a throwing hook is swallowed', () => {
  notifyUsage(undefined, {});
  notifyUsage(() => { throw new Error('boom'); }, {});
});
