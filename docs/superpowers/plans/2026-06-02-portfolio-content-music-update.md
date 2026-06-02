# Portfolio Content Overhaul + Music Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update all portfolio content (portfolio.json + api/knowledge/*.md) with the full work experience dump, and add a ♪ listen button to the TopBar that opens a full artist modal with a Spotify embed.

**Architecture:** Two independent workstreams — (1) content rewrites across portfolio.json and five knowledge markdown files, and (2) a new music UI feature: a TopBar pill that triggers an ArtistModal overlay component. State lives in App.jsx. No changes to the backend chat API or RAG logic.

**Tech Stack:** React (JSX), plain CSS, Spotify iframe embed, JetBrains Mono / riso design system (CSS variables from index.css)

**Privacy rule:** No client names anywhere. Describe by industry + scale only. Stratpoint's FAANG lab is "a FAANG research lab" throughout.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/data/portfolio.json` | Rewrite | All UI-visible content: experience, projects, skills, education |
| `api/knowledge/experience.md` | Rewrite | Full work history for Pao-GPT chat |
| `api/knowledge/projects.md` | Rewrite | Full project technical detail for chat |
| `api/knowledge/skills.md` | Rewrite | Expanded skill list for chat |
| `api/knowledge/education.md` | Rewrite | Enriched education detail for chat |
| `api/knowledge/music.md` | Create | Full artist profile for chat |
| `src/App.jsx` | Modify | Add `musicOpen` state, render `ArtistModal`, add Escape handler |
| `src/components/layout/TopBar.jsx` | Modify | Add `onMusicClick` prop, render ♪ listen button |
| `src/index.css` | Modify | Add `.tb-nav-music` button styles |
| `src/components/music/ArtistModal.jsx` | Create | Full artist modal — identity, discography, Spotify embed, links |
| `src/components/music/ArtistModal.css` | Create | All modal styles |

---

## Phase 1: Content Overhaul

### Task 1: Rewrite `src/data/portfolio.json`

**Files:**
- Modify: `src/data/portfolio.json`

- [ ] **Step 1: Replace the file contents**

Write the following complete file:

