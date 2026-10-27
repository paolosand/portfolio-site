import { useState, useRef, useEffect } from 'react';
import './ChatInput.css';

export default function ChatInput({ onSend, disabled, lockedNote }) {
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
    if (!v || disabled || lockedNote) return;
    onSend(v);
    setInput('');
  };

  return (
    <form className={`chat-input${lockedNote ? ' is-locked' : ''}`} onSubmit={handleSubmit}>
      <div className="field">
        <span className="caret">▌</span>
        {/* Never `disabled` while a reply streams: on mobile that blurs the
            field and dismisses the keyboard mid-conversation. A submit during
            streaming is already a no-op (handleSubmit + useChat re-entrancy
            guard), so the field just stays focused and ready. */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={lockedNote ? true : undefined}
          // A placeholder alone isn't a reliable accessible name; expose the note too.
          title={lockedNote || undefined}
          aria-label={lockedNote || undefined}
          placeholder={lockedNote ? lockedNote : disabled ? 'pao-gpt is typing…' : "ask anything — try 'what are you building?'"}
        />
      </div>
      <button type="submit" className="send" disabled={disabled || !!lockedNote || !input.trim()}>
        send <span className="send-glyph">↵</span>
      </button>
    </form>
  );
}
