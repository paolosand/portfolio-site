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

export function tagClass(i) {
  const r = i % 5;
  if (r === 0) return '';
  if (r === 1) return 'b';
  if (r === 2) return 'l';
  if (r === 3) return 'm';
  return 'p';
}
