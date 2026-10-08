---
title: 5.2 — Turning and Stretching
track: Build Your Own Game Studio
runtime: none
concepts: transforms, coordinate-spaces, rotation, scale, inverse, floating-point
problem: A node has had only a position since lesson 1.3. A wall that leans and a crate twice the size need a rotation and a scale too, and a child must turn with its parent. How does one small object hold all three, and work backwards from a point on screen to a point on the node?
---

Sprint 5's third story asks for things that turn and stretch. Today a `Node2D` has only `position`, and its `globalPosition` (lesson 1.3) adds up the positions above it. With turning, adding isn't enough: if a car turns, its wheel, 10 pixels to the car's right, must swing round with it.

This lesson adds a **transform**: one object that says how a node's own drawing is placed in its parent: moved, turned and stretched. Every game engine has one (Godot's `Transform2D`, Unity's `Transform`). The rest of Sprint 5 uses it for everything: drawing turned boxes, finding what's under the mouse, dragging, and the editor's camera.

The idea is easier than it sounds. Picture the node's own little grid of squared paper, with its `(0, 0)` at the node's centre. A transform says three things about that paper, in the parent's coordinates:

- **where its `(0, 0)` is** (the **origin**): that's the node's position;
- **where one step along its x axis takes you**: for a node that's not turned or stretched, `(1, 0)`; turned a quarter turn, `(0, 1)`; twice the size, `(2, 0)`;
- **where one step along its y axis takes you**: normally `(0, 1)`.

A point on the paper, say `(10, 1)`, is then found in the parent by starting at the origin, taking 10 x steps and 1 y step.

## subtract: a test

Working backwards will need the step from one point to another. Change `src/engine/vec2.test.ts`:

```ts file=src/engine/vec2.test.ts
import { expect, test } from 'vitest';
import { Vec2 } from './vec2';

test('a vector holds x and y', () => {
  const v = new Vec2(3, 4);
  expect(v.x).toBe(3);
  expect(v.y).toBe(4);
});

test('add makes a new vector, the sum, and leaves both unchanged', () => {
  const position = new Vec2(100, 50);
  const moved = position.add(new Vec2(2, 0));
  expect(moved).toEqual(new Vec2(102, 50));
  expect(position).toEqual(new Vec2(100, 50));
});

test('subtract makes a new vector, the difference: the step from other to this', () => {
  expect(new Vec2(5, 7).subtract(new Vec2(2, 3))).toEqual(new Vec2(3, 4));
});

test('scale multiplies both parts', () => {
  const velocity = new Vec2(120, 0);
  expect(velocity.scale(0.5)).toEqual(new Vec2(60, 0));
});

test('length is the distance from (0, 0)', () => {
  expect(new Vec2(3, 4).length()).toBe(5);
});

test('normalized points the same way, with length 1', () => {
  const direction = new Vec2(3, 4).normalized();
  expect(direction.x).toBeCloseTo(0.6);
  expect(direction.y).toBeCloseTo(0.8);
  expect(direction.length()).toBeCloseTo(1);
});

test('the zero vector normalized is the zero vector', () => {
  expect(new Vec2(0, 0).normalized()).toEqual(new Vec2(0, 0));
});
```

- The new test is the fourth: `(5, 7)` minus `(2, 3)` is `(3, 4)`, each part on its own.
- The test's name says what a difference means: it's the step that takes you from `other` to `this`. From `(2, 3)`, a step of `(3, 4)` lands on `(5, 7)`.

```check
run "npx vitest run src" exit=1 stderr="subtract is not a function"
```

## subtract

Change `src/engine/vec2.ts`:

```ts file=src/engine/vec2.ts
export class Vec2 {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  scale(factor: number): Vec2 {
    return new Vec2(this.x * factor, this.y * factor);
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  normalized(): Vec2 {
    const length = this.length();
    return length === 0 ? new Vec2(0, 0) : this.scale(1 / length);
  }
}
```

- `subtract` is `add` with `-` in place of `+`: a new `Vec2` of the two differences. Neither vector changes, as with every `Vec2` method (lesson 1.1).

```check
run "npx vitest run src" stdout="102 passed"
```

## A transform: a test

Create `src/engine/transform.test.ts`:

