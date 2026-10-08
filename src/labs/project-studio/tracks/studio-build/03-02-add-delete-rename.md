---
title: 3.2 — Adding, Deleting and Renaming Nodes
track: Build Your Own Game Studio
runtime: none
concepts: aliasing, structured-clone, string-slicing, invariants
problem: An editor needs more than setting properties: a designer adds a coin, deletes a wall, renames "Box3" to "door". Each change must leave the scene valid, with every path still leading to exactly one node. What can go wrong, and where should the rules live?
---

Three more Scene API functions: `addNode`, `deleteNode` and `renameNode`. Each one changes the *shape* of the tree, so each must protect a rule the rest of the program depends on: **no two children of one node share a name**. If they did, a path like `level/coin` would be ambiguous, and `get`, `findNode` and every error message would point at the wrong node half the time.

A rule that must always be true of the data is called an **invariant**. The Scene API is the only way in, so if every API function keeps the invariant, the data can never break it.

## Adding a node: a test

Add a test to `src/editor/scene-api.test.ts`:

```ts file=src/editor/scene-api.test.ts
import { expect, test } from 'vitest';
import type { NodeData, SceneData } from '../engine/scene';
import { addNode, findNode, setProp } from './scene-api';

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

test('addNode adds a copy of the node under its parent', () => {
  const data = scene();
  const coin: NodeData = { type: 'Box', name: 'coin', props: {}, children: [] };
  addNode(data, 'level', coin);
  expect(findNode(data, 'level/coin')).toEqual(coin);
  coin.name = 'gem';
  expect(findNode(data, 'level/coin').name).toBe('coin');
});
```

- `coin.name = 'gem'` *after* adding is the important line. The test's `coin` variable and the scene must not share one object: if they did, renaming it through the variable would rename the node in the scene without going through the API, and nothing would know.
- Two names for one object (a variable outside, an entry inside the scene) are called **aliases**, and changes through an alias are a classic source of bugs. The second `expect` checks the API made its own copy.

```check
run "npx vitest run src" exit=1 stderr="addNode is not a function"
```

## addNode

Change `src/editor/scene-api.ts`:

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
  findNode(scene, parentPath).children.push(structuredClone(node));
}
```

- `findNode` finds the parent, and `push` adds the node to the end of its `children`.
- `structuredClone(node)` makes a **deep copy**: a new object, with new copies of everything inside it (its `props`, its `children`, their children, all the way down). It's built into browsers and Node. The scene keeps the copy, and the caller's object stays the caller's.
- Why deep? A **shallow** copy, such as `{ ...node }`, makes a new outer object but shares the `props` object and `children` array with the original. Changing `coin.props.color` afterwards would still change the scene.
- `structuredClone` works for plain data like `NodeData`. It can't copy class instances' methods, which is fine: scene data has none (lesson 2.1).

```check
run "npx vitest run src" stdout="57 passed"
run "npx tsc"
```

## Two children with one name: a test

Now the invariant. Add a test to `src/editor/scene-api.test.ts`:

```ts file=src/editor/scene-api.test.ts
import { expect, test } from 'vitest';
import type { NodeData, SceneData } from '../engine/scene';
import { addNode, findNode, setProp } from './scene-api';

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

test('addNode adds a copy of the node under its parent', () => {
  const data = scene();
  const coin: NodeData = { type: 'Box', name: 'coin', props: {}, children: [] };
  addNode(data, 'level', coin);
  expect(findNode(data, 'level/coin')).toEqual(coin);
  coin.name = 'gem';
  expect(findNode(data, 'level/coin').name).toBe('coin');
});

test('a node cannot be added next to a sibling with the same name', () => {
  const data = scene();
  expect(() => addNode(data, 'level', { type: 'Box', name: 'wall', props: {}, children: [] })).toThrow(
    '"level" already has a child called "wall"',
  );
});
```

- `level` already has a child called `wall`, so adding another `wall` must be refused, with a message that names both the parent and the name.

```check
run "npx vitest run src" exit=1 stderr="a node cannot be added next to a sibling with the same name"
```

`addNode` adds the second wall without a word. From then on, `level/wall` means whichever wall `find` meets first.

## Keeping names unique

Change `src/editor/scene-api.ts`:

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
```

- `parent.children.some(…)` asks whether any child already has the new node's name (`some` from lesson 1.6). If one does, the invariant would break, so it throws before changing anything.
- The check comes **before** the change. A function that changes data and then finds it shouldn't have would leave the data broken when it throws.

