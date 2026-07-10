import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useTransform } from 'framer-motion';

// Hand-drawn trail: dashed base route, pink ink that draws with scroll, a
// traveling dot, and square station stops (pink diamond when current).
// One spec, two variants — desktop gets the detour loop when the case study
// has a detour chapter.
const PATHS = {
  desktop: {
    width: 30,
    detour: 'M 15 16 C 15 80 8 112 15 155 C 22 198 26 203 20 228 C 15 248 5 242 9 224 C 12 210 24 218 22 240 C 20 274 15 324 15 384',
    straight: 'M 15 16 C 15 80 10 140 15 200 C 20 260 15 320 15 384',
  },
  phone: {
    width: 18,
    detour: 'M 9 16 C 9 70 6 110 9 155 C 12 200 12 210 9 250 C 6 290 9 330 9 384',
    straight: 'M 9 16 C 9 70 6 110 9 155 C 12 200 12 210 9 250 C 6 290 9 330 9 384',
  },
};

export default function Trail({
  variant = 'desktop', hasDetour = false, stopFractions = [],
  activeIndex = 0, scrollYProgress, onJump, kickers = [],
  pathOverride = null, // per-project geometry: {desktop?: 'M…', phone?: 'M…'}
}) {
  const pathRef = useRef(null);
  const [geom, setGeom] = useState({ length: 0, points: [] });
  const spec = PATHS[variant];
  const d = pathOverride?.[variant] ?? (hasDetour ? spec.detour : spec.straight);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    setGeom({
      length,
      points: stopFractions.map((f) => path.getPointAtLength(length * f)),
    });
  }, [stopFractions, d]);

  const dashOffset = useTransform(scrollYProgress, (f) => geom.length * (1 - f));
  const dotCx = useTransform(scrollYProgress, (f) =>
    geom.length ? pathRef.current.getPointAtLength(geom.length * f).x : -10);
  const dotCy = useTransform(scrollYProgress, (f) =>
    geom.length ? pathRef.current.getPointAtLength(geom.length * f).y : -10);

  return (
    <svg
      className={`deck-trail ${variant}`}
      viewBox={`0 0 ${spec.width} 400`}
      preserveAspectRatio="none"
    >
      <path className="trail-base" d={d} />
      <motion.path
        ref={pathRef}
        className="trail-ink"
        d={d}
        strokeDasharray={geom.length || 1}
        style={{ strokeDashoffset: dashOffset }}
      />
      {geom.points.map((pt, i) => (
        <rect
          key={i}
          className={`trail-stop ${i < activeIndex ? 'done' : ''} ${i === activeIndex ? 'now' : ''}`}
          x={pt.x - 4}
          y={pt.y - 4}
          width="8"
          height="8"
          transform={i === activeIndex ? `rotate(45 ${pt.x} ${pt.y})` : undefined}
          role="button"
          tabIndex={0}
          aria-label={`jump to ${kickers[i] || `chapter ${i + 1}`}`}
          onClick={() => onJump(i)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onJump(i); }
          }}
        />
      ))}
      <motion.circle className="trail-dot" r="4" cx={dotCx} cy={dotCy} />
    </svg>
  );
}
