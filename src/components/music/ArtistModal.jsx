import { useEffect, useRef } from 'react';
import './ArtistModal.css';

const ALBUMS = [
  {
    title: 'Purple Afternoon',
    year: '2020',
    type: 'EP',
    art: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0273f1847cc822f7b96e786a52',
    url: 'https://open.spotify.com/album/0cEFtVlRlxruufu7Mp6uz9',
  },
  {
    title: 'BLOOM',
    year: '2023',
    type: 'EP',
    art: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0219ec1cc01b251e3c2fe9fb67',
    url: 'https://open.spotify.com/album/7GxLP2buR6YwnG561fGyDf',
  },
  {
    title: 'the world is so small (after all)',
    year: '2024',
    type: 'ALBUM',
    art: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02e1946273f8730d261330aca9',
    url: 'https://open.spotify.com/album/3sR3y2tVR2T2gIkXMgsfYY',
  },
  {
    title: 'Inbetweens',
    year: '2024',
    type: 'AI ALBUM',
    art: 'https://i1.sndcdn.com/artworks-sWCmC2WalAqGMPTX-SmrOhA-t500x500.jpg',
    url: 'https://soundcloud.com/paolosand/sets/inbetweens',
  },
];

export default function ArtistModal({ onClose }) {
  const frameRef = useRef(null);

  // Own the modal lifecycle the same way WorkModal does: lock body scroll so
  // the page behind can't take the gesture, trap focus, and close on Escape.
  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    frameRef.current?.focus();
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const frame = frameRef.current;
      if (!frame) return;
      const focusable = frame.querySelectorAll('a[href], button, iframe, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const inFrame = frame.contains(current);
      if (e.shiftKey) {
        if (!inFrame || current === first || current === frameRef.current) { e.preventDefault(); last.focus(); }
      } else {
        if (!inFrame || current === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="artist-overlay" onClick={onClose}>
      <div
        className="artist-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Artist profile"
        ref={frameRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >

        <div className="artist-topbar">
          <div className="artist-topbar-left">
            <span className="topbar-mark">■</span>
            LISTENING ROOM · @PAOLOSAND
          </div>
          <button className="artist-close" onClick={onClose} aria-label="Close">× esc</button>
        </div>

        <div className="artist-inner">
          {/* Left panel — identity */}
          <div className="artist-left">

            <div className="artist-hero">
              <img src="/artist-hero.jpg" alt="Paolo Sandejas" />
              <div className="artist-hero-name">Paolo Sandejas</div>
            </div>

            <div className="artist-stats">
              <div className="stat-cell">
                <span className="stat-num blue">28.1M+</span>
                <span className="stat-lbl">STREAMS</span>
              </div>
              <div className="stat-cell">
                <span className="stat-num pink">127K+</span>
                <span className="stat-lbl">FOLLOWERS</span>
              </div>
              <div className="stat-cell">
                <span className="stat-num mint">4</span>
                <span className="stat-lbl">RELEASES</span>
              </div>
              <div className="stat-cell">
                <span className="stat-num lemon">2018</span>
                <span className="stat-lbl">SINCE</span>
              </div>
            </div>

            <div className="artist-tags">OPM · indie / alternative · singer-songwriter</div>
            <div className="artist-label">
              <span className="label-current">Independent · Symphonic Distribution</span>
              <span className="label-history">prev: Sony Music PH (2024–25) · Universal Records PH (2018–22, signed age 18)</span>
            </div>

            <ul className="artist-highlights">
              <li>Spotify RADAR Philippines 2023 — global emerging artist spotlight</li>
              <li>First Filipino artist at Golden Melody Awards &amp; Festival (Taiwan) — Asia's Grammy equivalent</li>
              <li>Wish Urban Song of the Year 2020 — "Sway" · 5× Wish Awards nominee</li>
              <li>V (Kim Taehyung / BTS) sang "Sorry" in a public vlog → international streaming spike</li>
              <li>Wanderland Music &amp; Arts Festival · Salo-Salo Fest 2022 (w/ Parokya ni Edgar)</li>
              <li>Collab with Clara Benin — "roses" (May 2025)</li>
              <li>Sophomore album in progress — target release early 2027</li>
            </ul>

            <div className="artist-socials">
              <a href="https://open.spotify.com/artist/7aerdWadzubpu06Oxysg6R" target="_blank" rel="noopener noreferrer">Spotify</a>
              <a href="https://music.apple.com/us/artist/paolo-sandejas/1404323148" target="_blank" rel="noopener noreferrer">Apple Music</a>
              <a href="https://soundcloud.com/paolosand" target="_blank" rel="noopener noreferrer">SoundCloud</a>
              <a href="https://www.tiktok.com/@paolosandejas" target="_blank" rel="noopener noreferrer">TikTok</a>
              <a href="https://www.instagram.com/paolosandejas" target="_blank" rel="noopener noreferrer">Instagram</a>
            </div>

            <div className="artist-youtube">
              <iframe
                src="https://www.youtube.com/embed/fhfGmehGEF0"
                title="Paolo Sandejas — featured video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>

            <div className="artist-press">
              google <em>"paolo sandejas"</em> for press and editorial coverage
            </div>
          </div>

          {/* Right panel — music */}
          <div className="artist-right">
            <div className="artist-latest">
              <div className="artist-section-label">LATEST RELEASE</div>
              <iframe
                className="artist-spotify"
                src="https://open.spotify.com/embed/album/3sR3y2tVR2T2gIkXMgsfYY?utm_source=generator"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="the world is so small (after all) on Spotify"
              />
            </div>

            <div className="artist-gallery-section">
              <div className="artist-section-label">DISCOGRAPHY</div>
              <div className="artist-gallery">
                {ALBUMS.map((album) => (
                  <a
                    key={album.title}
                    className="gallery-tile"
                    href={album.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img src={album.art} alt={album.title} className="gallery-art" />
                    <div className="gallery-meta">
                      <span className="gallery-year">{album.year}</span>
                      <span className="gallery-type">{album.type}</span>
                    </div>
                    <div className="gallery-title">{album.title}</div>
                  </a>
                ))}
              </div>
            </div>

            <div className="artist-ai-note">
              <strong>Parallel Paths (2024)</strong> — debut album made conventionally vs. an album made in 2 weeks with Gemini + Suno, exhibited as a listening installation at CalArts. AI provides bones; artist finalizes phrasing, adds elements, shapes the final work.
            </div>

            <div className="artist-soundcloud">
              <div className="artist-section-label">INBETWEENS · FULL ALBUM</div>
              <iframe
                className="sc-embed"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/paolosand/sets/inbetweens&color=%231A130A&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false"
                title="Inbetweens by Paolo Sandejas on SoundCloud"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
