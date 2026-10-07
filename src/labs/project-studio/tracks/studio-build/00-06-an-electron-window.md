---
title: 0.6 — A Window of Its Own, with Electron
track: Build Your Own Game Studio
runtime: none
concepts: electron, main-process, renderer, file-urls
problem: The page runs in a browser tab, next to everything else open in the browser. A studio should be its own program, with its own window and its own icon in the taskbar. How does a web page become a desktop app?
---

**Electron** is Chrome and Node joined into one program. An Electron app runs as two kinds of process:

- The **main process** is a Node program. It starts first, and it makes windows. It can do anything Node can: read and write files, start other programs.
- Each window runs a **renderer process**: a Chrome page, showing HTML. It's the page you built in lesson 0.5, unchanged.

VS Code, Slack and Discord are built this way. So is UpSkillOS.

## Install Electron

```powershell
npm install --save-dev --save-exact electron@44.6.0
```

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc",
    "test": "vitest run src"
  },
  "devDependencies": {
    "electron": "44.6.0",
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- The `electron` package holds a ready-built copy of the Electron program for your kind of computer: about 100 MB, so the download takes a while.
- It's a development dependency: the finished app has Electron built in (Sprint 15 packages it), so it doesn't need the npm package.

```check
contains package.json "\"electron\": \"44.6.0\"" -- npm install --save-dev --save-exact electron@44.6.0
run "npx electron --version" stdout="v44.6.0"
```

## The main process

Make a folder `electron`, next to `src`, and create `electron/main.js`:

```js file=electron/main.js
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

function openWindow() {
  const win = new BrowserWindow({ width: 1000, height: 700 });
  win.loadFile(path.join(import.meta.dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(openWindow);
app.on('window-all-closed', () => app.quit());
```

- The file is plain JavaScript, not TypeScript. Electron runs it directly with its built-in Node, and nothing turns it into JavaScript first. It's kept small and lives outside `src`.
- `import { app, BrowserWindow } from 'electron'`: inside Electron, the `electron` module gives the main process its objects. `app` is one object, the running application. `BrowserWindow` is a **class**: a template for making objects.
- `import path from 'node:path'` imports Node's built-in `path` module. `node:` marks it as part of Node, not a package in `node_modules`. This import has no braces: it takes the module's **default export**, the one thing the module offers as a whole.
- `new BrowserWindow({ width: 1000, height: 700 })` makes a new window object from the class: `new` makes an **instance**. The argument is an **options object**, named settings in braces, in pixels here. The window opens on screen, empty.
- `win.loadFile(…)` tells the window's renderer to load an HTML file from disk.
- `import.meta.dirname` is the folder this module is in: `…/studio/electron`. `path.join` joins path parts with the right separator for your system (`\` on Windows, `/` on macOS), and `'..'` means "the folder above". The result is `…/studio/dist/index.html`, the built page.
- `app.whenReady()` returns a promise that **resolves** (arrives) once Electron has started. Windows can't be made before that. `.then(openWindow)` passes the function itself, without brackets, so Electron calls it later. `openWindow()` with brackets would call it now, too early.
- `app.on('window-all-closed', …)` **registers a listener**: it stores the arrow function under that **event** name, and Electron calls it each time the event happens. Here the event is the last window closing, and the listener quits the app. (Mac apps traditionally stay open with no windows. The studio keeps it simple and quits on both systems.)

```check
contains electron/main.js "new BrowserWindow("
run "node --check electron/main.js" label="main.js has no syntax errors" -- Read the error: it names the line Node couldn't read.
```

`node --check` reads a file and reports syntax errors without running it.

## Telling Electron where to start

Add `"main"` and a `"start"` script to `package.json`:

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite build && electron .",
    "typecheck": "tsc",
    "test": "vitest run src"
  },
  "devDependencies": {
    "electron": "44.6.0",
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- `electron .` runs Electron on this folder (`.`). Electron reads `package.json` and starts the file named by `"main"`.
- `&&` runs the second command only if the first succeeded (exit code 0). So `npm start` builds the page first, and starts nothing if the build fails.
- `"start"`, like `"test"`, is a name npm knows: `npm start` runs it without `run`.

```check
contains package.json "\"main\": \"electron/main.js\""
contains package.json "\"start\": \"vite build && electron .\""
```

## The blank window

Run it:

```powershell
npm start
```

A window opens, titled **Studio**.

```predict
question: What's inside the window?
choice: Hello, Studio!, as in the browser
choice: Nothing: the window is blank
choice: An error page: file not found
answer: Nothing: the window is blank
explain: index.html loaded, which is why the title bar says Studio. But the built page asks for its script at /assets/index-….js. In a browser, a path starting with / means "from the top of this website". In a file loaded from disk, it means "from the top of the disk", where there's no assets folder. The script never loads and the h1 stays empty, with no error on the page.
```

Close the window. The app quits, and the terminal is free again.

Look at the built page, `dist/index.html`:

```html
<script type="module" crossorigin src="/assets/index-nkJyPwJj.js"></script>
```

- In the browser, the page's address was `http://localhost:5173/`, and `/assets/…` meant `http://localhost:5173/assets/…`.
- Electron loaded it from disk, as a **file URL**: `file:///C:/Users/you/Documents/studio/dist/index.html`. There, `/assets/…` means `file:///assets/…`, the top of the disk.
- To see this yourself, press **Ctrl+Shift+I** (on macOS **Cmd+Option+I**) in the window. That opens Chrome's developer tools inside it. The **Console** tab shows the failed load: `net::ERR_FILE_NOT_FOUND`.

```check
run "npx vite build" stdout="built in"
contains dist/index.html "src=\"/assets/" label="the built page asks for /assets/, from the top of the disk"
```

## Relative paths: vite.config.ts

Create `vite.config.ts` in the project's top folder:

```ts file=vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({ base: './' });
```

- Vite reads `vite.config.ts`, if it exists, before serving or building. Its **default export** is the settings object: `export default` marks the one value the module offers as a whole.
- `base` is the start of every path Vite writes into the built page. `'./'` means "the folder this page is in", so the script becomes `./assets/index-….js`. That path works from any address, including a file on disk.
- `defineConfig` returns its argument unchanged. It's there for the types: your editor knows which settings exist and checks their values.

Run `npm start` again: **Hello, Studio!**, in a window of its own. Close it.

```check
run "npx vite build" stdout="built in"
contains dist/index.html "src=\"./assets/" label="the built page asks for ./assets/, next to itself"
```

## Commit

```powershell
git add .
git commit -m "Electron: the page in a window of its own"
```

The window story isn't ticked yet. The definition of done says *its tests pass*, and nothing tests the window yet. That's the next lesson.

```check
git-clean
git-tracked electron/main.js
git-tracked vite.config.ts
```

## Challenge: a window that fits

**Optional, ★.** Give the window a minimum size of 800 by 600, so it can't be dragged too small for the studio's panels, and make it open with its developer tools showing. Look up `BrowserWindow`'s options in Electron's documentation (electronjs.org/docs/latest/api/browser-window) to find the names. Then remove the developer tools again: the studio shouldn't open with them.

```hints
nudge: Both are settings you can find in the BrowserWindow documentation: one is an option in the object passed to new BrowserWindow, the other is a method on the window's webContents.
concept: The options object is how a class takes many named settings at once. Anything you leave out keeps its default.
shape: new BrowserWindow({ width: 1000, height: 700, minWidth: 800, minHeight: 600 }) and win.webContents.openDevTools()
```