```ts file=src/engine/transform.test.ts
import { expect, test } from 'vitest';
import { Transform } from './transform';
import { Vec2 } from './vec2';

test('a transform puts a point at origin + x steps along the x axis + y steps along the y axis', () => {
  const t = new Transform(new Vec2(2, 0), new Vec2(0, 3), new Vec2(100, 50));
  expect(t.apply(new Vec2(10, 1))).toEqual(new Vec2(120, 53));
  expect(t.applyToDirection(new Vec2(10, 1))).toEqual(new Vec2(20, 3));
});
```

- The first test builds a transform by hand: x steps of `(2, 0)`, y steps of `(0, 3)`, origin `(100, 50)`. So the paper is stretched 2 times across and 3 times down.
  - `apply(new Vec2(10, 1))`: start at `(100, 50)`, take 10 x steps (`(20, 0)`) and 1 y step (`(0, 3)`): `(120, 53)`.
  - `applyToDirection(new Vec2(10, 1))` is the same without the origin: `(20, 3)`. More on why below.
  - These numbers are exact, so `toEqual` is fine.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './transform'"
```

## The Transform class

Create `src/engine/transform.ts`:

```ts file=src/engine/transform.ts
import { Vec2 } from './vec2';

export class Transform {
  constructor(
    readonly xAxis: Vec2,
    readonly yAxis: Vec2,
    readonly origin: Vec2,
  ) {}

  applyToDirection(direction: Vec2): Vec2 {
    return this.xAxis.scale(direction.x).add(this.yAxis.scale(direction.y));
  }

  apply(point: Vec2): Vec2 {
    return this.origin.add(this.applyToDirection(point));
  }
}
```

- `class Transform` has three properties, each a `Vec2`: `xAxis`, `yAxis` and `origin`. The constructor declares and sets them in one go, with `readonly` before each parameter, as the store's constructor does (lesson 4.2). `readonly` means they can't be changed afterwards: a transform never changes; a new one is made instead, like a `Vec2`.
- `applyToDirection(direction)` takes `direction.x` x steps and `direction.y` y steps, and adds them: `xAxis.scale(direction.x).add(yAxis.scale(direction.y))`.
- `apply(point)` is the same, starting from the origin: `origin.add(applyToDirection(point))`.
- Why two methods: a **point** is a place, and moving the paper moves it. A **direction** is a step, like "10 pixels right" or a velocity, and has no place: moving the paper doesn't change a step, but turning or stretching does. `then` and lesson 5.5's dragging need directions.

```check
run "npx vitest run src" stdout="103 passed"
run "npx tsc"
```

## The identity: a test

Add a test to `src/engine/transform.test.ts`:

```ts file=src/engine/transform.test.ts
import { expect, test } from 'vitest';
import { IDENTITY, Transform } from './transform';
import { Vec2 } from './vec2';

test('a transform puts a point at origin + x steps along the x axis + y steps along the y axis', () => {
  const t = new Transform(new Vec2(2, 0), new Vec2(0, 3), new Vec2(100, 50));
  expect(t.apply(new Vec2(10, 1))).toEqual(new Vec2(120, 53));
  expect(t.applyToDirection(new Vec2(10, 1))).toEqual(new Vec2(20, 3));
});

test('the identity changes nothing', () => {
  expect(IDENTITY.apply(new Vec2(7, -4))).toEqual(new Vec2(7, -4));
});
```

- The second test: the **identity** is the transform that changes nothing: x steps `(1, 0)`, y steps `(0, 1)`, origin `(0, 0)`.

```check
run "npx vitest run src" exit=1 stderr="Cannot read properties of undefined (reading 'apply')"
```

`IDENTITY` isn't exported yet, so the import gives `undefined`, and calling a method on `undefined` throws.

## IDENTITY

Change `src/engine/transform.ts`:

```ts file=src/engine/transform.ts
import { Vec2 } from './vec2';

export class Transform {
  constructor(
    readonly xAxis: Vec2,
    readonly yAxis: Vec2,
    readonly origin: Vec2,
  ) {}

  applyToDirection(direction: Vec2): Vec2 {
    return this.xAxis.scale(direction.x).add(this.yAxis.scale(direction.y));
  }

  apply(point: Vec2): Vec2 {
    return this.origin.add(this.applyToDirection(point));
  }
}

