import { GoogleGenAI } from '@google/genai';

let _client = null;
function getClient() {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  return _client;
}

export async function embed(text) {
  const response = await getClient().models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
  });
  return response.embeddings[0].values;
}

export async function embedBatch(texts) {
  if (texts.length === 0) return [];
  const response = await getClient().models.embedContent({
    model: 'gemini-embedding-001',
    contents: texts,
  });
  return response.embeddings.map(e => e.values);
}
