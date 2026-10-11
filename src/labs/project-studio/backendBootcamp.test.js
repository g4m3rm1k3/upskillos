import { describe, expect, it } from 'vitest';
import { TRACKS, TRACK_KEYS, trackTitle } from './trackLoader.js';
import { studioSeries, nextSeriesLesson } from './series.js';
import { learningProfile } from './learningProfile.js';

const series = studioSeries(TRACKS, TRACK_KEYS, trackTitle).find(item => item.key === 'backend');
const keys = ['backend-fastapi', 'backend-django', 'backend-aspnet', 'backend-nestjs'];

describe('backend bootcamp navigation and learner contracts', () => {
  it('keeps standalone framework projects separate in the requested order', () => {
    expect(series.chapters.map(chapter => chapter.key)).toEqual(keys);
    expect(series.sharedProject).toBe(false);
    expect(series.level).toBe('bridge');
    expect(series.maturity).toBe('in-development');
    for (const [index, key] of keys.entries()) {
      expect(TRACKS[key][0].intro).toContain('This framework section stands alone');
      expect(learningProfile(key).audience).toContain('Standalone project');
      const next = nextSeriesLesson(series, TRACKS, key, TRACKS[key].at(-1).id);
      expect(next?.trackKey ?? null).toBe(keys[index + 1] ?? null);
    }
    expect(learningProfile('backend-unwritten').level).toBe('unclassified');
  });

  it('renders complete single-file steps and preserves independent assessment', () => {
    const ids = [];
    for (const key of keys) for (const lesson of TRACKS[key]) {
      expect(lesson.runtime).toBe('none');
      expect(lesson.meta.reference).not.toBe('optional');
      expect(lesson.intro).toContain('### The story so far');
      expect(lesson.steps.some(step => step.predictions.length)).toBe(true);
      const exercise = lesson.steps.find(step => step.title.startsWith('Your turn:'));
      expect(exercise.target).toBeNull();
      expect(exercise.prose).toContain('submission gate only');
      expect(exercise.hints[0].map(hint => hint.key)).toEqual(['nudge', 'concept', 'shape']);
      expect(lesson.steps.at(-1).title).toBe('Diagnose, explain and review');
      ids.push(lesson.id);
      for (const step of lesson.steps) {
        ids.push(step.id);
        expect(step.extraTargets ?? []).toEqual([]);
        if (step.file) expect(step.file).not.toMatch(/(^\/|\.\.)/);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('offers real framework regression commands without spawning indefinite servers as checks', () => {
    const commands = keys.map(key => TRACKS[key].flatMap(lesson => lesson.steps.flatMap(step => step.checks)).filter(check => check.kind === 'run').map(check => check.args[0]));
    expect(commands[0]).toContain('.venv/Scripts/python -m pytest -q');
    expect(commands[1]).toContain('.venv/Scripts/python manage.py test --settings=desk.test_settings');
    expect(commands[2]).toContain('dotnet test Stock.Tests');
    expect(commands[3]).toContain('npm test');
    expect(commands.flat().join(' ')).not.toMatch(/uvicorn|runserver|npm start/);
  });
});
