// Deterministic pseudo-random generator so mock data is stable
// across server restarts and requests (no external deps needed).
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRange(rand: () => number, min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function seededFloat(rand: () => number, min: number, max: number, decimals = 2) {
  const v = rand() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

export function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