```json
{
  "personal": {
    "name": "Paolo Sandejas",
    "title": "AI/ML Engineer · Creative Technologist",
    "location": "Glendale, CA",
    "email": "pjsandejas@gmail.com",
    "github": "https://github.com/paolosand",
    "linkedin": "https://www.linkedin.com/in/paolosand"
  },
  "summary": "AI/ML engineer and recording artist building tools at the intersection of code and creativity. 2+ years shipping production systems. Specializing in generative AI, computer vision, full-stack development — with a musician's instinct for what makes a tool worth using.",
  "valueProps": [
    {
      "title": "Ships Production AI",
      "description": "2+ years deploying AI systems serving real users across multiple clients."
    },
    {
      "title": "Full-Stack AI",
      "description": "From model to UI — Next.js, FastAPI, Gemini, OpenAI, Claude."
    },
    {
      "title": "Creative Applications",
      "description": "Real-time audio ML, gestural instruments, generative systems."
    }
  ],
  "experience": [
    {
      "company": "Nuts and Bolts AI",
      "role": "Software Engineer Consultant",
      "dates": "Jun 2025 — Present",
      "bullets": [
        "Sole engineer on an executive coaching platform for a Fortune 500 outplacement firm — product design through deployment. Next.js, Node.js, Supabase, Cal.com. 200+ users, live Q4 2026.",
        "Built a full-stack affiliate merchandise storefront for a major restaurant chain. Instagram API integration populates storefronts; images filtered for explicit content. Next.js, Node.js, Supabase.",
        "Delivered a major frontend redesign for a B2C video platform — Figma MCP + Claude Code compressed a 6-month scope to 2 months. Next.js.",
        "Built an AI blog publishing tool with automated fact-verification and image generation for a Hispanic legal marketing platform. Next.js, FastAPI, CrewAI, OpenAI API, Supabase.",
        "Prototyped a watch-along AI agent for video platforms using Gemini's multimodal YouTube integration for time-stamped chat responses.",
        "All projects built with Claude Code as primary development environment."
      ]
    },
    {
      "company": "Stratpoint Technologies",
      "role": "AI Engineer · Rapid Prototyping Unit",
      "dates": "Jul 2023 — Jul 2024",
      "bullets": [
        "Secured a partnership with a FAANG research lab on a climate tech initiative by completing two ML screening tasks: solar plant site suitability predictor for California (scikit-learn + SageMaker, >95% accuracy validated against real solar farm locations) and geospatial image-to-map matcher (SuperGlue/LoFTR feature matching + horizon detection for pitch/yaw estimation, OpenCV).",
        "Built a climate research chat interface with Gemini API + LangChain + ReAct framework, connected to Semantic Scholar for paper retrieval. Deployed to Hugging Face Spaces.",
        "Established ML best practices through code reviews and documentation as team scaled from 4 to 13 engineers."
      ]
    },
    {
      "company": "Kodexa",
      "role": "Associate Product Manager (Software Engineer in practice)",
      "dates": "2022 — 2023 · part-time",
      "bullets": [
        "Built a Snowflake data connector in Java, referencing existing S3 and Azure connectors.",
        "Trained ~150 invoice vendor formats for an OCR document parsing model using regex-based annotation scripts.",
        "Built Apache Superset dashboards to visualize invoice training progress for a large enterprise client — critical for client transparency on a multi-thousand-vendor project."
      ]
    }
  ],
  "education": [
    {
      "degree": "MFA, Music Technology",
      "school": "California Institute of the Arts",
      "dates": "2024 — 2026",
      "gpa": "4.0 GPA",
      "bullets": [
        "Thesis: CHULOOPA — a real-time intelligent drum looper for live performance using a personalized KNN beatbox classifier and a 4.8M-parameter Transformer variation engine.",
        "Coursework in Max/MSP, TouchDesigner, Arduino, p5.js, Ableton Live, and musical information retrieval.",
        "Explored AI-human creative collaboration through the Parallel Paths art installation at CalArts."
      ]
    },
    {
      "degree": "BS, Computer Science",
      "school": "University of the Philippines Diliman",
      "dates": "2018 — 2023",
      "bullets": [
        "Senior thesis (Computer Vision and Machine Intelligence Group): violence prediction system with aggressor identification using OpenPose body keypoint extraction + SVM classification.",
        "Coursework in data structures, algorithms, networks, AI, software engineering, data engineering, and discrete mathematics."
      ]
    }
  ],
  "projects": [
    {
      "id": "chuloopa",
      "title": "CHULOOPA",
      "subtitle": "Real-time AI drum looper · MFA Thesis",
      "description": "Three-process live performance system: ChucK handles audio/MIDI/ChuGL visuals, Python runs a 4.8M-param Transformer variation engine (GPTBarPair decoder, trained on 12,085 bar pairs), and a spice detector analyzes live audio energy every 500ms to select variations in real time. Personalized KNN beatbox classifier (MFCC-13 → kick/snare/hi-hat) sends MIDI to Ableton via IAC Driver.",
      "tags": ["ChucK", "PyTorch", "Audio ML", "Transformers", "OSC", "Real-time"],
      "category": "ml",
      "featured": true,
      "links": {
        "github": "https://github.com/paolosand/CHULOOPA",
        "demo": null
      }
    },
    {
      "id": "ascii-drone",
      "title": "ASCII Drone Synth",
      "subtitle": "Gesture-controlled web synthesizer",
      "description": "Browser-based gestural instrument driven by MediaPipe hand tracking at 30fps. Four-voice major chord (8 oscillators, triangle/sawtooth crossfade) with filter → chorus → stereo widener → reverb. WebGL ASCII rendering via THREE.InstancedMesh + custom GLSL shaders — each character is a GPU instance updated every frame from live webcam data.",
      "tags": ["MediaPipe", "Tone.js", "Three.js", "GLSL", "Web Audio", "Creative Coding"],
      "category": "creative",
      "featured": true,
      "links": {
        "github": null,
        "demo": "https://paolosand.github.io/ascii_drone/"
      }
    },
    {
      "id": "climate-ml",
      "title": "Climate Tech ML",
      "subtitle": "FAANG research lab · geospatial + solar",
      "description": "Phase 1: Solar site suitability predictor for California — scikit-learn + SageMaker, >95% accuracy validated against real solar farm locations. Phase 2: Geospatial image-to-map matcher — feature matching (SuperGlue/LoFTR) + horizon detection for pitch/yaw, OpenCV. Both tasks secured a production partnership with a FAANG research lab.",
      "tags": ["scikit-learn", "SageMaker", "OpenCV", "Computer Vision", "Feature Matching"],
      "category": "ml",
      "featured": true,
      "links": {
        "github": null,
        "demo": null
      }
    },
    {
      "id": "hai",
      "title": "HAI · Head as Interface",
      "subtitle": "Wearable gestural instrument",
      "description": "Two HC-SR04 ultrasonic sensors (one per ear) on Arduino → serial to Max/MSP. Left sensor controls lowpass filter cutoff; right sensor controls playback speed and pitch. DSP logic in a dedicated Max/MSP abstraction with FM synthesis patch for extended sound design.",
      "tags": ["Arduino", "Max/MSP", "Wearable", "HCI", "Real-time Audio"],
      "category": "creative",
      "featured": true,
      "links": {
        "github": null,
        "demo": "https://www.youtube.com/watch?v=rxaJTSi7KDY"
      }
    },
    {
      "id": "parallel-paths",
      "title": "Parallel Paths",
      "subtitle": "AI × music art installation · CalArts 2024",
      "description": "Debut album exhibited alongside Inbetweens — an album made in 2 weeks using Gemini for co-writing and Suno for co-production. Rule: AI provides bones, artist finalizes phrasing and adds elements. Exhibited as a listening installation at CalArts. Explores responsible AI in creative practice.",
      "tags": ["Gemini", "Suno", "Creative AI", "Music Tech", "Ethics"],
      "category": "ml",
      "featured": false,
      "links": {
        "github": null,
        "demo": "https://soundcloud.com/paolosandejas/sets/inbetweens"
      }
    },
    {
      "id": "video-analysis",
      "title": "Multi-Modal Video Analysis",
      "subtitle": "Concurrent Gemini pipeline · production",
      "description": "Real-time video analysis pipeline with concurrent processing for low-latency response. Built for production deployment at Nuts and Bolts AI, serving thousands of users.",
      "tags": ["Gemini API", "Concurrent", "Python", "Production", "Multi-Modal"],
      "category": "ml",
      "featured": false,
      "links": {
        "github": null,
        "demo": null
      }
    }
  ],
  "skills": {
    "Languages & Core": ["Python", "JavaScript", "TypeScript", "Java", "SQL", "C++"],
    "AI & ML": ["PyTorch", "scikit-learn", "LangChain", "CrewAI", "ReAct Agents", "Computer Vision", "Audio ML", "RAG", "Feature Matching", "KNN", "MediaPipe"],
    "ML Infrastructure": ["SageMaker", "Hugging Face Spaces", "Jupyter", "Model Deployment", "Evaluation", "Data Processing", "Docker"],
    "APIs & Tools": ["Gemini API", "OpenAI API", "Claude API", "Claude Code", "Figma MCP", "Cal.com", "Rapid API"],
    "Full-Stack": ["Next.js", "Node.js", "FastAPI", "Supabase", "PostgreSQL", "Vercel"],
    "Creative Tech": ["ChucK", "Max/MSP", "Ableton", "TouchDesigner", "Arduino", "Tone.js", "Three.js", "p5.js", "GSAP", "librosa", "OSC"]
  }
}
```

