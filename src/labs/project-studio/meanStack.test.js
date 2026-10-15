import { describe, it, expect } from 'vitest';
import { TRACKS, TRACK_KEYS, trackTitle } from './trackLoader.js';
import { studioSeries, nextSeriesLesson } from './series.js';
import { learningProfile } from './learningProfile.js';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';

const keys = ['mean-start', 'mean-model', 'mean-database', 'mean-api', 'mean-angular', 'mean-quality'];
const series = studioSeries(TRACKS, TRACK_KEYS, trackTitle).find(item => item.key === 'mean');
describe('MEAN learner path', () => {
  it('grades the JavaScript practice by behavior and rejects plausible wrong answers', () => {
    const lesson = TRACKS['mean-start'][0];
    expect(lesson.id).toContain('00-javascript-practice');
    const checker = lesson.steps.find(s => s.file === 'practice/check.mjs').target
      .replace(/^import .*;\n/gm, '');
    // Normalize realm-specific prototypes before comparing objects produced across the VM boundary.
    const portableAssert = {
      deepEqual(actual, expected, message) {
        assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), message);
      },
    };
    const check = summarizeTasks => runInNewContext(checker, {
      assert: portableAssert, summarizeTasks, structuredClone, console: { log() {} },
    });
    const correct = tasks => {
      const titles = tasks.filter(t => t.status === 'open').map(t => t.title.trim());
      return { openCount: titles.length, titles };
    };
    expect(() => check(correct)).not.toThrow();
    expect(() => check(tasks => ({ openCount: tasks.length, titles: tasks.map(t => t.title.trim()) }))).toThrow();
    expect(() => check(tasks => {
      tasks.forEach(t => { t.title = t.title.trim(); });
      return correct(tasks);
    })).toThrow(/Do not mutate/);
    expect(() => check(tasks => {
      const result = correct(tasks);
      result.titles.reverse();
      return result;
    })).toThrow(/preserve their order/);
  });
  it('continues across chapters in one project and labels prerequisites honestly', () => {
    expect(series.sharedProject).toBe(true);
    expect(series.chapters.map(c => c.key)).toEqual(keys);
    expect(series.level).toBe('bridge');
    expect(series.maturity).toBe('in-development');
    for (const [i, key] of keys.entries()) {
      expect(learningProfile(key).level).toBe('bridge');
      expect(nextSeriesLesson(series, TRACKS, key, TRACKS[key].at(-1).id)?.trackKey ?? null).toBe(keys[i + 1] ?? null);
    }
    expect(learningProfile('mean-unwritten').level).toBe('unclassified');
  });
  it('keeps warm-ups before integration and independent work without supplied answers', () => {
    expect(TRACKS['mean-api'][0].id).toContain('00-first-request');
    expect(TRACKS['mean-angular'][0].id).toContain('00-first-component');
    const ids = [];
    for (const key of keys) for (const lesson of TRACKS[key]) {
      expect(lesson.runtime).toBe('none');
      expect(lesson.steps.some(s => s.predictions.length)).toBe(true);
      const task = lesson.steps.find(s => s.title.startsWith('Your turn:'));
      expect(task.target).toBeNull();
      expect(task.hints[0].map(h => h.key)).toEqual(['nudge', 'concept', 'shape']);
      expect(lesson.steps.at(-1).title).toBe('Diagnose, explain and review');
      ids.push(lesson.id);
      for (const step of lesson.steps) {
        ids.push(step.id);
        expect(step.extraTargets ?? []).toEqual([]);
        if (step.file) expect(step.file).not.toMatch(/(^\/|\.\.)/);
        for (const check of step.checks.filter(c => c.kind === 'run')) {
          expect(check.args[0]).not.toMatch(/npm start|ng serve|mongod /);
        }
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
