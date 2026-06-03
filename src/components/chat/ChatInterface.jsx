import { useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChipBar from './ChipBar';
import './ChatInterface.css';

export default function ChatInterface() {
  const { messages, isLoading, error, send, greet, retry, clearError, reset } = useChat();

  useEffect(() => {
    greet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="chat-paper">
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
      {messages.length > 0 && <ChipBar onPick={send} />}
      <ChatInput onSend={send} disabled={isLoading} />
    </div>
  );
}
