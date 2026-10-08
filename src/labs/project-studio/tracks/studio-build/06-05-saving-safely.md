---
title: 6.5 — Saving, Safely
track: Build Your Own Game Studio
runtime: none
concepts: atomic-writes, failure-injection, contract-tests, describe-each, test-hooks
problem: Saving looks like one line, write the text to the file. But a write can fail half way, when a disk fills up or the power goes, and then the scene file is half old and half nothing. How do you save so that the file is always either the old scene or the new one, and how do you test a failure you can't easily cause?
---

Sprint 6's first story:

> As a game maker, I want to save my scene, so that my changes are still there the next time I open the studio.

It crosses both processes: the page has the scene and a Save button; the main process writes the file. This lesson builds the main process's half and its acceptance test; lesson 6.6 builds the page's half, and the acceptance test passes there.

## A branch for the story

```powershell
git switch -c save-the-scene
```

- A new branch from `main`, for this story (lesson 6.2). Its acceptance test will fail until lesson 6.6.

```check
git-branch save-the-scene
```

## Reading back what was saved

The story's test will check the file on disk after saving, so it needs to read the player's x from a project folder. Change `e2e/project.ts`:

```ts file=e2e/project.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function makeProject(playerX: number): string {
  const scene = JSON.parse(fs.readFileSync(path.join('example', 'scenes', 'main.json'), 'utf8'));
  const player = scene.root.children.find((child: { name: string }) => child.name === 'player');
  player.props.position.x = playerX;
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-'));
  fs.mkdirSync(path.join(folder, 'scenes'));
  fs.writeFileSync(path.join(folder, 'scenes', 'main.json'), JSON.stringify(scene, null, 2));
  return folder;
}

export function savedPlayerX(folder: string): number {
  const scene = JSON.parse(fs.readFileSync(path.join(folder, 'scenes', 'main.json'), 'utf8'));
  return scene.root.children.find((child: { name: string }) => child.name === 'player').props.position.x;
}
```

- `savedPlayerX(folder)` reads the folder's `scenes/main.json`, parses it, finds the player, and returns its x.
- It finds the player the same way `makeProject` does. That's two copies of the same search: noted, and left for lesson 6.6's refactor, once the test using it passes.

```check
run "npx tsc" label="the helper type-checks"
```

## The acceptance test

Change `e2e/files.test.ts`:

```ts file=e2e/files.test.ts
import fs from 'node:fs';
import { expect, test } from 'vitest';
import { _electron as electron } from 'playwright';
import { makeProject, savedPlayerX } from './project';

test('the studio opens the scene in the project folder it is started with', async () => {
  const folder = makeProject(123);
  const app = await electron.launch({ args: ['.', folder] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.textContent('#player-x')).toBe('123');
  } finally {
    await app.close();
    fs.rmSync(folder, { recursive: true });
  }
}, 30000);

test('a saved scene is there the next time the studio opens the folder', async () => {
  const folder = makeProject(400);
  try {
    const app = await electron.launch({ args: ['.', folder] });
    try {
      const page = await app.firstWindow();
      await expect.poll(() => page.locator('#save').count()).toBe(1);
      await page.click('[data-path="level/player"]');
      await page.fill('#prop-position-x', '100');
      await page.press('#prop-position-x', 'Enter');
      await page.click('#save');
      await expect.poll(() => savedPlayerX(folder)).toBe(100);
    } finally {
      await app.close();
    }
    const again = await electron.launch({ args: ['.', folder] });
    try {
      const page = await again.firstWindow();
      await expect.poll(() => page.textContent('#player-x')).toBe('100');
    } finally {
      await again.close();
    }
  } finally {
    fs.rmSync(folder, { recursive: true });
  }
}, 30000);
```

- The new test is the story's acceptance criterion, as a user would check it: change something, save, close the studio, open it again on the same folder, and the change is there.
- `await expect.poll(() => page.locator('#save').count()).toBe(1)` first: there's no Save button yet, so the test fails fast on that, saying so, instead of waiting for a click that can't happen (lesson 4.5).
- It changes the player's x to 100 in the inspector, as lesson 4.7's test does, then clicks `#save`.
- `await expect.poll(() => savedPlayerX(folder)).toBe(100)` waits until the file on disk says 100. Saving takes a message to the main process and a write, so the test waits for the file, not for a fixed time.
- Then it closes the app, starts a second one (`again`) on the same folder, and waits for the readout to say 100. The scene can only have come from the file.
- Each app has its own `try`/`finally`, so each is closed even if a check fails. The outer `finally` deletes the folder whatever happened.

