# Portfolio Content Overhaul + Music Feature Design

**Date:** 2026-06-02
**Status:** Approved

## Overview

Two parallel efforts:
1. **Music entry point** — a persistent TopBar pill that opens a full artist modal powered by a custom SoundCloud Widget API player styled to the riso aesthetic.
2. **Content overhaul** — sync `src/data/portfolio.json` (UI) and `api/knowledge/*.md` (chat) with the full work experience dump. Add Kodexa, enrich Stratpoint and Nuts & Bolts, expand project descriptions, add music knowledge file.

**Privacy rule applied throughout:** No client names in the UI or knowledge base. Describe clients by industry reputation and scale only (e.g., "a Hispanic legal marketing platform," "a major restaurant chain," "a Fortune 500 outplacement firm"). This applies to all six Nuts & Bolts projects. The FAANG research lab at Stratpoint is referred to as "a FAANG research lab" per NDA.

---

## Feature 1: Music Entry Point

### TopBar Pill

The TopBar currently has three grid columns: `[mark] [nav] [meta]`. A third button is added to `tb-nav` as a `♪ listen` button. It uses riso coral/salmon accent styling to visually distinguish it from the page-view toggles (chat / portfolio), signaling it's a different kind of action.

When a SoundCloud track is playing, the pill's dot indicator pulses in coral — same dot element already used by `is-active` nav buttons, different color. This gives a persistent "music is on" signal even after the modal is closed.

Mobile: the button is visible (the nav already shows on mobile). The `tb-meta` area is already hidden on mobile so there's no layout conflict.

### Artist Modal

Full-screen overlay (high z-index, backdrop blur). Closes on X button or Escape key. Two-panel layout on desktop, single column on mobile.

