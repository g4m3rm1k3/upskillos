---
title: 2.2 — Building Nodes from Data
track: Build Your Own Game Studio
runtime: none
concepts: factories, functions-as-values, closures, recursion
problem: A scene file says "type": "Box", which is a string. The game needs a real Box object, with its methods, in a real tree. How does a name in a file become an object of the right class, including classes the engine has never heard of, like the game's Player?
---

Lesson 2.1 described a scene as plain data. Now the other direction: data in, live nodes out. Loading a scene means **building** the tree from its description, node by node.

The key problem is the `type`. The file holds the string `'Box'`. Code needs to turn that string into `new Box(…)`. The engine keeps a table from type names to functions that make nodes:

| Type name | Function |
|---|---|
| `'Node'` | `(name) => new Node(name)` |
| `'Node2D'` | `(name) => new Node2D(name)` |
| `'Box'` | `(name) => new Box(name)` |

- A function that makes objects is called a **factory**. In this engine it's called a **maker**.
- Functions are values in JavaScript: they can be stored in a table, passed to other functions and returned from them, like numbers and strings.
- A game adds its own types to a copy of the table (`'Player'`), so the engine can build classes it has never heard of.

## Building a tree: a test

One behaviour at a time. The first is the ordinary one, the **happy path**: good data in, the right tree out. Create `src/engine/build.test.ts`:

```ts file=src/engine/build.test.ts
import { expect, test } from 'vitest';
import { Box } from './box';
import { buildNode, ENGINE_MAKERS } from './build';
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
```

- `level` is the same kind of scene data as in lesson 2.1, without props: building props is the next lesson.
- The test checks the built tree with what earlier lessons made: `get` finds nodes by path (lesson 1.2), and the wheel's `parent` link must be set. Built trees must be real trees, not just objects with the right names.
- `level` is made once, outside the test, and shared. That's safe only because no test changes it: `buildNode` reads its data and makes new nodes. Lesson 2.3 meets data a test does change, and does it differently.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './build'"
```

The first red for a new file is always this one: the test imports a module that doesn't exist yet. It's a fair red, but a weak one: it only proves the file is missing. The next red will be about behaviour.

## Makers, and buildNode

Create `src/engine/build.ts`:

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

export function buildNode(data: NodeData, makers: ReadonlyMap<string, Maker>): Node {
  const make = makers.get(data.type);
  if (!make) throw new Error('There is no such node type');
  const node = make(data.name);
  for (const child of data.children) node.addChild(buildNode(child, makers));
  return node;
}
```

- `type Maker = (name: string) => Node` names a **function type**: any function that takes a string and returns a `Node`. `(name) => new Box(name)` fits, because a `Box` is a `Node`.
- `new Map<string, Maker>([ … ])` makes a Map (lesson 1.6) from a list of `[key, value]` pairs. Each value is an arrow function. TypeScript knows from `Maker` that `name` is a string, so the arrow functions need no annotations.
- `ReadonlyMap` is the Map type without `set`, `delete` or `clear`. Every game in the program shares `ENGINE_MAKERS`, so none of them may change it. A game copies it and changes the copy (next step).
- `makers.get(data.type)` looks up the maker for the type's name, or gives `undefined` if there isn't one.
- `if (!make) throw new Error('There is no such node type');`: there's no test for an unknown type yet, so this line isn't what a test asked for. The type checker asked for it: `makers.get` may give `undefined`, and calling `undefined` as a function would crash, so TypeScript refuses `make(data.name)` until the code says what happens then. The least that satisfies it is a plain error. The next test decides what the error must say.
- Why a Map and not a plain object like `{ Node: …, Box: … }`? Every plain object inherits a few built-in methods, such as `toString`. A scene file with `"type": "toString"` would find that, call it as if it made a node, and crash somewhere confusing. A Map holds only what was put in it. A file is input from outside the program, so the code must never assume it's sensible.
- `make(data.name)` calls the maker: a new node of the right class, with the right name.
- Then, for each child's data, `buildNode` calls *itself* to build the child's whole branch, and adds it under this node with `addChild`, which sets both links (lesson 1.2). The recursion follows the nesting in the data, so the built tree has the same shape as the file's.

```check
run "npx vitest run src" stdout="36 passed"
run "npx tsc"
```

## An unknown type: a test

Now the unhappy path. Someone editing a scene file by hand types `"Boxx"`. Change `src/engine/build.test.ts`:

