---
name: Paolo Sandejas Portfolio
description: AI/ML engineer and creative technologist portfolio with a tactile riso-print aesthetic
colors:
  paper: "#F2EBDA"
  paper-2: "#E9E0C8"
  paper-3: "#DDD2B5"
  ink: "#1A130A"
  ink-2: "#3E3424"
  ink-mute: "#7A6C53"
  ink-faint: "#B6A988"
  riso-blue: "#2841E8"
  fluorescent-pink: "#F0457B"
  screenprint-mint: "#00A076"
  press-lemon: "#E8B91A"
typography:
  display:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: "clamp(56px, 9vw, 132px)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.05em"
  headline:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: 1.0
    letterSpacing: "-0.04em"
  title:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: "21px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.18em"
  editorial:
    fontFamily: "'Newsreader', Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: "0px"
  tag: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  button-ink-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  button-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  button-default-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  button-pink:
    backgroundColor: "{colors.fluorescent-pink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  tag-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
  tag-blue:
    backgroundColor: "{colors.riso-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
  tag-pink:
    backgroundColor: "{colors.fluorescent-pink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
  tag-mint:
    backgroundColor: "{colors.screenprint-mint}"
    textColor: "{colors.paper}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
  tag-lemon:
    backgroundColor: "{colors.press-lemon}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
---

# Design System: Paolo Sandejas Portfolio

## 1. Overview

**Creative North Star: "The Engineer's Sketchbook"**

Technical precision meets handcrafted marks. The visual system is built on an analog printing metaphor — grain overlays, chunky offset shadows that mimic letterpress depth, postcard formats, stamp imagery, dashed and dotted rules, diagonal stripe patterns — but filtered through monospace engineering precision. The result is a surface that feels physically printed rather than digitally rendered: something that could exist on paper, in a zine, pinned to a studio wall.

This is not a portfolio that describes Paolo's creative-technical combination. It embodies it. The JetBrains Mono typeface signals engineering rigor. The four riso-print accent inks signal creative energy. The collision of the two, maintained with discipline across every component, is the argument the portfolio makes without writing a single word about it.

The system rejects the polished emptiness of SaaS landing-page design, the cheap signaling of "hacker dark mode" aesthetics, blank-canvas minimalism, and AI-generated slop (glassmorphism, gradient text, identical card grids). If it could be a template, it has failed.