- [ ] **Step 2: Start the dev server and verify UI reflects new content**

```bash
npm run dev
```

Open `http://localhost:5173`. Confirm:
- Experience section shows 3 companies (Nuts and Bolts, Stratpoint, Kodexa)
- Projects shows CHULOOPA, ASCII Drone, Climate Tech ML, HAI, Parallel Paths, Multi-Modal Video
- Skills section shows Full-Stack as a new category
- Education shows CalArts thesis bullet and UP thesis bullet

- [ ] **Step 3: Commit**

```bash
git add src/data/portfolio.json
git commit -m "content: rewrite portfolio.json with full work history and projects"
```

---

### Task 2: Rewrite `api/knowledge/experience.md`

**Files:**
- Modify: `api/knowledge/experience.md`

- [ ] **Step 1: Replace the file contents**

```markdown
# Work Experience

## Nuts and Bolts AI
**Software Engineer Consultant**
**June 2025 to Present**

All projects built with Claude Code as the primary development environment.

### Executive Coaching Platform (Fortune 500 Outplacement Firm)
Sole engineer on a brand new executive coaching platform for a Fortune 500 outplacement firm serving C-level clients who have been outplaced. Responsible for everything from product design to implementation.

- Stack: Next.js (frontend), Node.js (backend), Cal.com (booking and coach availability), Supabase PostgreSQL (database and storage), Vercel (deployment)
- Supports 200+ users. Covers booking coaching sessions, answering assessments and surveys, managing coach availability
- Set to go live Q4 2026, currently in beta testing with coaches
- Handled direct client communication, feature prioritization, and expectation management alongside one project manager

### Affiliate Merchandise Storefront (Major Restaurant Chain)
Full-stack affiliate merchandise storefront for a major restaurant chain focused on waitress onboarding and storefront creation.

- Waitress provides account info and Instagram username → backend pulls latest posts and account data via Rapid API Instagram connector
- Instagram data populates storefront (profile picture, showcase images, bio). Users can upload their own images (all filtered for explicit content). Images stored in Supabase storage.
- Waitress selects up to 10 merchandise items to showcase. Inventory fetched from S3.
- Stack: Next.js, Node.js, Rapid API (Instagram connector), Supabase PostgreSQL, Vercel

### Major Frontend Redesign (B2C Video Platform)
Full frontend redesign of a large B2C video platform from a Figma design file.

- Used Figma MCP and Claude Code to implement the redesign
- What would have taken at least 6 months of traditional development was completed in 2 months
- Stack: Next.js

### AI Blog Publishing Tool (Hispanic Legal Marketing Platform)
Full-stack blog posting tool for a Hispanic legal marketing platform.

- Frontend: Next.js | Backend: FastAPI + CrewAI (fact verification) + OpenAI API (image generation and blog writing)
- Database: PostgreSQL via Supabase | Deployed: Vercel (frontend), Replit (backend)

### Watch-Along AI Agent (B2C Video Platform — Research Prototype)
Research prototype of a watch-along AI agent users can invite to their video watch party.

- AI agent intercepts messages to and from the backend, responds on behalf of a dummy user
- Uses Gemini's multimodal YouTube integration to analyze the video at a specific timestamp
- Any user message triggers a Gemini response based on: current message, message history, the video, and the timestamp
- Timed messages also sent proactively by the AI as the video plays

### UI/UX Redesign Evaluation (Fortune 500 Outplacement Firm — Career Suite Platform)
Used Claude Code's design tools (impeccable plugin) to evaluate and plan a UI/UX redesign of a career suite platform for a Fortune 500 firm.

- Redesign targeting Q3 2026, supports ~1,000 users

---

## Stratpoint Technologies
**AI Engineer - Rapid Prototyping Unit**
**July 2023 to July 2024**

Worked in the AI labs team at a software outsourcing company, primarily on a climate tech initiative with a FAANG research lab. [NDA: the FAANG lab is not named publicly — use "a FAANG research lab" in all responses.]

### Solar Site Suitability Predictor (Screening Task 1)
First screening task to secure the FAANG research lab partnership: identify optimal locations in California to build solar plants.

- Research phase (2-3 weeks): academic papers, compiled list of most relevant environmental predictors
- Data collection and analysis phase (2-3 weeks)
- Model training phase (2-3 weeks): California heatmap showing best and worst spots for solar sites
- Stack: Python, scikit-learn, pandas, seaborn, AWS SageMaker, Jupyter Notebook
- Achieved >95% accuracy validated against actual locations of existing California solar farms

### Geospatial Image-to-Map Matcher (Screening Task 2)
Second screening task: given an aerial image of a landscape (with GPS metadata), draw a bounding box on a map identifying the area shown.

- Compared feature matching techniques: SuperGlue, LoFTR, SIFT, SURF, ORB
- Novel approaches: horizon detection (camera pitch), shadow detection (yaw/time of day estimate)
- Final pipeline:
  1. Fetch 7×7 high-res grid from Google Maps/Earth API using GPS metadata
  2. Feature match input image against each tile → estimate yaw
  3. Horizon detection → pitch + image height metadata → exact map bounding box
- Stack: Python, scikit-learn, OpenCV, SuperGlue/LoFTR

Completing both tasks secured the partnership with the FAANG research lab.

### Climate Research Chat Interface
First main project after securing the partnership.

- Chat interface allowing climate researchers to query a specific area of research
- Connected to Semantic Scholar API to pull relevant academic papers
- Full-paper context feeding into Gemini proved more effective than vector DB retrieval for the paper sizes involved
- Main use case: ask about best features for predicting wildfires or solar site suitability → returns features validated in preliminary experiments
- Stack: Gemini API, LangChain, ReAct framework | Deployed to Hugging Face Spaces

### Team Scaling
Team grew from 4 to 13 engineers during tenure. Established ML best practices through code reviews and technical documentation.

---

## Kodexa
**Associate Product Manager (worked more as a Software Engineer in practice)**
**~2022 – 2023 · part-time while finishing BS at University of the Philippines**

Kodexa focused on transforming unstructured data (receipts, meter readings, invoices) into structured data.

- Built a Snowflake data connector in Java, referencing existing S3 and Azure connectors
- Trained approximately 150 invoice vendor formats for an OCR document parsing model using regex-based annotation scripts (project involved several thousand vendor invoice formats total)
- Built Apache Superset dashboards to visualize invoice training progress for a large enterprise client — critical for client transparency on a multi-thousand-vendor project
```

