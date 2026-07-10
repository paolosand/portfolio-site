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

// Static (scroll-independent) chapter offsets. Reading offsetTop on a
// position: sticky card includes its current sticky displacement, so offsets
// are instead derived from the deck's own top plus cumulative card heights.
export function staticOffsetsFor(deckTop, cardHeights) {
  const offsets = [];
  let acc = deckTop;
  for (const h of cardHeights) {
    offsets.push(acc);
    acc += h;
  }
  return offsets;
}