export const IDENTITY = new Transform(new Vec2(1, 0), new Vec2(0, 1), new Vec2(0, 0));
```

- `export const IDENTITY` is the transform that changes nothing. It's made once, after the class, and shared: it can't change, so sharing it is safe.

```check
run "npx vitest run src" stdout="104 passed"
```

## A node's transform: a test

Add a test to `src/engine/transform.test.ts`:

```ts file=src/engine/transform.test.ts
import { expect, test } from 'vitest';
import { IDENTITY, Transform, transformOf } from './transform';
import { Vec2 } from './vec2';

function expectNear(actual: Vec2, x: number, y: number): void {
  expect(actual.x).toBeCloseTo(x);
  expect(actual.y).toBeCloseTo(y);
}

test('a transform puts a point at origin + x steps along the x axis + y steps along the y axis', () => {
  const t = new Transform(new Vec2(2, 0), new Vec2(0, 3), new Vec2(100, 50));
  expect(t.apply(new Vec2(10, 1))).toEqual(new Vec2(120, 53));
  expect(t.applyToDirection(new Vec2(10, 1))).toEqual(new Vec2(20, 3));
});

test('the identity changes nothing', () => {
  expect(IDENTITY.apply(new Vec2(7, -4))).toEqual(new Vec2(7, -4));
});

test('transformOf moves, turns clockwise by degrees, and stretches each axis', () => {
  const t = transformOf(new Vec2(100, 50), 90, new Vec2(2, 3));
  expectNear(t.xAxis, 0, 2);
  expectNear(t.yAxis, -3, 0);
  expectNear(t.apply(new Vec2(10, 0)), 100, 70);
  expectNear(t.apply(new Vec2(0, 10)), 70, 50);
});
```

- `expectNear(actual, x, y)` is a helper for the tests: it checks both parts of a vector with `toBeCloseTo` (lesson 1.4), which accepts tiny differences.
  - Why not `toEqual`: turning needs `Math.cos` and `Math.sin`, and computers store most numbers with a tiny error. The cosine of 90° should be 0; JavaScript gives `6.123233995736766e-17`, which is 0.00000000000000006. A drawing can't show the difference, but `toEqual` would fail.
- The third test: `transformOf(position, rotation, scale)` makes a node's transform from its three settings. Rotation is in degrees. Here: at `(100, 50)`, turned 90°, stretched 2 across and 3 down.
  - Its x step must be `(0, 2)`: turned a quarter turn, the x axis points down the screen, and it's 2 long.
  - Its y step must be `(-3, 0)`: the y axis now points left, 3 long.
  - So `(10, 0)` lands at `(100, 70)`: 20 pixels below the origin. And `(0, 10)` lands at `(70, 50)`: 30 pixels to its left.
  - Turning the x axis from right to down is a **clockwise** turn on screen. Screen y grows downwards, so positive angles turn clockwise, as in Phaser and Godot.

```check
run "npx vitest run src" exit=1 stderr="transformOf is not a function"
```

## transformOf

Change `src/engine/transform.ts`:

```ts file=src/engine/transform.ts
import { Vec2 } from './vec2';

export class Transform {
  constructor(
    readonly xAxis: Vec2,
    readonly yAxis: Vec2,
    readonly origin: Vec2,
  ) {}

  applyToDirection(direction: Vec2): Vec2 {
    return this.xAxis.scale(direction.x).add(this.yAxis.scale(direction.y));
  }

  apply(point: Vec2): Vec2 {
    return this.origin.add(this.applyToDirection(point));
  }
}

export const IDENTITY = new Transform(new Vec2(1, 0), new Vec2(0, 1), new Vec2(0, 0));

