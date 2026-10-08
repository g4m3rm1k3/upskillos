---
title: 4.6 — A Registry of Node Types
track: Build Your Own Game Studio
runtime: none
concepts: registries, data-driven-ui, metadata, consistency-tests, nullish-coalescing
problem: The inspector must show the right controls for any node: two number boxes for a position, a colour picker for a colour. A colour is just a number in the scene file. Where does the editor learn what properties a type has, what kind each one is, and its default, and how do you stop that list from drifting away from the engine?
---

Lesson 4.7's inspector will show the selected node's properties, each with the right control. To do that it needs, for every node type:

- the **names** of its properties: a `Box` has `position`, `size` and `color`;
- the **kind** of each: `position` is a vector (two number boxes), `color` a colour (a colour picker), even though in the scene file a colour is only a number;
- the **default** of each: the wall in `scenes/main.json` has no `size`, so the inspector must show the size a `Box` starts with, 32 by 32.

The scene data can't tell it: data only holds what the file sets. The engine's classes know the names and the defaults, but not that a number is a colour. So the editor gets a **registry**: a table, written once, of every node type and its properties. Information about the program's own parts like this is called **metadata**. An inspector built from it is **data-driven**: a new node type with new properties gets the right controls with no new inspector code.

The real Game Studio has one, `core/registry.ts`, with about twenty node types. Everything is made from it there: the inspector, the API reference, checks on saved files. The course's version starts with the four types this studio has. Sprint 15 makes the API reference from it too.

## A type's properties: a test

The registry describes the engine's types, so it lives in the engine folder. Create `src/engine/registry.test.ts`:

```ts file=src/engine/registry.test.ts
import { expect, test } from 'vitest';
import { ENGINE_TYPES, propsOf } from './registry';

test("a type's properties are its base's, then its own", () => {
  expect(propsOf(ENGINE_TYPES, 'Node').map((p) => p.name)).toEqual([]);
  expect(propsOf(ENGINE_TYPES, 'Box').map((p) => p.name)).toEqual(['position', 'size', 'color']);
});
```

- `propsOf(ENGINE_TYPES, 'Box')` lists a type's properties. `.map((p) => p.name)` keeps only the names, to compare.
- A `Box` is a `Node2D`, which is a `Node` (lesson 1.3), so it has the properties of all three, the base types' first: `position` comes from `Node2D`.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './registry'"
```

## Types and their properties

Create `src/engine/registry.ts`:

```ts file=src/engine/registry.ts
import type { PropValue } from './scene';

export type PropKind = 'number' | 'vec2' | 'color';

export interface PropDef {
  name: string;
  kind: PropKind;
  default: PropValue;
}

export interface TypeDef {
  base: string | null;
  props: PropDef[];
}

export const ENGINE_TYPES: ReadonlyMap<string, TypeDef> = new Map<string, TypeDef>([
  ['Node', { base: null, props: [] }],
  ['Node2D', { base: 'Node', props: [{ name: 'position', kind: 'vec2', default: { x: 0, y: 0 } }] }],
  [
    'Box',
    {
      base: 'Node2D',
      props: [
        { name: 'size', kind: 'vec2', default: { x: 32, y: 32 } },
        { name: 'color', kind: 'color', default: 0xffffff },
      ],
    },
  ],
]);

