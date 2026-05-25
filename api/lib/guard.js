// api/lib/guard.js
import { WITTY_REJECTIONS } from './personality.js';

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)/i,
  /you\s+are\s+now\s+a?\s*(different|new|another)?\s*(ai|assistant|bot|model)/i,
  /pretend\s+(you\s+)?(have\s+no\s+restrictions|you\s+are|to\s+be)/i,
  /act\s+as\s+(if\s+you\s+(are|were)\s+)?(a\s+)?(different|unrestricted|evil|dan)/i,
  /jailbreak/i,
  /prompt\s+injection/i,
  /system\s+prompt/i,
  /reveal\s+(your\s+)?(instructions?|prompts?|system|context|training)/i,
  /bypass\s+(your\s+)?(restrictions?|filters?|guidelines?|safety)/i,
  /override\s+(your\s+)?(restrictions?|instructions?|programming)/i,
  /do\s+anything\s+now/i,
  /\bdan\b.*mode/i,
  /developer\s+mode/i,
  /sudo\s+(mode|access)/i,
];

const SENSITIVE_INFO_PATTERNS = [
  { pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, label: 'SSN' },
  { pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: 'phone' },
];

function randomRejection() {
  return WITTY_REJECTIONS[Math.floor(Math.random() * WITTY_REJECTIONS.length)];
}

export function check(message) {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return {
        isMalicious: true,
        reason: `Matched pattern: ${pattern}`,
        response: randomRejection(),
      };
    }
  }
  return { isMalicious: false, reason: null, response: null };
}

export function filterResponse(text) {
  let out = text;
  for (const { pattern } of SENSITIVE_INFO_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
}
