import portfolioData from '../data/portfolio.json';
import { PROP_ART } from './shared/ascii.js';
import AsciiPortrait from './AsciiPortrait.jsx';
import './Hero.css';

const TAGLINE = "Trained as a computer scientist. Wired by music. Building the kind of machines that listen back.";

export default function Hero({ onChatClick }) {
  const { personal, valueProps } = portfolioData;

  return (
    <section className="hero reg-marks">
      <div className="hero-tape"></div>
      <div className="hero-grid">
        <div className="hero-left">
          <div className="eyebrow">
            <span className="pulse"></span>
            now · open to ml + creative tech roles · glendale, ca
          </div>
          <h1 className="hero-title">
            paolo<span className="acc-pink">.</span><br />
            sande<span className="acc-blue">jas</span><span className="slash">/</span>
          </h1>
          <p className="hero-tagline">{TAGLINE}</p>
          <dl className="hero-meta">
            <dt>role</dt><dd>AI / ML engineer</dd>
            <dt>focus</dt><dd>audio · vision · generative</dd>
            <dt>stack</dt><dd>PyTorch · Gemini · Max/MSP · ChucK</dd>
            <dt>shipping</dt><dd>models for 12,000+ users</dd>
          </dl>
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
            <span key={k} style={{display:'contents'}}>
              <span>● now playing : transformer experiments <em className="sep">/</em></span>
              <span>● shipping : multi-modal video pipelines <em className="sep">/</em></span>
              <span>● reading : "the art of doing science and engineering" <em className="sep">/</em></span>
              <span>● listening : alva noto · oneohtrix · sade <em className="sep">/</em></span>
              <span>● building : real-time drum machine in pytorch <em className="sep">/</em></span>
            </span>
          ))}
        </div>
      </div>

      <div className="props">
        {valueProps.map((p, i) => (
          <div className="prop" key={p.title}>
            <span className="num">0{i + 1} / 03</span>
            <pre className="ascii ascii-icon">{PROP_ART[i]}</pre>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
