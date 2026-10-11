import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseCheckLine } from './checks.js';

const require = createRequire(import.meta.url);
const { runChecks } = require('../../../desktop/app/project-checks.cjs');

function project(records) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'keys-check-'));
  if (records) {
    fs.mkdirSync(path.join(root, '.practice'));
    fs.writeFileSync(path.join(root, '.practice', 'keystrokes.jsonl'), records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  }
  return root;
}

const check = parseCheckLine('keys practice/word.txt par=4');
const run = async (root) => (await runChecks(root, [check], {})).results[0];

describe('the keys check', () => {
  it('describes itself', () => {
    expect(check.label).toBe('practice/word.txt was saved in Neovim within 4 keystrokes, without arrow keys or the mouse');
  });

  it('passes at or under par, judging the latest save of that file', async () => {
    const root = project([
      { file: 'practice/word.txt', keys: 12, arrows: 0, mouse: 0, seq: 'llllllcwhi<Esc>' },
      { file: 'practice/other.txt', keys: 1, arrows: 0, mouse: 0 },
      { file: 'practice/word.txt', keys: 4, arrows: 0, mouse: 0, seq: 'cwhi' },
    ]);
    expect(await run(root)).toMatchObject({ pass: true });
  });

  it('fails over par and shows what was typed', async () => {
    const r = await run(project([{ file: 'practice/word.txt', keys: 9, arrows: 0, mouse: 0, seq: 'lllllcwhi' }]));
    expect(r.pass).toBe(false);
    expect(r.detail).toContain('9 keystrokes; par is 4');
    expect(r.detail).toContain('lllllcwhi');
  });

  it('fails when arrow keys or the mouse were used, even under par', async () => {
    const r = await run(project([{ file: 'practice/word.txt', keys: 3, arrows: 1, mouse: 0, seq: '<Right>x' }]));
    expect(r.pass).toBe(false);
    expect(r.detail).toContain('1 arrow/Home/End key');
  });

  it('fails when the file was never saved from Neovim', async () => {
    const r = await run(project());
    expect(r.pass).toBe(false);
    expect(r.detail).toContain('No saved Neovim edit of practice/word.txt');
  });
});
