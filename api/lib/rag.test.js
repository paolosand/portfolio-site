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

test('generate: returns an array of blocks (integration — requires GOOGLE_API_KEY)', async (t) => {
  if (!process.env.GOOGLE_API_KEY) {
    t.skip('GOOGLE_API_KEY not set');
    return;
  }
  const { generate, loadKnowledge } = await import('./rag.js');
  const context = loadKnowledge();
  const blocks = await generate('What projects have you worked on?', context, []);
  assert.ok(Array.isArray(blocks), 'generate() must return an array');
  assert.ok(blocks.length > 0, 'must return at least one block');
  const textBlocks = blocks.filter(b => b.type === 'text');
  assert.ok(textBlocks.length > 0, 'must contain at least one text block');
  for (const b of blocks) {
    assert.ok(typeof b.type === 'string', 'each block must have a string type');
    assert.ok(b.type === 'text' || b.type === 'project' || b.type === 'work', `unknown type: ${b.type}`);
    if (b.type === 'text') assert.ok(typeof b.content === 'string', 'text block must have content');
    if (b.type === 'project' || b.type === 'work') assert.ok(typeof b.id === 'string', 'card block must have id');
  }
});
