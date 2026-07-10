import { useEffect, useRef, useState } from 'react';
import portfolioData from '../../data/portfolio.json';
import { workRegistry } from '../../data/work/index.js';
import { flattenChapters } from '../../data/work/blockTypes.js';
import { tagClassByName } from '../shared/ascii.js';
import { RenderBlocks } from './WorkBlocks.jsx';
import './WorkModal.css';

export default function WorkModal({ workId, onClose }) {
  const [content, setContent] = useState(null);
  const frameRef = useRef(null);
  const idx = portfolioData.projects.findIndex((p) => p.id === workId);
  const project = idx >= 0 ? portfolioData.projects[idx] : null;

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContent(null);
    workRegistry[workId]().then(
      (m) => { if (alive) setContent(m.default); },
      () => { if (alive) onClose(); },
    );
    return () => { alive = false; };
  }, [workId, onClose]);

  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    frameRef.current?.focus();
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const frame = frameRef.current;
      if (!frame) return;
      const focusable = frame.querySelectorAll('a[href], button, iframe, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const inFrame = frame.contains(current);
      if (e.shiftKey) {
        if (!inFrame || current === first) { e.preventDefault(); last.focus(); }
      } else {
        if (!inFrame || current === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  if (!project) return null;

  return (
    <div className="work-overlay" onClick={onClose}>
      <div
        className="work-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${project.title} case study`}
        ref={frameRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="work-topbar">
          <div className="work-topbar-left">
            <span className="topbar-mark">■</span>
            #{String(idx + 1).padStart(2, '0')} · {project.id} · case study
          </div>
          <button className="work-close" onClick={onClose} aria-label="Close">× esc</button>
        </div>

        <div className="work-inner">
          <header className="work-head">
            <div className="wm-head-top">
              <span className={`cat ${project.category === 'creative' ? 'creative' : ''}`}>
                {project.category === 'creative' ? 'creative' : 'ml / ai'}
              </span>
            </div>
            <h3 className="work-title">{project.title}</h3>
            {project.subtitle && <div className="work-subtitle">{project.subtitle}</div>}
            <div className="pc-tags">
              {project.tags.map((t) => (
                <span key={t} className={`tag ${tagClassByName(t)}`}>{t}</span>
              ))}
            </div>
          </header>

          {content ? (
            <RenderBlocks blocks={flattenChapters(content.chapters)} />
          ) : (
            <div className="work-loading">loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}
