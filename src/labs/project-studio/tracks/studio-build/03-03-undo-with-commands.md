---
title: 3.3 — Undo, the Classic Way: Commands and Two Stacks
track: Build Your Own Game Studio
runtime: none
concepts: stacks, command-pattern, interfaces, undo-redo
problem: Ctrl+Z must take back the last change, then the one before, and Ctrl+Shift+Z must bring them back again. What does a program have to remember to undo a change, and what can go wrong?
---

Undo works backwards through what was done: the most recent change first. Redo works forwards through what was undone. The structure for "last in, first out" is a **stack**: like a pile of plates, you put things on top (**push**) and take them off the top (**pop**). Undo and redo need two stacks:

- **done**: every change made, newest on top. Undo pops one, takes it back, and pushes it onto *undone*.
- **undone**: every change taken back, newest on top. Redo pops one, makes it again, and pushes it back onto *done*.
- Making a new change empties *undone*. The changes on it were undone, and then you went a different way; there's no longer a sensible place to redo them.

What goes on the stacks? Each change as an object that knows how to make itself and how to take itself back. This is the **command pattern**: a change is wrapped in a **command** object with a `run` method and an `undo` method, so a history can run and undo changes without knowing what they are.

## The history: tests

Create `src/editor/history.test.ts`:

```ts file=src/editor/history.test.ts
import { expect, test } from 'vitest';
import { History, type Command } from './history';

function logged(log: string[], name: string): Command {
  return {
    label: name,
    run: () => log.push(`run ${name}`),
    undo: () => log.push(`undo ${name}`),
  };
}

test('undo takes back the newest change first; redo makes it again', () => {
  const log: string[] = [];
  const history = new History();
  history.run(logged(log, 'a'));
  history.run(logged(log, 'b'));
  history.undo();
  history.undo();
  history.redo();
  expect(log).toEqual(['run a', 'run b', 'undo b', 'undo a', 'run a']);
});

test('undo and redo with nothing to do report false', () => {
  const history = new History();
  expect(history.undo()).toBe(false);
  expect(history.redo()).toBe(false);
});

test('a new change after an undo throws away what could have been redone', () => {
  const log: string[] = [];
  const history = new History();
  history.run(logged(log, 'a'));
  history.undo();
  history.run(logged(log, 'b'));
  expect(history.redo()).toBe(false);
});
```

- `logged(log, name)` makes a stand-in command, a test double (lesson 1.8), that writes what happens to it into `log`. The history's tests don't care what a command changes, only in what order it's run and undone.
- The command is an object literal with three properties: a `label` (a name for menus: *Undo Move wall*) and two functions.
- Trace the first test: run a, run b (done: a, b). Undo pops b and undoes it (done: a; undone: b). Undo pops a (done: empty; undone: b, a). Redo pops a, the newest undone, and runs it again.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './history'"
```

## Two stacks

Create `src/editor/history.ts`:

```ts file=src/editor/history.ts
export interface Command {
  label: string;
  run(): void;
  undo(): void;
}

export class History {
  private readonly done: Command[] = [];
  private readonly undone: Command[] = [];

  run(command: Command): void {
    command.run();
    this.done.push(command);
    this.undone.length = 0;
  }

  undo(): boolean {
    const command = this.done.pop();
    if (!command) return false;
    command.undo();
    this.undone.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.undone.pop();
    if (!command) return false;
    command.run();
    this.done.push(command);
    return true;
  }
}
```

- `interface Command` is the shape every command has. `run(): void;` inside an interface declares a method: a function property taking nothing and returning nothing.
- An array is a stack when you only use its end: `push` adds to the end (the top), and `pop` removes the last item and returns it, or returns `undefined` if the array is empty.
- `run` makes the change first, then records it. If `command.run()` throws, the next lines never run, so a failed change is never recorded.
- `this.undone.length = 0` empties the array in place: setting an array's `length` to 0 removes every item. (`undone` is `readonly`, so it can't be replaced with a new `[]`, but its contents can change.)
- `undo` and `redo` mirror each other: pop from one stack, act, push onto the other. Each returns whether there was anything to do, so the editor can tell the user *Nothing to undo*.
- `History` never looks inside a command. It works for any change anyone will ever write: open for extension again (lesson 2.2).

```check
run "npx vitest run src" stdout="60 passed"
run "npx tsc"
```

## Commands for the Scene API: tests

Now real commands, for two of the Scene API's functions. Each must remember what it needs to take itself back. Create `src/editor/commands.test.ts`:

```ts file=src/editor/commands.test.ts
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { deleteNodeCommand, setPropCommand } from './commands';
import { History } from './history';
import { findNode } from './scene-api';

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

