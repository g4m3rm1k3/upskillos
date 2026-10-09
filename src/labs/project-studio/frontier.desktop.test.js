// Walks the Frontier series (every frontier-* track, in order) the way a learner would, in one
// fresh temporary project folder: the commands each lesson tells the learner to run are run in
// PowerShell (making the .venv and installing requirements.txt from PyPI), every step's file is
// typed in (its target content written), supplied files are created as the lesson's button would,
// each Your turn answer is written, and then every check on the step must pass.
//
// Then, for steps with checks, deliberately wrong answers are tried on a copy of the project as it
// was at that step, and the named checks must FAIL. A check that passes a wrong answer is a bug in
// the lesson. Every prediction's verify command must print its stated answer.
//
// Needs Windows (the lessons' commands are PowerShell), Python 3.12 or newer on PATH, and network
// access for pip. The first run takes a few minutes (PyTorch is about 125 MB).
//
// Safety (docs/frontier-ai-series-plan.md, "Testing safely"): every command runs with the GPU
// hidden and maths libraries on two threads. Run the whole test through the guard:
//   node scripts/frontier-safe-run.mjs --timeout 1800 --mem 3072 -- npx vitest run src/labs/project-studio/frontier.desktop.test.js
//
// FRONTIER_UNTIL=<lesson id prefix> stops after that lesson. FRONTIER_KEEP=<folder> keeps a copy of
// the finished project; FRONTIER_START=<that folder> with FRONTIER_FROM=<lesson id prefix> starts from
// it, skipping the lessons before FRONTIER_FROM.
import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRACKS, TRACK_KEYS, getSupportFiles } from './trackLoader.js';
import { isCorrect } from './predictions.js';
import { WALKTHROUGH } from './tracks/frontier.walkthrough.js';

const require = createRequire(import.meta.url);
const { runChecks, shellRun } = require('../../../desktop/app/project-checks.cjs');
const { shellEnv } = require('../../../desktop/app/terminal.cjs');

const isWindows = process.platform === 'win32';
const trackKeys = TRACK_KEYS.filter((key) => key.startsWith('frontier-'));
const lessons = trackKeys.flatMap((key) => TRACKS[key].map((lesson) => ({ ...lesson, track: key })));
const keyOf = (lesson, step) => `${lesson.id}#${step.title}`;
const untilIndex = process.env.FRONTIER_UNTIL
  ? lessons.findIndex((l) => l.id.startsWith(process.env.FRONTIER_UNTIL))
  : lessons.length - 1;
const fromIndex = process.env.FRONTIER_START && process.env.FRONTIER_FROM
  ? lessons.findIndex((l) => l.id.startsWith(process.env.FRONTIER_FROM))
  : 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frontier-walk-'));
const project = path.join(tmp, 'frontier');
fs.mkdirSync(project);
if (fromIndex > 0) {
  fs.cpSync(process.env.FRONTIER_START, project, { recursive: true });
  // The kept .venv's editable install names the kept project's old src folder: point it here.
  const site = path.join(project, '.venv', 'Lib', 'site-packages');
  for (const name of fs.readdirSync(site).filter((n) => /^__editable__.*\.pth$/.test(n))) {
    fs.writeFileSync(path.join(site, name), path.join(project, 'src') + '\n');
  }
}

afterAll(() => {
  if (process.env.FRONTIER_KEEP) {
    fs.rmSync(process.env.FRONTIER_KEEP, { recursive: true, force: true });
    fs.cpSync(project, process.env.FRONTIER_KEEP, { recursive: true });
  }
  try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
}, 600000);

let baseEnv;
async function getEnv() {
  // No __pycache__: a wrong answer written within the same second as the right one, at the same
  // length, must never run as the old cached bytecode. No GPU and two threads: the authoring
  // machine must stay responsive (an unlimited PyTorch run once froze it).
  if (!baseEnv) {
    baseEnv = {
      ...(await shellEnv()), PYTHONDONTWRITEBYTECODE: '1', CUDA_VISIBLE_DEVICES: '',
      OMP_NUM_THREADS: '2', MKL_NUM_THREADS: '2', OPENBLAS_NUM_THREADS: '2', TORCH_NUM_THREADS: '2',
    };
  }
  return baseEnv;
}

function write(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

// Do what the learner does for a step: create supplied files, type its file, write their own
// files (a Your turn answer), then run its commands.
async function perform(dir, lesson, step, action = {}) {
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
  for (const cmd of action.run ?? []) {
    const r = await shellRun(cmd, { cwd: dir, env: action.env ?? await getEnv(), timeoutMs: 1200000 });
    if (r.code !== 0 && !action.allowFailure) throw new Error(`Walkthrough command failed: ${cmd}\n${r.stdout}\n${r.stderr}`);
  }
}

// A copy of the project for a wrong answer, linking to the real .venv instead of copying it.
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
  try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
}

function describeResults(checks, results) {
  return results.map((r, i) => `${r.pass ? 'PASS' : 'FAIL'} ${checks[i].label}${r.pass ? '' : `\n     ${String(r.detail).split('\n').join('\n     ')}`}`).join('\n');
}

describe.skipIf(!isWindows)('Frontier walkthrough', () => {
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
    for (const lesson of lessons) {
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
          for (const name of selected) expect(name.startsWith(`test_${word}`), `${lesson.title} / ${step.title}: -k ${word} also selects ${name}`).toBe(true);
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
      for (const step of lesson.steps) {
        const action = WALKTHROUGH[keyOf(lesson, step)] ?? {};
        const checks = step.checks;

        for (const wrong of action.wrong ?? []) {
          const copy = path.join(tmp, `wrong-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
          copyProject(copy, wrong);
          try {
            // A shared .venv's editable install points at the real project's src, so the copy's
            // own src goes first on the import path. A copied .venv installs into itself instead,
            // and a wrong answer about installing (pythonPath: false) must see only the .venv.
            const own = wrong.copyVenv || wrong.pythonPath === false;
            const env = own ? await getEnv() : { ...(await getEnv()), PYTHONPATH: path.join(copy, 'src') };
            await perform(copy, lesson, step, { typeFile: false, ...wrong, allowFailure: true, env });
            const res = await runChecks(copy, checks, { env });
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
        // A prediction's stated answer must be what the code really does: the last line its verify
        // command prints is marked as if the learner had typed it.
        for (const p of step.predictions ?? []) {
          if (!p.verify) continue;
          // `verify: script name.py` runs tracks/<chapter>/verify/name.py inside the project.
          const script = p.verify.match(/^script (\S+\.py)$/)?.[1];
          let command = p.verify;
          if (script) {
            fs.copyFileSync(new URL(`./tracks/${lesson.track}/verify/${script}`, import.meta.url), path.join(project, `_verify_${script}`));
            command = `.venv/Scripts/python _verify_${script}`;
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
