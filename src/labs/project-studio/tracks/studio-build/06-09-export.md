---
title: 6.9 — Export
track: Build Your Own Game Studio
runtime: none
concepts: contract-tests, bytes-and-text, recursive-listing, hidden-files, save-dialogs
problem: The studio can write a zip from a list of files. To export a project it needs every file in the folder, in every sub-folder, as bytes, not text, and none of the files the operating system hides there. What must the file system port grow, and how do the fake and the real disk stay in agreement as it does?
---

Lesson 6.8 left a failing acceptance test (click Export, and `tar` can read the zip) and a zip writer. This lesson joins them:

1. `Files` grows what export needs: writing into folders that don't exist yet, bytes as well as text, and listing a folder. Each is a contract test first, run against the real disk and the fake together (lesson 6.5).
2. `exportProject` lists a project, reads every file, and writes the zip, leaving hidden files out.
3. An Export button, through the bridge to the main process and its save dialog.

## A folder that isn't there yet: a contract test

The tests to come write files into sub-folders, like `scenes/main.json` inside a new folder. On a real disk, writing a file into a folder that doesn't exist fails; `MemoryFiles` has no folders at all, so it never fails. That's a difference in the contract, and the fake's tests would pass where the disk fails. Pick one behaviour for both. Studios make folders as they need them (Sprint 7 adds a `scripts` folder), so: writing a file makes its folders. Change `electron/files.test.ts`:

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

  test('a file can be written into a folder that is not there yet', async () => {
    await files.write(path.join(folder, 'new-folder', 'a.txt'), 'hello');
    expect(await files.read(path.join(folder, 'new-folder', 'a.txt'))).toBe('hello');
  });
});
```

- The new test, last in the group, writes `new-folder/a.txt` and reads it back. `new-folder` doesn't exist.
- It runs twice, once for each row, like every test in the group.

```check
run "npm test" exit=1 stderr="diskFiles > a file can be written into a folder that is not there yet" label="the test fails for the real disk only"
```

Only `diskFiles` fails, with Node's `ENOENT: no such file or directory`. `MemoryFiles` passes. This is what contract tests are for: the fake and the real thing disagreed, and now it shows.

## The disk makes folders

Change `electron/files.ts`:

```ts file=electron/files.ts
import fs from 'node:fs/promises';
import path from 'node:path';

export interface Files {
  read(file: string): Promise<string>;
  write(file: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
}

export const diskFiles: Files = {
  read: (file) => fs.readFile(file, 'utf8'),
  write: async (file, text) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, text, 'utf8');
  },
  rename: (from, to) => fs.rename(from, to),
};
```

- `write` is now an `async` function of two steps:
  - `await fs.mkdir(path.dirname(file), { recursive: true })` makes the folder the file goes in. `path.dirname` is the path without its last name: for `…/new-folder/a.txt`, `…/new-folder`. `recursive: true` makes every missing folder on the way, and does nothing if they exist already.
  - then the write, as before.
- `path` joins the imports.

```check
run "npm test" stdout="160 passed" label="both can write into a folder that isn't there"
```

## Bytes: a contract test

A project will hold more than text: images and sounds, from Sprint 10. Their bytes must reach the zip exactly. Text can't carry them: reading bytes as UTF-8 text replaces any sequence that isn't valid UTF-8 with a placeholder, and the original bytes are lost. So `Files` needs to read and write bytes. Change `electron/files.test.ts`:

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

  test('a file can be written into a folder that is not there yet', async () => {
    await files.write(path.join(folder, 'new-folder', 'a.txt'), 'hello');
    expect(await files.read(path.join(folder, 'new-folder', 'a.txt'))).toBe('hello');
  });

  test('bytes written read back the same, every one of the 256 values', async () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    await files.writeBytes(path.join(folder, 'bytes.bin'), bytes);
    expect([...(await files.readBytes(path.join(folder, 'bytes.bin')))]).toEqual([...bytes]);
  });
});
```

