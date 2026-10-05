import { describe, expect, it } from 'vitest';
import { TRACKS, TRACK_KEYS, trackTitle } from './trackLoader.js';
import { studioSeries } from './series.js';
import { WALKTHROUGH } from './tracks/dice-cpp.walkthrough.js';
import { diffLines } from './lineDiff.js';

const lessons = TRACKS['dice-cpp'];
describe('Dice Duel teaching and discovery', () => {
  it('is independently selectable, with stable discovered lesson identities', () => {
    const series = studioSeries(TRACKS, TRACK_KEYS, trackTitle);
    expect(series.find(item => item.key === 'dice-cpp')?.label).toContain('Python Developers');
    expect(new Set(lessons.map(lesson => lesson.id)).size).toBe(lessons.length);
  });

  it('uses visible live diffs, small edits, explorations and independent practice', () => {
    const previous = new Map();
    for (const lesson of lessons) {
      expect(lesson.runtime).toBe('cpp');
      expect(lesson.meta.console).toBe('true');
      expect(lesson.meta.reference).not.toBe('optional');
      expect(lesson.meta.support).toBeUndefined();
      expect(lesson.steps.some(step => step.predictions.length)).toBe(true);
      expect(lesson.steps.some(step => step.file?.startsWith('explore_'))).toBe(true);
      expect(lesson.steps.some(step => step.title === 'Try it')).toBe(true);
      const practice = lesson.steps.find(step => step.title.startsWith('Your turn'));
      expect(practice.target).toBeNull();
      expect(practice.hints.flat().length).toBeGreaterThanOrEqual(3);
      expect(practice.checks.filter(check => check.kind === 'run').length).toBeGreaterThanOrEqual(3);
      expect(WALKTHROUGH[`${lesson.id.split('/')[1]}#${practice.title}`].wrong.length).toBeGreaterThanOrEqual(2);
      for (const step of lesson.steps) {
        expect(step.extraTargets ?? []).toEqual([]);
        expect(step.provided).not.toBe(true);
        if (step.file) {
          expect(step.prose).not.toContain('```cpp');
          expect(step.explain).not.toContain('```cpp');
          const additions = diffLines(previous.get(step.file) ?? '', step.target).filter(row => row.type === 'add' && row.line.trim()).length;
          expect(additions, `${lesson.id} / ${step.title}: too many new lines at once`).toBeLessThanOrEqual(18);
          previous.set(step.file, step.target);
          expect(step.checks.length).toBeGreaterThan(0);
          const action = WALKTHROUGH[`${lesson.id.split('/')[1]}#${step.title}`];
          expect(action.wrong.some(wrong => wrong.fails.length > 0)).toBe(true);
        }
      }
    }
  });

  it('introduces local headers before any executed compilation needs them', () => {
    const written = new Map();
    for (const lesson of lessons) {
      for (const step of lesson.steps) {
        if (step.file) written.set(step.file, step.target);
        for (const check of step.checks.filter(check => check.kind === 'run' && check.args[0].startsWith('g++ -std='))) {
          const source = check.args[0].match(/\b(\w+\.(?:cpp|hpp))\b/)[1];
          const fixture = WALKTHROUGH[`${lesson.id.split('/')[1]}#${step.title}`];
          for (const [file, code] of Object.entries(fixture?.files ?? {})) written.set(file, code);
          const visit = (file, seen = new Set()) => {
            expect(written.has(file), `${lesson.id}: ${file} must already exist`).toBe(true);
            if (seen.has(file)) return;
            seen.add(file);
            for (const include of written.get(file).matchAll(/#include "([^"]+)"/g)) visit(include[1], seen);
          };
          visit(source);
        }
      }
    }
  });
});
