// Walk the actual parsed lessons through the same checks used by Check my work.
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { SCRAP, scrapSupportFiles } from './scrapLoader.js';
import opening from './yahtzeeFixtures/opening.walkthrough.json';
import completion from './yahtzeeFixtures/completion.walkthrough.json';
import earlierAnswers from './yahtzeeFixtures/exercise-completions.json';

const require = createRequire(import.meta.url);
const { runChecks } = require('../../../desktop/app/project-checks.cjs');
const roots = [];
function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yahtzee-teaching-'));
  roots.push(root);
  return root;
}
function write(folder, file, content) {
  const destination = path.join(folder, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
}
async function checks(folder, step) {
  const result = await runChecks(folder, step.checks, { env: process.env });
  expect(result.ok, step.title).toBe(true);
  return result.results;
}
afterAll(() => { for (const root of roots) fs.rmSync(root, { recursive: true, force: true }); });

function walkthrough(chapter, answers, prepare = () => {}) {
let folder;
describe.sequential(chapter + ': real learner steps and wrong answers', () => {
  for (const lesson of SCRAP.tracks[chapter]) {
    it(lesson.title, async () => {
      if (!folder) { folder = project(); prepare(folder); }
      for (const { file, content } of scrapSupportFiles(chapter, lesson.meta.support)) write(folder, file, content);
      for (const step of lesson.steps) {
        if (step.file) write(folder, step.file, step.target);
        const key = `${lesson.id.split('/').at(-1)}#${step.title}`;
        const action = answers[key] ?? {};
        for (const wrong of action.wrong ?? []) {
          const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'yahtzee-wrong-'));
          try {
            fs.cpSync(folder, copy, { recursive: true });
            for (const [file, content] of Object.entries(wrong.files)) write(copy, file, content);
            const results = await checks(copy, step);
            // A runtime rejection must not accidentally be only a compiler failure.
            expect(results[0].pass, `${key}: ${wrong.name} compiles`).toBe(true);
            for (const index of wrong.fails) expect(results[index].pass, `${key}: ${wrong.name}`).toBe(false);
          } finally { fs.rmSync(copy, { recursive: true, force: true }); }
        }
        for (const [file, content] of Object.entries(action.files ?? {})) write(folder, file, content);
        const results = await checks(folder, step);
        for (const result of results) expect(result.pass, `${key}\n${JSON.stringify(result)}`).toBe(true);
      }
    }, 180000);
  }
});

}
walkthrough('scrap--yahtzee-in-c-00-start-here', opening);
walkthrough('scrap--yahtzee-in-c-07-finish-and-explain', completion, folder => {
  const series = SCRAP.series.find(s => s.label === 'Scrap · Yahtzee in C++');
  for (const chapter of series.chapters.slice(1, -1)) {
    for (const lesson of SCRAP.tracks[chapter.key]) {
      for (const { file, content } of scrapSupportFiles(chapter.key, lesson.meta.support)) write(folder, file, content);
      for (const step of lesson.steps) if (step.file) write(folder, step.file, step.target);
    }
  }
  for (const [file, content] of Object.entries(earlierAnswers)) write(folder, file, content);
  // Chapter 6 asks the learner to extend the build list in prose.
  write(folder, 'sources.txt', 'main.cpp Game.cpp Turn.cpp Input.cpp Scorecard.cpp Scoring.cpp Dice.cpp Die.cpp Terminal.cpp Player.cpp Ranking.cpp\n');
});
