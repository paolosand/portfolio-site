# ASCII Portrait Flip-Board Morph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static hero ASCII smiley with a live ASCII portrait that auto-loops through 4 photos of Paolo, morphing between them like a Solari split-flap board, each labeled with an identity role.

**Architecture:** A local macOS build script precomputes each photo into a normalized luminance grid (`portraitFrames.json`, committed). At runtime a thin React component (`AsciiPortrait.jsx`) maps those grids to ASCII characters and drives a column-sweep/scatter morph via one `requestAnimationFrame` loop. All math lives in two pure, unit-tested modules (`scripts/lib/asciiRender.mjs` build-time, `src/components/shared/asciiMorph.js` runtime); the build script and React component are shells.

**Tech Stack:** Node `node --test` (existing test runner), macOS `sips` (build-time image decode, no npm deps), React 19, Vite, plain CSS in `src/index.css`.

**Spec:** `docs/superpowers/specs/2026-06-16-ascii-portrait-morph-design.md`

---

## File Structure

- **Create** `scripts/lib/asciiRender.mjs` — pure build-time math: `parseBMP`, `boxFor`, `lumGridCropFromPixels`, `normalizeGrid`, `RAMP`. (+ `decodeToBMP` thin `sips` wrapper.)
- **Create** `scripts/lib/asciiRender.test.mjs` — unit tests for the pure functions.
- **Create** `scripts/build-portrait-frames.mjs` — orchestrator: config → decode → crop → write JSON.
- **Create** `assets/portrait-src/` — the 4 source photos (not bundled).
- **Create** `src/components/shared/portraitFrames.json` — generated, committed.
- **Create** `src/components/shared/asciiMorph.js` — pure runtime math: `RAMP`, `lumGridToIndex`, `cellIndexAtElapsed`, `wrapForwardDistance`, `buildColumnDelays`, `transitionGrid`, `gridToText`.
- **Create** `src/components/shared/asciiMorph.test.js` — unit tests.
- **Create** `src/components/AsciiPortrait.jsx` — React shell (rAF loop, role label, lifecycle, a11y).
- **Modify** `src/components/Hero.jsx` — use `<AsciiPortrait/>`, drop inline portrait-card.
- **Modify** `src/components/shared/ascii.js` — remove `PORTRAIT_ART`.
- **Modify** `src/index.css` — `.pc-art` font size; `.pc-foot .role`.
- **Modify** `package.json` — add `build:portrait` script; extend `test` globs.

---

## Task 1: Source assets + feature branch

**Files:**
- Create: `assets/portrait-src/` (4 image files)

- [ ] **Step 1: Create the feature branch**

Run:
```bash
git checkout -b feat/ascii-portrait-morph
```

- [ ] **Step 2: Copy the 4 source photos into the repo**

Run:
```bash
mkdir -p assets/portrait-src
cp ~/Downloads/PaoloSandejas-1.JPEG        assets/portrait-src/stage.jpeg
cp ~/Downloads/IMG_4164.PNG                 assets/portrait-src/mirror.png
cp ~/Downloads/camphoto_1804928587.JPG      assets/portrait-src/dog.jpg
cp ~/Downloads/360be8dd47d26e1f72fb1819376e2eb9.jpg assets/portrait-src/bridge.jpg
ls assets/portrait-src
```
Expected: `bridge.jpg  dog.jpg  mirror.png  stage.jpeg`

- [ ] **Step 3: Commit**

```bash
git add assets/portrait-src
git commit -m "chore: add ASCII portrait source photos"
```

---

## Task 2: Pure build-time render math (`asciiRender.mjs`)

