const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const RECENT_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

async function accessToken(fetchImpl) {
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: process.env.SPOTIFY_REFRESH_TOKEN }),
  });
  if (!res.ok) return null;
  return (await res.json()).access_token;
}

async function latestTrack(fetchImpl) {
  const token = await accessToken(fetchImpl);
  if (!token) return null;
  const res = await fetchImpl(RECENT_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return (await res.json())?.items?.[0]?.track ?? null;
}

export async function head(fetchImpl = fetch) {
  try { return (await latestTrack(fetchImpl))?.id ?? null; }
  catch (err) { console.warn('[ticker/spotify] head failed', err); return null; }
}

export async function fetchLines(fetchImpl = fetch) {
  try {
    const track = await latestTrack(fetchImpl);
    if (!track) return [];
    const text = `${track.name} — ${track.artists?.[0]?.name ?? ''}`.toLowerCase().trim();
    return [{ id: 'spotify:now', label: 'now playing', text, source: 'spotify' }];
  } catch (err) {
    console.warn('[ticker/spotify] fetchLines failed', err);
    return [];
  }
}
