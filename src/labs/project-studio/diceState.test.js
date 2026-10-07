import { describe, expect, it } from 'vitest';
import { TRACKS } from './trackLoader.js';
import { diffLines } from './lineDiff.js';
import { WALKTHROUGH } from './tracks/dice-state.walkthrough.js';
import { WALKTHROUGH as OBJECTS } from './tracks/dice-objects.walkthrough.js';
import { WALKTHROUGH as PROJECT } from './tracks/dice-project.walkthrough.js';
import { WALKTHROUGH as LEARNING } from './tracks/dice-learning.walkthrough.js';

describe('C++ game state section teaching contract', () => {
  const lessons = TRACKS['dice-path-state'];
  it('teaches through small diffs and independent, checked challenges', () => {
    expect(lessons).toHaveLength(5);
    const prior = new Map();
    for (const lesson of [...lessons, ...TRACKS['dice-path-objects'], ...TRACKS['dice-path-project'], ...TRACKS['dice-path-learning']]) {
      expect(lesson.steps.some(s => s.predictions.length), lesson.id).toBe(true);
      expect(lesson.steps.some(s => s.title.startsWith('Try it')), lesson.id).toBe(true);
      const task = lesson.steps.find(s => s.title.startsWith('Your turn'));
      expect(task.target).toBeNull();
      expect(task.hints.flat()).toHaveLength(3);
      expect(task.checks.length).toBeGreaterThanOrEqual(4);
      const fixtures = lesson.id.startsWith('dice-path-state/') ? WALKTHROUGH : lesson.id.startsWith('dice-path-objects/') ? OBJECTS : lesson.id.startsWith('dice-path-project/') ? PROJECT : LEARNING;
      const answer = fixtures[`${lesson.id.split('/')[1]}#${task.title}`];
      expect(answer.wrong.length).toBeGreaterThanOrEqual(2);
      for (const step of lesson.steps) {
        expect(step.extraTargets ?? []).toEqual([]);
        if (!step.file) continue;
        const additions = diffLines(prior.get(step.file) ?? '', step.target).filter(r => r.type === 'add' && r.line.trim());
        expect(additions.length, `${lesson.id}: ${step.title}`).toBeLessThanOrEqual(18);
        expect(step.provided).not.toBe(true);
        expect(step.checks.length).toBeGreaterThan(0);
        prior.set(step.file, step.target);
      }
    }
  });
  it('explicitly checks the observed failure before teaching assertions', () => {
    const first = lessons.find(l => l.id.endsWith('/09-tests-that-fail')).steps[0];
    expect(first.target).toContain('score = amount');
    expect(first.checks.at(-1).opts.exit).toBe('1');
  });
});
