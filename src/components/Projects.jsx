import portfolioData from '../data/portfolio.json';
import { PROJECT_ART, tagClassByName } from './shared/ascii.js';
import './Projects.css';

function ProjectCard({ p, idx }) {
  const isWide = idx === 0;
  return (
    <article className={`project-card ${p.featured ? 'featured' : ''} ${isWide ? 'wide' : ''}`}>
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
        <div className="pc-links">
          {p.links.github
            ? <a href={p.links.github} target="_blank" rel="noopener noreferrer">↗ github</a>
            : <span className="disabled">— private —</span>}
          {p.links.demo
            ? <a href={p.links.demo} target="_blank" rel="noopener noreferrer">↗ live demo</a>
            : <span className="disabled">— no demo —</span>}
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const { projects } = portfolioData;

  return (
    <section id="projects">
      <div className="section-head">
        <span className="num">§ 01 / 04</span>
        <h2 className="title">selected <span className="accent">works</span></h2>
        <span className="meta">{projects.length} projects · 2023→</span>
      </div>
      <div className="projects-grid">
        {projects.map((p, i) => (
          <ProjectCard key={p.id} p={p} idx={i} />
        ))}
      </div>
    </section>
  );
}
