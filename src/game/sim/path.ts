import type { Key } from "./types";

/** Smooth path through the keys (cubic Hermite with averaged slopes); holds still at both ends. */
export function samplePath(keys: Key[], time: number): [number, number] {
  if (time <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (time > b[0]) continue;
    const span = b[0] - a[0];
    const t = (time - a[0]) / span;
    const t2 = t * t, t3 = t2 * t;
    const axis = (k: 1 | 2) => {
      const before = slope(keys, i, k) * span, after = slope(keys, i + 1, k) * span;
      return (2 * t3 - 3 * t2 + 1) * a[k] + (t3 - 2 * t2 + t) * before + (3 * t2 - 2 * t3) * b[k] + (t3 - t2) * after;
    };
    return [axis(1), axis(2)];
  }
  const last = keys[keys.length - 1];
  return [last[1], last[2]];
}

function slope(keys: Key[], i: number, k: 1 | 2) {
  if (i === 0 || i === keys.length - 1) return 0;
  const before = keys[i - 1], here = keys[i], after = keys[i + 1];
  const left = (here[k] - before[k]) / (here[0] - before[0]), right = (after[k] - here[k]) / (after[0] - here[0]);
  return left * right <= 0 ? 0 : (left + right) / 2;
}

/** In from the top, waiting at a spot, then away upwards or sideways. */
export function hover(x: number, y: number, stay = 6, leave: [number, number] = [0, 5]): Key[] {
  return [[0, x, 10.5], [1.4, x, y], [1.4 + stay, x, y - 0.4], [3.2 + stay, x + leave[0], y + leave[1]]];
}

/** Straight across the field with a gentle wave. */
export function cross(y: number, seconds = 7, wave = 0.8): Key[] {
  return [[0, -8, y], [seconds * 0.25, -3.5, y + wave], [seconds * 0.5, 0, y - wave], [seconds * 0.75, 3.5, y + wave], [seconds, 8, y]];
}

/** Sinks with the scenery from top to bottom. */
export function sink(x: number, seconds = 12): Key[] {
  return [[0, x, 10.5], [seconds * 0.5, x * 0.9, 2], [seconds, x, -10]];
}

/** A swoop from a top corner down and out of the other side. */
export function swoop(seconds = 5, low = 1): Key[] {
  return [[0, -7, 9.5], [seconds * 0.35, -3.2, low + 2], [seconds * 0.55, 0, low], [seconds * 0.75, 3.2, low + 2], [seconds, 7.5, 9.5]];
}
