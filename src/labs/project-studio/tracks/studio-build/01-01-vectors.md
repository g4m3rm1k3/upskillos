---
title: 1.1 — Vectors: Where Things Are, and Where They're Going
track: Build Your Own Game Studio
runtime: none
concepts: classes, vectors, floating-point, tdd
problem: Every object in a game has a place on the screen, and many are moving. A place is two numbers, and so is a movement. How do you store them, add them and measure them without writing x and y out by hand every time?
---

Sprint 1 builds the **engine**, the part of the studio that runs a game. At the start of a sprint, the team holds a **sprint planning** meeting: it picks the stories it can finish and works out the order. Sprint 1's stories are in `BACKLOG.md`, and they depend on each other. Nothing can be drawn until there are things to draw, and things can't move until there's a way to say where they are. So the sprint starts at the bottom, with the smallest piece every other piece uses: the **vector**.

## Where things are on a screen

A screen is a grid of **pixels**, tiny squares of colour. A place on it is two numbers:

- **x** counts pixels from the left edge, going right.
- **y** counts pixels from the top edge, going **down**. In school maths y goes up. On screens it goes down, because screens are drawn line by line from the top. Every game engine you'll meet does this.
- So `(0, 0)` is the top-left corner, and `(100, 50)` is 100 pixels right and 50 down.

A pair of numbers like this is a **vector**. The same type stores two different things in a game:

- A **position**: where something is, `(100, 50)`.
- A **velocity**: how far it moves each second, in x and in y. `(120, 0)` means 120 pixels a second to the right. `(0, -200)` means 200 pixels a second up, because up is negative y.

The engine needs one type for both, with the arithmetic games do on them. Tests first: create `src/engine/vec2.test.ts` (make the `engine` folder inside `src`):

```ts file=src/engine/vec2.test.ts
import { expect, test } from 'vitest';
import { Vec2 } from './vec2';

test('a vector holds x and y', () => {
  const v = new Vec2(3, 4);
  expect(v.x).toBe(3);
  expect(v.y).toBe(4);
});
```

- `new Vec2(3, 4)` will make a vector with x 3 and y 4. `Vec2` doesn't exist yet: the test says how it should be used before it's written.
- `const v` names the new vector. `v.x` reads its x.

Run the tests: `npm test`.

```text
 FAIL  src/engine/vec2.test.ts [ src/engine/vec2.test.ts ]
Error: Cannot find module './vec2' imported from …/src/engine/vec2.test.ts
```

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './vec2'" label="the test fails: there is no vec2.ts yet"
```

## A class

Create `src/engine/vec2.ts`:

```ts file=src/engine/vec2.ts
export class Vec2 {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
```

- A **class** is a template for making objects of one shape. `class Vec2 { … }` declares the template; `new Vec2(3, 4)` makes one object from it, an **instance**.
- `x: number;` and `y: number;` declare **fields**: every `Vec2` object holds a property `x` and a property `y`, both numbers.
- The **constructor** is the function `new` calls to fill in a new object. `new Vec2(3, 4)` makes an empty object, then runs `constructor(3, 4)`.
- Inside it, `this` is the object being made. `this.x = x` copies the parameter `x` (3) into the new object's field `x`. After the constructor, the object is `{ x: 3, y: 4 }`.
- `export` makes the class importable, as with `greet` in Sprint 0.

Run `npm test`: `3 passed`, greet's two tests and this one.

```check
run "npx vitest run src" stdout="3 passed"
run "npx tsc"
```

## Moving: tests for add and scale

Each frame, a moving object's new position is its old position plus the distance moved. The distance is its velocity multiplied by the time that passed, in seconds. In vector terms:

- **add**: `(100, 50) + (2, 0) = (102, 50)`. Add the x's, add the y's.
- **scale**, multiply by one number: `(120, 0) × 0.5 = (60, 0)`. Half a second at 120 pixels a second is 60 pixels.

Add the tests to `src/engine/vec2.test.ts`:

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

test('scale multiplies both parts', () => {
  const velocity = new Vec2(120, 0);
  expect(velocity.scale(0.5)).toEqual(new Vec2(60, 0));
});
```

- `toEqual` compares two objects field by field: same `x`, same `y`. `toBe` would fail here even with equal numbers, because it asks whether they're *the same object*, and two `new Vec2`s are two objects.
- The second `expect` in the add test says `add` must not change `position`. That's a design decision, explained in the next step.

```check
run "npx vitest run src" exit=1 stderr="position.add is not a function" label="the new tests fail: Vec2 has no add yet"
```

## Moving: add and scale

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

