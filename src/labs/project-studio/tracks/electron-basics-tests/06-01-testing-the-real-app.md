---
title: 6.1 — Testing the Real App
track: MiniDesk — Tests
trackOrder: 60.05
runtime: none
---

So far you've checked MiniDesk by clicking around. That doesn't survive a refactor, and it can't run on a build server. Playwright can **launch your real Electron app, drive its window and read its screen**, in a test.

This is the same technique UpSkillOS uses in `e2e/`. When someone reports "the terminal doesn't open in the installed app", the fastest reproduction is a test like the one below, pointed at the installed app (chapter 7).

## Two small hooks for tests

A test must not touch your real data or pop up a folder picker. The app needs two ways to be told otherwise. You already added one (`MINIDESK_PROJECT`, in chapter 3). Add the other to `main.cjs`: a private data folder.

```js file=main.cjs
const path = require('node:path')
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const projectFs = require('./lib/project-fs.cjs')
const terminal = require('./lib/terminal.cjs')

// Tests give the app its own data folder so they never touch yours.
if (process.env.MINIDESK_USER_DATA) app.setPath('userData', process.env.MINIDESK_USER_DATA)

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

ipcMain.handle('terminal:start', (event) => {
  const sender = event.sender
  return terminal.start({ cwd: needRoot() }, (channel, payload) => {
    if (!sender.isDestroyed()) sender.send(channel, payload)
  })
})
ipcMain.on('terminal:write', (_e, id, data) => terminal.write(id, data))
ipcMain.on('terminal:resize', (_e, id, cols, rows) => terminal.resize(id, cols, rows))

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  terminal.killAll()
  app.quit()
})
```

`app.setPath('userData', ...)` moves where the app keeps its settings, caches and local storage. Every Electron app has such a folder, and it's the first place to look when "it behaves differently on this one machine": stale state in `userData` survives reinstalls. (On Windows it's under `%APPDATA%\<app name>`.)

```check
contains main.cjs "MINIDESK_USER_DATA"
run "node --check main.cjs" label="main.cjs has no syntax errors"
```

## Playwright

```json file=package.json
{
  "name": "minidesk",
  "productName": "MiniDesk",
  "version": "0.1.0",
  "private": true,
  "main": "main.cjs",
  "scripts": {
    "start": "electron .",
    "test": "node --test \"test/*.test.cjs\"",
    "e2e": "node --test \"e2e/*.test.cjs\""
  },
  "dependencies": {
    "@xterm/xterm": "6.0.0",
    "node-pty": "1.1.0"
  },
  "devDependencies": {
    "electron": "35.7.5",
    "playwright-core": "1.61.0"
  }
}
```

`playwright-core` is Playwright without its bundled browsers: Electron *is* the browser, so there's nothing else to download.

```powershell
npm install
```

```check
contains package.json "playwright-core"
run "node -e \"require('playwright-core')\"" label="playwright-core loads" -- Run npm install in the project folder.
```

## The test

```js file=e2e/app.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { _electron: electron } = require('playwright-core')

test('opens a project, edits a file and runs a command in the terminal', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-data-'))
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-proj-'))
  fs.writeFileSync(path.join(project, 'notes.txt'), 'first')
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, MINIDESK_USER_DATA: userData, MINIDESK_PROJECT: project },
  })
  try {
    const page = await app.firstWindow()
    assert.equal(await page.textContent('#title'), 'MiniDesk')
    assert.equal(await page.evaluate(() => typeof require), 'undefined', 'the page must not have Node')

    await page.click('#tree li:has-text("notes.txt")')
    assert.equal(await page.inputValue('#editor'), 'first')
    await page.fill('#editor', 'second')
    await page.click('#save')
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('saved'))
    assert.equal(fs.readFileSync(path.join(project, 'notes.txt'), 'utf8'), 'second')

    await page.waitForFunction(() => window.termId)
    await page.evaluate(() => window.desk.terminal.write(window.termId, 'echo hello-from-pty\r'))
    await page.waitForFunction(
      () => document.querySelector('#terminal').textContent.includes('hello-from-pty'),
      null,
      { timeout: 15000 },
    )
  } finally {
    await app.close()
    fs.rmSync(userData, { recursive: true, force: true })
    fs.rmSync(project, { recursive: true, force: true })
  }
})
```

