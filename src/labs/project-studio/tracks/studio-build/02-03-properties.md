---
title: 2.3 — Properties: From the File onto the Node
track: Build Your Own Game Studio
runtime: none
concepts: object-entries, own-properties, allow-lists, error-messages
problem: The file says the car is at (100, 50) and red. The built Box is at (0, 0) and white. How do a node's settings get from the file onto the object, and what should happen when the file names a setting the node doesn't have?
---

Each node's data has `props`: its settings by name, such as `{ "position": { "x": 100, "y": 50 }, "color": 16711680 }`. (`16711680` is `0xff0000`, red: JSON has no hexadecimal, so a colour in a file is written as an ordinary number.) Building a node must copy each one onto the node's field of the same name, converting where needed: a position in the file is plain `{ x, y }`, and the node needs a real `Vec2` with methods.

Then the harder half: a file is written by people, so sooner or later one says `"colour"` or `"positon"`, or puts a number where a vector should be. Each mistake must stop the load with a message that says *where* and *what*.

## Setting properties: tests

Change `src/engine/build.test.ts`. The car and wheel now have props, there's a new test for them, and the unknown-type error now gives the node's **path**: the names from the root down to it, like `level/car/wheel`. With paths, every error points at one place in the file.

```ts file=src/engine/build.test.ts
import { expect, test } from 'vitest';
import { Box } from './box';
import { buildNode, ENGINE_MAKERS, type Maker } from './build';
import { Node } from './node';
import type { NodeData } from './scene';
import { Vec2 } from './vec2';

const level: NodeData = {
  type: 'Node',
  name: 'level',
  props: {},
  children: [
    {
      type: 'Box',
      name: 'car',
      props: { position: { x: 100, y: 50 }, color: 0xff0000 },
      children: [{ type: 'Box', name: 'wheel', props: { size: { x: 8, y: 8 } }, children: [] }],
    },
  ],
};

test('buildNode makes each node of its type, with its name, in the same tree', () => {
  const root = buildNode(level, ENGINE_MAKERS);
  expect(root).toBeInstanceOf(Node);
  expect(root.name).toBe('level');
  expect(root.get('car')).toBeInstanceOf(Box);
  expect(root.get('car/wheel')).toBeInstanceOf(Box);
  expect(root.get('car/wheel').parent).toBe(root.get('car'));
});

test('a type the engine does not know is an error that gives the path to the node', () => {
  const data: NodeData = {
    type: 'Node',
    name: 'level',
    props: {},
    children: [{ type: 'Boxx', name: 'crate', props: {}, children: [] }],
  };
  expect(() => buildNode(data, ENGINE_MAKERS)).toThrow('level/crate: there is no node type "Boxx"');
});

class Coin extends Box {
  worth: number;

  constructor(name: string, worth: number) {
    super(name);
    this.worth = worth;
  }
}

test("a game adds its own types to a copy of the engine's makers", () => {
  const worth = 5;
  const makers = new Map<string, Maker>(ENGINE_MAKERS);
  makers.set('Coin', (name) => new Coin(name, worth));
  const coin = buildNode({ type: 'Coin', name: 'coin', props: {}, children: [] }, makers);
  expect(coin).toBeInstanceOf(Coin);
  expect((coin as Coin).worth).toBe(5);
  expect(ENGINE_MAKERS.has('Coin')).toBe(false);
});

test('props are set on the node; vectors become real Vec2s', () => {
  const root = buildNode(level, ENGINE_MAKERS);
  const car = root.get('car') as Box;
  expect(car.position).toBeInstanceOf(Vec2);
  expect(car.position).toEqual(new Vec2(100, 50));
  expect(car.color).toBe(0xff0000);
  const wheel = root.get('car/wheel') as Box;
  expect(wheel.size).toEqual(new Vec2(8, 8));
  expect(wheel.color).toBe(0xffffff);
});
```

