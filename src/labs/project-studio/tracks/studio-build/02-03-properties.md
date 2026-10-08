---
title: 2.3 — Properties: From the File onto the Node
track: Build Your Own Game Studio
runtime: none
concepts: object-entries, own-properties, allow-lists, error-messages
problem: The file says the car is at (100, 50) and red. The built Box is at (0, 0) and white. How do a node's settings get from the file onto the object, and what should happen when the file names a setting the node doesn't have?
---

Each node's data has `props`: its settings by name, such as `{ "position": { "x": 100, "y": 50 }, "color": 16711680 }`. (`16711680` is `0xff0000`, red: JSON has no hexadecimal, so a colour in a file is written as an ordinary number.) Building a node must copy each one onto the node's field of the same name, converting where needed: a position in the file is plain `{ x, y }`, and the node needs a real `Vec2` with methods.

Then the harder half: a file is written by people, so sooner or later one says `"colour"` or `"positon"`, or puts a number where a vector should be. Each mistake must stop the load with a message that says *where* and *what*.

## Paths in errors: a test

First, a change to an error that already exists. A real scene has many nodes called `wheel`; an error that names only the node doesn't say which. Change `src/engine/build.test.ts`: the unknown-type test now puts the bad node inside a level, and wants the error to give its **path**, the names from the root down to it, as `get` uses (lesson 1.2).

```ts file=src/engine/build.test.ts
import { expect, test } from 'vitest';
import { Box } from './box';
import { buildNode, ENGINE_MAKERS, type Maker } from './build';
import { Node } from './node';
import type { NodeData } from './scene';

const level: NodeData = {
  type: 'Node',
  name: 'level',
  props: {},
  children: [
    {
      type: 'Box',
      name: 'car',
      props: {},
      children: [{ type: 'Box', name: 'wheel', props: {}, children: [] }],
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
```

- Only the second test changes: `crate` is now inside `level`, and the message must start `level/crate:`. With paths, every error points at one place in the file.
- The other two tests are lesson 2.2's. A test file grows a test at a time, and every old test still runs every time: that's what stops a new feature breaking an old one.

```check
run "npx vitest run src" exit=1 stderr="but got '\"crate\" is a \"Boxx\""
```

## Paths

Change `src/engine/build.ts`:

```ts file=src/engine/build.ts
import { Box } from './box';
import { Node } from './node';
import { Node2D } from './node2d';
import type { NodeData } from './scene';

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
  for (const child of data.children) node.addChild(buildNode(child, makers, `${path}/${child.name}`));
  return node;
}
```

- `path = data.name` is a **default parameter**: when the caller leaves `path` out, as the tests do, it's the node's own name. That's right for the root.
- Each recursive call passes the child's path, the parent's path plus `/` and the child's name. So the root is `level`, its child `level/car`, and the wheel `level/car/wheel`.
- The error starts with the path, then says what's wrong: `level/crate: there is no node type "Boxx"`.

```check
run "npx vitest run src" stdout="38 passed"
run "npx tsc"
```

## Setting properties: a test

Now the settings. Change `src/engine/build.test.ts`: the car and wheel get props, and a new test checks they arrive.

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

- The car is at `(100, 50)` and red; the wheel sets only its `size`, so its `color` must still be the `Box` default, white. A file only needs to hold what differs from the defaults.
- `toBeInstanceOf(Vec2)`: a plain `{ x: 100, y: 50 }` would pass `toEqual(new Vec2(100, 50))` (same fields), but it has no `add` or `length`, and the game would crash the first time the car moved.
- Adding props to `level` changes what every test that uses it builds. The first test still passes, because building a tree doesn't depend on props; if it didn't, you'd want to know now.

```check
run "npx vitest run src" exit=1 stderr="expected Vec2{ x: +0, y: +0 } to deeply equal Vec2{ x: 100, y: 50 }" label="props aren't set yet"
```

The car is still at `(0, 0)`: nothing copies the props yet.

## Copying props

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

