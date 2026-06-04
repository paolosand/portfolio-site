import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import ProjectEmbed from './ProjectEmbed';
import WorkEmbed from './WorkEmbed';
import MusicEmbed from './MusicEmbed';
import './EmbedModal.css';

export default function EmbedModal({ embed, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!embed) return null;

  let card = null;
  if (embed.type === 'project') card = <ProjectEmbed id={embed.id} />;
  else if (embed.type === 'work') card = <WorkEmbed id={embed.id} />;
  else if (embed.type === 'music') card = <MusicEmbed />;

  return createPortal(
    <div className="embed-modal-backdrop" onClick={onClose}>
      <div className="embed-modal" onClick={(e) => e.stopPropagation()}>
        <button className="embed-modal-close" onClick={onClose} aria-label="Close">✕</button>
        {card}
      </div>
    </div>,
    document.body
  );
}