- `Uint8Array.from({ length: 256 }, (_, i) => i)` makes 256 bytes holding 0, 1, 2, … 255: every value a byte can have. `{ length: 256 }` is something with a length and no items, and the function fills in each item from its index `i`.
- The test writes them with `writeBytes`, reads them with `readBytes`, and compares the two as plain arrays (`[...bytes]`), so a failure lists the numbers.
- Every value once: the bytes that aren't valid UTF-8 on their own (128 to 255) are among them, so a `Files` that quietly went through text would fail here.

```check
run "npm test" exit=1 stderr="files.writeBytes is not a function" label="the test fails: Files has no bytes yet"
```

## Files reads and writes bytes

Change `electron/files.ts`:

```ts file=electron/files.ts
import fs from 'node:fs/promises';
import path from 'node:path';

export interface Files {
  read(file: string): Promise<string>;
  write(file: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  readBytes(file: string): Promise<Uint8Array>;
  writeBytes(file: string, bytes: Uint8Array): Promise<void>;
}

export const diskFiles: Files = {
  read: (file) => fs.readFile(file, 'utf8'),
  write: async (file, text) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, text, 'utf8');
  },
  rename: (from, to) => fs.rename(from, to),
  readBytes: (file) => fs.readFile(file),
  writeBytes: async (file, bytes) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes);
  },
};
```

- `readBytes(file)` returns a `Promise<Uint8Array>`. `fs.readFile(file)` without `'utf8'` returns the file's bytes as they are, in a `Buffer`, Node's own kind of `Uint8Array`.
- `writeBytes(file, bytes)` makes the folder, then writes the bytes, as `write` does for text.

```check
run "npx tsc -p electron" exit=1 stdout="TS2420" label="the type checker refuses: MemoryFiles has no bytes yet"
```

## The fake keeps bytes

Files on a disk are bytes, and text is bytes in UTF-8; the fake should work the same way, or its text and its bytes could disagree. Change `electron/memory-files.ts`:

```ts file=electron/memory-files.ts
import path from 'node:path';
import type { Files } from './files.ts';

export class MemoryFiles implements Files {
  private readonly contents = new Map<string, Uint8Array>();

  add(file: string, text: string): void {
    this.contents.set(path.resolve(file), new TextEncoder().encode(text));
  }

  async read(file: string): Promise<string> {
    return new TextDecoder().decode(await this.readBytes(file));
  }

  async write(file: string, text: string): Promise<void> {
    await this.writeBytes(file, new TextEncoder().encode(text));
  }

  async rename(from: string, to: string): Promise<void> {
    const bytes = await this.readBytes(from);
    this.contents.delete(path.resolve(from));
    this.contents.set(path.resolve(to), bytes);
  }

  async readBytes(file: string): Promise<Uint8Array> {
    const bytes = this.contents.get(path.resolve(file));
    if (bytes === undefined) throw new Error(`ENOENT: no such file or directory, open '${file}'`);
    return bytes;
  }

  async writeBytes(file: string, bytes: Uint8Array): Promise<void> {
    this.contents.set(path.resolve(file), bytes);
  }
}
```

- The `Map` is now `contents`, from path to `Uint8Array`: the fake stores bytes, as a disk does.
- `readBytes` and `writeBytes` are what `read` and `write` were, with bytes. `readBytes` still throws `ENOENT` for a missing file.
- Text is bytes in UTF-8 at the edges:
  - `add` and `write` turn text into bytes with `new TextEncoder().encode(text)`;
  - `read` turns bytes into text with `new TextDecoder().decode(bytes)`;
  - and both go through the byte methods, so there's one place a file is stored.
- `rename` moves the bytes.
- This changed how the fake works inside, and every earlier test of it, and of the code that uses it, still runs.

```check
run "npx tsc -p electron" label="the fake fits the interface again"
run "npm test" stdout="162 passed" label="bytes, every value, read back the same from both"
```

## Listing a folder: a contract test

