// The main-process checks (desktop/app/project-checks.cjs) against real folders and a real
// Git repository in a temporary directory. Needs git on PATH.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseChecks } from './checks.js';

const require = createRequire(import.meta.url);
const { runChecks, unixVenvPaths } = require('../../../desktop/app/project-checks.cjs');

let hasGit = true;
try { execFileSync('git', ['--version'], { stdio: 'ignore' }); } catch { hasGit = false; }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-checks-'));
const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, stdio: 'pipe' }).toString();

async function check(root, text) {
  const res = await runChecks(root, parseChecks(text), { env });
  expect(res.ok).toBe(true);
  return res.results;
}

afterAll(async () => {
  const resolved = path.resolve(tmp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('ps-checks-')) {
    throw new Error(`Unexpected test cleanup path: ${resolved}`);
  }
  // Let child-process close callbacks settle before retrying Windows directory removal.
  // A persistent cleanup error still fails the suite.
  await fs.promises.rm(resolved, { recursive: true, force: true, maxRetries: 25, retryDelay: 100 });
}, 60000);

describe('file checks', () => {
  const root = path.join(tmp, 'files');
  beforeAll(() => {
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'a.txt'), 'line one\r\nline two\r\n');
  });

  it('passes and fails file, dir and missing correctly', async () => {
    const r = await check(root, 'file a.txt\nfile nope.txt\nfile src\ndir src\ndir a.txt\nmissing nope.txt\nmissing a.txt');
    expect(r.map((x) => x.pass)).toEqual([true, false, false, true, false, true, false]);
    expect(r[1].detail).toBe('There is no nope.txt in the project folder.');
    expect(r[2].detail).toBe('src is a folder, not a file.');
  });

  it('matches text across CRLF and LF', async () => {
    const r = await check(root, 'contains a.txt "line one\\nline two"\ncontains a.txt "three"\nlacks a.txt "three"\nlacks a.txt "two"');
    expect(r.map((x) => x.pass)).toEqual([true, false, true, false]);
  });

  it('refuses paths outside the project folder', async () => {
    const r = await check(root, 'file ../outside.txt');
    expect(r[0].pass).toBe(false);
    expect(r[0].detail).toMatch(/escapes the project folder/);
  });
});

describe('run checks', () => {
  const root = path.join(tmp, 'run');
  beforeAll(() => {
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'hello.js'), 'console.log("Hello from Node")\n');
    fs.writeFileSync(path.join(root, 'fail.js'), 'console.error("bad things"); process.exit(3)\n');
    // Reads two numbers from the keyboard, the way a C++ program using std::cin would.
    fs.writeFileSync(path.join(root, 'add.js'), [
      'let text = ""',
      'process.stdin.on("data", (d) => { text += d })',
      'process.stdin.on("end", () => {',
      '  const [a, b] = text.trim().split(/\\s+/).map(Number)',
      '  console.log(`${a} + ${b} = ${a + b}`)',
      '})',
    ].join('\n') + '\n');
  });

  it('types stdin= into the program', async () => {
    const r = await check(root, [
      'run "node add.js" stdin="3 4\\n" stdout="3 + 4 = 7"',
      'run "node add.js" stdin="10\\n-2\\n" stdout="10 + -2 = 8"',
      'run "node add.js" stdin="1 1\\n" stdout="1 + 1 = 3"',
    ].join('\n'));
    expect(r.map((x) => x.pass)).toEqual([true, true, false]);
    expect(r[2].detail).toContain('with the input "1 1\\n"');
    expect(r[2].detail).toContain('1 + 1 = 2');
  });

  it('gives the program exactly the text in stdin=: one final newline, and non-ASCII intact', async () => {
    // Prints what arrived on stdin as JSON, with CRLF folded to LF the way C++ and Python
    // text input does. Before the fix, Windows gave "3 4\n\n" (an extra line) and "caf??".
    fs.writeFileSync(path.join(root, 'echo.js'), 'let d = ""; process.stdin.on("data", (c) => { d += c }); process.stdin.on("end", () => console.log(JSON.stringify(d.replace(/\\r\\n/g, "\\n"))));\n');
    const r = await check(root, [
      'run "node echo.js" stdin="3 4\\n" stdout="\\"3 4\\\\n\\""',
      'run "node echo.js" stdin="café\\n" stdout="\\"café\\\\n\\""',
      'run "node echo.js" stdin="a\\nb\\n" stdout="\\"a\\\\nb\\\\n\\""',
      'run "node echo.js" stdin="\\n" stdout="\\"\\\\n\\""',
      'run "node echo.js" stdin="" stdout="\\"\\""',
    ].join('\n'));
    expect(r.map((x) => x.detail ?? 'pass')).toEqual(['pass', 'pass', 'pass', 'pass', 'pass']);
  });

  it('checks the exit code and the output', async () => {
    const r = await check(root, [
      'run "node hello.js" stdout="Hello from Node"',
      'run "node hello.js" stdout="Goodbye"',
      'run "node fail.js"',
      'run "node fail.js" exit=3 stderr="bad things"',
    ].join('\n'));
    expect(r.map((x) => x.pass)).toEqual([true, false, false, true]);
    expect(r[1].detail).toContain(`its output doesn't include "Goodbye"`);
    expect(r[1].detail).toContain('Hello from Node');
    expect(r[2].detail).toContain('exited with code 3 (expected 0)');
    expect(r[2].detail).toContain('bad things');
  });

  it('fails when the output includes without= text', async () => {
    const r = await check(root, 'run "node hello.js" without="Goodbye"\nrun "node hello.js" without="from Node"');
    expect(r.map((x) => x.pass)).toEqual([true, false]);
    expect(r[1].detail).toContain('its output still includes "from Node"');
  });

  it('stops a command that runs too long', async () => {
    const r = await check(root, 'run "node -e \\"setTimeout(() => {}, 20000)\\"" timeout=1');
    expect(r[0].pass).toBe(false);
    expect(r[0].detail).toMatch(/still running after 1 seconds/);
  }, 20000);
});