```check
run "npx vitest run src" stdout="58 passed"
run "npx tsc"
```

## Deleting a node: a test

Add a test to `src/editor/scene-api.test.ts`:

```ts file=src/editor/scene-api.test.ts
import { expect, test } from 'vitest';
import type { NodeData, SceneData } from '../engine/scene';
import { addNode, deleteNode, findNode, setProp } from './scene-api';

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

test('addNode adds a copy of the node under its parent', () => {
  const data = scene();
  const coin: NodeData = { type: 'Box', name: 'coin', props: {}, children: [] };
  addNode(data, 'level', coin);
  expect(findNode(data, 'level/coin')).toEqual(coin);
  coin.name = 'gem';
  expect(findNode(data, 'level/coin').name).toBe('coin');
});

test('a node cannot be added next to a sibling with the same name', () => {
  const data = scene();
  expect(() => addNode(data, 'level', { type: 'Box', name: 'wall', props: {}, children: [] })).toThrow(
    '"level" already has a child called "wall"',
  );
});

test('deleteNode removes a node and everything under it', () => {
  const data = scene();
  deleteNode(data, 'level/car');
  expect(data.root.children.map((c) => c.name)).toEqual(['wall']);
  expect(() => findNode(data, 'level/car/wheel')).toThrow('There is no node at "level/car/wheel"');
});
```

- `data.root.children.map((c) => c.name)` turns the list of child nodes into a list of their names (`map` from lesson 2.4), so the test reads `['wall']`.
- The wheel goes with the car: it's inside the car's `children`, so removing the car from the tree removes its whole branch.

```check
run "npx vitest run src" exit=1 stderr="deleteNode is not a function"
```

## deleteNode

Change `src/editor/scene-api.ts`:

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

function locate(scene: SceneData, path: string): { parent: NodeData; index: number } {
  const cut = path.lastIndexOf('/');
  const parent = findNode(scene, path.slice(0, cut));
  const index = parent.children.findIndex((c) => c.name === path.slice(cut + 1));
  return { parent, index };
}
```

- To remove a node, the code needs its parent (whose `children` array holds it) and its index in that array. The private helper `locate` finds both. It isn't exported: it's a detail of how this module works.
- `path.lastIndexOf('/')` is the position of the last `/` in the string, counting characters from 0, or `-1` if there's none. In `'level/car'` it's 5. A path with no `/` is the root's own name.
- `path.slice(0, cut)` is the part of the string from position 0 up to (not including) `cut`: `'level'`, the parent's path. `path.slice(cut + 1)` is everything after the `/`: `'car'`, the node's own name.
- `findIndex(fn)` is like `find` (lesson 1.2) but returns the matching item's index, or `-1`.
- The return type `{ parent: NodeData; index: number }` is an object type written in place, with no interface name: a function can return two values by returning one object that holds both.
- `const { parent, index } = locate(…)` destructures that object (lesson 2.4) into two variables.
- `splice(index, 1)` removes the node (lesson 1.2), and with it everything inside it.

```check
run "npx vitest run src" stdout="59 passed"
run "npx tsc"
```

## What can't be deleted: a test

Two paths must be refused: the root's, and a path to nothing. Add a test to `src/editor/scene-api.test.ts`:

```ts file=src/editor/scene-api.test.ts
import { expect, test } from 'vitest';
import type { NodeData, SceneData } from '../engine/scene';
import { addNode, deleteNode, findNode, setProp } from './scene-api';

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

test('addNode adds a copy of the node under its parent', () => {
  const data = scene();
  const coin: NodeData = { type: 'Box', name: 'coin', props: {}, children: [] };
  addNode(data, 'level', coin);
  expect(findNode(data, 'level/coin')).toEqual(coin);
  coin.name = 'gem';
  expect(findNode(data, 'level/coin').name).toBe('coin');
});

test('a node cannot be added next to a sibling with the same name', () => {
  const data = scene();
  expect(() => addNode(data, 'level', { type: 'Box', name: 'wall', props: {}, children: [] })).toThrow(
    '"level" already has a child called "wall"',
  );
});

test('deleteNode removes a node and everything under it', () => {
  const data = scene();
  deleteNode(data, 'level/car');
  expect(data.root.children.map((c) => c.name)).toEqual(['wall']);
  expect(() => findNode(data, 'level/car/wheel')).toThrow('There is no node at "level/car/wheel"');
});

