---
title: 2.4 — Checking a Scene File Before Trusting It
track: Build Your Own Game Studio
runtime: none
concepts: unknown, type-guards, validation, error-handling
problem: TypeScript checks the scenes you write in code. A scene file is just text, written by a person or by another program, and JSON.parse turns it into whatever it says. How does the studio make sure a file really has the shape of a scene before any code relies on it?
---

`JSON.parse` returns whatever the text describes: an object, a number, a list, anything. TypeScript can't know what's in a file the program hasn't read yet, so it gives `JSON.parse`'s result the type `any`, which means "don't check this at all". Code that trusts it can fail far from the real problem:

- A file with `"children": 5` passes straight into `buildNode`, which tries `for (const child of 5)` and throws *data.children is not iterable*, a message that names neither the file nor the node.
- A file saved by a future version of the studio might mean something different by the same fields.

The rule for anything from outside the program (files, the network, what a user types): **check it at the border**, once, as it comes in. After the check, the rest of the code can trust its types. Checking the shape of incoming data is called **validation**.

## Parsing a file: tests

Create `src/engine/parse.test.ts`:

```ts file=src/engine/parse.test.ts
import { expect, test } from 'vitest';
import { parseScene } from './parse';

const good = `{
  "formatVersion": 1,
  "root": {
    "type": "Node",
    "name": "level",
    "props": {},
    "children": [
      { "type": "Box", "name": "car", "props": { "position": { "x": 100, "y": 50 } }, "children": [] }
    ]
  }
}`;

test('a good scene file becomes scene data', () => {
  const scene = parseScene(good);
  expect(scene.root.name).toBe('level');
  expect(scene.root.children[0].props.position).toEqual({ x: 100, y: 50 });
});

test('text that is not JSON is an error that says so', () => {
  expect(() => parseScene('{ "formatVersion": 1, }')).toThrow('This is not valid JSON');
});

test('a file from another version of the format is refused', () => {
  expect(() => parseScene('{ "formatVersion": 2, "root": {} }')).toThrow('This scene is format version 2; this studio reads version 1');
  expect(() => parseScene('[1, 2, 3]')).toThrow('A scene file must hold an object');
});
```

- `` `…` `` is a template literal (lesson 0.3) used for text over several lines. `good` is a whole scene file as one string, exactly what reading the file would give.
- `children[0]` is the first child (lesson 1.2's indexes).
- `'{ "formatVersion": 1, }'` has a comma before the `}`, which JavaScript allows in code but JSON doesn't. Hand-edited JSON files often have this mistake.
- `'[1, 2, 3]'` is valid JSON, but a list, not a scene.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './parse'"
```

## parseScene, trusting the nodes

Create `src/engine/parse.ts`:

```ts file=src/engine/parse.ts
import { FORMAT_VERSION, type NodeData, type SceneData } from './scene';

export function parseScene(text: string): SceneData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`This is not valid JSON: ${(error as Error).message}`);
  }
  if (!isObject(raw)) throw new Error('A scene file must hold an object');
  if (raw.formatVersion !== FORMAT_VERSION) {
    throw new Error(`This scene is format version ${String(raw.formatVersion)}; this studio reads version ${FORMAT_VERSION}`);
  }
  return { formatVersion: FORMAT_VERSION, root: raw.root as NodeData };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

