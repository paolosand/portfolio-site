import { useState, useRef, useEffect } from 'react';
import './ChatInput.css';

export default function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = input.trim();
    if (!v || disabled) return;
    onSend(v);
    setInput('');
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <div className="field">
        <span className="caret">▌</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? 'pao-gpt is typing…' : "ask anything — try 'what are you building?'"}
          disabled={disabled}
        />
      </div>
      <button type="submit" className="send" disabled={disabled || !input.trim()}>
        send <span style={{marginLeft: 6, color: 'var(--c-lemon)'}}>↵</span>
      </button>
    </form>
  );
}