- The wheel sets only its `size`, so its `color` must still be the `Box` default, white. A file only needs to hold what differs from the defaults.
- `toBeInstanceOf(Vec2)`: a plain `{ x: 100, y: 50 }` would pass `toEqual(new Vec2(100, 50))` (same fields), but it has no `add` or `length`, and the game would crash the first time the car moved.

```check
run "npx vitest run src" exit=1 stderr="expected Vec2{ x: +0, y: +0 } to deeply equal Vec2{ x: 100, y: 50 }" label="props aren't set yet, and the type error has no path yet"
```

## Copying props, and paths

Change `src/engine/build.ts`:

```ts file=src/engine/build.ts
import { Box } from './box';
import { Node } from './node';
import { Node2D } from './node2d';
import type { NodeData, PropValue } from './scene';
import { Vec2 } from './vec2';

export type Maker = (name: string) => Node;

export const ENGINE_MAKERS: ReadonlyMap<string, Maker> = new Map<string, Maker>([
  ['Node', (name) => new Node(name)],
  ['Node2D', (name) => new Node2D(name)],
  ['Box', (name) => new Box(name)],
]);

export function buildNode(data: NodeData, makers: ReadonlyMap<string, Maker>, path = data.name): Node {
  const make = makers.get(data.type);
  if (!make) throw new Error(`${path}: there is no node type "${data.type}"`);
  const node = make(data.name);
  applyProps(node, data.props);
  for (const child of data.children) node.addChild(buildNode(child, makers, `${path}/${child.name}`));
  return node;
}

function applyProps(node: Node, props: Record<string, PropValue>): void {
  const fields = node as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(props)) {
    fields[key] = typeof value === 'number' ? value : new Vec2(value.x, value.y);
  }
}
```

- `path = data.name` is a **default parameter**: when the caller leaves `path` out, as the tests do, it's the node's own name. That's right for the root.
- Each recursive call passes the child's path, the parent's path plus `/` and the child's name. So the root is `level`, its child `level/car`, and the wheel `level/car/wheel`.
- `Object.entries(props)` turns an object into an array of `[key, value]` pairs: `[['position', { x: 100, y: 50 }], ['color', 16711680]]`.
- `for (const [key, value] of …)` loops over the pairs and **destructures** each one: the pair's first item goes into `key`, the second into `value`.
- `node as unknown as Record<string, unknown>` tells TypeScript to treat the node as a table of fields that can be looked up by any string. TypeScript only allows fields it knows by name (`node.position`), and here the name is in a variable. Going through `unknown` is required, because TypeScript won't turn a `Node` into an unrelated type directly. This throws away type checking for the next lines, which is exactly why the next step adds checks of its own.
- `fields[key] = …` sets the field whose name is in `key`. Square brackets with a string do what `.position` does with a fixed name.
- `typeof value` gives the kind of a value as a string: `'number'`, `'string'`, `'boolean'`, `'object'`, `'function'` or `'undefined'`. So `typeof value === 'number'` asks "is it a number?", and TypeScript narrows `value` to `number` when it is.
- `typeof value === 'number' ? value : new Vec2(value.x, value.y)`: a number is copied as it is; anything else is a `Vec2Data`, and becomes a real `Vec2`.

```check
run "npx vitest run src" stdout="39 passed"
run "npx tsc"
```

## Wrong props: tests

Now the mistakes. Add three tests at the end of the file:

```ts file=src/engine/build.test.ts
import { expect, test } from 'vitest';
import { Box } from './box';
import { buildNode, ENGINE_MAKERS, type Maker } from './build';
import { Node } from './node';
import type { NodeData } from './scene';
import { Vec2 } from './vec2';

const level: NodeData = {
  type: 'Node',
  name: 'level',
  props: {},
  children: [
    {
      type: 'Box',
      name: 'car',
      props: { position: { x: 100, y: 50 }, color: 0xff0000 },
      children: [{ type: 'Box', name: 'wheel', props: { size: { x: 8, y: 8 } }, children: [] }],
    },
  ],
};

test('buildNode makes each node of its type, with its name, in the same tree', () => {
  const root = buildNode(level, ENGINE_MAKERS);
  expect(root).toBeInstanceOf(Node);
  expect(root.name).toBe('level');
  expect(root.get('car')).toBeInstanceOf(Box);
  expect(root.get('car/wheel')).toBeInstanceOf(Box);
  expect(root.get('car/wheel').parent).toBe(root.get('car'));
});

test('a type the engine does not know is an error that gives the path to the node', () => {
  const data: NodeData = {
    type: 'Node',
    name: 'level',
    props: {},
    children: [{ type: 'Boxx', name: 'crate', props: {}, children: [] }],
  };
  expect(() => buildNode(data, ENGINE_MAKERS)).toThrow('level/crate: there is no node type "Boxx"');
});

class Coin extends Box {
  worth: number;

  constructor(name: string, worth: number) {
    super(name);
    this.worth = worth;
  }
}

test("a game adds its own types to a copy of the engine's makers", () => {
  const worth = 5;
  const makers = new Map<string, Maker>(ENGINE_MAKERS);
  makers.set('Coin', (name) => new Coin(name, worth));
  const coin = buildNode({ type: 'Coin', name: 'coin', props: {}, children: [] }, makers);
  expect(coin).toBeInstanceOf(Coin);
  expect((coin as Coin).worth).toBe(5);
  expect(ENGINE_MAKERS.has('Coin')).toBe(false);
});

test('props are set on the node; vectors become real Vec2s', () => {
  const root = buildNode(level, ENGINE_MAKERS);
  const car = root.get('car') as Box;
  expect(car.position).toBeInstanceOf(Vec2);
  expect(car.position).toEqual(new Vec2(100, 50));
  expect(car.color).toBe(0xff0000);
  const wheel = root.get('car/wheel') as Box;
  expect(wheel.size).toEqual(new Vec2(8, 8));
  expect(wheel.color).toBe(0xffffff);
});

function box(props: NodeData['props']): NodeData {
  return { type: 'Node', name: 'level', props: {}, children: [{ type: 'Box', name: 'crate', props, children: [] }] };
}

test('a prop the node does not have is an error', () => {
  expect(() => buildNode(box({ colour: 0xff0000 }), ENGINE_MAKERS)).toThrow('level/crate: a Box has no property "colour"');
});

test('only settings can be set: not getters, methods or the tree links', () => {
  expect(() => buildNode(box({ globalPosition: { x: 1, y: 1 } }), ENGINE_MAKERS)).toThrow('a Box has no property "globalPosition"');
  expect(() => buildNode(box({ update: 1 }), ENGINE_MAKERS)).toThrow('a Box has no property "update"');
  expect(() => buildNode(box({ parent: 1 }), ENGINE_MAKERS)).toThrow('a Box has no property "parent"');
});

test('a prop of the wrong kind is an error that says what kind it needs', () => {
  expect(() => buildNode(box({ position: 5 }), ENGINE_MAKERS)).toThrow('level/crate: "position" must be a vector, like {"x": 0, "y": 0}');
  expect(() => buildNode(box({ color: { x: 1, y: 0 } }), ENGINE_MAKERS)).toThrow('level/crate: "color" must be a number');
});
```

- `box(props)` is a helper that builds a level holding one crate with the given props. `NodeData['props']` is an **indexed access type**: the type of the `props` field of `NodeData`, written without repeating it.
- The three mistakes: a prop the node doesn't have (`colour`, British spelling of a field spelt `color`), a name that exists but isn't a setting (`globalPosition` is a getter, `update` a method, `parent` a tree link), and a value of the wrong kind.

```predict
question: With applyProps as it is, what does a "colour" prop do?
choice: Throws: a Box has no colour
choice: Nothing visible: it adds a new field called colour, which nothing reads
choice: Sets color, since the names are so close
answer: Nothing visible: it adds a new field called colour, which nothing reads
explain: fields[key] = value creates the field if it doesn't exist. The crate gets a colour field that no code ever looks at, and stays white. The scene file is wrong and nobody is told: exactly the silent failure this story is about.
```

```check
run "npx vitest run src" exit=1 stderr="a prop the node does not have is an error" label="the new tests fail: wrong props are quietly accepted"
```