- `let raw: unknown` stores the parsed value as **`unknown`**, not `any`. `unknown` is the honest type for "could be anything": TypeScript lets you do nothing with it (no `.root`, no `for…of`) until a check has proved what it is. `any` lets you do everything, and checks nothing.
- `try { … } catch (error) { … }`: if anything in the `try` block throws, the `catch` block runs with the thrown error, instead of the error stopping the program. `JSON.parse` throws a `SyntaxError` for bad text, with a message like *Expected double-quoted property name in JSON at position 22 (line 1 column 23)*.
- The `catch` throws a new error whose message starts by saying what's wrong in a game maker's terms, then keeps JavaScript's message, which says where. `(error as Error).message`: a `catch` gets its error as `unknown`, because JavaScript can throw any value. `JSON.parse` always throws an `Error`.
- `function isObject(value: unknown): value is Record<string, unknown>` is a **type guard**. The return type `value is …` means "when this returns true, `value` has this type". After `if (!isObject(raw)) throw …`, TypeScript treats `raw` as an object whose fields are `unknown`, so `raw.formatVersion` is allowed.
- `isObject` checks three things, because JavaScript's `typeof` says `'object'` for three different kinds of value: real objects, arrays, and (a famous mistake in the language) `null`. Only a real object passes.
- `value !== null`: `!==` means **not equal**, the opposite of `===`. `Array.isArray(value)` is `true` only for an array, so `!Array.isArray(value)` rules arrays out.
- `raw.formatVersion !== FORMAT_VERSION` refuses every version but this one. `String(…)` turns any value into text for the message, even `undefined`.
- `raw.root as NodeData` is an assertion: it *tells* TypeScript the root is a node, without checking. The tests pass, but this is the gap the next step shows.

```check
run "npx vitest run src" stdout="45 passed"
run "npx tsc"
```

## Bad nodes: tests

Add tests for nodes with the wrong shape:

```ts file=src/engine/parse.test.ts
import { expect, test } from 'vitest';
import { parseScene } from './parse';

const good = `{
  "formatVersion": 1,
  "root": {
    "type": "Node",
    "name": "level",
    "props": {},
    "children": [
      { "type": "Box", "name": "car", "props": { "position": { "x": 100, "y": 50 } }, "children": [] }
    ]
  }
}`;

test('a good scene file becomes scene data', () => {
  const scene = parseScene(good);
  expect(scene.root.name).toBe('level');
  expect(scene.root.children[0].props.position).toEqual({ x: 100, y: 50 });
});

test('text that is not JSON is an error that says so', () => {
  expect(() => parseScene('{ "formatVersion": 1, }')).toThrow('This is not valid JSON');
});

test('a file from another version of the format is refused', () => {
  expect(() => parseScene('{ "formatVersion": 2, "root": {} }')).toThrow('This scene is format version 2; this studio reads version 1');
  expect(() => parseScene('[1, 2, 3]')).toThrow('A scene file must hold an object');
});

function withCar(car: string): string {
  return `{ "formatVersion": 1, "root": { "type": "Node", "name": "level", "props": {}, "children": [${car}] } }`;
}

test('every node is checked, and errors give the path to it', () => {
  expect(() => parseScene(withCar('{ "type": "Box", "name": "car", "props": {} }'))).toThrow('level/car: "children" must be a list');
  expect(() => parseScene(withCar('{ "type": "Box", "name": "car", "props": { "color": "red" }, "children": [] }'))).toThrow(
    'level/car: "color" must be a number or a vector',
  );
  expect(() => parseScene(withCar('{ "type": "Box", "props": {}, "children": [] }'))).toThrow('level/(child 1): "name" must be some text');
  expect(() => parseScene(withCar('5'))).toThrow('level/(child 1): a node must be an object');
});
```

- `withCar` builds a file around one child of `level`, so each line of the test shows only the part that's wrong.
- A node with no name can't be called by its name, so its path uses its place among its parent's children: `(child 1)`. Counting from 1 here, because the message is for people, not code.

```predict
question: With parseScene as it is, what happens to the car with no "children"?
choice: parseScene throws: level/car: "children" must be a list
choice: parseScene returns it; the mistake shows up later, in buildNode
choice: JSON.parse refuses it
answer: parseScene returns it; the mistake shows up later, in buildNode
explain: raw.root as NodeData checks nothing. The data comes back typed as a NodeData whose car has no children array at all. buildNode later runs for (const child of data.children) on undefined, and throws data.children is not iterable, with no path, from the wrong place.
```

```check
run "npx vitest run src" exit=1 stderr="every node is checked, and errors give the path to it" label="the new test fails: nodes aren't checked yet"
```

## Checking every node

