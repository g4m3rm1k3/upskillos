// Walks every chapter of "Machine Learning — From Mathematics to Production" (the ml-* tracks) the
// way a learner would, each chapter in a fresh temporary project folder: the commands a lesson
// tells the learner to run are run in the terminal (making the .venv and installing
// requirements.txt from PyPI), every step's file is typed in (its target content written),
// supplied files are created as the lesson's button would, and then every check on the step
// must pass.
//
// Then, for steps with checks, deliberately wrong answers are tried on a copy of the project
// as it was at that step, and the named checks must FAIL. A check that passes a wrong answer
// is a bug in the lesson. Every number prediction's `verify:` command must print its answer.
//
// The lessons are written for Windows PowerShell. On Windows this runs whenever the tests run.
// On macOS and Linux it runs only when ML_WALKTHROUGH_PYTHON names a Python 3.12 or newer:
//
//   ML_WALKTHROUGH_PYTHON=python3.13 SHELL=/bin/bash npx vitest run src/labs/project-studio/mlProduction.desktop.test.js
//
// There, `python` at the start of a command means that Python, backslashes in commands become
// slashes, an entry's `posix:` commands replace its PowerShell `run:`, and .venv/Scripts is made
// a link to .venv/bin so the lessons' `.venv/Scripts/python` works unchanged.
// ML_WALKTHROUGH_TRACK=ml-data limits the run to one chapter. Needs network access for pip.
import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRACKS, TRACK_KEYS, getSupportFiles } from './trackLoader.js';
import { isCorrect } from './predictions.js';

const require = createRequire(import.meta.url);
const { runChecks, shellRun } = require('../../../desktop/app/project-checks.cjs');
const { shellEnv } = require('../../../desktop/app/terminal.cjs');

const WALKTHROUGHS = import.meta.glob('./tracks/ml-*.walkthrough.js', { eager: true });
const isWindows = process.platform === 'win32';
const posixPython = process.env.ML_WALKTHROUGH_PYTHON;
const enabled = isWindows || Boolean(posixPython);
const only = process.env.ML_WALKTHROUGH_TRACK;
const trackKeys = TRACK_KEYS.filter((key) => key.startsWith('ml-') && (!only || key === only));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-production-walk-'));
afterAll(() => {
  try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
});

let baseEnv;
async function getEnv() {
  if (!baseEnv) baseEnv = await shellEnv();
  return baseEnv;
}

// A lesson command, as this platform's terminal would need it typed.
function localCommand(cmd) {
  if (isWindows) return cmd;
  return cmd.replace(/\\/g, '/').replace(/^python(?=\s)/, posixPython);
}

function localChecks(checks) {
  if (isWindows) return checks;
  return checks.map((c) => (c.kind === 'run' ? { ...c, args: [localCommand(c.args[0]), ...c.args.slice(1)] } : c));
}

// On macOS and Linux a venv's programs are in bin/, not Scripts/.
function linkScripts(dir) {
  if (isWindows) return;
  const venv = path.join(dir, '.venv');
  if (fs.existsSync(path.join(venv, 'bin')) && !fs.existsSync(path.join(venv, 'Scripts'))) fs.symlinkSync('bin', path.join(venv, 'Scripts'));
}

