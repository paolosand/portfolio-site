export const TICKER_FALLBACK = [
  { id: 'fb:playing', label: 'now playing', text: 'transformer experiments', source: 'fallback' },
  { id: 'fb:shipping', label: 'shipping', text: 'multi-modal video pipelines', source: 'fallback' },
  { id: 'fb:reading', label: 'reading', text: '"ikigai: the japanese secret to a long and happy life"', source: 'fallback' },
  { id: 'fb:listening', label: 'listening', text: 'alva noto · oneohtrix · sade', source: 'fallback' },
  { id: 'fb:building', label: 'building', text: 'real-time drum machine in pytorch', source: 'fallback' },
];

export function formatStatusLine(date) {
  const t = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date).toLowerCase().replace(/\s/g, '');
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false,
  }).format(date));
  const status = hour < 5 ? 'probably still up' : hour < 12 ? 'caffeinating' : hour < 18 ? 'heads down' : 'shipping';
  return { id: 'time', label: 'los angeles', text: `${t} · ${status}`, source: 'time' };
}

export function buildTickerLines(feed, date) {
  const lines = feed?.lines?.length ? feed.lines : TICKER_FALLBACK;
  return [formatStatusLine(date), ...lines];
}

// Constant scroll speed: the loop duration follows the strip's width, so a
// longer live feed scrolls at the same pace as the short fallback.
export const TICKER_SPEED_PX_PER_SEC = 50;
const MIN_DURATION_SEC = 10;

export function tickerDurationSeconds(loopWidthPx) {
  const sec = loopWidthPx / TICKER_SPEED_PX_PER_SEC;
  return Number.isFinite(sec) && sec > MIN_DURATION_SEC ? sec : MIN_DURATION_SEC;
}

// Changes only when live lines replace the fallback, so the marquee restarts
// once on that swap and not on every clock tick.
export function tickerFeedKey(feed) {
  return feed?.lines?.length ? 'live' : 'fallback';
}
