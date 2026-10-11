---
title: 2.1 — A Safe Door
track: MiniDesk — Talking Between Processes
trackOrder: 60.01
runtime: none
---

The page can't use Node, but a text editor has to save files. The answer is a narrow, deliberate door between the page and the main process. Everything the page is allowed to ask for, you write down by name. Anything not written down can't be asked for.

Three pieces make the door:

1. The **main process** answers requests (`ipcMain.handle`).
2. The **preload script** runs inside the window before the page does. It's the only place that can see both worlds, and it publishes a small object to the page (`contextBridge`).
3. The **page** calls that object like any other function.

*IPC* just means inter-process communication: messages between the main process and a renderer.

## The preload script

Create `preload.cjs`:

```js file=preload.cjs
const { contextBridge, ipcRenderer } = require('electron')

// The only door between the page and the computer. Add a line here and the page can do one more thing.
contextBridge.exposeInMainWorld('desk', {
  info: () => ipcRenderer.invoke('app:info'),
})
```

- `contextBridge.exposeInMainWorld('desk', {...})` adds `window.desk` to the page.
- `ipcRenderer.invoke('app:info')` sends a request named `app:info` to the main process and returns a promise for the answer.
- The channel name is just a string. Using `thing:action` names keeps them readable as the list grows.

Notice what is *not* here: `ipcRenderer` itself is never handed to the page. If it were, any script in the page could send any message to the main process, including ones you add later. Exposing one function per job is the whole security model.

```check
contains preload.cjs "exposeInMainWorld('desk'"
lacks preload.cjs "ipcRenderer," label="the page is never handed ipcRenderer itself" -- Only call ipcRenderer inside your own functions; don't put it in the exposed object.
run "node --check preload.cjs" label="preload.cjs has no syntax errors"
```

## Answering in the main process

Update `main.cjs` to load the preload script and answer the request:

```js file=main.cjs
const path = require('node:path')
const { app, BrowserWindow, ipcMain } = require('electron')

function createWindow() {
  const win = new BrowserWindow({
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

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  packaged: app.isPackaged,
}))

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
```

- `preload:` must be an **absolute** path, which is why it's built from `__dirname`. A wrong path doesn't crash; the window opens and `window.desk` just isn't there. If the page says `Cannot read properties of undefined (reading 'info')`, check this line first.
- `ipcMain.handle(channel, fn)` answers `invoke` calls. Whatever `fn` returns goes back to the page.
- **Only plain data crosses.** The answer is copied between processes, so numbers, strings, arrays and plain objects work. Functions, class instances and anything with a live connection (a file handle, a window) do not. That's why the terminal in chapter 5 passes an `id` string instead of a terminal object.
- `app.isPackaged` is `false` when you run `npm start` and `true` in an installed app. You will use it in chapter 9.

```check
contains main.cjs "preload: path.join(__dirname, 'preload.cjs')"
contains main.cjs "ipcMain.handle('app:info'"
run "node --check main.cjs" label="main.cjs has no syntax errors"
```

## Calling it from the page

```js file=renderer.js
window.desk.info().then((info) => {
  document.querySelector('#where').textContent =
    `Electron ${info.electron}${info.packaged ? ' (packaged)' : ''}`
})
```

```predict
question: The page now has window.desk. What does typeof require give in the page?
choice: 'function', because the preload script uses require
choice: 'undefined', exactly as before
answer: 'undefined', exactly as before
explain: The preload script runs in its own isolated world. It can use require, but contextIsolation keeps that separate from the page's world. The page gets only what contextBridge publishes, which is the desk object.
```

Run `npm start`. The page shows `Electron 35.7.5`.

```check
contains renderer.js "window.desk.info()"
run "node --check renderer.js" label="renderer.js has no syntax errors"
```

## Your turn: report the platform

**Build, on your own:** make `app:info` also return the operating system (`process.platform`: `win32`, `darwin` or `linux`) as a field called `platform`, and show it in the page after the Electron version, like `Electron 35.7.5 on win32`.

Knowing the platform matters later: the terminal starts PowerShell on Windows and your login shell elsewhere.

```hints
nudge: You change two files: the main process adds a field to the object it returns, and the page reads it.
concept: Whatever the handler returns is what `info` receives in the page. A new field in the object means a new property on `info`.
answer: In `main.cjs`, add `platform: process.platform,` to the object. In `renderer.js`, add `on ${info.platform}` to the text:
~~~js
window.desk.info().then((info) => {
  document.querySelector('#where').textContent =
    `Electron ${info.electron} on ${info.platform}${info.packaged ? ' (packaged)' : ''}`
})
~~~
```

```check
contains main.cjs "platform: process.platform" -- Return platform: process.platform from the app:info handler.
contains renderer.js "info.platform" -- Show info.platform in the page.
run "node --check main.cjs" label="main.cjs has no syntax errors"
run "node --check renderer.js" label="renderer.js has no syntax errors"
```

### What you have

A page that can ask for exactly one thing. Next you add the requests that matter: reading and writing files, without letting the page wander outside the folder it was given.
