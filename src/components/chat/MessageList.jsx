import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ProjectEmbed from './embeds/ProjectEmbed';
import WorkEmbed from './embeds/WorkEmbed';
import MusicEmbed from './embeds/MusicEmbed';
import CitationChip from './embeds/CitationChip';
import ContactCard from './embeds/ContactCard';
import EmbedModal from './embeds/EmbedModal';
import { annotateEmbeds } from './embeds/annotateEmbeds';
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

function renderCard(block, i, onExpand) {
  if (block._embedRender === 'cite') {
    return <CitationChip key={i} type={block.type} id={block.id} onExpand={onExpand} />;
  }
  if (block.type === 'project') return <ProjectEmbed key={i} id={block.id} />;
  if (block.type === 'work')    return <WorkEmbed key={i} id={block.id} />;
  if (block.type === 'music')   return <MusicEmbed key={i} />;
  return null;
}

function AssistantBlocks({ blocks = [], isStreaming = false, onPick, onExpand }) {
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
          if (block.type === 'chips')   return <InlineChips key={i} items={block.items} onPick={onPick} />;
          if (block.type === 'contact') return <ContactCard key={i} subject={block.content} />;
          if (block.type === 'project' || block.type === 'work' || block.type === 'music') {
            return renderCard(block, i, onExpand);
          }
          return null;
        })}
      </div>
    </>
  );
}

export default function MessageList({ messages, isLoading, onPick }) {
  const endRef = useRef(null);
  const [openEmbed, setOpenEmbed] = useState(null);
  const annotated = annotateEmbeds(messages);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading]);

  return (
    <div className="msgs">
      {annotated.map((m, i) => {
        const isLastMsg = i === annotated.length - 1;
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
                    onExpand={setOpenEmbed}
                  />}
            </div>
          </div>
        );
      })}
      <div ref={endRef}></div>
      <EmbedModal embed={openEmbed} onClose={() => setOpenEmbed(null)} />
    </div>
  );
}
