import { useState, useCallback, useRef, useEffect } from 'react';
import { sendMessageStream } from '../services/api';

const STORAGE_KEY = 'paogpt:session';

function loadStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStored(messages) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // storage unavailable (private mode / quota) — non-fatal
  }
}

function clearStored() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function blocksToContent(blocks) {
  if (!blocks) return '';
  return blocks
    .filter(b => b.type === 'text')
    .map(b => b.content)
    .join('\n\n');
}

export function useChat() {
  const [messages, setMessages] = useState(loadStored);
  const messagesRef = useRef(messages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastUserTextRef = useRef(null);
  const lastApiHistoryRef = useRef([]);

  // Persist the conversation for this tab session. Skip while streaming so we don't
  // store half-finished assistant messages.
  useEffect(() => {
    if (!isLoading) saveStored(messages);
  }, [messages, isLoading]);

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
    clearStored();
  }, []);

  return { messages, isLoading, error, send, greet, retry, clearError, reset };
}
