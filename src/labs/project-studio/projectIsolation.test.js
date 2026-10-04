import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'project-isolation-'));
const folders = ['pong', 'sheet'].map(name => { const p = path.join(tmp, name); fs.mkdirSync(p); return p; });
const data = path.join(tmp, 'data'); fs.mkdirSync(data);
const app = { getPath: () => data };
let selected;
const module = { exports: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../../../desktop/app/project-fs.cjs'), 'utf8'), {
  module, process, console,
  require: name => name === 'electron' ? { dialog: { showOpenDialog: async () => ({ filePaths: [selected] }) } } : name.startsWith('./') ? require('../../../desktop/app/' + name.slice(2)) : require(name),
});
const project = module.exports;
let hasPython = true;
try { require('node:child_process').execFileSync('python', ['--version'], { stdio: 'ignore' }); } catch { hasPython = false; }
afterAll(() => fs.rmSync(tmp, {recursive:true,force:true}));
describe('Project Studio track folder isolation', () => {
  it('does not assign the old shared folder to any track', async () => {
    fs.writeFileSync(path.join(data, 'project-config.json'), JSON.stringify({ projectRoot: folders[0] }));
    expect((await project.getProject(app)).root).toBe(folders[0]);
    expect((await project.getProject(app, 'cpp-game')).root).toBeNull();
    expect((await project.getProject(app, 'spreadsheet')).root).toBeNull();
  });
  it('remembers separate folders and routes reads/writes/runs to their own root', async () => {
    selected = folders[0]; expect((await project.pickFolder(app, null, 'cpp-game')).ok).toBe(true);
    selected = folders[1]; expect((await project.pickFolder(app, null, 'spreadsheet')).ok).toBe(true);
    await project.writeFile(app, 'main.cpp', 'pong source', 'cpp-game');
    await project.writeFile(app, 'main.cpp', 'sheet source', 'spreadsheet');
    expect((await project.readFile(app, 'main.cpp', 'cpp-game')).content).toBe('pong source');
    expect((await project.readFile(app, 'main.cpp', 'spreadsheet')).content).toBe('sheet source');
    expect((await project.tree(app, 'cpp-game')).root).toBe(folders[0]);
    expect((await project.getProject(app, 'spreadsheet')).root).toBe(folders[1]);
    let compiledRoot;
    await project.runProjectFile(app, {cpp:{projectCommand:async (_, file, root) => {compiledRoot=root;return null;}}}, 'cpp','main.cpp',null,'cpp-game');
    expect(compiledRoot).toBe(folders[0]);
  });
  it('refuses sharing a folder and cannot write through an unconfigured track or escaped path', async () => {
    selected = folders[0];
    expect((await project.pickFolder(app,null,'spreadsheet')).ok).toBe(false);
    expect((await project.getProject(app,'spreadsheet')).root).toBe(folders[1]);
    expect((await project.writeFile(app,'main.cpp','bad','other')).ok).toBe(false);
    expect((await project.writeFile(app,'../sheet/main.cpp','bad','cpp-game')).ok).toBe(false);
    expect((await project.readFile(app,'main.cpp','spreadsheet')).content).toBe('sheet source');
    await project.rename(app,'main.cpp','pong.cpp','cpp-game');
    expect((await project.readFile(app,'main.cpp','spreadsheet')).content).toBe('sheet source');
  });
  it('creates new files exclusively in the selected project without truncating existing work', async () => {
    expect((await project.createFile(app, 'src/player.cpp', 'cpp-game')).ok).toBe(true);
    expect(fs.existsSync(path.join(folders[0], 'src', 'player.cpp'))).toBe(true);
    expect(fs.existsSync(path.join(folders[1], 'src', 'player.cpp'))).toBe(false);
    await project.writeFile(app, 'src/player.cpp', 'learner work', 'cpp-game');
    const duplicate = await project.createFile(app, 'src/player.cpp', 'cpp-game');
    expect(duplicate.ok).toBe(false);
    expect(duplicate.reason).toContain('already exists');
    expect((await project.readFile(app, 'src/player.cpp', 'cpp-game')).content).toBe('learner work');
    expect((await project.createFile(app, '../sheet/escaped.cpp', 'cpp-game')).ok).toBe(false);
    expect((await project.createFile(app, 'file.cpp', 'unconfigured')).ok).toBe(false);
  });
  it('renames a mistaken filename with its content intact and refuses collisions', async () => {
    await project.writeFile(app, 'wrong.cpp', 'int main() {}', 'cpp-game');
    expect((await project.rename(app, 'wrong.cpp', 'correct.cpp', 'cpp-game')).ok).toBe(true);
    expect((await project.readFile(app, 'correct.cpp', 'cpp-game')).content).toBe('int main() {}');
    expect((await project.readFile(app, 'wrong.cpp', 'cpp-game')).missing).toBe(true);
    await project.writeFile(app, 'taken.cpp', 'existing work', 'cpp-game');
    expect((await project.rename(app, 'correct.cpp', 'taken.cpp', 'cpp-game')).ok).toBe(false);
    expect((await project.readFile(app, 'correct.cpp', 'cpp-game')).content).toBe('int main() {}');
    expect((await project.readFile(app, 'taken.cpp', 'cpp-game')).content).toBe('existing work');
    expect((await project.rename(app, 'correct.cpp', '../sheet/correct.cpp', 'cpp-game')).ok).toBe(false);
  });

  // Measured 2026-10-04 on Windows: a Node program's own children die with it, but a child
  // started by Python's subprocess.Popen kept running after the run was killed, and kept the
  // project folder locked. So the parent here is Python, the case the ML and RL tracks hit.
  it.skipIf(!hasPython)('Stop ends the program and anything it started', async () => {
    // parent.py starts child.js, which would run for a minute and writes its process id.
    fs.writeFileSync(path.join(folders[0], 'child.js'), 'require("fs").writeFileSync("child.pid", String(process.pid)); setTimeout(() => {}, 60000);\n');
    fs.writeFileSync(path.join(folders[0], 'parent.py'), `import subprocess, time\nsubprocess.Popen([r"${process.execPath}", "child.js"])\ntime.sleep(60)\n`);
    const runtimes = { python: { projectCommand: async (_app, file) => ({ command: 'python', args: [file], windowsHide: true }) } };
    const res = await project.runProjectFile(app, runtimes, 'python', 'parent.py', () => {}, 'cpp-game');
    expect(res.ok).toBe(true);
    const pidFile = path.join(folders[0], 'child.pid');
    for (let i = 0; i < 50 && !fs.existsSync(pidFile); i++) await new Promise(r => setTimeout(r, 100));
    const childPid = Number(fs.readFileSync(pidFile, 'utf8'));
    const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
    expect(alive(childPid)).toBe(true);
    expect(project.killProjectRun(res.runId)).toBe(true);
    for (let i = 0; i < 50 && alive(childPid); i++) await new Promise(r => setTimeout(r, 100));
    expect(alive(childPid)).toBe(false);
  }, 20000);

  it('still renames on a drive that cannot make hard links, and still never overwrites', async () => {
    // FAT32/exFAT drives and some network shares refuse fs.link. Load a second copy of
    // project-fs whose fs.promises.link always fails that way.
    const realFs = require('node:fs');
    const noLinks = { ...realFs, promises: { ...realFs.promises, link: async () => { throw Object.assign(new Error('operation not permitted, link'), { code: 'EPERM' }); } } };
    const m = { exports: {} };
    vm.runInNewContext(fs.readFileSync(require.resolve('../../../desktop/app/project-fs.cjs'), 'utf8'), {
      module: m, process, console,
      require: name => name === 'electron' ? { dialog: {} } : name === 'node:fs' ? noLinks : name.startsWith('./') ? require('../../../desktop/app/' + name.slice(2)) : require(name),
    });
    const fat = m.exports;
    await fat.writeFile(app, 'draft.cpp', 'draft work', 'cpp-game');
    expect((await fat.rename(app, 'draft.cpp', 'final.cpp', 'cpp-game')).ok).toBe(true);
    expect((await fat.readFile(app, 'final.cpp', 'cpp-game')).content).toBe('draft work');
    expect((await fat.readFile(app, 'draft.cpp', 'cpp-game')).missing).toBe(true);
    const clash = await fat.rename(app, 'final.cpp', 'taken.cpp', 'cpp-game');
    expect(clash.ok).toBe(false);
    expect(clash.reason).toContain('already exists');
    expect((await fat.readFile(app, 'taken.cpp', 'cpp-game')).content).toBe('existing work');
  });
});