Read it as a story:

- `electron.launch({ args: ['.'] })` starts your real app, exactly as `npm start` does, with the two hooks set so it's isolated.
- `app.firstWindow()` gives a Playwright `page` for the window. From here it's ordinary browser automation: `click`, `fill`, `textContent`.
- `page.evaluate(() => typeof require)` runs code *inside the page* and returns the result. This is chapter 1's rule as a test: if someone turns `nodeIntegration` on by accident, this fails.
- The test writes through the UI (`fill`, `save`) and then checks the **file on disk**. That proves the whole chain: page, preload, IPC, main process, filesystem.
- `waitForFunction` retries until something becomes true or the timeout hits. Output from a shell arrives whenever it arrives, so you wait for it instead of guessing a delay with `sleep`.
- `finally` closes the app and deletes the temporary folders even when an assertion fails. A test that leaves Electron processes running will make the next run mysteriously slow.

```check
contains e2e/app.test.cjs "electron.launch"
run "node --check e2e/app.test.cjs" label="the test file has no syntax errors"
```

```powershell
npm run e2e
```

A window flashes up and closes. It takes a few seconds.

```check
run "npm run e2e" stdout="pass 1" label="the app passes its own end-to-end test" timeout=120 -- Run npm run e2e and read the first failure. If it times out waiting for the terminal, run node scripts/pty-smoke.cjs to see if the terminal works at all.
```

```predict
question: You break the preload path in main.cjs (preload.cjs becomes preload.js). The window still opens and looks fine. How does the end-to-end test fail?
choice: It fails at once on the title check, because the page is broken
choice: It waits 30 seconds on the click for notes.txt, then times out
choice: It fails on typeof require, because Node leaked into the page
answer: It waits 30 seconds on the click for notes.txt, then times out
explain: The page and its title load fine without the preload script, and typeof require is still 'undefined'. But renderer.js calls window.desk straight away, and window.desk doesn't exist, so it throws before the file tree is ever filled. The test then waits for a tree entry that never appears. A timeout waiting for something on screen, in an app that otherwise looks fine, usually means the page's script died early. Check the page's console and the preload path.
```

## Your turn: a test that tries to escape

In chapter 3 you proved with a unit test that `resolveInside` refuses paths outside the project. A unit test only checks that function. It doesn't prove the *app* can't be talked into reading outside the folder.

**Build, on your own:** write `e2e/escape.test.cjs`, an end-to-end test that launches the app the same way, then has the **page** call `window.desk.project.read('../../etc/passwd')` and checks that it fails with a message containing `escapes the project folder`. Clean up the same way the other test does.

```hints
nudge: Copy the launch and cleanup from `e2e/app.test.cjs`, then replace the middle.
concept: Inside `page.evaluate`, return the result of `window.desk.project.read(...)` turned into a string either way: `.then(() => 'read it', (e) => e.message)`. Then `assert.match` on it.
answer: A complete file:
~~~js
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { _electron: electron } = require('playwright-core')

test('the page cannot read outside the project folder', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-data-'))
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'minidesk-proj-'))
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, MINIDESK_USER_DATA: userData, MINIDESK_PROJECT: project },
  })
  try {
    const page = await app.firstWindow()
    const message = await page.evaluate(
      () => window.desk.project.read('../../etc/passwd').then(() => 'read it', (e) => e.message),
    )
    assert.match(message, /escapes the project folder/)
  } finally {
    await app.close()
    fs.rmSync(userData, { recursive: true, force: true })
    fs.rmSync(project, { recursive: true, force: true })
  }
})
~~~
```

```check
file e2e/escape.test.cjs -- Create e2e/escape.test.cjs.
contains e2e/escape.test.cjs "window.desk.project.read" -- The page must make the call, not the test.
run "node --test e2e/escape.test.cjs" stdout="pass 1" label="the app refuses a path outside the project" timeout=120 -- Run it and read the failure. The error from the main process arrives wrapped in text, so match on a part of it.
```

### What you have

Two tests that drive the real window and its real terminal. In chapter 7 you point the same kind of test at the *packaged* app, because that's where the bugs that only some users hit tend to live.
