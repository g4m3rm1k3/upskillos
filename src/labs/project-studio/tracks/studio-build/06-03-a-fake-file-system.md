---
title: 6.3 — A Fake File System
track: Build Your Own Game Studio
runtime: none
concepts: interfaces-as-ports, test-doubles, fakes, promises, unhappy-path, resolves
problem: The main process is about to read and write real files. Tests that touch the real disk are slow, leave files behind, and can't easily make the disk fail. How can the main process's code be tested without a disk at all?
---

Lesson 6.2's acceptance test wants the studio to show the scene from a project folder. The first part to build is the one that reads it: given a folder, find `scenes/main.json` in it and read its text, or say clearly that the folder isn't a project.

That code will run in the main process, and it will use the disk. Testing it against the real disk works, but costs:

- Every test needs a real folder made, filled and deleted, as `makeProject` does.
- Some cases are hard to arrange on a real disk: a disk that is full, a write that fails half way (lesson 6.5 needs exactly that).
- Tests that share a real folder can disturb each other.

So the code won't use the disk directly. It will use an **interface** that says what it needs from a disk, and a test can hand it a **fake**: a small, working file system that keeps its files in memory. Lesson 1.8 named the kinds of test double: a **stub** returns answers fixed in advance, a **spy** records how it was called, and a **fake** is a real working version of the thing, made simple. A fake file system is the classic example.

## The shape of a project

The main process will send the page a project: where its folder is, and its scene's text. Both sides need to agree on that shape, so it lives where both can see it. Create `src/studio-api.ts`:

```ts file=src/studio-api.ts
export interface Project {
  folder: string;
  text: string;
  problem: string;
}
```

- `Project` is an interface with three strings: `folder`, the project folder's full path; `text`, the scene file's text; `problem`, a message when the folder couldn't be opened, or `''` when all is well.
- Why `problem` as a field, and not an error thrown? This object will travel from one process to another (lesson 6.4), and a message in a field arrives exactly as written. The page then shows it in the console, as it already does for a scene file that doesn't parse.
- It's in `src/` because the page's code is there. The main process will import it too: an `import type` only reads the types, so nothing of the page's code ends up in the main process.

```check
run "npx tsc" label="the shape type-checks"
```

## Files: what the main process needs from a disk

Create `electron/files.ts`:

```ts file=electron/files.ts
import fs from 'node:fs/promises';

export interface Files {
  read(file: string): Promise<string>;
}

export const diskFiles: Files = {
  read: (file) => fs.readFile(file, 'utf8'),
};
```

- `interface Files` lists what the main process needs from a disk. For now, one method: `read(file)` takes a file's path and returns a `Promise<string>`, a promise of its text.
- Why a promise? Reading from a disk takes time: thousands of times longer than running a line of code. A function that waited would freeze everything else in the main process while it did, including the window's menus. So Node's file functions start the read and return a **promise** at once: an object that will hold the result when it's ready. `await` (lesson 0.7) waits for it without freezing anything else.
- `diskFiles` is the real thing: a `Files` that reads from your disk.
  - `node:fs/promises` is Node's file module in the form that returns promises (`fs.readFile` there returns a promise of the text; lesson 6.2's `fs.readFileSync` returned the text itself, after waiting).
  - `read: (file) => fs.readFile(file, 'utf8')` is a property whose value is an arrow function. The `: Files` on `diskFiles` tells TypeScript what `read` must be, so it knows `file` is a `string` without being told: the type flows in from the interface.
- The code that loads a project will take a `Files` as a parameter and never import `node:fs` itself. It depends on what a disk *does*, not on which disk. In the app it gets `diskFiles`; in a test, a fake. An interface used this way, as the one way a piece of code reaches the outside world, is often called a **port**.

```check
run "npx tsc -p electron" label="Files type-checks"
```

## A fake disk

