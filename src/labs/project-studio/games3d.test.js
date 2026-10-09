import { describe, it, expect } from 'vitest';
import { TRACKS, TRACK_KEYS, trackTitle } from './trackLoader.js';
import { studioSeries } from './series.js';
import { withTypedDiffTargets } from './typedDiffTargets.js';
import { learningProfile } from './learningProfile.js';

const lessons = TRACKS['games3d-foundations'];

describe('3D studio opening path', () => {
  it('discovers a honest standalone entry and preserves every existing track', () => {
    const series = studioSeries(TRACKS, TRACK_KEYS, trackTitle);
    const studio = series.find(item => item.key === 'games3d');
    expect(studio.sharedProject).toBe(true);
    expect(studio.chapters.map(item => item.key)).toEqual(['games3d-foundations']);
    expect(studio.planned).toContain('versioned save/open');
    expect(studio.planned).toContain('Q-learning playground');
    expect(series.find(item => item.key === 'circuit-clash')).toBeDefined();
    expect(series.flatMap(item => item.chapters.map(chapter => chapter.key)).sort()).toEqual([...TRACK_KEYS].sort());
    expect(learningProfile('games3d-foundations').maturity).toBe('in-development');
    expect(learningProfile('games3d-future').level).toBe('unclassified');
  });

  it('provides predictions, independent tasks and one file per teaching step', () => {
    for (const lesson of lessons) {
      expect(lesson.steps.some(step => step.predictions.length)).toBe(true);
      const task = lesson.steps.find(step => step.title.startsWith('Independent task'));
      expect(task.hints[0].map(rung => rung.key)).toEqual(['nudge', 'concept', 'shape']);
      expect(task.target).toBeNull();
      expect(task.edit).toBeUndefined();
      for (const step of lesson.steps) expect(step.extraTargets || []).toEqual([]);
    }
    const ids = lessons.flatMap(lesson => [lesson.id, ...lesson.steps.map(step => step.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('derives accumulated references without supplying code to learner files', () => {
    const referenced = withTypedDiffTargets(lessons);
    const invocation = referenced.flatMap(lesson => lesson.steps).find(step => step.title === 'Invoke the additional checks');
    expect(invocation.target).toContain('SCENE CHECKS PASSED');
    expect(invocation.target).toContain('EditorChecks.Run(Check)');
    expect(invocation.diffBefore).not.toContain('EditorChecks.Run');
    expect(lessons.flatMap(lesson => lesson.steps).find(step => step.id === invocation.id).target).toBeNull();
  });
});