Export needs every file in the project, including those in sub-folders, as names inside the zip. Change `electron/files.test.ts`:

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

  test('a file can be written into a folder that is not there yet', async () => {
    await files.write(path.join(folder, 'new-folder', 'a.txt'), 'hello');
    expect(await files.read(path.join(folder, 'new-folder', 'a.txt'))).toBe('hello');
  });

  test('bytes written read back the same, every one of the 256 values', async () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    await files.writeBytes(path.join(folder, 'bytes.bin'), bytes);
    expect([...(await files.readBytes(path.join(folder, 'bytes.bin')))]).toEqual([...bytes]);
  });

  test('list gives every file under a folder, in sub-folders too, with / between names, sorted', async () => {
    const inside = path.join(folder, 'listed');
    await files.write(path.join(inside, 'scenes', 'main.json'), '{}');
    await files.write(path.join(inside, 'b.txt'), 'b');
    expect(await files.list(inside)).toEqual(['b.txt', 'scenes/main.json']);
  });
});
```

- The new test writes two files into a fresh folder, `listed`: one at its top, one in `scenes`.
- `files.list(inside)` must return both, as paths *inside* the folder, with `/` between names (the zip's way, on every system), sorted.
- Why sorted? A disk lists a folder in whatever order it keeps it, which differs between systems. Sorting makes the list, and so the zip, the same everywhere.

```check
run "npm test" exit=1 stderr="files.list is not a function" label="the test fails: Files can't list yet"
```

## Files lists

Change `electron/files.ts`:

```ts file=electron/files.ts
import fs from 'node:fs/promises';
import path from 'node:path';

