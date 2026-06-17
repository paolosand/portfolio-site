import { GoogleGenAI } from '@google/genai';
import { waitUntil } from '@vercel/functions';
import * as blobStore from './_lib/ticker/blob.js';
import { buildFeed } from './_lib/ticker/build-feed.js';
import { TTL_MS } from './_lib/ticker/constants.js';

export async function resolveTicker({ now, blob }) {
  const cached = await blob.readFeed();
  if (!cached) return { body: { lines: [] }, rebuild: true };

  const stale = now > Date.parse(cached.nextRefreshAt);
  if (stale) {
    // Claim the refresh slot so concurrent visitors don't all rebuild.
    await blob.writeFeed({ ...cached, nextRefreshAt: new Date(now + TTL_MS).toISOString() });
  }
  return { body: { lines: cached.lines, generatedAt: cached.generatedAt }, rebuild: stale };
}

async function rebuild(now) {
  try {
    const cached = await blobStore.readFeed();
    const client = process.env.GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY }) : null;
    const { changed, feed } = await buildFeed({ cached, now, client });
    if (changed) await blobStore.writeFeed(feed);
  } catch (err) {
    console.error('[ticker] rebuild failed', err);
  }
}

export default async function handler(req, res) {
  // Optional daily safety-floor cron (Hobby allows once/day).
  if (req.query?.cron === '1') {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    await rebuild(Date.now());
    res.status(200).json({ ok: true });
    return;
  }

  const now = Date.now();
  const { body, rebuild: needsRebuild } = await resolveTicker({ now, blob: blobStore });
  if (needsRebuild) waitUntil(rebuild(now));

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).json(body);
}
