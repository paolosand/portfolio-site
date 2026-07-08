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
  return { id: 'time', label: 'glendale', text: `${t} · ${status}`, source: 'time' };
}

export function buildTickerLines(feed, date) {
  const lines = feed?.lines?.length ? feed.lines : TICKER_FALLBACK;
  return [formatStatusLine(date), ...lines];
}
