import { useEffect, useState } from 'react';
import { buildTickerLines } from '../components/shared/tickerFallback.js';

export function useTicker() {
  const [feed, setFeed] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    fetch('/api/ticker')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (alive) setFeed(data); })
      .catch(() => { if (alive) setFeed(null); });
    return () => { alive = false; };
  }, []);

  // Keep the status-line clock live — re-render every 30s so the time
  // doesn't freeze at the moment the component first mounted.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return { lines: buildTickerLines(feed, now) };
}
