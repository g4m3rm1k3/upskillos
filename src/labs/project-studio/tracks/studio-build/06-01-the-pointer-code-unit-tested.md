---
title: 6.1 — The Pointer Code, Unit Tested
track: Build Your Own Game Studio
runtime: none
concepts: refactoring, extract-class, characterisation-tests, seams, humble-object, safety-net
problem: The game view's pointer code works, but only the end-to-end tests check it, and each one starts the whole app. How do you move working code you have no unit tests for without breaking it, and what do you do about the odd thing you find while you move it?
---

Sprint 5's retrospective ended with a change for this sprint: before the game view grows again, its pointer handling moves into a class of its own, with unit tests. This lesson makes that change before Sprint 6's first story.

The code is lesson 5.8's `GameView.tsx`. Four listeners (`pointerdown`, `pointermove`, `pointerup` and `wheel`) hold all of the viewport's editing: picking, three tools, snapping, panning and zooming. They work, and 12 end-to-end tests say so. But:

- An end-to-end test starts Electron, loads the page and moves a real mouse: seconds per test. A unit test runs in milliseconds.
- When an end-to-end test fails, it says *what* went wrong on screen ("expected '400' to be '432'"), not *where* in 150 lines.
- The listeners can't be unit tested where they are. They live inside a `useEffect`, read browser events, and share variables (`view`, `pan`, `drag`) that nothing outside can reach.

This lesson teaches the way working code without unit tests is changed safely:

1. Make sure the tests you do have pass: they're the safety net.
2. Move the code, changing as little as possible, to where a test can reach it.
3. Write tests that record what the code does **now**, right or wrong: **characterisation tests**.
4. Only then change it: tidy it, and fix what the tests showed up, one change at a time, each under the tests.

## The safety net

**Refactoring** means changing how code is written without changing what it does (lesson 3.4). The only way to know nothing changed is to run tests that check what it does, before and after. Here those are the end-to-end tests, the only ones that touch the pointer code. Run them first:

```powershell
npm run e2e
```

- All 12 must pass before you change anything. If one already failed, a failure after the move couldn't tell you whether the move broke it.
- This is the **safety net**: the tests you lean on while you change code. A refactor without one is guessing.

```check
run "npm run e2e" timeout=180 stdout="12 passed" label="the safety net holds: every end-to-end test passes before the change"
```

## ViewportInput: the listeners, moved

The first change is a move, and only a move. Create `src/editor/viewport-input.ts`:

```ts file=src/editor/viewport-input.ts
import type { Box } from '../engine/box';
import type { Node } from '../engine/node';
import { IDENTITY, type Transform } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import type { EditorStore, Tool } from './store';
import { dragPosition, dragRotation, dragScale, GRID, panBy, pathOf, pick, snapTo, zoomAt } from './viewport';

interface Drag {
  tool: Tool;
  box: Box;
  path: string;
  from: Vec2;
  position: Vec2;
  rotation: number;
  scale: Vec2;
  moved: boolean;
}

export class ViewportInput {
  view: Transform = IDENTITY;
  private pan: Vec2 | null = null;
  private drag: Drag | null = null;

  constructor(
    private readonly store: EditorStore,
    private readonly root: Node,
  ) {}

  down(point: Vec2, button: number): boolean {
    if (this.store.playing) return false;
    if (button !== 0) {
      this.pan = point;
      return true;
    }
    const world = this.view.toLocal(point);
    const hit = pick(this.root, world);
    this.store.select(hit ? pathOf(hit) : null);
    if (!hit) return true;
    this.drag = {
      tool: this.store.tool,
      box: hit,
      path: pathOf(hit),
      from: world,
      position: hit.position,
      rotation: hit.rotation,
      scale: hit.scale,
      moved: false,
    };
    return true;
  }

  move(point: Vec2): void {
    if (this.pan) {
      this.view = panBy(this.view, point.subtract(this.pan));
      this.pan = point;
    }
    const drag = this.drag;
    if (!drag) return;
    const to = this.view.toLocal(point);
    const box = drag.box;
    drag.moved = true;
    if (drag.tool === 'move') {
      const position = dragPosition(drag.position, box.parentTransform, drag.from, to);
      const step = this.store.snap ? GRID : 1;
      box.position = new Vec2(snapTo(position.x, step), snapTo(position.y, step));
    } else if (drag.tool === 'rotate') {
      box.rotation = snapTo(dragRotation(drag.rotation, box.globalPosition, drag.from, to), this.store.snap ? 15 : 1);
    } else {
      const scale = dragScale(drag.scale, box.globalPosition, drag.from, to);
      box.scale = this.store.snap
        ? new Vec2(snapTo(scale.x, 0.25), snapTo(scale.y, 0.25))
        : new Vec2(Math.round(scale.x * 100) / 100, Math.round(scale.y * 100) / 100);
    }
  }

  up(): void {
    this.pan = null;
    if (!this.drag) return;
    const { tool, box, path, moved } = this.drag;
    this.drag = null;
    if (!moved) return;
    if (tool === 'move') this.store.setProp(path, 'position', { x: box.position.x, y: box.position.y });
    else if (tool === 'rotate') this.store.setProp(path, 'rotation', box.rotation);
    else this.store.setProp(path, 'scale', { x: box.scale.x, y: box.scale.y });
  }

  wheel(point: Vec2, deltaY: number): boolean {
    if (this.store.playing) return false;
    this.view = zoomAt(this.view, point, deltaY < 0 ? 1.25 : 0.8);
    return true;
  }
}
```

- `ViewportInput` is a class whose methods are the four listeners' bodies, almost line for line. Compare each method with lesson 5.8's listener of the same name: the code is the same, with three kinds of change, and no others.
- **First change: plain values in, not events.** `down(point: Vec2, button: number)` takes a position and a button number. The listener used to read them from a browser `PointerEvent` (`event.offsetX`, `event.offsetY`, `event.button`). A test can't easily make a real `PointerEvent`, but it can write `new Vec2(410, 230)`.
- **Second change: shared variables become fields.** The listeners shared `let view`, `let pan` and `let drag`, declared in the `useEffect`. Now they're fields of the object, `this.view`, `this.pan` and `this.drag`, so every method sees the same ones, and each `ViewportInput` has its own.
  - `view: Transform = IDENTITY` is public: the game view's drawing reads it, as `update` read the variable before. It starts as `IDENTITY`, the view that changes nothing (lesson 5.6).
  - `pan` and `drag` are `private`: only the class's own methods use them, so the type checker refuses any other code that tries.
  - The drag's type, an object type written inline before, is now a named `interface Drag`, with the same eight fields, so the field's declaration `private drag: Drag | null = null` stays short.