- `applyProps(node, data.props)` is called for each node, after it's made and before its children are built.
- `Object.entries(props)` turns an object into an array of `[key, value]` pairs: `[['position', { x: 100, y: 50 }], ['color', 16711680]]`.
- `for (const [key, value] of …)` loops over the pairs and **destructures** each one: the pair's first item goes into `key`, the second into `value`.
- `node as unknown as Record<string, unknown>` tells TypeScript to treat the node as a table of fields that can be looked up by any string. TypeScript only allows fields it knows by name (`node.position`), and here the name is in a variable. Going through `unknown` is required, because TypeScript won't turn a `Node` into an unrelated type directly. This throws away type checking for the next lines, which is exactly why the next steps add checks of their own.
- `fields[key] = …` sets the field whose name is in `key`. Square brackets with a string do what `.position` does with a fixed name.
- `typeof value` gives the kind of a value as a string: `'number'`, `'string'`, `'boolean'`, `'object'`, `'function'` or `'undefined'`. So `typeof value === 'number'` asks "is it a number?", and TypeScript narrows `value` to `number` when it is.
- `typeof value === 'number' ? value : new Vec2(value.x, value.y)`: a number is copied as it is; anything else is a `Vec2Data`, and becomes a real `Vec2`.
- This is green, and it's also wide open: it copies **any** key onto the node. The next three cycles close it, one kind of mistake at a time.

```check
run "npx vitest run src" stdout="39 passed"
run "npx tsc"
```

## A misspelt prop: a test

A file is written by people, so sooner or later one says `"colour"`. Add a test at the end of `src/engine/build.test.ts`:

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
```

- `box(props)` builds a level holding one crate with the given props. A function that makes the data a test needs is called a **fixture**, or a test data builder: the tests say only what's different about their case (here, the props), and the fixture fills in the rest.
- Why a function, and not one shared object like `level`: `box` makes a **new** object every time it's called, so no test can change data another test uses. Tests that can't affect each other are **isolated**: each passes or fails on its own, in any order. `level` is shared, and that's safe only because no test changes it.
- `NodeData['props']` is an **indexed access type**: the type of the `props` field of `NodeData`, written without repeating it.
- `colour` is the British spelling of a field spelt `color`.

```predict
question: With applyProps as it is, what does a "colour" prop do?
choice: Throws: a Box has no colour
choice: Nothing visible: it adds a new field called colour, which nothing reads
choice: Sets color, since the names are so close
answer: Nothing visible: it adds a new field called colour, which nothing reads
explain: fields[key] = value creates the field if it doesn't exist. The crate gets a colour field that no code ever looks at, and stays white. The scene file is wrong and nobody is told: exactly the silent failure this story is about.
```

```check
run "npx vitest run src" exit=1 stderr="a prop the node does not have is an error" label="the misspelt prop is quietly accepted"
```

## Only fields the node has

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
  applyProps(node, data, path);
  for (const child of data.children) node.addChild(buildNode(child, makers, `${path}/${child.name}`));
  return node;
}

function applyProps(node: Node, data: NodeData, path: string): void {
  const fields = node as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(data.props)) {
    if (!Object.hasOwn(node, key)) throw new Error(`${path}: a ${data.type} has no property "${key}"`);
    fields[key] = typeof value === 'number' ? value : new Vec2(value.x, value.y);
  }
}
```

- `applyProps` now takes the node's whole data and its path, so its errors can say where and what type.
- `Object.hasOwn(node, key)` is true if the field is stored on this object itself. A `Box` has its own `position`, `size` and `color`, made by field initialisers like `color = 0xffffff`; it has no `colour`, so that's refused.
- The error says *a Box*, from `data.type`. It doesn't use the class's own name, because `vite build` **minifies** code (lesson 0.5), renaming classes to single letters. A message built from the class name would say *a e* in the finished app.

```check
run "npx vitest run src" stdout="40 passed"
run "npx tsc"
```

## Names that aren't settings: a table of tests

`hasOwn` catches misspellings. What about real names that aren't settings? `globalPosition` is a getter, `update` a method, `parent` a link in the tree. None of them should be settable from a file. That's one rule with three cases, so instead of three copies of the same test, write the cases as a table. Add to the end of `src/engine/build.test.ts`:

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

