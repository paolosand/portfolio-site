const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchWithRetry(url, options, retries = 3, timeoutMs = 30000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      // Wait before retrying (exponential backoff)
      await new Promise(res => setTimeout(res, attempt * 1000));
    }
  }
}

export async function sendMessage(message, conversationId = null) {
  const response = await fetchWithRetry(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: message,
      conversation_id: conversationId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
}

export async function getKnowledgeGraph() {
  const response = await fetchWithRetry(`${API_URL}/api/knowledge-graph`);

  if (!response.ok) {
    throw new Error('Failed to fetch knowledge graph');
  }

  return response.json();
}