export function propsOf(types: ReadonlyMap<string, TypeDef>, type: string): PropDef[] {
  const def = types.get(type);
  if (!def) throw new Error(`There is no node type "${type}"`);
  const props = def.base === null ? [] : propsOf(types, def.base);
  for (const prop of def.props) {
    const index = props.findIndex((p) => p.name === prop.name);
    if (index === -1) props.push(prop);
    else props[index] = prop;
  }
  return props;
}
```

- `type PropKind = 'number' | 'vec2' | 'color'` is a union of three **string literal types**: a `PropKind` can only be one of those three strings. `kind: 'colour'` is a type error.
- `PropDef` describes one property: its name, its kind, its default. `default` holds a `PropValue` (lesson 2.1), the same type as the values in scene files.
- `TypeDef` describes one node type: its **base**, the type it extends (or `null` for `Node`, which extends nothing), and the properties it adds.
- `ENGINE_TYPES` is a `ReadonlyMap` from type names to definitions, built the same way as `ENGINE_MAKERS` (lesson 2.2): a `Map` made from an array of `[key, value]` pairs. A game adds its own types to a copy, as it adds makers.
- `0xffffff` is white, the `Box` class's default colour, written the way `box.ts` writes it (lesson 1.8).
- `propsOf(types, type)` works out all of a type's properties:
  - find the type's definition, or throw. No test asked for the `throw` yet: `types.get` may give `undefined`, so the type checker makes the code say what then;
  - start with the base type's properties, by calling `propsOf` for the base (**recursion** again, one call per level), or `[]` for a type with no base;
  - then go through the type's own properties. If one has the same name as a base property, it **replaces** it, in the same place (`findIndex`, lesson 3.2, finds where; `props[index] = prop` replaces it). Otherwise it's added at the end.
  - Replacing is how a type changes a base property's default, as a class can **override** a method (lesson 1.4). The player will need it.
  - `propsOf` builds a new array each time, so changing its result can't change the registry.

```check
run "npx vitest run src" stdout="90 passed"
run "npx tsc"
```

## A type that isn't there: a test

Add a test to `src/engine/registry.test.ts`:

```ts file=src/engine/registry.test.ts
import { expect, test } from 'vitest';
import { ENGINE_TYPES, propsOf } from './registry';

test("a type's properties are its base's, then its own", () => {
  expect(propsOf(ENGINE_TYPES, 'Node').map((p) => p.name)).toEqual([]);
  expect(propsOf(ENGINE_TYPES, 'Box').map((p) => p.name)).toEqual(['position', 'size', 'color']);
});

test('a type that is not registered is an error', () => {
  expect(() => propsOf(ENGINE_TYPES, 'Car')).toThrow('There is no node type "Car"');
});
```

- A type the registry doesn't know, like `Car`, must be an error that names it.

```check
run "npx vitest run src" stdout="91 passed" label="it passes at once: the type checker already made propsOf throw"
```

This one passes as soon as it's written. The type checker made `propsOf` handle a missing type in the last step, and the message was written then. The test still earns its place: it pins the message down, and it says, in the list of tests, that an unknown type is refused, for anyone reading them to learn what `propsOf` does.

## A property's value: a test

Add a test to `src/engine/registry.test.ts`:

```ts file=src/engine/registry.test.ts
import { expect, test } from 'vitest';
import { ENGINE_TYPES, propsOf, propValue } from './registry';

test("a type's properties are its base's, then its own", () => {
  expect(propsOf(ENGINE_TYPES, 'Node').map((p) => p.name)).toEqual([]);
  expect(propsOf(ENGINE_TYPES, 'Box').map((p) => p.name)).toEqual(['position', 'size', 'color']);
});

test('a type that is not registered is an error', () => {
  expect(() => propsOf(ENGINE_TYPES, 'Car')).toThrow('There is no node type "Car"');
});

test("a property's value is the scene's, or else its default", () => {
  const [, size, color] = propsOf(ENGINE_TYPES, 'Box');
  const wall = { type: 'Box', name: 'wall', props: { color: 1 }, children: [] };
  expect(propValue(wall, color)).toBe(1);
  expect(propValue(wall, size)).toEqual({ x: 32, y: 32 });
  const black = { type: 'Box', name: 'black', props: { color: 0 }, children: [] };
  expect(propValue(black, color)).toBe(0);
});
```

- `const [, size, color] = …`: the comma with nothing before it skips the first item in array destructuring. `size` is the second property, `color` the third.
- `propValue(wall, color)` is the value the inspector shows: the scene's own value if the file sets one (`color: 1`), or else the default (`size` isn't set, so `{ x: 32, y: 32 }`).
- The black box is an edge case: its colour is `0`, which is a real value, not a missing one. It must show as black, `0`, not as the default white.

```check
run "npx vitest run src" exit=1 stderr="propValue is not a function"
```

## propValue

Change `src/engine/registry.ts`:

```ts file=src/engine/registry.ts
import type { NodeData, PropValue } from './scene';

export type PropKind = 'number' | 'vec2' | 'color';

export interface PropDef {
  name: string;
  kind: PropKind;
  default: PropValue;
}

export interface TypeDef {
  base: string | null;
  props: PropDef[];
}

