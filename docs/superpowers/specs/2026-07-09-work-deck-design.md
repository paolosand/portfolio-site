# Work Case Study — Folding Deck Redesign

**Date:** 2026-07-09
**Status:** Approved design, pending implementation plan
**Branch:** worktree-feat-work-deck
**Supersedes:** the body layout of `2026-07-08-work-modal-design.md` (registry, deep-linking, and open/close behavior from that spec are unchanged and reused)

## Goal

Replace the case-study modal's single-scroll block list with a scroll-choreographed
"folding deck": full-viewport chapters that slide up and fold over one another,
media visible from the first screen, a hand-drawn progress trail on the left edge,
and a post-it "build log" ledger as chapter nav. Desktop and mobile share one
system. Design was validated interactively via browser mockups on 2026-07-09
(fold pattern → roadmap motif → ledger docking → mixed chapter shapes → edge
cases → corner placement); this spec records the locked outcome.

**Standing note from Paolo:** detail placements (ledger corner, scrap offsets,
trail wiggle) remain tweakable during implementation; the structure below is
what's locked.

## What stays from the shipped modal (PR #3)

- `workRegistry` lazy loading, `#/work/<id>` hash deep-linking via `useWorkHash`,
  esc/overlay/back close paths, focus trap, body scroll lock, card affordance in
  the Selected Works grid.
- The typed content blocks (`prose`, `ascii-diagram`, `video`, `image`,
  `highlights`) — they become the *contents of chapters*.
- The current block-list rendering — retained as the reduced-motion fallback
  (see Accessibility).

## Frame change: postcard → full-viewport takeover

The deck needs the whole viewport (poster chapters are full-bleed). The modal
frame becomes `inset: 0` (no 880px column, no visible page behind). Keeps:
`z-index: 1100`, ink topbar (`#01 · chuloopa · case study` + `× esc`), paper
background, dialog semantics. The overlay-click-to-close path disappears (there
is no overlay margin anymore); esc, `×`, and back remain.

## Data model: chapters

Case-study modules gain a chapter layer:

```js
export default {
  id: 'chuloopa',
  chapters: [
    {
      kicker: 'problem',            // trail/ledger label, lowercase
      title: 'static loops are dead air',
      shape: 'poster',              // 'poster' | 'two-col' | 'text-poster' | 'long'
      detour: false,                // true → ledger row gets ↩ + dashed checkbox
      media: { type: 'video', videoId: '…', orientation: 'portrait' }, // poster/two-col only
      blocks: [ { type: 'prose', body: `…` }, … ],   // existing block types
    },
    …
  ],
}
```

- `media` drives the poster fill or the two-col right column. `blocks` render in
  the chapter's text area; all five existing block types remain valid inside any
  chapter.
- CHULOOPA's shipped content migrates by regrouping existing blocks into
  chapters (no rewriting):
  1. `problem` · poster (demo video 1) ← "the itch" prose on the scrap
  2. `process` · two-col (ascii system diagram as media) ← "how it works" prose
     + thesis-figure image block
  3. `the hard parts` · long, `detour: true` ← "the hard parts" prose + demo
     video 2 as an inline block
  4. `solution` · text-poster ← highlights block + "where it landed" prose
- The reduced-motion fallback renders `chapters.flatMap(c => c.blocks)` (plus
  each chapter's `media` converted to its equivalent block) through the legacy
  block-list body — one derived view, no duplicate content storage.
- Contract test extends: every chapter has a valid `shape`, non-empty `title`
  and `kicker`; `poster` and `two-col` require `media`; `text-poster` and `long`
  must not have top-level `media`; blocks validate as today.

## Chapter shapes

| shape | desktop | phone | rule |
|---|---|---|---|
| `poster` | full-bleed media; text on a taped paper scrap, bottom-left | same, scrap spans width above bottom edge | media-led chapters; scrap text ≤ ~3 sentences |
| `two-col` | text left / framed media right (dashed divider) | stacked: text above framed media | balanced chapters |
| `text-poster` | full paper panel, comfortable measure, ascii ornament and/or pull-quote carry visual weight | same | chapters with no media |
| `long` | natural height ≥ 100vh; scrolls through its own content (inline blocks incl. images), then pins | same | text-heavy chapters, no word cap |

**Fold mechanics:** chapters are CSS `position: sticky` cards stacked in source
order; each card's `top` is `min(0, 100vh − cardHeight)` (set per card via JS on
mount/resize) so `long` chapters scroll fully before pinning. The next chapter
slides over the pinned one. Native scroll throughout — no scroll hijacking, no
snap. Buried cards may subtly scale/dim as they're covered (Motion, polish tier).

