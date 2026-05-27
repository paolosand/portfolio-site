import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import ProjectEmbed from './embeds/ProjectEmbed';
import WorkEmbed from './embeds/WorkEmbed';
import './MessageList.css';

function AssistantBlocks({ blocks = [] }) {
  return blocks.map((block, i) => {
    if (block.type === 'text') {
      return <ReactMarkdown key={i}>{block.content}</ReactMarkdown>;
    }
    if (block.type === 'project') {
      return <ProjectEmbed key={i} id={block.id} />;
    }
    if (block.type === 'work') {
      return <WorkEmbed key={i} id={block.id} />;
    }
    return null;
  });
}

export default function MessageList({ messages, isLoading }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading]);

  return (
    <div className="msgs">
      {messages.map((m, i) => (
        <div className={`msg ${m.role}`} key={i}>
          <div className="from">{m.role === 'user' ? 'you ▸' : 'pao-gpt ▸'}</div>
          <div className="bubble">
            {m.role === 'user'
              ? <p>{m.content}</p>
              : <AssistantBlocks blocks={m.blocks} />}
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
