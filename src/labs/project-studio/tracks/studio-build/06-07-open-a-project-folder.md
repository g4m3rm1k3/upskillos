---
title: 6.7 — Open a Project Folder
track: Build Your Own Game Studio
runtime: none
concepts: native-dialogs, stubbing-in-end-to-end-tests, reloading-the-page, state-in-the-main-process
problem: The studio opens the folder it was started with. To work on another game, you'd have to close it and start it again from a terminal. How does the studio let you choose a folder with the system's own dialog, switch to it, and how do you test a dialog that waits for a person to click?
---

Sprint 6's second story:

> As a game maker, I want to open a project folder, so that I can work on more than one game.

Lessons 6.2 to 6.4 did half of it: the studio opens the folder it's started with. This lesson adds an Open button that shows the operating system's folder dialog and switches the studio to the folder you choose.

How should the studio switch? Everything the page holds (the store, the history, the game, the selection) belongs to the old project. Clearing each piece by hand is easy to get wrong: forget one and the new project starts with the old one's undo history. The page already knows how to start from a folder, so the simplest correct way is to start the page again: the main process remembers the new folder and **reloads** the window, and the page loads the new project exactly as it does at startup. VS Code does the same when you open another folder.

## A branch for the story

```powershell
git switch -c open-a-folder
```

```check
git-branch open-a-folder
```

## The acceptance test, with a stubbed dialog

A folder dialog waits for a person to pick a folder and click Open. An automatic test has no person. Change `e2e/files.test.ts`:

```ts file=e2e/files.test.ts
import fs from 'node:fs';
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
```

- The new test is the last one. It makes two project folders, `first` with the player at 400 and `second` with the player at 250, and starts the studio on `first`.
- `app.evaluate(fn, second)` runs `fn` inside the app's main process (Playwright sends the function's code there) and passes it `second`. The function's first parameter is Electron's own module, so `({ dialog })` takes out `dialog`, the same object `main.ts` imports.
- `dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [chosen] })) as typeof dialog.showOpenDialog;` replaces the real dialog function with a **stub**: a function that returns at once, as if the user had chosen `second`. `{ canceled: false, filePaths: […] }` is the shape the real one resolves to.
  - `as typeof dialog.showOpenDialog` tells the type checker to treat the stub as the real function's type. The real one has several ways it can be called; the stub handles only the one the studio uses, which the checker can't see for itself.
  - It works because `main.ts` calls `dialog.showOpenDialog(…)` each time, looking the function up on the object as it does. Replacing the property on the object replaces what that call finds.
- Then it clicks `#open` (after checking it exists, to fail fast) and waits for the readout to say 250: the second project's player.
- What this test doesn't check: the real dialog. That's the operating system's code, which the studio only calls; the test checks everything around it, what the studio asks for and what it does with the answer. Replacing a piece you can't drive is the price of an automatic test, and it's why the stub is as small as it can be.

```check
run "npm run e2e" timeout=180 exit=1 stderr="expected +0 to be 1" label="the test fails: there's no Open button yet"
```

## Showing a problem from outside: a test

If you choose a folder that isn't a project, the main process will say so, and the page has to show that message. The store holds the problem the console shows; it needs a way to be handed one. Change `src/editor/store.test.ts`:

```ts file=src/editor/store.test.ts
import { expect, test } from 'vitest';
import { formatScene } from '../engine/format';
import type { SceneData } from '../engine/scene';
import { findNode } from './scene-api';
import { EditorStore } from './store';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { color: 9807270 }, children: [] },
        { type: 'Box', name: 'car', props: {}, children: [] },
      ],
    },
  };
}

function refuseColor2(data: SceneData): void {
  if (findNode(data, 'level/wall').props.color === 2) throw new Error('2 is not a colour');
}

test('a line of code changes the scene, is logged, and tells every listener', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  store.subscribe(() => calls++);
  store.run('scene.setProp("level/wall", "color", 1);');
  expect(findNode(store.scene, 'level/wall').props.color).toBe(1);
  expect(store.history.code).toEqual(['scene.setProp("level/wall", "color", 1);']);
  expect(calls).toBe(1);
});

test('a line that fails changes nothing, and the problem says why', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.run('scene.setProp("level/truck", "color", 1);');
  expect(store.problem).toBe('There is no node at "level/truck"');
  expect(store.history.code).toEqual([]);
});

test('a change the check refuses is undone, with the reason', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.run('scene.setProp("level/wall", "color", 2);');
  expect(store.problem).toBe('That change was undone: 2 is not a colour');
  expect(findNode(store.scene, 'level/wall').props.color).toBe(9807270);
  expect(store.history.code).toEqual([]);
});

test('a line that fails part way keeps its earlier changes, and they are checked too', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.run('scene.setProp("level/wall", "color", 1); scene.deleteNode("level/truck");');
  expect(store.problem).toBe('There is no node at "level/truck"');
  expect(store.history.code).toEqual(['scene.setProp("level/wall", "color", 1);']);
  store.run('scene.setProp("level/wall", "color", 2); scene.deleteNode("level/truck");');
  expect(store.problem).toBe('That change was undone: 2 is not a colour');
  expect(findNode(store.scene, 'level/wall').props.color).toBe(1);
});

test('undo and redo, and a message when there is nothing to do', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.undo();
  expect(store.problem).toBe('Nothing to undo');
  store.run('scene.setProp("level/wall", "color", 1);');
  expect(store.problem).toBe('');
  store.undo();
  expect(findNode(store.scene, 'level/wall').props.color).toBe(9807270);
  store.redo();
  expect(findNode(store.scene, 'level/wall').props.color).toBe(1);
});

test('selecting a node tells listeners; a listener that unsubscribes hears nothing more', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  const unsubscribe = store.subscribe(() => calls++);
  store.select('level/car');
  expect(store.selected).toBe('level/car');
  unsubscribe();
  store.select(null);
  expect(calls).toBe(1);
});

test('a selected node that stops existing is no longer selected', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.select('level/car');
  store.run('scene.deleteNode("level/car");');
  expect(store.selected).toBe(null);
  store.undo();
  expect(store.selected).toBe(null);
});

test('setProp changes one property through a command, logged as the code that does the same', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.setProp('level/car', 'position', { x: 10, y: 20 });
  expect(findNode(store.scene, 'level/car').props.position).toEqual({ x: 10, y: 20 });
  expect(store.history.code).toEqual(['scene.setProp("level/car", "position", { x: 10, y: 20 });']);
  store.setProp('level/wall', 'color', 2);
  expect(store.problem).toBe('That change was undone: 2 is not a colour');
});

test('play starts the game; stop builds it again from the scene, as it was before playing', () => {
  let builds = 0;
  const store = new EditorStore(scene(), () => builds++);
  let calls = 0;
  store.subscribe(() => calls++);
  expect(store.playing).toBe(false);
  store.play();
  expect(store.playing).toBe(true);
  expect(builds).toBe(0);
  store.stop();
  expect(store.playing).toBe(false);
  expect(builds).toBe(1);
  expect(calls).toBe(2);
});

test('the tool starts as move; choosing another tells listeners', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  store.subscribe(() => calls++);
  expect(store.tool).toBe('move');
  store.setTool('rotate');
  expect(store.tool).toBe('rotate');
  expect(calls).toBe(1);
});

test('snapping starts off; turning it on tells listeners', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  store.subscribe(() => calls++);
  expect(store.snap).toBe(false);
  store.setSnap(true);
  expect(store.snap).toBe(true);
  expect(calls).toBe(1);
});

test('save hands the scene, as text, to whatever writes it', async () => {
  const store = new EditorStore(scene(), refuseColor2);
  const written: string[] = [];
  await store.save(async (text) => {
    written.push(text);
  });
  expect(written).toEqual([formatScene(scene())]);
});

test('a save that fails says why, and tells the listeners', async () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  store.subscribe(() => calls++);
  await store.save(async () => {
    throw new Error('the disk is full');
  });
  expect(store.problem).toBe("The scene wasn't saved: the disk is full");
  expect(calls).toBe(1);
});

test('report shows a problem from outside the store, and tells the listeners', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  store.subscribe(() => calls++);
  store.report('/games/empty is not a project: it has no scenes/main.json');
  expect(store.problem).toBe('/games/empty is not a project: it has no scenes/main.json');
  expect(calls).toBe(1);
});
```

- The new test is the last one. `store.report(message)` must set `problem` to the message, and tell the listeners once, so the console draws it.

```check
run "npm test" exit=1 stderr="store.report is not a function" label="the test fails: the store can't be told a problem yet"
```

## EditorStore.report

Change `src/editor/store.ts`:

```ts file=src/editor/store.ts
import { formatScene } from '../engine/format';
import type { PropValue, SceneData } from '../engine/scene';
import { History } from './history';
import { findNode } from './scene-api';
import { runCode, sceneScript, type SceneScript } from './script';

export type Check = (scene: SceneData) => void;

export type Tool = 'move' | 'rotate' | 'scale';

export class EditorStore {
  readonly history = new History();
  readonly script: SceneScript;
  problem = '';
  selected: string | null = null;
  playing = false;
  tool: Tool = 'move';
  snap = false;
  private version = 0;
  private readonly listeners = new Set<() => void>();

  constructor(
    readonly scene: SceneData,
    private readonly check: Check,
  ) {
    this.script = sceneScript(scene, this.history);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  run(code: string): void {
    this.change(() => runCode(code, this.script));
  }

  setProp(path: string, key: string, value: PropValue): void {
    this.change(() => this.script.setProp(path, key, value));
  }

  undo(): void {
    this.change(() => {
      if (!this.history.undo()) this.problem = 'Nothing to undo';
    });
  }

  redo(): void {
    this.change(() => {
      if (!this.history.redo()) this.problem = 'Nothing to redo';
    });
  }

  play(): void {
    this.playing = true;
    this.changed();
  }

  stop(): void {
    this.playing = false;
    this.check(this.scene);
    this.changed();
  }

  setTool(tool: Tool): void {
    this.tool = tool;
    this.changed();
  }

  setSnap(snap: boolean): void {
    this.snap = snap;
    this.changed();
  }

  async save(write: (text: string) => Promise<void>): Promise<void> {
    try {
      await write(formatScene(this.scene));
    } catch (error) {
      this.problem = `The scene wasn't saved: ${(error as Error).message}`;
      this.changed();
    }
  }

  report(problem: string): void {
    this.problem = problem;
    this.changed();
  }

  select(path: string | null): void {
    this.selected = path;
    this.changed();
  }

  private change(action: () => void): void {
    this.problem = '';
    try {
      action();
    } catch (error) {
      this.problem = (error as Error).message;
    }
    this.checkOrUndo();
    if (this.selected !== null && !this.exists(this.selected)) this.selected = null;
    this.changed();
  }

  private checkOrUndo(): void {
    try {
      this.check(this.scene);
    } catch (error) {
      this.history.undo();
      this.check(this.scene);
      this.problem = `That change was undone: ${(error as Error).message}`;
    }
  }

  private exists(path: string): boolean {
    try {
      findNode(this.scene, path);
      return true;
    } catch {
      return false;
    }
  }

  private changed(): void {
    this.version++;
    for (const listener of this.listeners) listener();
  }
}
```

- `report(problem)` sets `problem` and calls `changed()`. Reporting `''` clears the problem, which the toolbar will do when opening works.

```check
run "npm test" stdout="154 passed" label="a problem from outside is shown"
```

## The bridge opens

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
}

declare global {
  interface Window {
    studio: StudioApi;
  }
}
```

- `open()` asks the main process to let the user choose a folder and switch to it. It resolves to a problem to show: `''` if the switch happened or the user cancelled.

```check
run "npx tsc" exit=1 stdout="TS2741" label="the toolbar test's stub has no open yet"
```

The type checker finds a stand-in that has fallen behind:

```text
src/ui/Toolbar.test.tsx(7,7): error TS2741: Property 'open' is missing in type '{ load: () => Promise<{ folder: string; text: string; problem: string; }>; save: () => Promise<void>; }' but required in type 'StudioApi'.
```

- The stub `studio` in the toolbar's tests says it's a `StudioApi`, and a `StudioApi` now has `open`. It's the same safety as `implements Files` in lesson 6.5: a test double typed as the real interface can't quietly drift from it. The toolbar's test is changed two steps from now.

## The preload sends it

Change `electron/preload.cjs`:

```js file=electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studio', {
  load: () => ipcRenderer.invoke('project:load'),
  save: (text) => ipcRenderer.invoke('scene:save', text),
  open: () => ipcRenderer.invoke('project:open'),
});
```

- `open: () => ipcRenderer.invoke('project:open')` sends a message on a new channel, with nothing in it. The page asks to open; it doesn't say what. The folder is chosen in the main process's dialog, so a script in the page can't make the studio open a folder of its choosing.

