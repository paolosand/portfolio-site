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