- **Third change: what the listeners read from outside comes through the constructor.** They used `store` and `game.root` from the surrounding function. `constructor(private readonly store: EditorStore, private readonly root: Node)` takes both and keeps them as fields (the shorthand from lesson 4.2): a test can pass in its own store and its own tree of nodes.
- What stays with the browser: `setPointerCapture` and `preventDefault` are things only a real event can do. So `down` and `wheel` return a `boolean`: `true` if they took the event, `false` if they left it alone (while playing). The listener will do the browser's part only when the class says `true`. Before, both listeners returned early while playing, before doing either, and this keeps that exactly.
- Inside `move`, `const drag = this.drag;` copies the field into a local variable once, so the rest of the method reads `drag.box`, as the listener did, instead of `this.drag.box` everywhere. It's the same object: the local name points at it, it doesn't copy it.
- Nothing uses the class yet: the game view still has its own listeners. So the app can't break in this step, and the type checker checks the moved code on its own.

```check
run "npx tsc" label="the moved code type-checks"
```

Why a class and not four exported functions? The four share state (the view, a pan, a drag) between calls: a press starts a drag that a move continues and a release ends. An object holds that state between the calls; free functions would need it passed in and handed back every time. This change has a name, **extract class**: some of a big unit's state and the code that uses it move out together into a class of their own.

The plain-values methods are a **seam**: a place where a test can get at code and drive it without the rest of the program. The browser and React stay on one side; `down`, `move`, `up` and `wheel` are the other. A test only needs to reach the second side.

## A characterisation test

The usual order, test first, can't apply here: the code already exists, and it works. What a test can do is record what it does, so that any later change that alters it fails. That's a **characterisation test**: it describes the code as it *is*, not as someone thinks it should be. It's a test written after the code, and this is the best reason for one: to make a change safe.

Its question is never "is this right?" but "what does it do?". The answer comes from running it.

Create `src/editor/viewport-input.test.ts`:

```ts file=src/editor/viewport-input.test.ts
import { describe, expect, test } from 'vitest';
import { buildNode, ENGINE_MAKERS } from '../engine/build';
import { Node } from '../engine/node';
import type { SceneData } from '../engine/scene';
import { Vec2 } from '../engine/vec2';
import { EditorStore } from './store';
import { ViewportInput } from './viewport-input';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { position: { x: 400, y: 60 }, size: { x: 600, y: 20 } }, children: [] },
        { type: 'Box', name: 'crate', props: { position: { x: 400, y: 225 } }, children: [] },
      ],
    },
  };
}

function editor(): { store: EditorStore; input: ViewportInput } {
  const root = new Node('root');
  function rebuild(data: SceneData): void {
    for (const child of [...root.children]) root.removeChild(child);
    root.addChild(buildNode(data.root, ENGINE_MAKERS));
  }
  const data = scene();
  rebuild(data);
  const store = new EditorStore(data, rebuild);
  return { store, input: new ViewportInput(store, root) };
}

describe('clicking', () => {
  test('a press on a thing selects it; a press on empty space selects nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(400, 60), 0);
    input.up();
    expect(store.selected).toBe('level/wall');
    input.down(new Vec2(100, 400), 0);
    input.up();
    expect(store.selected).toBe(null);
  });
});
```

- `scene()` is a fixture (lesson 2.3): a small level with a wide wall at `(400, 60)` and a 32 by 32 crate at `(400, 225)`, the same places as the app's `scenes/main.json`, so the numbers here match the end-to-end tests'. The crate is a `Box`, not a `Player`, because a player needs keyboard input, which this test doesn't need.
- `editor()` is a second fixture: it builds everything a `ViewportInput` needs, and returns the two things a test talks to.
  - `root` is the engine's tree, like `game.root`: a `Node` with no position, holding the built level.
  - `rebuild(data)` does what `main.tsx`'s `rebuild` does: removes the old level (`[...root.children]` copies the list first, because `removeChild` changes it) and adds one built from the data with `buildNode` and the engine's own makers. A function declared inside `editor` can use `root`, the variable it closes over (a closure, lesson 2.2).
  - It's called once to build the first tree, then passed to `EditorStore` as its check, as `main.tsx` does: every change to the scene rebuilds the tree. So, as in the app, a drag's command changes the data, and the tree is rebuilt from it.
  - Its return type, `{ store: EditorStore; input: ViewportInput }`, is an object type written in place: an object with those two fields, of those types.
  - It returns `{ store, input }`, short for `{ store: store, input: input }`. A test writes `const { store, input } = editor();`, picking both names out of the object (destructuring, lesson 5.5).
- Each test calls `editor()` itself, so each starts from a fresh store and tree: test isolation (lesson 2.3).
- The test is lesson 5.4's end-to-end test of clicking, at unit size. `input.down(new Vec2(400, 60), 0)` is a left-button press (button `0`) on the wall; `input.up()` lets go. Then `store.selected` must be `'level/wall'`. A press on empty space, `(100, 400)`, must leave nothing selected: `null`.
- It runs against the moved code, which was written in Sprint 5 and already works, so this test passes at once. That's expected, and the reason it's worth keeping is lesson 1.4's: from now on, any change that stops a click from selecting fails here, in milliseconds, with a name.

```check
run "npx vitest run src" stdout="129 passed" label="the moved code selects what a press is on"
```

A characterisation test that has never failed hasn't shown it can (lesson 0.7). Break the code on purpose: in `viewport-input.ts`, put `//` before the `this.store.select(…)` line, and run `npx vitest run src`. The test fails, `expected null to be 'level/wall'`. Take the `//` out again.

## Pinning the drag

Now the drag: what a drag records, and what a press without a drag records. These two pin down code that already works, so they're added together, and both should pass at once. Change `src/editor/viewport-input.test.ts`:

