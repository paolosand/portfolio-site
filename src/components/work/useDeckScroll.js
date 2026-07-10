import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { activeIndexFor, staticOffsetsFor, stickyTopFor, stopFractionsFor } from './deckMath.js';

// Owns deck geometry side effects: measures chapter offsets, assigns each
// sticky card its top (tall cards scroll through before pinning), tracks the
// active chapter, and exposes jump-scrolling. All math lives in deckMath.js.
export function useDeckScroll(containerRef, chapterCount) {
  const chapterRefs = useRef([]);
  const offsetsRef = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stopFractions, setStopFractions] = useState([]);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const vh = el.clientHeight;
    const cards = chapterRefs.current.slice(0, chapterCount);
    cards.forEach((card) => {
      if (card) card.style.top = `${stickyTopFor(card.offsetHeight, vh)}px`;
    });
    const deck = cards[0]?.parentElement;
    const deckTop = deck ? deck.offsetTop : 0;
    offsetsRef.current = staticOffsetsFor(
      deckTop,
      cards.map((card) => (card ? card.offsetHeight : 0)),
    );
    setStopFractions(stopFractionsFor(offsetsRef.current, el.scrollHeight - vh));
    setActiveIndex(activeIndexFor(el.scrollTop, offsetsRef.current, vh));
  }, [containerRef, chapterCount]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    measure();
    const onScroll = () => {
      setActiveIndex(activeIndexFor(el.scrollTop, offsetsRef.current, el.clientHeight));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    chapterRefs.current.slice(0, chapterCount).forEach((card) => {
      if (card) ro.observe(card);
    });
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [containerRef, measure, chapterCount]);

  const jumpTo = useCallback((i) => {
    const cards = chapterRefs.current;
    const deck = cards[0]?.parentElement;
    const deckTop = deck ? deck.offsetTop : 0;
    const offsets = staticOffsetsFor(
      deckTop,
      cards.map((card) => (card ? card.offsetHeight : 0)),
    );
    containerRef.current?.scrollTo({ top: offsets[i] ?? 0, behavior: 'smooth' });
  }, [containerRef]);

  return { chapterRefs, activeIndex, stopFractions, jumpTo };
}