- [ ] **Step 2: Commit**

```bash
git add api/knowledge/experience.md
git commit -m "content: rewrite experience knowledge base with full detail"
```

---

### Task 3: Rewrite `api/knowledge/projects.md`

**Files:**
- Modify: `api/knowledge/projects.md`

- [ ] **Step 1: Replace the file contents**

```markdown
# Projects

## CHULOOPA — Real-Time Intelligent Drum Looper (MFA Thesis)
**Technologies:** ChucK 1.5.x (ChuGL, STK, MiniAudicle), Python (torch, scikit-learn, librosa, python-osc), Gemini API (optional cloud backend), Ableton Live (via IAC Driver)
**GitHub:** https://github.com/paolosand/CHULOOPA

MFA thesis project. Real-time intelligent drum looper for live performance by beatboxers, solo musicians, and live loop performers.

**Architecture (three processes, all communicating via OSC):**
1. `chuloopa_main.ck` — ChucK: real-time audio playback, MIDI output, ChuGL visuals. Listens on OSC port 5000.
2. Python variation generator — AI inference (drum variation generation). Listens on OSC port 5001.
3. `spice_detector.ck` — ChucK: analyzes live audio energy every 500ms, streams composite spice level via OSC.

**Beatbox classification pipeline:**
- MFCC-13 feature extraction → user-trained KNN classifier (k=3) → kick / snare / hi-hat detection → MIDI to Ableton Live via macOS IAC Driver
- User records 10+ samples per class in a one-time training session; classifier is personalized per performer

**AI variation engine:**
- GPTBarPair decoder by Jake Chen (CalArts MFA 2025)
- 6-layer decoder-only Transformer, 256-dim embeddings, 8 attention heads, 4.8M parameters
- 42-token vocabulary trained on 12,085 bar pairs from the Expanded Groove MIDI Dataset
- Given a recorded 16-step drum pattern encoded as P/N grid tokens, generates 5 variations at spice levels 0.2 / 0.4 / 0.6 / 0.8 / 1.0
- Alternative Transformer-LSTM backend also available

**Spice system:**
- `spice_detector.ck` analyzes live audio energy every 500ms → composite spice level via OSC
- `chuloopa_main.ck` selects matching variation at each loop boundary using a rolling 4-bar spice average
- User-adjustable spice ceiling via MIDI CC 74

**ChuGL visualization:**
- Polyhedra (cube / octahedron / dodecahedron / icosahedron) pulse on each drum hit
- Color encodes state: gray=idle, blinking red=recording, blue=playback, blue→yellow→red gradient tracks variation index
- Live spice slider updates every 500ms

**OSC protocol:**
- `/chuloopa/bank_ready` Python→ChucK: all variants ready
- `/chuloopa/variation_available` Python→ChucK: index + spice level
- `/chuloopa/spice` spice_detector→ChucK: 0.0–1.0
- `/chuloopa/regenerate` ChucK→Python: on-demand regeneration

---

## ASCII Drone Synth — Gesture-Controlled Web Synthesizer
**Technologies:** Tone.js, Three.js (WebGL + GLSL), MediaPipe Hands, vanilla JS
**Live demo:** https://paolosand.github.io/ascii_drone/

Browser-based gestural instrument for live performance and songwriting. No keyboard, no mouse.

**Audio synthesis:**
- Four-voice major chord (root, fifth, octave, third) from 8 oscillators
- Dual-channel crossfade: triangle (warm) and sawtooth (bright) banks run simultaneously; crossfade avoids clicks
- Effects chain: filter → chorus → stereo widener → reverb
- Circle of fifths overlay enables key changes via pinch gesture

**Hand tracking (MediaPipe at up to 30fps):**
- Right fist (hold 450ms then rotate): timbre crossfade + filter sweep
- Left fist: stereo width + visual hue drift
- Pinch (index + thumb): circle of fifths for root key selection
- 450ms hold-to-activate reduces accidental triggers during performance

**WebGL ASCII rendering:**
- `THREE.InstancedMesh` + custom GLSL shaders (`ascii.vert` / `ascii.frag`)
- Each ASCII character is a separate GPU instance; character index and color update every frame from live webcam pixel data

**Platform details:** Chrome/Edge only. iOS silent mode workaround via silent audio file on first interaction.

---

## Climate Tech ML — FAANG Research Lab
**Technologies:** Python, scikit-learn, pandas, seaborn, AWS SageMaker, Jupyter, OpenCV, SuperGlue, LoFTR, SIFT, SURF, ORB

Two ML screening tasks that secured a partnership with a FAANG research lab on a climate tech initiative.

**Phase 1 — Solar Site Suitability Predictor:**
- Task: identify optimal locations in California to build solar plants
- Research → data collection → model training sprint (2-3 weeks each)
- Achieved >95% accuracy validated against actual solar farm locations in California

**Phase 2 — Geospatial Image-to-Map Matcher:**
- Task: given an aerial image with GPS metadata, draw a bounding box on a map identifying the area shown
- Compared SuperGlue, LoFTR, SIFT, SURF, ORB for feature matching
- Novel: horizon detection (camera pitch), shadow detection (yaw/time of day)
- Final pipeline: 7×7 Google Maps grid → feature match for yaw → horizon detection for pitch → exact bounding box

---

## HAI — Head as Interface
**Technologies:** Arduino (C), Max/MSP, ChucK (OSC bridge experiments)
**Demo:** https://www.youtube.com/watch?v=rxaJTSi7KDY

Wearable gestural instrument for DJs and dancers. Two ultrasonic distance sensors on either side of the head turn the body into a controller.

**Hardware:** Arduino reads two HC-SR04 ultrasonic sensors (one per ear) → serial to Max/MSP.

**Signal chain:**
- Left sensor → lowpass filter cutoff (underwater effect)
- Right sensor → playback speed / pitch (slow-down / stretch)
- Implemented across 4 iterations (`vibeHatInterface_v1` through `v4`) with a `ultrasonicFilter_v2` DSP abstraction
- FM synthesis patch (`potentiometerFMsynth.maxpat`) for extended sound design

---

## Parallel Paths — AI × Music Art Installation
**Technologies:** Gemini API (co-writing), Suno (co-production)
**Listen:** https://soundcloud.com/paolosandejas/sets/inbetweens

Exhibited as a listening installation at CalArts (2024).

Two albums shown side by side:
- *The World Is So Small* (2024) — debut album, made conventionally
- *Inbetweens* (2024) — made in 2 weeks with AI

Rule set: Gemini handles co-writing, Suno handles co-production. AI provides bones (melody, structure, chords); Paolo finalizes phrasing, adds elements, shapes the final work.

The project asks: what does responsible, artist-driven AI look like in a creative context?

---

## Multi-Modal Video Analysis System
**Technologies:** Gemini API, concurrent processing, Python

Real-time video analysis pipeline with concurrent processing for low-latency response. Built at Nuts and Bolts AI for production deployment serving thousands of users.
```