describe('tests checks', () => {
  const root = path.join(tmp, 'tests');
  // Stand-ins for compiled test programs: each prints what studio_test.hpp (or GoogleTest) would.
  const program = (name, lines, code = 0) => fs.writeFileSync(path.join(root, name),
    `console.log(${JSON.stringify(lines.join('\n'))}); process.exit(${code})\n`);
  beforeAll(() => {
    fs.mkdirSync(root, { recursive: true });
    program('green.js', ['[==========] Running 2 tests', '[ RUN      ] adds', '[       OK ] adds',
      '[ RUN      ] subtracts', '[       OK ] subtracts (0 ms)', '[==========] 2 tests ran, 2 passed, 0 failed']);
    program('red.js', ['[ RUN      ] adds', '[       OK ] adds', '[ RUN      ] divides',
      'calc_test.cpp:12: CHECK_EQ(divide(6, 3), 2) failed: 3 != 2', '[  FAILED  ] divides',
      '[==========] 2 tests ran, 1 passed, 1 failed', '[  FAILED  ] 1 test, listed below:', '[  FAILED  ] divides'], 1);
    program('crash.js', ['[ RUN      ] adds', '[       OK ] adds', '[ RUN      ] copies'], 134);
    program('none.js', ['nothing here'], 0);
  });

  it('passes a green test program and names what failed in a red one', async () => {
    const r = await check(root, [
      'tests "node green.js"',
      'tests "node green.js" require="adds subtracts"',
      'tests "node green.js" require="adds,multiplies"',
      'tests "node red.js"',
    ].join('\n'));
    expect(r.map((x) => x.pass)).toEqual([true, true, false, false]);
    expect(r[2].detail).toContain('✗ multiplies');
    expect(r[2].detail).toContain('No test with this name ran');
    expect(r[3].detail).toContain('1 of 2 tests passed');
    expect(r[3].detail).toContain('✗ divides\n    calc_test.cpp:12: CHECK_EQ(divide(6, 3), 2) failed: 3 != 2');
  });

  it('points at the test a crash happened in, and at a program that ran no tests', async () => {
    const r = await check(root, 'tests "node crash.js"\ntests "node none.js"\ntests "node missing.js"');
    expect(r.map((x) => x.pass)).toEqual([false, false, false]);
    expect(r[0].detail).toContain('1 of 2 tests passed');
    expect(r[0].detail).toContain('✗ copies\n    The program stopped during this test (exit code 134)');
    expect(r[1].detail).toContain('it ran no tests. Has the test program been built?');
    expect(r[2].detail).toMatch(/ran no tests and exited with code [1-9]/);
  });
});

