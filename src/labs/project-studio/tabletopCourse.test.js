import { describe, expect, it } from 'vitest';
import { TRACKS, TRACK_KEYS, trackTitle } from './trackLoader.js';
import { studioSeries } from './series.js';
import answers from './tabletopFixtures/exercises.json';
import publishedKeys from './tabletopFixtures/published-step-keys.json';
const series = studioSeries(TRACKS, TRACK_KEYS, trackTitle).find(s => s.key === 'tabletop');
const lessons = series.chapters.flatMap(c => TRACKS[c.key]);
describe('Tabletop standalone teaching path', () => {
  it('starts from an empty page and shares its own project across chapters', () => {
    expect(series.sharedProject).toBe(true);
    expect(series.chapters[0].key).toBe('tabletop-start');
    expect(series.chapters.every(c => c.key.startsWith('tabletop-'))).toBe(true);
    expect(lessons[0].intro).toContain('No earlier course');
  });
  it('preserves published progress keys in their original order', () => {
    for (const [id, keys] of Object.entries(publishedKeys)) {
      const lesson = lessons.find(item => item.id === id);
      expect(lesson, id).toBeDefined();
      expect(lesson.steps.map(step => step.id).filter(key => keys.includes(key)), id).toEqual(keys);
    }
  });
  it('keeps one file per step and independent work outside supplied targets', () => {
    const exerciseKeys = [];
    for (const lesson of lessons) {
      expect(lesson.steps.some(s => s.predictions.length), lesson.id).toBe(true);
      for (const step of lesson.steps) expect(step.extraTargets ?? [], step.id).toEqual([]);
      const tasks = lesson.steps.filter(s => s.title.startsWith('Your turn'));
      expect(tasks.length, lesson.id).toBeGreaterThan(0);
      for (const step of tasks) {
        expect(step.target, step.id).toBeNull();
        expect(step.hints.flat().length, step.id).toBeGreaterThanOrEqual(3);
        expect(step.checks.length, step.id).toBeGreaterThan(0);
        const key = `${lesson.id}#${step.title}`;
        exerciseKeys.push(key);
        expect(answers[key]?.wrong.length, key).toBeGreaterThan(0);
      }
    }
    expect(exerciseKeys.sort()).toEqual(Object.keys(answers).sort());
    const ids = lessons.flatMap(l => [l.id, ...l.steps.map(s => s.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
