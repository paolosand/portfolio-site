import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLines, head } from './curated.js';

test('fetchLines maps curated json to Line shape with curated source + stable id', () => {
  const lines = fetchLines();
  assert.ok(lines.length >= 1);
  for (const l of lines) {
    assert.equal(l.source, 'curated');
    assert.ok(typeof l.id === 'string' && l.id.startsWith('curated:'));
    assert.ok(typeof l.label === 'string' && l.label.length > 0);
    assert.ok(typeof l.text === 'string' && l.text.length > 0);
  }
});

test('head is a stable non-empty string', () => {
  assert.equal(head(), head());
  assert.ok(head().length > 0);
});
