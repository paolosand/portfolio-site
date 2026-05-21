const API_URL = '';

export async function sendMessage(message, history = []) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        history: history.map(({ role, content }) => ({ role, content })),
      }),
    });
  } catch {
    throw new Error('Chat is unavailable — check your connection and try again');
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error('Something went wrong — try again in a moment');
    }
    if (response.status === 422) {
      throw new Error('Message too long or invalid — please shorten it');
    }
    throw new Error('Failed to send message');
  }

  return response.json();
}
