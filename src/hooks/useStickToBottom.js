import { useCallback, useEffect, useRef } from 'react';
import { isAtBottom } from '../components/chat/stickToBottom';

// Standard chat "stick to bottom": keep a scroll container pinned to its bottom
// edge as content grows, but let go the moment the user scrolls up so they can
// read back through a reply while it's still streaming.
//
// The pin is instant (`scrollTop = scrollHeight`). A stream adds height in many
// small, regular steps, and snapping to the bottom on each one already reads as
// smooth — far cleaner than firing a fresh `scrollIntoView({behavior:'smooth'})`
// animation on every typewriter tick, which just stack up and fight each other.
//
// Returns:
//   containerRef    — attach to the scrollable element
//   onScroll        — attach to that element's onScroll
//   scrollToBottom  — force a re-pin (e.g. right after the user sends a message)
export function useStickToBottom() {
  const containerRef = useRef(null);
  // Whether we're currently following the bottom. A ref, not state — it changes
  // on every scroll event and must never trigger a re-render.
  const stickRef = useRef(true);

  const pin = useCallback(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const scrollToBottom = useCallback(() => {
    stickRef.current = true;
    pin();
  }, [pin]);

  // Re-evaluate on every user scroll. Our own pin lands at distance ~0, so it
  // keeps stick = true; scrolling up past the threshold flips it off, and
  // scrolling back down re-arms it.
  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) stickRef.current = isAtBottom(el);
  }, []);

  // Follow height changes without knowing anything about the typewriter: a
  // ResizeObserver on the container and its content fires when a line wraps in,
  // an embed opens, or the mobile keyboard shrinks the viewport — and we re-pin
  // if the user hasn't scrolled away.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => {
      if (stickRef.current) pin();
    });
    for (const target of [el, ...el.children]) observer.observe(target);

    if (stickRef.current) pin();
    return () => observer.disconnect();
  }, [pin]);

  return { containerRef, onScroll, scrollToBottom };
}
