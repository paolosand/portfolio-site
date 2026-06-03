import { useState, useCallback, useRef } from 'react';
import { sendMessageStream } from '../services/api';

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

  const _executeStream = useCallback(async (userText, apiHistory) => {
    const emptyAssistant = {
      role: 'assistant',
      blocks: [{ type: 'text', content: '' }],
      timestamp: new Date().toISOString(),
    };
    messagesRef.current = [...messagesRef.current, emptyAssistant];
    setMessages(prev => [...prev, emptyAssistant]);
    setIsLoading(true);
    setError(null);

    let streamText = '';
    let streamEmbeds = [];

    await sendMessageStream(userText, apiHistory, {
      onToken: (text) => {
        streamText += text;
        setMessages(prev => {
          const msgs = [...prev];
          const last = { ...msgs[msgs.length - 1] };
          last.blocks = [{ type: 'text', content: streamText }];
          msgs[msgs.length - 1] = last;
          return msgs;
        });
      },
      onEmbeds: (blocks) => {
        streamEmbeds = blocks;
      },
      onDone: () => {
        const finalBlocks = [{ type: 'text', content: streamText }, ...streamEmbeds];
        const finalMsg = { ...emptyAssistant, blocks: finalBlocks };
        messagesRef.current = [...messagesRef.current.slice(0, -1), finalMsg];
        if (streamEmbeds.length > 0) {
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = finalMsg;
            return msgs;
          });
        }
        setIsLoading(false);
      },
      onError: (msg) => {
        messagesRef.current = messagesRef.current.slice(0, -1);
        setMessages(prev => prev.slice(0, -1));
        setError(msg || 'Chat is unavailable — try again in a moment');
        setIsLoading(false);
      },
    });
  }, []);

  const send = useCallback(async (userMessage) => {
    const userMsg = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    const apiHistory = messagesRef.current.slice(-4).map(m => ({
      role: m.role,
      content: m.role === 'assistant' ? blocksToContent(m.blocks) : m.content,
    }));

    lastUserTextRef.current = userMessage;
    lastApiHistoryRef.current = apiHistory;

    messagesRef.current = [...messagesRef.current, userMsg];
    setMessages(prev => [...prev, userMsg]);

    await _executeStream(userMessage, apiHistory);
  }, [_executeStream]);

  // Greeting: no user message added to history, just an assistant message
  const greet = useCallback(async () => {
    await _executeStream('__greeting', []);
  }, [_executeStream]);

  const retry = useCallback(async () => {
    const text = lastUserTextRef.current;
    if (!text) return;
    await _executeStream(text, lastApiHistoryRef.current);
  }, [_executeStream]);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    lastUserTextRef.current = null;
    lastApiHistoryRef.current = [];
  }, []);

  return { messages, isLoading, error, send, greet, retry, clearError, reset };
}
