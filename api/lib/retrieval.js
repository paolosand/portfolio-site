import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { embed } from './embeddings.js';
import { loadKnowledge } from './rag.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_FILE = join(__dirname, '..', 'knowledge', 'vectors.json');

let _records = null;

function loadRecords() {
  if (_records) return _records;
  if (!existsSync(VECTORS_FILE)) return null;
  _records = JSON.parse(readFileSync(VECTORS_FILE, 'utf8'));
  return _records;
}

export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function rankChunks(queryVec, records, k) {
  return records
    .map(r => ({ ...r, score: cosineSimilarity(queryVec, r.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export async function queryRelevant(queryText, k = 6) {
  const records = loadRecords();
  if (!records) {
    // Fallback: return all knowledge file content as a flat string
    const docs = loadKnowledge();
    return docs.map(d => `[${d.metadata.source}]\n${d.content}`).join('\n\n---\n\n');
  }
  const queryVec = await embed(queryText);
  const top = rankChunks(queryVec, records, k);
  return top
    .map(r => `[${r.metadata.source} · ${r.metadata.type}]\n${r.text}`)
    .join('\n\n---\n\n');
}