**Files:**
- Create: `scripts/lib/asciiRender.mjs`
- Test: `scripts/lib/asciiRender.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/asciiRender.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBMP, boxFor, normalizeGrid, lumGridCropFromPixels, RAMP } from './asciiRender.mjs';

// Build a minimal 2x2 24-bit BMP (bottom-up, BGR, row-padded to 4 bytes).
function makeBMP(rows) {
  const w = rows[0].length, h = rows.length, bpp = 24;
  const rowSize = Math.floor((bpp * w + 31) / 32) * 4;
  const dataOffset = 54;
  const buf = Buffer.alloc(dataOffset + rowSize * h);
  buf.write('BM', 0);
  buf.writeUInt32LE(buf.length, 2);
  buf.writeUInt32LE(dataOffset, 0x0a);
  buf.writeUInt32LE(40, 0x0e);
  buf.writeInt32LE(w, 0x12);
  buf.writeInt32LE(h, 0x16);          // positive => bottom-up
  buf.writeUInt16LE(1, 0x1a);
  buf.writeUInt16LE(bpp, 0x1c);
  for (let y = 0; y < h; y++) {
    const srcY = h - 1 - y;            // bottom-up storage
    for (let x = 0; x < w; x++) {
      const o = dataOffset + y * rowSize + x * 3;
      const [r, g, b] = rows[srcY][x];
      buf[o] = b; buf[o + 1] = g; buf[o + 2] = r;
    }
  }
  return buf;
}

test('parseBMP reads pixels top-down regardless of storage', () => {
  const buf = makeBMP([[[10, 20, 30], [40, 50, 60]], [[70, 80, 90], [100, 110, 120]]]);
  const { width, height, px } = parseBMP(buf);
  assert.equal(width, 2); assert.equal(height, 2);
  assert.deepEqual(px[0][0], { r: 10, g: 20, b: 30 });
  assert.deepEqual(px[1][1], { r: 100, g: 110, b: 120 });
});

test('boxFor keeps crop within [0,1] and matches grid pixel aspect', () => {
  // square-ish image, portrait grid
  const box = boxFor(1000, 2000, 0.7, 0.36, 0.58, 96 * 0.5 / 70);
  const [x, y, w, h] = box;
  assert.ok(x >= 0 && y >= 0 && x + w <= 1 + 1e-9 && y + h <= 1 + 1e-9);
  const pixAspect = (w * 1000) / (h * 2000);
  assert.ok(Math.abs(pixAspect - (96 * 0.5 / 70)) < 1e-6);
});

test('normalizeGrid stretches to the 2nd–98th percentile', () => {
  const g = [[0.4, 0.4, 0.4, 0.4], [0.4, 0.6, 0.6, 0.6]]; // min 0.4 max 0.6
  normalizeGrid(g);
  const flat = g.flat();
  assert.ok(Math.min(...flat) <= 0.01);
  assert.ok(Math.max(...flat) >= 0.99);
});

test('lumGridCropFromPixels inverts polarity', () => {
  // 2x2 all white; invert => luminance 0
  const px = [[{ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 }],
              [{ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 }]];
  const g = lumGridCropFromPixels(px, [0, 0, 1, 1], 2, 2, { invert: true, normalize: false });
  assert.ok(g.flat().every(v => v < 0.01));
});

test('RAMP is dark→light and non-empty', () => {
  assert.ok(RAMP.length > 60);
  assert.equal(RAMP[0], ' ');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/lib/asciiRender.test.mjs`
