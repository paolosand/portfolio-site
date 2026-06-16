import { useEffect, useRef, useState } from 'react';
import portraitData from './shared/portraitFrames.json';

// Same dark→light ramp the build script targets. Runtime maps luminance → glyph.
const RAMP =
  " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const LEN = RAMP.length;

const { cols, rows, frames } = portraitData;

// Precompute each frame's per-cell ramp index once (module-level, shared across mounts).
const FRAME_IDX = frames.map((f) => {
  const arr = new Int16Array(rows * cols);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      arr[r * cols + c] = Math.round(f.grid[r][c] * (LEN - 1));
  return arr;
});

// Morph timing (the locked "medium" feel). Tunable.
const FLIP_MS = 38; // ms per odometer step
const STAGGER_SPREAD = 850; // column scatter window
const HOLD_MS = 3400; // dwell on each frame
const ROLE_SWAP_AT = 0.6; // fraction of sweep when the footer word changes

// Deterministic PRNG so column stagger is stable per mount (no Math.random flicker).
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function AsciiPortrait() {
  const cardRef = useRef(null);
  const preRef = useRef(null);
  const [role, setRole] = useState(frames[0].role);
  const [roleVisible, setRoleVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Fit the 96×70 grid to the card body: scale font-size so the art fills the
  // available space (binding dimension), re-fitting whenever the card resizes.
  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    // Width of `cols` chars per 1px of font-size, for this exact monospace face.
    const cs = getComputedStyle(pre);
    const probe = document.createElement('span');
    probe.style.cssText =
      'position:absolute;visibility:hidden;white-space:pre;line-height:1;letter-spacing:0;' +
      `font-family:${cs.fontFamily};font-size:200px`;
    probe.textContent = '0'.repeat(cols);
    document.body.appendChild(probe);
    const widthPerFont = probe.getBoundingClientRect().width / 200;
    document.body.removeChild(probe);

    // Publish the art's true width/height ratio so CSS (mobile, width-driven)
    // can size the panel edge-to-edge with no leftover whitespace.
    pre.style.setProperty('--art-aspect', String(widthPerFont / rows));

    const fit = () => {
      const s = getComputedStyle(pre);
      const padX = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight);
      const padY = parseFloat(s.paddingTop) + parseFloat(s.paddingBottom);
      const availW = pre.clientWidth - padX;
      const availH = pre.clientHeight - padY;
      if (availW <= 0 || availH <= 0 || !widthPerFont) return;
      const fs = Math.max(2, Math.min(availW / widthPerFont, availH / rows));
      pre.style.fontSize = `${fs.toFixed(2)}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(pre);
    return () => ro.disconnect();
  }, []);

  // Honor reduced-motion changes — flips the animation effect below on/off.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const display = new Int16Array(FRAME_IDX[0]); // indices currently painted
    const render = () => {
      let s = '';
      for (let r = 0; r < rows; r++) {
        const base = r * cols;
        for (let c = 0; c < cols; c++) s += RAMP[display[base + c]];
        if (r < rows - 1) s += '\n';
      }
      pre.textContent = s;
    };

    // Static first frame; no riffle, no role cycling.
    if (reduceMotion) {
      display.set(FRAME_IDX[0]);
      render();
      const id = requestAnimationFrame(() => {
        setRole(frames[0].role);
        setRoleVisible(true);
      });
      return () => cancelAnimationFrame(id);
    }

    // Per-column scatter delay, seeded so it's identical every mount.
    const rand = mulberry32(0x9e3779b9);
    const stagger = new Float64Array(cols);
    for (let c = 0; c < cols; c++) stagger[c] = rand() * STAGGER_SPREAD;

    const source = new Int16Array(FRAME_IDX[0]);
    const steps = new Int16Array(rows * cols); // forward odometer distance per cell
    let target = FRAME_IDX[0];
    let cur = 0;
    let phase = 'hold'; // 'hold' | 'morph'
    let phaseStart = 0; // in active-clock units
    let morphDur = 0;
    let roleSwapped = false;

    // Active clock that only advances while visible+on-screen — pausing is just
    // "stop accumulating", so resuming never fast-forwards the sweep.
    let clock = 0;
    let lastTs = null;
    let raf = 0;
    let onScreen = true;
    let docVisible = !document.hidden;

    const beginMorph = (now) => {
      const next = (cur + 1) % frames.length;
      source.set(display);
      target = FRAME_IDX[next];
      const colMax = new Int16Array(cols);
      for (let c = 0; c < cols; c++) {
        let m = 0;
        for (let r = 0; r < rows; r++) {
          const i = r * cols + c;
          const d = (((target[i] - source[i]) % LEN) + LEN) % LEN;
          steps[i] = d;
          if (d > m) m = d;
        }
        colMax[c] = m;
      }
      morphDur = 0;
      for (let c = 0; c < cols; c++) {
        const d = stagger[c] + colMax[c] * FLIP_MS;
        if (d > morphDur) morphDur = d;
      }
      cur = next;
      phase = 'morph';
      phaseStart = now;
      roleSwapped = false;
      setRoleVisible(false); // word fades out as the board starts flipping
    };

    const tick = (ts) => {
      if (lastTs == null) lastTs = ts;
      clock += ts - lastTs;
      lastTs = ts;
      const now = clock;

      if (phase === 'hold') {
        if (now - phaseStart >= HOLD_MS) beginMorph(now);
      }
      if (phase === 'morph') {
        const elapsed = now - phaseStart;
        for (let c = 0; c < cols; c++) {
          const ce = elapsed - stagger[c];
          const advanced = ce <= 0 ? 0 : Math.floor(ce / FLIP_MS);
          for (let r = 0; r < rows; r++) {
            const i = r * cols + c;
            const s = advanced < steps[i] ? advanced : steps[i];
            display[i] = (source[i] + s) % LEN;
          }
        }
        render();
        if (!roleSwapped && elapsed >= morphDur * ROLE_SWAP_AT) {
          roleSwapped = true;
          setRole(frames[cur].role);
          setRoleVisible(true); // new word fades back in mid-sweep
        }
        if (elapsed >= morphDur) {
          display.set(target);
          render();
          phase = 'hold';
          phaseStart = now;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const wantRun = () => onScreen && docVisible;
    const ensureRunning = () => {
      if (wantRun() && !raf) {
        lastTs = null; // drop the paused gap from the clock
        raf = requestAnimationFrame(tick);
      }
    };
    const ensureStopped = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        lastTs = null;
      }
    };
    const sync = () => (wantRun() ? ensureRunning() : ensureStopped());

    render();

    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        sync();
      },
      { threshold: 0 }
    );
    if (cardRef.current) io.observe(cardRef.current);

    const onVisibility = () => {
      docVisible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    ensureRunning();

    return () => {
      ensureStopped();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduceMotion]);

  return (
    <div
      className="portrait-card"
      ref={cardRef}
      role="img"
      aria-label="ASCII portrait of Paolo Sandejas, cycling through artist, engineer, dog lover, and builder"
    >
      <div className="pc-head">
        <span>~/paolo · live</span>
        <div className="dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <pre className="ascii pc-art" aria-hidden="true" ref={preRef} />
      <div className="pc-foot">
        <span
          className="role"
          style={{ opacity: roleVisible ? 1 : 0 }}
        >
          {role}
        </span>
        <span className="badge">v0.4.1</span>
      </div>
    </div>
  );
}
