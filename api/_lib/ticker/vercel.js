const API = 'https://api.vercel.com/v6/deployments?limit=1&state=READY&target=production';

function relTime(ms) {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

async function latest(fetchImpl) {
  if (!process.env.VERCEL_TOKEN) return null;
  const project = process.env.VERCEL_PROJECT_ID ? `&projectId=${process.env.VERCEL_PROJECT_ID}` : '';
  const res = await fetchImpl(`${API}${project}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
  });
  if (!res.ok) {
    console.warn(`[ticker/vercel] ${res.status}`);
    return null;
  }
  const body = await res.json();
  return body?.deployments?.[0] ?? null;
}

export async function head(fetchImpl = fetch) {
  try {
    return (await latest(fetchImpl))?.uid ?? null;
  } catch (err) {
    console.warn('[ticker/vercel] head failed', err);
    return null;
  }
}

export async function fetchLines(now = Date.now(), fetchImpl = fetch) {
  try {
    const dep = await latest(fetchImpl);
    if (!dep?.ready) return [];
    return [{ id: 'vercel:last', label: 'last shipped', text: relTime(now - dep.ready), source: 'vercel' }];
  } catch (err) {
    console.warn('[ticker/vercel] fetchLines failed', err);
    return [];
  }
}
