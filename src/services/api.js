export async function sendMessageStream(message, history = [], { onToken, onEmbeds, onDone, onError } = {}) {
  let response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        history: history.map(({ role, content }) => ({ role, content })),
      }),
    });
  } catch {
    onError?.('Chat is unavailable — check your connection and try again');
    return;
  }

  if (!response.ok) {
    const msg =
      response.status >= 500 ? 'Something went wrong — try again in a moment' :
      response.status === 422 ? 'Message too long or invalid — please shorten it' :
      'Failed to send message';
    onError?.(msg);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') { onDone?.(); return; }
        try {
          const event = JSON.parse(data);
          if (event.type === 'token') onToken?.(event.text);
          else if (event.type === 'embeds') onEmbeds?.(event.blocks);
          else if (event.type === 'error') onError?.(event.message);
        } catch { /* malformed event, skip */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onDone?.();
}