```check
run "npm run e2e" timeout=180 exit=1 stderr="expected +0 to be 1" label="the test fails: there's no Save button yet"
```

## Files can write

Saving needs `Files` to write. Change `electron/files.ts`:

```ts file=electron/files.ts
import fs from 'node:fs/promises';

export interface Files {
  read(file: string): Promise<string>;
  write(file: string, text: string): Promise<void>;
}

export const diskFiles: Files = {
  read: (file) => fs.readFile(file, 'utf8'),
  write: (file, text) => fs.writeFile(file, text, 'utf8'),
};
```

- `write(file, text)` writes `text` to `file`, making it if it isn't there and replacing it if it is. It returns `Promise<void>`: a promise with no value, which resolves when the write is done.
- `diskFiles.write` hands over to Node's `fs.writeFile`, with `'utf8'` to turn the characters into bytes.

```check
run "npx tsc -p electron" exit=1 stdout="TS2420" label="the type checker refuses: MemoryFiles doesn't write yet"
```

The type checker refuses straight away:

```text
electron/memory-files.ts(4,14): error TS2420: Class 'MemoryFiles' incorrectly implements interface 'Files'.
  Property 'write' is missing in type 'MemoryFiles' but required in type 'Files'.
electron/project.test.ts(8,37): error TS2741: Property 'write' is missing in type 'MemoryFiles' but required in type 'Files'.
electron/project.test.ts(13,28): error TS2741: Property 'write' is missing in type 'MemoryFiles' but required in type 'Files'.
```

- The first error is `implements Files` doing its job: the fake can't fall behind the interface. `(4,14)` is the line and column.
- The other two are the same gap seen from the tests: each passes a `MemoryFiles` to `loadProject`, which wants a `Files`, and a `MemoryFiles` no longer is one.

## The fake writes too

Change `electron/memory-files.ts`:

```ts file=electron/memory-files.ts
import path from 'node:path';
import type { Files } from './files.ts';

export class MemoryFiles implements Files {
  private readonly texts = new Map<string, string>();

  add(file: string, text: string): void {
    this.texts.set(path.resolve(file), text);
  }

  async read(file: string): Promise<string> {
    const text = this.texts.get(path.resolve(file));
    if (text === undefined) throw new Error(`ENOENT: no such file or directory, open '${file}'`);
    return text;
  }

  async write(file: string, text: string): Promise<void> {
    this.texts.set(path.resolve(file), text);
  }
}
```

- `write` sets the path's text in the `Map`, replacing any that was there. It's `async` so that it returns a promise, as the interface says.
- It does what `add` does. The difference is who uses it: `add` is for a test arranging its disk; `write` is part of `Files`, for the code under test.

```check
run "npx tsc -p electron" label="the fake fits the interface again"
```

## Saving: a test

Change `electron/project.test.ts`:

```ts file=electron/project.test.ts
import { expect, test } from 'vitest';
import { MemoryFiles } from './memory-files.ts';
import { loadProject, saveScene } from './project.ts';

test("a project's scene is read from scenes/main.json in its folder", async () => {
  const files = new MemoryFiles();
  files.add('/games/kart/scenes/main.json', '{"formatVersion": 1}');
  const project = await loadProject(files, '/games/kart');
  expect(project).toEqual({ folder: '/games/kart', text: '{"formatVersion": 1}', problem: '' });
});

test('a folder without scenes/main.json gives a problem to show, not an error', async () => {
  await expect(loadProject(new MemoryFiles(), '/games/empty')).resolves.toEqual({
    folder: '/games/empty',
    text: '',
    problem: '/games/empty is not a project: it has no scenes/main.json',
  });
});

test('a saved scene is what the project loads next time', async () => {
  const files = new MemoryFiles();
  files.add('/games/kart/scenes/main.json', 'old');
  await saveScene(files, '/games/kart', 'new');
  expect((await loadProject(files, '/games/kart')).text).toBe('new');
});
```

- The new test is the last one. A fake disk with an old scene; `saveScene(files, '/games/kart', 'new')`; then `loadProject` must read `'new'`.
- It checks the save through `loadProject`, the way the studio will read it back, not by looking inside the fake. The test says what saving is *for*: the next load sees it.

```check
run "npm test" exit=1 stderr="saveScene is not a function" label="the test fails: there's no saveScene yet"
```

## saveScene

Change `electron/project.ts`:

```ts file=electron/project.ts
import path from 'node:path';
import type { Project } from '../src/studio-api.ts';
import type { Files } from './files.ts';

export async function loadProject(files: Files, folder: string): Promise<Project> {
  try {
    const text = await files.read(path.join(folder, 'scenes', 'main.json'));
    return { folder, text, problem: '' };
  } catch {
    return { folder, text: '', problem: `${folder} is not a project: it has no scenes/main.json` };
  }
}

export async function saveScene(files: Files, folder: string, text: string): Promise<void> {
  await files.write(path.join(folder, 'scenes', 'main.json'), text);
}
```

- `saveScene(files, folder, text)` writes the text to the project's `scenes/main.json`, through `files`, and waits for the write.
- The least code that passes. It has a weakness, which the next test shows.

```check
run "npm test" stdout="141 passed" label="a saved scene is what the project loads next"
```

## A save that fails part way: a test

A real write isn't instant. The operating system writes a file's bytes a block at a time, and if the disk fills up, or the program is stopped, or the power fails part way, the file is left with some of the new bytes and none of the rest. With `saveScene` as it is, that file is the only copy of the scene: the old scene is gone, and the new one is cut short.

You can't make a real disk fill up on cue in a test. But a fake can be told to fail. Change `electron/project.test.ts`:

```ts file=electron/project.test.ts
import { expect, test } from 'vitest';
import { MemoryFiles } from './memory-files.ts';
import { loadProject, saveScene } from './project.ts';

test("a project's scene is read from scenes/main.json in its folder", async () => {
  const files = new MemoryFiles();
  files.add('/games/kart/scenes/main.json', '{"formatVersion": 1}');
  const project = await loadProject(files, '/games/kart');
  expect(project).toEqual({ folder: '/games/kart', text: '{"formatVersion": 1}', problem: '' });
});

test('a folder without scenes/main.json gives a problem to show, not an error', async () => {
  await expect(loadProject(new MemoryFiles(), '/games/empty')).resolves.toEqual({
    folder: '/games/empty',
    text: '',
    problem: '/games/empty is not a project: it has no scenes/main.json',
  });
});

test('a saved scene is what the project loads next time', async () => {
  const files = new MemoryFiles();
  files.add('/games/kart/scenes/main.json', 'old');
  await saveScene(files, '/games/kart', 'new');
  expect((await loadProject(files, '/games/kart')).text).toBe('new');
});

class DiskFillsUp extends MemoryFiles {
  override async write(file: string, text: string): Promise<void> {
    await super.write(file, text.slice(0, 5));
    throw new Error('ENOSPC: no space left on device');
  }
}

test('a save that fails part way leaves the scene as it was', async () => {
  const files = new DiskFillsUp();
  files.add('/games/kart/scenes/main.json', 'the old scene');
  await expect(saveScene(files, '/games/kart', 'the new scene')).rejects.toThrow('ENOSPC');
  expect((await loadProject(files, '/games/kart')).text).toBe('the old scene');
});
```

- `class DiskFillsUp extends MemoryFiles` is a fake that fails the way a full disk does. **Failure injection**: making a double fail on purpose, to test what the code does when the world goes wrong.
  - `extends MemoryFiles` makes it a `MemoryFiles` in every way, except what it changes.
  - `override async write(file, text)` replaces `write`. `override` says it's meant to replace one that exists: if `MemoryFiles` had no `write`, the type checker would say so.
  - `await super.write(file, text.slice(0, 5))` calls `MemoryFiles`'s own `write` (`super` is the class it extends), with only the first five characters: `'the n'`. Then it throws Node's error for a full disk, `ENOSPC` ("no space").
- The test: the old scene is `'the old scene'`; saving `'the new scene'` must fail, and afterwards the project must still load `'the old scene'`.
- `await expect(promise).rejects.toThrow('ENOSPC')` checks the promise rejects with an error whose message contains `ENOSPC`. A failed save must still say it failed, so the page can tell the user.

```check
run "npm test" exit=1 stderr="expected 'the n' to be 'the old scene'" label="the test fails: a failed save leaves half a scene"
```

```text
AssertionError: expected 'the n' to be 'the old scene' // Object.is equality
```

There it is: after the failed save, the scene file holds `'the n'`. Neither scene survived.

## Write, then rename

The fix is a technique nearly every program that saves files uses, from text editors to databases: write the new text to a *different* file first, and only when that has fully succeeded, rename it over the old one.

- A **rename** within one disk doesn't copy any bytes: the operating system changes which name points at which data, in one step. Afterwards, `main.json` is either the old file or the new one, never something in between. An operation that happens entirely or not at all is called **atomic**.
- If the write fails, only the other file is spoiled. `main.json` was never touched.

