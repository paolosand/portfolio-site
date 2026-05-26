import portfolioData from '../../data/portfolio.json';
import { CHAT_PROMPTS } from '../shared/ascii.js';
import './WelcomeScreen.css';

export default function WelcomeScreen({ onPick }) {
  const { personal } = portfolioData;

  return (
    <div className="welcome">
      <pre className="ascii welcome-banner">
{`  `}<span className="b">{`____`}</span>{`              `}<span className="b">{`___`}</span>{`       `}<span className="p">{`____  ____  _____`}</span>{`
 `}<span className="b">{`|  _ \\`}</span>{`    /\\      `}<span className="b">{`/ _ \\`}</span>{`     `}<span className="p">{`/ ___||  _ \\|_   _|`}</span>{`
 `}<span className="b">{`| |_) |`}</span>{`  /  \\    `}<span className="b">{`| | | |`}</span>{`   `}<span className="p">{`| |  _ | |_) | | |`}</span>{`
 `}<span className="b">{`|  __/`}</span>{`  / /\\ \\   `}<span className="b">{`| |_| |`}</span>{`   `}<span className="p">{`| |_| ||  __/  | |`}</span>{`
 `}<span className="b">{`|_|`}</span>{`    /_/  \\_\\   `}<span className="b">{`\\___/`}</span>{`    `}<span className="p">{`\\____||_|     |_|`}</span>{`
 ─────────────────────────────────────────────
   `}<span className="m">{`an ai clone of paolo · trained on the human`}</span></pre>

      <h1>hi, i'm pao-gpt <span className="wave">👋</span></h1>
      <p className="lead">
        the friendly little machine that knows what paolo's been building.
        ask me about ml in production, audio/cv work, or the wearable instruments —
        i'll answer in his voice.
      </p>

      <div className="card">
        <div className="head">
          <span>contact · always-on</span>
          <span>★ ★ ★</span>
        </div>
        <div className="links">
          <a href={`mailto:${personal.email}`}>
            <span className="glyph">✉</span>
            <span>{personal.email}</span>
          </a>
          <a href={personal.github} target="_blank" rel="noopener noreferrer">
            <span className="glyph">◆</span>
            <span>github / paolosand</span>
          </a>
          <a href={personal.linkedin} target="_blank" rel="noopener noreferrer">
            <span className="glyph">■</span>
            <span>linkedin / paolosand</span>
          </a>
        </div>
      </div>

      <div className="card">
        <div className="head">
          <span>try a thread →</span>
          <span>tap to ask</span>
        </div>
        <div className="prompts">
          {CHAT_PROMPTS.map((p) => (
            <button className="prompt" key={p.title} onClick={() => onPick(p.q)}>
              <pre className="icon">{p.icon}</pre>
              <div>
                <strong>{p.title}</strong>
                <span>{p.q}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="privacy-note">
        ▌ conversations stored anonymously · for analytics only ▐
      </div>
    </div>
  );
}