export interface Files {
  read(file: string): Promise<string>;
  write(file: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  readBytes(file: string): Promise<Uint8Array>;
  writeBytes(file: string, bytes: Uint8Array): Promise<void>;
  list(folder: string): Promise<string[]>;
}

export const diskFiles: Files = {
  read: (file) => fs.readFile(file, 'utf8'),
  write: async (file, text) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, text, 'utf8');
  },
  rename: (from, to) => fs.rename(from, to),
  readBytes: (file) => fs.readFile(file),
  writeBytes: async (file, bytes) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes);
  },
  list: async (folder) => {
    const entries = await fs.readdir(folder, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(folder, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
      .sort();
  },
};
```

- `list(folder)` returns a `Promise<string[]>`.
- `fs.readdir(folder, { recursive: true, withFileTypes: true })` reads the folder and every folder inside it. `withFileTypes` gives each entry as an object that knows its `name`, the folder it's in (`parentPath`), and whether it's a file (`isFile()`), instead of only a name.
- Then three steps, each making a new array:
  - `.filter((entry) => entry.isFile())` keeps files and drops folders: a folder isn't something to put in a zip, the paths of its files are.
  - `.map(…)` turns each into its path inside `folder`: `path.join(entry.parentPath, entry.name)` is its full path, `path.relative(folder, …)` the part after `folder`, and `.split(path.sep).join('/')` swaps the system's separator (`path.sep`: `\` on Windows, `/` on macOS) for `/`.
  - `.sort()` puts the paths in order.

```check
run "npx tsc -p electron" exit=1 stdout="TS2420" label="the type checker refuses: MemoryFiles can't list yet"
```

## The fake lists

Change `electron/memory-files.ts`:

```ts file=electron/memory-files.ts
import path from 'node:path';
import type { Files } from './files.ts';

export class MemoryFiles implements Files {
  private readonly contents = new Map<string, Uint8Array>();

  add(file: string, text: string): void {
    this.contents.set(path.resolve(file), new TextEncoder().encode(text));
  }

  async read(file: string): Promise<string> {
    return new TextDecoder().decode(await this.readBytes(file));
  }

  async write(file: string, text: string): Promise<void> {
    await this.writeBytes(file, new TextEncoder().encode(text));
  }

  async rename(from: string, to: string): Promise<void> {
    const bytes = await this.readBytes(from);
    this.contents.delete(path.resolve(from));
    this.contents.set(path.resolve(to), bytes);
  }

  async readBytes(file: string): Promise<Uint8Array> {
    const bytes = this.contents.get(path.resolve(file));
    if (bytes === undefined) throw new Error(`ENOENT: no such file or directory, open '${file}'`);
    return bytes;
  }

  async writeBytes(file: string, bytes: Uint8Array): Promise<void> {
    this.contents.set(path.resolve(file), bytes);
  }

  async list(folder: string): Promise<string[]> {
    const inside = path.resolve(folder) + path.sep;
    return [...this.contents.keys()]
      .filter((file) => file.startsWith(inside))
      .map((file) => file.slice(inside.length).split(path.sep).join('/'))
      .sort();
  }
}
```

- `const inside = path.resolve(folder) + path.sep` is the folder's standard path with a separator after it. Every file inside starts with it. The separator matters: without it, `/games/kart` would also match `/games/kartoon/…`.
- `[...this.contents.keys()]` is every stored path, as an array.
- `filter` keeps those inside (`file.startsWith(inside)` is `true` when the string `file` begins with `inside`); `map` cuts `inside` off the front (`slice(inside.length)`) and swaps separators for `/`; `sort` orders them. The same three steps as the disk's, on the fake's paths.

```check
run "npx tsc -p electron" label="the fake fits the interface again"
run "npm test" stdout="164 passed" label="both list a folder, sub-folders too, the same way"
```

## Export: a test

Change `electron/project.test.ts`:

```ts file=electron/project.test.ts
import { expect, test } from 'vitest';
import { MemoryFiles } from './memory-files.ts';
import { exportProject, loadProject, saveScene } from './project.ts';
import { zip } from './zip.ts';

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

test("an export is a zip of every file in the project, with the files' paths inside it", async () => {
  const files = new MemoryFiles();
  files.add('/games/kart/scenes/main.json', '{}');
  files.add('/games/kart/notes.txt', 'laps: 3');
  await exportProject(files, '/games/kart', '/backups/kart.zip');
  const expected = zip([
    { name: 'notes.txt', data: new TextEncoder().encode('laps: 3') },
    { name: 'scenes/main.json', data: new TextEncoder().encode('{}') },
  ]);
  expect(await files.readBytes('/backups/kart.zip')).toEqual(expected);
});
```

- `zip` joins the imports, and so does `exportProject`.
- A fake project with two files, one in `scenes`. `exportProject(files, '/games/kart', '/backups/kart.zip')` must write, at `/backups/kart.zip`, exactly the zip that `zip` makes from those two files, in sorted order.
- Comparing whole zips works because `zip` always makes the same bytes from the same files (lesson 6.8's fixed date). And `zip` itself is tested against `tar`, so this test only has to check that `exportProject` hands it the right files.

```check
run "npm test" exit=1 stderr="exportProject is not a function" label="the test fails: there's no exportProject yet"
```

## exportProject

Change `electron/project.ts`:

```ts file=electron/project.ts
import path from 'node:path';
import type { Project } from '../src/studio-api.ts';
import type { Files } from './files.ts';
import { zip, type ZipEntry } from './zip.ts';

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

export async function exportProject(files: Files, folder: string, zipFile: string): Promise<string[]> {
  const entries: ZipEntry[] = [];
  for (const name of await files.list(folder)) {
    entries.push({ name, data: await files.readBytes(path.join(folder, name)) });
  }
  await files.writeBytes(zipFile, zip(entries));
  return entries.map((entry) => entry.name);
}
```

- `exportProject(files, folder, zipFile)`:
  - `for (const name of await files.list(folder))` goes through every file in the project. The `await` happens once, before the loop starts.
  - For each, it reads the bytes, `files.readBytes(path.join(folder, name))`, and adds a `ZipEntry`. `path.join` turns the `/` in the name back into the system's separator.
  - `files.writeBytes(zipFile, zip(entries))` writes the zip.
  - It returns the names it put in, `entries.map((entry) => entry.name)`. The studio doesn't use them yet; the next test does.
- `zip` and the type `ZipEntry` are imported from `./zip.ts`.

```check
run "npm test" stdout="165 passed" label="an export is a zip of the project's files"
```

## Hidden files: a test

Folders hold files you never made. macOS leaves a `.DS_Store` in folders you open in Finder; a project kept in Git has a `.git` folder holding its whole history. Neither belongs in a game you send someone. By convention on macOS and Linux, a name that starts with a dot is **hidden**. Change `electron/project.test.ts`:

```ts file=electron/project.test.ts
import { expect, test } from 'vitest';
import { MemoryFiles } from './memory-files.ts';
import { exportProject, loadProject, saveScene } from './project.ts';
import { zip } from './zip.ts';

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

test("an export is a zip of every file in the project, with the files' paths inside it", async () => {
  const files = new MemoryFiles();
  files.add('/games/kart/scenes/main.json', '{}');
  files.add('/games/kart/notes.txt', 'laps: 3');
  await exportProject(files, '/games/kart', '/backups/kart.zip');
  const expected = zip([
    { name: 'notes.txt', data: new TextEncoder().encode('laps: 3') },
    { name: 'scenes/main.json', data: new TextEncoder().encode('{}') },
  ]);
  expect(await files.readBytes('/backups/kart.zip')).toEqual(expected);
});

test('an export leaves out hidden files and folders, whose names start with a dot', async () => {
  const files = new MemoryFiles();
  files.add('/games/kart/scenes/main.json', '{}');
  files.add('/games/kart/.DS_Store', 'x');
  files.add('/games/kart/.git/HEAD', 'x');
  expect(await exportProject(files, '/games/kart', '/backups/kart.zip')).toEqual(['scenes/main.json']);
});
```

- A project with a scene, a `.DS_Store`, and `.git/HEAD`, a file inside a hidden folder.
- The names `exportProject` returns must be only `scenes/main.json`.

```check
run "npm test" exit=1 stderr="to deeply equal [ 'scenes/main.json' ]" label="the test fails: hidden files go into the zip"
```

```text
AssertionError: expected [ '.DS_Store', '.git/HEAD', …(1) ] to deeply equal [ 'scenes/main.json' ]
```

## exportProject leaves hidden files out

Change `electron/project.ts`:

```ts file=electron/project.ts
import path from 'node:path';
import type { Project } from '../src/studio-api.ts';
import type { Files } from './files.ts';
import { zip, type ZipEntry } from './zip.ts';

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

export async function exportProject(files: Files, folder: string, zipFile: string): Promise<string[]> {
  const entries: ZipEntry[] = [];
  for (const name of await files.list(folder)) {
    if (name.split('/').some((part) => part.startsWith('.'))) continue;
    entries.push({ name, data: await files.readBytes(path.join(folder, name)) });
  }
  await files.writeBytes(zipFile, zip(entries));
  return entries.map((entry) => entry.name);
}
```

- `if (name.split('/').some((part) => part.startsWith('.'))) continue;` skips a file if any part of its path starts with a dot: the file's own name, or any folder it's in.
  - `split('/')` makes `'.git/HEAD'` into `['.git', 'HEAD']`.
  - `some(…)` is `true` if the function is `true` for at least one item.
  - `continue` skips the rest of this turn of the loop and goes on to the next name.

```check
run "npm test" stdout="166 passed" label="hidden files and folders are left out"
```

## The bridge exports

Change `src/studio-api.ts`:

```ts file=src/studio-api.ts
export interface Project {
  folder: string;
  text: string;
  problem: string;
}

export interface StudioApi {
  load(): Promise<Project>;
  save(text: string): Promise<void>;
  open(): Promise<string>;
  exportZip(): Promise<string>;
}

declare global {
  interface Window {
    studio: StudioApi;
  }
}
```

- `exportZip()` asks the main process to export the open project. It resolves to a problem to show, or `''`. (It isn't called `export`, which is a word JavaScript uses for itself.)

```check
run "npx tsc" exit=1 stdout="TS2741" label="the toolbar test's stub can't export yet"
```

The toolbar test's stub has fallen behind the interface again (lesson 6.7); it's changed in the button's test step.

## The preload sends it

Change `electron/preload.cjs`:

```js file=electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studio', {
  load: () => ipcRenderer.invoke('project:load'),
  save: (text) => ipcRenderer.invoke('scene:save', text),
  open: () => ipcRenderer.invoke('project:open'),
  exportZip: () => ipcRenderer.invoke('project:export'),
});
```

- `exportZip: () => ipcRenderer.invoke('project:export')`: a message with nothing in it. As with Open, the main process asks the user where, so the page can't choose a path.

```check
contains electron/preload.cjs "ipcRenderer.invoke('project:export')"
```

## The main process exports

Change `electron/main.ts`:

```ts file=electron/main.ts
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { diskFiles } from './files.ts';
import { exportProject, loadProject, saveScene } from './project.ts';