Create `electron/memory-files.ts`:

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
}
```

- `class MemoryFiles implements Files` is a file system that keeps every file in memory: a fake. `implements Files` makes the type checker hold it to the interface: if it ever lacks a method `Files` has, or has it with the wrong types, `tsc` says so. The fake can't drift away from what the code under test expects.
- `private readonly texts = new Map<string, string>()` holds the files: each key is a path, each value that file's text. A `Map` (lesson 2.2) looks a key up directly, however many files there are.
- `add(file, text)` puts a file in, for a test to set up its disk. It isn't part of `Files`: it's how a test arranges the fake, and the code under test never sees it.
- `async read(file)` looks the path up. If there's no such file, `get` returns `undefined`, and `read` throws an error worded like Node's own (`ENOENT: no such file or directory`), so code that handles one handles both.
  - `async` in front of a function makes it return a promise, whatever it returns; and a `throw` inside it becomes a promise that fails (**rejects**) with that error, as a real disk's read does. Code that `await`s it sees the error thrown at the `await`.
  - `ENOENT` is the code operating systems give for "no such file": **E**rror, **NO** **ENT**ry.
- `path.resolve(file)` turns each path into one standard form before using it as a key: on Windows `/games/kart/scenes/main.json` and `\games\kart\scenes\main.json` both become `C:\games\kart\scenes\main.json`. Without it, the same file written two ways would be two different keys, which a real disk would never do. On macOS the path stays as it is.

```check
run "npx tsc -p electron" label="the fake fits the interface"
```

## npm test runs the main process's tests too

The main process's tests will live beside its code, in `electron/`. Change `package.json`:

```json file=package.json
{
  "name": "studio",
  "version": "0.6.0",
  "private": true,
  "type": "module",
  "main": "electron/main.ts",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite build && electron .",
    "typecheck": "tsc && tsc -p electron",
    "test": "vitest run src electron",
    "e2e": "vite build && vitest run e2e",
    "check": "npm run typecheck && npm test && npm run e2e"
  },
  "dependencies": {
    "phaser": "4.2.1",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/node": "24.19.1",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "electron": "44.6.0",
    "playwright": "1.63.0",
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- `"test": "vitest run src electron"` runs the test files in both folders. Vitest runs TypeScript itself, so the `.ts` extensions in imports, which Node needs, are fine here too.

```check
run "npm test" stdout="138 passed" label="the same tests run: electron/ has none yet"
```

## Loading: a test

Create `electron/project.test.ts`:

```ts file=electron/project.test.ts
import { expect, test } from 'vitest';
import { MemoryFiles } from './memory-files.ts';
import { loadProject } from './project.ts';

test("a project's scene is read from scenes/main.json in its folder", async () => {
  const files = new MemoryFiles();
  files.add('/games/kart/scenes/main.json', '{"formatVersion": 1}');
  const project = await loadProject(files, '/games/kart');
  expect(project).toEqual({ folder: '/games/kart', text: '{"formatVersion": 1}', problem: '' });
});
```

- Arrange: a `MemoryFiles` with one file, `/games/kart/scenes/main.json`, holding a scrap of JSON. The test never touches the real disk, and needs no folder made or deleted.
- Act: `await loadProject(files, '/games/kart')`. `loadProject` will be `async`, so the test awaits its promise, and the test function is `async` too (lesson 0.7).
- Assert: the project's `folder` is the one asked for, its `text` is the file's, and `problem` is empty.
- `.ts` on both imports: this file is in `electron/`, where imports name real files.

```check
run "npm test" exit=1 stderr="Cannot find module './project.ts'" label="the test fails: there's no project.ts yet"
```

The first red of a new file is that it doesn't exist: Vitest says `Cannot find module './project.ts'`. A fair first red, once (lesson 2.2); the next one must fail on a check.

## loadProject

Create `electron/project.ts`:

```ts file=electron/project.ts
import path from 'node:path';
import type { Project } from '../src/studio-api.ts';
import type { Files } from './files.ts';

export async function loadProject(files: Files, folder: string): Promise<Project> {
  const text = await files.read(path.join(folder, 'scenes', 'main.json'));
  return { folder, text, problem: '' };
}
```

- `loadProject(files, folder)` is `async` and returns `Promise<Project>`.
- `path.join(folder, 'scenes', 'main.json')` is where a project keeps its scene. `files.read` reads it, through whatever `Files` it was given, and `await` waits for the text.
- It returns the three fields, `problem: ''` because nothing went wrong.
- `import type { Project } from '../src/studio-api.ts'` reads the shape from the page's side. It's `import type`, so stripping (lesson 6.2) deletes the whole line: at run time the main process doesn't load the page's file at all.
- The least code that passes: a missing file isn't handled yet. The next test asks for that.

```check
run "npm test" stdout="139 passed" label="a project's scene is read from its folder"
```

## A folder that isn't a project: a test

Choose a folder with no `scenes/main.json` and today `loadProject` throws `ENOENT`. Lesson 2.2's **unhappy path**: what should happen when the input is wrong? The page should show a problem the user understands, not an error from deep in Node. Change `electron/project.test.ts`:

```ts file=electron/project.test.ts
import { expect, test } from 'vitest';
import { MemoryFiles } from './memory-files.ts';
import { loadProject } from './project.ts';

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
```

- The new test gives `loadProject` an empty fake (`new MemoryFiles()`) and a folder with nothing in it.
- `expect(promise).resolves.toEqual(…)` waits for the promise and checks the value it **resolves** to (succeeds with). If the promise rejects instead, the check fails and says so. `await` in front of `expect` waits for the whole check to finish.
- The expected project has no text and a problem that names the folder and says what's missing.

```check
run "npm test" exit=1 stderr="instead of resolving" label="the test fails: loadProject rejects instead of giving a problem"
```

```text
AssertionError: promise rejected "Error: ENOENT: no such file or directory,…" instead of resolving
Caused by: Error: ENOENT: no such file or directory, open '/games/empty/scenes/main.json'
```

It fails on its check, and the message says exactly what happens now: the promise rejects with the fake's `ENOENT`. Vitest shortens a long value in the first line with `…`; the `Caused by` line under it gives the error whole.

## loadProject, when there's no scene

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
```

- `try { … } catch { … }` (lesson 2.2): if the read rejects, the `await` throws, and the `catch` block runs instead of the rest of the `try`.
- `catch {` with no `(error)`: the error itself isn't used, because the message the user sees is the studio's own, so it isn't named.
- The `catch` returns a project with `text: ''` and the problem. The problem says what the user can act on: this folder isn't a project, because a project has `scenes/main.json`.
- A wider net than it looks: any failure to read, not only a missing file, gives this message. A file the user isn't allowed to read would be reported as missing. That's acceptable for now; a later challenge can tell them apart by the error's `code`.
- Refactor: the two tests and the code are short and say what they mean. Nothing to tidy.

```check
run "npm test" stdout="140 passed" label="a folder without a scene gives a problem, not an error"
```

```predict
question: A test gives loadProject a MemoryFiles holding /games/kart/scenes/main.json, and asks for the folder /games/kart/ (with a slash at the end). What does the project's text hold?
choice: The scene's text: path.join and path.resolve tidy the extra slash away
choice: Nothing, and a problem: '/games/kart/' and '/games/kart' are different folders
choice: It throws: a folder name can't end in a slash
answer: The scene's text: path.join and path.resolve tidy the extra slash away
explain: path.join('/games/kart/', 'scenes', 'main.json') is '/games/kart/scenes/main.json': join removes doubled separators. The fake then looks it up by path.resolve, the same standard form the file was added under. A real disk gives the same answer, which is what a fake must do.
```

## Commit, on the branch

```powershell
git add .
git commit -m "A Files port, a fake file system in memory, and loadProject"
```

```check
git-branch project-folders
git-clean
```

The end-to-end test still fails: `loadProject` works, but nothing calls it. Lesson 6.4 connects it to the page.

## Challenge: missing, or not allowed?

**Optional, ★★.** A real disk can refuse a read for reasons other than a missing file: the file isn't yours to read (`EACCES`), or it's a folder (`EISDIR`). Node's errors carry the code as `error.code`. Make `loadProject` say "is not a project" only for `ENOENT`, and show the error's own message otherwise. Test first: give `MemoryFiles` a way to make one file's read fail with a chosen code.

```hints
nudge: In the fake, an error with a code is new Error(message) with a code property added: Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }).
concept: catch (error) names the error again, and (error as { code?: string }).code reads its code; anything but 'ENOENT' becomes `${folder} couldn't be opened: ${message}`.
```
