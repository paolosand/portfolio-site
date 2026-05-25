// api/chat.js
import { check, filterResponse } from './lib/guard.js';
import { loadKnowledge, generate } from './lib/rag.js';

let _knowledge = null;
function getKnowledge() {
  if (!_knowledge) _knowledge = loadKnowledge();
  return _knowledge;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

  try {
    const guardResult = check(query);
    if (guardResult.isMalicious) {
      res.status(200).json({ response: guardResult.response, blocked: true });
      return;
    }

    const context = getKnowledge();
    const responseText = await generate(query, context, history);
    const filtered = filterResponse(responseText);

    res.status(200).json({ response: filtered, blocked: false });
  } catch (err) {
    console.error('Chat handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
