# ASCII Portrait Flip-Board Morph — Design Spec

**Date:** 2026-06-16
**Status:** Approved, ready for implementation plan.

## Goal

Replace the static ASCII smiley in the hero portrait card with a live ASCII portrait
that shuffles through a set of photos of Paolo, transitioning between states like an
airport split-flap / Solari departure board. Each state is labeled with a facet of his
identity. The render technique is borrowed from the **ascii_drone** project's
luminance→character-ramp mapping (no WebGL — images are precomputed to ASCII at build time).

This embodies a `DESIGN.md` principle directly: "Show, don't describe" — the portrait *is*
Paolo cycling through artist / engineer / dog lover / builder, rather than a bio listing them.

## Current state being replaced

- `src/components/Hero.jsx` renders `PORTRAIT_ART` (from `src/components/shared/ascii.js`)
  as a static `<pre class="ascii pc-art">` inside `.portrait-card`.
- Card chrome (keep): `.pc-head` (`~/paolo · live` + 3 dots), `.pc-foot` (label + lemon
  `.badge`). Styles in `src/index.css:397–452`.
- `PORTRAIT_ART` and its inline render in `Hero.jsx` are removed.

## The image set (4, with an open 5th slot)

Source photos (full-res) live in a new `assets/portrait-src/` dir (NOT bundled into the app).
Per-image config drives the build script. Crop is expressed as center (cx, cy) + height
fraction (h); width is derived to match the grid's effective pixel aspect. `invert`
controls polarity (dark→ink vs bright→ink) and is chosen per image so the **subject** becomes
the dense ink and the background drops toward blank paper.

| key    | file                  | role label                | cx   | cy   | h    | invert |
|--------|-----------------------|---------------------------|------|------|------|--------|
| stage  | PaoloSandejas-1.JPEG  | artist                    | 0.70 | 0.36 | 0.58 | true   |
| mirror | IMG_4164.PNG          | engineer                  | 0.40 | 0.70 | 0.46 | true   |
| dog    | camphoto_1804928587.JPG | dog lover (hi mylo :))  | 0.22 | 0.70 | 0.52 | true   |
| bridge | 360be8dd…jpg          | builder                   | 0.46 | 0.56 | 0.50 | true   |

- Order in rotation: stage → mirror → dog → bridge → (loop).
- Dropped during brainstorm: plaque, grad (weak faces), pedal (B&W, face too buried). Paolo
  may add a 5th later — it's just another config row + a re-run of the build script.
- Crop boxes are tuned values from the brainstorm; treat as the starting point.

## Rendering algorithm (build-time)

Per character cell:
1. Center-crop the source to (cx, cy, derived-w, h), then area-average down to the grid.
2. Luminance `L = 0.299r + 0.587g + 0.114b`, normalized to 0..1.
3. **Per-image contrast normalization**: stretch L to its 2nd–98th percentile (prevents
   shadow crush).
4. If `invert`, `L = 1 − L`.
5. Character ramp index = `round(L * (ramp.length − 1))`, ramp (dark→light):
   `` .'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$``

- **Grid density:** 96 columns × 70 rows ("smaller characters" — chosen for facial detail).
- **Cell aspect:** monospace cell ≈ 0.5 (w/h); the crop width is derived as
  `w = (cols*0.5/rows) * h * (imgH/imgW)` so faces aren't distorted. Effective grid pixel
  aspect ≈ 0.686 (portrait).
- HEIC sources may be stored sideways with no EXIF tag → the build script supports a per-image
  `rotate` (currently all 4 keepers need rotate 0).

## Build pipeline

- New script `scripts/build-portrait-frames.mjs` (productionized from the brainstorm prototype).
  Uses macOS `sips` to decode/resize/rotate to BMP and parses BMP pixels directly (no npm deps).
- Reads a config array (the table above) + writes `src/components/shared/portraitFrames.json`:
  ```json
  { "cols": 96, "rows": 70,
    "frames": [ { "key": "stage", "role": "artist", "grid": [[0.0, 0.12, …], …] }, … ] }
  ```
  `grid` values are the post-normalize, post-invert luminances (0..1, 2-decimal rounded);
  the runtime maps them to ramp characters. Storing luminance (not chars) keeps the riffle
  math on the client.
