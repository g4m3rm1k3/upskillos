// Run in a project with its own virtual environment (`python -m venv .venv`, as the RL track
// teaches) uses that environment's Python, so Run sees the packages the learner installed.
// Projects without one keep using the app's private PySide6 Python.
import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const python = require('../../../desktop/app/runtimes/python.cjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'python-venv-run-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const userData = path.join(tmp, 'userData');
const app = { getPath: () => userData };
const managedExe = path.join(userData, 'runtimes', 'python', 'python.exe');

function touch(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '');
}

describe('Python project runs', () => {
  it('use the project’s .venv Python when there is one', async () => {
    const root = path.join(tmp, 'with-venv');
    touch(python.venvPython(root));
    touch(managedExe);
    const cmd = await python.projectCommand(app, path.join(root, 'main.py'), root);
    expect(cmd.command).toBe(python.venvPython(root));
    expect(cmd.args).toEqual([path.join(root, 'main.py')]);
    expect(cmd.env.PYTHONUNBUFFERED).toBe('1');
  });

  it('use the private Python when the project has no .venv', async () => {
    const root = path.join(tmp, 'no-venv');
    fs.mkdirSync(root, { recursive: true });
    touch(managedExe);
    const cmd = await python.projectCommand(app, path.join(root, 'main.py'), root);
    expect(cmd.command).toBe(managedExe);
  });

  it('run a package’s __main__.py as python -m <package>, from the project folder', async () => {
    const root = path.join(tmp, 'package');
    touch(python.venvPython(root));
    touch(path.join(root, 'breakout', '__init__.py'));
    touch(path.join(root, 'breakout', '__main__.py'));
    const cmd = await python.projectCommand(app, path.join(root, 'breakout', '__main__.py'), root);
    expect(cmd.args).toEqual(['-m', 'breakout']);
  });

  it('name a nested package with dots, and run a __main__.py outside any package by its path', async () => {
    const root = path.join(tmp, 'nested');
    touch(python.venvPython(root));
    touch(path.join(root, 'forge', '__init__.py'));
    touch(path.join(root, 'forge', 'editor', '__init__.py'));
    touch(path.join(root, 'forge', 'editor', '__main__.py'));
    touch(path.join(root, 'scripts', '__main__.py'));
    expect((await python.projectCommand(app, path.join(root, 'forge', 'editor', '__main__.py'), root)).args)
      .toEqual(['-m', 'forge.editor']);
    const loose = path.join(root, 'scripts', '__main__.py');
    expect((await python.projectCommand(app, loose, root)).args).toEqual([loose]);
  });

  it('report not installed when there is neither', async () => {
    const empty = { getPath: () => path.join(tmp, 'empty-userData') };
    const root = path.join(tmp, 'nothing');
    fs.mkdirSync(root, { recursive: true });
    expect(await python.projectCommand(empty, path.join(root, 'main.py'), root)).toBeNull();
  });
});
