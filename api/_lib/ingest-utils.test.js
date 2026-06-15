import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkMarkdown, chunkPortfolioJson, chunkCode } from './ingest-utils.js';

test('chunkMarkdown: splits on ## headers', () => {
  const md = `# Title\n\nIntro text.\n\n## Section One\n\nContent one.\n\n## Section Two\n\nContent two.`;
  const chunks = chunkMarkdown(md, 'experience');
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.some(c => c.text.includes('Content one.')));
  assert.ok(chunks.some(c => c.text.includes('Content two.')));
});

test('chunkMarkdown: metadata includes source and section', () => {
  const md = `## Work Experience\n\nI worked at Stratpoint.`;
  const chunks = chunkMarkdown(md, 'experience');
  assert.strictEqual(chunks[0].metadata.source, 'experience');
  assert.ok(typeof chunks[0].metadata.section === 'string');
});

test('chunkMarkdown: skips empty sections', () => {
  const md = `## Empty\n\n## Full\n\nHas content.`;
  const chunks = chunkMarkdown(md, 'experience');
  assert.ok(chunks.every(c => c.text.trim().length > 0));
});

test('chunkPortfolioJson: produces one chunk per project', () => {
  const json = {
    projects: [
      { id: 'foo', title: 'Foo', description: 'A thing.', tags: ['JS'], links: {} },
      { id: 'bar', title: 'Bar', description: 'Another.', tags: ['Python'], links: {} },
    ],
    experience: [],
    education: [],
    skills: {},
  };
  const chunks = chunkPortfolioJson(json);
  const projectChunks = chunks.filter(c => c.metadata.type === 'project');
  assert.strictEqual(projectChunks.length, 2);
  assert.ok(projectChunks.some(c => c.metadata.entity_id === 'foo'));
});

test('chunkPortfolioJson: includes project title in text', () => {
  const json = {
    projects: [{ id: 'chuloopa', title: 'CHULOOPA', description: 'Drum looper.', tags: ['ChucK'], links: {} }],
    experience: [],
    education: [],
    skills: {},
  };
  const chunks = chunkPortfolioJson(json);
  assert.ok(chunks.some(c => c.text.includes('CHULOOPA')));
});

test('chunkCode: returns single chunk with file metadata', () => {
  const code = `fun int add(int a, int b) { return a + b; }`;
  const chunk = chunkCode(code, { repo: 'CHULOOPA', file: 'chuloopa_main.ck' });
  assert.strictEqual(chunk.metadata.repo, 'CHULOOPA');
  assert.strictEqual(chunk.metadata.file, 'chuloopa_main.ck');
  assert.ok(chunk.text.includes('add'));
});
