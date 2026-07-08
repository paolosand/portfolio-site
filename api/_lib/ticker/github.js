import { GITHUB_USERNAME } from './constants.js';

const API = `https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=30`;
const MAX_COMPARES = 10;

function authHeaders() {
  const headers = { 'User-Agent': 'pao-portfolio-ticker', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function getEvents(fetchImpl) {
  const res = await fetchImpl(API, { headers: authHeaders() });
  if (!res.ok) {
    console.warn(`[ticker/github] ${res.status}`);
    return null;
  }
  return res.json();
}

// PushEvent payloads no longer carry commit messages — only {ref, head, before}.
// The compare API returns exactly the commits of that push.
async function getPushedMessages(fetchImpl, repoFullName, before, head) {
  try {
    const res = await fetchImpl(
      `https://api.github.com/repos/${repoFullName}/compare/${before}...${head}`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      console.warn(`[ticker/github] compare ${repoFullName} ${res.status}`);
      return [];
    }
    const diff = await res.json();
    return (diff.commits ?? []).map(c => c.commit?.message).filter(Boolean);
  } catch (err) {
    console.warn('[ticker/github] compare failed', err);
    return [];
  }
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
    const pushes = events
      .filter(e => e.type === 'PushEvent' && e.repo?.name && e.payload?.before && e.payload?.head)
      .slice(0, MAX_COMPARES);
    const byRepo = new Map();
    for (const e of pushes) {
      const repo = e.repo.name.split('/').pop();
      const msgs = await getPushedMessages(fetchImpl, e.repo.name, e.payload.before, e.payload.head);
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
