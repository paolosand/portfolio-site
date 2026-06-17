import { useEffect, useState } from 'react';
import { buildTickerLines } from '../components/shared/tickerFallback.js';

export function useTicker() {
  const [feed, setFeed] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/ticker')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (alive) setFeed(data); })
      .catch(() => { if (alive) setFeed(null); });
    return () => { alive = false; };
  }, []);

  return { lines: buildTickerLines(feed, new Date()) };
}
