#!/usr/bin/env node
// Reconstruct the authored learner projects and execute actual Project Studio checks.
// Dependencies are opt-in: pass a folder with the final lesson's npm install completed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { parseLesson } from '../src/labs/project-studio/parseTrack.js';
import { parseCheckLine } from '../src/labs/project-studio/checks.js';
import { isCorrect } from '../src/labs/project-studio/predictions.js';
import { WALKTHROUGH } from '../src/labs/project-studio/tracks/frontend.walkthrough.js';

const require = createRequire(import.meta.url);
const { runChecks, shellRun } = require('../desktop/app/project-checks.cjs');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tracks = path.join(repo, 'src/labs/project-studio/tracks');
const lessons = fs.readdirSync(tracks).filter(name => name.startsWith('frontend-') && fs.statSync(path.join(tracks, name)).isDirectory())
  .flatMap(track => fs.readdirSync(path.join(tracks, track)).filter(name => name.endsWith('.md')).map(name => parseLesson(fs.readFileSync(path.join(tracks, track, name), 'utf8'), `${track}/${name.slice(0, -3)}`)))
  .sort((a, b) => Number(a.meta.trackOrder) - Number(b.meta.trackOrder) || a.id.localeCompare(b.id));
const dependencies = process.argv[2];
if (!dependencies || !fs.existsSync(path.resolve(dependencies, 'node_modules/vite/bin/vite.js'))) {
  console.error('Usage: node scripts/check-frontend-bootcamp.mjs <learner-dependencies-folder> [--keep]');
  console.error('Install the frontend-production package.json target in that folder first. No install runs implicitly.');
  process.exit(1);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-bootcamp-'));
const project = path.join(tmp, 'portfolio');
fs.mkdirSync(project);
fs.symlinkSync(path.resolve(dependencies, 'node_modules'), path.join(project, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
let browser;
let checksRun = 0;
let wrongRun = 0;
let predictionsRun = 0;
function write(root, file, content) {
  const dest = path.resolve(root, file);
  assert(dest.startsWith(root + path.sep), `Unsafe walkthrough file: ${file}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
}
async function evalInPage(target, expression, { timeoutMs = 15000 } = {}) {
  const context = await browser.newContext({ colorScheme: 'light' });
  const page = await context.newPage();
  const errors = [], logs = [];
  let timer;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => logs.push(message.text()));
  try {
    // No check should rely on a live API; expressions install controlled fetch fixtures.
    await page.route('https://openlibrary.org/**', route => route.abort());
    await page.goto(target.startsWith('http') ? target : pathToFileURL(target).href);
    await page.waitForTimeout(150);
    const value = await Promise.race([
      page.evaluate(`(async () => (${expression}))()`),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Page check timed out')), timeoutMs); }),
    ]);
    return { ok: true, value: value ?? null, errors, logs };
  } catch (error) { return { ok: false, reason: error.message, errors, logs }; }
  finally { clearTimeout(timer); await context.close(); }
}
try {
  browser = await chromium.launch();
  for (const lesson of lessons) {
    for (const step of lesson.steps) {
      const key = `${lesson.id}#${step.title}`;
      const action = WALKTHROUGH[key] ?? {};
      // Wrong answers start from the learner state BEFORE this step, matching walkSeries.
      for (const wrong of action.wrong ?? []) {
        const copy = path.join(tmp, 'wrong');
        fs.cpSync(project, copy, { recursive: true, filter: source => !['node_modules', 'dist'].includes(path.basename(source)) });
        fs.symlinkSync(path.resolve(dependencies, 'node_modules'), path.join(copy, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
        try {
          for (const [file, content] of Object.entries(wrong.files ?? {})) write(copy, file, content);
          const result = await runChecks(copy, step.checks, { evalInPage });
          for (const index of wrong.fails) {
            assert.equal(result.results[index]?.pass, false, `${key}: wrong answer '${wrong.name}' passed check ${index}`);
            wrongRun++;
          }
        } finally { fs.rmSync(copy, { recursive: true, force: true }); }
      }
      if (step.file && step.target != null) write(project, step.file, step.target + '\n');
      for (const [file, content] of Object.entries(action.files ?? {})) write(project, file, content);
      // Setup is explicit: the supplied dependency folder and separately installed
      // Playwright browser replace repeated network installation during reconstruction.
      assert((action.run ?? []).every(command => ['npm install', 'npx playwright install chromium'].includes(command)), `Unhandled setup command at ${key}`);
      for (const prediction of step.predictions) {
        if (!prediction.verify) continue;
        if (prediction.verify.startsWith('page ')) {
          const check = parseCheckLine(`${prediction.verify} ${JSON.stringify(String(prediction.answer))}`);
          const result = await runChecks(project, [check], { evalInPage });
          assert.equal(result.results[0]?.pass, true, `${key}: prediction disagrees with page\n${result.results[0]?.detail}`);
        } else {
          const result = await shellRun(prediction.verify, { cwd: project, env: process.env, timeoutMs: 15000 });
          assert.equal(result.code, 0, `${key}: prediction verification failed\n${result.stderr}`);
          assert(isCorrect(prediction, result.stdout.trim().split(/\r?\n/).at(-1)), `${key}: prediction answer disagrees with execution`);
        }
        predictionsRun++;
      }
      if (!step.checks.length) continue;
      const result = await runChecks(project, step.checks, { evalInPage });
      for (const [index, check] of step.checks.entries()) {
        assert.equal(result.results[index]?.pass, true, `${key}\n${check.label}\n${result.results[index]?.detail}`);
        checksRun++;
      }
    }
    console.log(`PASS ${lesson.id}`);
  }
  console.log(`Frontend walkthrough: ${lessons.length} lessons, ${checksRun} positive checks, ${wrongRun} wrong-answer checks, ${predictionsRun} executable predictions passed.`);
  if (process.argv.includes('--keep')) console.log(`Reconstructed portfolio: ${project}`);
} finally {
  await browser?.close();
  if (!process.argv.includes('--keep')) fs.rmSync(tmp, { recursive: true, force: true });
}
