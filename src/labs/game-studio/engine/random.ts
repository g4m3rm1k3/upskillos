// Seeded random numbers: math.rng(seed). The same seed always gives the same numbers, so loot, maps and tests can be
// repeated exactly; Math.random() gives different ones every run.
//
// The generator is mulberry32: a 32-bit state, moved on by a fixed odd number each call, then mixed by multiplying and
// shifting so neighbouring states give unrelated outputs. Small, fast, and good enough for games (not for secrets).

/** A random-number generator with its own state, made by math.rng(seed). */
export interface Random {
  /** A number from 0 up to (not including) 1. */
  next(): number;
  /** A number from lo up to (not including) hi. */
  range(lo: number, hi: number): number;
  /** A whole number from lo to hi, both included. */
  int(lo: number, hi: number): number;
  /** True with probability p (0 to 1). */
  chance(p: number): boolean;
  /** One item of a list, each equally likely. */
  pick<T>(items: T[]): T;
  /** One item, each as likely as its weight: weighted([['common', 70], ['rare', 25], ['legendary', 5]]). */
  weighted<T>(table: [T, number][]): T;
  /** A new list: the items in a random order (Fisher–Yates). */
  shuffle<T>(items: T[]): T[];
  /** The generator's state now: rng(state) carries on from here (save it to continue a run). */
  readonly state: number;
}

export function rng(seed: number = 1): Random {
  if (!Number.isFinite(seed)) throw new Error(`math.rng needs a number seed (got ${JSON.stringify(seed)})`);
  let s = Math.floor(seed) >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const r: Random = {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => { if (hi < lo) throw new Error(`int(${lo}, ${hi}): hi is below lo`); return Math.floor(lo + next() * (Math.floor(hi) - Math.ceil(lo) + 1)); },
    chance: (p) => next() < p,
    pick: (items) => { if (!items.length) throw new Error('pick() needs a list with something in it'); return items[Math.floor(next() * items.length)]; },
    weighted: (table) => {
      const total = table.reduce((t, [, w]) => t + Math.max(0, w), 0);
      if (!(total > 0)) throw new Error('weighted() needs at least one item with a weight above 0: [[item, weight], …]');
      let roll = next() * total;
      for (const [item, w] of table) { roll -= Math.max(0, w); if (roll < 0) return item; }
      return table[table.length - 1][0];
    },
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
      return out;
    },
    get state() { return s; },
  };
  return r;
}
