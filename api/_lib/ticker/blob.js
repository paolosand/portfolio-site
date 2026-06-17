import { put, list } from '@vercel/blob';
import { BLOB_PATHNAME } from './constants.js';

export async function readFeed() {
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    const url = blobs?.[0]?.url;
    if (!url) return null;
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn('[ticker/blob] readFeed failed', err);
    return null;
  }
}

export async function writeFeed(feed) {
  await put(BLOB_PATHNAME, JSON.stringify(feed), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
