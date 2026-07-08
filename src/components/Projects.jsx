import { useEffect } from 'react';
import portfolioData from '../data/portfolio.json';
import { PROJECT_ART, tagClassByName } from './shared/ascii.js';
import { workRegistry } from '../data/work/index.js';
import WorkModal from './work/WorkModal.jsx';
import { useWorkHash } from './work/useWorkHash.js';
import './Projects.css';

function ProjectCard({ p, idx, onOpen }) {
  const isWide = idx === 0;
  const openable = Boolean(onOpen);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <article
      className={`project-card ${p.featured ? 'featured' : ''} ${isWide ? 'wide' : ''} ${openable ? 'openable' : ''}`}
      onClick={openable ? onOpen : undefined}
      onKeyDown={openable ? handleKeyDown : undefined}
      role={openable ? 'button' : undefined}
      tabIndex={openable ? 0 : undefined}
      aria-label={openable ? `open ${p.title} case study` : undefined}
    >
      {p.featured && (
        <div className="pc-stamp">
          <span className={`stamp ${p.category === 'creative' ? '' : 'blue'}`}>★ featured</span>
        </div>
      )}
      <div className="pc-header">
        <span className="id-tag">#{String(idx + 1).padStart(2, '0')} · {p.id}</span>
        <span className={`cat ${p.category === 'creative' ? 'creative' : ''}`}>
          {p.category === 'creative' ? 'creative' : 'ml / ai'}
        </span>
      </div>
      <pre className="ascii pc-ascii-frame">{PROJECT_ART[p.id]}</pre>
      <div className="pc-body">
        <h3 className="pc-title">{p.title}</h3>
        {p.subtitle && <div className="pc-subtitle">{p.subtitle}</div>}
        <p className="pc-desc">{p.description}</p>
        <div className="pc-tags">
          {p.tags.map((t) => (
            <span key={t} className={`tag ${tagClassByName(t)}`}>{t}</span>
          ))}
        </div>
        <div className="pc-links" onClick={(e) => e.stopPropagation()}>
          {p.links.github
            ? <a href={p.links.github} target="_blank" rel="noopener noreferrer">↗ github</a>
            : <span className="disabled">— private —</span>}
          {p.links.demo
            ? <a href={p.links.demo} target="_blank" rel="noopener noreferrer">↗ live demo</a>
            : <span className="disabled">— no demo —</span>}
          {openable && (
            <a
              href={`#/work/${p.id}`}
              className="pc-open"
              onClick={(e) => { e.preventDefault(); onOpen(); }}
            >
              ↗ open case study
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const { projects } = portfolioData;
  const { openId, open, close } = useWorkHash();

  useEffect(() => {
    // Cold deep-link load: bring the projects section into view behind the modal.
    if (openId) document.getElementById('projects')?.scrollIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section id="projects">
      <div className="section-head">
        <span className="num">§ 01 / 04</span>
        <h2 className="title">selected <span className="accent">works</span></h2>
        <span className="meta">{projects.length} projects · 2023→</span>
      </div>
      <div className="projects-grid">
        {projects.map((p, i) => (
          <ProjectCard
            key={p.id}
            p={p}
            idx={i}
            onOpen={Object.hasOwn(workRegistry, p.id) ? () => open(p.id) : undefined}
          />
        ))}
      </div>
      {openId && <WorkModal workId={openId} onClose={close} />}
    </section>
  );
}
