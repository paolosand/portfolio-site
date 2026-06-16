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
  const box = boxFor(1000, 2000, 0.7, 0.36, 0.58, 96 * 0.5 / 70);
  const [x, y, w, h] = box;
  assert.ok(x >= 0 && y >= 0 && x + w <= 1 + 1e-9 && y + h <= 1 + 1e-9);
  const pixAspect = (w * 1000) / (h * 2000);
  assert.ok(Math.abs(pixAspect - (96 * 0.5 / 70)) < 1e-6);
});

test('normalizeGrid stretches to the 2nd–98th percentile', () => {
  const g = [[0.4, 0.4, 0.4, 0.4], [0.4, 0.6, 0.6, 0.6]];
  normalizeGrid(g);
  const flat = g.flat();
  assert.ok(Math.min(...flat) <= 0.01);
  assert.ok(Math.max(...flat) >= 0.99);
});

test('lumGridCropFromPixels inverts polarity', () => {
  const px = [[{ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 }],
              [{ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 }]];
  const g = lumGridCropFromPixels(px, [0, 0, 1, 1], 2, 2, { invert: true, normalize: false });
  assert.ok(g.flat().every(v => v < 0.01));
});

test('RAMP is dark→light and non-empty', () => {
  assert.ok(RAMP.length > 60);
  assert.equal(RAMP[0], ' ');
});
