---
title: 3.1 — A Project Folder, and Not One Inch Beyond It
track: MiniDesk — Files
trackOrder: 60.02
runtime: none
---

An editor opens a folder and reads and writes files in it. That is also the most dangerous thing the app does: if the page can send any path, a bug (or a malicious script) can read `C:\Users\you\.ssh` or overwrite something important. So the main process owns the filesystem, and every path it receives is **resolved against the project folder and refused if it lands outside**.

UpSkillOS's `desktop/app/project-fs.cjs` does the same job. You write the small version here, test-first.

## A test script

Add a `test` script to `package.json`:

```json file=package.json
{
  "name": "minidesk",
  "productName": "MiniDesk",
  "version": "0.1.0",
  "private": true,
  "main": "main.cjs",
  "scripts": {
    "start": "electron .",
    "test": "node --test \"test/*.test.cjs\""
  },
  "devDependencies": {
    "electron": "35.7.5"
  }
}
```

`node --test` is Node's built-in test runner; no install needed. The quotes make *Node*, not your shell, expand the `*`, so it behaves the same on Windows and macOS. (Writing `node --test test/` looks natural, but on Node 22 and later it tries to load `test/` as a module and fails with `MODULE_NOT_FOUND`. If a test command dies instantly with no test output, check the pattern.)

```check
contains package.json "node --test"
```

## The tests first

```js file=test/project-fs.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const projectFs = require('../lib/project-fs.cjs')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-fs-'))

test('writes and reads a file inside the project', async () => {
  await projectFs.write(root, 'src/a.txt', 'hello')
  assert.equal(await projectFs.read(root, 'src/a.txt'), 'hello')
})

test('lists folders first and hides node_modules', async () => {
  fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true })
  const names = (await projectFs.list(root)).map((e) => e.name)
  assert.deepEqual(names, ['src'])
})

test('refuses paths that leave the project folder', async () => {
  await assert.rejects(projectFs.read(root, '../secret.txt'), /escapes the project folder/)
  await assert.rejects(projectFs.write(root, '../../x', 'no'), /escapes the project folder/)
})
```

- `mkdtempSync` makes a fresh temporary folder, so the tests never touch your real files.
- The third test is the one that matters. `assert.rejects` expects the call to return a **promise that fails**.

```check
file test/project-fs.test.cjs
```

## A first version

```js file=lib/project-fs.cjs
const fs = require('node:fs/promises')
const path = require('node:path')

// Turn a path the page sent into a real path, and refuse anything outside the project folder.
function resolveInside(root, rel) {
  const full = path.resolve(root, rel || '.')
  const back = path.relative(root, full)
  if (back.startsWith('..') || path.isAbsolute(back)) {
    throw new Error(`Path escapes the project folder: ${rel}`)
  }
  return full
}

const HIDDEN = new Set(['node_modules', '.git', 'dist'])

async function list(root, rel = '.') {
  const entries = await fs.readdir(resolveInside(root, rel), { withFileTypes: true })
  return entries
    .filter((e) => !HIDDEN.has(e.name))
    .map((e) => ({ name: e.name, dir: e.isDirectory() }))
    .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name))
}

const read = (root, rel) => fs.readFile(resolveInside(root, rel), 'utf8')

async function write(root, rel, text) {
  const full = resolveInside(root, rel)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, text, 'utf8')
}

module.exports = { resolveInside, list, read, write }
```

How `resolveInside` works:

- `path.resolve(root, rel)` turns the page's path into a full path, collapsing any `..`. `../secret.txt` becomes a path *next to* the project folder.
- `path.relative(root, full)` asks how to get from the project folder to that path. If the answer starts with `..`, the path left the folder. If it's absolute (a different drive on Windows), same thing.
- `HIDDEN` keeps `node_modules`, `.git` and `dist` out of the file tree. They're huge and not what you edit.

```check
contains lib/project-fs.cjs "resolveInside"
run "node --check lib/project-fs.cjs" label="project-fs.cjs has no syntax errors"
```

## Run the tests: one fails

```powershell
npm test
```

```predict
question: How many of the three tests pass?
choice: All three
choice: Two. The third fails
choice: None. The module can't load
answer: Two. The third fails
explain: read is an arrow function that calls resolveInside directly. When the path escapes, resolveInside throws immediately, so read throws instead of returning a rejected promise. assert.rejects never gets a promise to inspect, and the test reports the thrown error as a failure. write is declared async, which turns any throw inside it into a rejection, so it passes.
```

```check
run "npm test" exit=1 stdout="fail 1" label="exactly one test fails" -- Run npm test. If the whole run crashes instead, check the test file path and the quotes in the test script.
```

This is a real bug class, not a quirk. Across IPC, the page sees a rejected promise as an error it can handle. A synchronous throw in the wrong place can behave differently, so every handler that can fail should be `async`.

## Make read reject

