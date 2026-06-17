const TOKEN_URL = 'https://www.strava.com/oauth/token';
const ACT_URL = 'https://www.strava.com/api/v3/athlete/activities?per_page=1';

async function accessToken(fetchImpl) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) return null;
  return (await res.json()).access_token;
}

async function latestActivity(fetchImpl) {
  const token = await accessToken(fetchImpl);
  if (!token) return null;
  const res = await fetchImpl(ACT_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return (await res.json())?.[0] ?? null;
}

export async function head(fetchImpl = fetch) {
  try { const a = await latestActivity(fetchImpl); return a ? String(a.id) : null; }
  catch (err) { console.warn('[ticker/strava] head failed', err); return null; }
}

export async function fetchLines(fetchImpl = fetch) {
  try {
    const a = await latestActivity(fetchImpl);
    if (!a) return [];
    const km = (a.distance / 1000).toFixed(1);
    const verb = a.type === 'Run' ? 'ran' : 'logged';
    return [{ id: 'strava:last', label: verb, text: `${km}k · ${a.name}`.toLowerCase(), source: 'strava' }];
  } catch (err) {
    console.warn('[ticker/strava] fetchLines failed', err);
    return [];
  }
}
