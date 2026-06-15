// Pure reveal math for the chat typewriter. Kept framework-free so it can be
// unit-tested with node:test (see typewriter.test.js).

// Characters revealed per tick and the tick interval. Tuned for a quick,
// teletype cadence that suits the monospace register without dragging on long
// replies — fast enough to feel responsive, smooth enough to read.
export const STEP = 3;
export const TICK_MS = 12;

// Given the current revealed count and the full target length, return the count
// for the next tick. Advances by `step`, clamps to the target, and restarts from
// zero if the target shrank (the active message was replaced — e.g. on retry).
export function nextRevealCount(prevCount, targetLen, step = STEP) {
  if (prevCount > targetLen) return 0;
  return Math.min(prevCount + step, targetLen);
}
