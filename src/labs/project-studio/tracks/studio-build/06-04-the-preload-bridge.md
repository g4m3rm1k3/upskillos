---
title: 6.4 — The Preload Bridge
track: Build Your Own Game Studio
runtime: none
concepts: ipc, preload-scripts, context-isolation, security-boundary, top-level-await, git-merge
problem: loadProject works in the main process, and the page needs its result, but the page can't call the main process's functions: they're in another process. How does a request cross from one process to the other, and how do you let the page ask for a scene without letting it ask for anything else?
---

Two processes don't share memory: the page can't call `loadProject`, and the main process can't reach into the page's variables. They talk by sending **messages**, which Electron calls **IPC**, inter-process communication.

The kind of message the studio needs is a request with an answer, like a function call:

- The page sends a message on a named **channel**, `'project:load'`, and gets back a promise.
- The main process has registered a **handler** for that channel. It runs, and what it returns (or the promise it returns, once resolved) is sent back.
- The page's promise resolves with that answer.
- What travels is a copy. The answer is turned into bytes, sent, and rebuilt on the other side, as `structuredClone` does (lesson 3.2). Plain data survives the trip: strings, numbers, arrays, objects of those. A class's methods, or a function, don't. That's one reason `Project` is three strings.

Electron's own functions for this are `ipcRenderer.invoke(channel, …)` on the page's side and `ipcMain.handle(channel, handler)` on the main side. But the page doesn't get `ipcRenderer` itself:

- If the page could send *any* message, then any script running in it could too, on any channel the main process listens to. Every handler would have to defend itself against every caller.
- So the page gets a short, fixed list of functions, each sending one message, made by a **preload script**: a script Electron runs before the page loads, which can see a little of both sides.
- Electron keeps the preload's own variables apart from the page's (**context isolation**, on by default), and the page sees only what the preload hands over with `contextBridge`. The renderer also runs in a **sandbox** (on by default): even the preload can load only a few of Electron's modules, not Node's file functions.

So the studio's bridge will be one object on the page, `window.studio`, with one function, `load()`. That's the whole surface the page can reach in the main process.

## The API the page will see

Change `src/studio-api.ts`:

```ts file=src/studio-api.ts
export interface Project {
  folder: string;
  text: string;
  problem: string;
}

export interface StudioApi {
  load(): Promise<Project>;
}

declare global {
  interface Window {
    studio: StudioApi;
  }
}
```

- `interface StudioApi` describes `window.studio`: for now, `load()`, which returns a promise of a `Project`. Lessons 6.6 to 6.9 add a method for each new message.
- `declare global { … }` adds to the types every file can see. `declare` says this only describes something that exists; it creates nothing.
- `interface Window { studio: StudioApi; }` adds a field to the browser's own `Window` type (the type of `window`). Two interfaces with the same name **merge**: TypeScript combines their fields, so `window` keeps everything it had and gains `studio`. Without this, `window.studio` would be a type error.
- Nothing here makes `window.studio` exist: the preload does that, in the next step. This only tells the type checker it will.
- `declare global` works only in a file that is a module, one with an `import` or `export`. This one exports `Project` and `StudioApi`, so it is.

```check
run "npx tsc" label="the API type-checks"
```

## The preload script

Create `electron/preload.cjs`:

```js file=electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studio', {
  load: () => ipcRenderer.invoke('project:load'),
});
```

- `.cjs` and `require`: the preload runs in the sandbox, which loads scripts the older Node way, **CommonJS**, where `require('electron')` loads a module and returns what it exports. `package.json` says `"type": "module"`, so a `.js` file would be read as the newer kind (`import`); the `.cjs` extension says "CommonJS" whatever `package.json` says. It's plain JavaScript, not TypeScript: the sandbox doesn't strip types.
- `const { contextBridge, ipcRenderer } = require('electron')` takes two of Electron's modules out of the object `require` returns (destructuring, lesson 5.5).
- `contextBridge.exposeInMainWorld('studio', { … })` puts a copy of the object on the page's `window`, as `window.studio`. "Main world" is the page's side of the isolation.
- `load: () => ipcRenderer.invoke('project:load')` sends one message on the `'project:load'` channel and returns the promise of the answer. The page can call `load()`; it can't choose the channel, or send anything else.
- Channel names are just strings. `'project:load'` is written as "area: action" so they stay readable as more are added.

