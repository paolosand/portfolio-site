import { GITHUB_USERNAME } from './constants.js';

const API = `https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=30`;

async function getEvents(fetchImpl) {
  const headers = { 'User-Agent': 'pao-portfolio-ticker', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetchImpl(API, { headers });
  if (!res.ok) {
    console.warn(`[ticker/github] ${res.status}`);
    return null;
  }
  return res.json();
}

export async function head(fetchImpl = fetch) {
  try {
    const events = await getEvents(fetchImpl);
    return events?.[0]?.id ?? null;
  } catch (err) {
    console.warn('[ticker/github] head failed', err);
    return null;
  }
}

export async function fetchCommitGroups(fetchImpl = fetch) {
  try {
    const events = await getEvents(fetchImpl);
    if (!events) return [];
    const byRepo = new Map();
    for (const e of events) {
      if (e.type !== 'PushEvent') continue;
      const repo = (e.repo?.name ?? '').split('/').pop();
      if (!repo) continue;
      const msgs = (e.payload?.commits ?? []).map(c => c.message).filter(Boolean);
      if (!msgs.length) continue;
      if (!byRepo.has(repo)) byRepo.set(repo, []);
      byRepo.get(repo).push(...msgs);
    }
    return [...byRepo.entries()].map(([repo, commits]) => ({ repo, commits }));
  } catch (err) {
    console.warn('[ticker/github] fetchCommitGroups failed', err);
    return [];
  }
}
