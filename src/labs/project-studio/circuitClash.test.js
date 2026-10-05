import { it, expect } from 'vitest';
import { TRACKS } from './trackLoader.js';
import { GAMES } from '../../games/registry.js';
it('opens with a playable destination, honest course status and no supplied learner source', () => {
  const lesson = TRACKS['circuit-clash'][0];
  expect(lesson.steps[0].prose).toContain('#/game/circuit-clash');
  expect(lesson.meta.track).toContain('in development');
  expect(GAMES.some(g => g.key === 'circuit-clash')).toBe(true);
  expect(lesson.meta.pedagogy).toBe('typed');
  expect(lesson.meta.support).toBeUndefined();
  expect(lesson.steps.at(-1).optional).toBe(true);
  for (const step of lesson.steps) { expect(step.target).toBeNull(); expect(step.provided).not.toBe(true); }
});
