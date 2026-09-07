// Pure "is the scroll parked at the bottom?" test for the chat stick-to-bottom
// behaviour. Framework-free so it can be unit-tested with node:test
// (see stickToBottom.test.js).

// How many pixels of slack still count as "at the bottom". Needs to be a few
// pixels, not zero: browsers routinely leave a sub-pixel residual after
// `scrollTop = scrollHeight`, and we don't want a 1px gap to read as "the user
// scrolled up".
export const BOTTOM_THRESHOLD_PX = 32;

// `target` is anything exposing scrollTop/scrollHeight/clientHeight — a plain
// object in tests, a DOM element in the hook. Returns true when the viewport is
// within `threshold` px of the bottom (or there's nothing to scroll).
export function isAtBottom(target, threshold = BOTTOM_THRESHOLD_PX) {
  const { scrollTop, scrollHeight, clientHeight } = target;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  return distanceFromBottom <= threshold;
}
