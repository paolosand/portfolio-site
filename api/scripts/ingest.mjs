import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedBatch } from '../lib/embeddings.js';
import { chunkMarkdown, chunkPortfolioJson, chunkCode } from '../lib/ingest-utils.js';
import { fetchFile } from '../lib/github-fetcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const KNOWLEDGE_DIR = join(__dirname, '..', 'knowledge');
const OUT_FILE = join(KNOWLEDGE_DIR, 'vectors.json');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GITHUB_FILES = [
  { owner: 'paolosand', repo: 'CHULOOPA', path: 'README.md' },
  { owner: 'paolosand', repo: 'CHULOOPA', path: 'chuloopa_main.ck' },
  { owner: 'paolosand', repo: 'CHULOOPA', path: 'spice_detector.ck' },
  { owner: 'paolosand', repo: 'Violence-Detector-with-Aggressor-Identification', path: 'README.md' },
  { owner: 'paolosand', repo: 'ascii_drone', path: 'README.md' },
];

async function collectChunks() {
  const chunks = [];

  // 1. Knowledge markdown files
  const mdFiles = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
  for (const file of mdFiles) {
    const content = readFileSync(join(KNOWLEDGE_DIR, file), 'utf8');
    const source = basename(file, '.md');
    chunks.push(...chunkMarkdown(content, source));
  }

  // 2. portfolio.json (site source of truth)
  const portfolioJson = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'portfolio.json'), 'utf8'));
  chunks.push(...chunkPortfolioJson(portfolioJson));

  // 3. GitHub repos
  for (const { owner, repo, path } of GITHUB_FILES) {
    const content = await fetchFile(owner, repo, path, GITHUB_TOKEN);
    if (!content) continue;
    chunks.push(chunkCode(content, { repo, file: path }));
  }

  return chunks;
}

async function run() {
  if (!process.env.GOOGLE_API_KEY) {
    console.warn('[ingest] GOOGLE_API_KEY not set — skipping embedding. ' +
      'The app will use the loadKnowledge() fallback until vectors.json is generated.');
    return;
  }

  console.log('[ingest] collecting chunks...');
  const chunks = await collectChunks();
  console.log(`[ingest] ${chunks.length} chunks collected`);

  console.log('[ingest] embedding...');
  const texts = chunks.map(c => c.text);
  const BATCH = 100;
  const allEmbeddings = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const vecs = await embedBatch(batch);
    allEmbeddings.push(...vecs);
    console.log(`[ingest] embedded ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
  }

  const records = chunks.map((chunk, i) => ({
    text: chunk.text,
    metadata: chunk.metadata,
    embedding: allEmbeddings[i],
  }));

  writeFileSync(OUT_FILE, JSON.stringify(records));
  console.log(`[ingest] wrote ${records.length} vectors to ${OUT_FILE}`);
}

run().catch(err => { console.error('[ingest] failed:', err); process.exit(1); });
