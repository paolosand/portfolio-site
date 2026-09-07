import { useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useStickToBottom } from '../../hooks/useStickToBottom';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChipBar from './ChipBar';
import './ChatInterface.css';

export default function ChatInterface() {
  const { messages, isLoading, error, send, greet, retry, clearError, reset } = useChat();
  const hasSentMessage = messages.some((m) => m.role === 'user');
  const { containerRef, onScroll, scrollToBottom } = useStickToBottom();

  useEffect(() => {
    if (messages.length === 0) greet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A brand-new turn always brings you to the bottom; growth *within* a message
  // (the reply typing out) is left to the stick-to-bottom observer so scrolling
  // up to re-read isn't fought.
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleReset = () => {
    reset();
    // Small delay so state clears before re-greeting
    setTimeout(() => greet(), 50);
  };

  return (
    <div className="chat-shell">
      <div className="chat-hdr">
        <span className="chat-hdr-mark">pao-gpt</span>
        <button
          className="chat-hdr-restart"
          onClick={handleReset}
          aria-label="Start a new conversation"
        >
          ↺ restart
        </button>
      </div>
      <div className="chat-paper" ref={containerRef} onScroll={onScroll}>
        <MessageList messages={messages} isLoading={isLoading} onPick={send} />
      </div>
      {error && (
        <div className="chat-error" role="alert">
          <span className="chat-error-msg">⚠ {error}</span>
          <div className="chat-error-actions">
            <button className="chat-error-retry" onClick={retry} disabled={isLoading}>
              ↺ retry
            </button>
            <button className="chat-error-dismiss" onClick={clearError}>✕</button>
          </div>
        </div>
      )}
      {/* Suggestion chips are a starting-point hint for an empty conversation —
          once the user has actually asked something, they just eat space
          that should go to the messages themselves. */}
      {messages.length > 0 && !hasSentMessage && <ChipBar onPick={send} disabled={isLoading} />}
      <ChatInput onSend={send} disabled={isLoading} />
    </div>
  );
}
