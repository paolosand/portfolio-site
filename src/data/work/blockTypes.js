// Shared contract between case-study content, its tests, and the renderers.
// The tests (node --test) and the JSX renderers both import from here so the
// two can't drift.

export const BLOCK_REQUIRED_FIELDS = {
  prose: ['body'],
  'ascii-diagram': ['art'],
  video: ['videoId'],
  image: ['src', 'alt'],
  highlights: ['items'],
};

export const CHAPTER_SHAPES = {
  poster: { requiresMedia: true },
  'two-col': { requiresMedia: true },
  'text-poster': { requiresMedia: false },
  long: { requiresMedia: false },
};

// A chapter's `media` is a block object promoted to the chapter's stage
// (poster fill or two-col right column). Same field contract as blocks.
export function mediaToBlock(media) {
  return media ? { ...media } : null;
}

// Legacy view: the reduced-motion fallback renders chapters as one flat block
// list — chapter media first, then its blocks, in chapter order.
export function flattenChapters(chapters) {
  return chapters.flatMap((c) => {
    const media = mediaToBlock(c.media);
    return media ? [media, ...c.blocks] : [...c.blocks];
  });
}

function fieldPresent(value) {
  return Array.isArray(value)
    ? value.length > 0
    : value != null && String(value).trim() !== '';
}

// Returns an error string if `block` is invalid, else null. A `video` block is
// valid with EITHER a YouTube `videoId` OR a self-hosted file `src`; every other
// type requires all of its BLOCK_REQUIRED_FIELDS.
export function blockValidationError(block) {
  const required = BLOCK_REQUIRED_FIELDS[block.type];
  if (!required) return `unknown block type "${block.type}"`;
  if (block.type === 'video') {
    return fieldPresent(block.videoId) || fieldPresent(block.src)
      ? null
      : 'video requires videoId or src';
  }
  for (const field of required) {
    if (!fieldPresent(block[field])) return `missing "${field}" (${block.type})`;
  }
  return null;
}