- [ ] **Step 2: Commit**

```bash
git add api/knowledge/projects.md
git commit -m "content: rewrite projects knowledge base with full technical detail"
```

---

### Task 4: Rewrite `api/knowledge/skills.md`

**Files:**
- Modify: `api/knowledge/skills.md`

- [ ] **Step 1: Replace the file contents**

```markdown
# Technical Skills

## Languages & Core
- Python (primary — fluent, daily use)
- JavaScript / TypeScript
- Java
- SQL
- C++ (foundational)

## AI & ML
- PyTorch
- scikit-learn
- LangChain
- CrewAI
- ReAct Agents
- Computer Vision (OpenCV, feature matching)
- Audio ML (MFCC extraction, real-time inference, MIDI)
- RAG (Retrieval Augmented Generation)
- KNN classifiers
- SVM
- MediaPipe (hand tracking, pose estimation)

## ML Infrastructure
- AWS SageMaker
- Hugging Face Spaces
- Jupyter Notebooks
- Model deployment, evaluation, and optimization
- Data processing and preprocessing pipelines
- Docker

## APIs & Tools
- Gemini API
- OpenAI API
- Claude API
- Claude Code (primary development environment — used on ALL projects)
- Claude Code plugins: superpowers (brainstorming, planning, git worktree dev, subagent dev), impeccable (UI/UX design, critique, evaluation)
- Figma MCP
- Cal.com (booking management)
- Rapid API (Instagram connector)
- Semantic Scholar API

## Full-Stack
- Next.js (frontend — all recent client projects)
- Node.js (backend)
- FastAPI (Python backend)
- Supabase (PostgreSQL, file storage)
- PostgreSQL
- Vercel (deployment)

## Creative Tech
- ChucK 1.5.x (ChuGL, STK, MiniAudicle) — real-time audio and visuals
- Max/MSP — audio DSP and visual patching
- Ableton Live — music production and MIDI routing (IAC Driver)
- TouchDesigner — visual/interactive media
- Arduino (C) — hardware prototyping, ultrasonic sensors, serial comms
- Tone.js — web audio synthesis
- Three.js (WebGL, custom GLSL shaders, InstancedMesh)
- p5.js
- GSAP
- librosa — audio feature extraction
- OSC (Open Sound Control) — inter-process communication

## Summary
Paolo's daily driver is Claude Code — used for all projects from brainstorming through deployment. Strong in Python/ML pipelines, full-stack JavaScript (Next.js/Node.js/FastAPI), and creative audio/visual tooling. Self-assessed areas for growth: raw PyTorch/TensorFlow without tooling scaffolding, enterprise-scale architecture design.

## Contact
- Email: pjsandejas@gmail.com
- GitHub: https://github.com/paolosand
- LinkedIn: https://www.linkedin.com/in/paolosand
- Location: Glendale, CA
```

- [ ] **Step 2: Commit**

```bash
git add api/knowledge/skills.md
git commit -m "content: rewrite skills knowledge base with expanded tool list"
```

---

### Task 5: Rewrite `api/knowledge/education.md`

**Files:**
- Modify: `api/knowledge/education.md`

- [ ] **Step 1: Replace the file contents**

