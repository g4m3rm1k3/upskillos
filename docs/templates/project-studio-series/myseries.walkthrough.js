// What a learner does at each step of My Series, for the walkthrough test (myseries.desktop.test.js).
// Keyed "<chapter>/<lesson file name>#<step title>". The guide is docs/contributing/project-studio-series.md.
//
// By default a step's file (its ```lang file=... block) is typed in for you. An entry adds:
//   run:       commands the lesson tells the learner to type in the terminal
//   files:     { path: content } the learner writes themselves, such as a Your turn answer
//   editFiles: { path: [[from, to], ...] } small changes the lesson's text describes
//   wrong:     wrong answers, each tried on a copy of the project before the step; every check
//              whose index is in its `fails` list must fail
import fs from 'node:fs';

export function answer(track, name) {
  return fs.readFileSync(new URL(`./${track}/answers/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
}

// A Your turn answer with one change: how its wrong answers are made.
function answerWith(track, name, pairs) {
  let content = answer(track, name);
  for (const [from, to] of pairs) {
    if (!content.includes(from)) throw new Error(`Wrong answer edit not found in ${track}/answers/${name}: ${from}`);
    content = content.replace(from, to);
  }
  return content;
}

const B = 'myseries-basics';

export const WALKTHROUGH = {
  // ── 1.1 ──────────────────────────────────────────────────────────────────
  [`${B}/01-01-a-greeting-program#A program that greets`]: {
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  [`${B}/01-01-a-greeting-program#Your turn: shout it`]: {
    files: { 'greet.py': answer(B, 'greet.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'forgot the capitals', files: { 'greet.py': answerWith(B, 'greet.py', [['greet(name).upper()', 'greet(name)']]) }, fails: [0] },
      { name: 'shouted everywhere', files: { 'greet.py': answerWith(B, 'greet.py', [['print(greet(sys.argv[1]))', 'print(shout(sys.argv[1]))']]) }, fails: [1] },
    ],
  },
};
