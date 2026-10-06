import { expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRACKS } from './trackLoader.js';
import { transition } from './figures/dicePreviewModel.js';
const require = createRequire(import.meta.url);
const { shellEnv } = require('../../../desktop/app/terminal.cjs');
const env = await shellEnv({ extraPath: [process.env.CPP_TOOLCHAIN_BIN] });
const hasCompiler = spawnSync('g++', ['--version'], { env, windowsHide: true }).status === 0;

it.skipIf(!hasCompiler)('browser transitions agree with the actual completed learner C++ rules', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dice-preview-parity-'));
  try {
    const rules = TRACKS['dice-cpp'].flatMap(l => l.steps).filter(s => s.file === 'game.hpp').at(-1).target;
    fs.writeFileSync(path.join(tmp, 'game.hpp'), rules);
    fs.writeFileSync(path.join(tmp, 'probe.cpp'), `#include "game.hpp"
#include <iostream>
int main() {
    Game g; int action, face;
    while (std::cin >> g.score[0] >> g.score[1] >> g.turn >> g.pot >> g.winner >> action >> face) {
        try {
            apply(g, static_cast<Action>(action), face);
            std::cout << g.score[0] << ' ' << g.score[1] << ' ' << g.turn << ' ' << g.pot << ' ' << g.winner << '\\n';
        } catch (const std::invalid_argument&) { std::cout << "invalid\\n"; }
    }
}`);
    const compiled = spawnSync('g++', ['-std=c++20', 'probe.cpp', '-o', 'probe'], { cwd: tmp, env, encoding: 'utf8', windowsHide: true });
    expect(compiled.status, compiled.stderr).toBe(0);
    const lines = [], expected = [];
    const add = (game, action, face) => {
      lines.push(`${game.score[0]} ${game.score[1]} ${game.turn} ${game.pot} ${game.winner} ${action === 'roll' ? 0 : 1} ${face}`);
      try {
        const next = transition(game, action, face);
        expected.push(`${next.score[0]} ${next.score[1]} ${next.turn} ${next.pot} ${next.winner}`);
      } catch { expected.push('invalid'); }
    };
    for (let own = 0; own < 12; own++) for (let other = 0; other < 12; other++) {
      for (let turn = 0; turn < 2; turn++) for (let pot = 0; pot < 12 - (turn === 0 ? own : other); pot++) {
        const game = { score: [own, other], turn, pot, winner: -1 };
        for (let face = 0; face <= 7; face++) add(game, 'roll', face);
        add(game, 'bank', 1);
      }
    }
    for (const winner of [0, 1]) for (const action of ['roll', 'bank']) add({ score: [8, 8], turn: winner, pot: 5, winner }, action, 3);
    const executed = spawnSync(path.join(tmp, process.platform === 'win32' ? 'probe.exe' : 'probe'), [], {
      cwd: tmp, env, encoding: 'utf8', input: lines.join('\n') + '\n', maxBuffer: 16 * 1024 * 1024, windowsHide: true,
    });
    expect(executed.status, executed.stderr).toBe(0);
    expect(executed.stdout.trim().split(/\r?\n/)).toEqual(expected);
  } finally {
    // Only the exact task-created temporary child is eligible for recursive cleanup.
    if (path.dirname(tmp) !== path.resolve(os.tmpdir()) || !path.basename(tmp).startsWith('dice-preview-parity-')) throw new Error('Unexpected cleanup path');
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}, 30000);