```ts file=src/editor/viewport-input.test.ts
import { describe, expect, test } from 'vitest';
import { buildNode, ENGINE_MAKERS } from '../engine/build';
import { Node } from '../engine/node';
import type { SceneData } from '../engine/scene';
import { Vec2 } from '../engine/vec2';
import { EditorStore } from './store';
import { ViewportInput } from './viewport-input';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { position: { x: 400, y: 60 }, size: { x: 600, y: 20 } }, children: [] },
        { type: 'Box', name: 'crate', props: { position: { x: 400, y: 225 } }, children: [] },
      ],
    },
  };
}

function editor(): { store: EditorStore; input: ViewportInput } {
  const root = new Node('root');
  function rebuild(data: SceneData): void {
    for (const child of [...root.children]) root.removeChild(child);
    root.addChild(buildNode(data.root, ENGINE_MAKERS));
  }
  const data = scene();
  rebuild(data);
  const store = new EditorStore(data, rebuild);
  return { store, input: new ViewportInput(store, root) };
}

describe('clicking', () => {
  test('a press on a thing selects it; a press on empty space selects nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(400, 60), 0);
    input.up();
    expect(store.selected).toBe('level/wall');
    input.down(new Vec2(100, 400), 0);
    input.up();
    expect(store.selected).toBe(null);
  });
});

describe('dragging', () => {
  test('a drag moves the thing by as much as the pointer moved, as one command', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(460, 255));
    input.move(new Vec2(510, 305));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 500, y: 300 });']);
  });

  test('a press and let go, without moving, changes nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.up();
    expect(store.history.code).toEqual([]);
  });
});
```

- A `describe('dragging', …)` group starts, for every test about drags (lesson 5.8's way to keep a growing file in order).
- The first test is lesson 5.5's end-to-end drag. A press on the crate at `(410, 230)`, two moves, a release. The pointer moved `(100, 75)` in all, so the crate goes from `(400, 225)` to `(500, 300)`.
  - It checks `store.history.code`, the list of lines of code the history has run (lesson 3.5). One drag must be one line: one command, however many moves came between.
  - Two moves instead of one make sure the second is measured from where the drag *started*, not from the first move: if each move added to the last, the crate would end at `(550, 325)`.
- The second test presses on the crate and lets go without moving. Selecting isn't a change to the scene, so the history must stay empty: `[]`.

```check
run "npx vitest run src" stdout="131 passed" label="a drag is one command; a press alone is none"
```

## A guess that fails

Some behaviour isn't obvious from reading the code, and a characterisation test is how you find it out. The recipe: write the assertion you *guess* is true, run it, and let the failure tell you what really happens.

Here's a question the code doesn't answer at a glance: you drag the crate 40 pixels right, change your mind, and bring it back to exactly where it started before letting go. What does the history hold? The guess: nothing, since nothing changed. Change `src/editor/viewport-input.test.ts`:

```ts file=src/editor/viewport-input.test.ts
import { describe, expect, test } from 'vitest';
import { buildNode, ENGINE_MAKERS } from '../engine/build';
import { Node } from '../engine/node';
import type { SceneData } from '../engine/scene';
import { Vec2 } from '../engine/vec2';
import { EditorStore } from './store';
import { ViewportInput } from './viewport-input';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { position: { x: 400, y: 60 }, size: { x: 600, y: 20 } }, children: [] },
        { type: 'Box', name: 'crate', props: { position: { x: 400, y: 225 } }, children: [] },
      ],
    },
  };
}

function editor(): { store: EditorStore; input: ViewportInput } {
  const root = new Node('root');
  function rebuild(data: SceneData): void {
    for (const child of [...root.children]) root.removeChild(child);
    root.addChild(buildNode(data.root, ENGINE_MAKERS));
  }
  const data = scene();
  rebuild(data);
  const store = new EditorStore(data, rebuild);
  return { store, input: new ViewportInput(store, root) };
}

describe('clicking', () => {
  test('a press on a thing selects it; a press on empty space selects nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(400, 60), 0);
    input.up();
    expect(store.selected).toBe('level/wall');
    input.down(new Vec2(100, 400), 0);
    input.up();
    expect(store.selected).toBe(null);
  });
});

describe('dragging', () => {
  test('a drag moves the thing by as much as the pointer moved, as one command', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(460, 255));
    input.move(new Vec2(510, 305));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 500, y: 300 });']);
  });

  test('a press and let go, without moving, changes nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.up();
    expect(store.history.code).toEqual([]);
  });

  test('a drag that ends where it started changes nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(450, 230));
    input.move(new Vec2(410, 230));
    input.up();
    expect(store.history.code).toEqual([]);
  });
});
```

- The new test is the last in `dragging`. Press at `(410, 230)`, move to `(450, 230)`, back to `(410, 230)`, let go.
- The guess is `toEqual([])`: no command.

```check
run "npx vitest run src" exit=1 stderr="expected [ Array(1) ] to deeply equal []" label="the guess is wrong: the code records something"
```

Run it. It fails:

```text
AssertionError: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "scene.setProp(\"level/crate\", \"position\", { x: 400, y: 225 });",
+ ]
```

- The guess was wrong. The code records a command that sets the crate's position to `(400, 225)`, which is where it already was.
- Why: `move` sets `moved = true` on any move at all, and `up` records a command whenever `moved` is true. It never asks whether the value changed.
- What a user sees: they nudge something and put it back, and the history has a step. Pressing Undo then seems to do nothing. A small bug, but a real one.

## Pin what it does

This is the moment the method matters most. You've found a bug in the middle of a refactor. Don't fix it yet.

- A refactor must not change what the code does: that's the whole meaning of the word. If the fix and the move are made together and something breaks, you can't tell which one did it.
- Kent Beck, who made test-driven development widely known, calls this wearing **two hats**: one for refactoring, one for changing behaviour, and never both at once.
- So the test records what the code does now, and its name says it's pinned on purpose. It changes, deliberately, once the move is done.

Change `src/editor/viewport-input.test.ts`:

```ts file=src/editor/viewport-input.test.ts
import { describe, expect, test } from 'vitest';
import { buildNode, ENGINE_MAKERS } from '../engine/build';
import { Node } from '../engine/node';
import type { SceneData } from '../engine/scene';
import { Vec2 } from '../engine/vec2';
import { EditorStore } from './store';
import { ViewportInput } from './viewport-input';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { position: { x: 400, y: 60 }, size: { x: 600, y: 20 } }, children: [] },
        { type: 'Box', name: 'crate', props: { position: { x: 400, y: 225 } }, children: [] },
      ],
    },
  };
}

function editor(): { store: EditorStore; input: ViewportInput } {
  const root = new Node('root');
  function rebuild(data: SceneData): void {
    for (const child of [...root.children]) root.removeChild(child);
    root.addChild(buildNode(data.root, ENGINE_MAKERS));
  }
  const data = scene();
  rebuild(data);
  const store = new EditorStore(data, rebuild);
  return { store, input: new ViewportInput(store, root) };
}

describe('clicking', () => {
  test('a press on a thing selects it; a press on empty space selects nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(400, 60), 0);
    input.up();
    expect(store.selected).toBe('level/wall');
    input.down(new Vec2(100, 400), 0);
    input.up();
    expect(store.selected).toBe(null);
  });
});

describe('dragging', () => {
  test('a drag moves the thing by as much as the pointer moved, as one command', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(460, 255));
    input.move(new Vec2(510, 305));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 500, y: 300 });']);
  });

  test('a press and let go, without moving, changes nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.up();
    expect(store.history.code).toEqual([]);
  });

  test('a drag that ends where it started still makes a command (pinned as it is, for now)', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(450, 230));
    input.move(new Vec2(410, 230));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 400, y: 225 });']);
  });
});
```

- The test's name now says what happens, and that it's pinned: `'a drag that ends where it started still makes a command (pinned as it is, for now)'`.
- Its expectation is the line the failure printed. Vitest printed it inside double quotes, so it showed each double quote that is part of the text as `\"`. The test writes the string in single quotes, `'scene.setProp("level/crate", …)'`, so the double quotes inside need no `\`.
- It passes: the code is pinned, bug included.

```check
run "npx vitest run src" stdout="132 passed" label="the odd behaviour is pinned, as it is"
```

## Pinning the tools and snapping

Three more drags, each one of Sprint 5's features, each the unit-sized version of an end-to-end test. They pin code that works, so they come together. Change `src/editor/viewport-input.test.ts`:

```ts file=src/editor/viewport-input.test.ts
import { describe, expect, test } from 'vitest';
import { buildNode, ENGINE_MAKERS } from '../engine/build';
import { Node } from '../engine/node';
import type { SceneData } from '../engine/scene';
import { Vec2 } from '../engine/vec2';
import { EditorStore } from './store';
import { ViewportInput } from './viewport-input';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { position: { x: 400, y: 60 }, size: { x: 600, y: 20 } }, children: [] },
        { type: 'Box', name: 'crate', props: { position: { x: 400, y: 225 } }, children: [] },
      ],
    },
  };
}

