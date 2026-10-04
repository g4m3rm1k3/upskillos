// Lesson 9.4, "SARSA and Q-learning": every notebook cell prints what the prose says, and the challenge checks itself.
import { describe, expect, it } from 'vitest';
import lesson from './9-game-ai-that-learns/004-sarsa-and-q-learning.js';

const cells = lesson.intuition.visualizations.find((v) => v.id === 'JSNotebook').props.lesson.cells;
const run = (code) => {
  const out = [];
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
  new Function('console', 'document', code)({ log: (...a) => out.push(a.join(' ')) }, document);
  return out;
};
const squash = (l) => l.replace(/\s+/g, ' ');

describe('lesson 9.4: SARSA and Q-learning', () => {
  it('the two targets, the cliff over 10 seeds, the edge values, stopping exploration, the walks', () => {
    expect(run(cells[0].startCode).map(squash)).toEqual(['Q-learning target: R + γ max Q(S′, ·) = -9', 'SARSA target: R + γ Q(S′, A′) = -41', 'Expected SARSA: R + γ Σ π Q(S′, ·) = -9.875']);
    expect(run(cells[1].startCode).map(squash)).toEqual([
      'Q-learning: return per episode (last 100) -50.4, greedy walk 13, 13, 13, 13, 13, 13, 13, 13, 13, 13 moves',
      'SARSA : return per episode (last 100) -27.2, greedy walk 17, 17, 17, 17, 21, 60, 17, 17, 60, 17 moves',
    ]);
    expect(run(cells[2].startCode)).toEqual(['column 1, row 2, right: Q-learning -11.0, SARSA -20.4', 'column 5, row 2, right: Q-learning -7.0, SARSA -11.3', 'column 10, row 2, right: Q-learning -2.0, SARSA -2.1']);
    const decay = run(cells[3].startCode);
    expect(decay.at(-1)).toBe('SARSA, ε 0.1 → 0 over 5000 episodes: greedy walk 17, 17, 17, 17, 17, 17, 17, 17, 17, 17 moves');
    expect(run(cells[4].startCode)).toEqual(['cells: Q-learning 14, SARSA 18']);
  }, 60000);

  it('the challenge checks itself', () => {
    const challenge = cells.find((c) => c.type === 'challenge');
    expect(run(challenge.solutionCode).at(-1)).toBe('✓ All 4 cases pass: that is SARSA.');
    expect(run(challenge.startCode).at(-1)).toBe('0 of 4 cases pass.');
    const qlearning = run(challenge.startCode.replace('  return 0\n', '  return reward + (done ? 0 : gamma * Math.max(...nextRow))\n'));
    expect(qlearning.filter((l) => l.startsWith('✗')).map((l) => l.slice(0, 8))).toEqual(['✗ case 1', '✗ case 4']);
  });

  it('the Try it card opens sarsa-vs-q', () => {
    expect(lesson.intuition.visualizations.find((v) => v.id === 'GameStudioTask').props).toEqual({ task: 'sarsa-vs-q', lesson: 'mg9-004', checkpoint: 'cp-mg9-004-4' });
  });
});