export function transformOf(position: Vec2, rotation: number, scale: Vec2): Transform {
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Transform(new Vec2(cos, sin).scale(scale.x), new Vec2(-sin, cos).scale(scale.y), position);
}
```

- `transformOf(position, rotation, scale)` makes a node's transform:
  - `Math.PI` is π, about 3.14159. `Math.cos` and `Math.sin` measure angles in **radians**, where a half turn is π, so `rotation * Math.PI / 180` turns degrees into radians: 90° becomes π / 2.
  - `Math.cos(angle)` and `Math.sin(angle)` are where a step of length 1 ends up when it's turned by `angle`: `(cos, sin)`. For 0° that's `(1, 0)`; for 90°, `(0, 1)`. That's the turned x step.
  - The y step is always a quarter turn further on: `(-sin, cos)`. For 0° that's `(0, 1)`; for 90°, `(-1, 0)`.
  - Each is then stretched by its own part of the scale: `.scale(scale.x)` and `.scale(scale.y)`. A scale of `(2, 1)` makes the node twice as wide, not twice as tall.
  - The origin is the position.

```check
run "npx vitest run src" stdout="105 passed"
run "npx tsc"
```

## One transform after another: a test

Add a test to `src/engine/transform.test.ts`:

```ts file=src/engine/transform.test.ts
import { expect, test } from 'vitest';
import { IDENTITY, Transform, transformOf } from './transform';
import { Vec2 } from './vec2';

function expectNear(actual: Vec2, x: number, y: number): void {
  expect(actual.x).toBeCloseTo(x);
  expect(actual.y).toBeCloseTo(y);
}

test('a transform puts a point at origin + x steps along the x axis + y steps along the y axis', () => {
  const t = new Transform(new Vec2(2, 0), new Vec2(0, 3), new Vec2(100, 50));
  expect(t.apply(new Vec2(10, 1))).toEqual(new Vec2(120, 53));
  expect(t.applyToDirection(new Vec2(10, 1))).toEqual(new Vec2(20, 3));
});

test('the identity changes nothing', () => {
  expect(IDENTITY.apply(new Vec2(7, -4))).toEqual(new Vec2(7, -4));
});

test('transformOf moves, turns clockwise by degrees, and stretches each axis', () => {
  const t = transformOf(new Vec2(100, 50), 90, new Vec2(2, 3));
  expectNear(t.xAxis, 0, 2);
  expectNear(t.yAxis, -3, 0);
  expectNear(t.apply(new Vec2(10, 0)), 100, 70);
  expectNear(t.apply(new Vec2(0, 10)), 70, 50);
});

test('inner.then(outer) does the inner transform, then the outer one', () => {
  const inner = transformOf(new Vec2(10, 0), 30, new Vec2(1, 2));
  const outer = transformOf(new Vec2(100, 50), 90, new Vec2(2, 2));
  const point = new Vec2(3, 4);
  const both = inner.then(outer);
  const expected = outer.apply(inner.apply(point));
  expectNear(both.apply(point), expected.x, expected.y);
});
```

- The fourth test: `inner.then(outer)` must be one transform that does `inner`, then `outer`. That's how a child's placement in its parent and the parent's placement in the world combine. The test checks it against doing the two one after the other, on one point.

```check
run "npx vitest run src" exit=1 stderr="inner.then is not a function"
```

## then

Change `src/engine/transform.ts`:

```ts file=src/engine/transform.ts
import { Vec2 } from './vec2';

export class Transform {
  constructor(
    readonly xAxis: Vec2,
    readonly yAxis: Vec2,
    readonly origin: Vec2,
  ) {}

  applyToDirection(direction: Vec2): Vec2 {
    return this.xAxis.scale(direction.x).add(this.yAxis.scale(direction.y));
  }

  apply(point: Vec2): Vec2 {
    return this.origin.add(this.applyToDirection(point));
  }

  then(outer: Transform): Transform {
    return new Transform(outer.applyToDirection(this.xAxis), outer.applyToDirection(this.yAxis), outer.apply(this.origin));
  }
}

export const IDENTITY = new Transform(new Vec2(1, 0), new Vec2(0, 1), new Vec2(0, 0));

export function transformOf(position: Vec2, rotation: number, scale: Vec2): Transform {
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Transform(new Vec2(cos, sin).scale(scale.x), new Vec2(-sin, cos).scale(scale.y), position);
}
```

- `then(outer)` combines two transforms. Doing `this`, then `outer`, means:
  - the combined x step is `this.xAxis`, a direction, put through `outer`: `outer.applyToDirection(this.xAxis)`; the same for the y step;
  - the combined origin is `this.origin`, a point, put through `outer`: `outer.apply(this.origin)`.
  - For example, a wheel at `(10, 0)` on a car at `(100, 50)` turned 90°: the wheel's origin `(10, 0)` through the car's transform is `(100, 60)`, and the wheel's x step `(1, 0)` turned with the car is `(0, 1)`. The wheel is turned too.

```check
run "npx vitest run src" stdout="106 passed"
run "npx tsc"
```

## Working backwards: a test

Add a test to `src/engine/transform.test.ts`:

```ts file=src/engine/transform.test.ts
import { expect, test } from 'vitest';
import { IDENTITY, Transform, transformOf } from './transform';
import { Vec2 } from './vec2';

