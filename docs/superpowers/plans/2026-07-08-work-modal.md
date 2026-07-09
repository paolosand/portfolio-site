# Selected Work — Case Study Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let visitors open a Selected Works card into a deep-linkable, riso-styled case-study modal; ship the mechanism plus the CHULOOPA case study.

**Architecture:** Case studies are JS modules of typed content blocks under `src/data/work/`, loaded lazily through a registry. A single `WorkModal` (visual language of `ArtistModal`) is owned by `Projects.jsx`; open/close state is driven by the URL hash (`#/work/<id>`) via a small hook built on pure, unit-tested hash functions. No router, no new dependencies.

**Tech Stack:** React 18 + Vite, plain CSS with the site's riso tokens, `node --test` for unit tests, Playwright MCP for browser verification.

**Spec:** `docs/superpowers/specs/2026-07-08-work-modal-design.md`

## Global Constraints

- No new npm dependencies.
- Riso tokens only: `var(--paper)`, `var(--ink)`, `var(--ink-mute)`, `var(--ink-faint)`, `var(--c-blue)`, `var(--c-pink)`, `var(--c-mint)`, `var(--c-lemon)` (defined in `src/index.css:6-17`).
- Modal overlay `z-index: 1100` — the top bar nav sits at `z-index: 1000`; ArtistModal's `200` renders under it. Do not copy that value.
- All user-facing copy is lowercase except project titles/proper nouns, matching the site voice.
- Offset-shadow style: `1.5px solid var(--ink)` borders with `Npx Npx 0 var(--ink)` box-shadows (no blur).
- `portfolio.json` is not modified.
- Commit messages follow existing convention: `feat(work): …`, `content(work): …`, `test(work): …`.

**Spec deviation (deliberate):** the spec's optional `hero` field is dropped — both CHULOOPA videos are portrait shorts, so nothing uses a hero slot yet. Add it when a case study needs one (YAGNI). Video blocks gain an `orientation: 'portrait'` field instead, which the spec didn't have.

---

### Task 1: Hash utilities + work registry

**Files:**
- Create: `src/components/work/workHash.js`
- Create: `src/components/work/workHash.test.js`
- Create: `src/data/work/index.js`
- Modify: `package.json` (test script, line 13)

**Interfaces:**
- Produces: `parseWorkHash(hash: string, registry: object) → string|null`, `workHashFor(id: string) → string`, `isWorkHashShaped(hash: string) → boolean` from `src/components/work/workHash.js`; `workRegistry: { [id]: () => Promise<module> }` from `src/data/work/index.js`.
- Note: `src/data/work/chuloopa.js` (created in Task 2) is already referenced by the registry here. Until Task 2 lands, the dynamic import would fail at runtime — that's fine; nothing calls it yet, and unit tests for the registry contract also land in Task 2.

- [ ] **Step 1: Write the failing test**

Create `src/components/work/workHash.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkHash, workHashFor, isWorkHashShaped } from './workHash.js';

const registry = { chuloopa: () => Promise.resolve({}) };

test('parseWorkHash extracts a registered id', () => {
  assert.equal(parseWorkHash('#/work/chuloopa', registry), 'chuloopa');
});

test('parseWorkHash rejects unregistered ids', () => {
  assert.equal(parseWorkHash('#/work/nope', registry), null);
});

test('parseWorkHash rejects malformed and unrelated hashes', () => {
  assert.equal(parseWorkHash('#/work/', registry), null);
  assert.equal(parseWorkHash('#/work/UPPER', registry), null);
  assert.equal(parseWorkHash('#projects', registry), null);
  assert.equal(parseWorkHash('', registry), null);
  assert.equal(parseWorkHash(undefined, registry), null);
});

test('parseWorkHash does not match inherited object properties', () => {
  assert.equal(parseWorkHash('#/work/constructor', registry), null);
});

test('workHashFor builds the canonical hash', () => {
  assert.equal(workHashFor('chuloopa'), '#/work/chuloopa');
});

test('isWorkHashShaped detects work-shaped hashes regardless of validity', () => {
  assert.equal(isWorkHashShaped('#/work/anything'), true);
  assert.equal(isWorkHashShaped('#projects'), false);
  assert.equal(isWorkHashShaped(''), false);
});
```

- [ ] **Step 2: Add the work test glob and run to verify failure**

In `package.json` line 13, append ` src/components/work/*.test.js` to the test script:

```json
"test": "node --test api/_lib/*.test.js api/_lib/ticker/*.test.js src/components/chat/*.test.js src/components/chat/embeds/*.test.js src/components/shared/*.test.js src/components/work/*.test.js"
```

Run: `npm test`
Expected: FAIL — `Cannot find module ... workHash.js`

- [ ] **Step 3: Write the implementation**

Create `src/components/work/workHash.js`:

```js
// Pure hash <-> work-id mapping for deep-linkable case studies.
// Kept free of DOM/React so it can be unit tested under node --test.

const WORK_HASH_RE = /^#\/work\/([a-z0-9-]+)$/;

export function parseWorkHash(hash, registry) {
  const m = WORK_HASH_RE.exec(hash || '');
  if (!m) return null;
  return Object.hasOwn(registry, m[1]) ? m[1] : null;
}

export function workHashFor(id) {
  return `#/work/${id}`;
}

export function isWorkHashShaped(hash) {
  return (hash || '').startsWith('#/work/');
}
```

Create `src/data/work/index.js`:

```js
// Registry of long-form case studies. A project card is openable iff its
// id is a key here. Lazy imports keep case-study content (prose, ascii
// diagrams) out of the initial bundle.

export const workRegistry = {
  chuloopa: () => import('./chuloopa.js'),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green including 7 new workHash tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/work/workHash.js src/components/work/workHash.test.js src/data/work/index.js package.json
git commit -m "feat(work): hash utilities and lazy case-study registry"
```

---

### Task 2: CHULOOPA case study content + content contract tests

**Files:**
- Create: `src/data/work/chuloopa.js`
- Create: `src/components/work/workContent.test.js`
- Create: `public/work/chuloopa-system-diagram.png` (copied asset)

**Interfaces:**
- Consumes: `workRegistry` from `src/data/work/index.js`.
- Produces: `src/data/work/chuloopa.js` default export `{ id, blocks[] }`. Block types and required fields: `prose` (`body`, optional `heading`), `ascii-diagram` (`art`, optional `caption`), `video` (`videoId`, optional `caption`, optional `orientation: 'portrait'`), `image` (`src`, `alt`, optional `fullSrc`, optional `caption`), `highlights` (`items[]`). Task 3's renderer keys off exactly these names.

- [ ] **Step 1: Copy the thesis diagram into public assets**

```bash
mkdir -p public/work
cp "/Users/paolosandejas/Documents/CALARTS - Music Tech/MFA Thesis/Code/CHULOOPA/docs/internal/paper/images/chuloopa_condensed_AIMC.png" public/work/chuloopa-system-diagram.png
```

- [ ] **Step 2: Write the failing contract test**

Create `src/components/work/workContent.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workRegistry } from '../../data/work/index.js';

const portfolio = JSON.parse(
  readFileSync(new URL('../../data/portfolio.json', import.meta.url), 'utf8'),
);
const projectIds = new Set(portfolio.projects.map((p) => p.id));

const BLOCK_REQUIRED_FIELDS = {
  prose: ['body'],
  'ascii-diagram': ['art'],
  video: ['videoId'],
  image: ['src', 'alt'],
  highlights: ['items'],
};

test('every registry key matches a portfolio project id', () => {
  for (const id of Object.keys(workRegistry)) {
    assert.ok(projectIds.has(id), `registry id "${id}" not in portfolio.json`);
  }
});

