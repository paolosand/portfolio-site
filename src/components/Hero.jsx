import portfolioData from '../data/portfolio.json';
import { STACK_ICONS } from './shared/stackIcons.js';
import AsciiPortrait from './AsciiPortrait.jsx';
import { useTicker } from '../hooks/useTicker.js';
import './Hero.css';

const TAGLINE = "I build AI creative tools that keep the creator at the center.";

export default function Hero({ onChatClick }) {
  const { personal } = portfolioData;
  const { lines } = useTicker();

  return (
    <section className="hero reg-marks">
      <div className="hero-grid">
        <div className="hero-left">
          <h1 className="hero-title">
            paolo<span className="acc-pink">.</span><br />
            sande<span className="acc-blue">jas</span><span className="slash">/</span>
          </h1>
          <p className="hero-tagline">{TAGLINE}</p>
          <p className="hero-status"><span className="nowrap">full-stack product engineer</span> · <span className="nowrap">open to full-time roles</span></p>
          <ul className="hero-stack" aria-label="Main tools">
            {STACK_ICONS.map((i) => (
              <li key={i.name} title={i.name}>
                <svg viewBox="0 0 24 24" role="img" aria-label={i.name}><path d={i.path} /></svg>
              </li>
            ))}
          </ul>
          <div className="hero-cta">
            <button className="cta primary" onClick={onChatClick}>
              <span>▶</span> talk to pao-gpt
            </button>
            <a className="cta pink" href="#projects">
              <span>◆</span> see projects
            </a>
            <a className="cta" href={`mailto:${personal.email}`}>
              <span>✉</span> say hello
            </a>
          </div>
        </div>

        <div className="hero-right">
          <AsciiPortrait />
        </div>
      </div>

      <div className="ticker">
        <div className="ticker-inner">
          {[0, 1].map((k) => (
            <span key={k} style={{ display: 'contents' }}>
              {lines.map((line) => (
                <span key={`${k}:${line.id}`}>
                  ● {line.label} : {line.text} <em className="sep">/</em>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

    </section>
  );
}
