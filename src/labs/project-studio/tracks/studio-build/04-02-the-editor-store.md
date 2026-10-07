---
title: 4.2 — The Editor's Store
track: Build Your Own Game Studio
runtime: none
concepts: state, observer-pattern, single-source-of-truth, listeners
problem: The tree, the inspector and the console all show the same scene and change it. If each kept its own copy, they would soon disagree. Where does the editor's state live, and how does every panel hear that it changed?
---

Every panel in Sprint 4 reads the same things: the scene, its history, the problem message, and (new) which node is **selected**. And any panel can change them. If each panel kept its own copy, a change in the inspector would leave the tree showing the old scene.

So the editor keeps its state in **one** object, the **store**, and every panel reads from it and asks it for changes. This is the same idea as lesson 3.1's "the data is the source of truth", one level up: the scene data is the truth about the scene; the store is the truth about the editor.

The store is a plain TypeScript class, with no React in it, so it's tested like the rest of the editor. Most of it is already written: it's `main.ts`'s `change`, `undo` and `redo` from lesson 3.7, moved into a class.

The real Game Studio has the same thing, `editor/store.ts`. It grew to over 1,200 lines because every feature added its state there. This course keeps the same shape and adds to it one sprint at a time.

## The store's tests

Create `src/editor/store.test.ts`:

```ts file=src/editor/store.test.ts
import { expect, test } from 'vitest';
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

test('a line of code changes the scene and is logged', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.run('scene.setProp("level/wall", "color", 1);');
  expect(findNode(store.scene, 'level/wall').props.color).toBe(1);
  expect(store.history.code).toEqual(['scene.setProp("level/wall", "color", 1);']);
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
```

- `new EditorStore(scene(), refuseColor2)`: a store is made from a scene and a **check**: a function the store calls on the scene after every change, which throws if the scene is no good. In the app, the check will be "rebuild the live nodes" (lesson 3.7), which throws when the engine refuses a scene.
- Tests can't start Phaser, so they pass a check of their own. `refuseColor2` throws if the wall's colour is 2. It's a stand-in for the engine with one easy-to-trigger rule.
- `store.run(code)` runs a line of console code; `store.problem` is the message the page will show, `''` when there's none.
- The fourth test is a case lesson 3.7's `change` got wrong. A console line can hold two calls. If the first works and the second throws, the first change has been made and recorded in the history, but 3.7's `change` stopped at the error and never rebuilt, so the window kept showing the old scene and the old log. The store must check the scene whether or not the action threw.

```predict
question: In lesson 3.7's app, you type scene.setProp("level/wall", "color", 16766720); scene.deleteNode("level/truck"); and press Enter. What does the window show?
choice: The error, and nothing has changed, in the data or on screen
choice: The error; the wall still grey and the log still empty, though the data now says gold
choice: The error, a gold wall, and the setProp line in the log
answer: The error; the wall still grey and the log still empty, though the data now says gold
explain: The first call ran as a command, so the data changed and the history recorded it. The second threw, so change() showed the error and returned before rebuild(), which is what rebuilds the nodes and redraws the log. The data and the window disagree until the next change.
```

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './store'"
```

## The store

Create `src/editor/store.ts`:

```ts file=src/editor/store.ts
import type { SceneData } from '../engine/scene';
import { History } from './history';
import { runCode, sceneScript, type SceneScript } from './script';

export type Check = (scene: SceneData) => void;

export class EditorStore {
  readonly history = new History();
  readonly script: SceneScript;
  problem = '';

  constructor(
    readonly scene: SceneData,
    private readonly check: Check,
  ) {
    this.script = sceneScript(scene, this.history);
  }