test('the root cannot be deleted, and nor can a node that is not there', () => {
  expect(() => deleteNode(scene(), 'level')).toThrow("The root of a scene can't be deleted");
  expect(() => deleteNode(scene(), 'level/truck')).toThrow('There is no node at "level/truck"');
});
```

- A scene always has exactly one root, so deleting the root would leave no scene at all.
- `level/truck` isn't there, so there's nothing to delete. It must be an error, not a quiet nothing: the person asked for something that can't be done, and should be told.

```predict
question: With deleteNode as it is, what does deleteNode(scene, 'level/truck') do?
choice: Throws: there is no node at level/truck
choice: Nothing: there's no truck to remove
choice: Deletes the car
answer: Deletes the car
explain: findIndex finds no truck and gives -1. splice(-1, 1) counts from the end of the array when the index is negative, so it removes the last child, the car. Asking to delete something that isn't there deletes something else, and says nothing. Bugs like this are why the edges get tests.
```

```check
run "npx vitest run src" exit=1 stderr="the root cannot be deleted, and nor can a node that is not there"
```

## Refusing the root, and nothing

Change `src/editor/scene-api.ts`:

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

function locate(scene: SceneData, path: string): { parent: NodeData; index: number } {
  const cut = path.lastIndexOf('/');
  if (cut === -1) throw new Error("The root of a scene can't be deleted");
  const parent = findNode(scene, path.slice(0, cut));
  const index = parent.children.findIndex((c) => c.name === path.slice(cut + 1));
  if (index === -1) throw new Error(`There is no node at "${path}"`);
  return { parent, index };
}
```

- `if (cut === -1) throw …`: a path with no `/` is the root's. Before, `path.slice(0, -1)` cut the last letter off its name, and `findNode` looked for a node called `leve`.
- `if (index === -1) throw …`: no child with that name. Now `splice` is only ever given a real index.

```check
run "npx vitest run src" stdout="60 passed"
run "npx tsc"
```

## Renaming a node: a test

Add a test to `src/editor/scene-api.test.ts`:

```ts file=src/editor/scene-api.test.ts
import { expect, test } from 'vitest';
import type { NodeData, SceneData } from '../engine/scene';
import { addNode, deleteNode, findNode, renameNode, setProp } from './scene-api';

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

test('addNode adds a copy of the node under its parent', () => {
  const data = scene();
  const coin: NodeData = { type: 'Box', name: 'coin', props: {}, children: [] };
  addNode(data, 'level', coin);
  expect(findNode(data, 'level/coin')).toEqual(coin);
  coin.name = 'gem';
  expect(findNode(data, 'level/coin').name).toBe('coin');
});

test('a node cannot be added next to a sibling with the same name', () => {
  const data = scene();
  expect(() => addNode(data, 'level', { type: 'Box', name: 'wall', props: {}, children: [] })).toThrow(
    '"level" already has a child called "wall"',
  );
});

test('deleteNode removes a node and everything under it', () => {
  const data = scene();
  deleteNode(data, 'level/car');
  expect(data.root.children.map((c) => c.name)).toEqual(['wall']);
  expect(() => findNode(data, 'level/car/wheel')).toThrow('There is no node at "level/car/wheel"');
});

test('the root cannot be deleted, and nor can a node that is not there', () => {
  expect(() => deleteNode(scene(), 'level')).toThrow("The root of a scene can't be deleted");
  expect(() => deleteNode(scene(), 'level/truck')).toThrow('There is no node at "level/truck"');
});

test('renameNode changes the name, and so the path to the node and everything under it', () => {
  const data = scene();
  renameNode(data, 'level/car', 'truck');
  expect(findNode(data, 'level/truck/wheel').name).toBe('wheel');
  expect(() => findNode(data, 'level/car')).toThrow('There is no node at "level/car"');
});
```

- Renaming the car changes the path of everything under it: `level/car/wheel` becomes `level/truck/wheel`. Nothing else needs changing, because paths are worked out from names; they aren't stored.

```check
run "npx vitest run src" exit=1 stderr="renameNode is not a function"
```

## renameNode

Change `src/editor/scene-api.ts`:

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
  findNode(scene, path).name = newName;
}

