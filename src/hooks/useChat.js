import { useState, useCallback, useRef } from 'react';
import { sendMessage } from '../services/api';

function blocksToContent(blocks) {
  if (!blocks) return '';
  return blocks
    .filter(b => b.type === 'text')
    .map(b => b.content)
    .join('\n\n');
}

export function useChat() {
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const send = useCallback(async (userMessage) => {
    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    // Build history before updating ref — matches original slice(-4).concat(userMsg) semantics
    const apiHistory = messagesRef.current.slice(-4).concat(userMsg).map(m => ({
      role: m.role,
      content: m.role === 'assistant' ? blocksToContent(m.blocks) : m.content,
    }));

    messagesRef.current = [...messagesRef.current, userMsg];
    setMessages(prev => [...prev, userMsg]);

    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(userMessage, apiHistory);

      const assistantMsg = {
        role: 'assistant',
        blocks: response.blocks,
        timestamp: new Date().toISOString(),
      };
      messagesRef.current = [...messagesRef.current, assistantMsg];
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message || 'Chat is unavailable — try again in a moment');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, send, reset };
}
