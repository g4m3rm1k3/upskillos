// Private lessons: real folders on disk, remembered and read as the desktop app does
// (desktop/app/private-lessons.cjs), then built into courses (privateLessons.js).
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPrivateLessons, privateSupportFiles } from './privateLessons.js';

const require = createRequire(import.meta.url);
const privateLessons = require('../../../desktop/app/private-lessons.cjs');
const repoRoot = path.resolve(import.meta.dirname, '../../..');

const LESSON = `---
title: 1.1 — Sign In
runtime: python
support: tests/test_login.py
---

Intro.

## A form

\`\`\`python file=login.py
USER = None
\`\`\`

\`\`\`check
file login.py
\`\`\`
`;

const made = [];
afterEach(() => { for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });
function temp(prefix) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); made.push(dir); return dir; }
function folder(name, files) {
  const root = path.join(temp('private-lib-'), name);
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
}
// A stand-in for Electron's app: its settings go to a temp folder, and it runs from this repo.
function fakeApp() {
  const appData = temp('appdata-');
  return { isPackaged: false, getPath: () => appData, getAppPath: () => path.join(repoRoot, 'desktop', 'app') };
}

describe('private lessons', () => {
  it('remembers a folder and reads it as a course, with a chapter per subfolder and its supplied files', () => {
    const app = fakeApp();
    const lib = folder('My App Lessons', {
      '01-01-setup.md': LESSON.replace('1.1 — Sign In', '0.1 — Setup'),
      'accounts/01-01-sign-in.md': LESSON,
      'accounts/support/tests/test_login.py': 'def test(): pass\n',
    });
    expect(privateLessons.addFolder(app, lib)).toEqual({ ok: true, id: 'my-app-lessons' });
    expect(privateLessons.addFolder(app, lib), 'the same folder twice').toEqual({ ok: true, id: 'my-app-lessons' });
    const built = buildPrivateLessons(privateLessons.list(app));
    expect(built.series).toHaveLength(1);
    const course = built.series[0];
    expect(course).toMatchObject({ key: 'private-my-app-lessons', label: '🔒 My App Lessons', privateId: 'my-app-lessons', level: 'private' });
    expect(course.chapters.map(c => c.key)).toEqual(['private-my-app-lessons', 'private-my-app-lessons-accounts']);
    expect(built.tracks['private-my-app-lessons-accounts'][0].title).toBe('1.1 — Sign In');
    expect(privateSupportFiles(built, 'private-my-app-lessons-accounts', 'tests/test_login.py')[0].content).toContain('def test');
    expect(fs.readFileSync(privateLessons.settingsFile(app), 'utf8')).not.toContain('Sign In');
  });

  it('refuses a folder inside the public repository', () => {
    const result = privateLessons.addFolder(fakeApp(), path.join(repoRoot, 'docs'));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/public UpSkillOS repository/);
  });

  it('gives two folders with the same name different keys, and forgets one without touching its files', () => {
    const app = fakeApp();
    const a = folder('Lessons', { '01-01-a.md': LESSON }), b = folder('Lessons', { '01-01-b.md': LESSON });
    expect(privateLessons.addFolder(app, a).id).toBe('lessons');
    expect(privateLessons.addFolder(app, b).id).toBe('lessons-2');
    expect(buildPrivateLessons(privateLessons.list(app)).series.map(s => s.key)).toEqual(['private-lessons', 'private-lessons-2']);
    privateLessons.remove(app, 'lessons');
    expect(buildPrivateLessons(privateLessons.list(app)).series.map(s => s.key)).toEqual(['private-lessons-2']);
    expect(fs.existsSync(path.join(a, '01-01-a.md'))).toBe(true);
  });

  it('skips a remembered folder that has gone, without hiding the others', () => {
    const app = fakeApp();
    const gone = folder('Old', { '01-01-a.md': LESSON }), kept = folder('Kept', { '01-01-a.md': LESSON });
    privateLessons.addFolder(app, gone); privateLessons.addFolder(app, kept);
    fs.rmSync(gone, { recursive: true });
    const listing = privateLessons.list(app);
    expect(listing.libraries.find(l => l.id === 'old').missing).toBe(true);
    expect(buildPrivateLessons(listing).series.map(s => s.key)).toEqual(['private-kept']);
  });
});