```ts file=src/engine/build.test.ts
import { expect, test } from 'vitest';
import { Box } from './box';
import { buildNode, ENGINE_MAKERS } from './build';
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

test('a type the engine does not know is an error that names the node', () => {
  const data: NodeData = { type: 'Boxx', name: 'crate', props: {}, children: [] };
  expect(() => buildNode(data, ENGINE_MAKERS)).toThrow('"crate" is a "Boxx", and there is no such node type');
});
```

- `'Boxx'` is a typo, the kind a person makes when editing a scene file by hand. The error must name the node, `"crate"`, so they can find it in a file of hundreds, and say what was wrong with it.
- `buildNode` already throws for this. What the test adds is the **message**: an error that says only "there is no such node type" makes the person search the whole file.

```check
run "npx vitest run src" exit=1 stderr="but got 'There is no such node type'"
```

The test fails on its assertion, and the report shows both messages: the one the test wants (cut short with `…`), and the one the code gives:

```text
AssertionError: expected [Function] to throw error including '"crate" is a "Boxx", and there is no …' but got 'There is no such node type'
```

## An error that names the node

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

export function buildNode(data: NodeData, makers: ReadonlyMap<string, Maker>): Node {
  const make = makers.get(data.type);
  if (!make) throw new Error(`"${data.name}" is a "${data.type}", and there is no such node type`);
  const node = make(data.name);
  for (const child of data.children) node.addChild(buildNode(child, makers));
  return node;
}
```

- Only the message changes. It's a template literal (lesson 0.3) with the node's name and the type it asked for.
- Anything to tidy? `buildNode` is five lines that each do one thing, and the tests read clearly. No.

```check
run "npx vitest run src" stdout="37 passed"
run "npx tsc"
```

## The game's own types: a test

A game has classes the engine doesn't: `Player`, and later enemies and coins. Add a test where a game adds a `Coin` type, whose maker needs a value only the game knows:

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

test('a type the engine does not know is an error that names the node', () => {
  const data: NodeData = { type: 'Boxx', name: 'crate', props: {}, children: [] };
  expect(() => buildNode(data, ENGINE_MAKERS)).toThrow('"crate" is a "Boxx", and there is no such node type');
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

- `new Map<string, Maker>(ENGINE_MAKERS)` makes a new Map holding the same pairs: a copy. `makers.set('Coin', …)` adds to the copy only. The last `expect` checks the engine's own Map wasn't touched.
- `(name) => new Coin(name, worth)`: the arrow function uses `worth`, a variable from the code around it, not one of its parameters. A function keeps access to the variables around where it was written, even when it's called later from somewhere else (inside `buildNode`). A function that carries variables with it like this is a **closure**. It's how a maker can give a node what it needs, such as a `Player` its `Input`, while `buildNode` only ever passes a name.
- `coin as Coin` is a **type assertion**: `buildNode` returns a `Node`, and `worth` is only on `Coin`. `as Coin` tells TypeScript to treat it as one. It checks nothing when the program runs, so use it only when you know, as here, where the line before has just checked `toBeInstanceOf(Coin)`.
- The test's name is in double quotes because it contains an apostrophe: `"a game adds … the engine's makers"`.

```predict
question: Does this new test pass with buildNode as it is?
choice: Yes: buildNode uses whatever Map it's given
choice: No: buildNode only knows the engine's three types
choice: No: Coin's constructor takes two arguments, and buildNode passes one
answer: Yes: buildNode uses whatever Map it's given
explain: buildNode never names a class; it looks the type up in the Map it receives. The Coin maker takes one argument, the name, and supplies worth itself from the closure. The engine was open to new types from the start, without being changed.
```

```check
run "npx vitest run src" stdout="38 passed"
run "npx tsc"
```

- A module that can be **extended** with new kinds of things without being **modified** is said to follow the **open–closed principle**: open for extension, closed for modification. `buildNode` is finished; every type a game adds goes in the Map it's handed.

## Commit

```powershell
git add .
git commit -m "buildNode: live nodes from scene data, with makers games can extend"
```

```check
git-clean
git-tracked src/engine/build.ts
```

## Challenge: names a path can find

**Optional, ★★.** Two siblings with the same name make `get('car')` ambiguous: it finds the first, and the second can't be reached by path at all. Make `buildNode` throw when two children of one node share a name, with a message that names the parent and the repeated name. Test first.

```hints
nudge: Before building the children, look for a name that appears twice among data.children.
concept: A Set of the names seen so far: if a name is already in it, it's a repeat.
shape: const seen = new Set<string>(); for (const child of data.children) { if (seen.has(child.name)) throw new Error(`"${data.name}" has two children called "${child.name}"`); seen.add(child.name); }
```
