import { SPOTIFY_PLAYLIST_ID } from './constants.js';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const PLAYLIST_URL = `https://api.spotify.com/v1/playlists/${SPOTIFY_PLAYLIST_ID}`;

// Client-credentials flow: reads a public playlist, no user OAuth needed.
async function accessToken(fetchImpl) {
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  if (!res.ok) return null;
  return (await res.json()).access_token;
}

async function getJson(fetchImpl, url, token) {
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    console.warn(`[ticker/spotify] ${res.status} ${url}`);
    return null;
  }
  return res.json();
}

// Snapshot bucketed by UTC day: the pick rotates daily and whenever the
// playlist itself changes, without churning the feed every rebuild.
export async function head(fetchImpl = fetch) {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return null;
  try {
    const token = await accessToken(fetchImpl);
    if (!token) return null;
    const meta = await getJson(fetchImpl, `${PLAYLIST_URL}?fields=snapshot_id`, token);
    if (!meta?.snapshot_id) return null;
    return `${meta.snapshot_id}:${new Date().toISOString().slice(0, 10)}`;
  } catch (err) {
    console.warn('[ticker/spotify] head failed', err);
    return null;
  }
}

export async function fetchLines(fetchImpl = fetch) {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return [];
  try {
    const token = await accessToken(fetchImpl);
    if (!token) return [];
    const page = await getJson(
      fetchImpl,
      `${PLAYLIST_URL}/tracks?fields=items(track(name,artists(name)))&limit=100`,
      token
    );
    const tracks = (page?.items ?? []).map(i => i.track).filter(Boolean);
    if (!tracks.length) return [];
    const pick = tracks[Math.floor(Math.random() * tracks.length)];
    const text = `${pick.name} — ${pick.artists?.[0]?.name ?? ''}`.toLowerCase().trim();
    return [{ id: 'spotify:pick', label: 'listening', text, source: 'spotify' }];
  } catch (err) {
    console.warn('[ticker/spotify] fetchLines failed', err);
    return [];
  }
}
