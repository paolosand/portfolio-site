import portfolioData from '../data/portfolio.json';
import { PROP_ART } from './shared/ascii.js';
import AsciiPortrait from './AsciiPortrait.jsx';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTicker } from '../hooks/useTicker.js';
import { tickerDurationSeconds } from './shared/tickerFallback.js';
import './Hero.css';

const TAGLINE = "Trained as a computer scientist. Wired by music. Building the kind of machines that listen back.";

export default function Hero({ onChatClick }) {
  const { personal, valueProps } = portfolioData;
  const { lines, feedKey } = useTicker();
  const tickerRef = useRef(null);
  const [tickDuration, setTickDuration] = useState(null);

  // Strip holds two copies; one loop scrolls half its width. Re-measure on
  // font load, feed swap and clock ticks so the speed stays constant.
  useLayoutEffect(() => {
    const el = tickerRef.current;
    if (!el) return;
    const measure = () => setTickDuration(tickerDurationSeconds(el.scrollWidth / 2));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [feedKey]);

  return (
    <section className="hero reg-marks">
      <div className="hero-tape"></div>
      <div className="hero-grid">
        <div className="hero-left">
          <div className="eyebrow">
            <span className="pulse"></span>
            now · available for full-time ml + creative tech roles · los angeles, ca
          </div>
          <h1 className="hero-title">
            paolo<span className="acc-pink">.</span><br />
            sande<span className="acc-blue">jas</span><span className="slash">/</span>
          </h1>
          <p className="hero-tagline">{TAGLINE}</p>
          <dl className="hero-meta">
            <dt>role</dt><dd>AI / ML engineer</dd>
            <dt>trained</dt><dd>CalArts MFA '26 · UP Diliman CS '23</dd>
            <dt>focus</dt><dd>audio · vision · generative</dd>
            <dt>tools</dt><dd>PyTorch · Gemini · MediaPipe</dd>
            <dt>building</dt><dd>responsible AI for creative work</dd>
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
        <div
          className="ticker-inner"
          key={feedKey}
          ref={tickerRef}
          style={tickDuration ? { '--tick-duration': `${tickDuration}s` } : undefined}
        >
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