test.each(['globalPosition', 'update', 'parent'])('only settings can be set, so "%s" cannot', (key) => {
  expect(() => buildNode(box({ [key]: 1 }), ENGINE_MAKERS)).toThrow(`a Box has no property "${key}"`);
});
```

- `test.each([…])` makes one test for each item in the array. It gives back a function, and the second pair of brackets calls that function with a name and a body, `('…', (key) => { … })`, just as `test` takes them. Each test's body gets its item as the argument, `key`.
- `%s` in the name is replaced by the item, so the report has three separately named tests: `only settings can be set, so "globalPosition" cannot`, and so on. When one fails, the report says exactly which case.
- `{ [key]: 1 }` is an object whose property name is the value of `key`. Square brackets around a name in an object literal make a **computed property name**: `{ [key]: 1 }` with `key` = `'update'` is `{ update: 1 }`.
- A test written as a table is called **table-driven**. Adding a case is adding one item, and every case is checked in the same way, so no case is tested more carelessly than the others.

```check
run "npx vitest run src" exit=1 stderr="only settings can be set, so \"parent\" cannot" label="two of the three cases already pass; parent doesn't"
```

```text
 FAIL  src/engine/build.test.ts > only settings can be set, so "parent" cannot
AssertionError: expected [Function] to throw error including 'a Box has no property "parent"' but got '"crate" already has a parent'
```

- Two cases pass already. A getter and a method belong to the class and are shared by every instance, which is why the object finds them without holding its own copy: `hasOwn` is false, so the last step's check refuses them.
- `parent` is a field each node holds, so `hasOwn` lets it through. The file sets the crate's `parent` to `1`, and then `addChild` (lesson 1.2) sees a parent already there and refuses: `"crate" already has a parent`. It is an error, but a baffling one for someone who only wrote a scene file, about a link they never meant to touch. The test asks for the file's mistake to be reported as the file's mistake.
- One failing case of three is still a red: the rule isn't kept yet.

## Only settings

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
    fields[key] = typeof value === 'number' ? value : new Vec2(value.x, value.y);
  }
}
```

- `current` is the field's value now: its default, such as `new Vec2(0, 0)` or `0xffffff`.
- `||` means **or**: true if either side is true. (It's the partner of `&&`, *and*, from lesson 1.3.)
- `current instanceof Vec2 || typeof current === 'number'` is true only for fields that hold a vector or a number. That rules out the own fields that aren't settings: `name` (a string), `parent` and `children`.
- `isSetting` is both rules together, with `&&`: the node's own field, **and** a vector or a number. That's what a setting looks like in this engine.
- A list of what *is* allowed, with everything else refused, is called an **allow list**. It's safer than a list of what's forbidden: a new field that isn't a number or vector can never be set from a file by accident.

```check
run "npx vitest run src" stdout="43 passed"
run "npx tsc"
```

## The wrong kind of value: a test

Last mistake: the right name, the wrong kind of value, like a number where a position should be. Add to the end of `src/engine/build.test.ts`:

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

test.each(['globalPosition', 'update', 'parent'])('only settings can be set, so "%s" cannot', (key) => {
  expect(() => buildNode(box({ [key]: 1 }), ENGINE_MAKERS)).toThrow(`a Box has no property "${key}"`);
});

test('a prop of the wrong kind is an error that says what kind it needs', () => {
  expect(() => buildNode(box({ position: 5 }), ENGINE_MAKERS)).toThrow('level/crate: "position" must be a vector, like {"x": 0, "y": 0}');
  expect(() => buildNode(box({ color: { x: 1, y: 0 } }), ENGINE_MAKERS)).toThrow('level/crate: "color" must be a number');
});
```

- `position: 5`: a number where a vector belongs. `color: { x: 1, y: 0 }`: a vector where a number belongs. The message must say what kind the setting needs, with an example for a vector.
- These two are different messages, so a table would need a column for each; two plain `expect`s are clearer.

```check
run "npx vitest run src" exit=1 stderr="a prop of the wrong kind is an error that says what kind it needs"
```

## Checking the kind

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

- The field's current value, its default, says what kind of value it takes.
- If it's a `Vec2`, the value must be an object: `typeof value !== 'object'` means it isn't, so it's an error. After the `if`, TypeScript knows `value` is a `Vec2Data`, so `value.x` type-checks. This is **narrowing**: each check tells TypeScript more about the value.
- Otherwise it's a number setting, and the value must be a number.
- Refactor: the line before, `typeof value === 'number' ? value : new Vec2(…)`, guessed the kind from the value. Now the kind comes from the field, and each branch sets the field itself, so the guess has gone. Nothing else needs tidying.

```check
run "npx vitest run src" stdout="44 passed"
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
