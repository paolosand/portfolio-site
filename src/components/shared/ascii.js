// ASCII art constants and utilities for the riso-print portfolio

export const PORTRAIT_ART = [
  { text: `╔═══════════════════════════════╗`, color: null },
  { text: `║  `, color: null, after: { text: `░░▒▒▓▓██  PAOLO  ██▓▓▒▒░░`, color: 'blue' }, end: `  ║` },
  { text: `║                               ║`, color: null },
  { text: `║       `, color: null, after: { text: `╔═══════════════╗`, color: 'pink' }, end: `       ║` },
  { text: `║       `, color: null, after: { text: `║   ┌─┐   ┌─┐   ║`, color: 'pink' }, end: `       ║` },
  { text: `║       `, color: null, after: { text: `║   │o│   │o│   ║`, color: 'pink' }, end: `       ║` },
  { text: `║       `, color: null, after: { text: `║   └─┘   └─┘   ║`, color: 'pink' }, end: `       ║` },
  { text: `║       `, color: null, after: { text: `║       ︶       ║`, color: 'pink' }, end: `       ║` },
  { text: `║       `, color: null, after: { text: `╚═══════════════╝`, color: 'pink' }, end: `       ║` },
  { text: `║                               ║`, color: null },
  { text: `║   `, color: null, after: { text: `> ml engineer · audio + cv`, color: 'mint' }, end: `  ║` },
  { text: `║   `, color: null, after: { text: `> creative tech researcher`, color: 'mint' }, end: `  ║` },
  { text: `║   `, color: null, after: { text: `> built w/ patience + ░░░`, color: 'mint' }, end: `   ║` },
  { text: `╚═══════════════════════════════╝`, color: null },
];

export const PROJECT_ART = {
  chuloopa: `  ┌─[ TRX ]──────────────┐
  │ ●○●○ ●○●○ ●○●○ ●○●○ │
  │ ▁▃▅▇▅▃▁ kick  ▇▅▃▁ │
  │ snare ▃▅▇▅▃ hat ▃▁ │
  └────────────────  120bpm`,
  'video-analysis': `  ┌─[ stream ]───────────┐
  │ ▓▓▓▓░░░░ frame 0421  │
  │  [ obj ] [ obj ]     │
  │   └─tag   └─tag      │
  └─ gemini · concurrent ─┘`,
  'geospatial-ml': `  ┌─[ tile 04 ]──────────┐
  │ ::::::::░░▒▒▓▓██▓▒░  │
  │ ::::░░▒▒██████▒▒░    │
  │ ░░▒▒██  >90% acc.    │
  └──────────────────────┘`,
  hai: `  ┌─[ IMU ]──────────────┐
  │   o─┐                │
  │     │ pitch ▁▃▅▇     │
  │  ─O─┴ yaw   ▇▅▃▁     │
  │     │ roll  ▃▅▃▁     │
  └──── arduino → maxmsp ┘`,
  'ascii-drone': `  ┌─[ HAND ]─────────────┐
  │   .─.     ~~~        │
  │  ( ✋ )   ▁▂▃▅▇~~~~  │
  │   '─'     ~~~        │
  └─ mediapipe → tone.js ┘`,
  'parallel-paths': `  ┌─[ co-write ]─────────┐
  │ human ░░░░ + ai ▓▓▓▓ │
  │  └─ lyric  └─ sound  │
  │   ┌─ ethics check ─┐ │
  └──────────────────────┘`,
};

export const PROP_ART = [
  `██▓▒░ ▁▃▅▇█\nship → scale → serve\n       └─ 12k users`,
  `▢ ▢ ▢ ░░ ▒▒ ▓▓\ntext · audio · vision\n       └─ multi-modal`,
  `▁▂▃▅▇▆▃▂▁\nwearables · music · ai\n       └─ tactile`,
];

export const POSTCARD_ASCII = `▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣
▒ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ▒
▒ ░ ┌─────────────────────────────┐ ▒
▒ ░ │  ✉ from glendale, ca        │ ▒
▒ ░ │     34.146°N · 118.255°W    │ ▒
▒ ░ └─────────────────────────────┘ ▒
▒ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ▒
▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣`;

export const CHAT_PROMPTS = [
  { icon: '▸▸▸', title: 'ML production work', q: 'Tell me about your production ML experience with 12,000+ users.' },
  { icon: '♪♪♪', title: 'Audio + music AI',   q: "What's CHULOOPA, and how does real-time inference work?" },
  { icon: '◆◇◆', title: 'Creative tech',       q: 'Walk me through your wearable instruments and gesture-controlled work.' },
  { icon: '▒▓▒', title: 'How you work',         q: 'What kinds of problems do you most like to solve?' },
];

// Lemon = core languages. Blue = ML/AI domain. Pink = creative/music. Mint = production/infra.
const LANG_TAGS = new Set([
  'python', 'c++', 'c', 'java', 'javascript', 'typescript', 'sql', 'r',
  'html', 'css', 'rust', 'go', 'swift', 'kotlin',
]);
const ML_TAGS = new Set([
  'pytorch', 'tensorflow', 'scikit-learn', 'computer vision', 'audio ml',
  'llms', 'rag', 'multi-modal ai', 'multi-modal', 'cnn', 'transformers',
  'nlp', 'mediapipe', 'gemini api', 'gemini', 'openai api', 'claude api', 'claude code', 'hugging face',
]);
const INFRA_TAGS = new Set([
  'production', 'concurrent', 'real-time', 'low-latency', 'model deployment',
  'evaluation', 'optimization', 'data processing', 'ci/cd', 'docker', 'aws', 'gcp',
]);
const CREATIVE_TAGS = new Set([
  'max/msp', 'chuck', 'p5.js', 'tone.js', 'gsap', 'web audio', 'suno',
  'creative coding', 'creative ai', 'hci', 'wearable', 'arduino', 'ethics',
]);

export function tagClassByName(tag) {
  const lower = tag.toLowerCase();
  if (LANG_TAGS.has(lower)) return 'l';
  if (ML_TAGS.has(lower)) return 'b';
  if (INFRA_TAGS.has(lower)) return 'm';
  if (CREATIVE_TAGS.has(lower)) return 'p';
  return '';
}

