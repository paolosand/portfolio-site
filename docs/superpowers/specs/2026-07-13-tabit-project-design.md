# tabIt — portfolio addition (card + case study)

**Date:** 2026-07-13
**Status:** approved design, ready for planning
**Source material:** tabIt repo `README.md`, `PRODUCT.md`, `DESIGN.md` (`~/PortfolioProjects/tabIt`), and Paolo's direction on the local-first architecture decision.

## Goal

Add tabIt to the portfolio at two tiers, matching the existing pattern used for `chuloopa`:

1. A **project card** in the Projects grid.
2. A long-form **folding-deck case study** opened from the card.

tabIt is a play-along guitar-chord tool: paste a YouTube URL (or drop audio) and a Python MIR engine detects chords, key, and scales from the audio itself, emits a `chart JSON`, and both a React web app and an MV3 Chrome extension render it — the extension following karaoke-style under the YouTube player.

**Voice note:** tabIt's own aesthetic is a warm music-notebook (light, paper, Fraunces). The *portfolio* is register: brand — riso-print engineering sketchbook, monospace, ASCII. tabIt is rendered here in the **portfolio's** voice (ASCII art, mono, riso tokens), not tabIt's own look.

## A. Project card

**Placement:** card #2 in the grid — inserted between `chuloopa` (index 0) and `ascii-drone`. `featured: true`, `category: "ml"`. Note: `Projects.jsx` renders `idx === 0` as the wide hero card; tabIt at index 1 is a normal featured card (chuloopa keeps the wide slot).

**`src/data/portfolio.json` — new `projects[1]` entry:**

```json
{
  "id": "tabit",
  "title": "tabIt",
  "subtitle": "Play-along chords from any song's audio",
  "description": "Paste a YouTube URL and tabIt detects the chords, key, and scales from the audio itself — then follows along karaoke-style under the video via a Chrome extension. A Python MIR engine (Demucs source separation → crema chord model on the harmonic mix, CREPE bass tracking on the isolated stem, reconciled into slash chords like A/C#) emits a chart JSON that both a React web app and an MV3 extension render. Low-confidence chords are softened, never hidden.",
  "tags": ["Python", "Audio ML", "Demucs", "FastAPI", "React", "Chrome Extension"],
  "category": "ml",
  "featured": true,
  "links": { "github": "https://github.com/paolosand/tabIt", "demo": null }
}
```

