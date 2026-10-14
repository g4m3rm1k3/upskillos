import { describe, expect, it } from 'vitest';
import { SCRAP, scrapSupportFiles } from './scrapLoader.js';
import opening from './yahtzeeFixtures/opening.walkthrough.json';
import completion from './yahtzeeFixtures/completion.walkthrough.json';
import published from './yahtzeeFixtures/published-steps.json';

const series = SCRAP.series.find(s => s.label === 'Scrap · Yahtzee in C++');
const lessons = series.chapters.flatMap(c => SCRAP.tracks[c.key]);

describe('Yahtzee C++ learning route', () => {
  it('puts the single-file and memory foundations before the established class path', () => {
    expect(series.sharedProject).toBe(true);
    const first = SCRAP.tracks[series.chapters[0].key];
    const position = name => first.findIndex(l => l.id.endsWith(`/${name}`));
    expect(position('01-one-file')).toBeLessThan(position('04-references'));
    expect(position('04-references')).toBeLessThan(position('05-pointers'));
    expect(position('07-a-playable-single-file')).toBeLessThan(position('08-why-headers'));
    expect(position('08-why-headers')).toBeLessThan(position('09-class-before-files'));
    expect(series.chapters[1].key).toBe('scrap--yahtzee-in-c-01-one-die');
    expect(SCRAP.tracks[series.chapters[1].key][0].id)
      .toBe('scrap--yahtzee-in-c-01-one-die/01-first-build');
  });

  it('loads every lesson and targets one file per step', () => {
    for (const lesson of lessons) {
      expect(lesson.title).not.toContain("can't be read");
      for (const step of lesson.steps) expect(step.extraTargets ?? []).toEqual([]);
    }
  });

  it('gives the added lessons predictions, independent work and progressive hints', () => {
    const added = [series.chapters[0], series.chapters.at(-1)]
      .flatMap(c => SCRAP.tracks[c.key]);
    for (const lesson of added) {
      expect(lesson.steps.some(s => s.predictions.length > 0), lesson.id).toBe(true);
      const independent = lesson.steps.find(s => s.title.startsWith('Your turn'));
      expect(independent, lesson.id).toBeDefined();
      expect(independent.target, lesson.id).toBeNull();
      expect(independent.hints.flat().length, lesson.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('preserves published step keys and gives new steps unique identities', () => {
    const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    for (const [file, headings] of Object.entries(published)) {
      const [chapter, name] = file.split('/');
      const id = `scrap--${slug('Yahtzee in C++/' + chapter)}/${name.replace(/\.md$/, '')}`;
      const lesson = lessons.find(l => l.id === id);
      expect(lesson, id).toBeDefined();
      const keys = lesson.steps.map(s => s.id);
      expect(new Set(keys).size, id).toBe(keys.length);
      headings.forEach((_, index) => expect(keys, id).toContain(`${id}-step-${index + 1}`));
    }
  });

  it('checks independent work behavior and keeps author answers outside learner targets', () => {
    const answers = { ...opening, ...completion };
    for (const chapter of [series.chapters[0], series.chapters.at(-1)]) {
      for (const lesson of SCRAP.tracks[chapter.key]) {
        for (const step of lesson.steps.filter(s => s.title.startsWith('Your turn'))) {
          const key = `${lesson.id.split('/').at(-1)}#${step.title}`;
          expect(step.target, key).toBeNull();
          expect(step.checks.length, key).toBeGreaterThanOrEqual(2);
          expect(Object.keys(answers[key].files).length, key).toBeGreaterThan(0);
          expect(answers[key].wrong.length, key).toBeGreaterThan(0);
        }
      }
    }
  });

  it('supplies the actual completion tests through the support button', () => {
    const chapter = series.chapters.at(-1);
    const names = ['tests/test_complete_rules.cpp', 'tests/test_complete_game.cpp', 'tests/minitest.h'];
    const files = Object.fromEntries(scrapSupportFiles(chapter.key, names.join(", ")).map(({ file, content }) => [file, content]));
    expect(Object.keys(files).sort()).toEqual(names.sort());
    expect(files['tests/test_complete_rules.cpp']).toContain('ZeroYahtzeeStillForcesPlacementWithoutBonus');
    expect(files['tests/test_complete_game.cpp']).toContain('ThreeRollLimitAndHeldDice');
  });
});
