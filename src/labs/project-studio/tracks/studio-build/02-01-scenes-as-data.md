---
title: 2.1 — Scenes as Data: JSON and a Data Model
track: Build Your Own Game Studio
runtime: none
concepts: json, serialisation, data-modelling, interfaces
problem: A level should be a file you can open, read, keep in Git and change without touching code. The scene tree lives in memory as objects that point at each other. Why can't it simply be written to a file, and what should the file hold instead?
---

Sprint 2 makes the scene into a file. Turning objects in memory into text (or bytes) that can be stored or sent is called **serialisation**; turning the text back into objects is **deserialisation**. The text format will be **JSON**, the one `package.json` uses: JavaScript has it built in, and people can read it.

- `JSON.stringify(value)` turns a value into JSON text.
- `JSON.parse(text)` turns JSON text back into a value.

Before designing the file, two experiments show what JSON can and can't hold.

## What JSON can't hold: tests

Create `src/engine/scene.test.ts`:

```ts file=src/engine/scene.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';
import { Vec2 } from './vec2';

test('the live tree cannot be written as JSON: parent and child point at each other', () => {
  const car = new Node('car');
  car.addChild(new Node('wheel'));
  expect(() => JSON.stringify(car)).toThrow('circular structure');
});

test('JSON keeps only data: a Vec2 comes back as a plain object, without its methods', () => {
  const text = JSON.stringify(new Vec2(3, 4));
  expect(text).toBe('{"x":3,"y":4}');
  const back = JSON.parse(text);
  expect(back).not.toBeInstanceOf(Vec2);
  expect(back.length).toBe(undefined);
});
```

```predict
question: What does JSON.stringify(car) do, for a car with one wheel?
choice: Writes the car, with the wheel inside its children
choice: Throws an error
choice: Writes the car, and leaves out the wheel's parent
answer: Throws an error
explain: stringify writes the car, then its children, so the wheel, then the wheel's fields, so its parent: the car again, which holds the wheel, whose parent is the car... It would never end. JavaScript notices the loop and throws: Converting circular structure to JSON.
```

- These tests don't test your code. They pin down how JavaScript itself behaves, the facts the next lessons rely on. Tests like these are called **learning tests**: if a future JavaScript changed this behaviour, they'd say so.
- The full error names the loop: *starting at object with constructor 'Node' → property 'children' → index 0 → property 'parent' closes the circle*. The two links that make the tree easy to walk (lesson 1.2) make a loop.
- The second test shows what JSON keeps: only **data**, the fields and their values. `{"x":3,"y":4}` says nothing about `Vec2`. `JSON.parse` gives back a plain object, `{ x: 3, y: 4 }`, with no `length` method: `back.length` is `undefined`.
- JSON has strings, numbers, `true` and `false`, `null`, arrays and objects, and nothing else. No functions, no classes, no `undefined` (a field holding it is left out), and no `NaN` or `Infinity`, which are written as `null`.

Run `npm test`: `34 passed`. The tests pass at once, because they describe JavaScript, not new code.

```check
run "npx vitest run src" stdout="34 passed"
```

## A data model: a test

So a scene file can't be the live tree. It has to be **plain data** describing the tree: for each node, what type it is, its name, its settings, and its children. Nothing points back up, so there are no loops, and nothing is a class, so nothing is lost.

A description of data like this is a **data model**. Add a test that writes a scene as data and sends it through JSON and back:

```ts file=src/engine/scene.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';
import { FORMAT_VERSION, type SceneData } from './scene';
import { Vec2 } from './vec2';

test('the live tree cannot be written as JSON: parent and child point at each other', () => {
  const car = new Node('car');
  car.addChild(new Node('wheel'));
  expect(() => JSON.stringify(car)).toThrow('circular structure');
});

test('JSON keeps only data: a Vec2 comes back as a plain object, without its methods', () => {
  const text = JSON.stringify(new Vec2(3, 4));
  expect(text).toBe('{"x":3,"y":4}');
  const back = JSON.parse(text);
  expect(back).not.toBeInstanceOf(Vec2);
  expect(back.length).toBe(undefined);
});

const level: SceneData = {
  formatVersion: FORMAT_VERSION,
  root: {
    type: 'Node',
    name: 'level',
    props: {},
    children: [
      {
        type: 'Box',
        name: 'car',
        props: { position: { x: 100, y: 50 }, color: 0xff0000 },
        children: [{ type: 'Box', name: 'wheel', props: { position: { x: 10, y: 10 } }, children: [] }],
      },
    ],
  },
};

test('a scene written as data survives the trip through JSON unchanged', () => {
  const text = JSON.stringify(level, null, 2);
  expect(JSON.parse(text)).toEqual(level);
  expect(text).toContain('"name": "wheel"');
});
```