function expectNear(actual: Vec2, x: number, y: number): void {
  expect(actual.x).toBeCloseTo(x);
  expect(actual.y).toBeCloseTo(y);
}

test('a transform puts a point at origin + x steps along the x axis + y steps along the y axis', () => {
  const t = new Transform(new Vec2(2, 0), new Vec2(0, 3), new Vec2(100, 50));
  expect(t.apply(new Vec2(10, 1))).toEqual(new Vec2(120, 53));
  expect(t.applyToDirection(new Vec2(10, 1))).toEqual(new Vec2(20, 3));
});

test('the identity changes nothing', () => {
  expect(IDENTITY.apply(new Vec2(7, -4))).toEqual(new Vec2(7, -4));
});

test('transformOf moves, turns clockwise by degrees, and stretches each axis', () => {
  const t = transformOf(new Vec2(100, 50), 90, new Vec2(2, 3));
  expectNear(t.xAxis, 0, 2);
  expectNear(t.yAxis, -3, 0);
  expectNear(t.apply(new Vec2(10, 0)), 100, 70);
  expectNear(t.apply(new Vec2(0, 10)), 70, 50);
});

test('inner.then(outer) does the inner transform, then the outer one', () => {
  const inner = transformOf(new Vec2(10, 0), 30, new Vec2(1, 2));
  const outer = transformOf(new Vec2(100, 50), 90, new Vec2(2, 2));
  const point = new Vec2(3, 4);
  const both = inner.then(outer);
  const expected = outer.apply(inner.apply(point));
  expectNear(both.apply(point), expected.x, expected.y);
});

test('toLocal undoes apply', () => {
  const t = transformOf(new Vec2(100, 50), 30, new Vec2(2, 0.5));
  expectNear(t.toLocal(t.apply(new Vec2(12, -7))), 12, -7);
});
```

- The fifth test: `toLocal` must undo `apply`. Given a point in the parent, it finds the point on the node's own paper that lands there.

```check
run "npx vitest run src" exit=1 stderr="t.toLocal is not a function"
```

## toLocal

Change `src/engine/transform.ts`:

```ts file=src/engine/transform.ts
import { Vec2 } from './vec2';

export class Transform {
  constructor(
    readonly xAxis: Vec2,
    readonly yAxis: Vec2,
    readonly origin: Vec2,
  ) {}

  applyToDirection(direction: Vec2): Vec2 {
    return this.xAxis.scale(direction.x).add(this.yAxis.scale(direction.y));
  }

  apply(point: Vec2): Vec2 {
    return this.origin.add(this.applyToDirection(point));
  }

  then(outer: Transform): Transform {
    return new Transform(outer.applyToDirection(this.xAxis), outer.applyToDirection(this.yAxis), outer.apply(this.origin));
  }

  toLocal(point: Vec2): Vec2 {
    const offset = point.subtract(this.origin);
    const area = cross(this.xAxis, this.yAxis);
    return new Vec2(cross(offset, this.yAxis) / area, cross(this.xAxis, offset) / area);
  }
}

export const IDENTITY = new Transform(new Vec2(1, 0), new Vec2(0, 1), new Vec2(0, 0));

export function transformOf(position: Vec2, rotation: number, scale: Vec2): Transform {
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Transform(new Vec2(cos, sin).scale(scale.x), new Vec2(-sin, cos).scale(scale.y), position);
}

