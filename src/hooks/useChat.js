import { useState, useCallback, useRef, useEffect } from 'react';
import { sendMessageStream } from '../services/api';

const STORAGE_KEY = 'paogpt:session';
const SESSION_ID_KEY = 'paogpt:sessionId';

function loadStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// One id per conversation, reused across all turns so Langfuse groups them into a
// single session. Persisted in sessionStorage alongside the messages so a page
// reload continues the same conversation/session rather than starting a new one.
function loadOrCreateSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function saveSessionId(id) {
  try {
    sessionStorage.setItem(SESSION_ID_KEY, id);
  } catch {
    // storage unavailable — non-fatal, the id still works for this page life
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
  // Lazy ref init (not useRef(loadOrCreateSessionId())): that form calls the
  // initializer on every render, not just the first.
  const sessionIdRef = useRef(null);
  if (sessionIdRef.current === null) sessionIdRef.current = loadOrCreateSessionId();
  const [isLoading, setIsLoading] = useState(false);
  // Mirrors isLoading for synchronous reads inside callbacks — state alone can't
  // guard re-entrancy since a callback's closure may see a stale pre-update value.
  const isLoadingRef = useRef(false);
  const [error, setError] = useState(null);
  const lastUserTextRef = useRef(null);
  const lastApiHistoryRef = useRef([]);
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  const setLoading = useCallback((value) => {
    isLoadingRef.current = value;
    setIsLoading(value);
  }, []);

  const clearNoticeTimer = useCallback(() => {
    if (noticeTimerRef.current !== null) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }, []);

  // Transient message (e.g. rate limited) that clears itself. A new notice replaces
  // the old one, so its timer must not be cut short by the previous timer firing.
  const showNotice = useCallback((message, seconds) => {
    clearNoticeTimer();
    setNotice(message);
    noticeTimerRef.current = setTimeout(() => {
      noticeTimerRef.current = null;
      setNotice(null);
    }, Math.max(0, Number(seconds) || 0) * 1000);
  }, [clearNoticeTimer]);

  useEffect(() => clearNoticeTimer, [clearNoticeTimer]);

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
    setLoading(true);
    setError(null);

    let streamText = '';
    let streamEmbeds = [];
    let streamLimit = null;

    await sendMessageStream(userText, apiHistory, {
      sessionId: sessionIdRef.current,
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
      onLimit: (limit) => {
        streamLimit = limit;
      },
      onDone: () => {
        const finalBlocks = [{ type: 'text', content: streamText }, ...streamEmbeds];
        const finalMsg = { ...emptyAssistant, blocks: finalBlocks };
        // Lives on the message so sessionStorage persistence carries it across reloads.
        if (streamLimit) finalMsg.limit = streamLimit;
        messagesRef.current = [...messagesRef.current.slice(0, -1), finalMsg];
        if (streamEmbeds.length > 0 || streamLimit) {
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = finalMsg;
            return msgs;
          });
        }
        setLoading(false);
      },
      onError: (msg) => {
        messagesRef.current = messagesRef.current.slice(0, -1);
        setMessages(prev => prev.slice(0, -1));
        setError(msg || 'Chat is unavailable — try again in a moment');
        setLoading(false);
      },
      onRateLimit: ({ message, retryAfterSeconds }) => {
        // Drop the empty placeholder and the unanswered user message (if this turn
        // added one) so history stays clean; the user can simply resend later.
        let next = messagesRef.current.slice(0, -1);
        if (next[next.length - 1]?.role === 'user') next = next.slice(0, -1);
        messagesRef.current = next;
        setMessages(next);
        showNotice(message, retryAfterSeconds);
        setLoading(false);
      },
    });
  }, [setLoading, showNotice]);

  const send = useCallback(async (userMessage) => {
    // Re-entrancy guard: without this, any caller wired to send() — chip buttons,
    // a future double-click, anything — can fire while a stream is already in
    // flight. Both requests would then race to mutate messages via the same
    // "last message" index, corrupting the conversation. Checked via ref, not the
    // isLoading state value, so it's accurate even inside this closure.
    if (isLoadingRef.current) return;

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
    if (isLoadingRef.current) return;
    await _executeStream('__greeting', []);
  }, [_executeStream]);

  const retry = useCallback(async () => {
    if (isLoadingRef.current) return;
    const text = lastUserTextRef.current;
    if (!text) return;
    await _executeStream(text, lastApiHistoryRef.current);
  }, [_executeStream]);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    clearNoticeTimer();
    setNotice(null);
    lastUserTextRef.current = null;
    lastApiHistoryRef.current = [];
    clearStored();
    // A restart is a new conversation — give it its own session in Langfuse
    // rather than lumping it into the one being abandoned.
    sessionIdRef.current = crypto.randomUUID();
    saveSessionId(sessionIdRef.current);
  }, [clearNoticeTimer]);

  return { messages, isLoading, error, notice, send, greet, retry, clearError, reset };
}
