---
title: 3.1 — The Scene API: Changing Scene Data
track: Build Your Own Game Studio
runtime: none
concepts: apis, data-vs-objects, paths, mutation
problem: An editor must change scenes: move the wall, recolour the player. Should it change the live nodes or the scene data, and how can one set of functions serve the editor's buttons and a game maker's code alike?
---

Sprint 3 builds the machinery every change in the editor will go through. Before anything can be undone, there have to be changes to undo, made in one controlled way.

**What does the editor change: nodes, or data?** Data. The scene data (lesson 2.1) is what gets saved to the file, so it's the **source of truth**: the one place that says what the scene is. The live nodes are built from it (lesson 2.2) and can be thrown away and rebuilt whenever the data changes. If the editor moved a live node instead, the file would never hear about it, and the change would be lost when the studio closed.

**One way in.** Every change will be made by calling one of a small set of functions: set a property, add a node, delete one, rename one. That set is the studio's **Scene API**. An **API** (application programming interface) is the set of functions one part of a program offers to the rest. Everything else uses the API instead of reaching into the data itself. Later in this sprint, every API call becomes something that can be undone and shown as a line of code. A change made any other way would be invisible to both.

The editor's code goes in a new folder, `src/editor`, next to `src/engine`. The engine runs games; the editor changes their data.

## Finding a node in the data: tests

Every API function starts by finding the node to change, by its path. The data has no `get` method (it's plain data, not `Node` objects), so the API needs a function for it. Create `src/editor/scene-api.test.ts` (make the `editor` folder first):

```ts file=src/editor/scene-api.test.ts
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
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
        { type: 'Box', name: 'car', props: {}, children: [{ type: 'Box', name: 'wheel', props: {}, children: [] }] },
      ],
    },
  };
}

test('findNode finds the data of a node by its path, starting from the root', () => {
  const data = scene();
  expect(findNode(data, 'level')).toBe(data.root);
  expect(findNode(data, 'level/car/wheel').name).toBe('wheel');
});

test('a path that leads nowhere is an error', () => {
  expect(() => findNode(scene(), 'level/truck')).toThrow('There is no node at "level/truck"');
  expect(() => findNode(scene(), 'world/car')).toThrow('There is no node at "world/car"');
});
```

- `scene()` is a helper that returns a **new** scene each time it's called, as Sprint 2's retrospective promised. Every test changes its own copy, so no test can be affected by what another changed.
- Paths start with the root's name, `level/car/wheel`, the same form as the error messages in lesson 2.3. Then a path in an error can be pasted straight into a call.
- `toBe(data.root)`: `findNode` must return the node's data object itself, not a copy. A copy would be useless for changing the scene: the change would land on the copy.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './scene-api'"
```

## findNode

Create `src/editor/scene-api.ts`:

```ts file=src/editor/scene-api.ts
import type { NodeData, SceneData } from '../engine/scene';

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
```

- `'../engine/scene'`: from `src/editor`, `..` is `src`, so this reaches `src/engine/scene.ts`. The editor uses the engine's data model; the engine never imports the editor.
- `const [rootName, ...names] = path.split('/')` **destructures an array**: the first item goes into `rootName`, and `...names` (a **rest element**) collects everything after it into a new array. For `'level/car/wheel'`: `rootName` is `'level'`, `names` is `['car', 'wheel']`. For `'level'`: `names` is `[]`, so the loop doesn't run and the root is returned.
- The first name must be the root's; otherwise the path is wrong from the start.
- The loop is `Node.get`'s from lesson 1.2, walking `children` arrays instead of `Node` objects: find the child with the next name, move down to it, repeat.
- `let node = scene.root`: TypeScript **infers** `node`'s type, `NodeData`, from its starting value.

```check
run "npx vitest run src" stdout="50 passed"
run "npx tsc"
```

## Setting a property: a test

The first change the API makes: set one property of one node. Add a test:

```ts file=src/editor/scene-api.test.ts
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { findNode, setProp } from './scene-api';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { color: 9807270 }, children: [] },
        { type: 'Box', name: 'car', props: {}, children: [{ type: 'Box', name: 'wheel', props: {}, children: [] }] },
      ],
    },
  };
}

test('findNode finds the data of a node by its path, starting from the root', () => {
  const data = scene();
  expect(findNode(data, 'level')).toBe(data.root);
  expect(findNode(data, 'level/car/wheel').name).toBe('wheel');
});

test('a path that leads nowhere is an error', () => {
  expect(() => findNode(scene(), 'level/truck')).toThrow('There is no node at "level/truck"');
  expect(() => findNode(scene(), 'world/car')).toThrow('There is no node at "world/car"');
});

test('setProp changes one property of one node, in the scene data', () => {
  const data = scene();
  setProp(data, 'level/wall', 'color', 16766720);
  setProp(data, 'level/car', 'position', { x: 100, y: 50 });
  expect(findNode(data, 'level/wall').props.color).toBe(16766720);
  expect(findNode(data, 'level/car').props).toEqual({ position: { x: 100, y: 50 } });
  expect(findNode(data, 'level/car/wheel').props).toEqual({});
});
```

- `setProp(data, path, key, value)` changes `data` itself, and returns nothing. The test then looks at the data to see the change.
- Setting a prop the node didn't have yet (`position` on the car) adds it. Before, the car was at the `Box` default.
- The last line checks nothing else changed: the wheel, under the car, still has no props.

```check
run "npx vitest run src" exit=1 stderr="setProp is not a function"
```

## setProp

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
```

- `findNode(scene, path)` returns the node's own data object, so `.props[key] = value` changes the scene itself. Square brackets set a field whose name is in a variable (lesson 2.3).
- Changing data in place like this is called **mutation**. It's simple and fast. The cost: once the old value is overwritten, it's gone. Undo needs it back, which is what lessons 3.3 and 3.4 solve.
- `value: PropValue`: TypeScript accepts only a number or a `{ x, y }` here. `setProp(data, 'level/wall', 'color', 'gold')` is a type error.
- Nothing checks that a `Box` *has* a `color`. `setProp(data, 'level/wall', 'colour', 1)` would put a wrong prop in the data, and `buildNode` would refuse the scene the next time it's built. Lesson 3.4 uses exactly that refusal to reject bad changes.

```check
run "npx vitest run src" stdout="51 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "The Scene API begins: findNode and setProp, on scene data"
```

```check
git-clean
git-tracked src/editor/scene-api.ts
```

## Challenge: getProp

**Optional, ★.** Add `getProp(scene, path, key)` that returns a node's prop value from the data, or `undefined` if the file doesn't set it. Test first. The console in lesson 3.6 could use it to show a value before you change it.

```hints
nudge: It's setProp's mirror: find the node, then read instead of write.
concept: Reading a key that isn't in an object gives undefined, so the return type is PropValue | undefined.
shape: export function getProp(scene: SceneData, path: string, key: string): PropValue | undefined { return findNode(scene, path).props[key]; }
```
