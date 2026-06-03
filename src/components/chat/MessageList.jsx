import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import ProjectEmbed from './embeds/ProjectEmbed';
import WorkEmbed from './embeds/WorkEmbed';
import './MessageList.css';

function AssistantBlocks({ blocks = [], isStreaming = false }) {
  const textBlocks = blocks.filter(b => b.type === 'text');
  const embedBlocks = blocks.filter(b => b.type !== 'text');
  const hasText = textBlocks.some(b => b.content);

  return (
    <>
      {textBlocks.map((block, i) => (
        <ReactMarkdown key={i}>{block.content}</ReactMarkdown>
      ))}
      {isStreaming && !hasText && <div className="typing-caret">▌</div>}
      {embedBlocks.length > 0 && (
        <div className="msg-embeds">
          {embedBlocks.map((block, i) => {
            if (block.type === 'project') return <ProjectEmbed key={i} id={block.id} />;
            if (block.type === 'work') return <WorkEmbed key={i} id={block.id} />;
            return null;
          })}
        </div>
      )}
    </>
  );
}

export default function MessageList({ messages, isLoading }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading]);

  return (
    <div className="msgs">
      {messages.map((m, i) => {
        const isLastMsg = i === messages.length - 1;
        return (
          <div className={`msg ${m.role}`} key={i}>
            <div className="from">{m.role === 'user' ? 'you ▸' : 'pao-gpt ▸'}</div>
            <div className="bubble">
              {m.role === 'user'
                ? <p>{m.content}</p>
                : <AssistantBlocks
                    blocks={m.blocks}
                    isStreaming={isLoading && isLastMsg}
                  />}
            </div>
          </div>
        );
      })}
      <div ref={endRef}></div>
    </div>
  );
}
