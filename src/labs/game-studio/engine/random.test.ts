// Seeded random numbers (engine/random.ts): repeatable, fair, and clear about mistakes.
import { describe, expect, it } from 'vitest';
import { rng } from './random';

describe('math.rng', () => {
  it('the same seed gives the same numbers; another seed, others; state carries on', () => {
    const a = rng(42), b = rng(42), c = rng(43);
    const xs = [a.next(), a.next(), a.next()];
    expect([b.next(), b.next(), b.next()]).toEqual(xs);
    expect(c.next()).not.toBe(xs[0]);
    const d = rng(7); d.next(); const e = rng(d.state);
    expect(e.next()).toBe(d.next());
  });

  it('is fair: 60,000 rolls of a die land about 10,000 on each face, all six reached, none outside', () => {
    const r = rng(1), counts = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60000; i++) counts[r.int(1, 6)]++;
    expect(counts[0]).toBe(0); expect(counts[7]).toBe(0);
    for (let f = 1; f <= 6; f++) expect(Math.abs(counts[f] - 10000)).toBeLessThan(400);
  });

  it('weighted() picks in proportion to the weights', () => {
    const r = rng(3), got: Record<string, number> = { common: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < 20000; i++) got[r.weighted([['common', 70], ['rare', 25], ['legendary', 5]])]++;
    expect(got.common / 20000).toBeCloseTo(0.7, 1);
    expect(got.rare / 20000).toBeCloseTo(0.25, 1);
    expect(got.legendary / 20000).toBeGreaterThan(0.03);
    expect(got.legendary / 20000).toBeLessThan(0.07);
  });

  it('shuffle() returns a new list with the same items; pick, chance and range stay in bounds', () => {
    const r = rng(9), list = [1, 2, 3, 4, 5];
    const s = r.shuffle(list);
    expect([...s].sort()).toEqual(list); expect(list).toEqual([1, 2, 3, 4, 5]);
    for (let i = 0; i < 1000; i++) { expect(list).toContain(r.pick(list)); const x = r.range(2, 3); expect(x >= 2 && x < 3).toBe(true); }
    expect([...Array(1000)].filter(() => r.chance(0)).length).toBe(0);
    expect([...Array(1000)].filter(() => r.chance(1)).length).toBe(1000);
  });

  it('says what is wrong', () => {
    expect(() => rng(NaN)).toThrow(/needs a number seed/);
    expect(() => rng(1).pick([])).toThrow(/something in it/);
    expect(() => rng(1).weighted([['a', 0]])).toThrow(/weight above 0/);
    expect(() => rng(1).int(5, 2)).toThrow(/hi is below lo/);
  });
});
