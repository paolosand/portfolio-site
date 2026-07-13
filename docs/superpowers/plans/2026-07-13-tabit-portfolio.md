# tabIt Portfolio Addition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tabIt to the portfolio as a featured project card (#2, between chuloopa and ascii-drone) plus a five-chapter folding-deck case study whose signature chapter is the local-first backend decision.

**Architecture:** Follows the existing two-tier pattern. A card is an entry in `src/data/portfolio.json` with ASCII art in `src/components/shared/ascii.js`; a card becomes openable iff its `id` is a key in `src/data/work/index.js`'s `workRegistry`, which lazy-imports a case-study module (`src/data/work/tabit.js`). The deck and its reduced-motion fallback both render through `BLOCK_RENDERERS` in `src/components/work/WorkBlocks.jsx`. The one new capability is a self-hosted `<video>` (the demo clip is a local MP4, not a YouTube embed), which extends the shared `video` block contract.

**Tech Stack:** React 19, Vite, framer-motion, plain-object content modules, `node --test`.

## Global Constraints

- Card `id`: `tabit`; `category`: `"ml"`; `featured`: `true`; placed at `projects[1]` (index 1, immediately after `chuloopa`). `chuloopa` keeps the wide hero slot (`idx === 0`).
- Card links: `{ "github": "https://github.com/paolosand/tabIt", "demo": null }` (renders "— no demo —").
- Case-study `id` MUST equal its `workRegistry` key: `tabit` (enforced by `workContent.test.js`).
- Video block contract: a `video` block is valid with EITHER `videoId` (YouTube) OR `src` (self-hosted). Do not remove YouTube support — `chuloopa` uses `videoId`.
- Demo assets already committed to `public/work/`: `tabit-demo.mp4` (2.1MB, 880×720, no audio) and `tabit-demo-poster.jpg`. Do NOT re-encode or move them.
- Voice: lowercase prose, warm/plain, matches `chuloopa.js`. tabIt's own notebook aesthetic is NOT used here — this is the portfolio's riso/mono voice.
- No new npm dependencies.
- The test runner only picks up tests matching the globs in `package.json`'s `test` script; `src/components/work/*.test.js` is covered, `src/data/work/*.test.js` is NOT. New tests go in `src/components/work/workContent.test.js`.

---

### Task 1: Extend the video block contract to accept a self-hosted `src`

Adds a shared validator that treats a `video` block as valid with `videoId` OR `src`, teaches `VideoBlock` to render a `<video>` for self-hosted clips, and styles it. This unblocks the case study's hero clip. No content yet.

**Files:**
- Modify: `src/data/work/blockTypes.js` (add `blockValidationError` + `fieldPresent`)
- Modify: `src/components/work/workContent.test.js` (use shared validator; add video-OR test)
- Modify: `src/components/work/WorkBlocks.jsx` (`VideoBlock` branches on `src`)
- Modify: `src/components/work/WorkModal.css` (add `.wm-video video` rules)
- Modify: `src/components/work/WorkDeck.css` (mirror the poster-fill shadow rule for `video`)

**Interfaces:**
- Produces: `blockValidationError(block) -> string | null` in `blockTypes.js` — returns an error message if invalid, else `null`. `video` valid iff `videoId` or `src` present; all other types require every field in `BLOCK_REQUIRED_FIELDS`; unknown type → error.
- Consumes: existing `BLOCK_REQUIRED_FIELDS` (unchanged).

- [ ] **Step 1: Write the failing test**

In `src/components/work/workContent.test.js`, add to the imports from `blockTypes.js` the name `blockValidationError`:

```js
import {
  BLOCK_REQUIRED_FIELDS,
  CHAPTER_SHAPES,
  flattenChapters,
  blockValidationError,
} from '../../data/work/blockTypes.js';
```

Then append this test at the end of the file:

```js
test('video block is valid with either a youtube videoId or a self-hosted src', () => {
  assert.equal(blockValidationError({ type: 'video', videoId: 'abc123' }), null);
  assert.equal(blockValidationError({ type: 'video', src: '/work/tabit-demo.mp4' }), null);
  assert.ok(blockValidationError({ type: 'video' }), 'video with neither must be invalid');
  assert.ok(blockValidationError({ type: 'image', src: '/x.png' }), 'image still needs alt');
  assert.equal(blockValidationError({ type: 'nope' }), 'unknown block type "nope"');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/components/work/workContent.test.js`
Expected: FAIL — `blockValidationError` is `undefined` / not exported.

- [ ] **Step 3: Add the validator to `blockTypes.js`**

Append to `src/data/work/blockTypes.js`:

```js
function fieldPresent(value) {
  return Array.isArray(value)
    ? value.length > 0
    : value != null && String(value).trim() !== '';
}

// Returns an error string if `block` is invalid, else null. A `video` block is
// valid with EITHER a YouTube `videoId` OR a self-hosted file `src`; every other
// type requires all of its BLOCK_REQUIRED_FIELDS.
export function blockValidationError(block) {
  const required = BLOCK_REQUIRED_FIELDS[block.type];
  if (!required) return `unknown block type "${block.type}"`;
  if (block.type === 'video') {
    return fieldPresent(block.videoId) || fieldPresent(block.src)
      ? null
      : 'video requires videoId or src';
  }
  for (const field of required) {
    if (!fieldPresent(block[field])) return `missing "${field}" (${block.type})`;
  }
  return null;
}
```

- [ ] **Step 4: Route the existing content test through the shared validator**

In `src/components/work/workContent.test.js`, replace the local `assertValidBlock` function body so it delegates to the shared validator (keeps the same `where` error context):

```js
function assertValidBlock(block, where) {
  const err = blockValidationError(block);
  assert.ok(!err, `${err} at ${where}`);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test src/components/work/workContent.test.js`
Expected: PASS (existing chuloopa/registry tests + the new video test).

- [ ] **Step 6: Teach `VideoBlock` to render a self-hosted `<video>`**

In `src/components/work/WorkBlocks.jsx`, replace the `VideoBlock` function with:

```jsx
function VideoBlock({ block }) {
  const cls = `wm-block wm-video ${block.orientation === 'portrait' ? 'portrait' : ''}`;
  if (block.src) {
    return (
      <figure className={cls}>
        <video
          src={block.src}
          poster={block.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    );
  }
  return (
    <figure className={cls}>
      <iframe
        src={`https://www.youtube.com/embed/${block.videoId}`}
        title={block.caption || 'demo video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}
```

- [ ] **Step 7: Style the `<video>` to match the `<iframe>` treatment**

In `src/components/work/WorkModal.css`, immediately after the existing `.wm-video iframe { ... }` rule (ends at line ~168), add:

```css
.wm-video video {
  display: block;
  width: 100%;
  height: auto;
  border: 1.5px solid var(--ink);
  box-shadow: 4px 4px 0 var(--ink);
  background: var(--ink);
}
```

In `src/components/work/WorkDeck.css`, immediately after the existing `.poster-fill .wm-video iframe { box-shadow: 6px 6px 0 var(--ink); }` rule (line ~213), add:

```css
.poster-fill .wm-video video { box-shadow: 6px 6px 0 var(--ink); }
```

- [ ] **Step 8: Lint**

Run: `npm run lint`
Expected: no errors (no `jsx-a11y` plugin is configured, so a track-less `<video>` is fine).

- [ ] **Step 9: Commit**

```bash
git add src/data/work/blockTypes.js src/components/work/workContent.test.js src/components/work/WorkBlocks.jsx src/components/work/WorkModal.css src/components/work/WorkDeck.css
git commit -m "feat(work): video block accepts self-hosted src alongside youtube videoId

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Add the tabIt project card

Adds the grid card (data + ASCII art). The card renders immediately; it stays non-openable until Task 3 registers the case study.

**Files:**
- Modify: `src/data/portfolio.json` (insert `projects[1]`)
- Modify: `src/components/shared/ascii.js` (add `PROJECT_ART.tabit`)

**Interfaces:**
- Produces: a project with `id: "tabit"` at `projects[1]`; `PROJECT_ART.tabit` string keyed by that id (consumed by `Projects.jsx` via `PROJECT_ART[p.id]`).

- [ ] **Step 1: Insert the card entry into `portfolio.json`**

In `src/data/portfolio.json`, in the `projects` array, insert this object as the SECOND element — after the `chuloopa` object (the first) and before `ascii-drone`:

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

- [ ] **Step 2: Verify the JSON parses and the order is right**

Run: `node -e "const p=require('./src/data/portfolio.json'); console.log(p.projects.map(x=>x.id))"`
Expected: `[ 'chuloopa', 'tabit', 'ascii-drone', 'hai', 'parallel-paths', 'video-analysis' ]`

- [ ] **Step 3: Add the card ASCII art**

In `src/components/shared/ascii.js`, add a `tabit` key to the `PROJECT_ART` object (place it right after the `chuloopa` entry):

```js
  tabit: `  ┌─[ ♪ chords ]─────────┐
  │ ▓▓░░ ░░░░ ░░░░ ░░░░ │
  │  Am    F    C   G⋯  │
  │  key C · 120 · ▔now │
  └─ audio → chords → ♪ ┘`,
```

- [ ] **Step 4: Run the existing tests (nothing should break)**

Run: `npm test`
Expected: all pass. The `every registry key matches a portfolio project id` test still passes (the registry does not yet reference `tabit`; that direction is fine).

- [ ] **Step 5: Visually verify the card and align the ASCII**

Run: `npm run dev`, open the Projects section. Confirm the tabIt card appears as card **#02 · tabit**, featured, between chuloopa and ascii-drone, links show "↗ github" and "— no demo —", and the ASCII box renders. If the box edges look ragged (proportional glyph widths can drift), nudge the spacing inside the `<pre>` string until the right border lines up, matching the neighboring cards.

- [ ] **Step 6: Commit**

```bash
git add src/data/portfolio.json src/components/shared/ascii.js
git commit -m "feat(projects): add tabIt card (featured, #2) with ascii art

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Add the tabIt case study and make the card openable

Creates the five-chapter case-study module, copies the extension screenshot asset, and registers `tabit` so the card opens the deck. `workContent.test.js` validates the module automatically.

**Files:**
- Create: `src/data/work/tabit.js`
- Create: `public/work/tabit-extension.png` (copied from the tabIt repo)
- Modify: `src/data/work/index.js` (register `tabit`)

**Interfaces:**
- Consumes: the `video` `src` contract from Task 1; the `tabit` project id from Task 2.
- Produces: `workRegistry.tabit` → default-exported case study `{ id: 'tabit', chapters: [...] }`.

- [ ] **Step 1: Copy the extension screenshot into the portfolio**

```bash
cp "/Users/paolosandejas/Documents/PortfolioProjects/tabIt/docs/assets/extension-youtube.png" public/work/tabit-extension.png
ls -lh public/work/tabit-extension.png
```
Expected: the file exists (~352K).

- [ ] **Step 2: Create the case-study module**

Create `src/data/work/tabit.js` with exactly this content:

```js
// tabIt case study — sources: tabIt repo README.md, PRODUCT.md, DESIGN.md
// (~/PortfolioProjects/tabIt) and Paolo's direction on the local-first
// backend decision. Hero clip is a self-hosted Cap recording of the real
// extension; the app and extension are both renderers of one chart JSON.

export default {
  id: 'tabit',
  chapters: [
    {
      kicker: 'problem',
      title: "the tab you want doesn't exist",
      shape: 'poster',
      media: {
        type: 'video',
        src: '/work/tabit-demo.mp4',
        poster: '/work/tabit-demo-poster.jpg',
        caption: 'the extension following "just a song" — click "♪ get chords", play along',
      },
      blocks: [
        {
          type: 'prose',
          heading: 'the itch',
          body: `
a song grabs you and you want to play along right now — but the tab is paywalled, wrong, or simply doesn't exist. chord sites can only offer what someone took the time to transcribe, and plenty of what you'd love to play has no tab anywhere: an unreleased song, a live take, a friend's demo, your own recording.

tabit lives inside that moment. paste a youtube url (or drop an audio file) and it detects the chords, key, and scales from the audio itself, then follows along under the video karaoke-style — guitar still in hand. because it reads the audio instead of a database, you can play along to practically anything.`,
        },
      ],
    },
    {
      kicker: 'process',
      title: 'three layers, one contract',
      shape: 'two-col',
      media: {
        type: 'ascii-diagram',
        caption: 'audio in, chart json out — the app and the extension are just renderers',
        art: `
 youtube url / audio
        │
    [ ingest ]───────────────┐
        │            │        │
 [ demucs ]     [ librosa ] [ essentia ]
   │     │       beats·tempo    key
harmonic bass       │            │
   │     │          │            │
[ crema ][ crepe ]  │            │
 chords  bass f0    │            │
   └──┬──┘          │            │
 [ reconcile ] → A/C#            │
      └────────┬───────┬─────────┘
         [ post-process ]
               │
         ( chart json )
          ├─ react web app
          └─ chrome extension`,
      },
      blocks: [
        {
          type: 'prose',
          heading: 'the pipeline',
          body: `
three layers share one contract — the chart json — and the web app and the chrome extension are both just renderers of it.

the engine (python) turns audio into chords, key, suggested scales, and a beat grid. demucs splits the track into stems; the crema chord model runs on the drums-removed harmonic mix while a crepe pitch tracker follows the isolated bass. reconciling the two is what lets tabit emit slash chords like A/C# — inversions most tools skip entirely. librosa handles beats and tempo, essentia the key.

everything lands in one json file. the react web app renders it as a full paper sheet; the mv3 extension renders the same data as a beat ribbon that embeds under the youtube player.`,
        },
      ],
    },
    {
      kicker: 'the decision',
      title: 'your machine, not the cloud',
      shape: 'two-col',
      media: {
        type: 'ascii-diagram',
        caption: "the backend runs on the listener's own machine",
        art: `
 rejected — cloud backend
   extension ─▶ data-center api ─▶ yt-dlp
      · one shared queue → congestion
      · youtube blocks data-center ips
      · pay to scale gpus

 chosen — local helper
   extension ─▶ localhost (login service)
      · one curl install, starts at login
      · residential ip → clean youtube pulls
      · full local gpu + parallel stages
      · private · free · no queue`,
      },
      blocks: [
        {
          type: 'prose',
          heading: 'why local-first',
          body: `
the extension needs a heavy pipeline behind it — source separation plus two neural models. the reflexive answer is a cloud backend. tabit does the opposite: the backend runs on the listener's own machine, installed with a single curl command as a background service that starts at login.

it isn't just cheaper, it's better. there's no shared server to congest — each person's requests run on their own hardware, often faster than a shared box would allow. youtube throttles and blocks downloads coming from data-center ips, but a request from a residential machine pulls clean. and a modern laptop, especially an apple-silicon macbook, has a gpu for source separation and enough cores to run the detection stages in parallel, with models kept warm between songs.

the honest cost is install friction. tabit pays it down: one installer provisions everything, the service self-manages (tabit status / logs / restart), and when the helper is off the extension says so plainly and recovers on its own once it's back.`,
        },
      ],
    },
    {
      kicker: 'the hard parts',
      title: "honest about what it doesn't know",
      shape: 'long',
      detour: true,
      blocks: [
        {
          type: 'prose',
          heading: 'confidence, surfaced',
          body: `
chord detection is genuinely hard. the state of the art sits around 72% on seventh chords, and human experts only agree about 54% of the time on the complex ones. a tool that hides that uncertainty behind confident-looking output is quietly lying.

tabit doesn't. low-confidence chords render visibly softer, with a dotted underline — present, but flagged as a guess. nothing is hidden or faked. if a chord is wrong, click it and correct it; your edit persists locally. uncertainty is treated as information for the player, not a failure to paper over.`,
        },
        {
          type: 'image',
          src: '/work/tabit-extension.png',
          fullSrc: '/work/tabit-extension.png',
          alt: 'the tabIt sheet embedded under a youtube video: a wordmark, then a row of chord cells — Gmaj7/D#, C7, and a dimmed Dmaj7 — with an amber highlighter on the current beat, confidence pips beneath the current chord, and key, tempo, scale, and transpose controls above',
          caption: 'the beat ribbon under the player — a slash chord, the amber sweep, and a dimmed low-confidence chord',
        },
      ],
    },
    {
      kicker: 'solution',
      title: 'paste a song, play along',
      shape: 'text-poster',
      blocks: [
        {
          type: 'highlights',
          items: [
            'mir engine, react web app, and mv3 chrome extension — all rendering one shared chart json',
            'slash-chord inversions (A/C#) from harmonic-mix chords reconciled with isolated-bass pitch tracking',
            '~36s of compute for a 3.5-min song on apple silicon · instant on every repeat from disk cache',
            'one-line macos installer provisions python 3.11, a static ffmpeg, and model weights as a login service',
            'real-song chord-accuracy benchmark harness (mir_eval scorer) to track quality honestly',
          ],
        },
        {
          type: 'prose',
          heading: 'where it is',
          body: `
built end-to-end — engine, api, web app, and extension — as one play-along product. it's in active development, but already good enough to sit down and play with: paste a song, wait briefly the first time, and the chords follow you. it's the tool i wanted every time a song grabbed me and the tab wasn't there.`,
        },
      ],
    },
  ],
};
```

- [ ] **Step 3: Register the case study**

In `src/data/work/index.js`, add the `tabit` entry to `workRegistry`:

```js
export const workRegistry = {
  chuloopa: () => import('./chuloopa.js'),
  tabit: () => import('./tabit.js'),
};
```

- [ ] **Step 4: Run the content tests**

Run: `node --test src/components/work/workContent.test.js`
Expected: PASS. The `case studies contain well-formed chapters` test now loads `tabit.js` and validates every chapter/block — including the `poster` and `two-col` chapters' required media, and the self-hosted `video` media (valid via `src`).

- [ ] **Step 5: Run the full suite + lint**

Run: `npm test && npm run lint`
Expected: all tests pass, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add public/work/tabit-extension.png src/data/work/tabit.js src/data/work/index.js
git commit -m "feat(work): tabIt case study — local-first decision as the signature chapter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: End-to-end verification in the browser

Confirms the whole flow works as a user sees it. No new code unless a defect surfaces.

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify the card**

In the Projects section: tabIt is card **#02**, featured, between chuloopa and ascii-drone; tags render; links show "↗ github" (→ github.com/paolosand/tabIt) and "— no demo —"; the ASCII box is aligned; an "open case study →" affordance is present (card is openable).

- [ ] **Step 3: Verify the deck**

Click the card. The folding deck opens and pages through all five chapters in order: problem → how it works → the decision → honest confidence → paste a song. The hero **video autoplays muted and loops**, showing the ribbon following "just a song". The two `ascii-diagram` chapters render legibly (pipeline; cloud-vs-local). The screenshot renders in chapter 4 and opens full-size on click. The highlights list shows five items.

- [ ] **Step 4: Verify the reduced-motion fallback**

Enable "Reduce motion" (macOS System Settings › Accessibility › Display, or emulate in DevTools: Rendering › Emulate CSS `prefers-reduced-motion: reduce`). Reload and open the case study. It renders as a flat block list (via `flattenChapters`); the hero `<video>` still renders (with its poster), and every chapter's content appears in order.

- [ ] **Step 5: Verify deep-linking**

Note the URL hash when the modal is open; reload the page with that hash. The case study opens directly (cold deep-link), scrolling the Projects section into view behind it.

- [ ] **Step 6: If all pass, finalize**

No commit needed (verification only). Proceed to the finishing-a-development-branch skill to merge.

---

## Follow-ups (out of scope for this plan)

- **pao-gpt chat knowledge:** `api/knowledge/projects.md` enumerates projects for the RAG chatbot. Adding a tabIt section there would surface it in chat, but only after a re-ingest/embeddings rebuild (a deploy-time operation touching the chat subsystem). Deferred deliberately — this plan is portfolio card + case study only.
- If a longer/edited hero cut is recorded later, replace `public/work/tabit-demo.mp4` (+ regenerate the poster) — no code change needed.