- `const level: SceneData = { … }` writes a whole scene as one nested **object literal**: braces with `key: value` pairs, nested as deep as needed. The `: SceneData` annotation makes `npx tsc` check its shape against the data model.
- Each node is `{ type, name, props, children }`. `type` is the class's name as a string, `'Box'`, because a string can go in a file and a class can't.
- `props` holds the node's settings by name: a position, a colour. A position is written as `{ x, y }`, the plain-object form JSON gives anyway.
- `children` is an array of more nodes in the same shape. The children are *inside* their parent, so the nesting itself says who belongs to whom. No `parent` field is needed.
- `JSON.stringify(level, null, 2)`: the third argument **pretty-prints**, putting each value on its own line, indented by 2 spaces, so people can read the file and Git can show which lines changed. (The second argument, `null`, is for a filter this code doesn't need.)

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './scene'"
```

## The data model

Create `src/engine/scene.ts`:

```ts file=src/engine/scene.ts
export const FORMAT_VERSION = 1;

export interface Vec2Data {
  x: number;
  y: number;
}

export type PropValue = number | Vec2Data;

export interface NodeData {
  type: string;
  name: string;
  props: Record<string, PropValue>;
  children: NodeData[];
}

export interface SceneData {
  formatVersion: number;
  root: NodeData;
}
```

- These are **interfaces**, like `Painter` in lesson 1.8: shapes, with no code. They describe the data; they don't make any. When the program runs they're gone, and a scene is just the plain objects that `JSON.parse` returns.
- `Vec2Data` is the plain-data form of a vector: two numbers, no methods.
- `type PropValue = number | Vec2Data` is a **type alias**: a name for a type, here a union. A property's value is a number (a colour, a speed) or a vector (a position, a size). More kinds will be added when a node needs them.
- `Record<string, PropValue>` is the type of an object used as a lookup table: any string keys, each holding a `PropValue`. `{ position: { x: 100, y: 50 }, color: 0xff0000 }` fits.
- `NodeData` mentions itself in `children: NodeData[]`, as the `Node` class did: a **recursive type**, which is what lets a tree of any depth be described.
- `FORMAT_VERSION = 1` is written into every scene file. When the format changes in a later sprint, it becomes 2, and the studio can tell an old file from a new one and upgrade it instead of misreading it.
- Why not save the classes' own fields directly? Classes hold things that aren't scene data: a `parent` link, an `Input`, values worked out while the game runs. Keeping the data model separate means the file holds exactly what a game maker set, and the classes can change inside without changing the file format.

```check
run "npx vitest run src" stdout="35 passed"
run "npx tsc" label="the scene written as data matches the data model"
```

## Commit

```powershell
git add .
git commit -m "A data model for scenes: NodeData and SceneData, as JSON"
```

```check
git-clean
git-tracked src/engine/scene.ts
```

## Challenge: the shape checker at work

**Optional, ★.** In the test file, give the wheel a `colour` prop holding the string `'red'`, then a node with no `children`, then a `formatVersion` of `'1'`. Run `npx tsc` after each and read what it says. Put each back afterwards. Every one of these would be a broken scene file; the type checker catches them in code you write. A file someone else wrote is a different matter, and lesson 2.4 deals with it.

```hints
nudge: Change one thing at a time, run npx tsc, and read the line it points at.
concept: An annotation like const level: SceneData asks TypeScript to check every nested value against the interfaces, all the way down.
shape: props: { position: { x: 10, y: 10 }, colour: 'red' } — a string is not a PropValue.
```
