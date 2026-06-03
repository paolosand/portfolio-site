const GITHUB_RAW = 'https://raw.githubusercontent.com';

export async function fetchFile(owner, repo, path, token) {
  const url = `${GITHUB_RAW}/${owner}/${repo}/main/${path}`;
  const headers = { 'User-Agent': 'pao-gpt-ingest' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.warn(`[github] ${res.status} fetching ${owner}/${repo}/${path}`);
    return null;
  }
  return res.text();
}