```check
contains electron/preload.cjs "exposeInMainWorld('studio'"
```

## The main process answers

Change `electron/main.ts`:

```ts file=electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { diskFiles } from './files.ts';
import { loadProject } from './project.ts';

const folder = path.resolve(process.argv[2] ?? path.join(app.getAppPath(), 'example'));

ipcMain.handle('project:load', () => loadProject(diskFiles, folder));

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

- `const folder = path.resolve(process.argv[2] ?? path.join(app.getAppPath(), 'example'))` decides which project this run opens:
  - `process.argv` is the list of words the program was started with. For `electron . /games/kart`, it's `['…/Electron', '.', '/games/kart']`: the program, then each argument. `[2]` is the folder, or `undefined` when none was given.
  - `??` (lesson 4.6) takes the right-hand side when the left is `undefined`: then the folder is `example` inside the app's own folder. `app.getAppPath()` is the folder with `package.json` in it, wherever the app was started from.
  - `path.resolve(…)` makes a relative path like `../games/kart` into a full one, measured from where the command was typed. The page will be told the full path, which means the same thing wherever it's used.
- `ipcMain.handle('project:load', () => loadProject(diskFiles, folder))` registers the handler for the channel. When a message arrives, it calls `loadProject` with the real disk, and the promise it returns is what Electron sends back, once it resolves. This line is the only place `diskFiles` meets `loadProject`; the tests gave it a fake instead.
- `webPreferences: { preload: … }` tells the window which preload script to run before the page. `import.meta.dirname` is the folder this file is in (lesson 0.6), so the path is right wherever the project is.
- `openWindow(): void` now says it returns nothing, as every function in the studio does.
- The handler takes no input from the page, so there's nothing in the message the page could get wrong. Lesson 6.6's save handler takes text, and has to check it.

```check
run "npx tsc -p electron" label="the main process type-checks"
```

## The page asks

The last step: the page asks for the project instead of importing the scene. Change `src/main.tsx`:

```tsx file=src/main.tsx
import { createRoot } from 'react-dom/client';
import { buildNode, ENGINE_MAKERS, type Maker } from './engine/build';
import { Game } from './engine/game';
import type { Node } from './engine/node';
import { parseScene } from './engine/parse';
import type { SceneData } from './engine/scene';
import { EditorStore } from './editor/store';
import { ENGINE_TYPES, type TypeDef } from './engine/registry';
import { addMoveActions, Player, PLAYER_TYPE } from './game/player';
import { App } from './ui/App';

const game = new Game();
addMoveActions(game.input);
const makers = new Map<string, Maker>(ENGINE_MAKERS);
makers.set('Player', (name) => new Player(name, game.input));
const types = new Map<string, TypeDef>(ENGINE_TYPES);
types.set('Player', PLAYER_TYPE);
let player: Player | null = null;

function findPlayer(node: Node): Player | null {
  if (node instanceof Player) return node;
  for (const child of node.children) {
    const found = findPlayer(child);
    if (found) return found;
  }
  return null;
}

function rebuild(scene: SceneData): void {
  const level = buildNode(scene.root, makers);
  for (const child of [...game.root.children]) game.root.removeChild(child);
  game.root.addChild(level);
  player = findPlayer(level);
}

function load(text: string): SceneData {
  const scene = parseScene(text);
  rebuild(scene);
  return scene;
}

function readout(): string {
  return player ? player.position.x.toFixed(0) : '';
}