function editor(): { store: EditorStore; input: ViewportInput } {
  const root = new Node('root');
  function rebuild(data: SceneData): void {
    for (const child of [...root.children]) root.removeChild(child);
    root.addChild(buildNode(data.root, ENGINE_MAKERS));
  }
  const data = scene();
  rebuild(data);
  const store = new EditorStore(data, rebuild);
  return { store, input: new ViewportInput(store, root) };
}

describe('clicking', () => {
  test('a press on a thing selects it; a press on empty space selects nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(400, 60), 0);
    input.up();
    expect(store.selected).toBe('level/wall');
    input.down(new Vec2(100, 400), 0);
    input.up();
    expect(store.selected).toBe(null);
  });
});

describe('dragging', () => {
  test('a drag moves the thing by as much as the pointer moved, as one command', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(460, 255));
    input.move(new Vec2(510, 305));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 500, y: 300 });']);
  });

  test('a press and let go, without moving, changes nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.up();
    expect(store.history.code).toEqual([]);
  });

  test('a drag that ends where it started still makes a command (pinned as it is, for now)', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(450, 230));
    input.move(new Vec2(410, 230));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 400, y: 225 });']);
  });

  test('with snap on, a drag lands on the grid', () => {
    const { store, input } = editor();
    store.setSnap(true);
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(447, 250));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 432, y: 240 });']);
  });

  test('the rotate tool turns by the angle the pointer swept', () => {
    const { store, input } = editor();
    store.setTool('rotate');
    input.down(new Vec2(650, 60), 0);
    input.move(new Vec2(617, 185));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/wall", "rotation", 30);']);
  });

  test('the scale tool stretches by how much farther the pointer is', () => {
    const { store, input } = editor();
    store.setTool('scale');
    input.down(new Vec2(410, 225), 0);
    input.move(new Vec2(420, 225));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "scale", { x: 2, y: 2 });']);
  });
});
```

- **Snapping** (lesson 5.8): `store.setSnap(true)`, then a drag of `(37, 20)`. Unsnapped, the crate would end at `(437, 245)`; on a 16 pixel grid it ends at `(432, 240)`.
- **Rotate** (lesson 5.7): `store.setTool('rotate')`, then a press on the wall at `(650, 60)`, 250 pixels right of its centre, and a move to `(617, 185)`. The angle round the centre goes from 0° to about 29.9°; turns are rounded to whole degrees without snapping, so the command is `30`.
- **Scale** (lesson 5.7): `store.setTool('scale')`, a press 10 pixels right of the crate's centre, a move to 20 pixels right. Twice as far from the centre is twice the size: `{ x: 2, y: 2 }`.
- Each test sets only what it needs (the tool, or snap) on its own fresh store. If the rotate test changed a shared store, the scale test after it would start with the wrong tool, and its result would depend on the order the tests ran in.

```check
run "npx vitest run src" stdout="135 passed" label="snapping and both tools are pinned"
```

## Pinning the view and play mode

Last, the parts that aren't drags: the camera, and what happens while the game is playing. Change `src/editor/viewport-input.test.ts`:

```ts file=src/editor/viewport-input.test.ts
import { describe, expect, test } from 'vitest';
import { buildNode, ENGINE_MAKERS } from '../engine/build';
import { Node } from '../engine/node';
import type { SceneData } from '../engine/scene';
import { IDENTITY } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import { EditorStore } from './store';
import { ViewportInput } from './viewport-input';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { position: { x: 400, y: 60 }, size: { x: 600, y: 20 } }, children: [] },
        { type: 'Box', name: 'crate', props: { position: { x: 400, y: 225 } }, children: [] },
      ],
    },
  };
}

function editor(): { store: EditorStore; input: ViewportInput } {
  const root = new Node('root');
  function rebuild(data: SceneData): void {
    for (const child of [...root.children]) root.removeChild(child);
    root.addChild(buildNode(data.root, ENGINE_MAKERS));
  }
  const data = scene();
  rebuild(data);
  const store = new EditorStore(data, rebuild);
  return { store, input: new ViewportInput(store, root) };
}

describe('clicking', () => {
  test('a press on a thing selects it; a press on empty space selects nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(400, 60), 0);
    input.up();
    expect(store.selected).toBe('level/wall');
    input.down(new Vec2(100, 400), 0);
    input.up();
    expect(store.selected).toBe(null);
  });
});

describe('dragging', () => {
  test('a drag moves the thing by as much as the pointer moved, as one command', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(460, 255));
    input.move(new Vec2(510, 305));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 500, y: 300 });']);
  });

  test('a press and let go, without moving, changes nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.up();
    expect(store.history.code).toEqual([]);
  });

  test('a drag that ends where it started still makes a command (pinned as it is, for now)', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(450, 230));
    input.move(new Vec2(410, 230));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 400, y: 225 });']);
  });

  test('with snap on, a drag lands on the grid', () => {
    const { store, input } = editor();
    store.setSnap(true);
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(447, 250));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 432, y: 240 });']);
  });

  test('the rotate tool turns by the angle the pointer swept', () => {
    const { store, input } = editor();
    store.setTool('rotate');
    input.down(new Vec2(650, 60), 0);
    input.move(new Vec2(617, 185));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/wall", "rotation", 30);']);
  });

  test('the scale tool stretches by how much farther the pointer is', () => {
    const { store, input } = editor();
    store.setTool('scale');
    input.down(new Vec2(410, 225), 0);
    input.move(new Vec2(420, 225));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "scale", { x: 2, y: 2 });']);
  });
});

