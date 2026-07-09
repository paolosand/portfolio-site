# Selected Work — Case Study Modal

**Date:** 2026-07-08
**Status:** Approved design, pending implementation plan
**Branch:** worktree-feat-work-modal

## Goal

Let visitors open a Selected Works card into a full case-study modal with long-form
prose, data-flow diagrams, videos, and images. Each open modal is deep-linkable.
Rollout is progressive: a card is only openable once its case-study content exists.
This branch ships the mechanism plus one flagship case study (CHULOOPA).

## Context

- Single-page Vite + React app, no router. Selected Works is rendered by
  `src/components/Projects.jsx` from `src/data/portfolio.json` (5 projects).
- Cards currently show everything the data has: title, subtitle, one description
  paragraph, tags, ascii art, github/demo links.
- `src/components/music/ArtistModal.jsx` (currently unmounted) establishes the
  modal visual language: fixed ink-tinted blurred overlay, paper postcard frame
  (`1.5px` ink border, `6px 6px 0` offset shadow), sticky ink topbar with
  `× esc` close, lazy iframes.

## Content model

New directory `src/data/work/`, one JS module per case study (JS, not JSON, so
ascii diagrams can live in template literals exactly as they render):

```js
// src/data/work/chuloopa.js
export default {
  id: 'chuloopa',
  hero: { videoId: '<youtube-id>' },            // optional, topmost media
  blocks: [
    { type: 'prose', heading: 'the problem', body: `...` },
    { type: 'ascii-diagram', caption: 'data flow', art: `...` },
    { type: 'video', videoId: '<youtube-id>', caption: 'live demo' },
    { type: 'image', src: '/work/x.png', fullSrc: '/work/x-full.png', caption: '...' },
    { type: 'highlights', items: ['...', '...'] },
  ],
}
```

Block types (initial set — add more later as content demands):

| type | fields | rendering |
|---|---|---|
| `prose` | `heading?`, `body` | heading in section-label style, body as paragraphs (split on blank lines) |
| `ascii-diagram` | `art`, `caption?` | `<pre>` in a riso frame, horizontal scroll on narrow screens |
| `video` | `videoId`, `caption?` | lazy YouTube embed (`loading="lazy"`), riso-framed 16:9 |
| `image` | `src`, `alt`, `fullSrc?`, `caption?` | figure with offset-shadow frame; if `fullSrc`, clicking opens the full-size asset in a new tab |
| `highlights` | `items[]` | bulleted list in the ArtistModal highlights style |

`src/data/work/index.js` exports a registry of **lazy** imports:

```js
export const workRegistry = {
  chuloopa: () => import('./chuloopa.js'),
};
```

A project has a case study iff its id is a key in the registry. Case-study
content never weighs down the initial bundle. `portfolio.json` is untouched.

## WorkModal component

New `src/components/work/WorkModal.jsx` + `WorkModal.css`, following the
ArtistModal visual language.

- **Overlay:** fixed, `inset: 0`, `z-index: 1100` (nav is 1000; ArtistModal's
  200 would render under the nav — do not repeat that), ink-tinted
  `rgba(26,19,10,0.72)` with `backdrop-filter: blur(4px)`.
- **Frame:** paper postcard, max-width ~880px (single reading column),
  `max-height: 92vh`, internal scroll.
- **Topbar:** sticky ink bar: `#01 · chuloopa · case study` left, `× esc`
  close button right.
- **Header:** project identity from `portfolio.json` (title, subtitle,
  category chip, tags) so case-study files don't duplicate card data.
- **Body:** hero video (if any), then blocks in order.
- **Behavior:**
  - Esc closes; click on overlay closes; `×` closes.
  - Body scroll locked while open (`overflow: hidden` on `<body>`).
  - Focus moves into the modal on open, returns to the triggering card on close.
  - `role="dialog"`, `aria-modal="true"`, labelled by the project title.
  - While the lazy chunk loads, show a minimal "loading…" state in the frame;
    if the import fails, close gracefully.
- **Ownership:** `Projects.jsx` holds `openWorkId` state and renders a single
  `WorkModal` instance.

## Card affordance

Cards whose id is in the registry become openable:

- The whole card is a click target (plus Enter/Space via `role="button"`,
  `tabIndex=0` — or a wrapping button-styled element, decided at implementation).
- A visible `↗ open case study` link joins the `pc-links` row. Existing
  github/demo links keep working via `stopPropagation`.
- Cards without a case study are completely unchanged — no dead affordance.

## Deep linking

Hash-based, no router library.

- Opening a work pushes `#/work/<id>` (`history.pushState` so back works).
- Closing via esc/click-out/`×` calls `history.back()` when we pushed the
  state ourselves; the `hashchange`/`popstate` handler actually closes the
  modal — so the back button and the close button take the same path.
- On initial load, if `location.hash` matches `#/work/<id>` and the id is in
  the registry, scroll to `#projects` and open the modal. Unknown ids are
  ignored (hash cleared, no error).
- Logic lives in a small hook, e.g. `src/components/work/useWorkHash.js`,
  unit-testable without the DOM modal.

## CHULOOPA case study (flagship content)

- Drafted from a short interview with Paolo (problem, role, hard parts,
  demo video link, outcome), written in the site's lowercase riso voice.
- **Diagrams — two roles:**
  1. A simplified **ascii-diagram** as the primary explainer: three subsystem
     lanes (Variant Generator / Python · Variant Controller + Main Looper /
     ChucK · Ableton Live out) with key signals (OSC spice level,
     `bank_ready`, regenerate, MIDI out).
  2. The **actual thesis figure** (`chuloopa_condensed_AIMC.png`, from the
     AIMC paper) as an `image` block right after — a pasted-in artifact,
     captioned as the full system diagram, click-to-open-full-size via
     `fullSrc`. Copy the PNG into `public/work/`.
- Demo video(s) as YouTube embeds (Paolo uploads; can be unlisted).

Remaining 4 projects are out of scope for this branch; they get added later by
dropping files into `src/data/work/` and the registry.

## Testing & verification

- **Unit (node --test, matching existing setup):**
  - hash parsing: `#/work/chuloopa` → id, unknown/malformed hashes → null.
  - registry contract: every registry key exists in `portfolio.json` ids.
  - block validation: chuloopa.js contains only known block types with
    required fields.
- **Rendering:** WorkModal renders each block type (if a DOM test harness is
  impractical in the current node --test setup, cover via the Playwright pass
  instead — decided at implementation).
- **Manual/Playwright before merge:** open/close via click, esc, overlay,
  back button; deep-link cold load; mobile width (~375px); confirm modal
  renders above the nav; lint passes.

## Out of scope

- Case studies for the other 4 projects (content only; mechanism supports them).
- Real routes / SSR / SEO meta per work.
- Lightbox/zoom UI beyond open-full-size-in-new-tab.
- Deleting ArtistModal or wiring it up (unrelated).
