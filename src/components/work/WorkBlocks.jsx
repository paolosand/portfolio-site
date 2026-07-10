/* eslint-disable react-refresh/only-export-components */
import { BLOCK_REQUIRED_FIELDS } from '../../data/work/blockTypes.js';

function ProseBlock({ block }) {
  return (
    <div className="wm-block wm-prose">
      {block.heading && <div className="wm-label">{block.heading}</div>}
      {block.body.trim().split(/\n\s*\n/).map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}

function AsciiDiagramBlock({ block }) {
  return (
    <figure className="wm-block wm-diagram">
      <pre>{block.art.replace(/^\n/, '')}</pre>
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

function VideoBlock({ block }) {
  return (
    <figure className={`wm-block wm-video ${block.orientation === 'portrait' ? 'portrait' : ''}`}>
      <iframe
        src={`https://www.youtube.com/embed/${block.videoId}`}
        title={block.caption || 'demo video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

function ImageBlock({ block }) {
  const img = <img src={block.src} alt={block.alt} loading="lazy" />;
  return (
    <figure className="wm-block wm-image">
      {block.fullSrc ? (
        <a href={block.fullSrc} target="_blank" rel="noopener noreferrer" title="open full size">
          {img}
        </a>
      ) : img}
      {block.caption && (
        <figcaption>
          {block.caption}
          {block.fullSrc && <span className="wm-zoom-hint"> · click to open full size</span>}
        </figcaption>
      )}
    </figure>
  );
}

function HighlightsBlock({ block }) {
  return (
    <ul className="wm-block wm-highlights">
      {block.items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export const BLOCK_RENDERERS = {
  prose: ProseBlock,
  'ascii-diagram': AsciiDiagramBlock,
  video: VideoBlock,
  image: ImageBlock,
  highlights: HighlightsBlock,
};

// Fail loudly in dev if the content contract gains a type this file can't render.
if (import.meta.env.DEV) {
  for (const type of Object.keys(BLOCK_REQUIRED_FIELDS)) {
    if (!BLOCK_RENDERERS[type]) {
      console.error(`WorkBlocks: no renderer for contract block type "${type}"`);
    }
  }
}

export function RenderBlocks({ blocks }) {
  return blocks.map((block, i) => {
    const Block = BLOCK_RENDERERS[block.type];
    return Block ? <Block key={i} block={block} /> : null;
  });
}
