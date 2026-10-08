---
title: 3.4 — Undo by Snapshots: One Undo for Every Command
track: Build Your Own Game Studio
runtime: none
concepts: memento, refactoring, atomicity, trade-offs
problem: Every Scene API function needed its own hand-written undo, and one of them was wrong. Is there a way to undo any change at all, including ones nobody has written yet, with no undo code per change?
---

Lesson 3.3's commands each remembered *what they changed*, so they could reverse it. There's another way: remember *what the scene was*.

- Before a change, turn the whole scene into JSON text: a **snapshot**. After the change, take another.
- To undo, put the *before* snapshot back. To redo, put the *after* snapshot back.
- A command no longer needs to know how to reverse itself. Any change, however complicated, is undone the same way.

Saving an object's state so it can be restored later is called the **memento** pattern. It's what UpSkillOS's own Game Studio does.

The trade-off is memory: each step keeps two copies of the whole scene. A scene of a thousand nodes is a few hundred kilobytes of JSON, so a hundred undo steps is a few tens of megabytes. That's affordable on a desktop computer, and it buys undo that can't be wrong in the way lesson 3.3's was.

This lesson is a **refactoring**: changing how code works inside without changing what it does from outside. The tests from lesson 3.3 stay exactly as they are. If they still pass after the change, the new machinery does everything the old one did.

## Rename, and a change that fails half way: tests

Two new tests go at the end of `src/editor/commands.test.ts`. The first four lines of the file change too, to import what they use:

```ts file=src/editor/commands.test.ts
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { deleteNodeCommand, renameNodeCommand, setPropCommand, snapshotCommand } from './commands';
import { History } from './history';
import { findNode, renameNode, setProp } from './scene-api';

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

test('a rename is undone and redone the same way as everything else', () => {
  const data = scene();
  const history = new History();
  history.run(renameNodeCommand(data, 'level/car', 'truck'));
  history.undo();
  expect(findNode(data, 'level/car').name).toBe('car');
  history.redo();
  expect(findNode(data, 'level/truck').name).toBe('truck');
});

test('a change that fails half way leaves the scene as it was, and is not recorded', () => {
  const data = scene();
  const history = new History();
  const twoChanges = snapshotCommand(data, 'Recolour and rename', (s) => {
    setProp(s, 'level/wall', 'color', 1);
    renameNode(s, 'level/car', 'wall');
  });
  expect(() => history.run(twoChanges)).toThrow('"level" already has a child called "wall"');
  expect(findNode(data, 'level/wall').props.color).toBe(9807270);
  expect(history.undo()).toBe(false);
});
```

- The two tests from lesson 3.3 haven't changed a character.
- `snapshotCommand(scene, label, edit)` will make a command from any change: `edit` is a function that changes the scene it's given, using the Scene API. Here it makes two changes, one after the other.
- The second change fails (the car can't be renamed to `wall`), but the first has already happened: the wall is colour `1`. A change made of several steps should happen completely or not at all. That property is called **atomicity**, from the Greek for *uncuttable*. The test demands it: after the error, the wall is still grey.
- `history.undo()` returning `false` shows the failed change wasn't recorded (lesson 3.3's `History.run` records only after `run` succeeds).

```check
run "npx vitest run src" exit=1 stderr="renameNodeCommand is not a function"
```

## Snapshots

Replace `src/editor/commands.ts` with:

```ts file=src/editor/commands.ts
import type { PropValue, SceneData } from '../engine/scene';
import type { Command } from './history';
import { deleteNode, renameNode, setProp } from './scene-api';

export function snapshotCommand(scene: SceneData, label: string, edit: (scene: SceneData) => void): Command {
  let before = '';
  let after = '';
  return {
    label,
    run: () => {
      if (after !== '') {
        scene.root = JSON.parse(after);
        return;
      }
      before = JSON.stringify(scene.root);
      try {
        edit(scene);
      } catch (error) {
        scene.root = JSON.parse(before);
        throw error;
      }
      after = JSON.stringify(scene.root);
    },
    undo: () => {
      scene.root = JSON.parse(before);
    },
  };
}

export function setPropCommand(scene: SceneData, path: string, key: string, value: PropValue): Command {
  return snapshotCommand(scene, `Set ${key} of ${path}`, (s) => setProp(s, path, key, value));
}

export function deleteNodeCommand(scene: SceneData, path: string): Command {
  return snapshotCommand(scene, `Delete ${path}`, (s) => deleteNode(s, path));
}

export function renameNodeCommand(scene: SceneData, path: string, newName: string): Command {
  return snapshotCommand(scene, `Rename ${path} to ${newName}`, (s) => renameNode(s, path, newName));
}
```

- `edit: (scene: SceneData) => void` is a parameter whose type is a **function type** (lesson 2.2): the caller passes in the change to make, as a function.
- `label,` on its own in the object is short for `label: label`: when a property has the same name as the variable holding its value, the name can be written once. This is **shorthand property** syntax.
- The first `run`: snapshot the root as text (`before`), make the change, snapshot again (`after`).
- If `edit` throws, the `catch` puts `before` back, undoing whatever part of the change had happened, then **re-throws** the same error with `throw error`, so the caller still hears why it failed. Nothing is recorded, because `History.run` never gets past `command.run()`. The change is atomic.
- Every later `run` is a redo: `after` is no longer empty, so it restores the after-snapshot and `return`s early. It doesn't run `edit` again. Restoring is guaranteed to give exactly the same scene; running `edit` again might not, if something else had changed.
- `undo` restores the before-snapshot. That's the only undo code in the whole file, and it serves every command.
- `JSON.parse(before)` makes a brand-new tree of objects each time. Undo **replaces** `scene.root` instead of changing the old objects, so nothing can be left half-restored.
- The three named commands are now one line each: a label, and which Scene API function to call. A new API function gets its command the same way, with nothing new to undo.
- `locate` is no longer used here. It stays exported from `scene-api.ts`: other code may use it, and it's still how `deleteNode` works.

```predict
question: After a delete and an undo, does data.root.children[0] hold the same object the wall had before the delete?
choice: Yes: undo puts the wall's object back
choice: No: it's a new object with the same contents, parsed from the snapshot
answer: No: it's a new object with the same contents, parsed from the snapshot
explain: Undo replaces scene.root with JSON.parse(before), a whole new tree. Any code that kept a reference to the old wall object now holds a stale copy that's no longer in the scene. That's why the tests look nodes up with findNode after every change, and why the editor will always read nodes through the scene rather than keeping them.
```

```check
run "npx vitest run src" stdout="70 passed" label="all the tests pass: lesson 3.3's two, unchanged, and the two new ones"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "Undo by snapshots: one undo for every command, and failed changes roll back"
```

```check
git-clean
```

## Challenge: a limit on history

**Optional, ★★.** Each step keeps two copies of the scene. Give `History` a maximum number of steps it keeps, say 200. When a new command would make `done` longer than that, the oldest step is dropped. Test it with a limit of 2 and three commands: only two can be undone.

```hints
nudge: The oldest step is at the start of the array, index 0.
concept: shift() removes and returns the first item of an array, as pop() does the last. Arrays used this way at both ends are queues as well as stacks.
shape: readonly limit: number; constructor(limit = 200) { this.limit = limit; } and, in run, after pushing: if (this.done.length > this.limit) this.done.shift();
```
