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
