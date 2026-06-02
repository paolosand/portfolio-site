import './ArtistModal.css';

export default function ArtistModal({ onClose }) {
  return (
    <div className="artist-overlay" onClick={onClose}>
      <div className="artist-modal" role="dialog" aria-modal="true" aria-label="Artist profile" onClick={(e) => e.stopPropagation()}>
        <button className="artist-close" onClick={onClose} aria-label="Close">×</button>

        <div className="artist-inner">
          {/* Left panel — identity */}
          <div className="artist-left">
            <div className="artist-glyph">P/ · ARTIST</div>

            <div className="artist-stats">
              <span>28.1M+ streams</span>
              <span>127K+ followers</span>
              <span>43.5K Last.fm listeners</span>
              <span>488K+ scrobbles</span>
            </div>

            <div className="artist-tags">OPM · indie / alternative · singer-songwriter</div>
            <div className="artist-label">Universal Records Philippines · signed age 18</div>

            <ul className="artist-highlights">
              <li>Wish Urban Song of the Year 2020 — "Sway"</li>
              <li>5× Wish Awards nominee</li>
              <li>V (Kim Taehyung / BTS) sang "Sorry" in a public vlog → international streaming spike</li>
              <li>Wanderland Music & Arts Festival</li>
              <li>Nationwide touring — headlining and supporting</li>
              <li>Collaboration with Clara Benin — "roses" (May 2025)</li>
            </ul>

            <div className="artist-press">
              google <em>"paolo sandejas"</em> for press and editorial coverage
            </div>
          </div>

          {/* Right panel — discography + player */}
          <div className="artist-right">
            <div className="artist-discography">
              <div className="artist-section-label">discography</div>
              <ul>
                <li><span className="year">2020</span><em>Purple Afternoon</em> EP</li>
                <li><span className="year">2023</span><em>BLOOM</em> EP</li>
                <li><span className="year">2024</span><em>The World Is So Small</em> — debut album</li>
                <li><span className="year">2024</span><em>Inbetweens</em> — AI-assisted album</li>
                <li><span className="year">2027</span>Sophomore album — in progress</li>
              </ul>
            </div>

            <iframe
              className="artist-spotify"
              src="https://open.spotify.com/embed/artist/7aerdWadzubpu06Oxysg6R?utm_source=generator"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Paolo Sandejas on Spotify"
            />

            <div className="artist-links">
              <a href="https://open.spotify.com/artist/7aerdWadzubpu06Oxysg6R" target="_blank" rel="noopener noreferrer">Spotify</a>
              <a href="https://music.apple.com/us/artist/paolo-sandejas/1404323148" target="_blank" rel="noopener noreferrer">Apple Music</a>
              <a href="https://soundcloud.com/paolosandejas" target="_blank" rel="noopener noreferrer">SoundCloud</a>
            </div>

            <div className="artist-ai-note">
              <strong>Parallel Paths (2024)</strong> — debut album made conventionally vs. an album made in 2 weeks with Gemini + Suno, exhibited as a listening installation at CalArts. AI provides bones; artist finalizes phrasing, adds elements, shapes the final work.{' '}
              <a href="https://soundcloud.com/paolosandejas/sets/inbetweens" target="_blank" rel="noopener noreferrer">Listen →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
