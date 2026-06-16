import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, diff } from './fingerprint.js';

test('build copies head values', () => {
  assert.deepEqual(build({ github: 'a', vercel: 'b', curated: 'c' }), { github: 'a', vercel: 'b', curated: 'c' });
});

test('diff reports unchanged', () => {
  const fp = { github: 'a', vercel: 'b', curated: 'c' };
  assert.deepEqual(diff(fp, { ...fp }), { changed: [], anyChanged: false });
});

test('diff reports only changed sources', () => {
  const prev = { github: 'a', vercel: 'b', curated: 'c' };
  const next = { github: 'a2', vercel: 'b', curated: 'c' };
  assert.deepEqual(diff(prev, next), { changed: ['github'], anyChanged: true });
});

test('missing prev means everything changed', () => {
  const next = { github: 'a', vercel: 'b', curated: 'c' };
  assert.deepEqual(diff(null, next), { changed: ['github', 'vercel', 'curated'], anyChanged: true });
});
