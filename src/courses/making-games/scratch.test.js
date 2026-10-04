// Lesson 9.3, "Breakout from scratch": every notebook cell prints what the prose says, and the challenge checks
// itself (the solution passes, the start does not, absolute positions fail).
import { describe, expect, it } from 'vitest';
import lesson from './9-game-ai-that-learns/003-breakout-from-scratch.js';

const cells = lesson.intuition.visualizations.find((v) => v.id === 'JSNotebook').props.lesson.cells;
const run = (code) => { const out = []; new Function('console', code)({ log: (...a) => out.push(a.join(' ')) }); return out; };
const squash = (l) => l.replace(/\s+/g, ' ');

describe('lesson 9.3: Breakout from scratch', () => {
  it('relative against absolute, rewards from the score, how states multiply', () => {
    expect(run(cells[0].startCode).map(squash)).toEqual(['A, ball and paddle in 5 bins each (25 states): catches 0.1', 'B, ball minus paddle in 6 bins (6 states): catches 1']);
    expect(run(cells[1].startCode).map((l) => l.replace(/^.*reward /, ''))).toEqual(['2', '-3', '1', '0']);
    expect(run(cells[2].startCode)).toEqual(['across × falling: 14 states, 42 Q values', '+ sideways: 28 states', '+ height: 112 states: each visited about 0.125 as often']);
  });

  it('the challenge checks itself', () => {
    const challenge = cells.find((c) => c.type === 'challenge');
    expect(run(challenge.solutionCode).at(-1)).toBe('✓ All 4 cases pass: that is what the paddle should see.');
    expect(run(challenge.startCode).at(-1)).toBe('1 of 4 cases pass.');
    const absolute = run(challenge.startCode.replace('  return [0, 0]\n', '  return [game.ball.x / 960, game.ball.vy > 0 ? 1 : 0]\n'));
    expect(absolute.at(-1)).toBe('0 of 4 cases pass.');
  });

  it('the Try it card opens breakout-scratch', () => {
    expect(lesson.intuition.visualizations.find((v) => v.id === 'GameStudioTask').props).toEqual({ task: 'breakout-scratch', lesson: 'mg9-003', checkpoint: 'cp-mg9-003-4' });
  });
});
