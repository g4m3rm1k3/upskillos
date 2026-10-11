---
title: 5.1 — A Real Terminal
track: MiniDesk — The Terminal
trackOrder: 60.04
runtime: none
---

The terminal in Project Studio isn't a text box that runs commands. It's a **real shell**, PowerShell on Windows and your login shell elsewhere, so `cd`, tab-completion, colours, `Ctrl+C` and programs that ask questions all work. That takes three parts:

- **A pseudo-terminal (pty)** in the main process. `node-pty` starts the shell attached to a fake terminal device, so the shell believes a person is typing at it.
- **xterm.js** in the page. It draws the terminal and turns key presses into text.
- **IPC** carrying text both ways: keystrokes to the shell, output back to the screen.

Why not `child_process.exec`? It runs one command with no keyboard and returns its output when it finishes. There's nothing to type into and no way to see a program's output while it runs. A pty gives you a live, interactive session.

## Two packages

`node-pty` and `xterm` are **runtime** packages: the finished app needs them to run. They go in `dependencies`, not `devDependencies`. Chapter 9 shows what happens if you get that wrong. It is one of the most common ways an Electron app works on your machine and fails for everyone else.

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
  "dependencies": {
    "@xterm/xterm": "6.0.0",
    "node-pty": "1.1.0"
  },
  "devDependencies": {
    "electron": "35.7.5"
  }
}
```

```powershell
npm install
```

`node-pty` is a **native module**: part of it is compiled C++, not JavaScript. Native modules are where most packaging pain comes from, because a binary built for one operating system, CPU and Node version won't load in another. `node-pty` ships **prebuilt binaries** for Windows, macOS and Linux, so you don't need a compiler. Chapter 7 shows what happens when something tries to rebuild it anyway.

```check
contains package.json "\"node-pty\": \"1.1.0\""
run "node -e \"require('node-pty')\"" label="node-pty loads" -- Run npm install in the project folder.
```

## The terminal module

```js file=lib/terminal.cjs
let pty = null
let loadError = null
// node-pty is a native module. Load it on first use so a broken install shows up as a message in the
// terminal pane, not as a crash at startup.
function loadPty() {
  if (pty || loadError) return pty
  try { pty = require('node-pty') } catch (e) { loadError = e }
  return pty
}

const terminals = new Map()

function start({ cwd }, send) {
  const lib = loadPty()
  if (!lib) return { ok: false, reason: `The terminal couldn't start: ${loadError.message}` }
  const file = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh')
  const proc = lib.spawn(file, process.platform === 'win32' ? ['-NoLogo'] : ['-l'], {
    name: 'xterm-256color', cols: 80, rows: 24, cwd, env: process.env,
  })
  const id = `term-${terminals.size + 1}-${Date.now()}`
  terminals.set(id, proc)
  proc.onData((data) => send('terminal:data', { id, data }))
  proc.onExit(({ exitCode }) => { terminals.delete(id); send('terminal:data', { id, data: `\r\n[shell exited ${exitCode}]\r\n` }) })
  return { ok: true, id }
}

const write = (id, data) => terminals.get(id)?.write(data)
const resize = (id, cols, rows) => { try { terminals.get(id)?.resize(cols, rows) } catch {} }
function killAll() { for (const [id, t] of terminals) { terminals.delete(id); try { t.kill() } catch {} } }

module.exports = { start, write, resize, killAll }
```

- **Lazy loading.** `loadPty()` requires `node-pty` the first time a terminal starts, inside a `try`. A top-of-file `require('node-pty')` would crash the whole main process at startup if the binary is missing or wrong. This way the editor still opens, and the terminal pane says why it couldn't start. UpSkillOS's `terminal.cjs` does the same.
- **Which shell.** `powershell.exe` on Windows; `$SHELL` elsewhere (with `-l`, a login shell, so your usual `PATH` is loaded; apps launched from a dock don't get your terminal's environment otherwise).
- **`cwd`** starts the shell in the project folder.
- **The `id`** is a plain string the page holds. The terminal object itself stays in the main process, because live objects can't cross IPC (chapter 2).
- **`onExit`** tells the page the shell ended; without it the pane would just freeze.
- **`killAll`** closes the shells when the app quits. Skip this and shells can be left running after the window closes.

```check
contains lib/terminal.cjs "pty.spawn" 
run "node --check lib/terminal.cjs" label="terminal.cjs has no syntax errors"
```

## Test it with no window at all

A terminal that only works through a UI is hard to debug. Because the module doesn't depend on Electron, you can test it from a plain script:

```js file=scripts/pty-smoke.cjs
// Starts the terminal module with no window at all, types a command, and waits for its output.
// The command prints 42 without ever containing the text "42", so the shell echoing our typing
// back can't fool the check.
const terminal = require('../lib/terminal.cjs')

