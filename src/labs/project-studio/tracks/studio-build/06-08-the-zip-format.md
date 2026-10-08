---
title: 6.8 — The Zip Format
track: Build Your Own Game Studio
runtime: none
concepts: file-formats, bytes, little-endian, checksums, test-oracles, triangulation
problem: A zip file is one file holding many. Programs on every computer can open it, which means it follows exact rules about every byte. What are those rules, how do you write bytes one by one in TypeScript, and how do you test a file format when the only real judge is someone else's program?
---

Sprint 6's third story:

> As a game maker, I want to export my project as one zip file, so that I can back it up or send it to someone.

A **zip** file holds many files, and their folders, in one. Every operating system can open one. This lesson writes zips; lesson 6.9 puts a project's files into one.

Why write the format ourselves, when npm has packages that do it? Because a file format is one of the things this sprint is about. Game projects are folders of files; games themselves are made of formats (images, sounds, levels); and a format is just an agreement about bytes. Writing one, byte by byte, makes that concrete, and the simplest correct zip is about 50 lines.

## A branch for the story

```powershell
git switch -c export-a-zip
```

```check
git-branch export-a-zip
```

## The acceptance test

Change `e2e/files.test.ts`:

```ts file=e2e/files.test.ts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
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

test('Open switches the studio to the project folder you choose', async () => {
  const first = makeProject(400);
  const second = makeProject(250);
  const app = await electron.launch({ args: ['.', first] });
  try {
    await app.evaluate(({ dialog }, chosen) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [chosen] })) as typeof dialog.showOpenDialog;
    }, second);
    const page = await app.firstWindow();
    await expect.poll(() => page.locator('#open').count()).toBe(1);
    await page.click('#open');
    await expect.poll(() => page.textContent('#player-x')).toBe('250');
  } finally {
    await app.close();
    fs.rmSync(first, { recursive: true });
    fs.rmSync(second, { recursive: true });
  }
}, 30000);

test('Export writes the project as a zip, which tar can list', async () => {
  const folder = makeProject(400);
  const zipFile = path.join(folder, '..', `${path.basename(folder)}.zip`);
  const app = await electron.launch({ args: ['.', folder] });
  try {
    await app.evaluate(({ dialog }, chosen) => {
      dialog.showSaveDialog = (async () => ({ canceled: false, filePath: chosen })) as typeof dialog.showSaveDialog;
    }, zipFile);
    const page = await app.firstWindow();
    await expect.poll(() => page.locator('#export').count()).toBe(1);
    await page.click('#export');
    await expect.poll(() => fs.existsSync(zipFile)).toBe(true);
    expect(execFileSync('tar', ['-tf', zipFile], { encoding: 'utf8' })).toContain('scenes/main.json');
  } finally {
    await app.close();
    fs.rmSync(folder, { recursive: true });
    fs.rmSync(zipFile, { force: true });
  }
}, 30000);
```

- The new test is the last one. It starts the studio on a new project, stubs the main process's save dialog (`dialog.showSaveDialog`, the "where should I save this?" dialog) to answer with a path beside the project folder, and clicks `#export`.
- `await expect.poll(() => fs.existsSync(zipFile)).toBe(true)` waits for the zip to appear. `fs.existsSync(path)` is `true` if there's a file there.
- Then it asks an outside program whether the zip is right. `execFileSync('tar', ['-tf', zipFile], { encoding: 'utf8' })` runs `tar`, a program for packed files that every macOS and Windows 10 or later has, and returns what it printed. `-t` lists what's inside, `-f` names the file. The list must contain `scenes/main.json`.
- `execFileSync` (from `node:child_process`) starts a program and waits for it to finish. The program's arguments are a list, each passed as it is, so a path with spaces in it is still one argument.
- The `finally` deletes the project and the zip (`force: true`: no error if the zip was never made).

```check
run "npm run e2e" timeout=180 exit=1 stderr="expected +0 to be 1" label="the test fails: there's no Export button yet"
```

## How a zip is laid out

A file is a list of **bytes**. A byte is a whole number from 0 to 255: eight bits. Everything in a file, text included, is bytes; a format is the rule for what each one means.

A zip, at its simplest (files stored as they are, not compressed), is three kinds of block, one after another:

1. For each file, a **local header** (30 bytes plus the name), then the file's bytes.
2. For each file again, a **central directory record** (46 bytes plus the name): the same facts as its local header, plus where that header starts.
3. One **end record** (22 bytes): how many files there are, and where the central directory starts.

