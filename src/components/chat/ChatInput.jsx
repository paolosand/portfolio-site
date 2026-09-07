import { useState, useRef, useEffect } from 'react';
import './ChatInput.css';

export default function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Autofocus pops the keyboard immediately on a touch device, which is
    // exactly the "landed on chat and the keyboard is already up" bug.
    // Only fine-pointer (mouse/trackpad) devices get the convenience.
    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
    if (!isCoarsePointer) inputRef.current?.focus();
  }, []);

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
        send <span className="send-glyph">↵</span>
      </button>
    </form>
  );
}