// A terminal sends colour and cursor codes along with the text. xterm.js draws them; here we drop them.
const plain = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07/g, '')

let seen = ''
const started = terminal.start({ cwd: process.cwd() }, (_channel, { data }) => {
  seen += data
  if (/(^|\n)42\r?\n/.test(plain(seen))) {
    console.log('terminal works')
    terminal.killAll()
    process.exit(0)
  }
})
if (!started.ok) {
  console.error(started.reason)
  process.exit(1)
}
terminal.write(started.id, 'node -p 6*7\r')
setTimeout(() => {
  console.error('no answer after 10 seconds. Output so far:', JSON.stringify(seen.slice(-300)))
  terminal.killAll()
  process.exit(1)
}, 10000)
```

- The script types `node -p 6*7` plus `\r` (the Enter key) and waits for `42`. It can't just look for the text it typed: the shell **echoes your typing back**, so searching for text you sent would pass instantly.
- `plain()` strips escape sequences. Print the raw output once and you'll see sequences like `\u001b[33m42`. That's the terminal asking for yellow text. xterm.js is what turns those into colour in the window.

```powershell
node scripts/pty-smoke.cjs
```

```check
run "node scripts/pty-smoke.cjs" stdout="terminal works" label="a real shell runs a command and answers" timeout=30 -- If it says the terminal couldn't start, run npm install again. If it times out, the shell started but didn't answer.
```

## Wiring it into the app

```js file=main.cjs
const path = require('node:path')
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const projectFs = require('./lib/project-fs.cjs')
const terminal = require('./lib/terminal.cjs')

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

- Two kinds of handler. `handle` answers a request (`invoke`): used for `terminal:start`, which returns the `id`. `on` listens for a one-way message (`send`): used for keystrokes, which need no answer and shouldn't make the page wait.
- Output goes the other way: `sender.send(...)` pushes data from the main process to the page whenever the shell prints.
- `sender.isDestroyed()` guards a real crash: a shell can print after its window has closed, and sending to a destroyed window throws.

```check
contains main.cjs "terminal.killAll()"
contains main.cjs "ipcMain.on('terminal:write'"
run "node --check main.cjs" label="main.cjs has no syntax errors"
```

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
  terminal: {
    start: () => ipcRenderer.invoke('terminal:start'),
    write: (id, data) => ipcRenderer.send('terminal:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('terminal:resize', id, cols, rows),
    onData: (cb) => {
      const handler = (_event, payload) => cb(payload)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.off('terminal:data', handler)
    },
  },
})
```

`onData` is the interesting one. The main process pushes output, so the page registers a callback. The preload wraps it so the page never receives Electron's `event` object, and returns an **unsubscribe function**, so a listener never leaks.

```check
contains preload.cjs "terminal:data"
run "node --check preload.cjs" label="preload.cjs has no syntax errors"
```

## The page

```html file=index.html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>MiniDesk</title>
    <link rel="stylesheet" href="node_modules/@xterm/xterm/css/xterm.css">
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <header>
      <strong id="title">MiniDesk</strong> <span id="info"></span>
      <button id="open">Open folder</button>
      <button id="save" disabled>Save</button>
      <span id="status"></span>
    </header>
    <main>
      <ul id="tree"></ul>
      <textarea id="editor" spellcheck="false" disabled></textarea>
    </main>
    <div id="terminal"></div>
    <script src="node_modules/@xterm/xterm/lib/xterm.js"></script>
    <script src="renderer.js"></script>
  </body>
