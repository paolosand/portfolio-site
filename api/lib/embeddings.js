import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-embedding-001';

let _client = null;
function getClient() {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  return _client;
}

export async function embed(text) {
  const response = await getClient().models.embedContent({
    model: MODEL,
    contents: text,
  });
  return response.embeddings[0].values;
}

export async function embedBatch(texts) {
  if (texts.length === 0) return [];
  try {
    const response = await getClient().models.embedContent({
      model: MODEL,
      contents: texts,
    });
    return response.embeddings.map(e => e.values);
  } catch (err) {
    // gemini-embedding-001 enforces a stricter per-request limit than text-embedding-004.
    // If the batched array is rejected, degrade to one call per text rather than failing the run.
    console.warn(`[embeddings] batch of ${texts.length} failed (${err.message}); falling back to single-item embedding`);
    const out = [];
    for (const text of texts) {
      out.push(await embed(text));
    }
    return out;
  }
}
