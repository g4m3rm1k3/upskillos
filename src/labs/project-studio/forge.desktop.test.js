// Walks the Forge series (every forge-* track, in order) the way a learner would, in one fresh
// temporary project folder: the commands each lesson tells the learner to run are run in
// PowerShell, every step's file is typed in (its target content written), the reference answer
// to each step with no code shown is written, and then every check on the step must pass.
//
// Then, for steps with checks, deliberately wrong answers are tried on a copy of the project
// as it was at that step, and the named checks must FAIL. A check that passes a wrong answer
// is a bug in the lesson. Every prediction's verify command must print its stated answer.
//
// Needs Windows (the lessons' commands are PowerShell) and Python 3.12 or newer on PATH.
import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRACKS, TRACK_KEYS } from './trackLoader.js';
import { isCorrect } from './predictions.js';
import { WALKTHROUGH } from './tracks/forge.walkthrough.js';

const require = createRequire(import.meta.url);
const { runChecks, shellRun } = require('../../../desktop/app/project-checks.cjs');
const { shellEnv } = require('../../../desktop/app/terminal.cjs');

const isWindows = process.platform === 'win32';
const trackKeys = TRACK_KEYS.filter((key) => key.startsWith('forge-'));
const lessons = trackKeys.flatMap((key) => TRACKS[key]);
const keyOf = (lesson, step) => `${lesson.id}#${step.title}`;
// FORGE_WRONG_FROM=<lesson id prefix> tries wrong answers only from that lesson on: earlier
// lessons are still walked (the project needs them), but faster. Unset, everything is tried.
const wrongFromIndex = process.env.FORGE_WRONG_FROM
  ? lessons.findIndex((l) => l.id.startsWith(process.env.FORGE_WRONG_FROM))
  : 0;
const stepsByKey =new Map(lessons.flatMap((l) => l.steps.map((s) => [keyOf(l, s), s])));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-walk-'));
const project = path.join(tmp, 'forge');
fs.mkdirSync(project);

afterAll(() => {
  // FORGE_KEEP=<folder> keeps a copy of the finished project (its .venv and git history included),
  // to measure what a later lesson's commands print in a project that went through every step.
  if (process.env.FORGE_KEEP) {
    fs.rmSync(process.env.FORGE_KEEP, { recursive: true, force: true });
    fs.cpSync(project, process.env.FORGE_KEEP, { recursive: true });
  }
  try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
}, 600000);

// The walkthrough learner starts with no Git settings of their own: `git config --global` writes
// to this file instead of the real user's ~/.gitconfig.
const globalConfig = path.join(tmp, 'learner.gitconfig');
fs.writeFileSync(globalConfig, '');

let baseEnv;
async function getEnv() {
  if (!baseEnv) {
    // No __pycache__, so a wrong answer written within the same second as the right one, at the
    // same length, is never run as the old cached bytecode.
    // SDL's dummy video driver everywhere: a wrong answer that starts the real game (say, an
    // import without the __main__ guard) runs invisibly until its check times out, instead of
    // opening a window on the machine running the walkthrough.
    baseEnv = { ...(await shellEnv()), PYTHONDONTWRITEBYTECODE: '1', SDL_VIDEODRIVER: 'dummy' };
    for (const k of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'GIT_DIR', 'GIT_WORK_TREE']) delete baseEnv[k];
  }
  return { ...baseEnv, GIT_CONFIG_GLOBAL: globalConfig, GIT_PAGER: 'cat' };
}

