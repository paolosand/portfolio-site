import { Type } from '@google/genai';
import { withRetry } from '../retry.js';
import { GEMINI_MODEL, MAX_TEXT } from './constants.js';

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: { repo: { type: Type.STRING }, text: { type: Type.STRING } },
    required: ['repo', 'text'],
  },
};

function fallbackText(group) {
  const n = group.commits.length;
  return `${n} commit${n === 1 ? '' : 's'} on ${group.repo}`;
}

function toLine(repo, text) {
  let clean = String(text).toLowerCase().replace(/[.\s]+$/, '').trim();
  if (clean.length > MAX_TEXT) {
    const cut = clean.lastIndexOf(' ', MAX_TEXT - 1);
    clean = clean.slice(0, cut > 0 ? cut : MAX_TEXT - 1).trimEnd() + '…';
  }
  return { id: `gh:${repo}`, label: 'building', text: clean, source: 'github' };
}

function fallbackLines(groups) {
  return groups.map(g => toLine(g.repo, fallbackText(g)));
}

export async function summarizeCommitGroups(groups, client = null) {
  if (!groups.length) return [];
  if (!client) return fallbackLines(groups);

  const prompt = [
    'Summarize what the developer is working on, ONE line per repo.',
    'Voice: lowercase, terse, truthful to the commits, no trailing punctuation, no emoji.',
    `Each "text" must be <= ${MAX_TEXT} characters. Do not invent facts.`,
    'Return JSON array of { repo, text }.',
    '',
    JSON.stringify(groups),
  ].join('\n');

  try {
    const res = await withRetry(() => client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
    }));
    const parsed = JSON.parse(res.text);
    const byRepo = new Map(parsed.map(p => [p.repo, p.text]));
    return groups.map(g => byRepo.has(g.repo) ? toLine(g.repo, byRepo.get(g.repo)) : toLine(g.repo, fallbackText(g)));
  } catch (err) {
    console.warn('[ticker/summarize] gemini failed, using fallback', err);
    return fallbackLines(groups);
  }
}
