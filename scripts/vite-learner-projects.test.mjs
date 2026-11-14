import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { devConfigFile, insideProjects, learnerProjectIgnore, projectRoots } from './vite-learner-projects.mjs';

describe('the dev server ignores learner project folders', () => {
  const repo = '/home/me/open-calc';
  it('ignores files inside a project folder, including one inside the repository', () => {
    const ignore = insideProjects(['/home/me/open-calc/my-kit', '/home/me/blockfall'], repo, 'linux');
    expect(ignore('/home/me/open-calc/my-kit/kit/count.py')).toBe(true);
    expect(ignore('/home/me/open-calc/my-kit')).toBe(true);
    expect(ignore('/home/me/blockfall/index.html')).toBe(true);
  });
  it('still watches the app, including a sibling whose name only starts the same', () => {
    const ignore = insideProjects(['/home/me/open-calc/my-kit'], repo, 'linux');
    expect(ignore('/home/me/open-calc/src/main.jsx')).toBe(false);
    expect(ignore('/home/me/open-calc/my-kit-notes/a.md')).toBe(false);
  });
  it('never ignores the app itself when a chosen folder contains it', () => {
    const ignore = insideProjects(['/home/me', '/home/me/open-calc'], repo, 'linux');
    expect(ignore('/home/me/open-calc/src/main.jsx')).toBe(false);
  });
  it('compares Windows paths without regard to case', () => {
    const ignore = insideProjects(['C:\\Users\\Me\\open-calc\\Kit'], 'C:\\Users\\Me\\open-calc', 'win32');
    expect(ignore('c:\\users\\me\\open-calc\\kit\\count.py')).toBe(path.sep === '\\');
  });
  it('reads every folder the desktop app recorded', () => {
    expect(projectRoots({ projectRoot: '/a', projects: { kit: '/b', hub: '/a', none: null } })).toEqual(['/a', '/b']);
    expect(projectRoots(null)).toEqual([]);
    expect(devConfigFile('darwin', {}, '/Users/me')).toBe(path.join('/Users/me', 'Library', 'Application Support', 'Electron', 'project-config.json'));
  });

  let dir;
  afterEach(() => { if (dir) fs.rmSync(dir, { recursive: true, force: true }); });
  it('picks up a folder chosen while the server runs, and works before the app has saved anything', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learner-projects-'));
    const file = path.join(dir, 'project-config.json');
    const kit = path.join(dir, 'kit');
    const ignore = learnerProjectIgnore(path.join(dir, 'app'), { file, ttlMs: 0 });
    expect(ignore(path.join(kit, 'a.py'))).toBe(false);
    fs.writeFileSync(file, JSON.stringify({ projects: { 'swe-kit': kit } }));
    expect(ignore(path.join(kit, 'a.py'))).toBe(true);
  });
});