function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}
```

- `toLocal(point)` works backwards: which point `(u, v)` on the paper lands on `point`?
  - `offset` is the step from the origin to the point: `point.subtract(this.origin)`. It's `u` x steps plus `v` y steps, and `u` and `v` are what we're looking for.
  - `cross(a, b)` is `a.x * b.y - a.y * b.x`. It's the **area** of the slanted box (a **parallelogram**) with sides `a` and `b`, negative when `b` is anticlockwise from `a`. For x steps `(2, 0)` and y steps `(0, 3)`, it's `2 * 3 - 0 * 0 = 6`: the paper's squares have an area of 6.
  - The area of a box made from `offset` and the y step only counts how many x steps `offset` has in it, because the y steps in `offset` lie along the box's other side and add no area. So `cross(offset, yAxis)` is `u` times the area of one square, and `u = cross(offset, yAxis) / area`. In the same way, `v = cross(xAxis, offset) / area`.
  - Checked with the first test's numbers: `(120, 53)` minus the origin is `(20, 3)`; `cross((20, 3), (0, 3)) = 20 * 3 - 3 * 0 = 60`, and 60 / 6 = 10. `cross((2, 0), (20, 3)) = 2 * 3 - 0 * 20 = 6`, and 6 / 6 = 1. Back to `(10, 1)`.
  - If the scale is 0, the paper is flat, the area is 0, and the division gives `Infinity` or `NaN` ("not a number"). A box with no size can't be under a point anyway.


```check
run "npx vitest run src" stdout="107 passed"
run "npx tsc"
```

## Rotation and scale on Node2D: a test

Change `src/engine/node2d.test.ts`:

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

test('a turned, stretched parent turns and stretches what it carries', () => {
  const car = new Node2D('car');
  const wheel = new Node2D('wheel');
  car.addChild(wheel);
  car.position = new Vec2(100, 50);
  car.rotation = 90;
  car.scale = new Vec2(2, 2);
  wheel.position = new Vec2(10, 0);
  expect(wheel.globalPosition.x).toBeCloseTo(100);
  expect(wheel.globalPosition.y).toBeCloseTo(70);
  expect(car.rotation).toBe(90);
  expect(new Node2D('n').scale).toEqual(new Vec2(1, 1));
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

- The new test is the fourth. A car at `(100, 50)`, turned 90° and twice the size, carries a wheel 10 pixels to its right.
- With the car turned a quarter turn clockwise, the car's right is down the screen, and twice the size makes the 10 pixels 20. So the wheel must be at `(100, 70)`.
- It also checks that `rotation` is a plain number, and that a new node's scale is `(1, 1)`: its normal size.
- The earlier tests stay: with no turning or stretching, a global position is still the sum of the positions above.

```check
run "npx vitest run src" exit=1 stderr="expected 110 to be close to 100"
```

`globalPosition` still only adds positions, so the wheel is put 10 to the right, at x = 110.

## Node2D's transform

Change `src/engine/node2d.ts`:

```ts file=src/engine/node2d.ts
import { Node } from './node';
import { IDENTITY, transformOf, type Transform } from './transform';
import { Vec2 } from './vec2';

export class Node2D extends Node {
  position = new Vec2(0, 0);
  rotation = 0;
  scale = new Vec2(1, 1);

  get transform(): Transform {
    return transformOf(this.position, this.rotation, this.scale);
  }

  get parentTransform(): Transform {
    let above = this.parent;
    while (above && !(above instanceof Node2D)) above = above.parent;
    return above instanceof Node2D ? above.globalTransform : IDENTITY;
  }

  get globalTransform(): Transform {
    return this.transform.then(this.parentTransform);
  }

