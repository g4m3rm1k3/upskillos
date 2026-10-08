---
title: 6.6 — The Save Button
track: Build Your Own Game Studio
runtime: none
concepts: serialisation, round-trip-tests, validation-at-the-boundary, stubs, keyboard-shortcuts, git-merge
problem: The main process can save a scene safely. The page has the scene, as objects. What does the page send, how does it ask, and what should the main process trust about a message that arrives from the page?
---

Lesson 6.5 built saving in the main process, and a failing acceptance test: change the player, click Save, open the folder again, and the change is there. This lesson builds the page's half, from the inside out, and the test passes at the end:

1. turning the scene into text (`formatScene`);
2. the store's `save`, which hands that text to whatever writes it, and reports a failure;
3. a `save` message across the bridge, and a main process that checks what it receives;
4. a Save button, and Ctrl+S.

## Scene to text: a test

The scene file is text the user may read and keep in Git (Sprint 2's story), so the text a save writes should be easy to read: one key per line, indented, the way lesson 6.2's `makeProject` writes it. Create `src/engine/format.test.ts`:

```ts file=src/engine/format.test.ts
import { expect, test } from 'vitest';
import { formatScene } from './format';
import type { SceneData } from './scene';

test('a scene is written as JSON, two spaces for each level, ending with a newline', () => {
  const scene: SceneData = { formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } };
  expect(formatScene(scene)).toBe(
    '{\n  "formatVersion": 1,\n  "root": {\n    "type": "Node",\n    "name": "level",\n    "props": {},\n    "children": []\n  }\n}\n',
  );
});
```

- The test gives a scene with only a root, and checks the exact text that comes out. `\n` in a string is a **newline**: the character that ends a line.
- What it pins: two spaces of indent for each level, one key per line, the keys in the order the scene has them, empty `{}` and `[]` kept on one line, and a newline at the very end. Text files end with a newline by convention, and Git marks a file that doesn't.

```check
run "npm test" exit=1 stderr="Cannot find module './format'" label="the test fails: there's no format.ts yet"
```

## formatScene

Create `src/engine/format.ts`:

```ts file=src/engine/format.ts
import type { SceneData } from './scene';

export function formatScene(scene: SceneData): string {
  return `${JSON.stringify(scene, null, 2)}\n`;
}
```

- `formatScene(scene)` returns `JSON.stringify(scene, null, 2)` with a newline after it.
- `JSON.stringify(scene, null, 2)` writes the objects as JSON, two spaces per level (lesson 6.2 explained the `null` and the `2`).
- `` `${…}\n` `` is a template literal (lesson 0.3) holding the JSON and then a newline.
- It's in `src/engine/`, beside `parse.ts`: one file reads the format, the other writes it.

```check
run "npm test" stdout="149 passed" label="a scene is written as indented JSON"
```

## A round trip

Writing a scene and reading it back should give the same scene. That's a **round trip**, and it's worth a test of its own: it catches any change to either side that the other doesn't follow. Change `src/engine/format.test.ts`:

```ts file=src/engine/format.test.ts
import { expect, test } from 'vitest';
import { formatScene } from './format';
import { parseScene } from './parse';
import type { SceneData } from './scene';

test('a scene is written as JSON, two spaces for each level, ending with a newline', () => {
  const scene: SceneData = { formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } };
  expect(formatScene(scene)).toBe(
    '{\n  "formatVersion": 1,\n  "root": {\n    "type": "Node",\n    "name": "level",\n    "props": {},\n    "children": []\n  }\n}\n',
  );
});

test('a written scene reads back as the same scene', () => {
  const scene: SceneData = {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [{ type: 'Box', name: 'wall', props: { position: { x: 400, y: 60 }, color: 9807270 }, children: [] }],
    },
  };
  expect(parseScene(formatScene(scene))).toEqual(scene);
});
```

- The second test writes a scene with a child and reads it back with `parseScene` (lesson 2.4), and the result must equal the scene it started from.
- It passes at once: `JSON.stringify` and `parseScene` already agree. It's kept for the reason lesson 1.4 gave: from now on, a change to the format (a new kind of property, say) must keep both directions working, or this test fails.

```check
run "npm test" stdout="150 passed" label="a written scene reads back the same"
```

## The store saves: a test

The page's code changes the scene through the store, so the store is where saving starts. But the store mustn't know about `window.studio`: its tests run in Node, where there's no window and no main process. So `save` takes, as a parameter, the function that does the writing. Change `src/editor/store.test.ts`:

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
```

- `formatScene` joins the imports, to work out what the store should hand over.
- The test calls `store.save(…)` with a function that pushes the text it's given onto `written`. That function is a **spy** (lesson 1.8): a stand-in that records how it was called.
- The check: the spy was called once, with the scene as `formatScene` writes it.
- In the app, the function will send the text to the main process. The store doesn't know or care: it calls what it's given.

```check
run "npm test" exit=1 stderr="store.save is not a function" label="the test fails: the store can't save yet"
```

## EditorStore.save

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
    await write(formatScene(this.scene));
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

- `async save(write)` takes a function from text to a promise, `(text: string) => Promise<void>`, and returns a promise too.
- It calls `write(formatScene(this.scene))` and waits for it to finish.
- `formatScene` is imported from the engine, where the scene's file format lives.

```check
run "npm test" stdout="151 passed" label="save hands the scene, as text, to whatever writes it"
```

## A save that fails: a test

Lesson 6.5's `saveScene` rejects when the disk is full. The user must see that, or they'll close the studio thinking their work is safe. Change `src/editor/store.test.ts`:

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
```

- The new test passes a function that always fails: `async () => { throw new Error('the disk is full'); }`. That's a **stub**: a stand-in whose answer is fixed in advance, here a failure.
- After the save, `store.problem` must say the scene wasn't saved, and why, and the listeners must have been told once, so the console shows it.

```check
run "npm test" exit=1 stderr="the disk is full" label="the test fails: the failure escapes the store"
```

It fails with the stub's own error, `Error: the disk is full`: the rejection goes straight through `save` and out of the test. That's the behaviour this test changes.

## EditorStore.save, when the write fails

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

- `try { await write(…) } catch (error) { … }`: if the write rejects, the `await` throws, and the `catch` runs.
- It sets `problem` to say what failed and why, and calls `this.changed()`, so every listener (the console among them) draws again.
- A save that succeeds changes nothing the page shows, so it tells no one.

```check
run "npm test" stdout="152 passed" label="a failed save says why"
```

## The bridge saves

The page needs a way to send the text. Change `src/studio-api.ts`:

```ts file=src/studio-api.ts
export interface Project {
  folder: string;
  text: string;
  problem: string;
}

export interface StudioApi {
  load(): Promise<Project>;
  save(text: string): Promise<void>;
}

declare global {
  interface Window {
    studio: StudioApi;
  }
}
```

- `save(text)` joins `StudioApi`: send the scene's text to be saved, and a promise that resolves when it has been, or rejects if it couldn't be.

```check
run "npx tsc" label="the API type-checks"
```

## The preload sends it

Change `electron/preload.cjs`:

```js file=electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studio', {
  load: () => ipcRenderer.invoke('project:load'),
  save: (text) => ipcRenderer.invoke('scene:save', text),
});
```

- `save: (text) => ipcRenderer.invoke('scene:save', text)` sends the text on a new channel, `'scene:save'`. Anything after the channel's name travels with the message, copied.
- The page still can't choose *where* to save: there's no path in the message. Only the main process knows which folder is open.

```check
contains electron/preload.cjs "ipcRenderer.invoke('scene:save', text)"
```

## The main process saves, after checking

Change `electron/main.ts`:

```ts file=electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { diskFiles } from './files.ts';
import { loadProject, saveScene } from './project.ts';

const folder = path.resolve(process.argv[2] ?? path.join(app.getAppPath(), 'example'));

ipcMain.handle('project:load', () => loadProject(diskFiles, folder));
ipcMain.handle('scene:save', (_event, text: unknown) => {
  if (typeof text !== 'string') throw new Error('A scene is saved as text');
  return saveScene(diskFiles, folder, text);
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

- `saveScene` joins the import from `./project.ts`.
- `ipcMain.handle('scene:save', (_event, text: unknown) => { … })` handles the new channel. A handler gets the message's details first (`_event`; the `_` says it's not used), then whatever the page sent.
- `text: unknown`: the main process can't trust the page to send what the preload's code says. Any script running in the page might call `window.studio.save(…)` with a number, an object, nothing at all. `unknown` (lesson 2.4) makes the type checker refuse to use `text` until it's been checked.
- `if (typeof text !== 'string') throw new Error('A scene is saved as text');`: anything else is refused, and the page's promise rejects with that message. This is lesson 2.4's **validation at the border**: data is checked where it enters, here where it crosses from the less trusted process into the more trusted one.
- `return saveScene(diskFiles, folder, text)`: the folder is the main process's own, never the page's. Its promise is the answer.
- What the main process doesn't check: that the text is a valid scene. It writes what it's given, and the page checks a scene when it loads it. A broken file can't do harm beyond the project; a write to the wrong place could, which is why the *place* is what the main process decides.

```check
run "npx tsc -p electron" label="the main process type-checks"
```

## A Save button: a test

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

test('there is a Save button', () => {
  const store = new EditorStore({ formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } }, () => {});
  expect(renderToStaticMarkup(<Toolbar store={store} studio={studio} />)).toContain('<button type="button" id="save">Save</button>');
});
```

- `const studio: StudioApi = { … }` is a stub of the bridge: `load` returns an empty project and `save` does nothing. The toolbar will need a `StudioApi` to call, and in these tests nothing is clicked, so a stub that answers anything at all will do. `: StudioApi` makes the type checker hold the stub to the interface.
- Every `<Toolbar store={store} />` becomes `<Toolbar store={store} studio={studio} />`.
- The new test checks the toolbar's HTML contains a Save button with the id `save`. Clicking it is checked end to end (lesson 4.1: a click is tested with the real app).

```check
run "npm test" exit=1 stderr="id=\"save\">Save</button>" label="the test fails: there's no Save button"
```

## The Save button

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

- `Toolbar` takes a second prop, `studio: StudioApi`.
- The new button, first in the toolbar: `onClick={() => store.save((text) => studio.save(text))}`. A click asks the store to save, with a function that sends the text across the bridge.
- `(text) => studio.save(text)` instead of plain `studio.save`: the arrow function calls `save` *on* `studio`, as a method should be called. Passing `studio.save` alone would hand over the function without its object, which works for some objects and not others; the arrow works for all.

```check
run "npm test" stdout="153 passed" label="there's a Save button"
run "npx tsc" exit=1 stdout="TS2741" label="App doesn't pass the bridge to the toolbar yet"
```

The type checker finds the next gap: `App` renders `<Toolbar store={store} />`, without `studio`.

## App passes the bridge on

Change `src/ui/App.tsx`:

```tsx file=src/ui/App.tsx
import type { EditorStore } from '../editor/store';
import type { Game } from '../engine/game';
import type { TypeDef } from '../engine/registry';
import type { StudioApi } from '../studio-api';
import { Console } from './Console';
import { GameView } from './GameView';
import { Inspector } from './Inspector';
import { SceneTree } from './SceneTree';
import { Title } from './Title';
import { Toolbar } from './Toolbar';

export function App(props: {
  store: EditorStore;
  game: Game;
  readout: () => string;
  types: ReadonlyMap<string, TypeDef>;
  studio: StudioApi;
}) {
  const { store, game, readout, types, studio } = props;
  return (
    <div className="editor">
      <header className="top">
        <Title name="Studio" />
      </header>
      <aside className="left panel">
        <h2>Scene</h2>
        <SceneTree store={store} />
      </aside>
      <div className="centre">
        <Toolbar store={store} studio={studio} />
        <GameView store={store} game={game} readout={readout} />
      </div>
      <aside className="right panel">
        <h2>Inspector</h2>
        <Inspector store={store} types={types} />
      </aside>
      <div className="bottom">
        <Console store={store} />
      </div>
    </div>
  );
}
```

- `App` takes `studio: StudioApi` as a prop, takes it out of `props`, and hands it to the toolbar.
- Why not use `window.studio` inside the toolbar? Then its tests would need a `window` with a `studio` on it. Passed as a prop, it's a plain parameter: the tests give a stub, the app gives the real bridge. The same reason the store's `save` takes a function.

```check
run "npx tsc" exit=1 stdout="TS2741" label="main.tsx doesn't give App the bridge yet"
```

## Save from the page, and with Ctrl+S

Change `src/main.tsx`:

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
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
    event.preventDefault();
    store.save((text) => window.studio.save(text));
    return;
  }
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
if (root) createRoot(root).render(<App store={store} game={game} readout={readout} types={types} studio={window.studio} />);
```

- `<App … studio={window.studio} />`: the one place the page's code uses the real bridge for the editor.
- In the `keydown` listener, a new shortcut: Ctrl+S (or Cmd+S on a Mac, `metaKey`) saves. `event.preventDefault()` stops anything else the key would do, and `return` ends the listener, so the S doesn't reach the game's input.
- It sits after the check for typing in an input box, like the undo shortcut, so Ctrl+S while typing in the inspector is left to the input. Press Enter first to commit the value, then save.

```check
run "npx tsc" label="everything type-checks"
run "npm run e2e" timeout=180 stdout="14 passed" label="the acceptance test passes: a saved scene is there next time"
```

The story's acceptance test passes: change, save, close, open, and the change is there.

## Refactor: one way to find the player

Green, so look at what's left untidy. Lesson 6.5 noted that `e2e/project.ts` finds the player twice, with the same `find`. Change `e2e/project.ts`:

```ts file=e2e/project.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface PlayerData {
  name: string;
  props: { position: { x: number; y: number } };
}