test('a setProp command can be undone and redone', () => {
  const data = scene();
  const history = new History();
  history.run(setPropCommand(data, 'level/wall', 'color', 16766720));
  history.run(setPropCommand(data, 'level/car', 'position', { x: 1, y: 2 }));
  history.undo();
  expect(findNode(data, 'level/car').props).toStrictEqual({});
  history.undo();
  expect(findNode(data, 'level/wall').props.color).toBe(9807270);
  history.redo();
  expect(findNode(data, 'level/wall').props.color).toBe(16766720);
});

test('undoing a delete puts the node back where it was', () => {
  const data = scene();
  const history = new History();
  history.run(deleteNodeCommand(data, 'level/wall'));
  expect(data.root.children.map((c) => c.name)).toEqual(['car']);
  history.undo();
  expect(data.root.children.map((c) => c.name)).toEqual(['wall', 'car']);
});
```

- The car had no `position` before, so undoing must leave it with *no* `position`, not with `position: undefined`. `toStrictEqual` checks that: unlike `toEqual`, it counts a field holding `undefined` as different from a missing field.
- *Where it was* matters: children are drawn in order (lesson 1.8), so a wall put back at the end would suddenly be drawn on top of the car.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './commands'"
```

## Sharing locate

The delete command needs to know where the node was, its parent and index, which is exactly what `locate` in `scene-api.ts` finds. Export it:

```ts file=src/editor/scene-api.ts
import type { NodeData, PropValue, SceneData } from '../engine/scene';

export function findNode(scene: SceneData, path: string): NodeData {
  const [rootName, ...names] = path.split('/');
  if (rootName !== scene.root.name) throw new Error(`There is no node at "${path}"`);
  let node = scene.root;
  for (const name of names) {
    const child = node.children.find((c) => c.name === name);
    if (!child) throw new Error(`There is no node at "${path}"`);
    node = child;
  }
  return node;
}

export function setProp(scene: SceneData, path: string, key: string, value: PropValue): void {
  findNode(scene, path).props[key] = value;
}

export function addNode(scene: SceneData, parentPath: string, node: NodeData): void {
  const parent = findNode(scene, parentPath);
  if (parent.children.some((c) => c.name === node.name)) {
    throw new Error(`"${parentPath}" already has a child called "${node.name}"`);
  }
  parent.children.push(structuredClone(node));
}

export function deleteNode(scene: SceneData, path: string): void {
  const { parent, index } = locate(scene, path);
  parent.children.splice(index, 1);
}

export function renameNode(scene: SceneData, path: string, newName: string): void {
  if (newName === '' || newName.includes('/')) throw new Error('A name can\'t be empty or contain "/"');
  const node = findNode(scene, path);
  const cut = path.lastIndexOf('/');
  if (cut !== -1) {
    const parentPath = path.slice(0, cut);
    const parent = findNode(scene, parentPath);
    if (parent.children.some((c) => c !== node && c.name === newName)) {
      throw new Error(`"${parentPath}" already has a child called "${newName}"`);
    }
  }
  node.name = newName;
}

export function locate(scene: SceneData, path: string): { parent: NodeData; index: number } {
  const cut = path.lastIndexOf('/');
  if (cut === -1) throw new Error("The root of a scene can't be deleted");
  const parent = findNode(scene, path.slice(0, cut));
  const index = parent.children.findIndex((c) => c.name === path.slice(cut + 1));
  if (index === -1) throw new Error(`There is no node at "${path}"`);
  return { parent, index };
}
```

- The only change is `export` in front of `function locate`. A helper that was private becomes part of the module's API because a second module needs it. Exporting it is better than copying its code into `commands.ts`: two copies of the same logic drift apart.

```check
contains src/editor/scene-api.ts "export function locate("
run "npx tsc" exit=1 stdout="commands" label="tsc still misses commands.ts, which comes next"
```

## Commands, a first attempt

Create `src/editor/commands.ts`:

```ts file=src/editor/commands.ts
import type { NodeData, PropValue, SceneData } from '../engine/scene';
import type { Command } from './history';
import { deleteNode, findNode, locate, setProp } from './scene-api';

export function setPropCommand(scene: SceneData, path: string, key: string, value: PropValue): Command {
  const props = findNode(scene, path).props;
  const old = props[key];
  return {
    label: `Set ${key} of ${path}`,
    run: () => setProp(scene, path, key, value),
    undo: () => {
      if (old === undefined) delete props[key];
      else props[key] = old;
    },
  };
}

export function deleteNodeCommand(scene: SceneData, path: string): Command {
  let removed: NodeData | null = null;
  let parent: NodeData | null = null;
  return {
    label: `Delete ${path}`,
    run: () => {
      const spot = locate(scene, path);
      parent = spot.parent;
      removed = spot.parent.children[spot.index];
      deleteNode(scene, path);
    },
    undo: () => {
      if (parent && removed) parent.children.push(removed);
    },
  };
}
```