**Reserved zones:** the ledger owns the top-right corner (below the topbar);
poster scraps own the bottom-left; the trail owns the left edge gutter. Chapter
content keeps a safe inset from all three; no element may enter another's zone.

## Trail (left edge) — one spec, both sizes

- Hand-drawn SVG path in a narrow left gutter: base route stroked in ink at 30%
  opacity, `stroke-dasharray: 4 5`; walked portion drawn in `--c-pink`
  (dashoffset driven by scroll progress) with a traveling pink dot.
- Square station stops (~8px, 1.8px ink stroke) placed on the path at each
  chapter's true scroll offset (recomputed on resize): hollow paper ahead,
  ink-filled once passed, pink diamond (45° rotate, slight scale) when current.
  Stops are click/tap targets that smooth-scroll to their chapter.
- Desktop path includes a detour loop in its geometry when the case study has a
  `detour: true` chapter; phone path is a gentler wiggle in an ~18px lane.
  Identical dash rhythm, colors, and stop styling on both.
- Trail geometry is authorable per case study (each project can get its own
  squiggle) with a sensible default path generator.

## Build-log ledger (post-it) — top-right

- Lemon (`--c-lemon`) paper scrap with tape mark, slight rotation, offset
  shadow, docked top-right below the topbar. Header "build log", one row per
  chapter: checkbox + kicker. Passed rows tick mint ✓; current row bold with
  pink checkbox; `detour` rows use a dashed checkbox and ↩; final row ★. Rows
  jump-scroll. Reaching the end stamps "● shipped" (pink, rotated).
- Phone: collapses to a chip (`§ 02 / 05 ▾`) in the same corner; tap toggles the
  full post-it panel dropping below; label flips per chapter.
- Desktop keeps the always-open post-it (the ticking-off charm is the point).

## Tech

- **Motion** (`motion` package) — the one new dependency. Used for: scroll
  progress (`useScroll`/`useTransform` → trail ink + dot), ledger tick/chip flip
  springs, scrap/card enter transitions, buried-card scale/dim.
- The fold itself is CSS sticky + per-card `top` — no scroll-hijacking library;
  GSAP explicitly not needed now, not precluded later.
- Sticky-stack + variable heights + trail math live in a dedicated hook (e.g.
  `useDeckScroll`) returning chapter offsets, active index, and progress
  fraction — unit-testable math separated from rendering.

## Accessibility & fallback

- `prefers-reduced-motion: reduce` → render the existing block-list layout
  (today's shipped WorkModal body) instead of the deck; trail/ledger hidden,
  content identical. One conditional at the modal body level.
- Deck keeps: dialog semantics, focus trap, esc close, keyboard-reachable
  ledger rows and trail stops (real buttons), `aria-current` on the active
  ledger row. Videos stay lazy iframes.
- The chapter fold uses sticky positioning, so keyboard scrolling (space,
  PgDn) and screen-reader reading order (source order) work natively.

## Out of scope

- Case studies for the remaining 4 projects (content).
- Per-chapter scrubbed timeline theatrics (possible later GSAP tier).
- Authoring UI; trail geometry beyond the default generator + optional
  per-project path override.
- Blocking pre-work: the deferred blockTypes-extraction from PR #3's review
  should happen as part of this branch (test ↔ renderer contract now spans
  chapters too).

## Testing & verification

- Unit: chapter contract tests (shapes/media rules above); `useDeckScroll` math
  (offsets, active index, per-card sticky top) with mocked dimensions; migration
  test that chuloopa chapters contain exactly the blocks shipped in PR #3.
- Reduced-motion fallback renders the legacy body (unit-level conditional test).
- Browser (Playwright) before merge: fold behavior incl. a >100vh chapter,
  trail stop clicks, ledger/chip nav, deep-link cold load, esc/back, phone
  width, reduced-motion emulation, no console errors.