function sceneFile(folder: string): string {
  return path.join(folder, 'scenes', 'main.json');
}

function playerIn(scene: { root: { children: PlayerData[] } }): PlayerData {
  const player = scene.root.children.find((child) => child.name === 'player');
  if (!player) throw new Error('The scene has no player');
  return player;
}

export function makeProject(playerX: number): string {
  const scene = JSON.parse(fs.readFileSync(sceneFile('example'), 'utf8'));
  playerIn(scene).props.position.x = playerX;
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-'));
  fs.mkdirSync(path.join(folder, 'scenes'));
  fs.writeFileSync(sceneFile(folder), JSON.stringify(scene, null, 2));
  return folder;
}

export function savedPlayerX(folder: string): number {
  return playerIn(JSON.parse(fs.readFileSync(sceneFile(folder), 'utf8'))).props.position.x;
}
```

- `interface PlayerData` says what the helpers use of a player: its name and its position. With it, `playerIn` returns something typed, not `any`.
- `sceneFile(folder)` is the one place that says where a project's scene is, for the tests.
- `playerIn(scene)` finds the player, or throws a clear error if the scene has none, instead of failing later on `undefined`.
- `makeProject` and `savedPlayerX` both use them. Neither test changed, and both still pass: the refactor checks itself.

```check
run "npx tsc" label="the helpers type-checks"
run "npm run e2e" timeout=180 stdout="14 passed" label="the same end-to-end tests pass"
```

## Merge, and tick the first story

The first story is done. Tick it in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "Save: the scene as text, through the bridge, to the open project; a Save button and Ctrl+S"
git switch main
git merge save-the-scene
git branch -d save-the-scene
```

```check
contains BACKLOG.md "- [x] As a game maker, I want to save my scene"
git-branch main
git-no-branch save-the-scene
git-clean
```

Run `npm start`, move the player, press Ctrl+S, and look at `example/scenes/main.json` in VS Code: the new position is there, and `git diff` shows exactly what changed. Commit it or put it back with `git restore example/scenes/main.json`.

## Challenge: an unsaved marker

**Optional, ★★.** Show a `●` before the Save button's label when the scene has changes that aren't saved yet, as most editors do. Test first, in the store: a `dirty` flag that a change sets, a successful save clears, and a failed save leaves set. What should undo do to it?

```hints
nudge: Set dirty = true in change() (which every edit and undo goes through), and dirty = false after a successful write in save().
concept: Undo is a change too, so it sets dirty, even when it takes you back to what was saved. Getting that exactly right means remembering which point in the history was saved: a harder, better version of the challenge.
```
