// Walks the Neovim series the way a learner would (walkSeries.js explains how). Needs macOS or
// Linux: the lessons' commands are zsh. A step's file is written as the learner's edits would leave
// it, and every keystroke drill is typed for real into headless Neovim (drill() in the walkthrough),
// so each par is proved by a key sequence that reaches the target at exactly that count.
// NVIMSERIES_UNTIL, NVIMSERIES_KEEP, NVIMSERIES_START and NVIMSERIES_FROM walk part of the series.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { walkSeries } from './walkSeries.js';
import { WALKTHROUGH } from './tracks/nvim.walkthrough.js';

const require = createRequire(import.meta.url);

// Neovim for the drills: the one on PATH if there is one, otherwise the app's own download,
// fetched once into a cache folder.
async function neovim() {
  try { return execFileSync('which', ['nvim'], { encoding: 'utf8' }).trim(); } catch {}
  const runtime = require('../../../desktop/app/runtimes/neovim.cjs');
  const app = { getPath: () => path.join(os.tmpdir(), 'upskillos-test-neovim') };
  let status = await runtime.getStatus(app);
  if (!status.installed) { await runtime.install(app); status = await runtime.getStatus(app); }
  return status.path;
}

if (process.platform !== 'win32') {
  process.env.NVIM_BIN = await neovim();
  process.env.PRACTICE_LUA = path.resolve('desktop/app/runtimes/neovim-practice.lua');
}

walkSeries({ name: 'Neovim', prefix: 'nvim-', walkthrough: WALKTHROUGH, envPrefix: 'NVIMSERIES', projectName: 'shelf', unix: true });
