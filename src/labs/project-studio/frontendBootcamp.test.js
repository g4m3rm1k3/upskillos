import { describe, expect, it } from 'vitest';
import { TRACKS, TRACK_KEYS, trackTitle } from './trackLoader.js';
import { studioSeries, nextSeriesLesson } from './series.js';
import { learningProfile } from './learningProfile.js';
import { WALKTHROUGH } from './tracks/frontend.walkthrough.js';

const series = studioSeries(TRACKS, TRACK_KEYS, trackTitle).find(item => item.key === 'frontend');
const lessons = series.chapters.flatMap(chapter => TRACKS[chapter.key]);

describe('frontend bootcamp learning path', () => {
  it('keeps all apps in one beginner portfolio with continuous chapter navigation', () => {
    expect(series.sharedProject).toBe(true);
    expect(series.level).toBe('beginner');
    expect(series.maturity).toBe('in-development');
    expect(series.audience).toContain('No programming experience');
    for (let index = 0; index < series.chapters.length - 1; index++) {
      const current = series.chapters[index].key;
      const next = series.chapters[index + 1].key;
      expect(nextSeriesLesson(series, TRACKS, current, TRACKS[current].at(-1).id)).toEqual({ trackKey: next, lesson: TRACKS[next][0] });
    }
    expect(learningProfile('frontend-unwritten').level).toBe('unclassified');
  });

  it('keeps exercises independent, provides progressive help and retains diagnostic evidence', () => {
    for (const lesson of lessons) {
      const task = lesson.steps.find(step => step.title.startsWith('Your turn:'));
      expect(task, lesson.id).toBeDefined();
      expect(task.target, lesson.id).toBeNull();
      expect(task.hints[0].map(rung => rung.key)).toEqual(['nudge', 'concept', 'shape']);
      expect(task.checks.length).toBeGreaterThan(0);
      expect(lesson.steps.at(-1).title).toBe('Diagnose, explain and review');
      expect(lesson.meta.reference).toBe('optional');
      for (const step of lesson.steps) {
        expect(step.extraTargets ?? []).toEqual([]);
        if (!step.checks.length) continue;
        const action = WALKTHROUGH[`${lesson.id}#${step.title}`];
        expect(action, `${lesson.id} / ${step.title}`).toBeDefined();
        if (step === task) expect(Object.keys(action.files ?? {}).length).toBeGreaterThan(0);
      }
    }
    const ids = lessons.flatMap(lesson => [lesson.id, ...lesson.steps.map(step => step.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('teaches foundations before frameworks and distinguishes the independent capstone from validation', () => {
    const order = series.chapters.map(chapter => chapter.key);
    expect(order.indexOf('frontend-design')).toBeLessThan(order.indexOf('frontend-bootstrap'));
    expect(order.indexOf('frontend-javascript')).toBeLessThan(order.indexOf('frontend-react'));
    expect(order.indexOf('frontend-api')).toBeLessThan(order.indexOf('frontend-react'));
    expect(lessons.at(-1).steps.find(step => step.title.startsWith('Your turn:')).prose).toContain('submission gate only');
  });
});
