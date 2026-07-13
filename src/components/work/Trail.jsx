import { useLayoutEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useTransform } from 'framer-motion';

// Trail: a straight dashed spine with square station stops, a muted ink line
// that grows with scroll, and a traveling dot. The viewBox tracks the SVG's
// real pixel height (1:1 scale), so nothing distorts. A fixed-height viewBox
// stretched to the viewport (the old approach) squished the square stops and
// round dot into tall rectangles and ovals.
const WIDTHS = { desktop: 30, phone: 18 };
const PAD = 16; // keep the end stations clear of the top bar and bottom edge

export default function Trail({
  variant = 'desktop', stopFractions = [],
  activeIndex = 0, scrollYProgress, onJump, kickers = [],
}) {
  const ref = useRef(null);
  const [h, setH] = useState(0);
  const width = WIDTHS[variant] ?? 30;
  const cx = width / 2;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const top = PAD;
  const bottom = Math.max(top, h - PAD);
  const span = bottom - top;
  const clamp = (f) => Math.min(1, Math.max(0, f));
  const progressY = useTransform(scrollYProgress, (f) => top + clamp(f) * span);

  return (
    <svg
      ref={ref}
      className={`deck-trail ${variant}`}
      viewBox={`0 0 ${width} ${h || 1}`}
      preserveAspectRatio="none"
    >
      <line className="trail-base" x1={cx} y1={top} x2={cx} y2={bottom} />
      <motion.line className="trail-ink" x1={cx} y1={top} x2={cx} y2={progressY} />
      {stopFractions.map((f, i) => {
        const y = top + f * span;
        return (
          <rect
            key={i}
            className={`trail-stop ${i < activeIndex ? 'done' : ''} ${i === activeIndex ? 'now' : ''}`}
            x={cx - 4}
            y={y - 4}
            width="8"
            height="8"
            transform={i === activeIndex ? `rotate(45 ${cx} ${y})` : undefined}
            role="button"
            tabIndex={0}
            aria-label={`jump to ${kickers[i] || `chapter ${i + 1}`}`}
            onClick={() => onJump(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onJump(i); }
            }}
          />
        );
      })}
      <motion.circle className="trail-dot" r="4" cx={cx} cy={progressY} />
    </svg>
  );
}
