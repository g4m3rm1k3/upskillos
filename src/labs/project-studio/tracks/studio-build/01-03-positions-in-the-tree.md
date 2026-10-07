---
title: 1.3 — Positions in the Tree: Local and Global
track: Build Your Own Game Studio
runtime: none
concepts: inheritance, getters, recursion, coordinates
problem: When the car drives forward, its driver must go with it. If every node stored where it is on the screen, moving the car would mean moving every node under it, one by one. How can moving one node move everything it holds?
---

A node's **position** is stored relative to its parent, not to the screen:

- The car is at `(100, 50)`: relative to the level, which sits at the screen's top-left corner, so that's also where it is on the screen.
- The driver is at `(10, -5)`: 10 pixels right of the car's position and 5 up.
- So the driver is drawn at `(100 + 10, 50 - 5) = (110, 45)`.
- Move the car to `(200, 50)` and the driver is drawn at `(210, 45)`, though nobody changed the driver.

A position relative to the parent is **local**. Where a node ends up, after adding every parent's position above it, is **global** (also called its *world* position). Games set local positions; the engine works out global ones when it draws.

Not every node has a position. A node that only groups others ("enemies", holding every enemy) has none, and nor does a node that plays music. So the class with a position is a second class, `Node2D`, which is a `Node` with a position added. Every node that's drawn will be a `Node2D`.

## A node with a position: a test

Create `src/engine/node2d.test.ts`:

```ts file=src/engine/node2d.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';
import { Node2D } from './node2d';
import { Vec2 } from './vec2';

test('a Node2D is a Node, with a position starting at (0, 0)', () => {
  const car = new Node2D('car');
  expect(car).toBeInstanceOf(Node);
  expect(car.name).toBe('car');
  expect(car.position).toEqual(new Vec2(0, 0));
});
```

- `toBeInstanceOf(Node)` passes if the object was made by `Node`'s class or by a class built on it.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './node2d'"
```

## A class built on another

Create `src/engine/node2d.ts`:

```ts file=src/engine/node2d.ts
import { Node } from './node';
import { Vec2 } from './vec2';

export class Node2D extends Node {
  position = new Vec2(0, 0);
}
```

- `class Node2D extends Node` makes `Node2D` a **subclass** of `Node`. This is called **inheritance**: a `Node2D` has everything a `Node` has (`name`, `parent`, `children`, `addChild`, `removeChild`, `get`) plus what's written here.
- So the object `new Node2D('car')` makes holds `name`, `parent`, `children` and `position`. `Node` is the **base class** (or superclass).
- `Node2D` has no constructor of its own, so `new Node2D('car')` uses `Node`'s: the name is set the same way.
- `position = new Vec2(0, 0)` gives each `Node2D` its own vector. Every new node starts at its parent's position.
- A `Node2D` can be added under a `Node`, and the other way round, because a `Node2D` *is* a `Node`. Anywhere a `Node` is expected, a `Node2D` is accepted.

```check
run "npx vitest run src" stdout="14 passed"
run "npx tsc"
```

## Global position: a test

```ts file=src/engine/node2d.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';
import { Node2D } from './node2d';
import { Vec2 } from './vec2';

test('a Node2D is a Node, with a position starting at (0, 0)', () => {
  const car = new Node2D('car');
  expect(car).toBeInstanceOf(Node);
  expect(car.name).toBe('car');
  expect(car.position).toEqual(new Vec2(0, 0));
});

test('the global position adds every Node2D position above it', () => {
  const car = new Node2D('car');
  const body = new Node2D('body');
  const driver = new Node2D('driver');
  car.addChild(body);
  body.addChild(driver);
  car.position = new Vec2(100, 50);
  body.position = new Vec2(0, 0);
  driver.position = new Vec2(10, -5);
  expect(car.globalPosition).toEqual(new Vec2(100, 50));
  expect(driver.globalPosition).toEqual(new Vec2(110, 45));

  car.position = new Vec2(200, 50);
  expect(driver.globalPosition).toEqual(new Vec2(210, 45));
});
```

- `car.position = new Vec2(100, 50)` replaces the car's position with a new vector.
- `globalPosition` is read without brackets, like a field. The next step shows how a calculated value can look like a field.
- The last two lines are the reason for local positions: move the car, and the driver's global position follows.

```check
run "npx vitest run src" exit=1 stderr="expected undefined to deeply equal" label="the test fails: there is no globalPosition yet"
```

## A getter, and recursion

```ts file=src/engine/node2d.ts
import { Node } from './node';
import { Vec2 } from './vec2';

export class Node2D extends Node {
  position = new Vec2(0, 0);

