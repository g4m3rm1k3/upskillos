// Seeded randomness for the chance moments: the same seed always gives the same tosses and throws,
// so an experiment replays the same way in tests and screenshots.
export function random(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A die throw, 1 to 6.
export const die = next => 1 + Math.floor(next() * 6)

// Every throw of two dice told apart (first, second): 36 of them.
export const PAIRS = Array.from({ length: 36 }, (_, i) => [1 + Math.floor(i / 6), 1 + (i % 6)])