**Key Characteristics:**
- Warm cream paper base (#F2EBDA) with deep charcoal ink (#1A130A) — high contrast without pure black or white
- Four vivid printing inks as accents: Riso Blue, Fluorescent Pink, Screenprint Mint, Press Lemon
- Zero border radius on all structural elements; 2px allowed only on inline tags
- Chunky offset shadows (e.g., `5px 5px 0 #1A130A`) — no blur, no ambient glow
- Grain texture via CSS dot-pattern overlay (opacity 0.18) applied globally
- Monospace-first typography; Newsreader Italic as a single accent voice

## 2. Colors: The Four-Ink Palette

Two families: a warm analog base that does the structural work, and four vivid printing inks that do the accenting.

### Primary
- **Riso Blue** (#2841E8): Electric cobalt. Used for links, primary visual energy, registration marks (`+`), and specific call-to-action accents. The most "digital" of the four inks, grounding the technical side of the identity.

### Secondary
- **Fluorescent Pink** (#F0457B): Hot pink riso. Used for primary CTA buttons, active states, section title accents (`.accent`), stamp rotations, ticker separators. The most attention-grabbing ink; used sparingly but without apology.

### Tertiary
- **Screenprint Mint** (#00A076): Clean mid-teal. Used for positive indicators (the live/active dot), stamp variants, nav active dots, project category badges. Signals "live," "confirmed," "available."
- **Press Lemon** (#E8B91A): Warm amber-yellow. Used for hover states across all interactive surfaces (links, nav buttons, tag glyphs), the brand monogram badge, the selection highlight (`::selection`), and tape imagery. The most pervasive ink in interaction states.

### Neutral
- **Warm Cream** (#F2EBDA): Primary background. The "paper" surface everything sits on.
- **Second Sheet** (#E9E0C8): Secondary background — sections that need slight separation, ticker background, form surfaces.
- **Draft Marks** (#DDD2B5): Tertiary background — diagonal stripe patterns in ASCII frames and postcards.
- **Charcoal Ink** (#1A130A): Primary foreground. All text, borders, and shadows. Never pure black.
- **Pressed Ink** (#3E3424): Secondary text — body copy in cards and descriptions.
- **Faded Ink** (#7A6C53): Muted labels, section metadata, secondary UI text. Used for "when," "where," eyebrow labels.
- **Ghosted Ink** (#B6A988): Placeholder text, tertiary information, the lowest-contrast tier.

### Named Rules

**The Four Inks Rule.** Riso Blue, Fluorescent Pink, Screenprint Mint, and Press Lemon are a rotation, not a hierarchy. Each has a predictable functional role; none should migrate outside its role for purely decorative purposes. The inks earn their vividness by showing up where they belong, not everywhere at once.

**The Hover Lemon Rule.** Press Lemon is the universal hover color for all interactive surfaces: link backgrounds, nav button hover fills, CTA hover accents. New interactive elements must follow this rule.

## 3. Typography

**Primary Font:** JetBrains Mono (weights 400/500/700/800; Google Fonts)
**Accent Font:** Newsreader Italic (weights 400/600; Google Fonts)

**Character:** JetBrains Mono carries every UI surface — headings, body text, labels, buttons — without apology. It is not "a code font used for personality." It is the primary typeface. Newsreader Italic appears in exactly two roles: editorial taglines (hero copy) and postcard voice copy. Any use outside these two roles is a misapplication.

### Hierarchy

- **Display** (weight 800, `clamp(56px, 9vw, 132px)`, line-height 0.88, tracking -0.05em): Hero title only. The largest possible expression of the brand. Letter-spacing at -0.05em creates tightly composed blocks of type that feel stamped onto the page.
- **Headline** (weight 800, 36px, line-height 1.0, tracking -0.04em): Section titles (`.section-head .title`). Always accompanied by a section number in label style and a right-aligned meta label.
- **Title** (weight 800, 21px, line-height 1.15, tracking -0.02em): Card titles (`.pc-title`). High-weight, tight-tracked, structural.
- **Body** (weight 400, 14px, line-height 1.55): General prose, card descriptions, chat messages. The base reading size for the site.
- **Label** (weight 600, 10px, line-height 1.2, tracking 0.18em, uppercase): All UI metadata — section numbers, category badges, topbar meta, eyebrow labels, card footers. Tightly tracked, fully uppercase, reads as captions or annotations.
- **Editorial** (Newsreader Italic, weight 400-600, 22px, line-height 1.4): Hero tagline and postcard message voice. The only serif in the system. Never used for navigation, buttons, or UI labels.

### Named Rules

**The Mono-First Rule.** JetBrains Mono is non-negotiable as the primary typeface. New elements default to it. Newsreader appears only in editorial/tagline roles. Under no circumstances should a third typeface be introduced.

**The Negative Tracking Rule.** All display and headline-scale text uses negative letter-spacing (-0.04em to -0.05em). This creates the tight, stamped-block quality that distinguishes the display style. Body and label text moves the opposite direction: positive tracking (0.04em to 0.22em) for readability and annotation quality.

## 4. Elevation

This system uses **structural offset shadows only** — no blur, no ambient glow, no diffusion. All shadows are a single solid-color offset that mimics the physical depth of letterpress printing or a card lifted off a ruled surface. The shadow color is always pure ink (#1A130A).

**The Offset Shadow Rule.** All box-shadows follow the pattern `Xpx Xpx 0 #1A130A`. Never add a blur radius — `5px 5px 0` not `5px 5px 8px rgba(0,0,0,0.2)`. Blurred shadows look digital and cancel the print metaphor.

**The State-Compression Rule.** Hover states increase the offset and translate the element up-left (`transform: translate(-1px, -1px)`). Active/pressed states compress the offset to 1px and translate down-right (`transform: translate(2px, 2px)`). This simulates physical press depth.

### Shadow Vocabulary

- **Card shadow** (`5px 5px 0 #1A130A`): Project cards, portrait cards at rest.
- **Card shadow — hover** (`7px 7px 0 #1A130A`): Project cards on hover, with `translate(-2px, -2px)`.
- **Button shadow** (`3px 3px 0 #1A130A`): CTA buttons at rest.
- **Button shadow — hover** (`4px 4px 0 #1A130A`): CTA buttons on hover, with `translate(-1px, -1px)`.
- **Button shadow — active** (`1px 1px 0 #1A130A`): CTA buttons on press, with `translate(2px, 2px)`.
- **Mark shadow** (`3px 3px 0 #1A130A`): Brand glyph badge — slightly rotated (-1.5deg) for handcrafted feel.
- **Portrait card shadow** (`8px 8px 0 #1A130A`): The largest shadow in the system; used only for the featured portrait card in the hero.

## 5. Components

### Buttons (`.cta`)

Blocky, ink-stamped, with a physical press interaction. Sharp corners are non-negotiable.

- **Shape:** No border radius. 1.5px solid ink border. All variants.
- **Default (paper):** Paper background (#F2EBDA), ink text, `3px 3px 0 #1A130A` shadow. Uppercase, 12px, tracking 0.1em, weight 600.
- **Primary (ink):** Full ink background (#1A130A), paper text. Same shadow and typography.
- **Pink accent:** Fluorescent Pink background (#F0457B), paper text. Used for the most prominent single CTA per section.
- **Hover:** `translate(-1px, -1px)`, shadow becomes `4px 4px 0 #1A130A`. Background does not change on default/ink variants.
- **Active:** `translate(2px, 2px)`, shadow becomes `1px 1px 0 #1A130A`.
- **Transition:** `0.08s ease` — snappy, not smooth. The physical feel is immediate.

### Tags / Chips (`.tag`)

The one element in the system with a border radius (2px — almost imperceptible, used to distinguish tags from structural rectangles).

- **Default:** 1.2px solid ink border, paper background, ink text, `3px 8px` padding, 11px, tracking 0.04em.
- **Blue (`.tag.b`):** Riso Blue background, paper text, Riso Blue border.
- **Pink (`.tag.p`):** Fluorescent Pink background, paper text.
- **Mint (`.tag.m`):** Screenprint Mint background, paper text.
- **Lemon (`.tag.l`):** Press Lemon background, ink text, ink border.

### Project Cards (`.project-card`)

The primary content unit. Structural, gridded, physical.

- **Corner Style:** Sharp (border-radius: 0). 1.5px solid ink border.
- **Background:** Paper (#F2EBDA).
- **Shadow:** `5px 5px 0 #1A130A` at rest; `7px 7px 0` on hover with `translate(-2px, -2px)`.
- **Header bar (`.pc-header`):** Full-width dark bar (ink background, paper text). 10px label type, 0.16em tracking, uppercase. Right side shows a category chip (mint for ML, pink for creative). Left side shows a sequential ID in press-lemon.
- **ASCII frame:** Diagonal-stripe patterned background behind monospace art. The pattern uses `repeating-linear-gradient(45deg, paper-3 0 2px, transparent 2px 8px)`.
- **Body:** 18px padding. Title (21px 800), subtitle (12px muted, uppercase), description (13px body), tags, and links.
- **Wide variant (`.wide`):** Spans full 6 columns. Used for creative/special projects.

### Stamps (`.stamp`)

Decorative certification marks. Rotated (-3deg default, +2deg for mint variant), bordered, uppercase.

- **Style:** 2px solid currentColor border, 4px 10px padding, 10px, tracking 0.22em, weight 700.
- **Colors:** Pink (default), Mint (`.mint`), Blue (`.blue`). Background always paper.
- **Rotation:** Never flat. -3deg, +2deg, or -1.5deg — the rotation is part of the character.

### Navigation / TopBar (`.topbar`)

- **Layout:** Sticky, 3-column grid (brand mark | tabs | meta), border-bottom 1.5px solid ink, with a dotted pseudo-border 6px below for double-line depth.
- **Nav tabs (`.tb-nav button`):** Bordered container (1.5px solid ink), no outer radius, internal right borders between tabs. 12px uppercase weight 600, 0.08em tracking.
- **Active tab:** Full ink background, paper text, mint status dot with paper border.
- **Hover tab:** Press Lemon fill.
- **Brand glyph (`.tb-mark .glyph`):** Press Lemon background, ink text, 28px bold, rotated -1.5deg, `3px 3px 0 #1A130A` shadow.

### Postcard / Contact Card (`.postcard-card`)

The contact section as a physical postcard. A signature component.

- **Layout:** Two-column split — message left, address/stamps right.
- **Right side:** Diagonal stripe background (repeating-linear-gradient at 45deg using paper-3). Contains rotated stamps, mock address lines (dotted underlines), and a postmark glyph.
- **Left side:** Newsreader Italic message copy, ink text, light serif editorial voice.

### Chat Messages (`.message`)

- **Structure:** `from` label (10px, 0.18em tracking, uppercase) above a `bubble` container.
- **Bubble (user):** Ink background, paper text, 1.5px solid ink border, `3px 3px 0 #1A130A` shadow.
- **Bubble (assistant):** Paper-2 background, ink text, same border and shadow treatment.

## 6. Do's and Don'ts

### Do:

- **Do** use `Xpx Xpx 0 #1A130A` shadows with no blur radius. The exact offset varies by component (3px for buttons, 5px for cards, 8px for the hero portrait card), but the pattern is always the same.
- **Do** keep all structural corners sharp (border-radius: 0). Tags are the only exception (2px).
- **Do** use Press Lemon (#E8B91A) as the universal hover fill for interactive surfaces — nav buttons, links, CTA hover backgrounds.
- **Do** use uppercase JetBrains Mono with 0.1em–0.22em letter-spacing for all UI labels, metadata, and annotations. Hierarchy is in weight and scale, not in case changes alone.
- **Do** apply the grain overlay globally via CSS pseudo-elements rather than embedding texture in images. It must be a viewport-fixed layer so it reads consistently as a physical surface property.
- **Do** rotate decorative elements (stamps at ±3deg, the brand glyph at -1.5deg, tape strips at +4deg). The slight rotation signals handcraft and distinguishes from generated content.
- **Do** keep Newsreader confined to tagline/editorial roles. One font pair, always.

### Don't:

- **Don't** use SaaS landing-page patterns: gradient CTA buttons, hero-metric layouts (big number, small label, supporting stats), Inter or system-sans as the primary typeface, testimonial carousels, or feature grids with icon-heading-text triplets.
- **Don't** use dark mode. The warm cream + charcoal ink palette is non-negotiable. A dark variant would destroy the print metaphor and slip into the "hacker dark mode" register this portfolio explicitly rejects.
- **Don't** add blur to any box-shadow. `box-shadow: 5px 5px 8px rgba(0,0,0,0.2)` is the signature of digital UI design; it breaks the letterpress illusion immediately.
- **Don't** use gradient text (`background-clip: text`). A single solid ink color carries emphasis; gradient text is pure decoration and is banned project-wide.
- **Don't** use glassmorphism (`backdrop-filter: blur`) decoratively. It is the opposite aesthetic register — polished, digital, dematerialized — and incompatible with the print metaphor.
- **Don't** use border-left or border-right greater than 1px as a colored accent stripe on cards or callouts. This is a default AI pattern. Use full borders, background tints, or header bars instead.
- **Don't** introduce a third typeface. JetBrains Mono + Newsreader is the complete typographic system. Any new requirement should be solved within this pair.
- **Don't** use pure `#000000` or `#ffffff`. Ink (#1A130A) and Paper (#F2EBDA) are the darkest and lightest values in the system; pure black/white break the warm analog tone.