describe.skipIf(!hasGit)('git checks', () => {
  const outer = path.join(tmp, 'outer');
  const root = path.join(outer, 'project');
  const remote = path.join(tmp, 'remote.git');

  beforeAll(() => {
    fs.mkdirSync(root, { recursive: true });
    // A repository *around* the project folder: checks must not answer about it.
    git(outer, 'init', '-q', '-b', 'main');
    fs.writeFileSync(path.join(outer, 'x.txt'), 'x');
    git(outer, 'add', 'x.txt');
    git(outer, 'commit', '-q', '-m', 'outer commit');
  });

  it('does not mistake a parent repository for the project', async () => {
    const r = await check(root, 'git-repo\ngit-commits 1');
    expect(r.map((x) => x.pass)).toEqual([false, false]);
    expect(r[0].detail).toMatch(/inside another repository/);
  });

  it('follows a repository from init to push', async () => {
    git(root, 'init', '-q', '-b', 'main');
    let r = await check(root, 'git-repo\ngit-commits 1\ngit-clean');
    expect(r.map((x) => x.pass)).toEqual([true, false, true]);

    fs.writeFileSync(path.join(root, 'notes.txt'), 'hi\n');
    fs.writeFileSync(path.join(root, '.gitignore'), 'secret.txt\n');
    fs.writeFileSync(path.join(root, 'secret.txt'), 'shh\n');
    r = await check(root, 'git-clean\ngit-tracked notes.txt\ngit-ignored secret.txt\ngit-ignored notes.txt');
    expect(r.map((x) => x.pass)).toEqual([false, false, true, false]);
    expect(r[0].detail).toContain('notes.txt');

    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'Add notes and ignore secrets');
    r = await check(root, 'git-commits 1\ngit-commits 2\ngit-clean\ngit-tracked notes.txt\ngit-untracked secret.txt\ngit-message "ignore secrets"\ngit-message "nothing like this"\ngit-branch main\ngit-branch dev');
    expect(r.map((x) => x.pass)).toEqual([true, false, true, true, true, true, false, true, false]);

    git(root, 'switch', '-q', '-c', 'feature');
    fs.writeFileSync(path.join(root, 'f.txt'), 'f\n');
    git(root, 'add', 'f.txt');
    git(root, 'commit', '-q', '-m', 'feature work');
    r = await check(root, 'git-has-branch feature\ngit-merged feature main');
    expect(r.map((x) => x.pass)).toEqual([true, false]);
    git(root, 'switch', '-q', 'main');
    git(root, 'merge', '-q', 'feature');
    r = await check(root, 'git-merged feature main\ngit-tag v0.1\ngit-remote\ngit-pushed');
    expect(r.map((x) => x.pass)).toEqual([true, false, false, false]);
    expect(r[3].detail).toMatch(/no upstream/);

    execFileSync('git', ['init', '-q', '--bare', remote], { env });
    git(root, 'remote', 'add', 'origin', remote);
    git(root, 'push', '-q', '-u', 'origin', 'main');
    git(root, 'tag', 'v0.1');
    r = await check(root, 'git-remote origin\ngit-pushed\ngit-tag v0.1');
    expect(r.map((x) => x.pass)).toEqual([true, true, true]);

    fs.writeFileSync(path.join(root, 'later.txt'), 'l\n');
    git(root, 'add', 'later.txt');
    git(root, 'commit', '-q', '-m', 'later');
    r = await check(root, 'git-pushed');
    expect(r[0].pass).toBe(false);
    expect(r[0].detail).toBe("1 commit hasn't been pushed to origin/main yet.");
  }, 60000);
});

describe('virtual environment paths on macOS and Linux', () => {
  it('runs .venv/Scripts programs from .venv/bin', () => {
    expect(unixVenvPaths('.venv/Scripts/python -m pytest -q')).toBe('.venv/bin/python -m pytest -q');
    expect(unixVenvPaths('.venv\\Scripts\\pip.exe install x')).toBe('.venv/bin/pip install x');
    expect(unixVenvPaths('cd app && .venv/Scripts/python run.py')).toBe('cd app && .venv/bin/python run.py');
  });
  it('leaves other paths alone', () => {
    expect(unixVenvPaths('python Scripts/tool.py')).toBe('python Scripts/tool.py');
    expect(unixVenvPaths('./hello')).toBe('./hello');
  });
});
