import { useCallback, useEffect, useRef, useState } from 'react';
import { activeIndexFor, stickyTopFor, stopFractionsFor } from './deckMath.js';

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
    offsetsRef.current = cards.map((card) => (card ? card.offsetTop : 0));
    setStopFractions(stopFractionsFor(offsetsRef.current, el.scrollHeight - vh));
    setActiveIndex(activeIndexFor(el.scrollTop, offsetsRef.current, vh));
  }, [containerRef, chapterCount]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    measure();
    const onScroll = () => {
      setActiveIndex(activeIndexFor(el.scrollTop, offsetsRef.current, el.clientHeight));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [containerRef, measure]);

  const jumpTo = useCallback((i) => {
    containerRef.current?.scrollTo({
      top: offsetsRef.current[i] ?? 0,
      behavior: 'smooth',
    });
  }, [containerRef]);

  return { chapterRefs, activeIndex, stopFractions, jumpTo };
}