```markdown
# Education

## California Institute of the Arts (CalArts)
**Master of Fine Arts in Music Technology**
**2024 to 2026 (Expected)**
**GPA: 4.0**

Accepted on the strength of a unique blend of CS/engineering background and an active music career. The program's focus: building tools and software that enhance human creativity.

**Thesis project: CHULOOPA**
A real-time intelligent drum looper for live performance. Three-process system (ChucK + Python + ChucK) communicating via OSC. KNN beatbox classifier personalizes kick/snare/hi-hat detection per performer. 4.8M-parameter Transformer variation engine generates 5 drum variations at different spice levels. Audio-driven spice system selects variations in real time. Built for Paolo's own live performances.

**Key courses and tools:**
Max/MSP, TouchDesigner, Arduino, p5.js, Ableton Live, musical information retrieval, librosa, ChucK. Discussion-based courses exploring the place of AI in creative spaces.

**Key mindset shift:**
"Focus on what you want to build and why, not how." CalArts reframed coding as a creative act, not just an engineering discipline. This led directly to CHULOOPA and the Parallel Paths project. Paolo was among the most technically qualified in his department, but his peers were relentless builders — that builder energy was the most important thing he took away.

**Other notable projects:**
- Parallel Paths — AI-human creative collaboration art installation (see projects)
- H.A.I. (Head As Interface) — wearable gestural instrument using ultrasonic sensors and Max/MSP

---

## University of the Philippines Diliman
**Bachelor of Science in Computer Science**
**2018 to 2023**

**Senior thesis (Computer Vision and Machine Intelligence Group):**
Violence prediction system with aggressor identification. Used OpenPose for body keypoint extraction and SVM classification trained on a social activity dataset. Goal: predict violent events and identify which individuals in a scene are acting aggressively.
GitHub: https://github.com/paolosand/Violence-Detector-with-Aggressor-Identification

**Coursework:**
Data structures, algorithms, networks, AI algorithms, software engineering, circuits, data engineering (ETL, EDA), discrete mathematics. Core languages: Python (primary), C/C++ (dynamic programming coursework).

**Part-time work during final semester:**
Associate Product Manager at Kodexa (worked more as a software engineer in practice) — built a Snowflake connector in Java, trained invoice OCR models, and built Apache Superset dashboards. See work experience.
```

- [ ] **Step 2: Commit**

```bash
git add api/knowledge/education.md
git commit -m "content: rewrite education knowledge base with thesis and UP research detail"
```

---

### Task 6: Create `api/knowledge/music.md`

**Files:**
- Create: `api/knowledge/music.md`

- [ ] **Step 1: Create the file**

```markdown
# Paolo Sandejas — Artist Profile

Paolo Sandejas is an OPM (Original Pilipino Music) indie/alternative singer-songwriter and recording artist, signed to Universal Records Philippines at age 18.

## Stats (as of 2026)
- 28.1M+ streams across all platforms
- 127K+ followers across social media
- 43.5K+ Last.fm listeners | 488K+ scrobbles
- Born August 13, 2000, Philippines

## Genre & Scene
OPM indie / alternative / singer-songwriter. Scene: Lola Amour, Any Name's Okay, Kenaniah, Ben&Ben adjacent — the core OPM indie alternative circuit.

## Career Highlights
- Wish Urban Song of the Year 2020 — "Sway"
- 5× Wish Awards nominee
- V (Kim Taehyung / BTS) sang "Sorry" in a public vlog → major international streaming spike
- Performed at Wanderland Music & Arts Festival (Philippines' premier festival; past lineups include Daniel Caesar, Jack Johnson, Kodaline)
- Toured across the Philippines as headlining and supporting act
- Collaborated with Clara Benin — single "roses" released May 2, 2025
- Signed to Universal Records Philippines right out of high school at age 18

## Discography
- *Purple Afternoon* EP — 2020
- *BLOOM* EP — 2023
- *The World Is So Small* — debut album (2024)
- *Inbetweens* — full AI-assisted album (2024, SoundCloud): https://soundcloud.com/paolosandejas/sets/inbetweens
- Sophomore album in progress, target release early 2027

## AI & Music — Parallel Paths Project
Two albums exhibited side by side at CalArts (2024) as a listening installation:
1. *The World Is So Small* — debut album made conventionally over years
2. *Inbetweens* — album made in 2 weeks with Gemini (co-writing) and Suno (co-production)

Rule set: AI provides bones (melody, structure, chord progression); Paolo finalizes phrasing, adds elements, shapes the final work. The goal was to use as much AI as possible while the artist retained creative identity.

The project asks: what does responsible, artist-driven AI look like in a creative context? Tools that enhance creativity, not replace it.

## Streaming & Social
- Spotify: https://open.spotify.com/artist/7aerdWadzubpu06Oxysg6R
- Apple Music: https://music.apple.com/us/artist/paolo-sandejas/1404323148
- SoundCloud: https://soundcloud.com/paolosandejas

## Press
For press coverage, articles, and editorial: google "Paolo Sandejas"
```

- [ ] **Step 2: Commit**

```bash
git add api/knowledge/music.md
git commit -m "content: add music knowledge base for artist profile"
```

---

## Phase 2: Music UI Feature

### Task 7: TopBar music pill

**Files:**
- Modify: `src/components/layout/TopBar.jsx`
- Modify: `src/index.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Add `musicOpen` state and Escape handler to `App.jsx`**

Replace the full file:

```jsx
import { useState, useEffect } from 'react';
import TopBar from './components/layout/TopBar';
import ChatInterface from './components/chat/ChatInterface';
import Hero from './components/Hero';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Experience from './components/Experience';
import Contact from './components/Contact';
import './App.css';

