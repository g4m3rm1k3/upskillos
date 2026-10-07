---
title: 1.4 — Making Things Move: update and Delta Time
track: Build Your Own Game Studio
runtime: none
concepts: frames, delta-time, overriding, tree-traversal
problem: A ball should roll at 120 pixels a second. Some screens show 30 frames a second, others 144. How does every object in the tree get its turn to move each frame, and how does the ball cover the same distance on every computer?
---

A game looks like it moves the way a film does: it shows still pictures, **frames**, one after another, fast enough that your eye sees motion. Between frames, the engine gives every object a turn to change: the ball rolls a little, the timer counts down, the enemy takes a step. That turn is a method on every node, called **`update`**.

How far should the ball roll in one turn? Not "2 pixels". At 30 frames a second that's 60 pixels a second, and at 144 frames a second it's 288: the game would run nearly 5 times faster on a fast screen. So each update is told how much time has passed since the last one, in seconds. That number is **delta time**, written `dt` (delta, Δ, is the maths symbol for *change*). The ball moves `velocity × dt`:

- At 30 frames a second, `dt` is 1/30 s, and the ball moves `120 × 1/30 = 4` pixels a frame.
- At 144 frames a second, `dt` is 1/144 s, and it moves `120 × 1/144 ≈ 0.83` pixels a frame.
- Either way: 120 pixels a second.

## Every node, every frame: a test

Each frame, the engine calls `updateTree(dt)` on the root, and every node in the tree gets `update(dt)`. A test can check *who* gets called, and in what order, by making nodes that write themselves into a list. Add a test to `src/engine/node.test.ts`:

```ts file=src/engine/node.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';

test('a new node has a name, no parent and no children', () => {
  const car = new Node('car');
  expect(car.name).toBe('car');
  expect(car.parent).toBe(null);
  expect(car.children).toEqual([]);
});

test('addChild links the child and its parent both ways', () => {
  const car = new Node('car');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(car.children).toEqual([wheel]);
  expect(wheel.parent).toBe(car);
});

test('a node with a parent cannot be added to another', () => {
  const car = new Node('car');
  const truck = new Node('truck');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(() => truck.addChild(wheel)).toThrow('"wheel" already has a parent');
  expect(truck.children).toEqual([]);
});

test('removeChild unlinks both ways, and the node can be added again', () => {
  const car = new Node('car');
  const truck = new Node('truck');
  const wheel = new Node('wheel');
  const body = new Node('body');
  car.addChild(wheel);
  car.addChild(body);
  car.removeChild(wheel);
  expect(car.children).toEqual([body]);
  expect(wheel.parent).toBe(null);
  truck.addChild(wheel);
  expect(wheel.parent).toBe(truck);
});

test('get finds a node by the path of names down to it', () => {
  const car = new Node('car');
  const body = new Node('body');
  const driver = new Node('driver');
  car.addChild(body);
  body.addChild(driver);
  expect(car.get('body')).toBe(body);
  expect(car.get('body/driver')).toBe(driver);
  expect(() => car.get('body/wheel')).toThrow('"car" has no node at "body/wheel"');
});

class Recorder extends Node {
  log: string[];

  constructor(name: string, log: string[]) {
    super(name);
    this.log = log;
  }

  override update(dt: number): void {
    this.log.push(`${this.name} ${dt}`);
  }
}

test('updateTree updates every node, each parent before its children', () => {
  const log: string[] = [];
  const level = new Recorder('level', log);
  const car = new Recorder('car', log);
  const wheel = new Recorder('wheel', log);
  const coin = new Recorder('coin', log);
  level.addChild(car);
  car.addChild(wheel);
  level.addChild(coin);
  level.updateTree(0.5);
  expect(log).toEqual(['level 0.5', 'car 0.5', 'wheel 0.5', 'coin 0.5']);
});
```

- `Recorder` is a subclass of `Node` made only for this test: each time it's updated, it pushes its name and `dt` onto a list.
- Its constructor takes a second parameter, so it needs its own constructor. `super(name)` calls the **base class's** constructor first (`Node`'s, which sets the name). A subclass's constructor must call `super(…)` before it uses `this`.
- All four nodes share **one** `log` array: each was handed a reference to the same array, so every push lands in the same list, in the order the updates happened.
- `override update(dt: number)` **replaces** a method the base class has. `override` tells TypeScript you mean to replace one. If `Node` had no `update`, `npx tsc` would report it, which catches a misspelled method name.
- The expected order is the tree read from the top, each node before its children, each child's whole branch before the next child: level, car, wheel, then coin.

```check
run "npx vitest run src" exit=1 stderr="level.updateTree is not a function"
```

## update and updateTree

