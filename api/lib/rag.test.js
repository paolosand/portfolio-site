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