let folder = path.resolve(process.argv[2] ?? path.join(app.getAppPath(), 'example'));

ipcMain.handle('project:load', () => loadProject(diskFiles, folder));
ipcMain.handle('scene:save', (_event, text: unknown) => {
  if (typeof text !== 'string') throw new Error('A scene is saved as text');
  return saveScene(diskFiles, folder, text);
});
ipcMain.handle('project:open', async (event) => {
  const choice = await dialog.showOpenDialog({ title: 'Open a project folder', properties: ['openDirectory'] });
  if (choice.canceled) return '';
  const project = await loadProject(diskFiles, choice.filePaths[0]);
  if (project.problem !== '') return project.problem;
  folder = project.folder;
  event.sender.reload();
  return '';
});
ipcMain.handle('project:export', async () => {
  const choice = await dialog.showSaveDialog({
    title: 'Export the project',
    defaultPath: `${path.basename(folder)}.zip`,
    filters: [{ name: 'Zip files', extensions: ['zip'] }],
  });
  if (choice.canceled || !choice.filePath) return '';
  try {
    await exportProject(diskFiles, folder, choice.filePath);
    return '';
  } catch (error) {
    return `The project wasn't exported: ${(error as Error).message}`;
  }
});

function openWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: { preload: path.join(import.meta.dirname, 'preload.cjs') },
  });
  win.loadFile(path.join(import.meta.dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(openWindow);
app.on('window-all-closed', () => app.quit());
```

- `exportProject` joins the import.
- The handler for `'project:export'`:
  - `dialog.showSaveDialog({ … })` shows the system's "save as" dialog. `defaultPath` suggests a name, the project folder's name with `.zip` (`path.basename` is the last part of a path). `filters` makes the dialog offer zip files.
  - `if (choice.canceled || !choice.filePath) return '';`: cancelled, or no path chosen: nothing to do, nothing to report. `||` is "or": either one is enough.
  - `await exportProject(diskFiles, folder, choice.filePath)` does the export.
  - A failure (a full disk, a folder you can't write to) is caught and returned as a problem the console shows.

```check
run "npx tsc -p electron" label="the main process type-checks"
```

## An Export button: a test

Change `src/ui/Toolbar.test.tsx`:

```tsx file=src/ui/Toolbar.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { EditorStore } from '../editor/store';
import type { StudioApi } from '../studio-api';
import { Toolbar } from './Toolbar';

const studio: StudioApi = {
  load: async () => ({ folder: '', text: '', problem: '' }),
  save: async () => {},
  open: async () => '',
  exportZip: async () => '',
};

test('the button says Play while editing, and Stop while playing', () => {
  const store = new EditorStore({ formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } }, () => {});
  expect(renderToStaticMarkup(<Toolbar store={store} studio={studio} />)).toContain('<button type="button" id="play">Play</button>');
  store.play();
  expect(renderToStaticMarkup(<Toolbar store={store} studio={studio} />)).toContain('<button type="button" id="play">Stop</button>');
});

test('the chosen tool is marked', () => {
  const store = new EditorStore({ formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } }, () => {});
  store.setTool('rotate');
  const html = renderToStaticMarkup(<Toolbar store={store} studio={studio} />);
  expect(html).toContain('<button type="button" id="tool-move" class="">move</button>');
  expect(html).toContain('<button type="button" id="tool-rotate" class="selected">rotate</button>');
});

