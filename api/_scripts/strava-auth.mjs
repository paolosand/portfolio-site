#!/usr/bin/env node
/**
 * One-time Strava OAuth helper — exchanges an authorization code for a refresh token.
 *
 * Required env vars (set before running):
 *   STRAVA_CLIENT_ID     — from strava.com/settings/api
 *   STRAVA_CLIENT_SECRET — from strava.com/settings/api
 *   STRAVA_REDIRECT_URI  — must match the URI registered in the app settings
 *                           (e.g. http://localhost:8888/callback)
 *
 * Usage:
 *   1. Run this script: node api/_scripts/strava-auth.mjs
 *   2. Open the printed URL in your browser and log in / grant access.
 *   3. After redirect, copy the `code` query-param value from the URL.
 *   4. Paste it when prompted.
 *   5. The script prints your STRAVA_REFRESH_TOKEN — store it as a Vercel env var.
 */

import { createInterface } from 'node:readline/promises';

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI } = process.env;

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REDIRECT_URI) {
  console.error('Missing env vars: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI');
  process.exit(1);
}

const scope = 'activity:read';
const authUrl =
  'https://www.strava.com/oauth/authorize?' +
  new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: STRAVA_REDIRECT_URI,
    approval_prompt: 'force',
    scope,
  }).toString();

console.log('\nOpen this URL in your browser:\n');
console.log(authUrl);
console.log();

const rl = createInterface({ input: process.stdin, output: process.stdout });
const code = (await rl.question('Paste the "code" param from the redirect URL: ')).trim();
rl.close();

const res = await fetch('https://www.strava.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: STRAVA_REDIRECT_URI,
  }),
});

if (!res.ok) {
  const body = await res.text();
  console.error('Token exchange failed:', res.status, body);
  process.exit(1);
}

const data = await res.json();
console.log('\nSTRAVA_REFRESH_TOKEN=' + data.refresh_token);
console.log('\nAdd this as a Vercel env var (vercel env add STRAVA_REFRESH_TOKEN).');