```ts file=src/engine/node.ts
export class Node {
  name: string;
  parent: Node | null = null;
  children: Node[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addChild(child: Node): void {
    if (child.parent) throw new Error(`"${child.name}" already has a parent`);
    child.parent = this;
    this.children.push(child);
  }

  removeChild(child: Node): void {
    const index = this.children.indexOf(child);
    if (index === -1) throw new Error(`"${child.name}" is not a child of "${this.name}"`);
    this.children.splice(index, 1);
    child.parent = null;
  }

  get(path: string): Node {
    let node: Node = this;
    for (const name of path.split('/')) {
      const child = node.children.find((c) => c.name === name);
      if (!child) throw new Error(`"${this.name}" has no node at "${path}"`);
      node = child;
    }
    return node;
  }

  update(_dt: number): void {}

  updateTree(dt: number): void {
    this.update(dt);
    for (const child of this.children) child.updateTree(dt);
  }
}
```

- `update(_dt: number): void {}` does nothing. It exists so every node *has* an `update` for subclasses to override; a plain `Node` has nothing to change each frame. The `_` at the start of `_dt` is a convention: a parameter that's deliberately unused.
- `updateTree` updates this node, then calls `updateTree` on each child, which updates the child and then *its* children. It's recursive, like `globalPosition`, but it goes down the tree instead of up.
- Visiting a node before its children, and finishing one child's whole branch before the next child, is called **depth-first**, **pre-order** traversal. Parents go first, so a car has moved before its wheels look at where it is.
- When a node's `update` is called, JavaScript looks for the method on the object's own class first: `Recorder`'s `update` for a `Recorder`, `Node`'s empty one for a plain `Node`. Which method runs depends on the object, not on the type of the variable: this is **polymorphism**.

```check
run "npx vitest run src" stdout="17 passed"
run "npx tsc"
```

## A ball that rolls

Now real game code: a ball with a velocity, moving in `update`. Add it to `src/engine/node2d.test.ts`:

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

class Ball extends Node2D {
  velocity = new Vec2(120, 0);

  override update(dt: number): void {
    this.position = this.position.add(this.velocity.scale(dt));
  }
}

test('a ball covers the same distance whatever the frame rate', () => {
  const slow = new Ball('slow');
  for (let frame = 0; frame < 30; frame++) slow.updateTree(1 / 30);
  const fast = new Ball('fast');
  for (let frame = 0; frame < 144; frame++) fast.updateTree(1 / 144);
  expect(slow.position.x).toBeCloseTo(120);
  expect(fast.position.x).toBeCloseTo(120);
});
```

- `Ball` is game code, written the way every moving thing in the studio's games will be: a subclass of `Node2D` that overrides `update`.
- `velocity = new Vec2(120, 0)`: 120 pixels a second, to the right.
- `this.position.add(this.velocity.scale(dt))` is *position + velocity × dt*: the distance moved this frame, added to where it was. The vector methods from lesson 1.1, used for what they were made for.
- `for (let frame = 0; frame < 30; frame++)` is a **counting loop**: it sets `frame` to 0, runs the statement while `frame < 30` is true, and adds 1 to `frame` (`frame++`) after each pass. So it runs 30 times, frames 0 to 29.
- 30 frames of 1/30 s and 144 frames of 1/144 s are both one second of game time, so both balls should be at x 120. `toBeCloseTo`, because adding 1/144 a hundred and forty-four times gathers floating-point error (lesson 1.1).

```predict
question: What does npm test report?
choice: 18 passed: the engine already does everything the ball needs
choice: A failure: Node2D has no update for Ball to override
choice: A failure: the fast ball goes further
answer: 18 passed: the engine already does everything the ball needs
explain: The test is new but the engine isn't: Node has update and updateTree, Node2D inherits them, and multiplying by dt makes the distance depend on time, not on the number of frames. A test that passes at once is still worth keeping. It shows how the engine is meant to be used, and it fails if a later change breaks frame-rate independence.
```

```check
run "npx vitest run src" stdout="18 passed"
run "npx tsc" label="Ball's override type-checks"
```

## Removing a node while the tree updates: a test

Games remove nodes *during* an update all the time: a coin removes itself when it's picked up. Add a test with two coins that remove themselves on their first update:

```ts file=src/engine/node.test.ts
import { expect, test } from 'vitest';
import { Node } from './node';

test('a new node has a name, no parent and no children', () => {
  const car = new Node('car');
  expect(car.name).toBe('car');
  expect(car.parent).toBe(null);
  expect(car.children).toEqual([]);
});

test('addChild links the child and its parent both ways', () => {
  const car = new Node('car');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(car.children).toEqual([wheel]);
  expect(wheel.parent).toBe(car);
});

test('a node with a parent cannot be added to another', () => {
  const car = new Node('car');
  const truck = new Node('truck');
  const wheel = new Node('wheel');
  car.addChild(wheel);
  expect(() => truck.addChild(wheel)).toThrow('"wheel" already has a parent');
  expect(truck.children).toEqual([]);
});

test('removeChild unlinks both ways, and the node can be added again', () => {
  const car = new Node('car');
  const truck = new Node('truck');
  const wheel = new Node('wheel');
  const body = new Node('body');
  car.addChild(wheel);
  car.addChild(body);
  car.removeChild(wheel);
  expect(car.children).toEqual([body]);
  expect(wheel.parent).toBe(null);
  truck.addChild(wheel);
  expect(wheel.parent).toBe(truck);
});