function locate(scene: SceneData, path: string): { parent: NodeData; index: number } {
  const cut = path.lastIndexOf('/');
  if (cut === -1) throw new Error("The root of a scene can't be deleted");
  const parent = findNode(scene, path.slice(0, cut));
  const index = parent.children.findIndex((c) => c.name === path.slice(cut + 1));
  if (index === -1) throw new Error(`There is no node at "${path}"`);
  return { parent, index };
}
```

- One line: find the node, change its `name`.

```check
run "npx vitest run src" stdout="61 passed"
run "npx tsc"
```

## Names a path can't use: a test

Add a test to `src/editor/scene-api.test.ts`:

```ts file=src/editor/scene-api.test.ts
import { expect, test } from 'vitest';
import type { NodeData, SceneData } from '../engine/scene';
import { addNode, deleteNode, findNode, renameNode, setProp } from './scene-api';

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

test('addNode adds a copy of the node under its parent', () => {
  const data = scene();
  const coin: NodeData = { type: 'Box', name: 'coin', props: {}, children: [] };
  addNode(data, 'level', coin);
  expect(findNode(data, 'level/coin')).toEqual(coin);
  coin.name = 'gem';
  expect(findNode(data, 'level/coin').name).toBe('coin');
});

test('a node cannot be added next to a sibling with the same name', () => {
  const data = scene();
  expect(() => addNode(data, 'level', { type: 'Box', name: 'wall', props: {}, children: [] })).toThrow(
    '"level" already has a child called "wall"',
  );
});

test('deleteNode removes a node and everything under it', () => {
  const data = scene();
  deleteNode(data, 'level/car');
  expect(data.root.children.map((c) => c.name)).toEqual(['wall']);
  expect(() => findNode(data, 'level/car/wheel')).toThrow('There is no node at "level/car/wheel"');
});

test('the root cannot be deleted, and nor can a node that is not there', () => {
  expect(() => deleteNode(scene(), 'level')).toThrow("The root of a scene can't be deleted");
  expect(() => deleteNode(scene(), 'level/truck')).toThrow('There is no node at "level/truck"');
});

test('renameNode changes the name, and so the path to the node and everything under it', () => {
  const data = scene();
  renameNode(data, 'level/car', 'truck');
  expect(findNode(data, 'level/truck/wheel').name).toBe('wheel');
  expect(() => findNode(data, 'level/car')).toThrow('There is no node at "level/car"');
});

test('a new name must be usable in a path', () => {
  expect(() => renameNode(scene(), 'level/car', 'big/car')).toThrow('A name can\'t be empty or contain "/"');
  expect(() => renameNode(scene(), 'level/car', '')).toThrow('A name can\'t be empty or contain "/"');
});
```

- A name with `/` in it would look like two names in a path, and an empty name would make a path like `level//wheel`.
- `'A name can\'t …'`: inside single quotes, `\'` is a single quote that's part of the text. The `\` (**escape**) says the next character doesn't end the string.

```check
run "npx vitest run src" exit=1 stderr="a new name must be usable in a path"
```

## Checking the name

Change `src/editor/scene-api.ts`:

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
  findNode(scene, path).name = newName;
}

function locate(scene: SceneData, path: string): { parent: NodeData; index: number } {
  const cut = path.lastIndexOf('/');
  if (cut === -1) throw new Error("The root of a scene can't be deleted");
  const parent = findNode(scene, path.slice(0, cut));
  const index = parent.children.findIndex((c) => c.name === path.slice(cut + 1));
  if (index === -1) throw new Error(`There is no node at "${path}"`);
  return { parent, index };
}
```

- `newName.includes('/')` is `true` if the text contains `/` anywhere. With `||`, either problem refuses the name.
- The check is the first line: it needs nothing but the name, so it's the cheapest, and it runs before anything changes.

```check
run "npx vitest run src" stdout="62 passed"
run "npx tsc"
```

## A sibling's name: a test

The invariant again, for renaming. Add a test to `src/editor/scene-api.test.ts`:

```ts file=src/editor/scene-api.test.ts
import { expect, test } from 'vitest';
import type { NodeData, SceneData } from '../engine/scene';
import { addNode, deleteNode, findNode, renameNode, setProp } from './scene-api';

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

test('addNode adds a copy of the node under its parent', () => {
  const data = scene();
  const coin: NodeData = { type: 'Box', name: 'coin', props: {}, children: [] };
  addNode(data, 'level', coin);
  expect(findNode(data, 'level/coin')).toEqual(coin);
  coin.name = 'gem';
  expect(findNode(data, 'level/coin').name).toBe('coin');
});

