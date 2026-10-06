import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRACKS, TRACK_KEYS } from './trackLoader.js';
import {
  ML_CONCEPTS, AREAS, conceptMastery, lessonCompanions, list, mlLab, notebookLesson, prerequisitesOf,
} from './mlCurriculum.js';
import { SERIES_MANIFEST } from '../../tools/notebook-lab/series/manifest.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const mlTracks = TRACK_KEYS.filter((key) => key.startsWith('ml-'));
const mlLessons = mlTracks.flatMap((key) => TRACKS[key]);

describe('the ML concept graph', () => {
  it('names only known concepts as prerequisites, in known areas', () => {
    for (const [id, concept] of Object.entries(ML_CONCEPTS)) {
      expect(AREAS, `${id}: area`).toContain(concept.area);
      for (const req of concept.requires) expect(ML_CONCEPTS[req], `${id} requires unknown "${req}"`).toBeTruthy();
    }
  });

  it('has no cycles: no concept is its own prerequisite', () => {
    for (const id of Object.keys(ML_CONCEPTS)) expect(prerequisitesOf(id), id).not.toContain(id);
  });

  it('collects prerequisites transitively', () => {
    expect(prerequisitesOf('gradient-descent')).toEqual(expect.arrayContaining(['gradients', 'derivatives', 'mathematical-functions', 'loss', 'vectors']));
  });
});

describe('ML lessons and their companions', () => {
  it('exist, and each one declares what it teaches and why', () => {
    expect(mlLessons.length).toBeGreaterThan(0);
    for (const lesson of mlLessons) {
      expect(list(lesson.meta.concepts).length, `${lesson.id}: concepts`).toBeGreaterThan(0);
      expect(lesson.meta.problem, `${lesson.id}: problem`).toBeTruthy();
    }
  });

  it('use only concepts from the graph', () => {
    for (const lesson of mlLessons) {
      for (const id of [...list(lesson.meta.concepts), ...list(lesson.meta.revisits)]) {
        expect(ML_CONCEPTS[id], `${lesson.id} names unknown concept "${id}"`).toBeTruthy();
      }
    }
  });

  it('only revisit concepts that an earlier lesson in the series taught', () => {
    const taught = new Set();
    for (const lesson of mlLessons) {
      for (const id of list(lesson.meta.revisits)) expect(taught, `${lesson.id} revisits "${id}" before any lesson teaches it`).toContain(id);
      for (const id of list(lesson.meta.concepts)) taught.add(id);
    }
  });

  it('link to notebook lessons that exist and are written', () => {
    const ids = new Set(SERIES_MANIFEST.flatMap((series) => series.lessons.map((l) => l.id)));
    for (const lesson of mlLessons) {
      for (const id of list(lesson.meta.notebook)) {
        expect(ids, `${lesson.id}: notebook "${id}"`).toContain(id);
        const series = SERIES_MANIFEST.find((s) => s.lessons.some((l) => l.id === id));
        const slug = series.lessons.find((l) => l.id === id).slug;
        const file = path.join(here, '../../tools/notebook-lab/series', series.dir, `${slug}.md`);
        expect(fs.existsSync(file), `${lesson.id}: notebook lesson ${id} has no text yet (${file})`).toBe(true);
      }
    }
  });

  it('link to Machine Learning Lab numbers that exist', () => {
    for (const lesson of mlLessons) {
      for (const n of list(lesson.meta.lab)) expect(mlLab(n), `${lesson.id}: lab ${n}`).toBeTruthy();
    }
  });

  it('build in-app links for each companion', () => {
    const lesson = { meta: { concepts: 'vectors', revisits: 'tabular-data', notebook: 'ml-vectors', lab: '3' } };
    const companions = lessonCompanions(lesson);
    expect(companions.concepts).toEqual([{ id: 'vectors', label: 'Vectors' }]);
    expect(companions.revisits[0].label).toBe(ML_CONCEPTS['tabular-data'].label);
    expect(companions.notebooks[0]).toEqual({ id: 'ml-vectors', title: notebookLesson('ml-vectors').title, href: '#/notebook-lab?lesson=ml-vectors' });
    expect(companions.labs[0]).toMatchObject({ number: 3, href: '#/lab/ml-lab?lab=3' });
  });
});

describe('concept mastery', () => {
  const step = (id, checked = true) => ({ id, checks: checked ? [{ kind: 'run' }] : [] });
  const lessons = [
    { meta: { concepts: 'vectors, dot-product' }, steps: [step('a'), step('b'), step('c', false)] },
    { meta: { concepts: 'vectors' }, steps: [step('d')] },
    { meta: {}, steps: [step('e')] },
  ];

  it('counts only checked steps, and only those that passed', () => {
    const done = new Set(['a', 'd', 'e']);
    expect(conceptMastery(lessons, (s) => done.has(s.id))).toEqual({
      vectors: { done: 2, total: 3 },
      'dot-product': { done: 1, total: 2 },
    });
  });

  it('ignores presence-only checks and optional challenges', () => {
    const extra = [{ meta: { concepts: 'vectors' }, steps: [
      { id: 'f', checks: [{ kind: 'file' }, { kind: 'contains' }] },
      { id: 'g', optional: true, checks: [{ kind: 'run' }] },
    ] }];
    expect(conceptMastery(extra, () => true)).toEqual({});
  });

  it('starts at nothing: reading a lesson demonstrates nothing', () => {
    expect(conceptMastery(lessons, () => false).vectors).toEqual({ done: 0, total: 3 });
  });
});