function writeFile(dir, file, content) {
  const abs = path.join(dir, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

// Do what the learner does for a step: create supplied files, type its file, run its commands.
async function perform(track, dir, lesson, step, action = {}) {
  if (step.provided && action.typeFile !== false) {
    for (const { file, content } of getSupportFiles(track, lesson.meta.support)) writeFile(dir, file, content);
  }
  if (step.file && step.target != null && action.typeFile !== false) writeFile(dir, step.file, step.target + '\n');
  if (action.edit) {
    let content = step.target + '\n';
    for (const [from, to] of action.edit) {
      if (!content.includes(from)) throw new Error(`Walkthrough edit not found in ${step.file}: ${from}`);
      content = content.replace(from, to);
    }
    writeFile(dir, step.file, content);
  }
  for (const [file, content] of Object.entries(action.write ?? {})) writeFile(dir, file, content);
  // patch: { file: [[from, to], ...] } edits a file already in the project.
  for (const [file, edits] of Object.entries(action.patch ?? {})) {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const [from, to] of edits) {
      if (!content.includes(from)) throw new Error(`Walkthrough patch not found in ${file}: ${from}`);
      content = content.replace(from, to);
    }
    writeFile(dir, file, content);
  }
  const commands = !isWindows && action.posix ? action.posix : action.run ?? [];
  for (const cmd of commands) {
    const local = localCommand(cmd);
    const r = await shellRun(local, { cwd: dir, env: await getEnv(), timeoutMs: 900000 });
    if (r.code !== 0 && !action.allowFailure) throw new Error(`Walkthrough command failed: ${local}\n${r.stdout}\n${r.stderr}`);
    linkScripts(dir);
  }
}

// A copy of the project for a wrong answer, sharing the real .venv through a link.
function copyProject(project, dest) {
  const venv = path.join(project, '.venv');
  const link = fs.existsSync(venv);
  fs.cpSync(project, dest, { recursive: true, filter: (src) => !(link && src === venv) });
  if (link) fs.symlinkSync(venv, path.join(dest, '.venv'), isWindows ? 'junction' : 'dir');
}

function removeCopy(dir) {
  const venv = path.join(dir, '.venv');
  try { if (fs.lstatSync(venv).isSymbolicLink()) fs.unlinkSync(venv); } catch {}
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
}

function describeResults(checks, results) {
  return results.map((r, i) => `${r.pass ? 'PASS' : 'FAIL'} ${checks[i].label}${r.pass ? '' : `\n     ${String(r.detail).split('\n').join('\n     ')}`}`).join('\n');
}

describe('Machine Learning — From Mathematics to Production: lesson structure', () => {
  const all = trackKeys.flatMap((key) => TRACKS[key].map((lesson) => ({ key, lesson })));

  it('every chapter has a walkthrough whose entries name real steps', () => {
    expect(trackKeys.length).toBeGreaterThan(0);
    for (const key of trackKeys) {
      const walk = WALKTHROUGHS[`./tracks/${key}.walkthrough.js`]?.WALKTHROUGH;
      expect(walk, `tracks/${key}.walkthrough.js`).toBeTruthy();
      const steps = new Set(TRACKS[key].flatMap((l) => l.steps.map((s) => `${l.id.split('/')[1]}#${s.title}`)));
      for (const entry of Object.keys(walk)) expect(steps, `${key}: walkthrough key "${entry}"`).toContain(entry);
    }
  });

  it('backs every number prediction with a verify command', () => {
    for (const { lesson } of all) {
      for (const step of lesson.steps) {
        for (const p of step.predictions ?? []) {
          if (p.kind === 'number') expect(p.verify, `${lesson.title} / ${step.title}: "${p.question}"`).toBeTruthy();
        }
      }
    }
  });

  it('changes one file per step', () => {
    for (const { lesson } of all) {
      for (const step of lesson.steps) expect(step.extraTargets ?? [], `${lesson.title} / ${step.title}`).toEqual([]);
    }
  });
});

describe.skipIf(!enabled)('Machine Learning — From Mathematics to Production walkthrough', () => {
  for (const track of trackKeys) {
    const WALKTHROUGH = WALKTHROUGHS[`./tracks/${track}.walkthrough.js`]?.WALKTHROUGH ?? {};
    const project = path.join(tmp, track);
    fs.mkdirSync(project, { recursive: true });

    for (const lesson of TRACKS[track]) {
      const lessonKey = lesson.id.split('/')[1];
      it(`${track}: ${lesson.title}`, async () => {
        for (const step of lesson.steps) {
          const action = WALKTHROUGH[`${lessonKey}#${step.title}`] ?? {};
          const checks = localChecks(step.checks);

          for (const wrong of action.wrong ?? []) {
            const copy = path.join(tmp, `wrong-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
            copyProject(project, copy);
            try {
              await perform(track, copy, lesson, step, { typeFile: false, ...wrong, allowFailure: true });
              const res = await runChecks(copy, checks, { env: await getEnv() });
              const failed = res.results.map((r, i) => (r.pass ? null : i)).filter((i) => i != null);
              for (const i of wrong.fails) {
                expect(failed, `${lesson.title} / ${step.title}: wrong answer "${wrong.name}" should fail check "${checks[i]?.label}"\n${describeResults(checks, res.results)}`).toContain(i);
              }
            } finally {
              removeCopy(copy);
            }
          }

          await perform(track, project, lesson, step, action);
          if (checks.length) {
            const res = await runChecks(project, checks, { env: await getEnv() });
            expect(res.results.every((r) => r.pass), `${lesson.title} / ${step.title}\n${describeResults(checks, res.results)}`).toBe(true);
          }
          // A prediction's stated answer must be what the code really does: the last line its
          // verify command prints is marked as if the learner had typed it.
          for (const p of step.predictions ?? []) {
            if (!p.verify) continue;
            // `verify: script name.py` runs tracks/<track>/verify/name.py inside the project.
            const script = p.verify.match(/^script (\S+\.py)$/)?.[1];
            let command = p.verify;
            if (script) {
              fs.copyFileSync(new URL(`./tracks/${track}/verify/${script}`, import.meta.url), path.join(project, `_verify_${script}`));
              command = `.venv/Scripts/python _verify_${script}`;
            }
            const r = await shellRun(localCommand(command), { cwd: project, env: await getEnv(), timeoutMs: 120000 });
            if (script) fs.rmSync(path.join(project, `_verify_${script}`), { force: true });
            const lines = r.stdout.trim().split(/\r?\n/);
            const said = lines[lines.length - 1].trim();
            expect(r.code, `${lesson.title} / ${step.title}: verify for "${p.question}" failed\n${r.stdout}\n${r.stderr}`).toBe(0);
            expect(isCorrect(p, said), `${lesson.title} / ${step.title}: "${p.question}" says ${p.answer}, but the code printed ${said}`).toBe(true);
          }
        }
      }, 1800000);
    }
  }
});