## Only real settings

```ts file=src/engine/build.ts
import { Box } from './box';
import { Node } from './node';
import { Node2D } from './node2d';
import type { NodeData, PropValue } from './scene';
import { Vec2 } from './vec2';

export type Maker = (name: string) => Node;

export const ENGINE_MAKERS: ReadonlyMap<string, Maker> = new Map<string, Maker>([
  ['Node', (name) => new Node(name)],
  ['Node2D', (name) => new Node2D(name)],
  ['Box', (name) => new Box(name)],
]);

export function buildNode(data: NodeData, makers: ReadonlyMap<string, Maker>, path = data.name): Node {
  const make = makers.get(data.type);
  if (!make) throw new Error(`${path}: there is no node type "${data.type}"`);
  const node = make(data.name);
  applyProps(node, data, path);
  for (const child of data.children) node.addChild(buildNode(child, makers, `${path}/${child.name}`));
  return node;
}

function applyProps(node: Node, data: NodeData, path: string): void {
  const fields = node as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(data.props)) {
    const current = fields[key];
    const isSetting = Object.hasOwn(node, key) && (current instanceof Vec2 || typeof current === 'number');
    if (!isSetting) throw new Error(`${path}: a ${data.type} has no property "${key}"`);
    if (current instanceof Vec2) {
      if (typeof value !== 'object') throw new Error(`${path}: "${key}" must be a vector, like {"x": 0, "y": 0}`);
      fields[key] = new Vec2(value.x, value.y);
    } else {
      if (typeof value !== 'number') throw new Error(`${path}: "${key}" must be a number`);
      fields[key] = value;
    }
  }
}
```

- The rule: a prop may set a field only if the node already has that field **as its own**, holding a `Vec2` or a number. That's what a setting looks like in this engine: `position`, `size`, `color`, all made by field initialisers like `color = 0xffffff`.
- `Object.hasOwn(node, key)` is true if the field is stored on this object itself. Fields made by initialisers are; methods (`update`) and getters (`globalPosition`) are not. They belong to the class and are shared by every instance, which is why the object finds them without holding its own copy. So `hasOwn` rules out every method and getter in one check. Setting a getter-only property would also throw a confusing error of JavaScript's own: `Cannot set property globalPosition of #<Node2D> which has only a getter`.
- `||` means **or**: true if either side is true. (It's the partner of `&&`, *and*, from lesson 1.3.)
- `current instanceof Vec2 || typeof current === 'number'` rules out the own fields that aren't settings: `name` (a string), `parent` and `children`. The field's current value, the default, says what kind of value it takes.
- A list of what *is* allowed, with everything else refused, is called an **allow list**. It's safer than a list of what's forbidden: a new field that isn't a number or vector can never be set from a file by accident.
- The error says *a Box*, from `data.type`. It doesn't use the class's own name, because `vite build` **minifies** code (lesson 0.5), renaming classes to single letters. A message built from the class name would say *a e* in the finished app.
- `typeof value !== 'object'` narrows `value`: inside the `if` it's a number, a mistake; after it, TypeScript knows it's a `Vec2Data`, so `value.x` type-checks. The `else` branch does the same the other way round.

```check
run "npx vitest run src" stdout="42 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "Props from scene data onto nodes, with an allow list and errors that give the path"
```

```check
git-clean
```

## Challenge: every mistake at once

**Optional, ★★★.** A file with five mistakes takes five loads to fix, because `buildNode` stops at the first. Write `sceneProblems(data, makers): string[]` that returns *every* problem in the tree as a list of messages, in the same words, without throwing. Test it with a scene containing two mistakes in different nodes.

```hints
nudge: Wrap each check in a try/catch, push the message instead of stopping, and keep going.
concept: try { … } catch (error) { … } runs the catch block if anything in try throws. The error's message is error instanceof Error ? error.message : String(error).
shape: Walk the data recursively with the path, as buildNode does; for each node, try make + applyProps on a throwaway node, and collect what's thrown.
```
