import './MusicEmbed.css';

const MUSIC_DATA = {
  name: 'Paolo Sandejas',
  genre: 'OPM indie/alt · Independent (Symphonic Distribution)',
  stats: [
    { value: '28.1M+', label: 'streams' },
    { value: '127K+', label: 'followers' },
  ],
  discography: [
    { title: 'The World Is So Small', type: 'debut album', year: '2024', aiAssisted: false },
    { title: 'Inbetweens', type: 'Parallel Paths project', year: '2024', aiAssisted: true },
    { title: 'BLOOM EP', type: 'EP', year: '2023', aiAssisted: false },
  ],
  links: [
    { label: 'Spotify', url: 'https://open.spotify.com/artist/7aerdWadzubpu06Oxysg6R', cls: 'spotify' },
    { label: 'Apple Music', url: 'https://music.apple.com/us/artist/paolo-sandejas/1404323148', cls: 'apple' },
    { label: 'SoundCloud', url: 'https://soundcloud.com/paolosandejas', cls: 'sc' },
  ],
};

export default function MusicEmbed() {
  const { name, genre, stats, discography, links } = MUSIC_DATA;
  return (
    <div className="music-embed">
      <div className="music-embed-header">
        <div className="music-embed-header-left">
          <span className="music-embed-glyph">♪</span>
          <div>
            <div className="music-embed-name">{name}</div>
            <div className="music-embed-sub">{genre}</div>
          </div>
        </div>
        <span className="music-embed-badge">★ recording artist</span>
      </div>

      <div className="music-embed-stats">
        {stats.map(s => (
          <div key={s.label} className="music-stat">
            <span className="music-stat-val">{s.value}</span>
            <span className="music-stat-lbl">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="music-embed-discography">
        <div className="music-embed-section-label">Discography</div>
        {discography.map(r => (
          <div key={r.title} className="music-release-row">
            <div>
              <span className="music-release-title">{r.title}</span>
              {r.aiAssisted && <span className="music-ai-tag">AI-assisted</span>}
              <div className="music-release-meta">{r.type}</div>
            </div>
            <span className="music-release-year">{r.year}</span>
          </div>
        ))}
      </div>

      <div className="music-embed-links">
        {links.map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
             className={`music-stream-link ${l.cls}`}>
            ↗ {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
