// Lesson 9.7, "Bigger state spaces": every notebook cell prints what the prose says, and the challenge checks itself.
import { describe, expect, it } from 'vitest';
import lesson from './9-game-ai-that-learns/007-bigger-state-spaces.js';
import { stateOf } from '../../labs/game-studio/ml/brain';

const cells = lesson.intuition.visualizations.find((v) => v.id === 'JSNotebook').props.lesson.cells;
const run = (code) => { const out = []; new Function('console', code)({ log: (...a) => out.push(a.join(' ')) }); return out; };
const squash = (l) => l.replace(/\s+/g, ' ');

describe('lesson 9.7: bigger state spaces', () => {
  it('resolution, aliasing, cost', () => {
    expect(run(cells[0].startCode).map(squash)).toEqual([
      '2 bins : catches after 100 episodes 0.45, 1000 0.10, 5000 0.00',
      '3 bins : catches after 100 episodes 1.00, 1000 1.00, 5000 1.00',
      '7 bins : catches after 100 episodes 1.00, 1000 1.00, 5000 1.00',
      '39 bins : catches after 100 episodes 0.79, 1000 0.67, 5000 1.00',
    ]);
    expect(run(cells[1].startCode).map(squash)).toEqual([
      'drifting, sees ball − paddle (7 states): catches 0.46',
      'drifting, sees ball − paddle and drift (21 states): catches 0.84',
      'drifting, sees where it will land − paddle (7 states): catches 1.00',
    ]);
    expect(run(cells[2].startCode).map(squash).at(-1)).toBe('4 numbers, 10 bins each : 10000 states, about 1.0 updates each');
  }, 60000);

  it('the challenge checks itself, and its answers are Game Studio\'s', () => {
    const challenge = cells.find((c) => c.type === 'challenge');
    expect(run(challenge.solutionCode).at(-1)).toBe('✓ All 4 cases pass: that is how bins make states.');
    expect(run(challenge.startCode).at(-1)).toBe('0 of 4 cases pass.');
    const B = [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5]];
    expect([stateOf([0, 1], B), stateOf([-0.9, 1], B), stateOf([0.25, 0], B), stateOf([5, 2, 7], [[3], [], [1, 5, 9]])]).toEqual([7, 1, 12, 6]);
  });

  it('the Try it card opens state-design', () => {
    expect(lesson.intuition.visualizations.find((v) => v.id === 'GameStudioTask').props).toEqual({ task: 'state-design', lesson: 'mg9-007', checkpoint: 'cp-mg9-007-4' });
  });
});
