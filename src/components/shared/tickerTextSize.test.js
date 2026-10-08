import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// iOS Safari "text autosizing" inflates some ticker items (the long live-feed
// lines) above the authored 12px while leaving short ones alone, so the strip
// renders with mixed sizes once /api/ticker resolves. The ticker must opt out.
const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

function ruleBody(selector) {
  const re = new RegExp(`(^|\\n)${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`);
  const m = css.match(re);
  assert.ok(m, `missing rule for ${selector}`);
  return m[2];
}

test('ticker opts out of iOS text autosizing', () => {
  const body = ruleBody('.ticker');
  assert.match(body, /-webkit-text-size-adjust:\s*100%/);
  assert.match(body, /(^|[^-])text-size-adjust:\s*100%/);
});
