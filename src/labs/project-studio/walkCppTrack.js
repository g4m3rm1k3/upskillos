// walkCppTrack.js
// Shared by the C++ track walkthrough tests (cppFoundations.desktop.test.js and friends).
// Walks a track the way a learner would, in a fresh temporary project folder: every step's file
// is typed in (or created, for a provided file), the commands the lesson tells the learner to
// run are run in the terminal's shell, and then every check on the step must pass. Before each
// step, deliberately wrong answers are tried on a copy of the project, and the named checks must
// FAIL. A check that passes a wrong answer is a bug in the lesson.
//
// Needs a C++ compiler reachable as g++ (a system one, or the app's toolchain: set
// CPP_TOOLCHAIN_BIN to its bin folder) and CMake for lessons that use it. Runs on Windows
// (PowerShell, as in the app), macOS and Linux.
import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRACKS } from './trackLoader.js';

const require = createRequire(import.meta.url);
const { runChecks, shellRun } = require('../../../desktop/app/project-checks.cjs');
const { shellEnv } = require('../../../desktop/app/terminal.cjs');

// The configure command differs by platform: on Windows the lessons pick the build tool that
// comes with the compiler (mingw32-make).
export const configure = (dir) => (process.platform === 'win32'
  ? `cmake -S ${dir} -B ${dir}/build -G "MinGW Makefiles"`
  : `cmake -S ${dir} -B ${dir}/build`);

// A CMake build folder records its source folder's absolute path, so a copied one would still
// build the original. Wrong-answer copies leave build folders out; wrong answers that need one
// configure their own.
const isBuildDir = (src) => /^build(-cmake)?$/.test(path.basename(src)) && fs.statSync(src).isDirectory();

// Other tracks use it too: toolCheck is the command that says the track's toolchain is installed (a C++ compiler by
// default; `node --version` for a Node track), and linkDirs are folders a wrong answer's copy links to instead of
// copying (node_modules: hundreds of megabytes, and never what a wrong answer changes). evalInPage runs `page` checks
// (in the app a hidden Electron window does; a walkthrough passes Playwright's Chromium).
export async function walkCppTrack({ trackKey, title, walkthrough, lessonIds, needsCMake = () => false, toolCheck = 'g++ --version', linkDirs = [], extraEnv = {}, evalInPage } = {}) {
  const lessons = TRACKS[trackKey] ?? [];
  // The real path: on macOS the temp folder is reached through a link (/var → /private/var), and Git reports the real one.
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `${trackKey}-walk-`)));
  const project = path.join(tmp, trackKey);
  fs.mkdirSync(project);
  afterAll(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} });

  const env = { ...(await shellEnv({ extraPath: [process.env.CPP_TOOLCHAIN_BIN] })), ...extraEnv };
  const has = async (cmd) => (await shellRun(cmd, { cwd: tmp, env, timeoutMs: 30000 })).code === 0;
  const hasCompiler = await has(toolCheck);
  const hasCMake = await has('cmake --version');

  async function perform(dir, step, action = {}) {
    if (step.file && step.target != null && action.typeFile !== false) {
      const abs = path.join(dir, step.file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, step.target + '\n');
    }
    for (const [rel, pairs] of Object.entries(action.editFiles ?? {})) {
      let content = fs.readFileSync(path.join(dir, rel), 'utf8');
      for (const [from, to] of pairs) {
        if (!content.includes(from)) throw new Error(`Walkthrough edit not found in ${rel}: ${from}`);
        content = content.replace(from, to);
      }
      fs.writeFileSync(path.join(dir, rel), content);
    }
    for (const [rel, content] of Object.entries(action.files ?? {})) {
      const abs = path.join(dir, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    }
    for (const cmd of action.run ?? []) {
      const r = await shellRun(cmd, { cwd: dir, env, timeoutMs: 180000 });
      if (r.code !== 0 && !action.allowFailure) throw new Error(`Walkthrough command failed: ${cmd}\n${r.stdout}\n${r.stderr}`);
    }
  }

  const describeResults = (checks, results) => results
    .map((r, i) => `${r.pass ? 'PASS' : 'FAIL'} ${checks[i].label}${r.pass ? '' : `\n     ${String(r.detail).split('\n').join('\n     ')}`}`)
    .join('\n');

  describe(`${title} track`, () => {
    it('has its lessons, and every walkthrough entry names a real step', () => {
      expect(lessons.map((l) => l.id.split('/')[1])).toEqual(lessonIds);
      const keys = new Set(lessons.flatMap((l) => l.steps.map((s) => `${l.id.split('/')[1]}#${s.title}`)));
      for (const key of Object.keys(walkthrough)) expect(keys, `walkthrough key "${key}"`).toContain(key);
    });

    it('provides every file a step tells the learner to create from the supplied version', () => {
      for (const lesson of lessons) {
        for (const step of lesson.steps) {
          for (const m of String(step.prose).matchAll(/[Cc]reate the supplied `([^`]+)`/g)) {
            expect(step.provided && step.file === m[1], `${lesson.title} / ${step.title}: says to create the supplied ${m[1]}, but provides ${step.provided ? step.file : 'nothing'}`).toBe(true);
          }
        }
      }
    });

    it('gives every step that changes code a check', () => {
      for (const lesson of lessons) {
        for (const step of lesson.steps) {
          if (step.file) expect(step.checks.length, `${lesson.title} / ${step.title}`).toBeGreaterThan(0);
        }
      }
    });
  });

  describe.skipIf(!hasCompiler)(`${title} walkthrough`, () => {
    for (const lesson of lessons) {
      const lessonKey = lesson.id.split('/')[1];
      it.skipIf(needsCMake(lessonKey) && !hasCMake)(lesson.title, async () => {
        for (const step of lesson.steps) {
          const action = walkthrough[`${lessonKey}#${step.title}`] ?? {};

          for (const wrong of action.wrong ?? []) {
            const copy = path.join(tmp, `wrong-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
            fs.cpSync(project, copy, { recursive: true, filter: (src) => !isBuildDir(src) && !(linkDirs.includes(path.basename(src)) && path.dirname(src) === project) });
            for (const name of linkDirs) if (fs.existsSync(path.join(project, name))) fs.symlinkSync(path.join(project, name), path.join(copy, name), 'junction');
            try {
              await perform(copy, step, { typeFile: false, ...wrong, allowFailure: true });
              const res = await runChecks(copy, step.checks, { env, evalInPage });
              const failed = res.results.map((r, i) => (r.pass ? null : i)).filter((i) => i != null);
              for (const i of wrong.fails) {
                expect(failed, `${lesson.title} / ${step.title}: wrong answer "${wrong.name}" should fail check "${step.checks[i]?.label}"\n${describeResults(step.checks, res.results)}`).toContain(i);
              }
            } finally {
              fs.rmSync(copy, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
            }
          }

          await perform(project, step, action);
          if (step.checks.length) {
            const res = await runChecks(project, step.checks, { env, evalInPage });
            expect(res.results.every((r) => r.pass), `${lesson.title} / ${step.title}\n${describeResults(step.checks, res.results)}`).toBe(true);
          }
        }
      }, 900000);
    }
  });
}
