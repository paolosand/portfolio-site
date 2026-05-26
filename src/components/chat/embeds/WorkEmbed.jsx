import portfolioData from '../../../data/portfolio.json';
import './Embed.css';

const WORK_IDS = {
  'nuts-and-bolts-ai': 'Nuts and Bolts AI',
  'stratpoint': 'Stratpoint Technologies',
};

export default function WorkEmbed({ id }) {
  const companyName = WORK_IDS[id];
  if (!companyName) return null;

  const job = portfolioData.experience.find(e => e.company === companyName);
  if (!job) return null;

  return (
    <div className="embed">
      <div className="embed-header">
        <div className="embed-header-left">
          <span className="embed-glyph work">■</span>
          <span className="embed-title">{job.company}</span>
          <span className="embed-subtitle">· {job.role}</span>
        </div>
        <span className="embed-meta-right">{job.dates}</span>
      </div>
      <div className="embed-body">
        <ul className="embed-bullets">
          {job.bullets.slice(0, 3).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