describe('the view', () => {
  test('the wheel zooms about the pointer, and a press finds what is under it', () => {
    const { store, input } = editor();
    input.wheel(new Vec2(400, 225), -100);
    input.wheel(new Vec2(400, 225), -100);
    expect(input.view.xAxis.length()).toBe(1.5625);
    input.down(new Vec2(380, 225), 0);
    expect(store.selected).toBe('level/crate');
  });

  test('a drag with any other button pans the view, and selects nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(300, 300), 2);
    input.move(new Vec2(400, 300));
    input.up();
    expect(input.view.apply(new Vec2(0, 0))).toEqual(new Vec2(100, 0));
    expect(store.selected).toBe(null);
  });

  test('while playing, presses and the wheel are left alone', () => {
    const { store, input } = editor();
    store.play();
    expect(input.down(new Vec2(400, 60), 0)).toBe(false);
    expect(input.wheel(new Vec2(400, 225), -100)).toBe(false);
    expect(store.selected).toBe(null);
    expect(input.view).toBe(IDENTITY);
  });
});
```

- `IDENTITY` joins the imports, for the last test.
- A new group, `describe('the view', …)`.
- **Zoom** (lesson 5.6): two turns of the wheel towards you (`deltaY` below 0) at `(400, 225)` zoom in by 1.25 each: 1.25 × 1.25 = `1.5625`, the view's scale, which is the length of its x axis. 1.5625 is exactly a binary fraction (25 sixteenths), so `toBe` can check it exactly. Then a press at `(380, 225)`, 20 screen pixels left of the crate's centre: that's 12.8 world pixels at this zoom, inside the crate's half-width of 16, so the crate is selected. That's the end-to-end test's check that picking goes through the view.
- **Pan:** a press with button `2` (the right button), a move of 100 pixels right, a release. The view now draws the world's `(0, 0)` at `(100, 0)`. And a pan isn't a click: nothing gets selected.
- **Play mode:** `store.play()`, then a press and a wheel turn. Both return `false`, the signal the game view uses to leave the event alone. Nothing is selected, and `toBe(IDENTITY)` checks the view is still the very same object it started as: `toBe` checks it's the same object, not just an equal one, so it proves no new view was made.

```check
run "npx vitest run src" stdout="138 passed" label="the camera and play mode are pinned"
```

Ten tests now say what the pointer code does, in a few milliseconds. The safety net is unit-sized.

## The game view, a humble object

Now the game view can use the class, and lose its own copy of the code. Change `src/ui/GameView.tsx`:

```tsx file=src/ui/GameView.tsx
import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { drawGrid, drawSelection, GRID } from '../editor/viewport';
import { ViewportInput } from '../editor/viewport-input';
import { drawTree } from '../engine/draw';
import type { Game } from '../engine/game';
import { IDENTITY } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import type { EditorStore } from '../editor/store';

export function GameView({ store, game, readout }: { store: EditorStore; game: Game; readout: () => string }) {
  const holder = useRef<HTMLDivElement>(null);
  const shown = useRef<HTMLSpanElement>(null);
  const zoomShown = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const input = new ViewportInput(store, game.root);

    class Play extends Phaser.Scene {
      private graphics!: Phaser.GameObjects.Graphics;

      create(): void {
        this.graphics = this.add.graphics();
      }

      override update(_time: number, delta: number): void {
        if (store.playing) game.frame(delta / 1000);
        const view = store.playing ? IDENTITY : input.view;
        this.graphics.clear();
        if (!store.playing && store.snap) drawGrid(this.graphics, view, 800, 450, GRID);
        drawTree(game.root, this.graphics, view);
        drawSelection(game.root, store.selected, this.graphics, view);
        if (shown.current) shown.current.textContent = readout();
        if (zoomShown.current) zoomShown.current.textContent = `${Math.round(view.xAxis.length() * 100)}%`;
      }
    }

    const phaser = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 450,
      parent: holder.current,
      backgroundColor: '#1d2330',
      scene: Play,
    });

    const canvas = phaser.canvas;
    canvas.addEventListener('pointerdown', (event) => {
      if (input.down(new Vec2(event.offsetX, event.offsetY), event.button)) canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => input.move(new Vec2(event.offsetX, event.offsetY)));
    canvas.addEventListener('pointerup', () => input.up());
    canvas.addEventListener(
      'wheel',
      (event) => {
        if (input.wheel(new Vec2(event.offsetX, event.offsetY), event.deltaY)) event.preventDefault();
      },
      { passive: false },
    );

    return () => phaser.destroy(true);
  }, [store, game, readout]);

  return (
    <div>
      <div id="game" ref={holder}></div>
      <p>
        Player x: <span id="player-x" ref={shown}></span> Zoom: <span id="zoom" ref={zoomShown}></span>
      </p>
    </div>
  );
}
```

- The import list shrinks: `dragPosition`, `pick`, `snapTo` and the rest are now used by `ViewportInput`, not here. What's left is for drawing (`drawGrid`, `drawSelection`, `GRID`) and `ViewportInput` itself. `Box` and `Tool` aren't needed here any more either.
- `const input = new ViewportInput(store, game.root);` replaces the three `let` variables. It's made inside the `useEffect`, so each new Phaser game gets its own, starting with the identity view, as the variables did.
- `update` reads `input.view` where it read `view`. The local name `shownView` becomes `view`, since there's no other `view` here now to tell it apart from.
- Each listener is now one line that turns the event into plain values and hands them over:
  - `pointerdown`: `if (input.down(…)) canvas.setPointerCapture(event.pointerId);`, so the pointer is captured exactly when the class took the press, as before.
  - `pointermove` and `pointerup` hand over the position, or nothing.
  - `wheel`: `preventDefault()` only if the class used the wheel, so the page's own scrolling is stopped exactly when it was before.
- The file is 72 lines, from 152. What's left is glue between the browser and the class, with no decisions of its own worth testing. That's a pattern called a **humble object**: when part of a program is hard to test (here: real pointer events, Phaser, React), make that part so thin and simple that there's little in it to get wrong, and move every decision into something easy to test. The end-to-end tests still check the glue.

```check
run "npx tsc"
run "npm run e2e" timeout=180 stdout="12 passed" label="the end-to-end tests still pass: the move changed nothing a user can see"
```

The refactor's promise is kept: the same 12 end-to-end tests pass. The pointer code now has two nets, the unit tests for its decisions, the end-to-end tests for its wiring.

## Refactor: one place for each tool's property

With the class under unit tests, it can be tidied. Look at `up`: three branches, one per tool, each picking a property name and making a value. The fix to come needs the same choice again, for the value before the drag. So that choice gets one place first: "make the change easy, then make the easy change" (lesson 4.2). Change `src/editor/viewport-input.ts`:

```ts file=src/editor/viewport-input.ts
import type { Box } from '../engine/box';
import type { Node } from '../engine/node';
import type { PropValue } from '../engine/scene';
import { IDENTITY, type Transform } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import type { EditorStore, Tool } from './store';
import { dragPosition, dragRotation, dragScale, GRID, panBy, pathOf, pick, snapTo, zoomAt } from './viewport';

