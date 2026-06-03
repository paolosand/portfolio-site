import './TopBar.css';

export default function TopBar({ view, setView, onMusicClick }) {
  return (
    <header className="topbar">
      <div className="tb-mark">
        <span className="glyph">P/</span>
        <div>
          <div className="name">paolo sandejas</div>
          <div className="sub">ai · ml · creative tech</div>
        </div>
      </div>
      <nav className="tb-nav">
        <button className={view === 'chat' ? 'is-active' : ''} onClick={() => setView('chat')}>
          <span className="dot"></span>
          <span className="tb-label-full">chat / pao-gpt</span>
          <span className="tb-label-short">chat</span>
        </button>
        <button className={view === 'portfolio' ? 'is-active' : ''} onClick={() => setView('portfolio')}>
          <span className="dot"></span>
          <span className="tb-label-full">portfolio</span>
          <span className="tb-label-short">portfolio</span>
        </button>
        <button className="tb-nav-music" onClick={onMusicClick}>
          <span className="tb-label-full">♪ listen</span>
          <span className="tb-label-short">♪</span>
        </button>
      </nav>
      <div className="tb-meta">
        <div><b>v0.4.1</b> · march 2026</div>
        <div>printed in glendale, ca</div>
      </div>
    </header>
  );
}