  get globalPosition(): Vec2 {
    return this.globalTransform.origin;
  }
}
```

- Two new settings: `rotation = 0` (degrees, a `number`) and `scale = new Vec2(1, 1)`.
- `get transform()` is the node's placement in its parent: `transformOf(position, rotation, scale)`. It's a getter (lesson 1.3), so it's worked out each time it's read, and always matches the three settings.
- `get parentTransform()` is the placement of the parent's paper in the world:
  - The `while` loop is lesson 1.3's: it climbs past any plain `Node`s to the nearest `Node2D` above.
  - If there is one, its `globalTransform`; if not, `IDENTITY`: the node's parent is the world itself.
- `get globalTransform()` is this node's placement in the world: its own transform, `then` its parent's. The parent's `globalTransform` is worked out the same way, so a node deep in the tree combines every transform above it.
- `get globalPosition()` is now the global transform's origin: where the node's `(0, 0)` lands in the world. With no turning or stretching that's the sum of the positions, as before, so the old tests still pass.
- Why keep `parentTransform` separate: lesson 5.5's dragging needs it on its own, to turn a move on screen into a move in the parent.

```check
run "npx vitest run src" exit=1 stderr="Node2D.rotation: not in the registry"
```

```predict
question: Every Node2D now has rotation and scale. Which tests fail, and why?
choice: None: the registry only lists what the inspector shows
choice: The two registry tests: the engine has settings the registry doesn't list
choice: Every inspector test: the inspector shows new fields
answer: The two registry tests: the engine has settings the registry doesn't list
explain: Lesson 4.6's registryProblems builds a node of every type and lists any number or Vec2 field the registry doesn't describe. Node2D, Box and Player all have rotation and scale now, so the engine's registry test and the player's test both fail. The inspector tests only look for fields that are still there.
```

```text
AssertionError: expected [ …(4) ] to deeply equal []
+   "Node2D.rotation: not in the registry",
+   "Node2D.scale: not in the registry",
+   "Box.rotation: not in the registry",
+   "Box.scale: not in the registry",
```

The test from lesson 4.6 did its job: the engine changed, and the registry must follow.

## The registry's tests

The registry's own tests name Box's properties in order. Change `src/engine/registry.test.ts`:

```ts file=src/engine/registry.test.ts
import { expect, test } from 'vitest';
import { ENGINE_MAKERS } from './build';
import { ENGINE_TYPES, propsOf, propValue, registryProblems } from './registry';

test("a type's properties are its base's, then its own", () => {
  expect(propsOf(ENGINE_TYPES, 'Node').map((p) => p.name)).toEqual([]);
  expect(propsOf(ENGINE_TYPES, 'Box').map((p) => p.name)).toEqual(['position', 'rotation', 'scale', 'size', 'color']);
});

test('a type that is not registered is an error', () => {
  expect(() => propsOf(ENGINE_TYPES, 'Car')).toThrow('There is no node type "Car"');
});

test("a property's value is the scene's, or else its default", () => {
  const [, , , size, color] = propsOf(ENGINE_TYPES, 'Box');
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

- Box's properties are now, in order: `position`, `rotation` and `scale` from `Node2D`, then `size` and `color` from `Box`.
- `const [, , , size, color] = …` takes the fourth and fifth: each comma with nothing before it skips one item (lesson 4.6 skipped one; now three).

```check
run "npx vitest run src" exit=1 stderr="to deeply equal [ 'position', 'rotation'"
```

## Rotation and scale in the registry

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
  [
    'Node2D',
    {
      base: 'Node',
      props: [
        { name: 'position', kind: 'vec2', default: { x: 0, y: 0 } },
        { name: 'rotation', kind: 'number', default: 0 },
        { name: 'scale', kind: 'vec2', default: { x: 1, y: 1 } },
      ],
    },
  ],
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

- `Node2D` lists three properties now:
  - `rotation`, of kind `'number'`, default `0`;
  - `scale`, of kind `'vec2'`, default `{ x: 1, y: 1 }`.
- `Box` and the player get them through `base`, as they got `position`.
- Nothing else changes. The inspector is drawn from the registry, so it now shows a rotation box and two scale boxes for every node, and editing them works like any other field. That's the data-driven inspector of lesson 4.6 paying off: no inspector code changed.

```check
run "npx vitest run src" stdout="108 passed"
run "npx tsc"
```

Run `npm start` and select the wall. The inspector shows rotation and scale. Changing them changes the scene's data, but the wall is still drawn straight: drawing still uses only the position. That's the next lesson.

## Commit

```powershell
git add .
git commit -m "Transforms: Node2D has rotation and scale; children turn and stretch with their parents"
```

```check
git-clean
git-tracked src/engine/transform.ts
```

## Challenge: the angle the other way

**Optional, ★★.** Add a `globalRotation` getter to `Node2D`: the node's angle in the world, in degrees. Test first: a node turned 30° inside a parent turned 45° is at 75°. Can you get it from `globalTransform` alone, without adding up the rotations of the nodes above?

```hints
nudge: The global x step points the way the node faces.
concept: Math.atan2(y, x) gives the angle, in radians, of the step (x, y).
shape: const x = this.globalTransform.xAxis; return Math.atan2(x.y, x.x) * 180 / Math.PI;
```