test('a node cannot be added next to a sibling with the same name', () => {
  const data = scene();
  expect(() => addNode(data, 'level', { type: 'Box', name: 'wall', props: {}, children: [] })).toThrow(
    '"level" already has a child called "wall"',
  );
});

test('deleteNode removes a node and everything under it', () => {
  const data = scene();
  deleteNode(data, 'level/car');
  expect(data.root.children.map((c) => c.name)).toEqual(['wall']);
  expect(() => findNode(data, 'level/car/wheel')).toThrow('There is no node at "level/car/wheel"');
});

test('the root cannot be deleted, and nor can a node that is not there', () => {
  expect(() => deleteNode(scene(), 'level')).toThrow("The root of a scene can't be deleted");
  expect(() => deleteNode(scene(), 'level/truck')).toThrow('There is no node at "level/truck"');
});

test('renameNode changes the name, and so the path to the node and everything under it', () => {
  const data = scene();
  renameNode(data, 'level/car', 'truck');
  expect(findNode(data, 'level/truck/wheel').name).toBe('wheel');
  expect(() => findNode(data, 'level/car')).toThrow('There is no node at "level/car"');
});

test('a new name must be usable in a path', () => {
  expect(() => renameNode(scene(), 'level/car', 'big/car')).toThrow('A name can\'t be empty or contain "/"');
  expect(() => renameNode(scene(), 'level/car', '')).toThrow('A name can\'t be empty or contain "/"');
});

test('a new name must not be taken by a sibling, though a node may keep its own', () => {
  expect(() => renameNode(scene(), 'level/car', 'wall')).toThrow('"level" already has a child called "wall"');
  const data = scene();
  renameNode(data, 'level/car', 'car');
  expect(findNode(data, 'level/car/wheel').name).toBe('wheel');
});
```

- Renaming the car to `wall` must be refused: `level` already has a `wall`.
- Renaming the car to `car`, its own name, must be allowed. It's an edge case that's easy to get wrong: a check that looks for any child called `car` finds the car itself.

```check
run "npx vitest run src" exit=1 stderr="a new name must not be taken by a sibling, though a node may keep its own"
```

## Checking the siblings

Change `src/editor/scene-api.ts`:

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


function locate(scene: SceneData, path: string): { parent: NodeData; index: number } {
  const cut = path.lastIndexOf('/');
  if (cut === -1) throw new Error("The root of a scene can't be deleted");
  const parent = findNode(scene, path.slice(0, cut));
  const index = parent.children.findIndex((c) => c.name === path.slice(cut + 1));
  if (index === -1) throw new Error(`There is no node at "${path}"`);
  return { parent, index };
}
```

- The checks run before anything changes, in order of cheapness: the name itself, then whether the node exists (`findNode` throws if not), then the siblings.
- `path.lastIndexOf('/')` and `path.slice(0, cut)` find the parent's path, as in `locate`.
- The root has no parent and so no siblings (`cut` is `-1`), so it can be renamed to any valid name.
- `c !== node && c.name === newName`: a sibling clashes if it's a *different* node with the new name. Without `c !== node`, renaming the car to `car` would find the car itself and wrongly refuse: the second half of the test.
- `node.name = newName` changes the one field, last, once every check has passed. If any check throws, the scene is exactly as it was.
- Refactor? `renameNode` and `locate` both work out a parent's path from a node's. Two lines, twice: not yet worth a function. If a third place needs it, it will be.

```check
run "npx vitest run src" stdout="63 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "Scene API: addNode, deleteNode and renameNode, keeping sibling names unique"
```

```check
git-clean
```

## Challenge: moving a node

**Optional, ★★★.** Add `moveNode(scene, path, newParentPath)` that takes a node (and its branch) from one parent to another, keeping the invariant. Then find the change that must be refused, apart from a name clash: what happens if you move `level/car` into `level/car/wheel`? Test both.

```hints
nudge: Moving is locate + splice from the old parent, then push onto the new one, but only after every check has passed.
concept: A node moved inside its own branch would be its own ancestor: a loop, which isn't a tree (lesson 1.2's challenge). In path terms, the new parent's path starts with the node's path followed by "/".
shape: if (newParentPath === path || newParentPath.startsWith(path + '/')) throw new Error(`"${path}" can't be moved inside itself`);
```
