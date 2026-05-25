import portfolioData from '../data/portfolio.json';
import { POSTCARD_ASCII } from './shared/ascii.js';
import './Contact.css';

export default function Contact() {
  const { personal } = portfolioData;

  return (
    <section id="contact">
      <div className="section-head">
        <span className="num">∎ end</span>
        <h2 className="title">say <span className="accent">hello</span></h2>
        <span className="meta">i answer fast</span>
      </div>
      <div className="postcard reg-marks">
        <div className="left">
          <pre className="ascii ascii-bg">{POSTCARD_ASCII}</pre>
          <div className="pc-msg">
            hey — i'm <b>paolo</b>. i build ml systems that pay attention to sound and shape,
            and i like making weird, useful things with both. tell me what you're building.
          </div>
          <div className="signoff">— talk soon ♥</div>
        </div>
        <div className="right">
          <div className="stamps">
            <span className="stamp blue">par avion</span>
            <span className="stamp">priority</span>
          </div>
          <div>
            <div className="addr">
              <span className="lbl">addressed to</span>
              <strong>anyone hiring an ml engineer<br />who also writes synths</strong>
            </div>
            <div className="addr">
              <span className="lbl">e-mail</span>
              <a href={`mailto:${personal.email}`}>{personal.email}</a>
            </div>
            <div className="addr">
              <span className="lbl">on the web</span>
              <a href={personal.github} target="_blank" rel="noopener noreferrer">github.com/paolosandejas</a><br />
              <a href={personal.linkedin} target="_blank" rel="noopener noreferrer">linkedin.com/in/paolosandejas</a>
            </div>
            <div className="addr last">
              <span className="lbl">return address</span>
              glendale, california · 34.146°n
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