export const ENGINE_TYPES: ReadonlyMap<string, TypeDef> = new Map<string, TypeDef>([
  ['Node', { base: null, props: [] }],
  ['Node2D', { base: 'Node', props: [{ name: 'position', kind: 'vec2', default: { x: 0, y: 0 } }] }],
  [
    'Box',
    {
      base: 'Node2D',
      props: [
        { name: 'size', kind: 'vec2', default: { x: 32, y: 32 } },
        { name: 'color', kind: 'color', default: 0xffffff },
      ],
    },
  ],
]);

export function propsOf(types: ReadonlyMap<string, TypeDef>, type: string): PropDef[] {
  const def = types.get(type);
  if (!def) throw new Error(`There is no node type "${type}"`);
  const props = def.base === null ? [] : propsOf(types, def.base);
  for (const prop of def.props) {
    const index = props.findIndex((p) => p.name === prop.name);
    if (index === -1) props.push(prop);
    else props[index] = prop;
  }
  return props;
}

export function propValue(node: NodeData, prop: PropDef): PropValue {
  return node.props[prop.name] ?? prop.default;
}
```

- `propValue(node, prop)` returns `node.props[prop.name] ?? prop.default`:
  - `a ?? b`, the **nullish coalescing** operator, gives `a`, unless `a` is `null` or `undefined`; then it gives `b`. A property the file doesn't set is `undefined`, so its default is used.
  - Why not `a || b` (lesson 2.3)? `||` also skips `0`. A black box, `color: 0`, would show as white, its default. `??` only skips values that are really missing.
- The black box in the test is what catches `||`: with it, `propValue(black, color)` would be `0xffffff`.

```check
run "npx vitest run src" stdout="92 passed"
run "npx tsc"
```

## Does the registry tell the truth? A test

The registry is a second description of the engine's classes, written by hand. Two descriptions of one thing drift apart: someone adds `rotation` to `Node2D` and forgets the registry, and the inspector never shows it. Or a default is changed in one place and not the other, and the inspector shows a size the game doesn't use.

The fix is a test that compares the two. Add it to `src/engine/registry.test.ts`:

```ts file=src/engine/registry.test.ts
import { expect, test } from 'vitest';
import { ENGINE_MAKERS } from './build';
import { ENGINE_TYPES, propsOf, propValue, registryProblems } from './registry';

test("a type's properties are its base's, then its own", () => {
  expect(propsOf(ENGINE_TYPES, 'Node').map((p) => p.name)).toEqual([]);
  expect(propsOf(ENGINE_TYPES, 'Box').map((p) => p.name)).toEqual(['position', 'size', 'color']);
});

test('a type that is not registered is an error', () => {
  expect(() => propsOf(ENGINE_TYPES, 'Car')).toThrow('There is no node type "Car"');
});

test("a property's value is the scene's, or else its default", () => {
  const [, size, color] = propsOf(ENGINE_TYPES, 'Box');
  const wall = { type: 'Box', name: 'wall', props: { color: 1 }, children: [] };
  expect(propValue(wall, color)).toBe(1);
  expect(propValue(wall, size)).toEqual({ x: 32, y: 32 });
  const black = { type: 'Box', name: 'black', props: { color: 0 }, children: [] };
  expect(propValue(black, color)).toBe(0);
});

test('the registry lists exactly the settings the engine has, with the same defaults', () => {
  expect(registryProblems(ENGINE_TYPES, ENGINE_MAKERS)).toEqual([]);
});
```

- `registryProblems(types, makers)` will list every way the registry and the engine disagree, as messages. The test wants none: `[]`.
- When it fails, Vitest prints the messages, so the failure says exactly what to fix.

```check
run "npx vitest run src" exit=1 stderr="registryProblems is not a function"
```

## registryProblems

Change `src/engine/registry.ts`:

```ts file=src/engine/registry.ts
import { buildNode, type Maker } from './build';
import type { NodeData, PropValue } from './scene';
import { Vec2 } from './vec2';

export type PropKind = 'number' | 'vec2' | 'color';

export interface PropDef {
  name: string;
  kind: PropKind;
  default: PropValue;
}

export interface TypeDef {
  base: string | null;
  props: PropDef[];
}

