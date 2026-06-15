import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadKnowledge } from './rag.js';

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