- Each function makes a command object, so it's a factory (lesson 2.2). The values the command needs later are kept in **closures** over the function's variables.
- `setPropCommand` reads the old value *when the command is made*, before anything changes, and keeps it in `old`. It keeps `props`, the node's own props object, so undo can change it directly. Undo puts `old` back. If there was no old value (`undefined`), it removes the key with the **`delete` operator**, which takes a property out of an object entirely.
- `deleteNodeCommand` can't know what it removes until it runs, so `run` stores the removed node's data and its parent in `let` variables the closure shares with `undo`. It keeps the removed object itself, not a copy: nothing else refers to it once it's out of the tree.
- Undo pushes the node back onto its parent's children.

```predict
question: Does "undoing a delete puts the node back where it was" pass?
choice: Yes: the wall is back in level's children
choice: No: the wall is back, but after the car
choice: No: removed is null when undo runs
answer: No: the wall is back, but after the car
explain: push adds to the end of the array. The wall was at index 0; now it's at index 1, after the car, so it's drawn on top of the car. Every undo of a delete would quietly change the drawing order.
```

```check
run "npx vitest run src" exit=1 stderr="undoing a delete puts the node back where it was" label="the delete test fails: the wall comes back in the wrong place"
```

## Putting it back where it was

```ts file=src/editor/commands.ts
import type { NodeData, PropValue, SceneData } from '../engine/scene';
import type { Command } from './history';
import { deleteNode, findNode, locate, setProp } from './scene-api';

export function setPropCommand(scene: SceneData, path: string, key: string, value: PropValue): Command {
  const props = findNode(scene, path).props;
  const old = props[key];
  return {
    label: `Set ${key} of ${path}`,
    run: () => setProp(scene, path, key, value),
    undo: () => {
      if (old === undefined) delete props[key];
      else props[key] = old;
    },
  };
}

export function deleteNodeCommand(scene: SceneData, path: string): Command {
  let removed: NodeData | null = null;
  let parent: NodeData | null = null;
  let index = -1;
  return {
    label: `Delete ${path}`,
    run: () => {
      const spot = locate(scene, path);
      parent = spot.parent;
      index = spot.index;
      removed = spot.parent.children[spot.index];
      deleteNode(scene, path);
    },
    undo: () => {
      if (parent && removed) parent.children.splice(index, 0, removed);
    },
  };
}
```

- `run` now also remembers `index`, where the node was.
- `splice(index, 0, removed)` **inserts**: at `index`, remove 0 items, and put `removed` there. The items from `index` on move one place along. The wall goes back to index 0, before the car.

```check
run "npx vitest run src" stdout="62 passed"
run "npx tsc"
```

## What this cost

It works, and this is how many programs do undo. Count what it took:

- Each Scene API function needs a second, matching function that reverses it. There are five API functions so far (`setProp`, `addNode`, `deleteNode`, `renameNode`, and more to come), so five more undo functions.
- Each undo function is a fresh chance for a bug, like the drawing order one. A missed detail only shows up when someone undoes that particular change in that particular way.
- Commands keep references into the data (`props`, `parent`). If another command later replaced one of those objects, the old reference would point at something no longer in the scene, and undo would quietly change nothing.

The next lesson keeps these exact tests and swaps this machinery for a different idea, one with no undo functions at all.

## Commit

```powershell
git add .
git commit -m "History with undo and redo stacks; commands for setProp and deleteNode"
```

```check
git-clean
git-tracked src/editor/history.ts
```

## Challenge: an addNode command

**Optional, ★★.** Write `addNodeCommand(scene, parentPath, node)` and test that undo removes exactly the added node and redo adds it back. Then think: what happens if you add a node, rename it, then undo twice? Does each undo find what it needs?

```hints
nudge: Undoing an add is a delete of the path the node was added at.
concept: Undo-by-command depends on the state being exactly as it was right after the command ran. Undoing in strict reverse order guarantees it: the rename is undone first, so the name is back before the add is undone.
shape: run: () => addNode(scene, parentPath, node), undo: () => deleteNode(scene, `${parentPath}/${node.name}`)
```
