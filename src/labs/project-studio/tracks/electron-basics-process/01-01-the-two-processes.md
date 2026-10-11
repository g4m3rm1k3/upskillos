---
title: 1.1 — The Two Processes
track: MiniDesk — The Two Processes
trackOrder: 60
runtime: none
---

Over this series you build **MiniDesk**: a small text editor with a file tree and a real terminal, packaged as a desktop app and built by GitHub Actions. It's a cut-down version of what Project Studio is. UpSkillOS uses Electron for the same few jobs MiniDesk does: opening a folder on your computer, saving files into it, and running a real shell. Once you've built the small one, you can read the big one.

This lesson is the foundation: what Electron actually is, and the rule that shapes everything else.

## What Electron is

An Electron app is two programs glued together:

- The **main process** is a Node.js program. It starts first. It can do anything Node can: read files, start other programs, open windows. There is exactly one.
- Each window is a **renderer process**: a Chromium page. It runs your HTML and JavaScript like a browser tab, and by default it **can't touch your computer** the way Node can.

If you're troubleshooting UpSkillOS, the first question is always *which of the two is the problem?* A blank window with a working app menu is a renderer problem. An app that never opens a window at all is a main-process problem.

## Install Electron

Make an empty folder for MiniDesk and open it in Project Studio. Create `package.json`:

```json file=package.json
{
  "name": "minidesk",
  "productName": "MiniDesk",
  "version": "0.1.0",
  "private": true,
  "main": "main.cjs",
  "scripts": {
    "start": "electron ."
  },
  "devDependencies": {
    "electron": "35.7.5"
  }
}
```

- `"main"` tells Electron which file to start. That file *is* the main process.
- The file ends in **`.cjs`**, not `.js`. Electron's built-in `electron` module is a CommonJS module, and Node's newer ES-module loader trips over it. UpSkillOS's `main.cjs` and `preload.cjs` are named this way for the same reason, and when you see a `SyntaxError: Cannot use import statement` at startup, that is the cause.
- Electron is pinned to an exact version (`35.7.5`, no `^`). The packaged app ships its own copy of Electron, so a surprise upgrade changes what your users run.

Install it in the terminal (this downloads about 120 MB):

```powershell
npm install
```

```check
run "npx electron --version" stdout="v35.7.5" label="Electron 35.7.5 is installed" -- Run npm install in the project folder.
```

## The main process

Create `main.cjs`:

```js file=main.cjs
const path = require('node:path')
const { app, BrowserWindow } = require('electron')

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
```

- `app` is the running application. `app.whenReady()` is a promise that resolves once Electron has finished starting; you can't open windows before then.
- `new BrowserWindow(...)` makes a window, which starts a renderer process.
- `__dirname` is the folder this file is in. Building paths from it, not from `process.cwd()`, is what keeps the app working once it is packaged and started from somewhere else. A lot of "works in dev, breaks when installed" bugs are a relative path.
- `contextIsolation: true` and `nodeIntegration: false` are the defaults, written out so you can see them. Together they are the rule that shapes the whole series: **the page does not get Node.** Next chapter is how the page asks the main process to do things for it, safely.
- `window-all-closed` quits the app when the last window closes.

```check
contains main.cjs "contextIsolation: true"
contains main.cjs "nodeIntegration: false"
run "node --check main.cjs" label="main.cjs has no syntax errors" -- Read the error: it names the line Node couldn't read.
```

## A page

```html file=index.html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>MiniDesk</title>
  </head>
  <body>
    <h1 id="title">MiniDesk</h1>
    <p id="where"></p>
    <script src="renderer.js"></script>
  </body>
</html>
```

```js file=renderer.js
document.querySelector('#where').textContent =
  `Node in this page: ${typeof require === 'undefined' ? 'no' : 'yes'}`
```

`typeof require` is how a script asks "is Node here?". In a Node program `require` is a function; in a browser it doesn't exist, so `typeof` says `'undefined'`.

```predict
question: You set nodeIntegration to false. What will the page show after "Node in this page:"?
choice: yes
choice: no
answer: no
explain: With nodeIntegration off and contextIsolation on, the page is an ordinary web page. require doesn't exist there, so typeof require is 'undefined'. Chapter 6 turns this into an automated test.
```

Run it:

```powershell
npm start
```

A window opens and says **Node in this page: no**. Close it; the app quits and your terminal is free again.

```check
contains index.html "renderer.js"
run "node --check renderer.js" label="renderer.js has no syntax errors" -- Read the error: it names the line Node couldn't read.
```

## Your turn: a window with limits

**Build, on your own:** change the window so its title is `MiniDesk` and it can't be dragged smaller than 600 by 400 pixels. Look up `BrowserWindow`'s options at electronjs.org/docs/latest/api/browser-window to find the names.

```hints
nudge: Both are settings in the object you pass to `new BrowserWindow`, next to width and height.
concept: Anything you leave out of the options object keeps its default, so you only add the settings you care about.
shape: The options are `title`, `minWidth` and `minHeight`.
answer: Add three lines next to width and height:
~~~js
    title: 'MiniDesk',
    minWidth: 600,
    minHeight: 400,
~~~
```

```check
contains main.cjs "title: 'MiniDesk'" -- Add title: 'MiniDesk' to the BrowserWindow options.
contains main.cjs "minWidth: 600" -- Add minWidth: 600.
contains main.cjs "minHeight: 400" -- Add minHeight: 400.
run "node --check main.cjs" label="main.cjs still has no syntax errors"
```

### What you have

A window with no Node in it, started by a main process that does have Node. Everything else in the series is about letting the first safely ask the second for help.