- `demo: null` → the card renders "— no demo —" (it's a Chrome extension + local API; no hosted URL).
- Tag colors via `tagClassByName`: `Python` → lemon (lang), `Audio ML` → blue (ml); the rest fall through to the default (uncolored) class. Acceptable — matches how some chuloopa tags are uncolored.

**Card ASCII art** — new `PROJECT_ART.tabit` key in `src/components/shared/ascii.js`. Beat ribbon with an amber "current chord" sweep (`▓▓`), a dotted low-confidence chord (`G⋯`), and the house `└─ x → y ─┘` pipeline footer:

```
  ┌─[ ♪ chords ]─────────┐
  │ ▓▓░░ ░░░░ ░░░░ ░░░░  │
  │  Am    F    C   G⋯   │
  │  key C · 120 · ▔now  │
  └─ audio → demucs → ♪ ─┘
```

(Final glyph spacing tuned to match the 5-line, ~24-col box used by the other entries during implementation.)

## B. Case-study deck

**New file `src/data/work/tabit.js`**, registered in `src/data/work/index.js`:

```js
export const workRegistry = {
  chuloopa: () => import('./chuloopa.js'),
  tabit: () => import('./tabit.js'),
};
```

Same contract as `chuloopa.js` (`blockTypes.js`): `id`, `chapters[]` with `kicker`, `title`, `shape`, optional `media`, and `blocks[]`. Block types used: `prose`, `ascii-diagram`, `video`, `image`, `highlights`. Shapes used: `poster`, `two-col`, `long`, `text-poster`.

**Contract change — self-hosted video.** The demo clip is a self-hosted MP4, not a YouTube embed. The `video` block must accept **either** `videoId` (YouTube, as chuloopa uses) **or** `src` (a self-hosted file path). Required-field validation in `blockTypes.js` changes from `video: ['videoId']` to "`video` requires `videoId` OR `src`", and the video renderer in `WorkModal.jsx` branches: `src` → an inline `<video>` (autoplay, muted, loop, playsInline, `poster`), `videoId` → the existing YouTube iframe. `workContent.test.js` gets a case for the `src` variant. The reduced-motion / `flattenChapters` path renders the same `<video>` — confirm behavior against the existing reduced-motion handling during implementation.

**Assets already produced** (to be committed to `public/work/`):
- `public/work/tabit-demo.mp4` — 2.1MB, 880×720, h264, 16.2s, faststart, audio stripped. Cap Studio recording of the real extension on the "just a song" video: hover → "♪ Get chords" → beat ribbon following the song (Key D major · 120 bpm · D-major-pentatonic solo · Dmaj7→Gmaj7 · amber sweep).
- `public/work/tabit-demo-poster.jpg` — 54K poster frame (ribbon moment) for the `<video poster>` / reduced-motion fallback.

### Chapters

1. **problem** — `shape: poster`, kicker `problem`.
   - **media:** `video` — hero demo, **self-hosted**: `{ type: 'video', src: '/work/tabit-demo.mp4', poster: '/work/tabit-demo-poster.jpg', orientation: 'portrait', caption: 'the extension following "just a song" — click "♪ get chords", play along' }`. Recorded (Cap Studio); asset in place. No YouTube embed.
   - **prose:** the play-along moment (a song grabs you, you want to play *now*) + the coverage gap: chord sites only have what someone transcribed; unreleased songs, live versions, demos, your own recordings have no tab anywhere. tabIt detects chords from the audio, so you can play along to practically anything.

2. **how it works** — `shape: two-col`, kicker `process`.
   - **media:** `ascii-diagram` — the pipeline, three layers sharing one contract (the chart JSON):
     ```
     YouTube URL / audio
            │
        [ ingest ] ──────────────┐
            │                    │
     [ Demucs separation ]   [ librosa ]  [ Essentia ]
        │          │          beats+tempo   key
   harmonic     bass stem        │            │
        │          │            │            │
   [ crema ]   [ CREPE ]         │            │
      chords    bass f0          │            │
        └────┬─────┘             │            │
        [ reconcile ] → slash chords (A/C#)   │
             └──────────┬───────────┬─────────┘
                   [ post-process ]
                        │
                  ( chart JSON )
                   ├── React web app
                   └── Chrome extension (overlay on youtube.com)
     ```
   - **prose:** three layers, one contract. The engine turns audio → chords/key/scales/beat-grid → chart JSON; the web app and the extension are both just renderers of that JSON. Slash chords come from running the chord model on the drums-removed harmonic mix while a pitch tracker follows the isolated bass stem, then reconciling the two.

3. **the decision: your machine, not the cloud** — `shape: two-col`, kicker `decision` (the signature chapter).
   - **media:** `ascii-diagram` contrasting the chosen local-first path vs the rejected cloud path:
     ```
   REJECTED — cloud backend
     extension ─▶ data-center API ─▶ yt-dlp
        · shared queue, congestion
        · YouTube blocks data-center IPs
        · pay to scale GPUs

   CHOSEN — local-first helper
     extension ─▶ localhost:PORT (background service)
        · one curl install, runs at login
        · residential IP → clean YouTube pulls
        · full local GPU + parallel stages
        · private, free, no queue
     ```
   - **prose:** The extension needs a heavy MIR pipeline (Demucs + two neural models). The reflexive choice is a cloud backend; tabIt runs the backend on the **user's own machine** instead, installed with one `curl` command as a background service that starts at login. Why it's *better*, not just cheaper: no shared-server congestion (each user's requests run on their own hardware, often faster); YouTube throttles/blocks datacenter IPs but a residential IP downloads clean; full use of local hardware — Apple-Silicon GPU for source separation, detection stages parallelized, models kept warm. The honest tradeoff: install friction — mitigated by the one-line installer, the background service (`tabit status/logs/restart`), and the extension's graceful "helper is off" state that recovers on its own once the service is back.

4. **honest confidence** — `shape: long`, kicker `the hard parts` (or `honesty`).
   - **prose:** Chord detection is imperfect — SOTA is ~72% on 7th chords, and human experts only agree ~54% on complex ones. tabIt doesn't fake certainty: low-confidence chords are visibly softer with a dotted underline, never hidden. Click any chord to correct it; edits persist locally. Uncertainty surfaced with grace instead of a confident lie.
   - **media/second block:** `image` — the extension screenshot. Copy tabIt's `docs/assets/extension-youtube.png` → portfolio `public/work/tabit-extension.png`. `alt` describes the beat ribbon under the YouTube player; `caption` notes the live overlay.

5. **status & results** — `shape: text-poster`, kicker `solution`/`status`.
   - **highlights:** e.g.
     - `MIR engine, React web app, and MV3 Chrome extension — all complete`
     - `~36s of compute for a 3.5-min song on Apple Silicon (GPU separation + parallel detection) · instant on cache repeat`
     - `slash-chord inversions (A/C#) via harmonic-mix chords reconciled with isolated-bass pitch tracking`
     - `real-song chord-accuracy benchmark harness (mir_eval scorer)`
     - `one-line macOS installer provisions Python 3.11 (uv), static ffmpeg, model weights, and a login background service`
   - **prose:** short closing — built as an end-to-end MIR product (engine → API → two renderers), in active development but mature enough to play along with today. (Wording to be verified against README status table; no invented metrics.)

## Other integration points

- **`WorkEmbed` / chat:** check whether `src/components/chat/embeds/WorkEmbed.jsx` or the chat knowledge references the work registry / needs a `tabit` case; update `api/knowledge/projects.md` if it enumerates projects. Verify during implementation — do not assume.
- **`workContent.test.js`:** the case-study content test iterates the registry and validates each entry against `blockTypes.js`. Adding `tabit` to the registry means it will be validated automatically; ensure `tabit.js` satisfies every required field and that the updated `video` validation (accepts `src` OR `videoId`) is reflected in the test.
- **`PROJECT_ART` coverage:** `Projects.jsx` renders `PROJECT_ART[p.id]`; the new `tabit` key must exist or the card shows an empty `<pre>`.

## Testing / verification

- `npm test` — existing suite (incl. `workContent.test.js`, `workHash.test.js`) must stay green; the new registry entry is validated by the content test.
- Manual/browser: card appears at position 2, opens the deck; deck folds through all 5 chapters; reduced-motion fallback (`flattenChapters`) renders the flat list; ASCII art renders in the card.
- Lint: `npm run lint`.

## Out of scope / follow-ups

- The hero demo **video recording** — DONE (Cap Studio, self-hosted MP4 in `public/work/`).
- Any change to tabIt itself. This is portfolio-only.
- The 7MB `extension-demo.gif` is **not** used (self-hosted MP4 for the hero; static PNG for the confidence chapter).

## Open items to resolve before "done"

- Confirm `PROJECT_ART.tabit` glyph alignment against the other cards at render time.
- Confirm the self-hosted `<video>` renders correctly in both the deck and the reduced-motion fallback.