Expected: FAIL — `Cannot find module './asciiRender.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/asciiRender.mjs`:
```js
// Pure build-time image→luminance math for the ASCII portrait. No npm deps.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const RAMP =
  " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

const CHAR_ASPECT = 0.5; // monospace cell width/height

export function parseBMP(buf) {
  const dataOffset = buf.readUInt32LE(0x0a);
  const width = buf.readInt32LE(0x12);
  const height = buf.readInt32LE(0x16);
  const bpp = buf.readUInt16LE(0x1c);
  const bytesPP = bpp / 8;
  const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
  const bottomUp = height > 0;
  const h = Math.abs(height);
  const px = [];
  for (let y = 0; y < h; y++) {
    const srcRow = bottomUp ? h - 1 - y : y;
    const row = [];
    for (let x = 0; x < width; x++) {
      const o = dataOffset + srcRow * rowSize + x * bytesPP;
      row.push({ r: buf[o + 2], g: buf[o + 1], b: buf[o] });
    }
    px.push(row);
  }
  return { width, height: h, px };
}

// Center crop (cx,cy) of height-fraction h; width derived for the grid's pixel aspect.
export function boxFor(iw, ih, cx, cy, h, pixAspect) {
  let w = Math.min(1, pixAspect * h * (ih / iw));
  h = Math.min(1, h);
  const x = Math.max(0, Math.min(1 - w, cx - w / 2));
  const y = Math.max(0, Math.min(1 - h, cy - h / 2));
  return [x, y, w, h];
}

export function normalizeGrid(grid) {
  const flat = grid.flat().slice().sort((a, b) => a - b);
  const lo = flat[Math.floor(flat.length * 0.02)];
  const hi = flat[Math.floor(flat.length * 0.98)];
  const span = Math.max(1e-3, hi - lo);
  for (const row of grid)
    for (let i = 0; i < row.length; i++)
      row[i] = Math.max(0, Math.min(1, (row[i] - lo) / span));
  return grid;
}

// Sample a normalized crop box of parsed pixels into a cols×rows luminance grid.
export function lumGridCropFromPixels(px, box, cols, rows, { invert = false, normalize = true } = {}) {
  const W = px[0].length, H = px.length;
  const [bx, by, bw, bh] = box;
  const x0 = Math.round(bx * W), y0 = Math.round(by * H);
  const cw = Math.round(bw * W), ch = Math.round(bh * H);
  const grid = [];
  for (let ry = 0; ry < rows; ry++) {
    const row = [];
    for (let rx = 0; rx < cols; rx++) {
      const sx0 = x0 + Math.floor((rx / cols) * cw);
      const sx1 = x0 + Math.floor(((rx + 1) / cols) * cw);
      const sy0 = y0 + Math.floor((ry / rows) * ch);
      const sy1 = y0 + Math.floor(((ry + 1) / rows) * ch);
      let sum = 0, n = 0;
      for (let yy = sy0; yy < Math.max(sy0 + 1, sy1); yy++)
        for (let xx = sx0; xx < Math.max(sx0 + 1, sx1); xx++) {
          if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
          const p = px[yy][xx];
          sum += (p.r * 0.299 + p.g * 0.587 + p.b * 0.114) / 255; n++;
        }
      row.push(n ? sum / n : 0);
    }
    grid.push(row);
  }
  if (normalize) normalizeGrid(grid);
  if (invert) for (const r of grid) for (let i = 0; i < r.length; i++) r[i] = 1 - r[i];
  return grid;
}

// Thin sips wrapper: decode/rotate/downscale to BMP and parse. macOS-only (build time).
export function decodeToBMP(imgPath, rot = 0) {
  const tmp = '/tmp/_ascii_portrait_work.bmp';
  const rotArgs = rot ? ['--rotate', String(rot)] : [];
  execFileSync('sips', [...rotArgs, '-Z', '1000', '-s', 'format', 'bmp', imgPath, '--out', tmp]);
  return parseBMP(readFileSync(tmp));
}

export function pixAspect(cols, rows) { return (cols * CHAR_ASPECT) / rows; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/lib/asciiRender.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/asciiRender.mjs scripts/lib/asciiRender.test.mjs
git commit -m "feat: pure build-time ASCII render math with tests"
```

---

## Task 3: Build script orchestrator

**Files:**
- Create: `scripts/build-portrait-frames.mjs`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Write the build script**

