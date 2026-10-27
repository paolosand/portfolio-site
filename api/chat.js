import './_lib/tracing.js'; // must be first: registers the OTel SDK before any span is created
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from './_lib/chatHandler.js';
import { generate } from './_lib/rag.js';
import { createLimiter } from './_lib/limiter.js';
import { createMemoryStore, getDefaultStore } from './_lib/store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getProjectIds() {
  try {
    const raw = readFileSync(join(__dirname, '..', 'src', 'data', 'portfolio.json'), 'utf8');
    const json = JSON.parse(raw);
    // Only projects have stable .id fields. Work IDs are hardcoded in buildSystemPrompt defaults.
    return (json.projects ?? []).map(p => p.id);
  } catch {
    return [];
  }
}

// Used as-is: trimming here would change every hash (and reset the per-IP counters).
const salt = process.env.LIMITS_IP_SALT ?? '';
// Loud, not fatal: an unsalted IP hash is still a hash, and the chat must stay up.
if (process.env.VERCEL_ENV === 'production' && !salt.trim()) {
  console.error('[chat] LIMITS_IP_SALT is not set in production: IP hashes are unsalted. Set it in Vercel env.');
}

const projectIds = getProjectIds();
const workIds = []; // use buildSystemPrompt defaults

export default createHandler({
  generate,
  // No Redis env (local dev): an in-memory store keeps the limits working per instance.
  limiter: createLimiter({ store: getDefaultStore() ?? createMemoryStore() }),
  salt,
  projectIds,
  workIds,
});
