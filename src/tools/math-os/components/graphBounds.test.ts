import { expect, it } from 'vitest';
import { graphTicks, validGraphBounds } from './graphBounds';

it('creates finite grid ticks inside the requested range', () => {
  expect(graphTicks(-10, 10)).toEqual([-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10]);
});

it('rejects empty, reversed, non-finite and overflowing ranges', () => {
  for (const [min, max] of [[1, 1], [2, 1], [NaN, 1], [0, Infinity], [-Number.MAX_VALUE, Number.MAX_VALUE]]) {
    expect(validGraphBounds(min, max)).toBe(false);
    expect(graphTicks(min, max)).toEqual([]);
  }
});

it('bounds grid work when floating-point addition cannot advance by the tick step', () => {
  const ticks = graphTicks(1e16, 1e16 + 2);
  expect(ticks.length).toBeLessThanOrEqual(12);
  expect(ticks.every(value => Number.isFinite(value) && value >= 1e16 && value <= 1e16 + 2)).toBe(true);
});