let scene: SceneData = { formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } };
const project = await window.studio.load();
let loadProblem = project.problem;
if (loadProblem === '') {
  try {
    scene = load(project.text);
  } catch (error) {
    loadProblem = `The scene didn't load. ${(error as Error).message}`;
  }
}
const store = new EditorStore(scene, rebuild);
store.problem = loadProblem;

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
    event.preventDefault();
    if (event.shiftKey) store.redo();
    else store.undo();
    return;
  }
  game.input.key(event.code, true);
});
window.addEventListener('keyup', (event) => game.input.key(event.code, false));

const root = document.querySelector('#root');
if (root) createRoot(root).render(<App store={store} game={game} readout={readout} types={types} />);
```

- The `?raw` import is gone. The scene isn't part of the build any more: the app now reads it from disk each time it starts.
- `load(text)` parses the text it's given, instead of the imported one.
- `const project = await window.studio.load();` sends the message and waits for the answer. This `await` isn't inside any function: it's at the **top level** of the module, which modules allow. Everything below it, the store and the React root included, waits until the project has arrived, so nothing is drawn from a scene that isn't there yet.
- `let loadProblem = project.problem;` starts from the main process's problem, if any (a folder that isn't a project).
- `if (loadProblem === '')`: only when the folder had a scene is it parsed. A scene that doesn't parse still gives lesson 2.5's message.
- One consequence: the page now needs Electron. `npm run dev` opens it in a browser, where there's no `window.studio`, so it stops at that line. From here, the studio runs with `npm start`.

```check
run "npx tsc" label="the page type-checks"
run "npm run e2e" timeout=180 stdout="13 passed" label="the acceptance test passes: the studio shows the scene from the folder it's given"
```

The acceptance test from lesson 6.2 passes: started with a folder, the studio shows that folder's scene. The outer loop is closed.

Try it by hand. `npm start` opens the example. To open another folder, copy `example` somewhere (`../my-game`), change the player's x in its `scenes/main.json`, and run `npm start -- ../my-game`: everything after `--` is passed on to the command at the end of the `start` script, so it runs `electron . ../my-game`.

## Merge the branch

The slice works, and `npm run check` passes, so the branch's work joins `main`:

```powershell
git add .
git commit -m "The page loads its project through a preload bridge and IPC"
git switch main
git merge project-folders
git branch -d project-folders
```

- `git switch main` goes back to `main`. Your files change to `main`'s last commit: lesson 6.1's, before any of this sprint's work.
- `git merge project-folders` brings the branch's three commits into `main`. Since `main` hasn't moved since the branch started, Git simply moves `main`'s name forward to the branch's last commit: a **fast-forward** merge. Your files are back as they were on the branch.
- `git branch -d project-folders` deletes the branch's name. The commits stay: they're part of `main` now. `-d` refuses to delete a branch whose work isn't merged, so it can't lose anything.

```check
git-branch main
git-no-branch project-folders
git-clean
```

None of Sprint 6's stories is done yet: this was the groundwork for all three. The next lesson starts the first one, saving.

```predict
question: The preload exposes only load(). A script running in the page tries window.studio.invoke('scene:delete-everything'). What happens?
choice: The main process receives the message, since every page can send any message
choice: It fails in the page: window.studio has no invoke, and the page can't reach ipcRenderer
choice: Electron asks the user whether to allow the message
answer: It fails in the page: window.studio has no invoke, and the page can't reach ipcRenderer
explain: The page sees only the object the preload exposed, which has one function, load. ipcRenderer stays in the preload's own, isolated variables, so the page can't send a message on any other channel. That's the point of a narrow bridge: what the main process could be asked is exactly the list in the preload.
```

## Challenge: the folder in the title

**Optional, ★★.** Show the open project's folder name in the window's title, like `Studio — my-game`, so you can tell two studios apart. Which process should set it? (`document.title` is the page's; `win.setTitle(…)` is the main process's.) Keep the end-to-end test that checks the title is `Studio` passing, or change it, and say why.

```hints
nudge: The page already knows the folder: project.folder. path isn't available in the page, but the last part of a path is folder.split(/[\\/]/).pop().
concept: Setting document.title from the page keeps the main process unchanged; Electron shows the page's title in the window's title bar.
```
