#!/usr/bin/env node
/**
 * One-time Spotify OAuth helper — exchanges an authorization code for a refresh token.
 *
 * Required env vars (set before running):
 *   SPOTIFY_CLIENT_ID     — from developer.spotify.com dashboard
 *   SPOTIFY_CLIENT_SECRET — from developer.spotify.com dashboard
 *   SPOTIFY_REDIRECT_URI  — must match the URI registered in the dashboard
 *                           (e.g. http://localhost:8888/callback)
 *
 * Usage:
 *   1. Run this script: node api/_scripts/spotify-auth.mjs
 *   2. Open the printed URL in your browser and log in / grant access.
 *   3. After redirect, copy the `code` query-param value from the URL.
 *   4. Paste it when prompted.
 *   5. The script prints your SPOTIFY_REFRESH_TOKEN — store it as a Vercel env var.
 */

import { createInterface } from 'node:readline/promises';

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } = process.env;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
  console.error('Missing env vars: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI');
  process.exit(1);
}

const scope = 'user-read-recently-played';
const authUrl =
  'https://accounts.spotify.com/authorize?' +
  new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope,
  }).toString();

console.log('\nOpen this URL in your browser:\n');
console.log(authUrl);
console.log();

const rl = createInterface({ input: process.stdin, output: process.stdout });
const code = (await rl.question('Paste the "code" param from the redirect URL: ')).trim();
rl.close();

const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
const res = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  }),
});

if (!res.ok) {
  const body = await res.text();
  console.error('Token exchange failed:', res.status, body);
  process.exit(1);
}

const data = await res.json();
console.log('\nSPOTIFY_REFRESH_TOKEN=' + data.refresh_token);
console.log('\nAdd this as a Vercel env var (vercel env add SPOTIFY_REFRESH_TOKEN).');