interface Drag {
  tool: Tool;
  box: Box;
  path: string;
  from: Vec2;
  position: Vec2;
  rotation: number;
  scale: Vec2;
  moved: boolean;
}

export class ViewportInput {
  view: Transform = IDENTITY;
  private pan: Vec2 | null = null;
  private drag: Drag | null = null;

  constructor(
    private readonly store: EditorStore,
    private readonly root: Node,
  ) {}

  down(point: Vec2, button: number): boolean {
    if (this.store.playing) return false;
    if (button !== 0) {
      this.pan = point;
      return true;
    }
    const world = this.view.toLocal(point);
    const hit = pick(this.root, world);
    this.store.select(hit ? pathOf(hit) : null);
    if (!hit) return true;
    this.drag = {
      tool: this.store.tool,
      box: hit,
      path: pathOf(hit),
      from: world,
      position: hit.position,
      rotation: hit.rotation,
      scale: hit.scale,
      moved: false,
    };
    return true;
  }

  move(point: Vec2): void {
    if (this.pan) {
      this.view = panBy(this.view, point.subtract(this.pan));
      this.pan = point;
    }
    const drag = this.drag;
    if (!drag) return;
    const to = this.view.toLocal(point);
    const box = drag.box;
    drag.moved = true;
    if (drag.tool === 'move') {
      const position = dragPosition(drag.position, box.parentTransform, drag.from, to);
      const step = this.store.snap ? GRID : 1;
      box.position = new Vec2(snapTo(position.x, step), snapTo(position.y, step));
    } else if (drag.tool === 'rotate') {
      box.rotation = snapTo(dragRotation(drag.rotation, box.globalPosition, drag.from, to), this.store.snap ? 15 : 1);
    } else {
      const scale = dragScale(drag.scale, box.globalPosition, drag.from, to);
      box.scale = this.store.snap
        ? new Vec2(snapTo(scale.x, 0.25), snapTo(scale.y, 0.25))
        : new Vec2(Math.round(scale.x * 100) / 100, Math.round(scale.y * 100) / 100);
    }
  }

  up(): void {
    this.pan = null;
    if (!this.drag) return;
    const { tool, box, path, moved } = this.drag;
    this.drag = null;
    if (!moved) return;
    const { key, value } = propOf(tool, box);
    this.store.setProp(path, key, value);
  }

  wheel(point: Vec2, deltaY: number): boolean {
    if (this.store.playing) return false;
    this.view = zoomAt(this.view, point, deltaY < 0 ? 1.25 : 0.8);
    return true;
  }
}

function propOf(tool: Tool, box: Box): { key: string; value: PropValue } {
  if (tool === 'move') return { key: 'position', value: { x: box.position.x, y: box.position.y } };
  if (tool === 'rotate') return { key: 'rotation', value: box.rotation };
  return { key: 'scale', value: { x: box.scale.x, y: box.scale.y } };
}
```

- `propOf(tool, box)` is a function outside the class, at the bottom of the file, not exported: only this file uses it. It returns an object with the property's name, `key`, and its `value` as a `PropValue` (lesson 2.1's type: a number, or `{ x, y }`):
  - for `'move'`, `'position'` and `{ x, y }` copied out of the box's `Vec2`;
  - for `'rotate'`, `'rotation'` and the number;
  - otherwise, `'scale'` and `{ x, y }`.
- `up` now asks `propOf` and makes one `store.setProp` call with whatever it says. The `if`/`else` chain is gone from `up`.
- `PropValue` joins the imports, from `../engine/scene`, as a type.
- The tests didn't change, and all of them pass: that's what says the tidy changed nothing.

```check
run "npx vitest run src" stdout="138 passed" label="the same tests pass after the tidy"
```

## The fix: a test first

The refactor is done, so the hat changes: now the behaviour changes, on purpose, test first. The pinned test becomes the test for the fix. Change `src/editor/viewport-input.test.ts`:

```ts file=src/editor/viewport-input.test.ts
import { describe, expect, test } from 'vitest';
import { buildNode, ENGINE_MAKERS } from '../engine/build';
import { Node } from '../engine/node';
import type { SceneData } from '../engine/scene';
import { IDENTITY } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import { EditorStore } from './store';
import { ViewportInput } from './viewport-input';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { position: { x: 400, y: 60 }, size: { x: 600, y: 20 } }, children: [] },
        { type: 'Box', name: 'crate', props: { position: { x: 400, y: 225 } }, children: [] },
      ],
    },
  };
}

function editor(): { store: EditorStore; input: ViewportInput } {
  const root = new Node('root');
  function rebuild(data: SceneData): void {
    for (const child of [...root.children]) root.removeChild(child);
    root.addChild(buildNode(data.root, ENGINE_MAKERS));
  }
  const data = scene();
  rebuild(data);
  const store = new EditorStore(data, rebuild);
  return { store, input: new ViewportInput(store, root) };
}

describe('clicking', () => {
  test('a press on a thing selects it; a press on empty space selects nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(400, 60), 0);
    input.up();
    expect(store.selected).toBe('level/wall');
    input.down(new Vec2(100, 400), 0);
    input.up();
    expect(store.selected).toBe(null);
  });
});

