// Pure geometry for the folding deck — kept DOM-free for node --test.

// A card taller than the viewport gets a negative sticky top so it scrolls
// through its own content before pinning (bottom-aligned pin).
export function stickyTopFor(cardHeight, viewportHeight) {
  return Math.min(0, viewportHeight - cardHeight);
}

// Active chapter = the last one whose start has come within half a viewport.
export function activeIndexFor(scrollTop, offsets, viewportHeight) {
  let active = 0;
  offsets.forEach((top, i) => {
    if (scrollTop >= top - viewportHeight * 0.5) active = i;
  });
  return active;
}

export function stopFractionsFor(offsets, scrollableHeight) {
  return offsets.map((top) =>
    scrollableHeight <= 0 ? 0 : Math.min(1, top / scrollableHeight),
  );
}
