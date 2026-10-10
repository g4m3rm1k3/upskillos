#!/usr/bin/env node
// Measures whether the bootcamp's lessons teach in small, explained steps, or dump code.
//
//   node scripts/check-bootcamp-teaching.mjs [--track spreadsheet-build] [--from <lesson>] [--until <lesson>] [--all]
//
// The walkthrough test proves every check is right; it can't tell whether a lesson teaches. This
// script measures the things that make a lesson a code dump, following the series' rules
// (docs/bootcamp-series-plan.md, "Making sure it teaches"):
//
//   - lines added per step: every file is followed through the track (including what the learner
//     writes in Your turn steps, from the walkthrough), so a step's count is what it really asks
//     the learner to type. Over 15 is a warning, over 30 a dump.
//   - explanation per line: words of prose in the step for each line it adds. Under 6 is thin.
//   - each lesson has a prediction, an experiment (a playground file, or a step that breaks
//     something on purpose) and a Your turn.
//   - explaining, not describing (the plan's Q-Arcade standard): each lesson after the first has
//     "The story so far" and "What this lesson builds" (challenges have their brief instead); every
//     supplied test file is followed by what its tests protect; every step that adds a function
//     has an inputs-and-returns table for it (a `| returns |` row per new function).
//   - the concept ledger: a lesson may declare `teaches:` and `uses:` in its front matter (comma
//     lists). Every concept a lesson uses must have been taught by an earlier lesson or itself.
//
// Supplied files (`provided`) don't count: the learner reads them, they don't type them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const studio = path.join(root, 'src', 'labs', 'project-studio');
const { parseLesson } = await import(pathToFileURL(path.join(studio, 'parseTrack.js')).href);
const { diffLines } = await import(pathToFileURL(path.join(studio, 'lineDiff.js')).href);

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const track = opt('--track') ?? 'spreadsheet-build';
const from = opt('--from');
const until = opt('--until');
const showAll = args.includes('--all');

const WARN = 15;
const DUMP = 30;
const THIN = 6;

const dir = path.join(studio, 'tracks', track);
const files = fs.readdirSync(dir).filter((n) => n.endsWith('.md')).sort();
let walkthrough = {};
const wtPath = path.join(studio, 'tracks', `${track}.walkthrough.js`);
if (fs.existsSync(wtPath)) walkthrough = (await import(pathToFileURL(wtPath).href)).WALKTHROUGH ?? {};

