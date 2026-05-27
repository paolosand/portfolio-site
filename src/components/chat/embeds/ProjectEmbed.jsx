import portfolioData from '../../../data/portfolio.json';
import { tagClassByName } from '../../shared/ascii.js';
import './Embed.css';

export default function ProjectEmbed({ id }) {
  const project = portfolioData.projects.find(p => p.id === id);
  if (!project) return null;

  const isMl = project.category === 'ml';
  const categoryClass = isMl ? 'ml' : 'creative';
  const glyph = '◆';

  return (
    <div className="embed">
      <div className="embed-header">
        <div className="embed-header-left">
          <span className={`embed-glyph ${categoryClass}`}>{glyph}</span>
          <span className="embed-title">{project.title}</span>
          {project.subtitle && (
            <span className="embed-subtitle">· {project.subtitle}</span>
          )}
        </div>
        {project.featured && (
          <span className={`embed-badge ${categoryClass}`}>★ featured</span>
        )}
      </div>
      <div className="embed-body">
        <p className="embed-desc">{project.description}</p>
        <div className="embed-tags">
          {project.tags.map(t => (
            <span key={t} className={`tag ${tagClassByName(t)}`}>{t}</span>
          ))}
        </div>
        <div className="embed-links">
          {project.links.github
            ? <a href={project.links.github} target="_blank" rel="noopener noreferrer">↗ github</a>
            : <span className="disabled">— private —</span>}
          {project.links.demo
            ? <a href={project.links.demo} target="_blank" rel="noopener noreferrer">↗ live demo</a>
            : <span className="disabled">— no demo —</span>}
        </div>
      </div>
    </div>
  );
}