```check
contains electron/preload.cjs "ipcRenderer.invoke('project:open')"
```

## The main process opens

Change `electron/main.ts`:

```ts file=electron/main.ts
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { diskFiles } from './files.ts';
import { loadProject, saveScene } from './project.ts';

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

- `dialog` joins the import from Electron.
- `const folder` becomes `let folder`: it's the main process's memory of which project is open, and opening one changes it. Saving and loading read it, so they follow.
- The handler for `'project:open'`:
  - `await dialog.showOpenDialog({ title: …, properties: ['openDirectory'] })` shows the operating system's own dialog, set to choose folders, not files (`'openDirectory'`), and resolves when the user closes it.
  - `if (choice.canceled) return '';`: the user pressed Cancel. Nothing changes, and there's nothing to report.
  - `choice.filePaths[0]` is the chosen folder: a list, because the same dialog can allow choosing several.
  - `await loadProject(diskFiles, …)` checks it's a project, with the code lesson 6.3 tested. If it isn't, the handler returns the problem, and `folder` doesn't change: the studio stays on the project it had.
  - Otherwise `folder = project.folder`, and `event.sender.reload()` reloads the page that sent the message (`event.sender` is that page). The new page calls `load()` as it starts, and gets the new folder's project.
- This handler isn't unit tested: it's glue between Electron's dialog, `loadProject` (unit tested in lesson 6.3) and the page, with two simple decisions. The end-to-end test covers the path that works; the not-a-project path is `loadProject`'s, already tested, and the store's `report`, just tested. A humble object again (lesson 6.1): little logic, and what there is lives in tested code.
- A cost to know: reloading drops anything not saved. The ADR at the end of the sprint records it, and lesson 6.6's challenge (an unsaved marker) is the first step to a warning.

```check
run "npx tsc -p electron" label="the main process type-checks"
```

## An Open button: a test

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

test('there are Save and Open buttons', () => {
  const store = new EditorStore({ formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } }, () => {});
  const html = renderToStaticMarkup(<Toolbar store={store} studio={studio} />);
  expect(html).toContain('<button type="button" id="save">Save</button>');
  expect(html).toContain('<button type="button" id="open">Open</button>');
});
```

- The stub `studio` gets `open: async () => ''`: the type checker requires every method of `StudioApi`, and an answer of "no problem" is all these tests need.
- The test for the Save button now checks the Open button too, and its name says so. Both are the same kind of fact, the toolbar's buttons, so one test holds both.

```check
run "npx tsc" label="the stub fits the API again"
run "npm test" exit=1 stderr="id=\"open\">Open" label="the test fails: there's no Open button"
```

## The Open button

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

- `onClick={async () => store.report(await studio.open())}`: a click asks the main process to open a folder, waits for the answer, and reports it. A problem is shown in the console; `''` clears any old one.
- If the open succeeds, the page reloads before (or just as) the answer arrives, and the report doesn't matter: the new page starts fresh.

```check
run "npm test" stdout="154 passed" label="there are Save and Open buttons"
run "npm run e2e" timeout=180 stdout="15 passed" label="the acceptance test passes: Open switches to the folder you choose"
```

## Merge, and tick the second story

Tick the second Sprint 6 story in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "Open: choose a project folder in a dialog, and the studio reloads on it"
git switch main
git merge open-a-folder
git branch -d open-a-folder
```

```check
contains BACKLOG.md "- [x] As a game maker, I want to open a project folder"
git-branch main
git-no-branch open-a-folder
git-clean
```

Try it: copy `example` to a folder outside the studio, run `npm start`, click Open and choose the copy. Then choose a folder that isn't a project, like your Documents folder: the console says why it can't be opened, and the studio stays where it was.

## Challenge: recent projects

**Optional, ★★★.** Remember the last project opened, so `npm start` with no folder opens it instead of the example. Where should that memory live? (Hint: not in the project, and not in the studio's own folder.) Electron's `app.getPath('userData')` is a folder each app gets for its own settings. Keep the logic testable: a function that takes a `Files`, reads a settings file, and returns the folder to open.

```hints
nudge: settings.json in userData, holding { "lastProject": "…" }; write it whenever a project is opened.
concept: The order of choice is: the folder on the command line, else the last project if it still is one, else the example. Each "else" is a test.
shape: export async function startFolder(files: Files, settingsFile: string, argument: string | undefined, example: string): Promise<string>
```