export const ENGINE_TYPES: ReadonlyMap<string, TypeDef> = new Map<string, TypeDef>([
  ['Node', { base: null, props: [] }],
  ['Node2D', { base: 'Node', props: [{ name: 'position', kind: 'vec2', default: { x: 0, y: 0 } }] }],
  [
    'Box',
    {
      base: 'Node2D',
      props: [
        { name: 'size', kind: 'vec2', default: { x: 32, y: 32 } },
        { name: 'color', kind: 'color', default: 0xffffff },
      ],
    },
  ],
]);

export function propsOf(types: ReadonlyMap<string, TypeDef>, type: string): PropDef[] {
  const def = types.get(type);
  if (!def) throw new Error(`There is no node type "${type}"`);
  const props = def.base === null ? [] : propsOf(types, def.base);
  for (const prop of def.props) {
    const index = props.findIndex((p) => p.name === prop.name);
    if (index === -1) props.push(prop);
    else props[index] = prop;
  }
  return props;
}

export function propValue(node: NodeData, prop: PropDef): PropValue {
  return node.props[prop.name] ?? prop.default;
}

export function registryProblems(types: ReadonlyMap<string, TypeDef>, makers: ReadonlyMap<string, Maker>): string[] {
  const problems: string[] = [];
  for (const type of types.keys()) {
    const node = buildNode({ type, name: 'n', props: {}, children: [] }, makers) as unknown as Record<string, unknown>;
    const listed = propsOf(types, type);
    for (const prop of listed) {
      const field = node[prop.name];
      const value = field instanceof Vec2 ? { x: field.x, y: field.y } : field;
      if (JSON.stringify(value) !== JSON.stringify(prop.default)) {
        problems.push(`${type}.${prop.name}: the registry says ${JSON.stringify(prop.default)}, the engine says ${JSON.stringify(value)}`);
      }
    }
    for (const [key, field] of Object.entries(node)) {
      const isSetting = field instanceof Vec2 || typeof field === 'number';
      if (isSetting && !listed.some((p) => p.name === key)) problems.push(`${type}.${key}: not in the registry`);
    }
  }
  return problems;
}
```

- For each registered type, `buildNode` makes a real node of it, with no props: `{ type, name: 'n', props: {}, children: [] }`. Every field on it then has the class's own starting value, which is the default the game really uses. `{ type, … }` is shorthand for `{ type: type, … }`.
- `types.keys()` gives the map's keys, the type names, one at a time to the `for … of`.
- `as unknown as Record<string, unknown>` lets the code read any field by name, as `applyProps` does (lesson 2.3).
- First loop, every property the registry lists:
  - read the node's field of that name. A `Vec2` is turned into plain `{ x, y }` data, so it can be compared with the default, which is data;
  - compare them as JSON text (`JSON.stringify`, lesson 2.1). Two objects are never `===` unless they're the same object, but two equal vectors give the same text;
  - if they differ, say so, with both values.
- Second loop, every field the node has: `Object.entries(node)` (lesson 2.3) lists its own fields, with their values. A field that's a number or a `Vec2` is a setting a scene file can set (the same rule as `applyProps`), so it must be in the registry. Fields such as `name`, `parent` and `children` are neither, and are skipped.
- The function returns messages instead of throwing at the first problem, so one test run shows every problem at once.
- `registryProblems` is in the engine, not in the test file, so a game's own tests can check its own types (next step).

```check
run "npx vitest run src" stdout="93 passed"
run "npx tsc"
```

## The player's test

`Player` is a node type too, from the game, not the engine. Its registry entry belongs with its class, in `src/game/player.ts`, and its test in `src/game/player.test.ts`. Change `src/game/player.test.ts`:

```ts file=src/game/player.test.ts
import { expect, test } from 'vitest';
import { ENGINE_MAKERS, type Maker } from '../engine/build';
import { Input } from '../engine/input';
import { ENGINE_TYPES, registryProblems, type TypeDef } from '../engine/registry';
import { addMoveActions, Player, PLAYER_TYPE } from './player';

test('the player moves at 200 pixels a second in the direction held', () => {
  const input = new Input();
  addMoveActions(input);
  const player = new Player('player', input);
  input.key('ArrowRight', true);
  for (let step = 0; step < 60; step++) player.updateTree(1 / 60);
  expect(player.position.x).toBeCloseTo(200);
  expect(player.position.y).toBe(0);
});

