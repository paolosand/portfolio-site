import { useEffect, useRef } from 'react';
import './MessageList.css';

export default function MessageList({ messages, isLoading }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.parentElement?.scrollTo({
      top: endRef.current.parentElement.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, isLoading]);

  return (
    <div className="msgs">
      {messages.map((m, i) => (
        <div className={`msg ${m.role}`} key={i}>
          <div className="from">{m.role === 'user' ? 'you ▸' : 'pao-gpt ▸'}</div>
          <div className="bubble">
            <p>{m.content}</p>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="msg assistant">
          <div className="from">pao-gpt ▸</div>
          <div className="bubble">
            <div className="typing"><span></span><span></span><span></span></div>
          </div>
        </div>
      )}
      <div ref={endRef}></div>
    </div>
  );
}