```ts file=src/engine/parse.ts
import { FORMAT_VERSION, type NodeData, type PropValue, type SceneData, type Vec2Data } from './scene';

export function parseScene(text: string): SceneData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`This is not valid JSON: ${(error as Error).message}`);
  }
  if (!isObject(raw)) throw new Error('A scene file must hold an object');
  if (raw.formatVersion !== FORMAT_VERSION) {
    throw new Error(`This scene is format version ${String(raw.formatVersion)}; this studio reads version ${FORMAT_VERSION}`);
  }
  return { formatVersion: FORMAT_VERSION, root: checkNode(raw.root, label(raw.root, 'root')) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVec2Data(value: unknown): value is Vec2Data {
  return isObject(value) && typeof value.x === 'number' && typeof value.y === 'number';
}

function label(value: unknown, fallback: string): string {
  return isObject(value) && typeof value.name === 'string' && value.name !== '' ? value.name : fallback;
}

function checkNode(value: unknown, path: string): NodeData {
  if (!isObject(value)) throw new Error(`${path}: a node must be an object`);
  const { type, name, props, children } = value;
  if (typeof name !== 'string' || name === '') throw new Error(`${path}: "name" must be some text`);
  if (typeof type !== 'string') throw new Error(`${path}: "type" must be some text`);
  if (!isObject(props)) throw new Error(`${path}: "props" must be an object`);
  for (const [key, prop] of Object.entries(props)) {
    if (typeof prop !== 'number' && !isVec2Data(prop)) throw new Error(`${path}: "${key}" must be a number or a vector`);
  }
  if (!Array.isArray(children)) throw new Error(`${path}: "children" must be a list`);
  return {
    type,
    name,
    props: props as Record<string, PropValue>,
    children: children.map((child, i) => checkNode(child, `${path}/${label(child, `(child ${i + 1})`)}`)),
  };
}
```

- `checkNode(value, path)` checks one node and, through recursion, everything under it. It returns a `NodeData` only once every part has been proved. There's no `as NodeData` anywhere: TypeScript accepts the returned object because each field's type was established by a check.
- `const { type, name, props, children } = value` **destructures** an object: it makes four variables from the fields of the same names. All four are `unknown`, because `value` is a `Record<string, unknown>`.
- Each check throws at the first problem, with the node's path and the field's name. After `typeof name !== 'string' || name === ''` has thrown for anything else, TypeScript knows `name` is a string.
- `isVec2Data` is a second type guard: an object whose `x` and `y` are both numbers.
- The props loop proves every value is a number or a vector, so `props as Record<string, PropValue>` is now a statement of fact, not a guess. TypeScript can't follow a check made inside a loop, so the assertion is still written, and the loop above it is what makes it true.
- `Array.isArray(children)` is the way to test for an array, since `typeof` says `'object'`. After it, TypeScript treats `children` as `any[]` (that's how `Array.isArray` is declared), but nothing trusts the items: each one goes straight into `checkNode`, whose parameter is `unknown`.
- `children.map(fn)` makes a new array by calling `fn` on each item, with its index `i`. Each child is checked by the same function, with its path: its name if it has one, `(child 1)` and so on if not.
- `label(value, fallback)` picks that name, defensively, because the node it names hasn't been checked yet.
- Why check everything here when `buildNode` checks types and props too? They check different things. `parseScene` knows nothing about node types; it proves the file has the *shape* of a scene. `buildNode` proves the scene makes sense *for this game*: its types exist, its props are real settings. Each check lives where the knowledge it needs is.

```check
run "npx vitest run src" stdout="46 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "parseScene: scene files are checked at the border, with paths in every error"
```

```check
git-clean
git-tracked src/engine/parse.ts
```

## Challenge: names that make good paths

**Optional, ★★.** A node named `wheel/left` makes the path `car/wheel/left`, which looks like three nodes, and `get('wheel/left')` can never find it. Make `checkNode` refuse a name containing `/`, with a message that explains why. Test first.

```hints
nudge: Strings have includes(text), which is true if the text appears anywhere in the string.
concept: Validation is the place for rules about what the rest of the program can handle. get() splits paths at /, so no name may contain one.
shape: if (name.includes('/')) throw new Error(`${path}: "name" can't contain "/", because paths use it to separate names`);
```
