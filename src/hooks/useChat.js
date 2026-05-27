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
  const lastUserTextRef = useRef(null);
  const lastApiHistoryRef = useRef([]);

  const send = useCallback(async (userMessage) => {
    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    // Build history before updating ref — previous messages only; current message sent separately as query
    const apiHistory = messagesRef.current.slice(-4).map(m => ({
      role: m.role,
      content: m.role === 'assistant' ? blocksToContent(m.blocks) : m.content,
    }));

    lastUserTextRef.current = userMessage;
    lastApiHistoryRef.current = apiHistory;

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

  // Retry the last failed API call without re-adding the user message
  const retry = useCallback(async () => {
    const text = lastUserTextRef.current;
    if (!text) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await sendMessage(text, lastApiHistoryRef.current);
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

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    lastUserTextRef.current = null;
    lastApiHistoryRef.current = [];
  }, []);

  return { messages, isLoading, error, send, retry, clearError, reset };
}