**Left panel — identity + stats:**
- `P/ · ARTIST` header glyph matching the TopBar mark style
- Stat strip: `28.1M+ streams · 127K+ followers · 43.5K Last.fm listeners · 488K+ scrobbles`
- Genre/scene tag: `OPM · indie / alternative · singer-songwriter`
- Signed to Universal Records Philippines at age 18
- Career highlights in bullet-stamp style:
  - Wish Urban Song of the Year 2020 — "Sway"
  - 5× Wish Awards nominee
  - V (Kim Taehyung / BTS) sang "Sorry" in a public vlog → international streaming spike
  - Wanderland Music & Arts Festival (Philippines' premier festival)
  - Nationwide touring as headlining and supporting act
  - Collaboration with Clara Benin — "roses" (May 2, 2025)

**Right panel — discography + player:**
- Discography list with year stamps:
  - *Purple Afternoon* EP — 2020
  - *BLOOM* EP — 2023
  - *The World Is So Small* — debut album, 2024
  - *Inbetweens* — full AI-assisted album, 2024 (SoundCloud)
  - Sophomore album in progress — target early 2027
- Spotify embed player (see below)
- Streaming link row: Spotify · SoundCloud · Apple Music.
  - Spotify: `https://open.spotify.com/artist/7aerdWadzubpu06Oxysg6R`
  - Apple Music: `https://music.apple.com/us/artist/paolo-sandejas/1404323148`
  - SoundCloud: `https://soundcloud.com/paolosandejas`
- Press: *"google 'paolo sandejas' for press and editorial coverage"*

**AI × Music footer callout:**
> *Parallel Paths (2024) — debut album made conventionally vs. an album made in 2 weeks with Gemini + Suno, exhibited as a listening installation at CalArts. Bones are AI; artist finalizes phrasing, adds elements, shapes the final work.*

Links to the Inbetweens SoundCloud set: `https://soundcloud.com/paolosand/sets/inbetweens`

### Spotify Embed Player

A standard Spotify iframe embed inside the modal right panel:

```
https://open.spotify.com/embed/artist/7aerdWadzubpu06Oxysg6R?utm_source=generator
```

- Logged-in Spotify users get full playback; non-logged-in users get 30-second previews
- No custom player logic — Spotify's embed UI handles everything
- Light theme (`theme=1`) to complement the riso paper aesthetic
- Streaming links below the embed serve as follow-through CTAs

---

## Feature 2: Content Overhaul

### 2a. `src/data/portfolio.json` (UI layer)

#### Experience — 3 entries (ordered newest-first)

**Nuts and Bolts AI** — Software Engineer Consultant, Jun 2025 – Present
- Sole engineer on an executive coaching platform for a Fortune 500 outplacement firm; handled product design through deployment. Full-stack: Next.js, Node.js, Supabase, Cal.com. 200+ users, live Q4 2026.
- Built a full-stack affiliate merchandise storefront for a major restaurant chain. Next.js, Node.js, Rapid API (Instagram connector), Supabase. Instagram data populates storefronts; images filtered for explicit content.
- Delivered a major frontend redesign for a B2C video platform — Figma MCP + Claude Code reduced a 6-month scope to 2 months. Next.js.
- Built a blog publishing tool with AI fact-verification and image generation for a Hispanic legal marketing platform. Next.js, FastAPI, CrewAI, OpenAI API, Supabase, Vercel + Replit.
- Research prototype: watch-along AI agent for video platforms using Gemini's multimodal YouTube integration for time-stamped chat responses.
- All projects built with Claude Code as primary development environment.

**Stratpoint Technologies** — AI Engineer · Rapid Prototyping Unit, Jul 2023 – Jul 2024
- Secured a partnership with a FAANG research lab on a climate tech initiative by completing two ML screening tasks: (1) solar plant site suitability predictor for California using scikit-learn + SageMaker (>95% accuracy validated against real solar farm locations), (2) geospatial image-to-map matcher using feature matching (SuperGlue/LoFTR) + horizon detection for pitch/yaw estimation with OpenCV.
- Built a climate research chat interface using Gemini API + LangChain + ReAct framework, connected to Semantic Scholar for paper retrieval. Deployed to Hugging Face Spaces.
- Established ML best practices through code reviews and documentation as team scaled from 4 to 13 engineers.

**Kodexa** — Associate Product Manager (Software Engineer in practice), 2022 – 2023 (part-time while finishing BS)
- Built a Snowflake data connector in Java, referencing existing S3 and Azure connectors.
- Trained ~150 invoice vendor formats for an OCR document parsing model using regex-based annotation scripts.
- Built Apache Superset dashboards to visualize invoice training progress for a large enterprise client — critical for client transparency on a multi-thousand-vendor project.

#### Education additions to `portfolio.json`

The UP thesis (Violence Detector) moves to the education section rather than experience, since it was a senior research project not a paid role:

**University of the Philippines** bullet to add:
- Senior thesis (Computer Vision and Machine Intelligence Group): violence prediction system with aggressor identification. OpenPose body keypoint extraction + SVM classifier trained on a social activity dataset.

#### Projects — updated descriptions

**CHULOOPA** (MFA Thesis)
- Three-process architecture: ChucK handles real-time audio/MIDI/visuals, Python runs AI drum variation inference, a separate ChucK process monitors live audio energy. All communicate via OSC.
- KNN beatbox classifier: MFCC-13 features → user-trained KNN (k=3) → kick / snare / hi-hat → MIDI to Ableton via IAC Driver. One-time training session, personalized per performer.
- AI variation engine: GPTBarPair decoder (6-layer, 256-dim, 8 heads, 4.8M params) trained on 12,085 bar pairs. Generates 5 variations at spice levels 0.2–1.0 from a 16-step P/N grid encoding.
- Spice system: live audio energy analyzed every 500ms → composite spice level → variation selected at each loop boundary using a 4-bar rolling average.
- ChuGL visualization: polyhedra pulse on each drum hit; color encodes state (idle / recording / playback / variation index).
- Stack: ChucK 1.5.x (ChuGL, STK), Python (torch, scikit-learn, librosa, python-osc), Gemini API (optional cloud backend).

**ASCII Drone Synth**
- Four-voice major chord (root, fifth, octave, third) from 8 oscillators with triangle/sawtooth crossfade architecture. Effects: filter → chorus → stereo widener → reverb.
- MediaPipe Hands at up to 30fps. Gesture library: right fist (rotate) → timbre + filter; left fist → stereo width + hue drift; pinch → circle of fifths key selection.
- WebGL ASCII rendering via `THREE.InstancedMesh` + custom GLSL shaders. Each character is a separate GPU instance updated every frame from live webcam pixel data.
- Stack: Tone.js, Three.js (WebGL + GLSL), MediaPipe, vanilla JS. Live demo available.

**HAI — Head as Interface**
- Two HC-SR04 ultrasonic sensors (one per ear) on Arduino → serial to Max/MSP. Left sensor → lowpass filter cutoff; right sensor → playback speed/pitch.
- Max/MSP DSP logic in a dedicated `ultrasonicFilter_v2` abstraction. FM synthesis patch for extended sound design.
- Stack: Arduino (C), Max/MSP. Demo video available.

**Parallel Paths**
- Debut album (*The World Is So Small*) exhibited alongside *Inbetweens* — an album made in 2 weeks using Gemini for co-writing and Suno for co-production. Rule set: AI provides bones, artist finalizes phrasing and adds elements.
- Exhibited as a listening installation at CalArts (2024).
- Links: Inbetweens on SoundCloud.

**Geospatial ML Pipeline** — retitle as "Climate Tech ML · FAANG Research Lab"
- Phase 1: Solar site suitability predictor for California. Scikit-learn + SageMaker. >95% accuracy validated against real solar farm locations.
- Phase 2: Geospatial image-to-map matcher. Feature matching (SuperGlue/LoFTR vs SIFT/SURF/ORB comparison) + horizon detection (pitch) + shadow detection (yaw estimation). OpenCV + Python.

#### Skills — additions

- Languages & Core: add `Java`
- ML & AI: add `LangChain`, `CrewAI`, `ReAct Agents`, `KNN`, `Feature Matching`, `OSC`
- ML Infrastructure: add `SageMaker`, `Jupyter`, `Hugging Face Spaces`
- APIs & Tools: add `Claude Code`, `SoundCloud Widget API`, `Cal.com`, `Rapid API`
- Creative Tech: add `Ableton`, `TouchDesigner`, `Arduino`, `MiniAudicle`, `librosa`, `MediaPipe` (move here from ML & AI)
- Full-Stack: new category — `Next.js`, `Node.js`, `FastAPI`, `Supabase`, `Vercel`, `PostgreSQL`

---

### 2b. `api/knowledge/*.md` (chat layer)

All files get a full rewrite matching the above, with additional depth permitted since this is a conversational context not a public page.

**`experience.md`** — all four roles with full detail. Kodexa with Snowflake connector + Superset context. Stratpoint with all three project phases (solar, geospatial, climate chat), team scale 4→13. N&B with all six client projects, anonymized by industry. UP research lab with Violence Detector thesis detail.

**`projects.md`** — full technical architecture for CHULOOPA (OSC protocol, token vocabulary, variation engine), ASCII Drone (GLSL shader detail, gesture library, iOS workaround), HAI (sensor signal chain, Max/MSP patches), Parallel Paths (art exhibit framing, rule set), Climate Tech ML (both phases with accuracy metrics).

**`skills.md`** — expanded to match all skill additions above. Add Claude Code + superpowers/impeccable plugins as daily workflow tools.

**`education.md`** — UP: Violence Detector thesis (OpenPose + SVM, social activity dataset, aggressor identification). CalArts: CHULOOPA as thesis, creator mindset arc ("focus on what you want to build and why"), tools (Max/MSP, TouchDesigner, Arduino, p5.js, librosa).

**NEW `music.md`** — full artist profile:
- Stats: 28.1M+ streams, 127K+ followers, 43.5K Last.fm listeners, 488K+ scrobbles (as of 2026)
- Signed to Universal Records Philippines at age 18
- Career highlights (Wish Awards, BTS viral, Wanderland, touring, Clara Benin collab)
- Discography with years and notes (Purple Afternoon, BLOOM, The World Is So Small, Inbetweens)
- Sophomore album in progress, target early 2027
- Scene: OPM indie/alternative; similar artists: Lola Amour, Any Name's Okay, Kenaniah, Ben&Ben adjacent
- Born August 13, 2000, Philippines
- AI × Music: Parallel Paths project, rule set, CalArts exhibition
- Press: google "Paolo Sandejas"

---

## Out of Scope

- Backend chat API logic (no changes to `api/chat.js`, `api/lib/rag.js`, or personality/guard files)
- Violence Detector GitHub repo visibility decision (left to Paolo)
- Streaming platform integrations beyond SoundCloud Widget API + link-outs
- Phase 3 CHULOOPA multi-track development

---

## File Change Summary

| File | Change |
|------|--------|
| `src/data/portfolio.json` | Full rewrite of experience, projects, skills |
| `src/components/layout/TopBar.jsx` | Add ♪ listen button |
| `src/index.css` | TopBar pill styles, playing-dot state |
| `src/components/music/ArtistModal.jsx` | New component |
| `src/components/music/ArtistModal.css` | New file |
| `src/components/music/ArtistModal.jsx` | Spotify iframe embed lives here (no separate player component needed) |
| `api/knowledge/experience.md` | Full rewrite |
| `api/knowledge/projects.md` | Full rewrite |
| `api/knowledge/skills.md` | Full rewrite |
| `api/knowledge/education.md` | Full rewrite |
| `api/knowledge/music.md` | New file |
