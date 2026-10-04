// Lesson 9.5, "Expected SARSA and Double Q-learning": every notebook cell prints what the prose says, and the
// challenge checks itself.
import { describe, expect, it } from 'vitest';
import lesson from './9-game-ai-that-learns/005-expected-sarsa-and-double-q-learning.js';

const cells = lesson.intuition.visualizations.find((v) => v.id === 'JSNotebook').props.lesson.cells;
const run = (code) => {
  const out = [];
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
  new Function('console', 'document', code)({ log: (...a) => out.push(a.join(' ')) }, document);
  return out;
};
const squash = (l) => l.replace(/\s+/g, ' ');

describe('lesson 9.5: Expected SARSA and Double Q-learning', () => {
  it('the max bias, Example 6.7, step sizes, the curves', () => {
    expect(run(cells[0].startCode)).toEqual([
      '1 samples each: max of the estimates 1.541, double estimate 0.003 (truth 0)',
      '5 samples each: max of the estimates 0.701, double estimate 0.012 (truth 0)',
      '20 samples each: max of the estimates 0.345, double estimate 0.002 (truth 0)',
    ]);
    expect(run(cells[1].startCode).map(squash)).toEqual([
      'Q-learning : left in the first 10 episodes 70%, first 50 86%, all 300 39%',
      'Double Q-learning: left in the first 10 episodes 50%, first 50 28%, all 300 12%',
    ]);
    expect(run(cells[2].startCode).map(squash)).toEqual([
      'SARSA α 0.1: -51.0, α 0.5: -34.8, α 1: -102.7',
      'Expected SARSA α 0.1: -48.4, α 0.5: -27.7, α 1: -24.8',
      'Q-learning α 0.1: -69.7, α 0.5: -55.4, α 1: -56.0',
    ]);
    expect(run(cells[3].startCode)).toEqual(['peak left: Q-learning 96%, Double Q-learning 53%']);
  }, 60000);

  it('the challenge checks itself', () => {
    const challenge = cells.find((c) => c.type === 'challenge');
    expect(run(challenge.solutionCode).at(-1)).toBe('✓ All 4 cases pass: that is Double Q-learning.');
    expect(run(challenge.startCode).at(-1)).toBe('0 of 4 cases pass.');
    // Valuing with the same table (plain Q-learning) fails the crossing cases.
    const same = run(challenge.startCode.replace('  return 0\n', '  return reward + (done ? 0 : gamma * Math.max(...mineNext))\n'));
    expect(same.filter((l) => l.startsWith('✗')).map((l) => l.slice(0, 8))).toEqual(['✗ case 1', '✗ case 2', '✗ case 4']);
  });

  it('the Try it card opens all-four', () => {
    expect(lesson.intuition.visualizations.find((v) => v.id === 'GameStudioTask').props).toEqual({ task: 'all-four', lesson: 'mg9-005', checkpoint: 'cp-mg9-005-4' });
  });
});