`Files` needs to rename. Change `electron/files.ts`:

```ts file=electron/files.ts
import fs from 'node:fs/promises';

export interface Files {
  read(file: string): Promise<string>;
  write(file: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
}

export const diskFiles: Files = {
  read: (file) => fs.readFile(file, 'utf8'),
  write: (file, text) => fs.writeFile(file, text, 'utf8'),
  rename: (from, to) => fs.rename(from, to),
};
```

- `rename(from, to)` gives the file at `from` the name `to`, replacing any file already called `to`. `diskFiles.rename` hands over to Node's `fs.rename`, which does that on macOS and on Windows.

```check
run "npx tsc -p electron" exit=1 stdout="TS2420" label="the type checker refuses: MemoryFiles doesn't rename yet"
```

## The fake renames

Change `electron/memory-files.ts`:

```ts file=electron/memory-files.ts
import path from 'node:path';
import type { Files } from './files.ts';

export class MemoryFiles implements Files {
  private readonly texts = new Map<string, string>();

  add(file: string, text: string): void {
    this.texts.set(path.resolve(file), text);
  }

  async read(file: string): Promise<string> {
    const text = this.texts.get(path.resolve(file));
    if (text === undefined) throw new Error(`ENOENT: no such file or directory, open '${file}'`);
    return text;
  }

  async write(file: string, text: string): Promise<void> {
    this.texts.set(path.resolve(file), text);
  }

  async rename(from: string, to: string): Promise<void> {
    const text = await this.read(from);
    this.texts.delete(path.resolve(from));
    this.texts.set(path.resolve(to), text);
  }
}
```