function App() {
  const [view, setView] = useState('portfolio');
  const [musicOpen, setMusicOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = view === 'chat' ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [view]);

  useEffect(() => {
    if (!musicOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setMusicOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [musicOpen]);

  return (
    <div className={`app ${view === 'chat' ? 'is-chat' : ''}`}>
      <TopBar view={view} setView={setView} onMusicClick={() => setMusicOpen(true)} />

      {view === 'portfolio' && (
        <>
          <Hero onChatClick={() => setView('chat')} />
          <Projects />
          <Skills />
          <Experience />
          <Contact />
          <footer className="app-footer">
            <span>© paolo sandejas · made by hand & by machine</span>
            <span>printed in glendale, ca · 2026<span className="blink"></span></span>
          </footer>
        </>
      )}

      {view === 'chat' && <ChatInterface />}
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Add `onMusicClick` prop and ♪ listen button to `TopBar.jsx`**

Replace the full file:

```jsx
import './TopBar.css';

export default function TopBar({ view, setView, onMusicClick }) {
  return (
    <header className="topbar">
      <div className="tb-mark">
        <span className="glyph">P/</span>
        <div>
          <div className="name">paolo sandejas</div>
          <div className="sub">ai · ml · creative tech</div>
        </div>
      </div>
      <nav className="tb-nav">
        <button className={view === 'chat' ? 'is-active' : ''} onClick={() => setView('chat')}>
          <span className="dot"></span>
          chat / pao-gpt
        </button>
        <button className={view === 'portfolio' ? 'is-active' : ''} onClick={() => setView('portfolio')}>
          <span className="dot"></span>
          portfolio
        </button>
        <button className="tb-nav-music" onClick={onMusicClick}>
          ♪ listen
        </button>
      </nav>
      <div className="tb-meta">
        <div><b>v0.4.1</b> · march 2026</div>
        <div>printed in glendale, ca</div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Add music button styles to `src/index.css`**

Find the line `.tb-nav button:not(.is-active):hover {` in `src/index.css` (around line 190). Add the following styles immediately AFTER the `.tb-meta b { color: var(--ink); }` rule (after line 203):

```css
.tb-nav button.tb-nav-music {
  background: var(--c-pink);
  color: var(--paper);
  border-right: none;
}
.tb-nav button.tb-nav-music:hover {
  background: var(--c-pink);
  filter: brightness(0.88);
}
```

- [ ] **Step 4: Start dev server and verify the pill appears**

```bash
npm run dev
```

Open `http://localhost:5173`. Confirm:
- TopBar shows three buttons: "chat / pao-gpt", "portfolio", "♪ listen"
- The ♪ listen button has a pink/coral background and cream text
- Clicking ♪ listen does nothing yet (ArtistModal not yet rendered) — that's expected
- Press Escape — no errors in console

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/layout/TopBar.jsx src/index.css
git commit -m "feat: add music pill to TopBar with musicOpen state"
```

---

### Task 8: Create ArtistModal component

**Files:**
- Create: `src/components/music/ArtistModal.jsx`
- Create: `src/components/music/ArtistModal.css`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/components/music
```

- [ ] **Step 2: Create `src/components/music/ArtistModal.jsx`**

```jsx
import './ArtistModal.css';

export default function ArtistModal({ onClose }) {
  return (
    <div className="artist-overlay" onClick={onClose}>
      <div className="artist-modal" onClick={(e) => e.stopPropagation()}>
        <button className="artist-close" onClick={onClose} aria-label="Close">×</button>

        <div className="artist-inner">
          {/* Left panel — identity */}
          <div className="artist-left">
            <div className="artist-glyph">P/ · ARTIST</div>

            <div className="artist-stats">
              <span>28.1M+ streams</span>
              <span>127K+ followers</span>
              <span>43.5K Last.fm listeners</span>
              <span>488K+ scrobbles</span>
            </div>

            <div className="artist-tags">OPM · indie / alternative · singer-songwriter</div>
            <div className="artist-label">Universal Records Philippines · signed age 18</div>

            <ul className="artist-highlights">
              <li>Wish Urban Song of the Year 2020 — "Sway"</li>
              <li>5× Wish Awards nominee</li>
              <li>V (Kim Taehyung / BTS) sang "Sorry" in a public vlog → international streaming spike</li>
              <li>Wanderland Music & Arts Festival</li>
              <li>Nationwide touring — headlining and supporting</li>
              <li>Collaboration with Clara Benin — "roses" (May 2025)</li>
            </ul>

            <div className="artist-press">
              google <em>"paolo sandejas"</em> for press and editorial coverage
            </div>
          </div>

          {/* Right panel — discography + player */}
          <div className="artist-right">
            <div className="artist-discography">
              <div className="artist-section-label">discography</div>
              <ul>
                <li><span className="year">2020</span><em>Purple Afternoon</em> EP</li>
                <li><span className="year">2023</span><em>BLOOM</em> EP</li>
                <li><span className="year">2024</span><em>The World Is So Small</em> — debut album</li>
                <li><span className="year">2024</span><em>Inbetweens</em> — AI-assisted album</li>
                <li><span className="year">2027</span>Sophomore album — in progress</li>
              </ul>
            </div>

            <iframe
              className="artist-spotify"
              src="https://open.spotify.com/embed/artist/7aerdWadzubpu06Oxysg6R?utm_source=generator"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Paolo Sandejas on Spotify"
            />

            <div className="artist-links">
              <a href="https://open.spotify.com/artist/7aerdWadzubpu06Oxysg6R" target="_blank" rel="noopener noreferrer">Spotify</a>
              <a href="https://music.apple.com/us/artist/paolo-sandejas/1404323148" target="_blank" rel="noopener noreferrer">Apple Music</a>
              <a href="https://soundcloud.com/paolosandejas" target="_blank" rel="noopener noreferrer">SoundCloud</a>
            </div>

            <div className="artist-ai-note">
              <strong>Parallel Paths (2024)</strong> — debut album made conventionally vs. an album made in 2 weeks with Gemini + Suno, exhibited as a listening installation at CalArts. AI provides bones; artist finalizes phrasing, adds elements, shapes the final work.{' '}
              <a href="https://soundcloud.com/paolosandejas/sets/inbetweens" target="_blank" rel="noopener noreferrer">Listen →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/music/ArtistModal.css`**

```css
/* ARTIST MODAL ================================================== */
.artist-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(26, 19, 10, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.artist-modal {
  position: relative;
  background: var(--paper);
  border: 1.5px solid var(--ink);
  box-shadow: 6px 6px 0 var(--ink);
  max-width: 1060px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.artist-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  font-size: 18px;
  line-height: 1;
  border: 1.5px solid var(--ink);
  background: var(--paper);
  color: var(--ink);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  font-family: inherit;
}
.artist-close:hover {
  background: var(--ink);
  color: var(--paper);
}

.artist-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Left panel */
.artist-left {
  padding: 40px 36px;
  border-right: 1.5px solid var(--ink);
}

.artist-glyph {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: var(--c-pink);
  color: var(--paper);
  display: inline-block;
  padding: 6px 14px 8px;
  border: 1.5px solid var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
  margin-bottom: 28px;
}

.artist-stats {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 18px;
}
.artist-stats span {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}

.artist-tags {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
  border-top: 1px solid var(--paper-3);
  border-bottom: 1px solid var(--paper-3);
  padding: 7px 0;
  margin-bottom: 10px;
}

.artist-label {
  font-size: 11px;
  color: var(--ink-mute);
  margin-bottom: 24px;
}

.artist-highlights {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.artist-highlights li {
  font-size: 12px;
  line-height: 1.5;
  padding-left: 16px;
  position: relative;
}
.artist-highlights li::before {
  content: "—";
  position: absolute;
  left: 0;
  color: var(--c-pink);
  font-weight: 700;
}

.artist-press {
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--ink-mute);
}
.artist-press em {
  color: var(--ink);
}

/* Right panel */
.artist-right {
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.artist-section-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 10px;
}

.artist-discography ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.artist-discography li {
  font-size: 12px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.artist-discography .year {
  font-size: 10px;
  color: var(--ink-mute);
  letter-spacing: 0.05em;
  min-width: 30px;
  flex-shrink: 0;
}
.artist-discography em {
  font-style: italic;
}

.artist-spotify {
  width: 100%;
  height: 352px;
  border: 1.5px solid var(--ink);
  display: block;
}

.artist-links {
  display: flex;
  border: 1.5px solid var(--ink);
}
.artist-links a {
  flex: 1;
  text-align: center;
  padding: 10px 8px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink);
  border-bottom: none;
  border-right: 1.5px solid var(--ink);
  text-decoration: none;
}
.artist-links a:last-child { border-right: none; }
.artist-links a:hover {
  background: var(--c-lemon);
  color: var(--ink);
}

.artist-ai-note {
  font-size: 11px;
  line-height: 1.65;
  color: var(--ink-mute);
  border-top: 1.5px dotted var(--ink-faint);
  padding-top: 16px;
}
.artist-ai-note strong { color: var(--ink); }
.artist-ai-note a {
  color: var(--c-blue);
  font-weight: 600;
  border-bottom: 1px solid currentColor;
}

/* Mobile */
@media (max-width: 768px) {
  .artist-overlay {
    padding: 0;
    align-items: flex-end;
  }
  .artist-modal {
    max-height: 88vh;
    box-shadow: none;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }
  .artist-inner {
    grid-template-columns: 1fr;
  }
  .artist-left {
    border-right: none;
    border-bottom: 1.5px solid var(--ink);
    padding: 28px 20px;
  }
  .artist-right {
    padding: 28px 20px;
  }
  .artist-spotify {
    height: 232px;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/music/ArtistModal.jsx src/components/music/ArtistModal.css
git commit -m "feat: add ArtistModal component with Spotify embed and discography"
```

---

### Task 9: Wire ArtistModal into App and verify full flow

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Import and render ArtistModal in `App.jsx`**

Add the import after the existing imports and render the modal conditionally. Replace the full file:

```jsx
import { useState, useEffect } from 'react';
import TopBar from './components/layout/TopBar';
import ArtistModal from './components/music/ArtistModal';
import ChatInterface from './components/chat/ChatInterface';
import Hero from './components/Hero';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Experience from './components/Experience';
import Contact from './components/Contact';
import './App.css';

function App() {
  const [view, setView] = useState('portfolio');
  const [musicOpen, setMusicOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = view === 'chat' ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [view]);

  useEffect(() => {
    if (!musicOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setMusicOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [musicOpen]);

  return (
    <div className={`app ${view === 'chat' ? 'is-chat' : ''}`}>
      <TopBar view={view} setView={setView} onMusicClick={() => setMusicOpen(true)} />

      {musicOpen && <ArtistModal onClose={() => setMusicOpen(false)} />}

      {view === 'portfolio' && (
        <>
          <Hero onChatClick={() => setView('chat')} />
          <Projects />
          <Skills />
          <Experience />
          <Contact />
          <footer className="app-footer">
            <span>© paolo sandejas · made by hand & by machine</span>
            <span>printed in glendale, ca · 2026<span className="blink"></span></span>
          </footer>
        </>
      )}

      {view === 'chat' && <ChatInterface />}
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Run dev server and verify full modal flow**

```bash
npm run dev
```

Check the following:
1. ♪ listen button visible in TopBar (pink background, cream text)
2. Clicking ♪ listen opens the modal overlay
3. Modal shows: P/ · ARTIST glyph (pink), stats, genre tag, label, career highlights, press note
4. Modal shows: discography list, Spotify embed (loads), streaming links row, AI callout
5. Clicking the × button closes the modal
6. Clicking the backdrop (outside the modal) closes the modal
7. Pressing Escape closes the modal
8. After closing, scrolling the portfolio page works normally
9. Open modal → switch to Chat view → modal stays closed (it's a separate state, no conflict)
10. On mobile (resize to 375px): modal slides up from bottom, single column layout, Spotify embed visible

- [ ] **Step 3: Final commit**

```bash
git add src/App.jsx
git commit -m "feat: wire ArtistModal into App — music entry point complete"
```

---

## Done

All content updated, music feature live. The ♪ listen pill in the TopBar opens a full artist modal with identity stats, discography, Spotify embed, streaming links, and the Parallel Paths AI callout.