test('get finds a node by the path of names down to it', () => {
  const car = new Node('car');
  const body = new Node('body');
  const driver = new Node('driver');
  car.addChild(body);
  body.addChild(driver);
  expect(car.get('body')).toBe(body);
  expect(car.get('body/driver')).toBe(driver);
  expect(() => car.get('body/wheel')).toThrow('"car" has no node at "body/wheel"');
});

class Recorder extends Node {
  log: string[];

  constructor(name: string, log: string[]) {
    super(name);
    this.log = log;
  }

  override update(dt: number): void {
    this.log.push(`${this.name} ${dt}`);
  }
}

test('updateTree updates every node, each parent before its children', () => {
  const log: string[] = [];
  const level = new Recorder('level', log);
  const car = new Recorder('car', log);
  const wheel = new Recorder('wheel', log);
  const coin = new Recorder('coin', log);
  level.addChild(car);
  car.addChild(wheel);
  level.addChild(coin);
  level.updateTree(0.5);
  expect(log).toEqual(['level 0.5', 'car 0.5', 'wheel 0.5', 'coin 0.5']);
});

class Coin extends Node {
  override update(_dt: number): void {
    this.parent?.removeChild(this);
  }
}

test('nodes can remove themselves during updateTree', () => {
  const level = new Node('level');
  level.addChild(new Coin('coin1'));
  level.addChild(new Coin('coin2'));
  level.updateTree(0.1);
  expect(level.children).toEqual([]);
});
```

- `this.parent?.removeChild(this)`: `?.` is **optional chaining**. If `this.parent` is `null`, the whole expression stops and gives `undefined` instead of an error; otherwise it calls `removeChild` as usual. A coin with no parent has nothing to leave.
- `level.addChild(new Coin('coin1'))` makes a coin and adds it in one line; no variable is needed, because the test only looks at `level.children`.

```predict
question: What is level.children after updateTree?
choice: [] — both coins removed themselves
choice: [coin2] — the second coin was never updated
choice: An error: the array changed while the loop used it
answer: [coin2] — the second coin was never updated
explain: The for…of loop walks the array by index: at index 0 it updates coin1, which splices itself out, so coin2 slides down to index 0. The loop moves on to index 1, finds nothing there, and stops. coin2 is skipped, with no error.
```

```text
AssertionError: expected [ Coin{ name: 'coin2', …(2) } ] to deeply equal []
```

- Changing an array while a loop is walking through it is one of the most common bugs in game code. Here it's silent: one coin just doesn't get its update this frame.

```check
run "npx vitest run src" exit=1 stderr="nodes can remove themselves during updateTree" label="the new test fails: coin2 is skipped"
```

## Walking a copy

```ts file=src/engine/node.ts
export class Node {
  name: string;
  parent: Node | null = null;
  children: Node[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addChild(child: Node): void {
    if (child.parent) throw new Error(`"${child.name}" already has a parent`);
    child.parent = this;
    this.children.push(child);
  }

  removeChild(child: Node): void {
    const index = this.children.indexOf(child);
    if (index === -1) throw new Error(`"${child.name}" is not a child of "${this.name}"`);
    this.children.splice(index, 1);
    child.parent = null;
  }

  get(path: string): Node {
    let node: Node = this;
    for (const name of path.split('/')) {
      const child = node.children.find((c) => c.name === name);
      if (!child) throw new Error(`"${this.name}" has no node at "${path}"`);
      node = child;
    }
    return node;
  }

  update(_dt: number): void {}

  updateTree(dt: number): void {
    this.update(dt);
    for (const child of [...this.children]) child.updateTree(dt);
  }
}
```

- `[...this.children]` makes a new array holding the same nodes: `...` (**spread**) takes every item out of an array, and the `[ ]` around it collects them into a new one.
- The loop walks the copy, so removals from the real `children` array don't move anything in the list being walked. Every node that was a child when the frame began gets its update.
- It copies only the list of references, not the nodes themselves, so it's cheap: one small array per node per frame.

```check
run "npx vitest run src" stdout="19 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "update and updateTree: every node moves each frame, by delta time"
```

```check
git-clean
```

## Challenge: a ball that bounces

**Optional, ★★.** Write a test with a `Ball` that bounces between the left and right edges of an 800-pixel-wide screen: past x 800 it heads left, below x 0 it heads right. Update it for 10 seconds of game time, one frame at a time, and check its x never goes more than one frame's movement past an edge.

```hints
nudge: After moving, look at the new x. If it's past an edge, change the velocity's x so it points back inside.
concept: Flipping the sign with -velocity.x looks right, but if the ball is still past the edge on the next frame it flips back out and sticks there, shaking. Set the direction instead of flipping it: Math.abs(n) is n without its sign, so -Math.abs(n) always points left.
shape: if (this.position.x > 800) this.velocity = new Vec2(-Math.abs(this.velocity.x), this.velocity.y); and if (this.position.x < 0) the same with Math.abs(this.velocity.x).
```
