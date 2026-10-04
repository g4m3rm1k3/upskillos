// Walks the "Reinforcement Learning in pygame" track the way a learner would, in a fresh
// temporary project folder: the commands each lesson tells the learner to run are run in
// PowerShell (making the .venv and installing requirements.txt from PyPI), every step's file is
// typed in (its target content written), supplied files are created as the lesson's button
// would, and then every check on the step must pass.
//
// Then, for steps with checks, deliberately wrong answers are tried on a copy of the project
// as it was at that step, and the named checks must FAIL. A check that passes a wrong answer
// is a bug in the lesson.
//
// Needs Windows (the lessons' commands are PowerShell), Python 3.12 or newer on PATH, and
// network access for pip. The first run takes a few minutes.
import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRACKS, getSupportFiles } from './trackLoader.js';
import { isCorrect } from './predictions.js';
import { WALKTHROUGH } from './tracks/rl-pygame.walkthrough.js';

const require = createRequire(import.meta.url);
const { runChecks, shellRun } = require('../../../desktop/app/project-checks.cjs');
const { shellEnv } = require('../../../desktop/app/terminal.cjs');

const isWindows = process.platform === 'win32';
const lessons = TRACKS['rl-pygame'] ?? [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-pygame-walk-'));
const project = path.join(tmp, 'rl-workbench');
fs.mkdirSync(project);

afterAll(() => {
  try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
});

let baseEnv;
async function getEnv() {
  // No __pycache__: Python treats cached bytecode as current when the source's modification
  // time (in whole seconds) and size match, so a wrong answer that changes a file within the
  // same second, to text of the same length, could otherwise be checked as the old code.
  if (!baseEnv) baseEnv = { ...(await shellEnv()), PYTHONDONTWRITEBYTECODE: '1' };
  return baseEnv;
}

// Do what the learner does for a step: create supplied files, type its file, run its commands.
async function perform(dir, lesson, step, action = {}) {
  if (step.provided && lesson.meta.support && action.typeFile !== false) {
    for (const { file, content } of getSupportFiles('rl-pygame', lesson.meta.support)) {
      const abs = path.join(dir, file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    }
  }
  if (step.file && step.target != null && action.typeFile !== false) {
    const abs = path.join(dir, step.file);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, step.target + '\n');
  }
  if (action.edit) {
    let content = step.target + '\n';
    for (const [from, to] of action.edit) {
      if (!content.includes(from)) throw new Error(`Walkthrough edit not found in ${step.file}: ${from}`);
      content = content.replace(from, to);
    }
    fs.writeFileSync(path.join(dir, step.file), content);
  }
  // files: { path: content } written as they are (a wrong answer's version of a whole file).
  for (const [rel, content] of Object.entries(action.files ?? {})) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  for (const cmd of action.run ?? []) {
    const r = await shellRun(cmd, { cwd: dir, env: await getEnv(), timeoutMs: 600000 });
    if (r.code !== 0 && !action.allowFailure) throw new Error(`Walkthrough command failed: ${cmd}\n${r.stdout}\n${r.stderr}`);
  }
}

// A copy of the project for a wrong answer. Copying .venv for every wrong answer would copy
// over 100 MB each time, so the copy links to the real one unless the wrong answer changes it.
function copyProject(dest, { copyVenv = false } = {}) {
  const venv = path.join(project, '.venv');
  const link = fs.existsSync(venv) && !copyVenv;
  fs.cpSync(project, dest, { recursive: true, filter: (src) => !(link && src === venv) });
  if (link) fs.symlinkSync(venv, path.join(dest, '.venv'), 'junction');
}

function removeCopy(dir) {
  // Remove a junction itself, never what it points to.
  const venv = path.join(dir, '.venv');
  try { if (fs.lstatSync(venv).isSymbolicLink()) fs.unlinkSync(venv); } catch {}
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
}

function describeResults(checks, results) {
  return results.map((r, i) => `${r.pass ? 'PASS' : 'FAIL'} ${checks[i].label}${r.pass ? '' : `\n     ${String(r.detail).split('\n').join('\n     ')}`}`).join('\n');
}

describe.skipIf(!isWindows)('Reinforcement Learning in pygame walkthrough', () => {
  it('has lessons, and every walkthrough entry names a real step', () => {
    expect(lessons.length).toBeGreaterThan(0);
    const keys = new Set(lessons.flatMap((l) => l.steps.map((s) => `${l.id.split('/')[1]}#${s.title}`)));
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

  it('changes one file per step', () => {
    for (const lesson of lessons) {
      for (const step of lesson.steps) expect(step.extraTargets ?? [], `${lesson.title} / ${step.title}`).toEqual([]);
    }
  });

  for (const lesson of lessons) {
    const lessonKey = lesson.id.split('/')[1];
    it(`${lesson.title}`, async () => {
      for (const step of lesson.steps) {
        const action = WALKTHROUGH[`${lessonKey}#${step.title}`] ?? {};
        const checks = step.checks;

        for (const wrong of action.wrong ?? []) {
          const copy = path.join(tmp, `wrong-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
          copyProject(copy, wrong);
          try {
            await perform(copy, lesson, step, { typeFile: false, ...wrong, allowFailure: true });
            const res = await runChecks(copy, checks, { env: await getEnv() });
            const failed = res.results.map((r, i) => (r.pass ? null : i)).filter((i) => i != null);
            for (const i of wrong.fails) {
              expect(failed, `${lesson.title} / ${step.title}: wrong answer "${wrong.name}" should fail check "${checks[i]?.label}"\n${describeResults(checks, res.results)}`).toContain(i);
            }
          } finally {
            removeCopy(copy);
          }
        }

        await perform(project, lesson, step, action);
        if (checks.length) {
          const res = await runChecks(project, checks, { env: await getEnv() });
          expect(res.results.every((r) => r.pass), `${lesson.title} / ${step.title}\n${describeResults(checks, res.results)}`).toBe(true);
        }
        // A prediction's stated answer must be what the code really does: the last line its
        // verify command prints is marked as if the learner had typed it.
        for (const p of step.predictions ?? []) {
          if (!p.verify) continue;
          // `verify: script name.py` runs tracks/rl-pygame/verify/name.py inside the project.
          const script = p.verify.match(/^script (\S+\.py)$/)?.[1];
          let command = p.verify;
          if (script) {
            fs.copyFileSync(new URL(`./tracks/rl-pygame/verify/${script}`, import.meta.url), path.join(project, `_verify_${script}`));
            command = `.venv/Scripts/python _verify_${script}`;
          }
          const r = await shellRun(command, { cwd: project, env: await getEnv(), timeoutMs: 120000 });
          if (script) fs.rmSync(path.join(project, `_verify_${script}`), { force: true });
          const lines = r.stdout.trim().split(/\r?\n/);
          const said = lines[lines.length - 1].trim();
          expect(r.code, `${lesson.title} / ${step.title}: verify for "${p.question}" failed\n${r.stdout}\n${r.stderr}`).toBe(0);
          expect(isCorrect(p, said), `${lesson.title} / ${step.title}: "${p.question}" says ${p.answer}, but the code printed ${said}`).toBe(true);
        }
      }
    }, 900000);
  }
});
