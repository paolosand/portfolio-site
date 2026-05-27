import { useChat } from '../../hooks/useChat';
import WelcomeScreen from './WelcomeScreen';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import './ChatInterface.css';

export default function ChatInterface() {
  const { messages, isLoading, error, send, retry, clearError, reset } = useChat();

  return (
    <div className="chat-shell">
      <div className="chat-hdr">
        <span className="chat-hdr-mark">pao-gpt</span>
        {messages.length > 0 && (
          <button
            className="chat-hdr-restart"
            onClick={reset}
            aria-label="Start a new conversation"
          >
            ↺ restart
          </button>
        )}
      </div>
      <div className="chat-paper">
        {messages.length === 0
          ? <WelcomeScreen onPick={send} />
          : <MessageList messages={messages} isLoading={isLoading} />}
      </div>
      {error && (
        <div className="chat-error" role="alert">
          <span className="chat-error-msg">⚠ {error}</span>
          <div className="chat-error-actions">
            <button
              className="chat-error-retry"
              onClick={retry}
              disabled={isLoading}
            >
              ↺ retry
            </button>
            <button className="chat-error-dismiss" onClick={clearError}>
              ✕
            </button>
          </div>
        </div>
      )}
      <ChatInput onSend={send} disabled={isLoading} />
    </div>
  );
}