- `rename` reads the text at `from` (which rejects with `ENOENT`, as a disk would, if it isn't there), deletes `from` from the `Map`, and sets `to`. Setting a key that exists replaces its value: the old file at `to` is replaced, as on a disk.

```check
run "npx tsc -p electron" label="the fake fits the interface again"
```

## saveScene, safely

Change `electron/project.ts`:

```ts file=electron/project.ts
import path from 'node:path';
import type { Project } from '../src/studio-api.ts';
import type { Files } from './files.ts';

export async function loadProject(files: Files, folder: string): Promise<Project> {
  try {
    const text = await files.read(path.join(folder, 'scenes', 'main.json'));
    return { folder, text, problem: '' };
  } catch {
    return { folder, text: '', problem: `${folder} is not a project: it has no scenes/main.json` };
  }
}

export async function saveScene(files: Files, folder: string, text: string): Promise<void> {
  const file = path.join(folder, 'scenes', 'main.json');
  await files.write(`${file}.saving`, text);
  await files.rename(`${file}.saving`, file);
}
```

- `const file = path.join(folder, 'scenes', 'main.json')` is the scene's path.
- ``await files.write(`${file}.saving`, text)`` writes the new text to `main.json.saving`, beside the real file. If this fails, it rejects, `saveScene` stops here, and `main.json` is untouched.
- ``await files.rename(`${file}.saving`, file)`` runs only if the write succeeded. It puts the finished file in place, in one step.
- A failed save can leave a `main.json.saving` behind. That's harmless: it isn't the scene, and the next save replaces it.

```check
run "npm test" stdout="142 passed" label="a failed save leaves the old scene as it was"
```

## Refactor: one place for the scene's path

`path.join(folder, 'scenes', 'main.json')` is now written twice in `project.ts`, once in each function. If a project's scene ever moves, both must change together. Change `electron/project.ts`:

```ts file=electron/project.ts
import path from 'node:path';
import type { Project } from '../src/studio-api.ts';
import type { Files } from './files.ts';

function scenePath(folder: string): string {
  return path.join(folder, 'scenes', 'main.json');
}

export async function loadProject(files: Files, folder: string): Promise<Project> {
  try {
    const text = await files.read(scenePath(folder));
    return { folder, text, problem: '' };
  } catch {
    return { folder, text: '', problem: `${folder} is not a project: it has no scenes/main.json` };
  }
}

export async function saveScene(files: Files, folder: string, text: string): Promise<void> {
  const file = scenePath(folder);
  await files.write(`${file}.saving`, text);
  await files.rename(`${file}.saving`, file);
}
```

- `scenePath(folder)` is the one place that says where a project's scene is. Both functions use it.
- It isn't exported: nothing outside this file needs it.

```check
run "npm test" stdout="142 passed" label="the same tests pass"
```

## Is the fake honest? A contract test

Every test of `saveScene` trusts `MemoryFiles` to behave like a real disk. If the fake's `rename` kept the old file, or its `read` of a missing file returned `''` instead of failing, those tests would pass, and the studio would still break on a real disk. A fake is only worth using while it's true to the real thing.

A **contract test** checks that. It's one set of tests that both the real thing and the fake must pass: the contract they share. Create `electron/files.test.ts`:

```ts file=electron/files.test.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { diskFiles, type Files } from './files.ts';
import { MemoryFiles } from './memory-files.ts';

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'files-test-'));
afterAll(() => fs.rmSync(folder, { recursive: true }));

describe.each([
  { name: 'diskFiles', files: diskFiles },
  { name: 'MemoryFiles', files: new MemoryFiles() as Files },
])('$name', ({ files }) => {
  test('a written file reads back the same', async () => {
    await files.write(path.join(folder, 'a.txt'), 'hello');
    expect(await files.read(path.join(folder, 'a.txt'))).toBe('hello');
  });

  test('reading a file that is not there fails, saying so', async () => {
    await expect(files.read(path.join(folder, 'none.txt'))).rejects.toThrow('ENOENT');
  });

  test('a rename replaces the file it is renamed to', async () => {
    await files.write(path.join(folder, 'old.txt'), 'old');
    await files.write(path.join(folder, 'new.txt'), 'new');
    await files.rename(path.join(folder, 'new.txt'), path.join(folder, 'old.txt'));
    expect(await files.read(path.join(folder, 'old.txt'))).toBe('new');
    await expect(files.read(path.join(folder, 'new.txt'))).rejects.toThrow('ENOENT');
  });
});
```

- `fs.mkdtempSync(…)` makes a real temporary folder, once, when the file is loaded. The real disk needs a real place; the fake uses the same paths, in memory.
- `afterAll(() => fs.rmSync(folder, { recursive: true }))` deletes it after the file's last test. `afterAll` is a **hook**: a function Vitest runs at a fixed point instead of as a test. (Its relatives: `beforeAll` runs once before the first test, `beforeEach` and `afterEach` around every test.) Putting cleanup in a hook means it runs even if a test fails.
- `describe.each([...])('$name', ({ files }) => { … })` is lesson 2.3's table of cases, for a whole group: the same tests run once for each row.
  - Each row has a `name` and a `files`. `'$name'` in the group's title is replaced by the row's name, so the report shows `diskFiles > a written file reads back the same` and `MemoryFiles > a written file reads back the same`: you can see which one broke.
  - `new MemoryFiles() as Files` says to treat it as a plain `Files`, so both rows have exactly the same type. The tests may only use what the contract has.
  - The function after `'$name'` gets each row, and takes its `files` out (destructuring).
- The three tests are the behaviour `saveScene` relies on: what's written reads back; a missing file fails with `ENOENT`; a rename replaces the file it's renamed to, and the old name is gone.
- `await expect(…).rejects.toThrow('ENOENT')`: both must fail the same way, since `loadProject` turns that failure into its problem message.

```check
run "npm test" stdout="148 passed" label="the real disk and the fake keep the same contract"
```

All six pass at once: the code being checked, both `Files`, already exists. A contract test written after the code says what the code relied on, so that a later change to either side can't quietly break the agreement.

Break it on purpose (lesson 0.7): in `memory-files.ts`, delete the line `this.texts.delete(path.resolve(from));` and run `npm test`. Only `MemoryFiles > a rename replaces the file it is renamed to` fails: the fake now keeps the old name, and the real disk doesn't. Put the line back.

## Commit, on the branch

```powershell
git add .
git commit -m "saveScene: write, then rename; a contract test for Files; a failing test for saving"
```

```check
git-branch save-the-scene
git-clean
```

The acceptance test still fails: the main process can save, but nothing asks it to. Lesson 6.6 adds the page's half.

## Challenge: no stray files

**Optional, ★★.** A failed save leaves `main.json.saving` behind. Make `saveScene` delete it when the write fails, and still reject with the write's error. You'll need `remove(file)` in `Files` (`fs.rm` on disk), a contract test for it, and a test with `DiskFillsUp` that the `.saving` file is gone afterwards.

```hints
nudge: try { await files.write(saving, text); } catch (error) { await files.remove(saving); throw error; }
concept: throw error inside the catch passes the same error on, so the caller still learns the save failed, and why.
shape: remove(file: string): Promise<void>; and in diskFiles: remove: (file) => fs.rm(file, { force: true })
```
