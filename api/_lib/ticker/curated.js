import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', '..', '_data', 'ticker-curated.json');

function load() {
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return [];
  }
}

export function head() {
  return createHash('sha256').update(JSON.stringify(load())).digest('hex').slice(0, 12);
}

export function fetchLines() {
  return load().map((entry, i) => ({
    id: `curated:${i}`,
    label: entry.label,
    text: entry.text,
    source: 'curated',
  }));
}
