import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ProjectEmbed from './embeds/ProjectEmbed';
import WorkEmbed from './embeds/WorkEmbed';
import MusicEmbed from './embeds/MusicEmbed';
import CitationChip from './embeds/CitationChip';
import ContactCard from './embeds/ContactCard';
import EmbedModal from './embeds/EmbedModal';
import { annotateEmbeds } from './embeds/annotateEmbeds';
import { useTypewriter, usePrefersReducedMotion } from '../../hooks/useTypewriter';
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

function AssistantBlocks({ blocks = [], animate = false, onReveal, onPick, onExpand }) {
  const reducedMotion = usePrefersReducedMotion();
  const typing = animate && !reducedMotion;

  const fullText = blocks.filter(b => b.type === 'text').map(b => b.content).join('\n\n');
  const { text, done } = useTypewriter(fullText, typing);
  const embeds = blocks.filter(b => b.type !== 'text');

  // Keep the latest characters in view as they type out.
  useEffect(() => {
    if (typing && !done) onReveal?.();
  }, [text, typing, done, onReveal]);

  return (
    <>
      <div className={`assistant-md${typing && !done ? ' is-typing' : ''}`}>
        <ReactMarkdown>{text}</ReactMarkdown>
        {typing && !done && !text && <span className="typing-caret">▌</span>}
      </div>
      {done && embeds.length > 0 && (
        <div className={`msg-embeds${typing ? ' msg-embeds-enter' : ''}`}>
          {embeds.map((block, i) => {
            if (block.type === 'chips')   return <InlineChips key={i} items={block.items} onPick={onPick} />;
            if (block.type === 'contact') return <ContactCard key={i} subject={block.content} />;
            if (block.type === 'project' || block.type === 'work' || block.type === 'music') {
              return renderCard(block, i, onExpand);
            }
            return null;
          })}
        </div>
      )}
    </>
  );
}

export default function MessageList({ messages, isLoading, onPick }) {
  const endRef = useRef(null);
  const [openEmbed, setOpenEmbed] = useState(null);
  const annotated = annotateEmbeds(messages);

  // Messages already present when this view mounts (restored from a prior
  // session) should render fully; only replies that arrive afterward type out.
  const [seenCount] = useState(messages.length);

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, isLoading, scrollToEnd]);

  return (
    <div className="msgs">
      {annotated.map((m, i) => (
        <div className={`msg ${m.role}`} key={i}>
          <div className="from">{m.role === 'user' ? 'you ▸' : 'pao-gpt ▸'}</div>
          <div className="bubble">
            {m.role === 'user'
              ? <p>{m.content}</p>
              : <AssistantBlocks
                  blocks={m.blocks}
                  animate={i >= seenCount}
                  onReveal={scrollToEnd}
                  onPick={onPick}
                  onExpand={setOpenEmbed}
                />}
          </div>
        </div>
      ))}
      <div ref={endRef}></div>
      <EmbedModal embed={openEmbed} onClose={() => setOpenEmbed(null)} />
    </div>
  );
}
