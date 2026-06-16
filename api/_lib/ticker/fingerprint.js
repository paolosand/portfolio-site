export function build(heads) {
  return { ...heads };
}

export function diff(prev, next) {
  const changed = Object.keys(next).filter(k => !prev || prev[k] !== next[k]);
  return { changed, anyChanged: changed.length > 0 };
}
