// Pure hash <-> work-id mapping for deep-linkable case studies.
// Kept free of DOM/React so it can be unit tested under node --test.

const WORK_HASH_RE = /^#\/work\/([a-z0-9-]+)$/;

export function parseWorkHash(hash, registry) {
  const m = WORK_HASH_RE.exec(hash || '');
  if (!m) return null;
  return Object.hasOwn(registry, m[1]) ? m[1] : null;
}

export function workHashFor(id) {
  return `#/work/${id}`;
}

export function isWorkHashShaped(hash) {
  return (hash || '').startsWith('#/work/');
}