test('the snap box is ticked when snapping is on', () => {
  const store = new EditorStore({ formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } }, () => {});
  expect(renderToStaticMarkup(<Toolbar store={store} studio={studio} />)).toContain('<input type="checkbox" id="snap"/>');
  store.setSnap(true);
  expect(renderToStaticMarkup(<Toolbar store={store} studio={studio} />)).toContain('<input type="checkbox" id="snap" checked=""/>');
});

test('there are Save, Open and Export buttons', () => {
  const store = new EditorStore({ formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } }, () => {});
  const html = renderToStaticMarkup(<Toolbar store={store} studio={studio} />);
  expect(html).toContain('<button type="button" id="save">Save</button>');
  expect(html).toContain('<button type="button" id="open">Open</button>');
  expect(html).toContain('<button type="button" id="export">Export</button>');
});
```

- The stub gets `exportZip: async () => ''`.
- The buttons' test checks for the Export button too, and its name lists all three.

```check
run "npx tsc" label="the stub fits the API again"
run "npm test" exit=1 stderr="id=\"export\">Export" label="the test fails: there's no Export button"
```

## The Export button

Change `src/ui/Toolbar.tsx`:

```tsx file=src/ui/Toolbar.tsx
import type { EditorStore, Tool } from '../editor/store';
import type { StudioApi } from '../studio-api';
import { useStore } from './useStore';

