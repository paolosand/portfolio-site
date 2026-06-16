// Build-time: precompute ASCII portrait luminance frames from source photos.
// macOS-only (uses `sips` via decodeToBMP). Run manually: `npm run build:portrait`.
// Reads assets/portrait-src/*, writes src/components/shared/portraitFrames.json.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  decodeToBMP,
  boxFor,
  lumGridCropFromPixels,
  pixAspect,
} from './lib/asciiRender.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'assets/portrait-src');
const OUT = join(ROOT, 'src/components/shared/portraitFrames.json');

const COLS = 96;
const ROWS = 70;

// key · file · role label · crop center (cx,cy) + height-fraction h · polarity · rotate.
// Crop boxes are tuned starting points from the brainstorm.
const FRAMES = [
  { key: 'stage',  file: 'stage.jpeg',  role: 'artist',                 cx: 0.70, cy: 0.36, h: 0.58, invert: true, rotate: 0 },
  { key: 'mirror', file: 'mirror.png',  role: 'engineer',               cx: 0.40, cy: 0.70, h: 0.46, invert: true, rotate: 0 },
  { key: 'dog',    file: 'dog.jpg',     role: 'dog lover (hi mylo :))', cx: 0.22, cy: 0.70, h: 0.52, invert: true, rotate: 0 },
  { key: 'bridge', file: 'bridge.jpg',  role: 'builder',                cx: 0.46, cy: 0.56, h: 0.50, invert: true, rotate: 0 },
];

const round2 = (v) => Math.round(v * 100) / 100;

const pa = pixAspect(COLS, ROWS);
const frames = FRAMES.map(({ key, file, role, cx, cy, h, invert, rotate }) => {
  const { width, height, px } = decodeToBMP(join(SRC_DIR, file), rotate);
  const box = boxFor(width, height, cx, cy, h, pa);
  const grid = lumGridCropFromPixels(px, box, COLS, ROWS, { invert })
    .map((row) => row.map(round2));
  console.log(`✓ ${key.padEnd(7)} ${file.padEnd(14)} ${width}×${height} → box [${box.map((b) => b.toFixed(2)).join(', ')}]`);
  return { key, role, grid };
});

writeFileSync(OUT, JSON.stringify({ cols: COLS, rows: ROWS, frames }) + '\n');
const numbers = frames.length * COLS * ROWS;
console.log(`\nWrote ${frames.length} frames (${numbers} values) → ${OUT.replace(ROOT + '/', '')}`);