test('case studies contain only known, well-formed blocks', async () => {
  for (const [id, load] of Object.entries(workRegistry)) {
    const { default: work } = await load();
    assert.equal(work.id, id, `case study id mismatch for "${id}"`);
    assert.ok(Array.isArray(work.blocks) && work.blocks.length > 0,
      `case study "${id}" has no blocks`);
    for (const [i, block] of work.blocks.entries()) {
      const required = BLOCK_REQUIRED_FIELDS[block.type];
      assert.ok(required, `unknown block type "${block.type}" at ${id}.blocks[${i}]`);
      for (const field of required) {
        const value = block[field];
        const present = Array.isArray(value) ? value.length > 0
          : value != null && String(value).trim() !== '';
        assert.ok(present, `missing "${field}" at ${id}.blocks[${i}] (${block.type})`);
      }
    }
  }
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module ... chuloopa.js` (the registry's lazy import target doesn't exist yet).

- [ ] **Step 4: Write the case-study content**

Create `src/data/work/chuloopa.js` with exactly this content (drafted from the 2026-07-08 interview with Paolo and the AIMC 2026 paper; voice: lowercase riso):

```js
// CHULOOPA case study — sources: AIMC 2026 paper ("Loops That Listen:
// A Voice-Controlled Dynamic Drum Looper with AI Variation") and
// interview with Paolo, 2026-07-08.

export default {
  id: 'chuloopa',
  blocks: [
    {
      type: 'prose',
      heading: 'the itch',
      body: `
a loop's greatest strength is also its main constraint: once recorded, it never changes. i wanted more energy in my live sets than static loops could offer — the ability to quickly throw down a drum beat with my voice and have it play back in a way that's interesting and dynamic, the way a live drummer adds fills, varies dynamics, and shifts the groove to match the moment.

chuloopa (chuck-based loop operator for performance audio) is the answer: a voice-controlled drum looper that listens to the room and varies the loop in response.`,
    },
    {
      type: 'prose',
      heading: 'how it works',
      body: `
you beatbox a pattern. a knn classifier — trained on ten examples each of your own kick, snare, and hi-hat, in under two minutes — transcribes every onset in real time (~25 ms input-to-playback) and routes midi to a drum rack in ableton live.

the moment a loop is committed, a 4.8m-parameter grid transformer generates five variations in parallel at increasing sampling temperatures, then sorts them by deviation from the original into a predictable conservative-to-adventurous spectrum.

meanwhile a separate process measures the live audio energy every 500 ms and maps it to a value called spice (0.0–1.0). at each loop boundary, the current spice level drives a weighted draw from the variation bank — quiet passages favor the original pattern, building energy pulls toward wilder variations. no pedal, no menu, no manual toggle.`,
    },
    {
      type: 'ascii-diagram',
      caption: 'three concurrent processes, talking over osc',
      art: `
           live room audio ♪
                 │
 ┌─ VARIANT CONTROLLER · chuck ──────────────┐
 │  rms → dbfs → spice (0.0 – 1.0)           │
 └─────────────────┬─────────────────────────┘
                   │ osc /chuloopa/spice · 500 ms
                   ▼
 ┌─ MAIN LOOPER · chuck ─────────────────────┐
 │  beatbox → onset → knn → loop             │
 │  spice-weighted pick at loop boundary ────┼── midi ──▶ ableton live
 └─────────┬─────────────────────▲───────────┘
           │ 16-step pattern     │ osc bank_ready
           ▼                     │
 ┌─ VARIANT GENERATOR · python ──────────────┐
 │  grid transformer × 5 temperatures        │
 │  → deviation sort → bank (v1 … v5)        │
 └───────────────────────────────────────────┘`,
    },
    {
      type: 'image',
      src: '/work/chuloopa-system-diagram.png',
      fullSrc: '/work/chuloopa-system-diagram.png',
      alt: 'CHULOOPA system architecture: variant generator (python), variant controller and main looper (chuck), with OSC and MIDI signal paths into Ableton Live',
      caption: 'the full system diagram, straight from the aimc 2026 paper',
    },
    {
      type: 'video',
      videoId: 'YhnaJ4LI-jY',
      orientation: 'portrait',
      caption: 'demo · beatbox in, variations out',
    },
    {
      type: 'video',
      videoId: 'gqVEtp37bXs',
      orientation: 'portrait',
      caption: 'demo · spice-driven selection live',
    },
    {
      type: 'prose',
      heading: 'the hard parts',
      body: `
getting chuck and python to cooperate in real time — three concurrent processes coordinated entirely over osc, with per-session ids validating every scheduled hit so nothing overlaps during transitions.

teaching the system my voice: generic drum-sound datasets don't survive contact with one person's beatboxing, so the classifier is personalized by design — you record your own kick, snare, and hat as a setup ritual, and it trains in under a second.

and the hardest question: how do you evaluate a variation? each variant has to keep the main groove intact while meaningfully departing from it. the answer became deviation sorting — density change first, new drum voices as tiebreaker — so slot 1 is always the most conservative take and slot 5 the most adventurous, no matter which temperature produced it.`,
    },
    {
      type: 'highlights',
      items: [
        '4.8m-param grid transformer · trained on 12,085 bar pairs (expanded groove midi dataset)',
        '~25 ms beatbox-to-playback latency · mfcc-13 knn trains in under a second',
        '82.5% of input hit positions preserved at low spice · 5.4 → 12.7 hits/bar across the spice axis',
        'full variation bank generated in 3–5 s, entirely offline, on consumer cpu',
        'accepted to aimc 2026 · berlin · september 2026',
      ],
    },
    {
      type: 'prose',
      heading: 'where it landed',
      body: `
built solo over about a year as my mfa thesis at calarts, advised by ajay kapur and jake cheng. the paper — "loops that listen: a voice-controlled dynamic drum looper with ai variation" — was accepted to aimc 2026 in berlin. the system holds up live: i've performed with it several times already, and the loop finally pushes back.`,
    },
  ],
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — both workContent tests green.

- [ ] **Step 6: Commit**

```bash
git add src/data/work/chuloopa.js src/components/work/workContent.test.js public/work/chuloopa-system-diagram.png
git commit -m "content(work): chuloopa case study from aimc paper + interview"
```

---

### Task 3: WorkModal component + styles

**Files:**
- Create: `src/components/work/WorkModal.jsx`
- Create: `src/components/work/WorkModal.css`

**Interfaces:**
- Consumes: `workRegistry` from `src/data/work/index.js`; `tagClassByName` from `src/components/shared/ascii.js`; project identity from `src/data/portfolio.json`; global `.tag` / `.pc-tags` classes from `src/index.css`.
- Produces: `<WorkModal workId={string} onClose={fn} />` default export. Renders nothing if `workId` isn't a portfolio project id. Task 4 mounts it from `Projects.jsx`.

No DOM unit-test harness exists in this repo (node --test only, no jsdom); per spec, rendering behavior is verified in Task 5's browser pass. This task gates on lint + production build.

- [ ] **Step 1: Write the component**

Create `src/components/work/WorkModal.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import portfolioData from '../../data/portfolio.json';
import { workRegistry } from '../../data/work/index.js';
import { tagClassByName } from '../shared/ascii.js';
import './WorkModal.css';

function ProseBlock({ block }) {
  return (
    <div className="wm-block wm-prose">
      {block.heading && <div className="wm-label">{block.heading}</div>}
      {block.body.trim().split(/\n\s*\n/).map((para) => (
        <p key={para.slice(0, 24)}>{para}</p>
      ))}
    </div>
  );
}

function AsciiDiagramBlock({ block }) {
  return (
    <figure className="wm-block wm-diagram">
      <pre>{block.art.replace(/^\n/, '')}</pre>
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

function VideoBlock({ block }) {
  return (
    <figure className={`wm-block wm-video ${block.orientation === 'portrait' ? 'portrait' : ''}`}>
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

function ImageBlock({ block }) {
  const img = <img src={block.src} alt={block.alt} loading="lazy" />;
  return (
    <figure className="wm-block wm-image">
      {block.fullSrc ? (
        <a href={block.fullSrc} target="_blank" rel="noopener noreferrer" title="open full size">
          {img}
        </a>
      ) : img}
      {block.caption && (
        <figcaption>
          {block.caption}
          {block.fullSrc && <span className="wm-zoom-hint"> · click to open full size</span>}
        </figcaption>
      )}
    </figure>
  );
}

function HighlightsBlock({ block }) {
  return (
    <ul className="wm-block wm-highlights">
      {block.items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

const BLOCK_RENDERERS = {
  prose: ProseBlock,
  'ascii-diagram': AsciiDiagramBlock,
  video: VideoBlock,
  image: ImageBlock,
  highlights: HighlightsBlock,
};

export default function WorkModal({ workId, onClose }) {
  const [content, setContent] = useState(null);
  const frameRef = useRef(null);
  const idx = portfolioData.projects.findIndex((p) => p.id === workId);
  const project = idx >= 0 ? portfolioData.projects[idx] : null;

  useEffect(() => {
    let alive = true;
    setContent(null);
    workRegistry[workId]().then(
      (m) => { if (alive) setContent(m.default); },
      () => { if (alive) onClose(); },
    );
    return () => { alive = false; };
  }, [workId, onClose]);

  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    frameRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  if (!project) return null;

  return (
    <div className="work-overlay" onClick={onClose}>
      <div
        className="work-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${project.title} case study`}
        ref={frameRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="work-topbar">
          <div className="work-topbar-left">
            <span className="topbar-mark">■</span>
            #{String(idx + 1).padStart(2, '0')} · {project.id} · case study
          </div>
          <button className="work-close" onClick={onClose} aria-label="Close">× esc</button>
        </div>

        <div className="work-inner">
          <header className="work-head">
            <h3 className="work-title">{project.title}</h3>
            {project.subtitle && <div className="work-subtitle">{project.subtitle}</div>}
            <div className="pc-tags">
              {project.tags.map((t) => (
                <span key={t} className={`tag ${tagClassByName(t)}`}>{t}</span>
              ))}
            </div>
          </header>

          {content ? (
            content.blocks.map((block, i) => {
              const Block = BLOCK_RENDERERS[block.type];
              return Block ? <Block key={i} block={block} /> : null;
            })
          ) : (
            <div className="work-loading">loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the styles**

Create `src/components/work/WorkModal.css`:

```css
/* WORK MODAL ==================================================== */
.work-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100; /* nav is 1000 — must clear it */
  background: rgba(26, 19, 10, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.work-modal {
  position: relative;
  background: var(--paper);
  border: 1.5px solid var(--ink);
  box-shadow: 6px 6px 0 var(--ink);
  max-width: 880px;
  width: 100%;
  max-height: 92vh;
  overflow-y: auto;
  outline: none;
}

/* ── top bar ─────────────────────────────────────────────────── */
.work-topbar {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--ink);
  color: var(--paper);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  flex-shrink: 0;
}

.work-topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.work-topbar-left .topbar-mark { color: var(--c-lemon); }

.work-close {
  background: none;
  border: 1.2px solid var(--paper);
  color: var(--paper);
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.08em;
  padding: 3px 9px;
  cursor: pointer;
}

.work-close:hover {
  background: var(--c-pink);
  border-color: var(--c-pink);
}

/* ── body ────────────────────────────────────────────────────── */
.work-inner {
  padding: 26px 30px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.work-head {
  border-bottom: 1.5px dotted var(--ink);
  padding-bottom: 18px;
}

.work-title {
  font-size: 27px;
  letter-spacing: 0.02em;
  margin: 0 0 4px;
}

.work-subtitle {
  color: var(--ink-mute);
  font-size: 13px;
  margin-bottom: 12px;
}

.work-loading {
  color: var(--ink-mute);
  font-size: 13px;
  padding: 32px 0;
  text-align: center;
}

/* ── blocks ──────────────────────────────────────────────────── */
.work-inner figure { margin: 0; }

.wm-label {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 8px;
}

.wm-label::before {
  content: '§ ';
  color: var(--c-pink);
}

.wm-prose p {
  font-size: 14px;
  line-height: 1.75;
  margin: 0 0 10px;
  max-width: 66ch;
}

.wm-prose p:last-child { margin-bottom: 0; }

.wm-block figcaption {
  font-size: 11.5px;
  color: var(--ink-mute);
  margin-top: 8px;
  letter-spacing: 0.04em;
}

.wm-diagram pre {
  font-size: 12px;
  line-height: 1.45;
  background: var(--paper-2);
  border: 1.5px solid var(--ink);
  box-shadow: 4px 4px 0 var(--ink);
  padding: 16px 18px;
  overflow-x: auto;
  margin: 0;
}

.wm-video iframe {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1.5px solid var(--ink);
  box-shadow: 4px 4px 0 var(--ink);
  background: var(--ink);
}

.wm-video.portrait iframe {
  aspect-ratio: 9 / 16;
  width: min(320px, 80%);
  margin: 0 auto;
}

.wm-video.portrait figcaption { text-align: center; }

.wm-image img {
  display: block;
  width: 100%;
  border: 1.5px solid var(--ink);
  box-shadow: 4px 4px 0 var(--ink);
  background: #fff;
}

.wm-image a { display: block; border-bottom: none; }
.wm-image a:hover { background: none; }
.wm-zoom-hint { color: var(--c-blue); }

.wm-highlights {
  list-style: none;
  margin: 0;
  padding: 14px 16px;
  border: 1.5px dashed var(--ink);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wm-highlights li {
  font-size: 12.5px;
  line-height: 1.5;
  padding-left: 18px;
  position: relative;
}

.wm-highlights li::before {
  content: '▸';
  position: absolute;
  left: 0;
  color: var(--c-mint);
}

/* ── mobile ──────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .work-overlay { padding: 12px; }
  .work-inner { padding: 18px 16px 28px; }
  .work-title { font-size: 22px; }
  .wm-diagram pre { font-size: 10.5px; }
}
```

- [ ] **Step 3: Verify lint and build**

Run: `npm run lint && npx vite build`
Expected: lint clean; build succeeds and the output lists a separate lazy chunk for `chuloopa` (e.g. `dist/assets/chuloopa-*.js`). (`npx vite build` skips the `npm run build` ingest step, which needs API credentials.)

- [ ] **Step 4: Commit**

```bash
git add src/components/work/WorkModal.jsx src/components/work/WorkModal.css
git commit -m "feat(work): WorkModal component with typed content blocks"
```

---

### Task 4: Hash hook + Projects wiring + card affordance

**Files:**
- Create: `src/components/work/useWorkHash.js`
- Modify: `src/components/Projects.jsx`
- Modify: `src/index.css` (append card-affordance rules after `.pc-links .disabled`, near line 673)

**Interfaces:**
- Consumes: `parseWorkHash`, `workHashFor`, `isWorkHashShaped` from `workHash.js`; `workRegistry`; `<WorkModal workId onClose />` from Task 3.
- Produces: `useWorkHash() → { openId: string|null, open(id), close() }`. `Projects.jsx` owns the single WorkModal instance.

- [ ] **Step 1: Write the hash hook**

Create `src/components/work/useWorkHash.js`:

```js
import { useCallback, useEffect, useRef, useState } from 'react';
import { workRegistry } from '../../data/work/index.js';
import { isWorkHashShaped, parseWorkHash, workHashFor } from './workHash.js';

// Drives the case-study modal from the URL hash (#/work/<id>) so every
// open modal is a shareable link and the back button closes it.
export function useWorkHash() {
  const [openId, setOpenId] = useState(
    () => parseWorkHash(window.location.hash, workRegistry),
  );
  const pushedRef = useRef(false);

  useEffect(() => {
    // A work-shaped hash for an unknown id (stale link) is cleared silently.
    if (isWorkHashShaped(window.location.hash) && !openId) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    const onHashChange = () => {
      const id = parseWorkHash(window.location.hash, workRegistry);
      setOpenId(id);
      if (!id) pushedRef.current = false;
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = useCallback((id) => {
    pushedRef.current = true;
    window.location.hash = workHashFor(id); // adds history entry, fires hashchange
  }, []);

  const close = useCallback(() => {
    if (pushedRef.current) {
      history.back(); // hashchange handler does the closing
    } else {
      // Cold deep-link load: nothing to go back to; clear without new entry.
      history.replaceState(null, '', window.location.pathname + window.location.search);
      setOpenId(null);
    }
  }, []);

  return { openId, open, close };
}
```

- [ ] **Step 2: Wire Projects.jsx**

Replace the full contents of `src/components/Projects.jsx` with:

```jsx
import { useEffect } from 'react';
import portfolioData from '../data/portfolio.json';
import { PROJECT_ART, tagClassByName } from './shared/ascii.js';
import { workRegistry } from '../data/work/index.js';
import WorkModal from './work/WorkModal.jsx';
import { useWorkHash } from './work/useWorkHash.js';
import './Projects.css';

function ProjectCard({ p, idx, onOpen }) {
  const isWide = idx === 0;
  const openable = Boolean(onOpen);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <article
      className={`project-card ${p.featured ? 'featured' : ''} ${isWide ? 'wide' : ''} ${openable ? 'openable' : ''}`}
      onClick={openable ? onOpen : undefined}
      onKeyDown={openable ? handleKeyDown : undefined}
      role={openable ? 'button' : undefined}
      tabIndex={openable ? 0 : undefined}
      aria-label={openable ? `open ${p.title} case study` : undefined}
    >
      {p.featured && (
        <div className="pc-stamp">
          <span className={`stamp ${p.category === 'creative' ? '' : 'blue'}`}>★ featured</span>
        </div>
      )}
      <div className="pc-header">
        <span className="id-tag">#{String(idx + 1).padStart(2, '0')} · {p.id}</span>
        <span className={`cat ${p.category === 'creative' ? 'creative' : ''}`}>
          {p.category === 'creative' ? 'creative' : 'ml / ai'}
        </span>
      </div>
      <pre className="ascii pc-ascii-frame">{PROJECT_ART[p.id]}</pre>
      <div className="pc-body">
        <h3 className="pc-title">{p.title}</h3>
        {p.subtitle && <div className="pc-subtitle">{p.subtitle}</div>}
        <p className="pc-desc">{p.description}</p>
        <div className="pc-tags">
          {p.tags.map((t) => (
            <span key={t} className={`tag ${tagClassByName(t)}`}>{t}</span>
          ))}
        </div>
        <div className="pc-links" onClick={(e) => e.stopPropagation()}>
          {p.links.github
            ? <a href={p.links.github} target="_blank" rel="noopener noreferrer">↗ github</a>
            : <span className="disabled">— private —</span>}
          {p.links.demo
            ? <a href={p.links.demo} target="_blank" rel="noopener noreferrer">↗ live demo</a>
            : <span className="disabled">— no demo —</span>}
          {openable && (
            <a
              href={`#/work/${p.id}`}
              className="pc-open"
              onClick={(e) => { e.preventDefault(); onOpen(); }}
            >
              ↗ open case study
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const { projects } = portfolioData;
  const { openId, open, close } = useWorkHash();

  useEffect(() => {
    // Cold deep-link load: bring the projects section into view behind the modal.
    if (openId) document.getElementById('projects')?.scrollIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section id="projects">
      <div className="section-head">
        <span className="num">§ 01 / 04</span>
        <h2 className="title">selected <span className="accent">works</span></h2>
        <span className="meta">{projects.length} projects · 2023→</span>
      </div>
      <div className="projects-grid">
        {projects.map((p, i) => (
          <ProjectCard
            key={p.id}
            p={p}
            idx={i}
            onOpen={Object.hasOwn(workRegistry, p.id) ? () => open(p.id) : undefined}
          />
        ))}
      </div>
      {openId && <WorkModal workId={openId} onClose={close} />}
    </section>
  );
}
```

- [ ] **Step 3: Card affordance styles**

In `src/index.css`, directly after the `.pc-links .disabled { color: var(--ink-faint); }` rule (~line 673), add:

```css
.project-card.openable { cursor: pointer; }
.project-card.openable:focus-visible {
  outline: 2px solid var(--c-blue);
  outline-offset: 3px;
}
.pc-links .pc-open {
  color: var(--c-pink);
  border-bottom: 1.5px solid var(--c-pink);
  padding-bottom: 1px;
}
```

- [ ] **Step 4: Verify tests, lint, build**

Run: `npm test && npm run lint && npx vite build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/work/useWorkHash.js src/components/Projects.jsx src/index.css
git commit -m "feat(work): deep-linkable case-study modal wired to project cards"
```

---

### Task 5: Browser verification

**Files:** none created — fix anything found, commit fixes as `fix(work): …`.

**Interfaces:**
- Consumes: the complete feature from Tasks 1–4.

- [ ] **Step 1: Start the dev server**

Run (background): `npm run dev`
Expected: Vite serves at `http://localhost:5173`.

- [ ] **Step 2: Playwright pass — desktop**

Using the Playwright MCP browser tools against `http://localhost:5173`:

1. Navigate; screenshot the CHULOOPA card — it must show `↗ open case study` in pink; other cards must not.
2. Click the card body → modal opens; URL becomes `#/work/chuloopa`; screenshot the modal top (topbar reads `#01 · chuloopa · case study`, renders above the site nav).
3. Scroll the modal: verify prose → ascii diagram (aligned box-drawing, no wrap) → paper figure → two portrait video embeds → highlights. Screenshot the diagram and video sections.
4. Press Escape → modal closes, hash cleared.
5. Reopen via the `↗ open case study` link; click the overlay → closes.
6. Reopen; browser back → closes. Browser forward → reopens.
7. Click `↗ github` on the card — must open GitHub, not the modal.

- [ ] **Step 3: Playwright pass — deep link + mobile**

1. Navigate directly to `http://localhost:5173/#/work/chuloopa` (cold load) → modal open over the projects section; close (`× esc` button) → hash cleared without navigating away.
2. Navigate to `http://localhost:5173/#/work/bogus` → no modal, hash silently cleared, page fine.
3. Resize to 375×812; open the modal; screenshot: topbar intact, prose readable, diagram horizontally scrollable, portrait videos fit.

- [ ] **Step 4: Fix and commit anything found**

Fix issues (ascii alignment, spacing, z-index, scroll behavior), re-verify, then:

```bash
git add -A && git commit -m "fix(work): browser-verification fixes"
```

Only commit if fixes were needed.
