// Lesson 9.8, "Beyond tables": every notebook cell prints what the prose says, and the challenge checks itself.
import { describe, expect, it } from 'vitest';
import lesson from './9-game-ai-that-learns/008-beyond-tables.js';

const cells = lesson.intuition.visualizations.find((v) => v.id === 'JSNotebook').props.lesson.cells;
const run = (code) => { const out = []; new Function('console', code)({ log: (...a) => out.push(a.join(' ')) }); return out; };
const squash = (l) => l.replace(/\s+/g, ' ');

describe('lesson 9.8: beyond tables', () => {
  it('tables against tiles, one update spread, a step by hand, replay', () => {
    expect(run(cells[0].startCode).map(squash)).toEqual(['table, 39 values: 0.62, 0.91, 0.97', 'tiles alone, 24 weights: 0.21, 0.41, 0.40', 'tiles + side, 47 weights: 0.90, 1.00, 1.00']);
    expect(run(cells[1].startCode).map(squash)).toEqual([
      'table: -1: 0 0: 0 1: 0 2: 0 3: 0 4: 0 5: 0.3 6: 0 7: 0 8: 0 9: 0',
      'tiles: -1: 0 0: 0 1: 0.06 2: 0.12 3: 0.18 4: 0.24 5: 0.3 6: 0.24 7: 0.18 8: 0.12 9: 0.06',
    ]);
    expect(run(cells[2].startCode)).toEqual(['Q(s, right) = w · x = 0.4, δ = 1.14, new w = [0.314, 0.5, 0.014, 0.4, 0.414]', 'new Q(s, right) = 0.742']);
    expect(run(cells[3].startCode).map(squash)).toEqual(['no replay : catches after 30, 100, 300 episodes: 0.62, 0.79, 1.00', 'replay, 4 extra updates a step: catches after 30, 100, 300 episodes: 0.91, 0.91, 1.00']);
  }, 60000);

  it('the challenge checks itself', () => {
    const challenge = cells.find((c) => c.type === 'challenge');
    expect(run(challenge.solutionCode).at(-1)).toBe('✓ All 3 cases pass: that is semi-gradient Q-learning.');
    expect(run(challenge.startCode).at(-1)).toBe('0 of 3 cases pass.');
  });
});
