import { GoogleGenAI, Type } from '@google/genai';
import { buildSystemPrompt } from './personality.js';
import { queryRelevant } from './retrieval.js';
import { withRetry } from './retry.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, '..', 'knowledge');
const MODEL = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type:    { type: Type.STRING },
      content: { type: Type.STRING },
      id:      { type: Type.STRING },
      items:   { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['type'],
  },
};

const GENERATION_CONFIG = {
  temperature: 0.7,
  maxOutputTokens: 2048,
  responseMimeType: 'application/json',
  responseSchema: RESPONSE_SCHEMA,
};

let _client = null;
function getClient() {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  return _client;
}

// Fallback: load all knowledge markdown files as flat docs (used by retrieval.js when vectors.json absent)
export function loadKnowledge() {
  const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
  return files.map(file => ({
    content: readFileSync(join(KNOWLEDGE_DIR, file), 'utf8'),
    metadata: { source: basename(file, '.md') },
  }));
}

// Parse the model's JSON array of blocks. Returns null on truncated/malformed output
// so the caller shows a graceful message instead of leaking raw JSON to the user.
function parseBlocks(text) {
  if (typeof text !== 'string') return null;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // truncated or malformed JSON — fall through to graceful fallback
  }
  return null;
}

export async function generate(query, history, { projectIds = [], workIds = [] } = {}) {
  const client = getClient();
  const contextBlock = await queryRelevant(query);

  const recentHistory = history.slice(-5);
  const historyBlock = recentHistory
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const today = new Date().toISOString().split('T')[0];
  const systemPrompt = buildSystemPrompt(projectIds, workIds);

  const prompt = [
    systemPrompt,
    `\nToday's date: ${today}`,
    '\n\n--- CONTEXT ---\n',
    contextBlock,
    historyBlock ? `\n\n--- CONVERSATION HISTORY ---\n${historyBlock}` : '',
    `\n\n--- QUESTION ---\n${query}`,
  ].join('');

  const response = await withRetry(() => client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: GENERATION_CONFIG,
  }));

  const blocks = parseBlocks(response.text);
  if (blocks) return blocks;

  const finishReason = response?.candidates?.[0]?.finishReason;
  console.error('[rag] unparseable model output', {
    finishReason,
    raw: typeof response.text === 'string' ? response.text.slice(0, 300) : response.text,
  });
  return [{ type: 'text', content: "hmm, my response got a little tangled on that one — mind asking again? a slightly more specific question usually helps." }];
}
