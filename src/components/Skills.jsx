import portfolioData from '../data/portfolio.json';
import { tagClassByName } from './shared/ascii.js';
import './Skills.css';

export default function Skills() {
  const { skills } = portfolioData;

  return (
    <section id="skills">
      <div className="section-head">
        <h2 className="title">stack & <span className="accent">toolkit</span></h2>
      </div>
      <div className="skills-block">
        {Object.entries(skills).map(([cat, list]) => (
          <div className="skills-row" key={cat}>
            <div className="cat">{cat}</div>
            <div className="pills">
              {list.map((s) => (
                <span key={s} className={`tag ${tagClassByName(s)}`}>{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
