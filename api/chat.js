import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, filterResponse } from './_lib/guard.js';
import { generate } from './_lib/rag.js';
import { isGreetingSentinel, GREETING_BLOCKS } from './_lib/personality.js';

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

const projectIds = getProjectIds();
const workIds = []; // use buildSystemPrompt defaults

function setSseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
}

function sendEvent(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  res.flush?.();
}

function streamText(res, text) {
  const tokens = text.match(/\S+\s*/g) ?? [];
  for (const token of tokens) {
    sendEvent(res, { type: 'token', text: token });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { query, history = [] } = req.body ?? {};

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    res.status(400).json({ error: 'query is required and must be a non-empty string' });
    return;
  }
  if (query.length > 2000) {
    res.status(400).json({ error: 'query must be 2000 characters or fewer' });
    return;
  }
  if (!Array.isArray(history)) {
    res.status(400).json({ error: 'history must be an array' });
    return;
  }

  setSseHeaders(res);

  try {
    // Greeting sentinel: return hardcoded blocks, skip RAG and guard
    if (isGreetingSentinel(query)) {
      const textBlock = GREETING_BLOCKS.find(b => b.type === 'text');
      const embedBlocks = GREETING_BLOCKS.filter(b => b.type !== 'text');
      if (textBlock) streamText(res, textBlock.content);
      if (embedBlocks.length > 0) sendEvent(res, { type: 'embeds', blocks: embedBlocks });
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const guardResult = check(query);
    if (guardResult.isMalicious) {
      streamText(res, guardResult.response);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const blocks = await generate(query, history, { projectIds, workIds });
    const filteredBlocks = blocks.map(block =>
      block.type === 'text'
        ? { ...block, content: filterResponse(block.content) }
        : block
    );

    const textContent = filteredBlocks
      .filter(b => b.type === 'text')
      .map(b => b.content)
      .join('\n\n');

    const embedBlocks = filteredBlocks.filter(b => b.type !== 'text');

    streamText(res, textContent);
    if (embedBlocks.length > 0) sendEvent(res, { type: 'embeds', blocks: embedBlocks });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      sendEvent(res, { type: 'error', message: 'Something went wrong — try again in a moment' });
      res.end();
    }
  }
}