Create `scripts/build-portrait-frames.mjs`:
```js
// Precompute portrait photos into normalized luminance grids for the hero ASCII morph.
// Run locally on macOS (uses sips): `npm run build:portrait`. Output JSON is committed.
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { decodeToBMP, boxFor, lumGridCropFromPixels, pixAspect } from './lib/asciiRender.mjs';

const COLS = 96, ROWS = 70;

// key, file, role label, crop center (cx,cy), height fraction h, rotate, invert
const CONFIG = [
  { key: 'stage',  file: 'assets/portrait-src/stage.jpeg', role: 'artist',
    cx: 0.70, cy: 0.36, h: 0.58, rot: 0, invert: true },
  { key: 'mirror', file: 'assets/portrait-src/mirror.png', role: 'engineer',
    cx: 0.40, cy: 0.70, h: 0.46, rot: 0, invert: true },
  { key: 'dog',    file: 'assets/portrait-src/dog.jpg', role: 'dog lover (hi mylo :))',
    cx: 0.22, cy: 0.70, h: 0.52, rot: 0, invert: true },
  { key: 'bridge', file: 'assets/portrait-src/bridge.jpg', role: 'builder',
    cx: 0.46, cy: 0.56, h: 0.50, rot: 0, invert: true },
];

function dims(path) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path]).toString();
  return [+out.match(/pixelWidth:\s*(\d+)/)[1], +out.match(/pixelHeight:\s*(\d+)/)[1]];
}

const frames = CONFIG.map(c => {
  const [iw, ih] = dims(c.file);
  const box = boxFor(iw, ih, c.cx, c.cy, c.h, pixAspect(COLS, ROWS));
  const px = decodeToBMP(c.file, c.rot).px;
  const grid = lumGridCropFromPixels(px, box, COLS, ROWS, { invert: c.invert, normalize: true })
    .map(r => r.map(v => Math.round(v * 100) / 100));
  return { key: c.key, role: c.role, grid };
});

const outPath = 'src/components/shared/portraitFrames.json';
writeFileSync(outPath, JSON.stringify({ cols: COLS, rows: ROWS, frames }));
console.log(`wrote ${outPath}: ${frames.length} frames @ ${COLS}x${ROWS}`);
```

- [ ] **Step 2: Add npm scripts**

In `package.json`, add to `"scripts"` a `build:portrait` entry and extend `test` globs:
```json
    "build:portrait": "node scripts/build-portrait-frames.mjs",
    "test": "node --test api/_lib/*.test.js src/components/chat/*.test.js src/components/chat/embeds/*.test.js src/components/shared/*.test.js scripts/lib/*.test.mjs",
```
(Keep the existing `dev`, `build`, `ingest`, `lint`, `preview` entries unchanged.)

- [ ] **Step 3: Commit**

```bash
git add scripts/build-portrait-frames.mjs package.json
git commit -m "feat: portrait frames build script + npm wiring"
```

---

## Task 4: Generate and commit the frames JSON

**Files:**
- Create: `src/components/shared/portraitFrames.json` (generated)

- [ ] **Step 1: Run the build**

Run: `npm run build:portrait`
Expected: `wrote src/components/shared/portraitFrames.json: 4 frames @ 96x70`

- [ ] **Step 2: Sanity-check the output shape**

Run:
```bash
node -e 'const d=require("./src/components/shared/portraitFrames.json");console.log(d.cols,d.rows,d.frames.length,d.frames[0].role,d.frames[0].grid.length,d.frames[0].grid[0].length)'
```
Expected: `96 70 4 artist 70 96`

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/portraitFrames.json
git commit -m "feat: generate ASCII portrait frames data"
```

---

## Task 5: Pure runtime morph engine (`asciiMorph.js`)

**Files:**
- Create: `src/components/shared/asciiMorph.js`
- Test: `src/components/shared/asciiMorph.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/components/shared/asciiMorph.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RAMP, lumToIndex, lumGridToIndex, wrapForwardDistance,
  cellIndexAtElapsed, buildColumnDelays, transitionGrid, gridToText,
} from './asciiMorph.js';

test('lumToIndex maps 0→0 and 1→last and clamps', () => {
  assert.equal(lumToIndex(0), 0);
  assert.equal(lumToIndex(1), RAMP.length - 1);
  assert.equal(lumToIndex(2), RAMP.length - 1);
  assert.equal(lumToIndex(-1), 0);
});

test('wrapForwardDistance always wraps forward', () => {
  assert.equal(wrapForwardDistance(2, 5, 10), 3);
  assert.equal(wrapForwardDistance(8, 1, 10), 3); // wraps past the end
  assert.equal(wrapForwardDistance(4, 4, 10), 0);
});

test('cellIndexAtElapsed: before delay shows source, after enough flips shows target', () => {
  // src=2 tgt=5 dist=3, flip=40ms
  assert.equal(cellIndexAtElapsed(2, 5, -10, 40, RAMP.length), 2); // local<0 → source
  assert.equal(cellIndexAtElapsed(2, 5, 0, 40, RAMP.length), 2);   // 0 steps
  assert.equal(cellIndexAtElapsed(2, 5, 50, 40, RAMP.length), 3);  // 1 step
  assert.equal(cellIndexAtElapsed(2, 5, 1000, 40, RAMP.length), 5);// settled
});

