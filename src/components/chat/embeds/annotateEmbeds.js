const DEDUP_TYPES = new Set(['project', 'work', 'music']);

function embedKey(block) {
  return `${block.type}:${block.id || 'artist-profile'}`;
}

// Walk messages in order; the first time a project/work/music entity appears it renders
// 'full', every later mention of the same entity renders 'cite'. Pure — no React, no JSON.
export function annotateEmbeds(messages) {
  const seen = new Set();
  return messages.map(msg => {
    if (!msg.blocks) return msg;
    const blocks = msg.blocks.map(block => {
      if (!DEDUP_TYPES.has(block.type)) return block;
      const key = embedKey(block);
      const render = seen.has(key) ? 'cite' : 'full';
      seen.add(key);
      return { ...block, _embedRender: render };
    });
    return { ...msg, blocks };
  });
}