describe('dragging', () => {
  test('a drag moves the thing by as much as the pointer moved, as one command', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(460, 255));
    input.move(new Vec2(510, 305));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 500, y: 300 });']);
  });

  test('a press and let go, without moving, changes nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.up();
    expect(store.history.code).toEqual([]);
  });

  test('a drag that ends where it started changes nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(450, 230));
    input.move(new Vec2(410, 230));
    input.up();
    expect(store.history.code).toEqual([]);
  });

  test('with snap on, a drag lands on the grid', () => {
    const { store, input } = editor();
    store.setSnap(true);
    input.down(new Vec2(410, 230), 0);
    input.move(new Vec2(447, 250));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "position", { x: 432, y: 240 });']);
  });

  test('the rotate tool turns by the angle the pointer swept', () => {
    const { store, input } = editor();
    store.setTool('rotate');
    input.down(new Vec2(650, 60), 0);
    input.move(new Vec2(617, 185));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/wall", "rotation", 30);']);
  });

  test('the scale tool stretches by how much farther the pointer is', () => {
    const { store, input } = editor();
    store.setTool('scale');
    input.down(new Vec2(410, 225), 0);
    input.move(new Vec2(420, 225));
    input.up();
    expect(store.history.code).toEqual(['scene.setProp("level/crate", "scale", { x: 2, y: 2 });']);
  });
});

describe('the view', () => {
  test('the wheel zooms about the pointer, and a press finds what is under it', () => {
    const { store, input } = editor();
    input.wheel(new Vec2(400, 225), -100);
    input.wheel(new Vec2(400, 225), -100);
    expect(input.view.xAxis.length()).toBe(1.5625);
    input.down(new Vec2(380, 225), 0);
    expect(store.selected).toBe('level/crate');
  });

  test('a drag with any other button pans the view, and selects nothing', () => {
    const { store, input } = editor();
    input.down(new Vec2(300, 300), 2);
    input.move(new Vec2(400, 300));
    input.up();
    expect(input.view.apply(new Vec2(0, 0))).toEqual(new Vec2(100, 0));
    expect(store.selected).toBe(null);
  });

  test('while playing, presses and the wheel are left alone', () => {
    const { store, input } = editor();
    store.play();
    expect(input.down(new Vec2(400, 60), 0)).toBe(false);
    expect(input.wheel(new Vec2(400, 225), -100)).toBe(false);
    expect(store.selected).toBe(null);
    expect(input.view).toBe(IDENTITY);
  });
});
```

- The pinned test's name and its expectation change back to what a user would expect: `'a drag that ends where it started changes nothing'`, with `toEqual([])`.
- It's the same assertion as the guess, two steps after "A guess that fails". The difference is what it now means: then it was a question, now it's a decision. The test is also a **regression test** (lesson 4.2): once the bug is fixed, it keeps it fixed.

```check
run "npx vitest run src" exit=1 stderr="expected [ Array(1) ] to deeply equal []" label="the test fails: the code still records a drag that changed nothing"
```

## The fix

Change `src/editor/viewport-input.ts`:

```ts file=src/editor/viewport-input.ts
import type { Box } from '../engine/box';
import type { Node } from '../engine/node';
import type { PropValue } from '../engine/scene';
import { IDENTITY, type Transform } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import type { EditorStore, Tool } from './store';
import { dragPosition, dragRotation, dragScale, GRID, panBy, pathOf, pick, snapTo, zoomAt } from './viewport';

interface Drag {
  tool: Tool;
  box: Box;
  path: string;
  from: Vec2;
  position: Vec2;
  rotation: number;
  scale: Vec2;
  start: PropValue;
  moved: boolean;
}

export class ViewportInput {
  view: Transform = IDENTITY;
  private pan: Vec2 | null = null;
  private drag: Drag | null = null;

  constructor(
    private readonly store: EditorStore,
    private readonly root: Node,
  ) {}

  down(point: Vec2, button: number): boolean {
    if (this.store.playing) return false;
    if (button !== 0) {
      this.pan = point;
      return true;
    }
    const world = this.view.toLocal(point);
    const hit = pick(this.root, world);
    this.store.select(hit ? pathOf(hit) : null);
    if (!hit) return true;
    this.drag = {
      tool: this.store.tool,
      box: hit,
      path: pathOf(hit),
      from: world,
      position: hit.position,
      rotation: hit.rotation,
      scale: hit.scale,
      start: propOf(this.store.tool, hit).value,
      moved: false,
    };
    return true;
  }

  move(point: Vec2): void {
    if (this.pan) {
      this.view = panBy(this.view, point.subtract(this.pan));
      this.pan = point;
    }
    const drag = this.drag;
    if (!drag) return;
    const to = this.view.toLocal(point);
    const box = drag.box;
    drag.moved = true;
    if (drag.tool === 'move') {
      const position = dragPosition(drag.position, box.parentTransform, drag.from, to);
      const step = this.store.snap ? GRID : 1;
      box.position = new Vec2(snapTo(position.x, step), snapTo(position.y, step));
    } else if (drag.tool === 'rotate') {
      box.rotation = snapTo(dragRotation(drag.rotation, box.globalPosition, drag.from, to), this.store.snap ? 15 : 1);
    } else {
      const scale = dragScale(drag.scale, box.globalPosition, drag.from, to);
      box.scale = this.store.snap
        ? new Vec2(snapTo(scale.x, 0.25), snapTo(scale.y, 0.25))
        : new Vec2(Math.round(scale.x * 100) / 100, Math.round(scale.y * 100) / 100);
    }
  }

  up(): void {
    this.pan = null;
    if (!this.drag) return;
    const { tool, box, path, start, moved } = this.drag;
    this.drag = null;
    if (!moved) return;
    const { key, value } = propOf(tool, box);
    if (JSON.stringify(value) === JSON.stringify(start)) return;
    this.store.setProp(path, key, value);
  }

  wheel(point: Vec2, deltaY: number): boolean {
    if (this.store.playing) return false;
    this.view = zoomAt(this.view, point, deltaY < 0 ? 1.25 : 0.8);
    return true;
  }
}