  run(code: string): void {
    this.change(() => runCode(code, this.script));
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

  private change(action: () => void): void {
    this.problem = '';
    try {
      action();
    } catch (error) {
      this.problem = (error as Error).message;
    }
    this.checkOrUndo();
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
}
```

- `export type Check = (scene: SceneData) => void` gives a name to a **function type**: any function that takes a `SceneData` and returns nothing. `type` makes a name for a type, as `interface` does for object shapes (lesson 2.1). Here `void` says the result isn't used: the check reports a problem by throwing.
- `readonly history = new History()` is a **field with a starting value**: each new store gets its own `History`. `readonly` (lesson 1.5) means the field can't be pointed at another history later, though the history itself still changes.
- `readonly script: SceneScript` is declared here and given its value in the constructor. TypeScript checks that the constructor does give it one.
- `problem = ''` starts with no problem. Its type, `string`, is inferred from `''`.
- `constructor(readonly scene: SceneData, private readonly check: Check)` uses **parameter properties** (the same shorthand as `Vec2`'s `public x` in lesson 1.1): each parameter with `readonly`, `private` or `public` in front becomes a field with that name, set to the argument. `scene` is public, so panels can read it; `check` is `private`, so only the store can call it.
- `this.script = sceneScript(scene, this.history)` makes the `scene` facade (lesson 3.6) once, for this scene and this history.
- `run(code)` runs a console line through `change`. `undo` and `redo` are lesson 3.7's, with the message put in `this.problem` instead of on the page.
- `change(action)` is `private`: only the store's own methods call it. It's lesson 3.7's `change`, with the gap closed:
  - clear the problem;
  - run the action; if it throws, keep its message, but don't stop;
  - **always** check the scene, because the action may have made changes before it threw.
- `checkOrUndo()` calls the check. If the check throws, the last change is undone, the check is run again on the restored scene (to rebuild the old nodes), and the problem says why. A message from the check replaces any message from the action, because it says more: the change was taken back.
- The second call to `this.check` isn't inside a `try`. The scene after an undo is one that has passed the check before, so it can't throw.
- The store never touches the page. Its methods change data and set `problem`; what to draw is up to the panels.

```check
run "npx vitest run src" stdout="77 passed"
run "npx tsc"
```

## Listeners: tests

The page must redraw when the store changes. The store can't call the panels itself: it doesn't know they exist, and the tests have none. Instead, anything that wants to know can give the store a function to call, a **listener**, and the store calls every listener after each change. This is the **observer pattern**: the store is observed, and doesn't need to know who's watching.

The store also gains the **selection**: the path of the node selected in the tree, or `null` when there's none. Change `src/editor/store.test.ts`:

```ts file=src/editor/store.test.ts
import { expect, test } from 'vitest';
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
```

- The first test now also counts calls: `store.subscribe(() => calls++)` gives the store a listener that adds one to `calls`. After one change, it must have been called exactly once.
- `subscribe` returns a function. Calling it, `unsubscribe()`, takes the listener off: after that, `select(null)` must not reach it, so `calls` stays 1.
- `select(path)` sets `selected` and tells listeners: selecting is a change to the editor's state, even though the scene doesn't change, and the tree and the inspector must redraw for it.
- The last test: a deleted node can't stay selected, or the inspector would try to show a node that isn't there. Undo brings the car back, but not the selection. Selection isn't part of the scene, so it isn't part of the history.

```check
run "npx vitest run src" exit=1 stderr="store.subscribe is not a function"
```

## Listeners and the selection

Change `src/editor/store.ts`:

```ts file=src/editor/store.ts
import type { SceneData } from '../engine/scene';
import { History } from './history';
import { findNode } from './scene-api';
import { runCode, sceneScript, type SceneScript } from './script';

export type Check = (scene: SceneData) => void;

export class EditorStore {
  readonly history = new History();
  readonly script: SceneScript;
  problem = '';
  selected: string | null = null;
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

- `selected: string | null = null` is a **union type** (lesson 0.5): a path, or `null` for nothing selected.
- `private readonly listeners = new Set<() => void>()`: a `Set` (lesson 1.6) of functions that take nothing and return nothing. A `Set` and not an array, because the same function added twice is still one listener, and removing one is a single `delete`.
- `private version = 0` counts changes. Lesson 4.3 explains what React needs it for.
- `subscribe = (listener) => { … }` is a field holding an **arrow function**, not a method. The difference is `this`:
  - In a method, `this` is whatever object the method was called *on*. `store.subscribe(f)` is fine, but `const s = store.subscribe; s(f)` calls it on nothing, and `this.listeners` fails: `this` is `undefined`.
  - An arrow function has no `this` of its own: it uses the `this` of where it was written, here the store being built. So it works however it's called.
  - Lesson 4.3 hands `subscribe` and `getVersion` to React on their own, without the store, so they must be arrow functions.
- `subscribe` adds the listener and returns `() => this.listeners.delete(listener)`: a closure (lesson 2.2) that remembers which listener to remove.
- `getVersion` returns the current count.
- `select(path)` sets the selection and calls `changed()`.
- `change` now ends with two more lines: if the selected node no longer exists, select nothing; then `changed()`.
- `exists(path)` asks `findNode` and turns its error into `false`. `catch {` with no `(error)`: the error itself isn't needed, so it isn't named.
- `changed()` adds one to the version and calls every listener. `for (const listener of this.listeners)` walks a `Set` the same way as an array.

```check
run "npx vitest run src" stdout="79 passed"
run "npx tsc"
```

## main.tsx on the store

Now the app uses the store. Change `src/main.tsx`:

```tsx file=src/main.tsx
import Phaser from 'phaser';
import { createRoot } from 'react-dom/client';
import mainScene from '../scenes/main.json?raw';
import { buildNode, ENGINE_MAKERS, type Maker } from './engine/build';
import { drawTree } from './engine/draw';
import { Game } from './engine/game';
import type { Node } from './engine/node';
import { parseScene } from './engine/parse';
import type { SceneData } from './engine/scene';
import { EditorStore } from './editor/store';
import { addMoveActions, Player } from './game/player';
import { Title } from './ui/Title';

const header = document.querySelector('#header');
if (header) createRoot(header).render(<Title name="Studio" />);

const game = new Game();
addMoveActions(game.input);
const makers = new Map<string, Maker>(ENGINE_MAKERS);
makers.set('Player', (name) => new Player(name, game.input));
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

function load(): SceneData {
  const scene = parseScene(mainScene);
  rebuild(scene);
  return scene;
}

let scene: SceneData = { formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } };
let loadProblem = '';
try {
  scene = load();
} catch (error) {
  loadProblem = `The scene didn't load. ${(error as Error).message}`;
}
const store = new EditorStore(scene, rebuild);
store.problem = loadProblem;

const problem = document.querySelector('#problem');
const log = document.querySelector('#log');

function show(): void {
  if (problem) problem.textContent = store.problem;
  if (!log) return;
  const items = store.history.code.map((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    return item;
  });
  log.replaceChildren(...items);
}

store.subscribe(show);
show();

const form = document.querySelector('#console');
const input = document.querySelector('#code');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!(input instanceof HTMLInputElement)) return;
  store.run(input.value);
  input.value = '';
});
document.querySelector('#undo')?.addEventListener('click', () => store.undo());
document.querySelector('#redo')?.addEventListener('click', () => store.redo());

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

