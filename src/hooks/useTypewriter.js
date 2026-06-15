import { useEffect, useState } from 'react';
import { nextRevealCount, TICK_MS } from '../components/chat/typewriter';

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// Progressively reveals `fullText` one chunk at a time. When `enabled` is false
// (restored history, reduced motion) the full text shows immediately.
// Returns the visible slice and whether the reveal has caught up to the target.
export function useTypewriter(fullText, enabled = true) {
  const target = fullText.length;
  const [count, setCount] = useState(enabled ? 0 : target);
  const [prevTarget, setPrevTarget] = useState(target);

  // Derived-state correction during render (no flash): if the target was
  // replaced by a shorter string, restart the reveal from the beginning.
  if (target !== prevTarget) {
    setPrevTarget(target);
    if (target < count) setCount(0);
  }
  if (!enabled && count !== target) setCount(target);

  useEffect(() => {
    if (!enabled || count >= target) return undefined;
    const id = setTimeout(() => setCount(c => nextRevealCount(c, target)), TICK_MS);
    return () => clearTimeout(id);
  }, [enabled, count, target]);

  return {
    text: fullText.slice(0, Math.min(count, target)),
    done: count >= target,
  };
}
