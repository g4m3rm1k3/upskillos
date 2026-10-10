// walkSeries.js
// The walkthrough test for a Project Studio series, shared by every series that uses it. A series'
// test file is a few lines (frontier.desktop.test.js is the model):
//
//   import { walkSeries } from './walkSeries.js';
//   import { WALKTHROUGH } from './tracks/chess.walkthrough.js';
//   walkSeries({ name: 'Chess', prefix: 'chess-', walkthrough: WALKTHROUGH });
//
// It walks the series (every track whose key starts with `prefix`, in order) the way a learner
// would, in one fresh temporary project folder: the commands each step tells the learner to run are
// run in PowerShell, every step's file is typed in (its target content written), supplied files
// are created as the lesson's button would, each Your turn answer is written, and then every check
// on the step must pass.
//
// Then, for steps with checks, deliberately wrong answers are tried on a copy of the project as it
// was at that step, and the named checks must FAIL. A check that passes a wrong answer is a bug in
// the lesson. Every prediction's verify command must print its stated answer.
//
// Needs Windows (the lessons' commands are PowerShell). The guide is
// docs/contributing/project-studio-series.md.
//
// Environment variables, named <envPrefix>_... (envPrefix defaults to WALK):
//   _UNTIL=<lesson id prefix>  stop after that lesson
//   _KEEP=<folder>             keep a copy of the finished project there
//   _START=<that folder> with _FROM=<lesson id prefix>  start from a kept project, skipping the
//                              lessons before _FROM
//
// Options for series that need them (spreadsheet-build uses both):
//   pages: true        `page` checks run in Playwright's Chromium, standing in for the app's hidden
//                      window (both are Chromium).
//   isolatedGit: true  the learner starts with no Git settings of their own: `git config --global`
//                      writes to a file in the temporary folder, never the real ~/.gitconfig. GitHub
//                      is a bare repository there too, written {BARE} in walkthrough commands. _KEEP
//                      keeps both beside the project (<folder>.gitconfig, <folder>.github.git) and
//                      _START brings them back.
import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TRACKS, TRACK_KEYS, getSupportFiles } from './trackLoader.js';
import { isCorrect } from './predictions.js';
import { parseCheckLine } from './checks.js';

const require = createRequire(import.meta.url);
const { runChecks, shellRun } = require('../../../desktop/app/project-checks.cjs');
const { shellEnv } = require('../../../desktop/app/terminal.cjs');

const keyOf = (lesson, step) => `${lesson.id}#${step.title}`;

