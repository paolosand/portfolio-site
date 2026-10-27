const INPUT_NOTES = {
  session: "chat's full — email paolo to keep going",
  monthly: 'pao-gpt is resting until next month',
};

// The chat is "limited" only while the limit reply is the last message: once the
// user sends something else the conversation has moved on. Tolerant of malformed
// `limit` values (the server's kind may be missing/unknown): any kind other than
// 'monthly' gets the session note, and a bad shape is treated as no limit.
export function getLimitState(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant') return null;
  const limit = last.limit;
  if (!limit || typeof limit !== 'object' || Array.isArray(limit)) return null;
  const kind = limit.kind === 'monthly' ? 'monthly' : 'session';
  const label = typeof limit.label === 'string' ? limit.label : '';
  return { kind, label, inputNote: INPUT_NOTES[kind] };
}
