import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workRegistry } from '../../data/work/index.js';

const portfolio = JSON.parse(
  readFileSync(new URL('../../data/portfolio.json', import.meta.url), 'utf8'),
);
const projectIds = new Set(portfolio.projects.map((p) => p.id));

const BLOCK_REQUIRED_FIELDS = {
  prose: ['body'],
  'ascii-diagram': ['art'],
  video: ['videoId'],
  image: ['src', 'alt'],
  highlights: ['items'],
};

test('every registry key matches a portfolio project id', () => {
  for (const id of Object.keys(workRegistry)) {
    assert.ok(projectIds.has(id), `registry id "${id}" not in portfolio.json`);
  }
});

test('case studies contain only known, well-formed blocks', async () => {
  for (const [id, load] of Object.entries(workRegistry)) {
    const { default: work } = await load();
    assert.equal(work.id, id, `case study id mismatch for "${id}"`);
    assert.ok(Array.isArray(work.blocks) && work.blocks.length > 0,
      `case study "${id}" has no blocks`);
    for (const [i, block] of work.blocks.entries()) {
      const required = BLOCK_REQUIRED_FIELDS[block.type];
      assert.ok(required, `unknown block type "${block.type}" at ${id}.blocks[${i}]`);
      for (const field of required) {
        const value = block[field];
        const present = Array.isArray(value) ? value.length > 0
          : value != null && String(value).trim() !== '';
        assert.ok(present, `missing "${field}" at ${id}.blocks[${i}] (${block.type})`);
      }
    }
  }
});