  scale(factor: number): Vec2 {
    return new Vec2(this.x * factor, this.y * factor);
  }
}
```

- `add(other: Vec2): Vec2` is a **method**: a function stored in the class and called on an instance, `position.add(…)`. Inside it, `this` is the vector it was called on (`position`), and `other` is the argument.
- It returns a **new** `Vec2`, built from the two sums. It never assigns to `this.x` or `this.y`, so `position` is the same before and after.
- Why not change `position` instead? Two objects often share one vector: a coin placed at the player's position. If `add` changed vectors in place, moving the player would silently move the coin too. Returning new vectors makes that mistake impossible.
- `scale(factor: number)` multiplies both parts by one number and returns the result, also new.
- The fields can still be changed directly, `position.x = 10`, for when you mean to.

```check
run "npx vitest run src" stdout="5 passed"
run "npx tsc"
```

## Length, and direction: tests

Two more things games ask of vectors:

- **How long is it?** For a velocity, that's the speed. For the gap between two positions, it's the distance. By Pythagoras' theorem, a vector `(3, 4)` is `√(3² + 4²) = √25 = 5` long.
- **Which way does it point?** A **normalized** vector, also called a **unit** vector, points the same way with length exactly 1. Divide both parts by the length: `(3, 4)` becomes `(3/5, 4/5) = (0.6, 0.8)`. Multiply it by a speed to get a velocity of exactly that speed, in that direction.

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
```

- `toBeCloseTo` passes if the numbers agree to 2 decimal places, instead of exactly. The next step shows why exact fails here.

```check
run "npx vitest run src" exit=1 stderr="length is not a function" label="the new tests fail: no length or normalized yet"
```

## Length and direction

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

  scale(factor: number): Vec2 {
    return new Vec2(this.x * factor, this.y * factor);
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  normalized(): Vec2 {
    return this.scale(1 / this.length());
  }
}
```

- `Math.hypot(x, y)` is JavaScript's built-in `√(x² + y²)`: the **hypotenuse**, the long side of a right-angled triangle whose other sides are x and y.
- `normalized` reuses `scale`: dividing by the length is the same as multiplying by `1 / length`. A method can call another method on the same object through `this`.

```predict
question: What does 3 * (1 / 5) give in JavaScript?
choice: 0.6
choice: 0.6000000000000001
choice: 0.5999999999999999
answer: 0.6000000000000001
explain: JavaScript stores numbers in binary, with about 16 significant digits. 1/5 has no exact binary form (as 1/3 has no exact decimal form), so it's stored as the nearest binary number, slightly too big. Times 3, the error shows in the last digit. toBe(0.6) would fail; toBeCloseTo(0.6) passes.
```

- Numbers with a fractional part are stored as **floating-point** numbers: binary fractions with a fixed number of digits. Most decimals, like 0.2 or 0.1, can't be stored exactly, so arithmetic on them gains tiny errors: `0.1 + 0.2` is `0.30000000000000004`.
- Games do arithmetic like this millions of times. The rule: never compare fractional results with `===` or `toBe`. Compare with a tolerance, as `toBeCloseTo` does.

Run `npm test`: `7 passed`.

```check
run "npx vitest run src" stdout="7 passed"
```

## The zero vector

A standing-still object has velocity `(0, 0)`. Its direction should be `(0, 0)` too: no direction at all. Add the test at the end of the file:

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

```predict
question: What does new Vec2(0, 0).normalized() return now?
choice: (0, 0)
choice: An error: division by zero
choice: (NaN, NaN)
answer: (NaN, NaN)
explain: length() is 0, so 1 / 0 is Infinity (JavaScript doesn't stop on division by zero), and 0 × Infinity is NaN, "not a number". A NaN position makes the object vanish from the screen, and every sum with NaN is NaN, so it spreads to whatever touches it.
```

```text
AssertionError: expected Vec2{ x: NaN, y: NaN } to deeply equal Vec2{ x: +0, y: +0 }
```

- **NaN** ("not a number") is a special number value meaning "no meaningful result". Any arithmetic with NaN gives NaN, so one NaN spreads through every calculation it touches. In a game, a NaN position makes an object vanish with no error. That's why this test exists.

```check
run "npx vitest run src" exit=1 stderr="x: NaN" label="the zero-vector test fails with NaN"
```

## Guarding against zero

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

- `const length = this.length()` keeps the length in a local variable, so it's worked out once and used twice.
- `length === 0 ? … : …` is the conditional operator from lesson 0.4: the zero vector gets `(0, 0)`, every other vector the division.
- Comparing with `=== 0` is safe here even though `length` is a float: the only vector with length exactly 0 is `(0, 0)` itself.

```check
run "npx vitest run src" stdout="8 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "Vec2: positions and velocities, with add, scale, length and normalized"
```

No story is ticked: a vector is part of every Sprint 1 story, and finishes none of them on its own.

```check
git-clean
git-tracked src/engine/vec2.ts
```

## Challenge: subtract and distance

**Optional, ★★.** Add `sub(other)` (the vector from `other` to `this`, like add with minus) and `distanceTo(other)` (how far apart two positions are). Test first: `new Vec2(5, 5).sub(new Vec2(2, 1))` is `(3, 4)`, and the distance from `(2, 1)` to `(5, 5)` is 5. Games use `distanceTo` all the time: *is the enemy close enough to see the player?*

```hints
nudge: The distance between two positions is the length of the vector from one to the other.
concept: Methods that build on methods: distanceTo is sub, then length.
shape: sub(other: Vec2): Vec2 { return new Vec2(this.x - other.x, this.y - other.y); } — distanceTo(other: Vec2): number { return this.sub(other).length(); }
```
