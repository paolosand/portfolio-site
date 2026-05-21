import { useState, useCallback, useRef } from 'react';
import { sendMessage } from '../services/api';

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

    const history = messagesRef.current.slice(-4).concat(userMsg);
    messagesRef.current = [...messagesRef.current, userMsg];
    setMessages(prev => [...prev, userMsg]);

    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(userMessage, history);

      const assistantMsg = {
        role: 'assistant',
        content: response.response,
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