- Runs **locally on macOS** (`sips` dependency) and the JSON is committed. The app bundle and
  Vercel build ship only the JSON — no image decoding, no `sips`, at runtime. Add an npm script
  `"build:portrait": "node scripts/build-portrait-frames.mjs"` (manual, not in the `build` chain).
- Payload: 4 frames × 96×70 ≈ 27k numbers; acceptable as committed JSON.

## Runtime component

New `src/components/AsciiPortrait.jsx`, used by `Hero.jsx` in place of the inline `PORTRAIT_ART`
render. Keeps the existing `.portrait-card` / `.pc-head` / `.pc-foot` markup; replaces the
`<pre>` body and the footer label.

**Morph engine (the locked mechanic): column sweep · scatter · medium · mono.**
- Single `<pre>` updated via `textContent` (mono ink → no per-cell spans needed).
- One `requestAnimationFrame` loop. Per cell, on a transition, advance **forward through the
  ramp** (odometer/Solari) from the source index to the target index, wrapping forward.
- **Column sweep + scatter:** each column has a random stagger delay (precomputed once,
  seeded deterministically so it's stable per mount). All cells in a column flip together;
  columns start at scattered times.
- **Timing (medium):** ~38 ms/flip, ~850 ms stagger spread, ~3.4 s hold per frame. Tunable.
- **Trigger:** auto-loop — after the hold, morph to the next frame.

**Role label (footer):** the `.pc-foot` left cell shows the current frame's role, uppercase
label style. It fades out at morph start and swaps to the new role partway through the sweep
(~60%), fading back in — so the word changes *with* the board. Right cell keeps the lemon
`.badge`.

**Lifecycle / performance:**
- `IntersectionObserver` pauses the loop when the card is off-screen; resumes on re-entry.
- `document.visibilitychange` pauses when the tab is hidden.
- `prefers-reduced-motion: reduce` → no animation: render the first frame statically and do
  not auto-advance (no riffle, no role cycling). Honor changes to the media query.
- Clean up rAF, timers, and observers on unmount.

**Accessibility:**
- `.portrait-card` gets `role="img"` + `aria-label="ASCII portrait of Paolo Sandejas, cycling
  through artist, engineer, dog lover, and builder"`.
- The `<pre>` is `aria-hidden="true"` (decorative glyph soup).
- Not focusable / not keyboard-interactive (passive auto-loop). No focus traps.

## CSS changes (`src/index.css`)

- `.portrait-card .pc-art`: `font-size` 10px → ~3.4px, `line-height: 1.0`, `letter-spacing: 0`,
  keep `white-space: pre; overflow: hidden; margin: 0`. Center the block. The taller portrait
  grid sets the card's height; verify it fits the hero right column and tune padding.
- `.pc-foot` left cell: add a `.role` span (ink, weight 700, `transition: opacity .25s`).
- Confirm the hero two-column grid still balances with the now-portrait panel; adjust
  `.hero-right` / card max-width only if needed. No new shadows/radii — reuse the existing
  `8px 8px 0` portrait-card shadow (the system's largest, already used here).

## Out of scope / non-goals

- No WebGL, no live webcam, no per-frame color (mono only).
- No runtime image decoding; frames are precomputed.
- The build script targets macOS `sips`; cross-platform decoding is not needed (single author).

## Testing / verification

- Build script: assert output JSON shape (cols, rows, frames[].grid dimensions = rows×cols,
  values in [0,1], role present). A small `node --test` over a fixture image.
- Component: render in a headless browser, confirm the first frame paints, a morph completes
  to the next frame, role text updates, and reduced-motion renders a single static frame.
  Verify pause on `visibilitychange` and off-screen.
- Visual: run the app and confirm the card matches the approved final preview.

## File changes

- **add** `scripts/build-portrait-frames.mjs`
- **add** `assets/portrait-src/` (the 4 source photos)
- **add** `src/components/shared/portraitFrames.json` (generated, committed)
- **add** `src/components/AsciiPortrait.jsx` (+ co-located styles or additions to `index.css`)
- **edit** `src/components/Hero.jsx` (use `<AsciiPortrait/>`, drop inline `PORTRAIT_ART` render)
- **edit** `src/components/shared/ascii.js` (remove `PORTRAIT_ART`)
- **edit** `src/index.css` (`.pc-art` font size, `.role` span)
- **edit** `package.json` (`build:portrait` script)