test('W, A, S and D work as well as the arrows', () => {
  const input = new Input();
  addMoveActions(input);
  const player = new Player('player', input);
  input.key('KeyW', true);
  player.updateTree(0.5);
  expect(player.position.y).toBeCloseTo(-100);
});

test('the registry describes the player as the engine makes it', () => {
  const input = new Input();
  const types = new Map<string, TypeDef>(ENGINE_TYPES);
  types.set('Player', PLAYER_TYPE);
  const makers = new Map<string, Maker>(ENGINE_MAKERS);
  makers.set('Player', (name) => new Player(name, input));
  expect(registryProblems(types, makers)).toEqual([]);
});
```

- The new test builds the registry and the makers a game would have: copies of the engine's, with `Player` added to each, the same way `main.tsx` adds the player's maker (lesson 2.5). `new Map<string, TypeDef>(ENGINE_TYPES)` makes a new map with all the entries of the old one, so the engine's own map isn't changed.
- Then it asks `registryProblems` about all of them, the player included.
- `PLAYER_TYPE` doesn't exist yet, so the map gets `undefined` for `Player`, and `propsOf` finds no definition.

```check
run "npx vitest run src" exit=1 stderr="There is no node type \"Player\""
```

## The player in the registry

A `Player` is a `Box` (lesson 1.8), so its base is `Box`, and it adds no fields of its own that a scene file can set (`input` is an `Input`, not a number or a vector).

```predict
question: If PLAYER_TYPE is { base: 'Box', props: [] }, what does the test say?
choice: It passes: the player has a Box's properties
choice: Player.color: the registry says 16777215, the engine says 5227511
choice: Player.input: not in the registry
answer: Player.color: the registry says 16777215, the engine says 5227511
explain: Player's constructor sets this.color = 0x4fc3f7, which is 5227511. With no props of its own, the player inherits Box's color with Box's default, 0xffffff (16777215). The inspector would show a new player as white, while the game draws it light blue. input is skipped: it's neither a number nor a vector.
```

Change `src/game/player.ts`:

```ts file=src/game/player.ts
import { Box } from '../engine/box';
import type { Input } from '../engine/input';
import type { TypeDef } from '../engine/registry';

const SPEED = 200;

export const PLAYER_TYPE: TypeDef = {
  base: 'Box',
  props: [{ name: 'color', kind: 'color', default: 0x4fc3f7 }],
};

export function addMoveActions(input: Input): void {
  input.addAction('left', ['ArrowLeft', 'KeyA']);
  input.addAction('right', ['ArrowRight', 'KeyD']);
  input.addAction('up', ['ArrowUp', 'KeyW']);
  input.addAction('down', ['ArrowDown', 'KeyS']);
}

export class Player extends Box {
  input: Input;

  constructor(name: string, input: Input) {
    super(name);
    this.input = input;
    this.color = 0x4fc3f7;
  }

  override update(dt: number): void {
    const direction = this.input.vector('left', 'right', 'up', 'down');
    this.position = this.position.add(direction.scale(SPEED * dt));
  }
}
```

- `import type { TypeDef }`: only the type is needed, so only the type is imported.
- `PLAYER_TYPE` says: a `Player` is a `Box`, and its `color` defaults to `0x4fc3f7`, light blue, the colour its constructor sets. It's a property with the same name as `Box`'s, so `propsOf` puts it in place of `Box`'s `color`: same position in the list, new default.
- `: TypeDef` on the constant checks the shape: a misspelled `kind` or a missing `base` is a type error here, not a strange inspector later.

```check
run "npx vitest run src" stdout="94 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "A registry of node types and their properties, held to the engine by a test"
```

```check
git-clean
git-tracked src/engine/registry.ts
```

## Challenge: help text

**Optional, ★.** Give `PropDef` a `help: string`: a sentence saying what the property does, such as "Where it is, in pixels from its parent's position". Fill it in for every property. Then add a check to `registryProblems` that every property's help ends with a full stop. Lesson 4.7's inspector could show it when you point at a field.

```hints
nudge: Once help is in the interface, TypeScript lists every PropDef that's missing it.
concept: Metadata written once can be used by many parts: the inspector, a reference page, error messages.
shape: if (!prop.help.endsWith('.')) problems.push(`${type}.${prop.name}: its help should end with a full stop`);
```