function propOf(tool: Tool, box: Box): { key: string; value: PropValue } {
  if (tool === 'move') return { key: 'position', value: { x: box.position.x, y: box.position.y } };
  if (tool === 'rotate') return { key: 'rotation', value: box.rotation };
  return { key: 'scale', value: { x: box.scale.x, y: box.scale.y } };
}
```

- `interface Drag` gets a field, `start: PropValue`: the value the dragged property had when the drag began.
- `down` fills it: `start: propOf(this.store.tool, hit).value`, the same function `up` uses, with the same tool. So `start` and the value `up` reads are always the same property, made the same way: a position compared with a position, never with a rotation. This is why `propOf` came first.
- `up` compares before it records: `if (JSON.stringify(value) === JSON.stringify(start)) return;`
  - `JSON.stringify` (lesson 2.1) turns each value into text: `{ x: 400, y: 225 }` becomes `'{"x":400,"y":225}'`, and `30` becomes `'30'`. Two texts are `===` when they have the same characters.
  - Why not `value === start`? For objects, `===` asks whether both sides are the *same object*, not whether they hold the same values. `propOf` makes a new `{ x, y }` object each time it's called, so `value === start` would be `false` for every position and scale, and the bug would stay. Comparing the text compares what's in them.
  - This works because `propOf` always builds `{ x, y }` with `x` first, so equal values always give the same text.
- A drag that changed nothing now returns without a command, whatever path the pointer took.

```check
run "npx vitest run src" stdout="138 passed" label="a drag back to the start makes no command now"
```

## Refactor: moved isn't needed

Green again, so look at the code once more. `moved` was there so a press without a move recorded nothing. Now `up` compares the value with `start`, and a press without a move leaves the value as it was, so the comparison already returns. `moved` does nothing the comparison doesn't. Change `src/editor/viewport-input.ts`:

```ts file=src/editor/viewport-input.ts
import type { Box } from '../engine/box';
import type { Node } from '../engine/node';
import type { PropValue } from '../engine/scene';
import { IDENTITY, type Transform } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import type { EditorStore, Tool } from './store';
import { dragPosition, dragRotation, dragScale, GRID, panBy, pathOf, pick, snapTo, zoomAt } from './viewport';

interface Drag {
  tool: Tool;
  box: Box;
  path: string;
  from: Vec2;
  position: Vec2;
  rotation: number;
  scale: Vec2;
  start: PropValue;
}

export class ViewportInput {
  view: Transform = IDENTITY;
  private pan: Vec2 | null = null;
  private drag: Drag | null = null;

  constructor(
    private readonly store: EditorStore,
    private readonly root: Node,
  ) {}

  down(point: Vec2, button: number): boolean {
    if (this.store.playing) return false;
    if (button !== 0) {
      this.pan = point;
      return true;
    }
    const world = this.view.toLocal(point);
    const hit = pick(this.root, world);
    this.store.select(hit ? pathOf(hit) : null);
    if (!hit) return true;
    this.drag = {
      tool: this.store.tool,
      box: hit,
      path: pathOf(hit),
      from: world,
      position: hit.position,
      rotation: hit.rotation,
      scale: hit.scale,
      start: propOf(this.store.tool, hit).value,
    };
    return true;
  }

  move(point: Vec2): void {
    if (this.pan) {
      this.view = panBy(this.view, point.subtract(this.pan));
      this.pan = point;
    }
    const drag = this.drag;
    if (!drag) return;
    const to = this.view.toLocal(point);
    const box = drag.box;
    if (drag.tool === 'move') {
      const position = dragPosition(drag.position, box.parentTransform, drag.from, to);
      const step = this.store.snap ? GRID : 1;
      box.position = new Vec2(snapTo(position.x, step), snapTo(position.y, step));
    } else if (drag.tool === 'rotate') {
      box.rotation = snapTo(dragRotation(drag.rotation, box.globalPosition, drag.from, to), this.store.snap ? 15 : 1);
    } else {
      const scale = dragScale(drag.scale, box.globalPosition, drag.from, to);
      box.scale = this.store.snap
        ? new Vec2(snapTo(scale.x, 0.25), snapTo(scale.y, 0.25))
        : new Vec2(Math.round(scale.x * 100) / 100, Math.round(scale.y * 100) / 100);
    }
  }

  up(): void {
    this.pan = null;
    if (!this.drag) return;
    const { tool, box, path, start } = this.drag;
    this.drag = null;
    const { key, value } = propOf(tool, box);
    if (JSON.stringify(value) === JSON.stringify(start)) return;
    this.store.setProp(path, key, value);
  }

  wheel(point: Vec2, deltaY: number): boolean {
    if (this.store.playing) return false;
    this.view = zoomAt(this.view, point, deltaY < 0 ? 1.25 : 0.8);
    return true;
  }
}

function propOf(tool: Tool, box: Box): { key: string; value: PropValue } {
  if (tool === 'move') return { key: 'position', value: { x: box.position.x, y: box.position.y } };
  if (tool === 'rotate') return { key: 'rotation', value: box.rotation };
  return { key: 'scale', value: { x: box.scale.x, y: box.scale.y } };
}
```

- `moved: boolean` is gone from `Drag`, `moved: false` from `down`, `drag.moved = true` from `move`, and the `if (!moved) return;` from `up`.
- The test that guards this exact case, `'a press and let go, without moving, changes nothing'`, was written two sections ago, before anyone knew `moved` would go. It still passes, which is the evidence that `moved` wasn't needed. A test suite written while pinning keeps paying for itself like this: it lets you remove code with confidence, not just add it.

```check
run "npx vitest run src" stdout="138 passed" label="the same tests pass without moved"
run "npm run e2e" timeout=180 stdout="12 passed" label="and the app still works end to end"
```

```predict
question: Snap is on. The crate sits at (400, 225), which isn't on the 16 pixel grid. You press on it and let go without moving. Does the history get a command?
choice: Yes: snapping moves it to (400, 224), so the value changed
choice: No: without a move, nothing snaps and the value is what it was
choice: Yes: every press with snap on records the snapped position
answer: No: without a move, nothing snaps and the value is what it was
explain: Snapping happens in move(), on each pointer move. A press and release with no move between never calls it, so the crate's position is still (400, 225), the same as start, and up() returns without a command. If you move it even one pixel, though, move() snaps it to (400, 224), which differs from start, so that drag is recorded.
```

## Commit

```powershell
git add .
git commit -m "Move the pointer code into ViewportInput, pinned by unit tests; a drag back to its start makes no command"
```

```check
git-tracked src/editor/viewport-input.ts
git-tracked src/editor/viewport-input.test.ts
git-clean
```

## Challenge: a drag cancelled with Escape

**Optional, ★★.** In most editors, pressing Escape during a drag puts the thing back where it was and records nothing. Add `cancel()` to `ViewportInput`, test first: a drag of the crate, then `cancel()`, then `up()`, leaves the history empty and the engine's crate at `(400, 225)`. Then, in the game view's `useEffect`, add a `keydown` listener to `window` that calls it when `event.code` is `'Escape'`, and remove that listener in the effect's cleanup.

```hints
nudge: The drag already knows where the box started: drag.position, drag.rotation and drag.scale.
concept: cancel() puts the three values back on drag.box and sets this.drag to null, so the up() that follows finds no drag and records nothing.
shape: cancel(): void { if (!this.drag) return; const { box, position, rotation, scale } = this.drag; box.position = position; box.rotation = rotation; box.scale = scale; this.drag = null; }
```