const state = new Map();
// The file as it stood before each step, for spotting the functions a step adds.
const lessonStart = new Map();
const taught = new Set();
const lessons = [];
const list = (v) => String(v ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
const words = (text) => (String(text).replace(/```[\s\S]*?```/g, ' ').replace(/@@\w+-\d+@@/g, ' ').match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length;

for (const name of files) {
  const id = name.replace(/\.md$/, '');
  const lesson = parseLesson(fs.readFileSync(path.join(dir, name), 'utf8'), `${track}/${id}`);
  const raw = fs.readFileSync(path.join(dir, name), 'utf8');
  const report = { id, title: lesson.title, steps: [], predictions: 0, yourTurn: false, experiment: false, missing: [], explain: [] };
  if (lessons.length && !/^#{2,3} The story so far/m.test(raw)) report.explain.push('no story so far');
  if (!/Challenge:/.test(lesson.title) && !/^#{2,3} What this lesson builds/m.test(raw)) report.explain.push('no what-it-builds');

  // Front matter can name steps (semicolon-separated titles): `experiments:` marks experiments the
  // title doesn't reveal; `justified:` marks big steps that are big on purpose (say why in the text).
  const titles = (v) => String(v ?? '').split(';').map((x) => x.trim()).filter(Boolean);
  const marked = new Set(titles(lesson.meta.experiments));
  const justified = new Set(titles(lesson.meta.justified));
  for (const c of list(lesson.meta.teaches)) taught.add(c);
  for (const c of list(lesson.meta.uses)) if (!taught.has(c)) report.missing.push(c);

  for (const step of lesson.steps) {
    report.predictions += step.predictions?.length ?? 0;
    if (/^Your turn\b/i.test(step.title)) report.yourTurn = true;
    if ((step.file ?? '').startsWith('playground/') || /experiment|break it|\blab\b/i.test(step.title) || marked.has(step.title)) report.experiment = true;

    let added = 0;
    if (step.file && step.target != null) {
      let before = state.get(step.file);
      // A file that appears under a new name nearly unchanged was renamed or moved (`git mv`),
      // not typed: compare it with the closest file it could have come from.
      if (before === undefined) {
        const lines = step.target.split('\n').filter((l) => l.trim()).length;
        let best = null;
        for (const [, content] of state) {
          const n = diffLines(content, step.target + '\n').filter((op) => op.type === 'add' && op.line.trim() !== '').length;
          if (best === null || n < best.n) best = { n, content };
        }
        before = best && best.n < lines / 2 ? best.content : '';
      }
      const after = step.target + '\n';
      if (!step.provided) added = diffLines(before, after).filter((op) => op.type === 'add' && op.line.trim() !== '').length;
      state.set(step.file, after);
    }
    // What the learner writes themselves (a Your turn answer, a small edit the text describes).
    const action = walkthrough[`${track}/${id}#${step.title}`] ?? {};
    for (const [rel, content] of Object.entries(action.files ?? {})) state.set(rel, content);
    for (const [rel, pairs] of Object.entries(action.editFiles ?? {})) {
      let content = state.get(rel) ?? '';
      for (const [a, b] of pairs) content = content.replace(a, b);
      state.set(rel, content);
    }
    const prose = words(step.prose) + words(step.explain);
    const text = `${step.prose ?? ''}
${step.explain ?? ''}`;
    if (step.provided && /(\.test\.|\.check\.|(^|\/)test_)/.test(step.file ?? '') && !/protect/i.test(text)) report.explain.push(`tests not explained (what they protect): ${step.title}`);
    let tableless = false;
    if (step.file && step.target != null && !step.provided) {
      const before = (lessonStart.get(step.file) ?? '');
      const fnNames = (src) => new Set([...src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)|^\s*def\s+(\w+)/gm)].map((m) => m[1] ?? m[2]));
      const had = fnNames(before);
      const fresh = [...fnNames(step.target)].filter((f) => !had.has(f));
      const rows = (text.match(/^\|\s*returns?\b/gim) ?? []).length;
      if (fresh.length > rows) tableless = true;
      lessonStart.set(step.file, step.target);
    }
    const verdict = added > WARN && justified.has(step.title) ? '' : added > DUMP ? 'DUMP' : added > WARN ? 'big' : added > 0 && prose / added < THIN ? 'thin' : tableless ? 'table' : '';
    report.steps.push({ title: step.title, file: step.file, added, prose, verdict });
  }
  lessons.push(report);
}

const fromIdx = from ? lessons.findIndex((l) => l.id.startsWith(from)) : 0;
const untilIdx = until ? lessons.findIndex((l) => l.id.startsWith(until)) : lessons.length - 1;
const shown = lessons.slice(fromIdx, untilIdx + 1);

let tables = 0, explainGaps = 0;
let dumps = 0, bigs = 0, thins = 0, noPredict = 0, noTurn = 0, noExperiment = 0, ledger = 0, missingConcepts = 0;
for (const l of shown) {
  const flagged = l.steps.filter((s) => s.verdict);
  dumps += flagged.filter((s) => s.verdict === 'DUMP').length;
  bigs += flagged.filter((s) => s.verdict === 'big').length;
  thins += flagged.filter((s) => s.verdict === 'thin').length;
  tables += flagged.filter((s) => s.verdict === 'table').length;
  explainGaps += l.explain.length;
  const challenge = /Challenge:/.test(l.title);
  if (!l.predictions && !challenge) noPredict++;
  if (!l.yourTurn) noTurn++;
  if (!l.experiment && !challenge) noExperiment++;
  if (l.missing.length) missingConcepts += l.missing.length;
  const lessonFlags = [!l.predictions && !challenge && 'no prediction', !l.yourTurn && 'no Your turn', !l.experiment && !challenge && 'no experiment', l.missing.length && `uses untaught: ${l.missing.join(', ')}`, ...l.explain].filter(Boolean);
  if (!flagged.length && !lessonFlags.length && !showAll) continue;
  console.log(`\n${l.id} — ${l.title}${lessonFlags.length ? `   [${lessonFlags.join('; ')}]` : ''}`);
  for (const s of showAll ? l.steps : flagged) {
    if (!s.file && !showAll) continue;
    console.log(`  ${(s.verdict || 'ok').padEnd(5)} +${String(s.added).padStart(3)} lines, ${String(s.prose).padStart(4)} words  ${s.title}${s.file ? `  (${s.file})` : ''}`);
  }
}
for (const l of lessons) if (Object.keys(l).length && (l.missing.length || false)) ledger++;
const declared = shown.filter((l) => l.steps && fs.readFileSync(path.join(dir, `${l.id}.md`), 'utf8').match(/^teaches:/m)).length;
console.log(`\n${shown.length} lessons: ${dumps} dump steps (>${DUMP} lines), ${bigs} big steps (>${WARN}), ${thins} thinly explained (<${THIN} words a line);`);
console.log(`${tables} steps adding a function without an inputs-and-returns table; ${explainGaps} missing explanation parts (story so far, what it builds, what tests protect);`);
console.log(`${noPredict} without a prediction, ${noTurn} without a Your turn, ${noExperiment} without an experiment; concept ledger declared in ${declared}, ${missingConcepts} concepts used before taught.`);
process.exitCode = dumps || missingConcepts ? 1 : 0;