const TOOLS: Tool[] = ['move', 'rotate', 'scale'];

export function Toolbar({ store, studio }: { store: EditorStore; studio: StudioApi }) {
  useStore(store);
  return (
    <div className="toolbar">
      <button type="button" id="save" onClick={() => store.save((text) => studio.save(text))}>
        Save
      </button>
      <button type="button" id="open" onClick={async () => store.report(await studio.open())}>
        Open
      </button>
      <button type="button" id="export" onClick={async () => store.report(await studio.exportZip())}>
        Export
      </button>
      <button type="button" id="play" onClick={() => (store.playing ? store.stop() : store.play())}>
        {store.playing ? 'Stop' : 'Play'}
      </button>
      {TOOLS.map((tool) => (
        <button
          key={tool}
          type="button"
          id={`tool-${tool}`}
          className={store.tool === tool ? 'selected' : ''}
          onClick={() => store.setTool(tool)}
        >
          {tool}
        </button>
      ))}
      <label>
        <input type="checkbox" id="snap" checked={store.snap} onChange={(event) => store.setSnap(event.target.checked)} />{' '}
        snap
      </label>
    </div>
  );
}
```

- `onClick={async () => store.report(await studio.exportZip())}`: as Open, it asks the main process and reports the answer.

```check
run "npm test" stdout="166 passed" label="there are Save, Open and Export buttons"
run "npm run e2e" timeout=180 stdout="16 passed" label="the acceptance test passes: the export is a zip tar can read"
```

## Merge, and tick the third story

Tick the third Sprint 6 story in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "Export: every file in the project, hidden ones left out, as a zip"
git switch main
git merge export-a-zip
git branch -d export-a-zip
```

```check
contains BACKLOG.md "- [x] As a game maker, I want to export my project as one zip file"
git-branch main
git-no-branch export-a-zip
git-clean
```

Try it: `npm start`, click Export, and save the zip on your desktop. Open it in Finder or Explorer: `scenes/main.json` is inside, and nothing else from the `example` folder you didn't put there.

```predict
question: You export a project whose folder holds scenes/main.json, notes/.todo.txt and .hidden/readme.txt. Which names are in the zip?
choice: scenes/main.json only
choice: scenes/main.json and .hidden/readme.txt
choice: scenes/main.json and notes/.todo.txt
answer: scenes/main.json only
explain: exportProject skips a file if any part of its path starts with a dot. notes/.todo.txt's own name does; .hidden/readme.txt is inside a hidden folder. Only scenes/main.json has no part starting with a dot.
```

## Challenge: exporting into the project

**Optional, ★★.** Export a project and save the zip inside the project folder itself. Export again. What's in the second zip? Fix it so a project's export never contains its own exports, test first with `MemoryFiles`.

```hints
nudge: The second zip contains the first one: list finds it, because it's a file in the folder.
concept: Two fixes: leave out every .zip file, or leave out only the one being written (compare each file's full path with zipFile). The second is more exact; the first is simpler to explain to a user.
```
