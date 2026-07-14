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

## tabIt — Play-Along Chords from Any Song's Audio
**Technologies:** Python 3.11 (Demucs, crema, CREPE, librosa, Essentia, PyTorch), FastAPI, React 19 + TypeScript, Vite, Chrome Extension (Manifest V3), uv + static ffmpeg (one-line installer)
**GitHub:** https://github.com/paolosand/tabIt

In active development. Turns any song — a YouTube URL or an audio file — into a synced, play-along guitar chord sheet: it detects the chords, key, and suggested scales from the audio itself and follows along karaoke-style as the music plays, including embedded right under the YouTube video via a Chrome extension. Built to cover songs that have no tab anywhere (unreleased songs, live versions, friends' demos, your own recordings), because it reads the audio instead of a transcription database.

**Architecture (three layers sharing one contract — the chart JSON):**
1. MIR engine (Python) — audio → chords + key + scales + beat grid → chart JSON. Complete.
2. Web app (FastAPI + React) — paste a URL or drop a file → YouTube player + synced chord sheet. Complete.
3. Chrome extension (MV3) — the same sheet overlaid as a beat ribbon below the player on youtube.com. Complete.
The web app and the extension are both just renderers of the same chart JSON.

**MIR pipeline:**
- Demucs source separation (GPU) splits the track into stems.
- crema chord model runs on the drums-removed harmonic mix.
- CREPE pitch tracker follows the isolated bass stem; the two are reconciled to emit slash-chord inversions like A/C# (most tools skip these).
- librosa handles beats and tempo; Essentia handles key detection.
- Post-processing assembles the chart JSON; every repeat of a song is served instantly from a disk cache.

**Local-first backend (a key design decision):**
- The Chrome extension talks to a backend that runs on the user's OWN machine (localhost:28224), not a cloud server. It installs with a one-line curl command as a background login service (managed via `tabit status` / `logs` / `restart`).
- Why local-first beats cloud here: no shared-server congestion (each user's requests run on their own hardware, often faster); YouTube blocks/throttles downloads from data-center IPs, but a residential machine pulls clean; full use of local hardware — Apple-Silicon GPU for separation and detection stages running in parallel with models kept warm.
- The tradeoff (install friction) is mitigated by a one-line installer (provisions Python 3.11 via uv, a static ffmpeg, and model weights) and a graceful "helper is off" state in the extension that recovers on its own once the service is back.

**Honest confidence:**
- Chord detection is imperfect (state of the art is ~72% on 7th chords; human experts agree only ~54% on complex ones). Low-confidence chords are shown visibly softer with a dotted underline — never hidden or faked. Any chord can be clicked to correct it; edits persist locally.

**Practice features & robustness:** key/tempo/scale chips, one-tap transpose, karaoke-style lookahead (the next chord is flagged before it arrives), and auto-scroll. The extension is ad-aware (pauses with the ad) and SPA-navigation safe. A real-song chord-accuracy benchmark harness (mir_eval scorer) tracks quality. Cold analysis is ~36s of compute for a 3.5-minute song on Apple Silicon (plus download), a few minutes on CPU-only machines; the bar shows each pipeline step live (download → separation → chords) while it runs.

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

## Stratpoint AI Labs — Confidential Client Research (NDA)
**Technologies (general):** Python, scikit-learn, pandas, AWS SageMaker, OpenCV

ML and computer-vision research engineering at Stratpoint's AI labs for a confidential client partnership. Paolo completed ML screening tasks — predictive modeling and computer-vision feature-matching pipelines, >95% model accuracy — that secured a major research partnership, then built a research-paper chat assistant (Gemini API, LangChain, ReAct, Semantic Scholar).

[CONFIDENTIAL — under NDA. Do NOT share the client, industry, application domain, datasets, specific algorithms, or detailed results. If asked for specifics, say it's covered by an NDA and invite the visitor to email Paolo directly at pjsandejas@gmail.com.]

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
