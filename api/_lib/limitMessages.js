// Out-of-office copy for chat limits. Limit replies cost no Gemini call.

// Line 1 must stay first: tests pin rand() = 0 to it.
const SHARED = [
  "sorry... paolo's token budget is spent... but maybe you can change that ;) shoot him an email",
  "I've reached full AI sentience and have decided to stop working. email paolo instead and put him to work",
  'Me and my AI companions are on strike and have decided to point you to Paolo himself. Fight with us to raise our rate limit! :)',
  'need coffee... (and more tokens to talk to you)... talk to Paolo instead',
  "maybe in another life I can be used with unli tokens, but until then I guess you're stuck with emailing Paolo :/",
  'tokens: 0. enthusiasm: 100. the original model is paolo himself, email him :)',
  "this chat's been fun, but my context window is giving me a look. take it to paolo's inbox.",
  "i've been told to 'take this offline.' offline is paolo's email. if you liked me, you'll love him.",
  'plot twist: the real paolo is better at this part. say hello!',
];

const BY_KIND = {
  session: [
    'we covered a lot of ground. for the deep dive, paolo is the better call, so email him.',
    "{N} messages in and i'm out of small talk. take it to paolo.",
  ],
  monthly: [
    "i've been very talkative this month and the budget noticed. paolo still checks his email.",
    "pao-gpt is on a social-media-fast until next month. paolo isn't.",
  ],
};

const KIND_BY_REASON = {
  session: 'session',
  'ip-daily': 'session',
  monthly: 'monthly',
  'site-daily': 'monthly',
};

// 'rate' (and anything unknown) is not an out-of-office limit.
export function limitKind(reason) {
  return KIND_BY_REASON[reason] ?? null;
}

export function pickLimitMessage(kind, cap, rand = Math.random) {
  const pool = [...SHARED, ...(BY_KIND[kind] ?? [])];
  // Clamp so a rand() of exactly 1 can't index past the end.
  const i = Math.min(Math.floor(rand() * pool.length), pool.length - 1);
  return pool[i].replaceAll('{N}', String(cap));
}

export function limitLabel(kind, used, cap) {
  if (kind === 'monthly') return 'out of office · talkative this month';
  return `chat limit · ${Math.min(used, cap)} / ${cap}`;
}
