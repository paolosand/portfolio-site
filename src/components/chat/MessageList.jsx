import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import ProjectEmbed from './embeds/ProjectEmbed';
import WorkEmbed from './embeds/WorkEmbed';
import MusicEmbed from './embeds/MusicEmbed';
import './MessageList.css';

function InlineChips({ items, onPick }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="inline-chips">
      {items.map(chip => (
        <button key={chip} className="inline-chip" onClick={() => onPick(chip)}>
          {chip}
        </button>
      ))}
    </div>
  );
}

function AssistantBlocks({ blocks = [], isStreaming = false, onPick }) {
  const textBlocks = blocks.filter(b => b.type === 'text');
  const hasText = textBlocks.some(b => b.content);

  return (
    <>
      {textBlocks.map((block, i) => (
        <ReactMarkdown key={i}>{block.content}</ReactMarkdown>
      ))}
      {isStreaming && !hasText && <div className="typing-caret">▌</div>}
      <div className="msg-embeds">
        {blocks.filter(b => b.type !== 'text').map((block, i) => {
          if (block.type === 'project') return <ProjectEmbed key={i} id={block.id} />;
          if (block.type === 'work')    return <WorkEmbed key={i} id={block.id} />;
          if (block.type === 'music')   return <MusicEmbed key={i} />;
          if (block.type === 'chips')   return <InlineChips key={i} items={block.items} onPick={onPick} />;
          return null;
        })}
      </div>
    </>
  );
}

export default function MessageList({ messages, isLoading, onPick }) {
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
                    onPick={onPick}
                  />}
            </div>
          </div>
        );
      })}
      <div ref={endRef}></div>
    </div>
  );
}