test('buildColumnDelays is deterministic for a seed and within [0,spread]', () => {
  const a = buildColumnDelays(96, 850, 12345);
  const b = buildColumnDelays(96, 850, 12345);
  assert.deepEqual(a, b);
  assert.equal(a.length, 96);
  assert.ok(a.every(d => d >= 0 && d <= 850));
});

test('transitionGrid reports done only when every cell has settled', () => {
  const start = [[0, 0]], target = [[5, 5]];
  const delays = [0, 0];
  const early = transitionGrid(start, target, 0, delays, 40, RAMP.length);
  assert.equal(early.done, false);
  const late = transitionGrid(start, target, 100000, delays, 40, RAMP.length);
  assert.equal(late.done, true);
  assert.deepEqual(late.grid, target);
});

test('gridToText renders ramp characters with newlines', () => {
  const txt = gridToText([[0, RAMP.length - 1]], RAMP);
  assert.equal(txt, ' ' + RAMP[RAMP.length - 1] + '\n');
});

test('lumGridToIndex converts a luminance grid to ramp indices', () => {
  assert.deepEqual(lumGridToIndex([[0, 1]]), [[0, RAMP.length - 1]]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/components/shared/asciiMorph.test.js`
Expected: FAIL — `Cannot find module './asciiMorph.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/components/shared/asciiMorph.js`:
```js
// Pure morph math for the ASCII portrait (ESM — the repo is "type": "module").
export const RAMP =
  " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

export function lumToIndex(l) {
  return Math.max(0, Math.min(RAMP.length - 1, Math.round(l * (RAMP.length - 1))));
}

export function lumGridToIndex(grid) {
  return grid.map(row => row.map(lumToIndex));
}

export function wrapForwardDistance(src, tgt, len) {
  return ((tgt - src) % len + len) % len;
}

// Ramp index for one cell at `localElapsed` ms past its column delay.
export function cellIndexAtElapsed(srcIdx, tgtIdx, localElapsed, flipMs, len) {
  if (localElapsed < 0) return srcIdx;
  const dist = wrapForwardDistance(srcIdx, tgtIdx, len);
  const steps = Math.floor(localElapsed / flipMs);
  if (steps >= dist) return tgtIdx;
  return (srcIdx + steps) % len;
}

// Deterministic per-column scatter delays in [0, spread]. mulberry32 PRNG.
export function buildColumnDelays(cols, spread, seed) {
  let a = seed >>> 0;
  const rng = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: cols }, () => rng() * spread);
}

// Compute the whole grid at `elapsed` ms into a transition. Column sweep: every cell
// in a column shares that column's delay. Returns { grid, done }.
export function transitionGrid(startIdx, targetIdx, elapsed, colDelays, flipMs, len) {
  const rows = startIdx.length, cols = startIdx[0].length;
  let done = true;
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = new Array(cols);
    for (let x = 0; x < cols; x++) {
      const local = elapsed - colDelays[x];
      const v = cellIndexAtElapsed(startIdx[y][x], targetIdx[y][x], local, flipMs, len);
      row[x] = v;
      if (v !== targetIdx[y][x]) done = false;
    }
    grid.push(row);
  }
  return { grid, done };
}

export function gridToText(idxGrid, ramp) {
  let s = '';
  for (const row of idxGrid) { for (const i of row) s += ramp[i]; s += '\n'; }
  return s;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/components/shared/asciiMorph.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the full suite to confirm nothing else broke**

Run: `npm test`
Expected: all tests pass (existing + the two new files).

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/asciiMorph.js src/components/shared/asciiMorph.test.js
git commit -m "feat: pure ASCII morph engine with tests"
```

---

## Task 6: `AsciiPortrait.jsx` component

**Files:**
- Create: `src/components/AsciiPortrait.jsx`

- [ ] **Step 1: Write the component**

Create `src/components/AsciiPortrait.jsx`:
```jsx
import { useEffect, useRef, useState } from 'react';
import frameData from './shared/portraitFrames.json';
import {
  RAMP, lumGridToIndex, buildColumnDelays, transitionGrid, gridToText,
} from './shared/asciiMorph.js';

const FLIP_MS = 38;     // per-cell flip cadence
const SPREAD_MS = 850;  // column scatter spread
const HOLD_MS = 3400;   // dwell on each face
const SEED = 0x5eed;    // stable cascade

const { cols, rows, frames } = frameData;
const idxFrames = frames.map((f) => lumGridToIndex(f.grid));

export default function AsciiPortrait() {
  const preRef = useRef(null);
  const roleRef = useRef(null);
  const [role, setRole] = useState(frames[0].role);

  useEffect(() => {
    const pre = preRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Static render helper.
    const paintStatic = (i) => {
      pre.textContent = gridToText(idxFrames[i], RAMP);
      setRole(frames[i].role);
    };

    if (reduce.matches) { paintStatic(0); return; }

    const colDelays = buildColumnDelays(cols, SPREAD_MS, SEED);
    let cur = idxFrames[0].map((r) => r.slice());
    let fi = 0;
    let raf = 0, holdTimer = 0, running = true, visible = true;

    paintStatic(0);

    const morph = (nf) => {
      const start = cur.map((r) => r.slice());
      const target = idxFrames[nf];
      const t0 = performance.now();
      let roleSwapped = false;
      const step = (now) => {
        if (!running || !visible) return;
        const elapsed = now - t0;
        const { grid, done } = transitionGrid(start, target, elapsed, colDelays, FLIP_MS, RAMP.length);
        pre.textContent = gridToText(grid, RAMP);
        if (!roleSwapped && elapsed > SPREAD_MS * 0.6) { roleSwapped = true; setRole(frames[nf].role); }
        if (done) { cur = target.map((r) => r.slice()); fi = nf; setRole(frames[nf].role);
          holdTimer = setTimeout(() => { if (running && visible) morph((fi + 1) % frames.length); }, HOLD_MS);
        } else { raf = requestAnimationFrame(step); }
      };
      raf = requestAnimationFrame(step);
    };

    const startLoop = () => { holdTimer = setTimeout(() => morph((fi + 1) % frames.length), HOLD_MS); };

    // Pause when off-screen.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && running) { cancelAnimationFrame(raf); clearTimeout(holdTimer); startLoop(); }
      else { cancelAnimationFrame(raf); clearTimeout(holdTimer); }
    }, { threshold: 0.05 });
    io.observe(pre);

    // Pause when tab hidden.
    const onVis = () => {
      running = !document.hidden;
      if (running && visible) { cancelAnimationFrame(raf); clearTimeout(holdTimer); startLoop(); }
      else { cancelAnimationFrame(raf); clearTimeout(holdTimer); }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf); clearTimeout(holdTimer);
      io.disconnect(); document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div
      className="portrait-card"
      role="img"
      aria-label="ASCII portrait of Paolo Sandejas, cycling through artist, engineer, dog lover, and builder"
    >
      <div className="pc-head">
        <span>~/paolo · live</span>
        <div className="dots"><span></span><span></span><span></span></div>
      </div>
      <pre className="ascii pc-art" ref={preRef} aria-hidden="true"></pre>
      <div className="pc-foot">
        <span className="role" ref={roleRef}>{role}</span>
        <span className="badge">v0.5</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds (no runtime wiring yet)**

Run: `npx vite build`
Expected: Vite bundles successfully (component compiles; not yet rendered). We use `npx vite build` rather than `npm run build` because the latter first runs `api/_scripts/ingest.mjs`, which needs API keys/network and is irrelevant to this check.

- [ ] **Step 3: Commit**

```bash
git add src/components/AsciiPortrait.jsx
git commit -m "feat: AsciiPortrait morphing component"
```

---

## Task 7: CSS for the dense portrait grid

**Files:**
- Modify: `src/index.css` (`.portrait-card .pc-art` at line ~428; `.pc-foot` at ~437)

- [ ] **Step 1: Update `.pc-art` for the dense grid**

In `src/index.css`, replace the `.portrait-card .pc-art { ... }` rule with:
```css
.portrait-card .pc-art {
  font-size: 3.4px;
  line-height: 1.0;
  letter-spacing: 0;
  padding: 16px 14px;
  color: var(--ink);
  overflow: hidden;
  margin: 0;
  text-align: center;
  white-space: pre;
}
```

- [ ] **Step 2: Add the rotating `.role` style**

In `src/index.css`, immediately after the `.portrait-card .pc-foot { ... }` rule, add:
```css
.portrait-card .pc-foot .role {
  color: var(--ink);
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: opacity 0.25s ease;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: dense ASCII portrait grid + rotating role label"
```

---

## Task 8: Wire into Hero, remove the old smiley

**Files:**
- Modify: `src/components/Hero.jsx` (import + replace `.portrait-card` block, lines ~43–66)
- Modify: `src/components/shared/ascii.js` (remove `PORTRAIT_ART`, lines 3–18)

- [ ] **Step 1: Import the component in Hero**

In `src/components/Hero.jsx`, change the imports at the top so `PORTRAIT_ART` is no longer imported and `AsciiPortrait` is:
```jsx
import portfolioData from '../data/portfolio.json';
import { PROP_ART } from './shared/ascii.js';
import AsciiPortrait from './AsciiPortrait.jsx';
import './Hero.css';
```

- [ ] **Step 2: Replace the inline portrait-card with the component**

In `src/components/Hero.jsx`, replace the entire `<div className="hero-right"> … </div>` block (the one containing `<div className="portrait-card">` with `pc-head`/`pc-art`/`pc-foot`) with:
```jsx
        <div className="hero-right">
          <AsciiPortrait />
        </div>
```

- [ ] **Step 3: Remove the now-unused `PORTRAIT_ART`**

In `src/components/shared/ascii.js`, delete the entire `export const PORTRAIT_ART = [ ... ];` array (lines 3–18). Leave `PROJECT_ART`, `PROP_ART`, `POSTCARD_ASCII`, `CHAT_PROMPTS`, and the tag helpers intact.

- [ ] **Step 4: Verify build + lint**

Run: `npx vite build && npm run lint`
Expected: bundles successfully; lint passes (no unused `PORTRAIT_ART` import remaining). (`npx vite build` skips the unrelated `ingest.mjs` prestep.)

- [ ] **Step 5: Commit**

```bash
git add src/components/Hero.jsx src/components/shared/ascii.js
git commit -m "feat: render morphing AsciiPortrait in the hero, drop static smiley"
```

---

## Task 9: Verify in the running app

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite serves on a localhost port.

- [ ] **Step 2: Confirm the behavior**

Load the site. Confirm:
- The hero right panel shows a dense ASCII portrait that reads as Paolo (the `stage` frame first).
- After ~3.4s it morphs column-by-column (scattered) into the next face; the footer role updates artist → engineer → dog lover (hi mylo :)) → builder, looping.
- Scrolling the card off-screen pauses it; returning resumes.
- With OS "Reduce Motion" enabled, the portrait renders one static frame and does not animate.

- [ ] **Step 3: Capture a screenshot for the record**

Use the project's `run` skill (or Playwright) to screenshot the hero, and confirm it matches the approved final preview.

- [ ] **Step 4: Final commit (if any verification tweaks were needed)**

```bash
git add -A
git commit -m "chore: ASCII portrait verification tweaks"
```
(Skip if no changes.)

---

## Notes for the implementer

- **5th image slot:** to add another face later, drop the photo in `assets/portrait-src/`, add a `CONFIG` row in `scripts/build-portrait-frames.mjs` (key, role, cx, cy, h, rot, invert), re-run `npm run build:portrait`, commit the regenerated JSON. No component changes.
- **Crop tuning:** the `cx/cy/h/invert` values are tuned from brainstorming. If a face sits wrong, adjust that row and re-run the build; nothing else changes.
- **Timing:** `FLIP_MS` / `SPREAD_MS` / `HOLD_MS` in `AsciiPortrait.jsx` are the morph feel; the approved feel is 38 / 850 / 3400.
- **Badge:** kept as `v0.5` per the approved preview; change if the site versioning differs.
```