  get globalPosition(): Vec2 {
    if (this.parent instanceof Node2D) return this.parent.globalPosition.add(this.position);
    return this.position;
  }
}
```

- `get globalPosition()` is a **getter**: a method that runs whenever the property is read, so `driver.globalPosition` (no brackets) calls it and gives back what it returns. Use a getter for a value that's *worked out* from other fields, so it's always up to date.
- This `get` is a keyword, unrelated to the method named `get` on `Node`.
- `this.parent instanceof Node2D` is true if the parent was made by `Node2D` (or a subclass of it). Only a `Node2D` has a position to add. TypeScript **narrows** `this.parent` to `Node2D` inside the `if` (as with `null` in lesson 0.5), so `this.parent.globalPosition` type-checks.
- `this.parent.globalPosition` reads the *parent's* global position, using this same getter on the parent. A function that uses itself is **recursive**. Each call goes one level up, and the calls stop at a node with no `Node2D` parent, which returns its own position.
- Trace `driver.globalPosition`:
  - driver asks body for its global position;
  - body asks car;
  - car has no parent, so it returns `(100, 50)`;
  - body returns `(100, 50) + (0, 0) = (100, 50)`;
  - driver returns `(100, 50) + (10, -5) = (110, 45)`.

```check
run "npx vitest run src" stdout="15 passed"
run "npx tsc"
```

## A group in between: a test

Levels group their nodes: an `enemies` node holds every enemy, so they can be found together. A group needs no position, so it's a plain `Node`. Here an enemy sits inside a group, inside a `Node2D` room that has been moved:

```ts file=src/engine/node2d.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';
import { Node2D } from './node2d';
import { Vec2 } from './vec2';

test('a Node2D is a Node, with a position starting at (0, 0)', () => {
  const car = new Node2D('car');
  expect(car).toBeInstanceOf(Node);
  expect(car.name).toBe('car');
  expect(car.position).toEqual(new Vec2(0, 0));
});

test('the global position adds every Node2D position above it', () => {
  const car = new Node2D('car');
  const body = new Node2D('body');
  const driver = new Node2D('driver');
  car.addChild(body);
  body.addChild(driver);
  car.position = new Vec2(100, 50);
  body.position = new Vec2(0, 0);
  driver.position = new Vec2(10, -5);
  expect(car.globalPosition).toEqual(new Vec2(100, 50));
  expect(driver.globalPosition).toEqual(new Vec2(110, 45));

  car.position = new Vec2(200, 50);
  expect(driver.globalPosition).toEqual(new Vec2(210, 45));
});

test('a plain Node in between is passed over', () => {
  const room = new Node2D('room');
  const enemies = new Node('enemies');
  const bat = new Node2D('bat');
  room.addChild(enemies);
  enemies.addChild(bat);
  room.position = new Vec2(300, 0);
  bat.position = new Vec2(20, 40);
  expect(bat.globalPosition).toEqual(new Vec2(320, 40));
});
```

```predict
question: What does bat.globalPosition give with the getter as it is?
choice: (320, 40)
choice: (20, 40)
choice: An error: enemies has no position
answer: (20, 40)
explain: The bat's parent is enemies, a plain Node, so instanceof Node2D is false and the getter returns the bat's own position. It never looks past enemies to the room, so the room's (300, 0) is lost. The bat would be drawn in the wrong place, with no error.
```

```check
run "npx vitest run src" exit=1 stderr="a plain Node in between is passed over" label="the new test fails"
```

## Looking past plain nodes

```ts file=src/engine/node2d.ts
import { Node } from './node';
import { Vec2 } from './vec2';

export class Node2D extends Node {
  position = new Vec2(0, 0);

  get globalPosition(): Vec2 {
    let above = this.parent;
    while (above && !(above instanceof Node2D)) above = above.parent;
    if (above instanceof Node2D) return above.globalPosition.add(this.position);
    return this.position;
  }
}
```

- `let above = this.parent` starts one level up. TypeScript **infers** its type from the value, `Node | null`, so it needs no annotation.
- `while (condition) statement` repeats the statement as long as the condition is true. It's a loop like `for…of`, but for when you don't know in advance how many times it will run.
- The condition: `above` is not `null` (there's still a node), **and** (`&&`) it is not a `Node2D`. `!` turns true into false and false into true.
- So each pass climbs one level, `above = above.parent`, past plain nodes. It stops at the first `Node2D` above, or at `null` when it climbs off the top of the tree.
- Then the same rule as before: if it found a `Node2D`, add its global position; if not, this node's position is already global.
- Trace `bat.globalPosition`: `above` starts at `enemies`, a plain `Node`, so the loop climbs to `room`, a `Node2D`, and stops. The bat returns `room.globalPosition + (20, 40) = (300, 0) + (20, 40) = (320, 40)`.

```check
run "npx vitest run src" stdout="16 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "Node2D: local positions, and global positions worked out up the tree"
```

```check
git-clean
git-tracked src/engine/node2d.ts
```

## Challenge: placing a node at a global position

**Optional, ★★.** A coin should appear exactly where the player is, but it's added under a different parent. Write a **setter**, `set globalPosition(v: Vec2)`, that sets the node's local `position` so that its global position becomes `v`. Test it under a moved parent. A getter and a setter with the same name make one property you can read and assign: `coin.globalPosition = player.globalPosition`.

```hints
nudge: global = parent's global + local, so local = global − parent's global. Without a Node2D above, local and global are the same.
concept: A setter runs when the property is assigned: set globalPosition(v: Vec2) { … } receives the assigned value as v.
shape: Find the Node2D above as the getter does, then this.position = v.add(above.globalPosition.scale(-1)), or this.position = v when there is none.
```