function write(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function describeResults(checks, results) {
  return results.map((r, i) => `${r.pass ? 'PASS' : 'FAIL'} ${checks[i].label}${r.pass ? '' : `\n     ${String(r.detail).split('\n').join('\n     ')}`}`).join('\n');
}

function removeCopy(dir) {
  // Remove a junction itself, never what it points to.
  const venv = path.join(dir, '.venv');
  try { if (fs.lstatSync(venv).isSymbolicLink()) fs.unlinkSync(venv); } catch {}
  try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
}

/**
 * Define the walkthrough tests for one series.
 * @param {object} options
 * @param {string} options.name          the series' name, for test titles
 * @param {string} options.prefix        track keys that start with this belong to the series
 * @param {object} options.walkthrough   the series' WALKTHROUGH (tracks/<series>.walkthrough.js)
 * @param {string} [options.envPrefix]   prefix of the UNTIL/KEEP/START/FROM variables (default WALK)
 * @param {string} [options.projectName] the project folder's name (default: prefix without its dash)
 * @param {boolean} [options.pages]       run `page` checks in Playwright's Chromium
 * @param {boolean} [options.isolatedGit] a Git identity and a GitHub of the walkthrough's own
 */
export function walkSeries({ name, prefix, walkthrough: WALKTHROUGH, envPrefix = 'WALK', projectName = prefix.replace(/-$/, ''), pages = false, isolatedGit = false }) {
  const env = (key) => process.env[`${envPrefix}_${key}`];
  const isWindows = process.platform === 'win32';
  const trackKeys = TRACK_KEYS.filter((key) => key.startsWith(prefix));
  const lessons = trackKeys.flatMap((key) => TRACKS[key].map((lesson) => ({ ...lesson, track: key })));
  const untilIndex = env('UNTIL') ? lessons.findIndex((l) => l.id.startsWith(env('UNTIL'))) : lessons.length - 1;
  const fromIndex = env('START') && env('FROM') ? lessons.findIndex((l) => l.id.startsWith(env('FROM'))) : 0;

  let tmp;
  let project;
  let globalConfig;
  let bare;
  // Made on first use, so a test file that is only collected (or skipped) leaves no folder behind.
  async function setUp() {
    if (project) return;
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), `${projectName}-walk-`));
    project = path.join(tmp, projectName);
    fs.mkdirSync(project);
    if (isolatedGit) {
      globalConfig = path.join(tmp, 'learner.gitconfig');
      bare = path.join(tmp, 'github.git').replace(/\\/g, '/');
      const kept = fromIndex > 0 ? env('START') : null;
      fs.writeFileSync(globalConfig, kept && fs.existsSync(`${kept}.gitconfig`) ? fs.readFileSync(`${kept}.gitconfig`) : '');
      if (kept && fs.existsSync(`${kept}.github.git`)) fs.cpSync(`${kept}.github.git`, bare, { recursive: true });
      else {
        const r = await shellRun(`git init -q --bare "${bare}"`, { cwd: tmp, env: await getEnv(), timeoutMs: 30000 });
        if (r.code !== 0) throw new Error(`Couldn't make the bare repository: ${r.stderr}`);
      }
    }
    if (fromIndex > 0) {
      fs.cpSync(env('START'), project, { recursive: true });
      // A kept project's origin names the kept run's bare repository: point it at this run's.
      if (isolatedGit) await shellRun(`if (git remote) { git remote set-url origin "${bare}" }`, { cwd: project, env: await getEnv(), timeoutMs: 30000 });
      // A kept .venv's editable install names the kept project's old src folder: point it here.
      const site = path.join(project, '.venv', 'Lib', 'site-packages');
      if (fs.existsSync(site)) {
        for (const file of fs.readdirSync(site).filter((n) => /^__editable__.*\.pth$/.test(n))) {
          fs.writeFileSync(path.join(site, file), path.join(project, 'src') + '\n');
        }
      }
    }
  }

  afterAll(() => {
    if (!project) return;
    if (env('KEEP')) {
      fs.rmSync(env('KEEP'), { recursive: true, force: true });
      fs.cpSync(project, env('KEEP'), { recursive: true });
      if (isolatedGit) {
        fs.copyFileSync(globalConfig, `${env('KEEP')}.gitconfig`);
        fs.rmSync(`${env('KEEP')}.github.git`, { recursive: true, force: true });
        fs.cpSync(bare, `${env('KEEP')}.github.git`, { recursive: true });
      }
    }
    try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
  }, 600000);

  let baseEnv;
  async function getEnv(configFile = globalConfig) {
    const base = await getBaseEnv();
    return isolatedGit ? { ...base, GIT_CONFIG_GLOBAL: configFile } : base;
  }
  async function getBaseEnv() {
    // No __pycache__: a wrong answer written within the same second as the right one, at the same
    // length, must never run as the old cached bytecode. No GPU and two threads for maths
    // libraries, so the machine running the test stays responsive.
    if (!baseEnv) {
      baseEnv = {
        ...(await shellEnv()), PYTHONDONTWRITEBYTECODE: '1', CUDA_VISIBLE_DEVICES: '',
        OMP_NUM_THREADS: '2', MKL_NUM_THREADS: '2', OPENBLAS_NUM_THREADS: '2', TORCH_NUM_THREADS: '2',
      };
      if (isolatedGit) {
        baseEnv.GIT_PAGER = 'cat';
        for (const k of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'GIT_DIR', 'GIT_WORK_TREE']) delete baseEnv[k];
      }
    }
    return baseEnv;
  }

  // `page` checks: Playwright's Chromium loads the learner's page, as the app's hidden window does.
  let browser;
  async function evalInPage(target, expr, { timeoutMs = 15000 } = {}) {
    if (!browser) browser = await require('playwright').chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    const logs = [];
    page.on('console', (m) => { logs.push(m.text()); if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => { logs.push(String(e.message)); errors.push(String(e.message)); });
    try {
      const url = /^https?:\/\//.test(target) ? target : pathToFileURL(target).href;
      try {
        await page.goto(url, { timeout: timeoutMs });
      } catch (e) {
        return { ok: false, reason: `The page didn't load: ${e.message}`, errors, logs };
      }
      await page.waitForTimeout(50);
      try {
        const value = await page.evaluate(`(async () => (${expr}))()`);
        return { ok: true, value: value === undefined ? null : value, errors, logs };
      } catch (e) {
        return { ok: false, reason: `Checking \`${expr}\` on the page failed: ${String(e.message).split('\n')[0]}`, errors, logs };
      }
    } finally {
      await page.close();
    }
  }
  afterAll(async () => { await browser?.close(); });
  const checkOptions = (checkEnv) => ({ env: checkEnv, ...(pages ? { evalInPage } : {}) });

  async function runCommands(dir, commands, action) {
    for (const raw of commands) {
      const cmd = isolatedGit ? raw.replaceAll('{BARE}', bare) : raw;
      const r = await shellRun(cmd, { cwd: dir, env: action.env ?? await getEnv(), timeoutMs: 1200000 });
      if (r.code !== 0 && !action.allowFailure) throw new Error(`Walkthrough command failed: ${cmd}\n${r.stdout}\n${r.stderr}`);
    }
  }

  // Do what the learner does for a step: run any commands that come first (`before`, such as
  // switching branch before editing), create supplied files, type its file, write their own files
  // (a Your turn answer), then run its commands.
  async function perform(dir, lesson, step, action = {}) {
    await runCommands(dir, action.before ?? [], action);
    if (step.provided && lesson.meta.support && action.typeFile !== false) {
      for (const { file, content } of getSupportFiles(lesson.track, lesson.meta.support)) write(dir, file, content);
    }
    if (step.file && step.target != null && action.typeFile !== false) write(dir, step.file, step.target + '\n');
    if (action.edit) {
      let content = step.target + '\n';
      for (const [from, to] of action.edit) {
        if (!content.includes(from)) throw new Error(`Walkthrough edit not found in ${step.file}: ${from}`);
        content = content.replace(from, to);
      }
      write(dir, step.file, content);
    }
    for (const [rel, content] of Object.entries(action.files ?? {})) write(dir, rel, content);
    // editFiles: { rel: [[from, to], ...] } applied to a file as it is in the project now.
    for (const [rel, pairs] of Object.entries(action.editFiles ?? {})) {
      let content = fs.readFileSync(path.join(dir, rel), 'utf8');
      for (const [from, to] of pairs) {
        if (!content.includes(from)) throw new Error(`Walkthrough edit not found in ${rel}: ${from}`);
        content = content.replace(from, to);
      }
      write(dir, rel, content);
    }
    await runCommands(dir, action.run ?? [], action);
  }

  // A copy of the project for a wrong answer, linking to the real .venv instead of copying it.
  function copyProject(dest, { copyVenv = false } = {}) {
    const venv = path.join(project, '.venv');
    const link = fs.existsSync(venv) && !copyVenv;
    fs.cpSync(project, dest, { recursive: true, filter: (src) => !(link && src === venv) });
    if (link) fs.symlinkSync(venv, path.join(dest, '.venv'), 'junction');
  }

  describe.skipIf(!isWindows)(`${name} walkthrough`, () => {
    it('has lessons, and every walkthrough entry names a real step', () => {
      expect(lessons.length).toBeGreaterThan(0);
      const keys = new Set(lessons.flatMap((l) => l.steps.map((s) => keyOf(l, s))));
      for (const key of Object.keys(WALKTHROUGH)) expect(keys, `walkthrough key "${key}"`).toContain(key);
      // A wrong answer must name checks the step has: an index past the end can never fail.
      const steps = new Map(lessons.flatMap((l) => l.steps.map((s) => [keyOf(l, s), s])));
      for (const [key, action] of Object.entries(WALKTHROUGH)) {
        for (const wrong of action.wrong ?? []) {
          expect(wrong.fails.length, `${key}: "${wrong.name}" names no checks`).toBeGreaterThan(0);
          for (const i of wrong.fails) expect(i, `${key}: "${wrong.name}" names check ${i}`).toBeLessThan(steps.get(key)?.checks.length ?? 0);
        }
      }
    });

    it('backs every number prediction with a verify command', () => {
      for (const lesson of lessons) {
        for (const step of lesson.steps) {
          for (const p of step.predictions ?? []) {
            if (p.kind === 'number') expect(p.verify, `${lesson.title} / ${step.title}: "${p.question}"`).toBeTruthy();
          }
        }
      }
    });

    it('gives every lesson a Your turn step with checks, hints, wrong answers and no code shown', () => {
      // Up to _UNTIL only, so a series being upgraded lesson by lesson can be walked as far as it's done.
      for (const lesson of lessons.slice(0, untilIndex + 1)) {
        const yours = lesson.steps.filter((s) => /^Your turn\b/i.test(s.title));
        expect(yours.length, `${lesson.title} has no Your turn step`).toBeGreaterThan(0);
        for (const step of yours) {
          if (!step.provided) expect(step.target, `${lesson.title} / ${step.title} shows code`).toBeNull();
          expect(step.checks.length, `${lesson.title} / ${step.title} has no checks`).toBeGreaterThan(0);
          expect(step.hints?.length, `${lesson.title} / ${step.title} has no hints`).toBeGreaterThan(0);
          const action = WALKTHROUGH[keyOf(lesson, step)];
          expect(action?.wrong?.length, `${lesson.title} / ${step.title} has no wrong answers`).toBeGreaterThan(0);
          expect(action?.files ?? action?.editFiles ?? action?.run, `${lesson.title} / ${step.title} has no answer in the walkthrough`).toBeTruthy();
        }
      }
    });

    // pytest -k matches any part of a test's name, and the file's name too: `-k frames` also runs
    // test_tick_waits_for_sixty_frames, and `-k table` on test_qtable.py runs everything. So each
    // step's word must start the names of exactly the tests it means, and appear in no other name.
    it('selects only its own tests with every pytest -k', () => {
      const testFiles = new Map(lessons.flatMap((l) => l.steps).filter((s) => s.provided && /^tests\/test_\w+\.py$/.test(s.file ?? '')).map((s) => [s.file, s.target]));
      for (const lesson of lessons) {
        for (const step of lesson.steps) {
          for (const check of step.checks) {
            const m = String(check.args?.[0] ?? '').match(/pytest -q (tests\/test_\w+\.py) -k (\w+)/);
            if (!m) continue;
            const [, file, word] = m;
            const source = testFiles.get(file);
            expect(source, `${lesson.title} / ${step.title}: ${file} is never provided`).toBeTruthy();
            expect(path.basename(file), `${lesson.title} / ${step.title}: the file name contains "${word}"`).not.toContain(word);
            const names = [...source.matchAll(/^def (test_\w+)/gm)].map((n) => n[1]);
            const selected = names.filter((n) => n.includes(word));
            expect(selected.length, `${lesson.title} / ${step.title}: -k ${word} selects nothing`).toBeGreaterThan(0);
            for (const test of selected) expect(test.startsWith(`test_${word}`), `${lesson.title} / ${step.title}: -k ${word} also selects ${test}`).toBe(true);
          }
        }
      }
    });

    it('changes one file per step', () => {
      for (const lesson of lessons) {
        for (const step of lesson.steps) expect(step.extraTargets ?? [], `${lesson.title} / ${step.title}`).toEqual([]);
      }
    });

    for (const lesson of lessons) {
      const index = lessons.indexOf(lesson);
      it.skipIf(index > untilIndex || index < fromIndex)(`${lesson.id}: ${lesson.title}`, async () => {
        await setUp();
        for (const step of lesson.steps) {
          const action = WALKTHROUGH[keyOf(lesson, step)] ?? {};
          const checks = step.checks;

          for (const wrong of action.wrong ?? []) {
            const copy = path.join(tmp, `wrong-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
            copyProject(copy, wrong);
            // Its own copy of the learner's Git settings, so a wrong answer can't change what the
            // real walkthrough sees.
            const copyConfig = isolatedGit ? `${copy}.gitconfig` : undefined;
            if (copyConfig) fs.copyFileSync(globalConfig, copyConfig);
            try {
              // A shared .venv's editable install points at the real project's src, so the copy's
              // own src goes first on the import path. A copied .venv installs into itself instead,
              // and a wrong answer about installing (pythonPath: false) must see only the .venv.
              const own = wrong.copyVenv || wrong.pythonPath === false;
              const wrongEnv = own ? await getEnv(copyConfig) : { ...(await getEnv(copyConfig)), PYTHONPATH: path.join(copy, 'src') };
              await perform(copy, lesson, step, { typeFile: false, ...wrong, allowFailure: true, env: wrongEnv });
              const res = await runChecks(copy, checks, checkOptions(wrongEnv));
              const failed = res.results.map((r, i) => (r.pass ? null : i)).filter((i) => i != null);
              for (const i of wrong.fails) {
                expect(failed, `${lesson.title} / ${step.title}: wrong answer "${wrong.name}" should fail check "${checks[i]?.label}"\n${describeResults(checks, res.results)}`).toContain(i);
              }
            } finally {
              removeCopy(copy);
              if (copyConfig) fs.rmSync(copyConfig, { force: true });
            }
          }

          await perform(project, lesson, step, action);
          if (checks.length) {
            const res = await runChecks(project, checks, checkOptions(await getEnv()));
            expect(res.results.every((r) => r.pass), `${lesson.title} / ${step.title}\n${describeResults(checks, res.results)}`).toBe(true);
          }
          // A prediction's stated answer must be what the code really does: the last line its verify
          // command prints is marked as if the learner had typed it.
          for (const p of step.predictions ?? []) {
            if (!p.verify) continue;
            // `verify: page <file> "<expression>" [server=static]` (with pages: true) evaluates the
            // expression on the learner's page: it must give the prediction's answer.
            if (pages && p.verify.startsWith('page ')) {
              const check = parseCheckLine(`${p.verify} ${JSON.stringify(String(p.answer))}`);
              const res = await runChecks(project, [check], checkOptions(await getEnv()));
              expect(res.results[0].pass, `${lesson.title} / ${step.title}: "${p.question}" says ${p.answer}, but the page disagrees\n${res.results[0].detail}`).toBe(true);
              continue;
            }
            // `verify: script name.py` runs tracks/<chapter>/verify/name.py inside the project.
            const script = p.verify.match(/^script (\S+\.py)$/)?.[1];
            let command = p.verify;
            if (script) {
              fs.copyFileSync(new URL(`./tracks/${lesson.track}/verify/${script}`, import.meta.url), path.join(project, `_verify_${script}`));
              command = `${fs.existsSync(path.join(project, '.venv')) ? '.venv/Scripts/python' : 'python'} _verify_${script}`;
            }
            const r = await shellRun(command, { cwd: project, env: await getEnv(), timeoutMs: 600000 });
            if (script) fs.rmSync(path.join(project, `_verify_${script}`), { force: true });
            const lines = r.stdout.trim().split(/\r?\n/);
            const said = lines[lines.length - 1].trim();
            expect(r.code, `${lesson.title} / ${step.title}: verify for "${p.question}" failed\n${r.stdout}\n${r.stderr}`).toBe(0);
            expect(isCorrect(p, said), `${lesson.title} / ${step.title}: "${p.question}" says ${p.answer}, but the code printed ${said}`).toBe(true);
          }
        }
      }, 1800000);
    }
  });
}