A program opening a zip reads it from the end: the end record says where the directory is, the directory lists every file and where its header starts. So it can list a zip of a thousand files without reading them, and jump straight to the one it wants.

Each block starts with a four-byte **signature**, a fixed number that says what kind of block it is. Written as bytes, each signature starts with `0x50 0x4b`, the letters `P` and `K`: the initials of Phil Katz, who invented the format in 1989.

Numbers in a zip are stored **little-endian**: least important byte first. The number `0x06054b50` (in hexadecimal, as lesson 4.7's colours were) is stored as the four bytes `50 4b 05 06`. Most computers store numbers in memory the same way, which is why the format chose it.

Every file's record also holds its **CRC-32**: a 32-bit number computed from the file's bytes, called a **checksum**. If even one bit of the file changes, its CRC almost certainly does, so a program unpacking a zip can check the bytes arrived unchanged. Node can compute it.

## A learning test for crc32

Node's `zlib` module has `crc32`, but how do you know it computes the same CRC the zip format means? There are several 32-bit CRCs. The standard way to tell them apart is the **check value**: the CRC of the nine characters `123456789`. For zip's CRC-32 it's `0xcbf43926`. Create `electron/zip.test.ts`:

```ts file=electron/zip.test.ts
import { crc32 } from 'node:zlib';
import { expect, test } from 'vitest';

test("learning test: Node's crc32 gives the standard check value", () => {
  expect(crc32('123456789')).toBe(0xcbf43926);
});
```

- A **learning test** (lesson 2.1) checks that code you didn't write does what you think. If a later Node version changed `crc32`, this would say so before any zip went wrong.
- It passes at once, as a learning test should: it's a question about the world, not a spec for new code.
- `crc32` needs Node 22.2 or newer. If yours is older, this test fails with `crc32 is not a function`: update Node.

```check
run "npm test" stdout="155 passed" label="Node's crc32 is the CRC zip uses"
```

## The empty zip: a test

The smallest zip has no files: only the end record. Change `electron/zip.test.ts`:

```ts file=electron/zip.test.ts
import { crc32 } from 'node:zlib';
import { expect, test } from 'vitest';
import { zip } from './zip.ts';

test("learning test: Node's crc32 gives the standard check value", () => {
  expect(crc32('123456789')).toBe(0xcbf43926);
});

test('an empty zip is only the end record: 22 bytes that start PK 5 6', () => {
  const bytes = zip([]);
  expect(bytes.length).toBe(22);
  expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
});
```

- `zip([])` must return exactly 22 bytes, the end record alone.
- `bytes.slice(0, 4)` takes the first four bytes, and `[...…]` spreads them into a plain array so `toEqual` can compare them with the four expected: `50 4b 05 06`, the end record's signature, little-endian.

```check
run "npm test" exit=1 stderr="Cannot find module './zip.ts'" label="the test fails: there's no zip.ts yet"
```

## zip, empty

Create `electron/zip.ts`:

```ts file=electron/zip.ts
export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export function zip(entries: ZipEntry[]): Uint8Array {
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  return new Uint8Array(end.buffer);
}
```

- `interface ZipEntry` is one file to put in a zip: its `name` inside the zip (like `scenes/main.json`, always with `/` between folders) and its `data`.
- `Uint8Array` is an array of bytes: each item is a whole number from 0 to 255 ("unsigned 8-bit integer"). It's how JavaScript holds raw bytes.
- `new ArrayBuffer(22)` makes 22 bytes of memory, every one 0. An `ArrayBuffer` is only memory; you read and write it through a **view**.
- `new DataView(buffer)` is a view for writing numbers of different sizes at chosen places:
  - `setUint32(0, 0x06054b50, true)` writes a four-byte number at byte 0. `true` means little-endian.
  - `setUint16(8, entries.length, true)` writes a two-byte number at byte 8: the number of files (twice: once for "on this disk" and once in all, from when zips could span several floppy disks).
- Every other field stays 0: no files, so the directory's size and place are 0, and no comment.
- `new Uint8Array(end.buffer)` gives the same 22 bytes as an array of bytes, which is what `zip` returns.

```check
run "npm test" stdout="156 passed" label="an empty zip is its end record"
```

## One file: a test, judged by tar

How do you test a format? Comparing with bytes you worked out by hand only proves you made the same mistakes twice. Better to ask a program that already reads zips. A program used to decide whether a result is right is a **test oracle**; here, `tar`. Change `electron/zip.test.ts`:

```ts file=electron/zip.test.ts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crc32 } from 'node:zlib';
import { afterAll, expect, test } from 'vitest';
import { zip, type ZipEntry } from './zip.ts';

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-test-'));
afterAll(() => fs.rmSync(folder, { recursive: true }));

function text(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function zipFile(entries: ZipEntry[]): string {
  const file = path.join(folder, `${entries.length}.zip`);
  fs.writeFileSync(file, zip(entries));
  return file;
}

function namesIn(file: string): string[] {
  return execFileSync('tar', ['-tf', file], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter((line) => line !== '');
}

function textIn(file: string, name: string): string {
  return execFileSync('tar', ['-xOf', file, name], { encoding: 'utf8' });
}

test("learning test: Node's crc32 gives the standard check value", () => {
  expect(crc32('123456789')).toBe(0xcbf43926);
});

test('an empty zip is only the end record: 22 bytes that start PK 5 6', () => {
  const bytes = zip([]);
  expect(bytes.length).toBe(22);
  expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
});

test('tar, a program that already reads zips, lists and unpacks a zip of one file', () => {
  const file = zipFile([{ name: 'a.txt', data: text('first') }]);
  expect(namesIn(file)).toEqual(['a.txt']);
  expect(textIn(file, 'a.txt')).toBe('first');
});
```

- `folder` is a temporary folder for the test's zips, deleted by the `afterAll` hook (lesson 6.5).
- `text(value)` turns a string into its bytes: `new TextEncoder()` makes an encoder, and its `.encode(value)` returns the string's bytes as a `Uint8Array`, written as **UTF-8**, the encoding nearly every file uses.
- `zipFile(entries)` writes `zip(entries)` to a file named after how many entries there are, and returns its path. `fs.writeFileSync` takes bytes as readily as text.
- `namesIn(file)` runs `tar -tf` and turns its output into a list of names: `split(/\r?\n/)` cuts it into lines (Windows ends a line with `\r\n`, macOS with `\n`; the `\r?` takes either), and `filter` drops the empty line after the last newline.
- `textIn(file, name)` runs `tar -xOf file name`: `-x` unpacks, `-O` writes the unpacked file to the output instead of to disk, so the test gets its text.
- The test zips one file, `a.txt` holding `first`, and asks `tar` for the list and the text back.

```check
run "npm test" exit=1 stderr="expected [] to deeply equal [ 'a.txt' ]" label="the test fails: tar finds no files in the zip"
```

`tar` reads the zip without complaint, but finds nothing in it: `zip` still writes only the end record.

## zip, with files

Change `electron/zip.ts`:

```ts file=electron/zip.ts
import { crc32 } from 'node:zlib';

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export function zip(entries: ZipEntry[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    const crc = crc32(entry.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(12, 0x21, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, entry.data.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, entry.data);

    const record = new DataView(new ArrayBuffer(46));
    record.setUint32(0, 0x02014b50, true);
    record.setUint16(4, 20, true);
    record.setUint16(6, 20, true);
    record.setUint16(14, 0x21, true);
    record.setUint32(16, crc, true);
    record.setUint32(20, entry.data.length, true);
    record.setUint32(24, entry.data.length, true);
    record.setUint16(28, name.length, true);
    central.push(new Uint8Array(record.buffer), name);

    offset += 30 + name.length + entry.data.length;
  }
  const centralSize = central.reduce((total, part) => total + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return concat([...parts, ...central, new Uint8Array(end.buffer)]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const all = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) {
    all.set(part, at);
    at += part.length;
  }
  return all;
}
```

- `import { crc32 } from 'node:zlib'`: the function the learning test checked.
- `parts` collects, in order, every block of bytes before the directory: each file's header, name and data. `central` collects the directory's records. `offset` counts how many bytes `parts` holds so far.
- For each entry:
  - `new TextEncoder().encode(entry.name)` is the name as bytes. The headers hold the name's length in bytes, which for a name with an accent is more than its number of characters.
  - `crc32(entry.data)` is the file's checksum.
  - The local header, 30 bytes, field by field:

    | Byte | Size | Field | Value |
    |---|---|---|---|
    | 0 | 4 | signature | `0x04034b50` |
    | 4 | 2 | version needed to read it | `20`, meaning 2.0 |
    | 6 | 2 | flags | 0 |
    | 8 | 2 | compression | 0: stored as it is |
    | 10 | 2 | time | 0: midnight |
    | 12 | 2 | date | `0x21`: 1 January 1980 |
    | 14 | 4 | CRC-32 | `crc` |
    | 18 | 4 | size in the zip | the data's length |
    | 22 | 4 | size unpacked | the same: nothing is compressed |
    | 26 | 2 | name length | `name.length` |
    | 28 | 2 | extra field length | 0 |

  - `parts.push(header, name, data)` adds the three blocks, in order.
  - The central record, 46 bytes, holds the same facts at its own places (a "made by" version at 4, then the rest from 6), and two more fields that matter here: the name's length at 28 and, at 42, where this file's local header starts. That last one isn't written yet; the next test asks for it.
  - `offset += 30 + name.length + entry.data.length`: the bytes this file took up in `parts`.
- After the loop, `offset` is where the directory starts, and `centralSize` its size. `central.reduce((total, part) => total + part.length, 0)` adds up the lengths: `reduce` walks an array carrying a running value, here starting at `0` and adding each part's length.
- The end record now also gets the directory's size (byte 12) and where it starts (byte 16).
- `concat(…)` joins all the blocks into one `Uint8Array`:
  - it makes an array as long as all the parts together;
  - `all.set(part, at)` copies a part's bytes into it, starting at `at`;
  - and `at` moves on by that part's length.
- `concat([...parts, ...central, new Uint8Array(end.buffer)])`: the spread `...` puts each array's items into one new list, in that order, with the end record last.
- Why the date `0x21`? The format stores a date in 16 bits as year-since-1980 (7 bits), month (4 bits) and day (5 bits). All zeros would be month 0, which isn't a date, and some programs show it as 1979. Every export gets the same date, so the same project always gives exactly the same bytes: tests can compare zips, and so can you.

```check
run "npm test" stdout="157 passed" label="tar lists and unpacks a zip of one file"
```

## Two files: a test

One file passes, but one file can hide a mistake: its local header starts at byte 0, and the record's "where it starts" field is 0 whether or not the code ever sets it. A second file starts somewhere else. Change `electron/zip.test.ts`:

```ts file=electron/zip.test.ts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crc32 } from 'node:zlib';
import { afterAll, expect, test } from 'vitest';
import { zip, type ZipEntry } from './zip.ts';

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-test-'));
afterAll(() => fs.rmSync(folder, { recursive: true }));

function text(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function zipFile(entries: ZipEntry[]): string {
  const file = path.join(folder, `${entries.length}.zip`);
  fs.writeFileSync(file, zip(entries));
  return file;
}

function namesIn(file: string): string[] {
  return execFileSync('tar', ['-tf', file], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter((line) => line !== '');
}

function textIn(file: string, name: string): string {
  return execFileSync('tar', ['-xOf', file, name], { encoding: 'utf8' });
}

test("learning test: Node's crc32 gives the standard check value", () => {
  expect(crc32('123456789')).toBe(0xcbf43926);
});

test('an empty zip is only the end record: 22 bytes that start PK 5 6', () => {
  const bytes = zip([]);
  expect(bytes.length).toBe(22);
  expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
});

test('tar, a program that already reads zips, lists and unpacks a zip of one file', () => {
  const file = zipFile([{ name: 'a.txt', data: text('first') }]);
  expect(namesIn(file)).toEqual(['a.txt']);
  expect(textIn(file, 'a.txt')).toBe('first');
});

test('tar finds each file in a zip of two, by where the zip says it starts', () => {
  const file = zipFile([
    { name: 'a.txt', data: text('first') },
    { name: 'scenes/main.json', data: text('{}') },
  ]);
  expect(namesIn(file)).toEqual(['a.txt', 'scenes/main.json']);
  expect(textIn(file, 'scenes/main.json')).toBe('{}');
});
```

- The new test zips two files, one of them in a folder, and asks `tar` for both names and the second file's text.
- This is **triangulation** (lesson 4.7): a second example that the first could pass without the code being general.

```check
run "npm test" exit=1 stderr="Invalid header" label="the test fails: tar can't find the second file's header"
```

```text
tar: Invalid header
tar: Error exit delayed from previous errors.
Error: Command failed: tar -tf …/2.zip
```

- `tar` looked for the second file's header where the directory said, byte 0, and found the first file's. It refuses the zip, exits with an error, and `execFileSync` turns that into a thrown error.
- The oracle's verdict is the failure here, rather than an `expect`: the zip is wrong in a way `tar` won't even list.

## Where each file starts

Change `electron/zip.ts`:

```ts file=electron/zip.ts
import { crc32 } from 'node:zlib';

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export function zip(entries: ZipEntry[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    const crc = crc32(entry.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(12, 0x21, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, entry.data.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, entry.data);

    const record = new DataView(new ArrayBuffer(46));
    record.setUint32(0, 0x02014b50, true);
    record.setUint16(4, 20, true);
    record.setUint16(6, 20, true);
    record.setUint16(14, 0x21, true);
    record.setUint32(16, crc, true);
    record.setUint32(20, entry.data.length, true);
    record.setUint32(24, entry.data.length, true);
    record.setUint16(28, name.length, true);
    record.setUint32(42, offset, true);
    central.push(new Uint8Array(record.buffer), name);

    offset += 30 + name.length + entry.data.length;
  }
  const centralSize = central.reduce((total, part) => total + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return concat([...parts, ...central, new Uint8Array(end.buffer)]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const all = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) {
    all.set(part, at);
    at += part.length;
  }
  return all;
}
```

- One line: `record.setUint32(42, offset, true)` writes where this file's header starts. It's written before `offset` moves on, so it's the offset of this file, not the next.

```check
run "npm test" stdout="158 passed" label="tar finds every file in a zip of two"
```

## Refactor: names for the numbers

`zip.ts` is right, but full of unexplained numbers. A reader meeting `0x02014b50` has to look it up; `0x21` is a date nobody would guess. Change `electron/zip.ts`:

```ts file=electron/zip.ts
import { crc32 } from 'node:zlib';

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_RECORD = 0x06054b50;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

export function zip(entries: ZipEntry[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    const crc = crc32(entry.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, LOCAL_HEADER, true);
    local.setUint16(4, 20, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, entry.data.length, true);
    local.setUint32(22, entry.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, entry.data);

    const record = new DataView(new ArrayBuffer(46));
    record.setUint32(0, CENTRAL_HEADER, true);
    record.setUint16(4, 20, true);
    record.setUint16(6, 20, true);
    record.setUint16(14, DOS_DATE, true);
    record.setUint32(16, crc, true);
    record.setUint32(20, entry.data.length, true);
    record.setUint32(24, entry.data.length, true);
    record.setUint16(28, name.length, true);
    record.setUint32(42, offset, true);
    central.push(new Uint8Array(record.buffer), name);

    offset += 30 + name.length + entry.data.length;
  }
  const centralSize = central.reduce((total, part) => total + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, END_RECORD, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return concat([...parts, ...central, new Uint8Array(end.buffer)]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const all = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) {
    all.set(part, at);
    at += part.length;
  }
  return all;
}
```

- `LOCAL_HEADER`, `CENTRAL_HEADER` and `END_RECORD` name the three signatures. Constants that are fixed by the format, and never change, are written in capitals (as lesson 5.8's `GRID`).
- `DOS_DATE = (0 << 9) | (1 << 5) | 1` builds the date from its parts, so it reads as a date: year 0 since 1980, month 1, day 1.
  - `<<` shifts a number's bits left: `1 << 5` is `1` moved up five bits, `100000` in binary, which is 32. It puts the month in bits 5 to 8.
  - `|` combines bits: each bit of the result is 1 if it's 1 in either side. The three parts sit in different bits, so `|` here works like adding them: `0 + 32 + 1 = 33`, which is `0x21`.
- The field offsets (14, 18, 26, …) stay as numbers: each is used once, next to the value written there, and the table above is their reference.
- The same four tests pass. A refactor is checked by the tests that were already there.

```check
run "npm test" stdout="158 passed" label="the same tests pass"
```

## Commit, on the branch

```powershell
git add .
git commit -m "A zip writer, checked against tar; a failing test for Export"
```

```check
git-branch export-a-zip
git-clean
```

Lesson 6.9 puts a project's files into a zip and adds the Export button; the acceptance test passes there.

## Challenge: compressed

**Optional, ★★★.** Stored files take as much room as the originals. Make `zip` compress each file with Node's `zlib.deflateRawSync(data)`: set the compression field to 8 ("deflate") and the "size in the zip" fields to the compressed length, while the CRC and "size unpacked" stay those of the original bytes. Your tar tests are the oracle: they must still pass, unchanged. Is a scene file smaller? Is a PNG image?

```hints
nudge: Compute const packed = deflateRawSync(entry.data) once per file, write packed instead of entry.data into parts, and use packed.length for the two "size in the zip" fields and the offset.
concept: A PNG is already compressed, so deflating it again saves almost nothing. Zip lets each file choose: real tools store a file whenever deflate wouldn't make it smaller.
```