```js file=lib/project-fs.cjs
const fs = require('node:fs/promises')
const path = require('node:path')

// Turn a path the page sent into a real path, and refuse anything outside the project folder.
function resolveInside(root, rel) {
  const full = path.resolve(root, rel || '.')
  const back = path.relative(root, full)
  if (back.startsWith('..') || path.isAbsolute(back)) {
    throw new Error(`Path escapes the project folder: ${rel}`)
  }
  return full
}

const HIDDEN = new Set(['node_modules', '.git', 'dist'])

async function list(root, rel = '.') {
  const entries = await fs.readdir(resolveInside(root, rel), { withFileTypes: true })
  return entries
    .filter((e) => !HIDDEN.has(e.name))
    .map((e) => ({ name: e.name, dir: e.isDirectory() }))
    .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name))
}

async function read(root, rel) {
  return fs.readFile(resolveInside(root, rel), 'utf8')
}

async function write(root, rel, text) {
  const full = resolveInside(root, rel)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, text, 'utf8')
}

module.exports = { resolveInside, list, read, write }
```

```check
run "npm test" stdout="pass 3" label="all three tests pass" -- read must be an async function so a throw becomes a rejected promise.
```

## Hand it to the page

The main process needs to know *which* folder is open, and the page needs a way to ask for one. Replace `main.cjs`:

```js file=main.cjs
const path = require('node:path')
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const projectFs = require('./lib/project-fs.cjs')

let win = null
// Tests start the app with a project already chosen, so they never open a dialog.
let projectRoot = process.env.MINIDESK_PROJECT || null

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 760,
    title: 'MiniDesk',
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, 'index.html'))
}

function needRoot() {
  if (!projectRoot) throw new Error('No project folder is open')
  return projectRoot
}

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  platform: process.platform,
  packaged: app.isPackaged,
  project: projectRoot,
}))

ipcMain.handle('project:open', async () => {
  if (!projectRoot) {
    const picked = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    if (picked.canceled) return null
    projectRoot = picked.filePaths[0]
  }
  return projectRoot
})
ipcMain.handle('project:list', (_e, rel) => projectFs.list(needRoot(), rel))
ipcMain.handle('project:read', (_e, rel) => projectFs.read(needRoot(), rel))
ipcMain.handle('project:write', (_e, rel, text) => projectFs.write(needRoot(), rel, text))

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
```

- `dialog.showOpenDialog` is a native folder picker. Only the main process can show it.
- The page never sends a *root*. It sends paths *relative to* the root the main process already holds, so the page can't talk the main process into trusting a different folder.
- `_e` is the event object Electron passes first; the handler ignores it.
- The `MINIDESK_PROJECT` environment variable is a test hook. You'll use it in chapter 6.

```check
contains main.cjs "projectFs.read(needRoot()"
contains main.cjs "dialog.showOpenDialog"
run "node --check main.cjs" label="main.cjs has no syntax errors"
```

## The preload: what the page may ask for

```js file=preload.cjs
const { contextBridge, ipcRenderer } = require('electron')

// The only door between the page and the computer. Add a line here and the page can do one more thing.
contextBridge.exposeInMainWorld('desk', {
  info: () => ipcRenderer.invoke('app:info'),
  project: {
    open: () => ipcRenderer.invoke('project:open'),
    list: (rel) => ipcRenderer.invoke('project:list', rel),
    read: (rel) => ipcRenderer.invoke('project:read', rel),
    write: (rel, text) => ipcRenderer.invoke('project:write', rel, text),
  },
})
```

```check
contains preload.cjs "project:write"
run "node --check preload.cjs" label="preload.cjs has no syntax errors"
```

## Your turn: remove a file, safely

**Build, on your own:** add `remove(root, rel)` to `lib/project-fs.cjs`. It deletes a file inside the project and **refuses anything outside**, exactly like `read` and `write`. Export it.

Create the provided test file first. It checks both halves:

```js file=test/remove.test.cjs provided
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const projectFs = require('../lib/project-fs.cjs')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-rm-'))

test('removes a file inside the project', async () => {
  fs.writeFileSync(path.join(root, 'old.txt'), 'x')
  await projectFs.remove(root, 'old.txt')
  assert.equal(fs.existsSync(path.join(root, 'old.txt')), false)
})

test('refuses to remove anything outside the project', async () => {
  const outside = path.join(os.tmpdir(), 'minidesk-outside.txt')
  fs.writeFileSync(outside, 'keep me')
  await assert.rejects(projectFs.remove(root, '../minidesk-outside.txt'), /escapes the project folder/)
  assert.equal(fs.existsSync(outside), true)
})
```

Run it with `node --test test/remove.test.cjs`.

```hints
nudge: Look at how `write` gets its full path, and do the same first.
concept: `fs.rm(path)` deletes a file. The safety comes from calling `resolveInside` on the path *before* deleting anything.
answer: Add to `lib/project-fs.cjs` and export it:
~~~js
async function remove(root, rel) {
  await fs.rm(resolveInside(root, rel))
}

module.exports = { resolveInside, list, read, write, remove }
~~~
```

```check
run "node --test test/remove.test.cjs" stdout="pass 2" label="remove works and stays inside the project" -- Resolve the path with resolveInside before deleting. Without it, the second test deletes a file outside the project.
run "npm test" stdout="pass" label="the earlier tests still pass"
```

### What you have

A filesystem layer that can't be talked out of its folder, with tests proving it. The page can now ask for files; next it gets something to show them in.