function write(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

async function runCommands(dir, commands, action) {
  for (const cmd of commands) {
    const r = await shellRun(cmd, { cwd: dir, env: await getEnv(), timeoutMs: 600000 });
    if (r.code !== 0 && !action.allowFailure) throw new Error(`Walkthrough command failed: ${cmd}\n${r.stdout}\n${r.stderr}`);
  }
}

// Do what the learner does for a step: run the commands that come first (before:), type its file,
// write their own files, then run its commands.
async function perform(dir, step, action = {}) {
  await runCommands(dir, action.before ?? [], action);
  if (step.file && step.target != null && action.typeFile !== false) write(dir, step.file, step.target + '\n');
  if (action.edit) {
    let content = step.target + '\n';
    for (const [from, to] of action.edit) {
      if (!content.includes(from)) throw new Error(`Walkthrough edit not found in ${step.file}: ${from}`);
      content = content.replace(from, to);
    }
    write(dir, step.file, content);
  }
  // targetOf: a later step's key; that step's file is written now (a Your turn answer, shown in
  // full by the step after it).
  for (const key of [action.targetOf ?? []].flat()) {
    const later = stepsByKey.get(key);
    if (!later?.file) throw new Error(`Walkthrough targetOf names no step with a file: ${key}`);
    write(dir, later.file, later.target + '\n');
  }
  for (const [rel, content] of Object.entries(action.files ?? {})) write(dir, rel, content);
  // editFiles: { rel: [[from, to], ...] } applied to a file as it is in the project now.
  for (const [rel, pairs] of Object.entries(action.editFiles ?? {})) {
    // git restore on Windows writes CRLF line endings (core.autocrlf), as it does for a learner.
    let content = fs.readFileSync(path.join(dir, rel), 'utf8').replace(/\r\n/g, '\n');
    // A third item 'all' replaces every occurrence instead of the first.
    for (const [from, to, every] of pairs) {
      if (!content.includes(from)) throw new Error(`Walkthrough edit not found in ${rel}: ${from}`);
      content = every === 'all' ? content.replaceAll(from, to) : content.replace(from, to);
    }
    write(dir, rel, content);
  }
  await runCommands(dir, action.run ?? [], action);
}

// A copy of the project for a wrong answer. It links to the real .venv instead of copying it
// (tens of megabytes for every wrong answer); no wrong answer changes installed packages.
function copyProject(dest) {
  const venv = path.join(project, '.venv');
  const link = fs.existsSync(venv);
  fs.cpSync(project, dest, { recursive: true, filter: (src) => !(link && src === venv) });
  if (link) fs.symlinkSync(venv, path.join(dest, '.venv'), 'junction');
}

// Remove a copy: the junction itself, never what it points to. A check that timed out can leave
// its program running for a moment with files open; whatever can't be removed now goes with the
// whole temporary folder at the end.
function removeCopy(dir) {
  const venv = path.join(dir, '.venv');
  try { if (fs.lstatSync(venv).isSymbolicLink()) fs.unlinkSync(venv); } catch {}
  try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
}

function describeResults(checks, results) {
  return results.map((r, i) => `${r.pass ? 'PASS' : 'FAIL'} ${checks[i].label}${r.pass ? '' : `\n     ${String(r.detail).split('\n').join('\n     ')}`}`).join('\n');
}

describe.skipIf(!isWindows)('Forge walkthrough', () => {
  it('has lessons, and every walkthrough entry names a real step', () => {
    expect(lessons.length).toBeGreaterThan(0);
    const keys = new Set(lessons.flatMap((l) => l.steps.map((s) => keyOf(l, s))));
    for (const key of Object.keys(WALKTHROUGH)) expect(keys, `walkthrough key "${key}"`).toContain(key);
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

  it('gives every lesson a Your turn step with checks, hints and no code shown', () => {
    for (const lesson of lessons) {
      const yours = lesson.steps.filter((s) => /^Your turn\b/i.test(s.title));
      expect(yours.length, `${lesson.title} has no Your turn step`).toBeGreaterThan(0);
      for (const step of yours) {
        // A provided file (a bug report written as tests, say) may be shown; the answer may not.
        if (!step.provided) expect(step.target, `${lesson.title} / ${step.title} shows code`).toBeNull();
        expect(step.checks.length, `${lesson.title} / ${step.title} has no checks`).toBeGreaterThan(0);
        expect(step.hints?.length, `${lesson.title} / ${step.title} has no hints`).toBeGreaterThan(0);
        expect(WALKTHROUGH[keyOf(lesson, step)]?.wrong?.length, `${lesson.title} / ${step.title} has no wrong answers`).toBeGreaterThan(0);
      }
    }
  });

  it('changes one file per step', () => {
    for (const lesson of lessons) {
      for (const step of lesson.steps) expect(step.extraTargets ?? [], `${lesson.title} / ${step.title}`).toEqual([]);
    }
  });

  for (const lesson of lessons) {
    it(`${lesson.id}: ${lesson.title}`, async () => {
      for (const step of lesson.steps) {
        const action = WALKTHROUGH[keyOf(lesson, step)] ?? {};
        const checks = step.checks;

        const tryWrong = lessons.indexOf(lesson) >= wrongFromIndex;
        for (const wrong of tryWrong ? action.wrong ?? [] : []) {
          const copy = path.join(tmp, `wrong-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
          copyProject(copy);
          try {
            await perform(copy, step, { typeFile: false, ...wrong, allowFailure: true });
            const res = await runChecks(copy, checks, { env: await getEnv() });
            const failed = res.results.map((r, i) => (r.pass ? null : i)).filter((i) => i != null);
            for (const i of wrong.fails) {
              expect(failed, `${lesson.title} / ${step.title}: wrong answer "${wrong.name}" should fail check "${checks[i]?.label}"\n${describeResults(checks, res.results)}`).toContain(i);
            }
          } finally {
            removeCopy(copy);
          }
        }

        await perform(project, step, action);
        if (checks.length) {
          const res = await runChecks(project, checks, { env: await getEnv() });
          expect(res.results.every((r) => r.pass), `${lesson.title} / ${step.title}\n${describeResults(checks, res.results)}`).toBe(true);
        }
        // A prediction's stated answer must be what the code really does: the last line its
        // verify command prints is marked as if the learner had typed it.
        for (const p of step.predictions ?? []) {
          if (!p.verify) continue;
          const r = await shellRun(p.verify, { cwd: project, env: await getEnv(), timeoutMs: 120000 });
          const lines = r.stdout.trim().split(/\r?\n/);
          const said = lines[lines.length - 1].trim();
          expect(r.code, `${lesson.title} / ${step.title}: verify for "${p.question}" failed\n${r.stdout}\n${r.stderr}`).toBe(0);
          expect(isCorrect(p, said), `${lesson.title} / ${step.title}: "${p.question}" says ${p.answer}, but the code printed ${said}`).toBe(true);
        }
      }
    }, 900000);
  }
});
