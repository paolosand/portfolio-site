import { useEffect, useState } from 'react';
import { useScroll } from 'framer-motion';
import { tagClassByName } from '../shared/ascii.js';
import { BLOCK_RENDERERS, RenderBlocks } from './WorkBlocks.jsx';
import { useDeckScroll } from './useDeckScroll.js';
import Trail from './Trail.jsx';
import LedgerPostit from './LedgerPostit.jsx';
import './WorkDeck.css';

function useIsNarrow() {
  const [narrow, setNarrow] = useState(
    () => window.matchMedia('(max-width: 640px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

// Project identity, shown once at the top of the first chapter's text area.
function DeckCover({ project }) {
  return (
    <header className="deck-cover">
      <h2 className="deck-cover-title">{project.title}</h2>
      {project.subtitle && <div className="deck-cover-subtitle">{project.subtitle}</div>}
      <div className="pc-tags">
        {project.tags.map((t) => (
          <span key={t} className={`tag ${tagClassByName(t)}`}>{t}</span>
        ))}
      </div>
    </header>
  );
}

function ChapterMedia({ media, className }) {
  const Block = BLOCK_RENDERERS[media.type];
  return Block ? <div className={className}><Block block={media} /></div> : null;
}

function ChapterCard({ chapter, index, cover, refCb }) {
  const label = `§ ${String(index + 1).padStart(2, '0')} · ${chapter.kicker}`;
  const text = (
    <div className="deck-txt">
      {cover}
      <span className="deck-label">{label}{chapter.detour ? ' ↩' : ''}</span>
      <h3 className="deck-title">{chapter.title}</h3>
      <RenderBlocks blocks={chapter.blocks} />
    </div>
  );

  return (
    <section ref={refCb} className={`deck-chapter shape-${chapter.shape}`} aria-label={label}>
      {chapter.shape === 'poster' && (
        <>
          <ChapterMedia media={chapter.media} className="poster-fill" />
          <div className="poster-scrap">
            {cover}
            <span className="deck-label">{label}</span>
            <h3 className="deck-title">{chapter.title}</h3>
            <RenderBlocks blocks={chapter.blocks} />
          </div>
        </>
      )}
      {chapter.shape === 'two-col' && (
        <>
          {text}
          <ChapterMedia media={chapter.media} className="deck-medwrap" />
        </>
      )}
      {(chapter.shape === 'text-poster' || chapter.shape === 'long') && text}
    </section>
  );
}

export default function WorkDeck({ project, content, containerRef }) {
  const chapters = content.chapters;
  const { chapterRefs, activeIndex, stopFractions, jumpTo } =
    useDeckScroll(containerRef, chapters.length);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const narrow = useIsNarrow();
  const hasDetour = chapters.some((c) => c.detour);

  return (
    <div className="work-deck">
      <Trail
        variant={narrow ? 'phone' : 'desktop'}
        hasDetour={hasDetour}
        stopFractions={stopFractions}
        activeIndex={activeIndex}
        scrollYProgress={scrollYProgress}
        onJump={jumpTo}
        kickers={chapters.map((c) => c.kicker)}
        pathOverride={content.trail ?? null}
      />
      <LedgerPostit
        chapters={chapters}
        activeIndex={activeIndex}
        onJump={jumpTo}
        collapsed={narrow}
      />
      {chapters.map((c, i) => (
        <ChapterCard
          key={i}
          chapter={c}
          index={i}
          cover={i === 0 ? <DeckCover project={project} /> : null}
          refCb={(el) => { chapterRefs.current[i] = el; }}
        />
      ))}
    </div>
  );
}
