import portfolioData from '../data/portfolio.json';
import './Experience.css';

export default function Experience() {
  const { experience, education } = portfolioData;

  return (
    <>
      <section id="experience">
        <div className="section-head">
          <span className="num">§ 03 / 04</span>
          <h2 className="title">work <span className="accent">history</span></h2>
          <span className="meta">2+ yrs in production</span>
        </div>
        <div className="timeline">
          {experience.map((e) => (
            <div className="tl-item" key={e.company}>
              <div className="tl-head">
                <h3>
                  {e.role} <span style={{color:'var(--ink-mute)'}}>@</span>{' '}
                  <span className="where">{e.company}</span>
                </h3>
                <span className="when">{e.dates}</span>
              </div>
              <ul className="tl-bullets">
                {e.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="education" style={{marginTop: 0}}>
        <div className="section-head" style={{margin: '48px 0 24px'}}>
          <span className="num">§ 04 / 04</span>
          <h2 className="title">education<span className="accent">.</span></h2>
          <span className="meta">caltech of the arts · u.p.</span>
        </div>
        <div className="timeline">
          {education.map((e) => (
            <div className="tl-item edu" key={e.school}>
              <div className="tl-head">
                <h3>
                  {e.degree} <span style={{color:'var(--ink-mute)'}}>@</span>{' '}
                  <span className="where">{e.school}</span>
                </h3>
                <span className="when">{e.dates}{e.gpa ? ` · ${e.gpa}` : ''}</span>
              </div>
              <ul className="tl-bullets">
                {e.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
