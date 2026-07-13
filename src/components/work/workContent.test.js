import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workRegistry } from '../../data/work/index.js';
import {
  BLOCK_REQUIRED_FIELDS,
  CHAPTER_SHAPES,
  flattenChapters,
  blockValidationError,
} from '../../data/work/blockTypes.js';

const portfolio = JSON.parse(
  readFileSync(new URL('../../data/portfolio.json', import.meta.url), 'utf8'),
);
const projectIds = new Set(portfolio.projects.map((p) => p.id));

function assertValidBlock(block, where) {
  const err = blockValidationError(block);
  assert.ok(!err, `${err} at ${where}`);
}

test('every registry key matches a portfolio project id', () => {
  for (const id of Object.keys(workRegistry)) {
    assert.ok(projectIds.has(id), `registry id "${id}" not in portfolio.json`);
  }
});

test('case studies contain well-formed chapters', async () => {
  for (const [id, load] of Object.entries(workRegistry)) {
    const { default: work } = await load();
    assert.equal(work.id, id, `case study id mismatch for "${id}"`);
    assert.ok(Array.isArray(work.chapters) && work.chapters.length > 0,
      `case study "${id}" has no chapters`);
    for (const [i, ch] of work.chapters.entries()) {
      const where = `${id}.chapters[${i}]`;
      assert.ok(ch.kicker && ch.kicker.trim(), `missing kicker at ${where}`);
      assert.ok(ch.title && ch.title.trim(), `missing title at ${where}`);
      const shape = CHAPTER_SHAPES[ch.shape];
      assert.ok(shape, `unknown shape "${ch.shape}" at ${where}`);
      if (shape.requiresMedia) {
        assert.ok(ch.media, `shape "${ch.shape}" requires media at ${where}`);
        assertValidBlock(ch.media, `${where}.media`);
      } else {
        assert.equal(ch.media, undefined,
          `shape "${ch.shape}" must not have top-level media at ${where}`);
      }
      assert.ok(Array.isArray(ch.blocks), `missing blocks[] at ${where}`);
      for (const [j, block] of ch.blocks.entries()) {
        assertValidBlock(block, `${where}.blocks[${j}]`);
      }
    }
  }
});

test('chuloopa chapters flatten to exactly the blocks shipped in PR #3', async () => {
  const { default: work } = await workRegistry.chuloopa();
  const flat = flattenChapters(work.chapters);
  const typeCounts = flat.reduce((m, b) => {
    m[b.type] = (m[b.type] || 0) + 1;
    return m;
  }, {});
  assert.deepEqual(typeCounts, {
    prose: 4,
    'ascii-diagram': 1,
    video: 2,
    image: 1,
    highlights: 1,
  });
  const videoIds = flat.filter((b) => b.type === 'video').map((b) => b.videoId).sort();
  assert.deepEqual(videoIds, ['YhnaJ4LI-jY', 'gqVEtp37bXs'].sort());
  const image = flat.find((b) => b.type === 'image');
  assert.equal(image.src, '/work/chuloopa-system-diagram.png');
  assert.equal(flat.find((b) => b.type === 'highlights').items.length, 5);
  const headings = flat.filter((b) => b.type === 'prose').map((b) => b.heading).sort();
  assert.deepEqual(headings,
    ['how it works', 'the hard parts', 'the itch', 'where it landed'].sort());
});

test('video block is valid with either a youtube videoId or a self-hosted src', () => {
  assert.equal(blockValidationError({ type: 'video', videoId: 'abc123' }), null);
  assert.equal(blockValidationError({ type: 'video', src: '/work/tabit-demo.mp4' }), null);
  assert.ok(blockValidationError({ type: 'video' }), 'video with neither must be invalid');
  assert.ok(blockValidationError({ type: 'image', src: '/x.png' }), 'image still needs alt');
  assert.equal(blockValidationError({ type: 'nope' }), 'unknown block type "nope"');
});
