import portfolioData from '../data/portfolio.json';
import { tagClass } from './shared/ascii.js';
import './Skills.css';

export default function Skills() {
  const { skills } = portfolioData;

  return (
    <section id="skills">
      <div className="section-head">
        <span className="num">§ 02 / 04</span>
        <h2 className="title">stack & <span className="accent">toolkit</span></h2>
        <span className="meta">updated mar 2026</span>
      </div>
      <div className="skills-block">
        {Object.entries(skills).map(([cat, list]) => (
          <div className="skills-row" key={cat}>
            <div className="cat">{cat}</div>
            <div className="pills">
              {list.map((s, i) => (
                <span key={s} className={`tag ${tagClass(i)}`}>{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