</html>
```

The page loads xterm straight out of `node_modules`. That works in development, and it is the reason chapter 7's packaging config has to list those two files by name: if they aren't packaged, `Terminal` doesn't exist and `renderer.js` stops at its first use of it.

```css file=styles.css
body { margin: 0; display: grid; grid-template-rows: auto 1fr 240px; height: 100vh; font: 14px system-ui; }
header { padding: 6px 10px; background: #eee; }
main { display: grid; grid-template-columns: 220px 1fr; min-height: 0; }
#tree { margin: 0; padding: 4px; list-style: none; overflow: auto; border-right: 1px solid #ccc; }
#tree li { cursor: pointer; padding: 2px 4px; }
#tree li.dir { font-weight: 600; }
#editor { border: 0; padding: 8px; font: 13px ui-monospace, Consolas, monospace; resize: none; }
#terminal { background: #000; padding: 4px; }
```

```js file=renderer.js
const $ = (sel) => document.querySelector(sel)
let current = null

async function showTree(rel = '.') {
  const items = await window.desk.project.list(rel)
  const ul = $('#tree')
  ul.replaceChildren()
  if (rel !== '.') {
    const up = document.createElement('li')
    up.className = 'dir'
    up.textContent = '..'
    up.onclick = () => showTree(rel.split('/').slice(0, -1).join('/') || '.')
    ul.append(up)
  }
  for (const item of items) {
    const li = document.createElement('li')
    li.className = item.dir ? 'dir' : 'file'
    li.textContent = item.name
    const child = rel === '.' ? item.name : `${rel}/${item.name}`
    li.onclick = () => (item.dir ? showTree(child) : openFile(child))
    ul.append(li)
  }
}

async function openFile(rel) {
  $('#editor').value = await window.desk.project.read(rel)
  $('#editor').disabled = false
  $('#save').disabled = false
  current = rel
  $('#status').textContent = rel
}

async function save() {
  await window.desk.project.write(current, $('#editor').value)
  $('#status').textContent = `${current} saved`
}

async function startTerminal() {
  const term = new Terminal({ cols: 80, rows: 12 })
  term.open($('#terminal'))
  const res = await window.desk.terminal.start()
  if (!res.ok) { term.write(res.reason); return }
  window.desk.terminal.onData(({ id, data }) => { if (id === res.id) term.write(data) })
  term.onData((data) => window.desk.terminal.write(res.id, data))
  window.termId = res.id
}

async function openProject() {
  const root = await window.desk.project.open()
  if (!root) return
  await showTree()
  await startTerminal()
}

$('#open').onclick = openProject
$('#save').onclick = save
window.desk.info().then((i) => {
  $('#info').textContent = `Electron ${i.electron} on ${i.platform}${i.packaged ? ' (packaged)' : ''}`
  if (i.project) openProject()
})

window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    if (current) save()
  }
})
```

- `new Terminal(...)` is xterm. `term.onData` fires when the user types; the text goes to the shell. `desk.terminal.onData` fires when the shell prints; the text goes to `term.write`. Two directions, one `id` tying them together.
- `window.termId` is set so the tests in chapter 6 can type into the terminal without clicking on it.
- If `res.ok` is false, the reason is printed into the terminal pane itself. That's the payoff of lazy loading: the failure is visible where the user is looking.

Run `npm start`, open your project, and use the terminal at the bottom: `dir` or `ls`, then `node --version`.

```check
contains renderer.js "new Terminal("
contains renderer.js "window.desk.terminal.start()"
run "node --check renderer.js" label="renderer.js has no syntax errors"
```

```predict
question: You press a key in the terminal pane. How many process boundaries does it cross before the shell sees it, and how many to show the result?
choice: None. xterm talks to the shell directly
choice: One each way: page to main process, then main process back to the page
choice: The shell runs in the page, so it never crosses
answer: One each way: page to main process, then main process back to the page
explain: The shell runs under the main process (node-pty). The keystroke goes page, preload, IPC, main process, shell. The output comes back shell, main process, IPC, preload, page, xterm. If typing works but nothing appears, the bug is on the return path.
```

## Your turn: tell the shell its size

Programs like `vim` and `htop` draw to the size of the terminal, so the shell needs to know it. `terminal:resize` already exists all the way down to the pty. The page just never calls it.

**Build, on your own:** in `startTerminal`, tell the shell the terminal's size right after it starts (`term.cols` and `term.rows`), and again whenever xterm's size changes (xterm has an `onResize` event whose argument has `cols` and `rows`).

```hints
nudge: `window.desk.terminal.resize(id, cols, rows)` is already there. You need to call it in two places.
concept: `term.onResize(callback)` runs the callback with `{ cols, rows }` each time `term.resize` changes the size.
answer: Add inside `startTerminal`, after `window.termId = res.id`:
~~~js
  window.desk.terminal.resize(res.id, term.cols, term.rows)
  term.onResize(({ cols, rows }) => window.desk.terminal.resize(res.id, cols, rows))
~~~
```

```check
contains renderer.js "terminal.resize(res.id, term.cols, term.rows)" -- Send the size right after the terminal starts.
contains renderer.js "term.onResize" -- Send the size again whenever it changes.
run "node --check renderer.js" label="renderer.js has no syntax errors"
```

### What you have

An editor with a working terminal, and a way to test the terminal without a window. You now have every moving part of Project Studio's desktop layer in miniature. Next, you stop checking it by hand.