const playerX = document.querySelector('#player-x');

class Play extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;

  create(): void {
    this.graphics = this.add.graphics();
  }

  override update(_time: number, delta: number): void {
    game.frame(delta / 1000);
    this.graphics.clear();
    drawTree(game.root, this.graphics);
    if (playerX) playerX.textContent = player ? player.position.x.toFixed(0) : '';
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: 'game',
  backgroundColor: '#1d2330',
  scene: Play,
});
```

- `History`, `runCode` and `sceneScript` aren't imported any more: the store uses them. `main.tsx` imports `EditorStore` instead.
- `rebuild(scene)` now takes the scene as a parameter, so it fits the `Check` type: the store calls it after every change. It builds the new level **before** removing the old one, so if building throws, the game still has the old level. It no longer redraws the log; that's the page's job now.
- `load()` reads the scene file and builds it. If either throws, the error leaves `load` and nothing is changed.
- `let scene` starts as an empty level, as in lesson 3.7, and `load()` replaces it only if it succeeds. A file that doesn't load leaves the empty level and a message in `loadProblem`.
- `const store = new EditorStore(scene, rebuild)`: `rebuild` is passed without brackets, so the store calls it later, on each change.
- `store.problem = loadProblem` shows the load message, if there was one, through the same field as every other problem.
- `show()` draws the store onto the page: the problem, and the log from `store.history.code`. It's lesson 3.7's `showLog`, reading from the store.
- `store.subscribe(show)` makes `show` a listener: after every change, the page is redrawn. `show()` is also called once straight away, to draw the starting state.
- The form, the buttons and Ctrl+Z now just call `store.run`, `store.undo` and `store.redo`. The rules about what a change does live in one place, the store, and are tested there.

Run `npm start`: it works exactly as before. Then try the predict question's line: the wall turns gold, the log shows the `setProp` line, and the problem says there's no node at `level/truck`.

```check
run "npx tsc"
run "npm run e2e" stdout="4 passed" label="the console, the log and undo still work"
```

## Commit

```powershell
git add .
git commit -m "The editor's store: changes, undo, the problem, the selection, and listeners"
```

```check
git-clean
git-tracked src/editor/store.ts
```

## Challenge: listeners that throw

**Optional, ★★.** If one listener throws, `changed()` stops, and the listeners after it never hear about the change. Write a test with two listeners, the first of which throws, and make `changed()` still call the second one. Should the store then throw the first listener's error, or keep it quiet? Write down your choice in the test's name.

```hints
nudge: Wrap each call in its own try.
concept: A listener's bug shouldn't stop other panels from redrawing, but hiding errors makes bugs hard to find.
shape: for (const listener of this.listeners) { try { listener(); } catch (error) { console.error(error); } }
```
