---
title: 1.5 — The Game Loop: Fixed Time Steps
track: Build Your Own Game Studio
runtime: none
concepts: game-loop, fixed-timestep, accumulator, determinism
problem: With delta time, a ball rolls at the same speed everywhere. But a jump doesn't reach the same height at 30 and 144 frames a second, and one slow frame can carry a player straight through a wall. How do professional engines make every computer play exactly the same game?
---

The **game loop** is the heart of every engine. Over and over, as long as the game runs, it does: *how much time has passed? Update everything by that much. Draw the frame.* Lesson 1.4 built the "update everything" part. This lesson builds the part that decides *how* the time is handed out, because handing it out as one `dt` per frame has two problems.

**Problem 1: a slow frame is a big jump.** If the computer stalls for a fifth of a second (another program is busy), the next frame's `dt` is 0.2, and a ball at 600 pixels a second moves 120 pixels in one update. A wall 20 pixels thick is never touched: the ball is on one side, then on the other. This is called **tunnelling**.

**Problem 2: different frame rates give different games.** A jump changes the velocity every update (gravity pulls it down) and the position by the velocity. Worked out with each frame's `dt`, a jump that should rise 120 pixels rises:

| Frames a second | Height of the jump |
|---|---|
| 30 | 110.0 pixels |
| 60 | 115.0 pixels |
| 144 | 117.9 pixels |

- Each update takes the velocity as it was at that moment and uses it for the whole step. Bigger steps miss more of the curve, so slower screens jump lower.
- A ledge 115 pixels up can be reached on a 144-frame screen but not on a 30-frame one. The same level plays differently on different computers.
- Later in the series this matters even more. Kart Circuit's ghost replays your best lap from your recorded key presses, and its Q-learning drivers train over thousands of laps. Both only work if the same inputs always give exactly the same game, which is called **determinism**.

**The answer: a fixed time step.** The engine always updates in steps of the same size, say 1/60 of a second, whatever the screen does:

- It keeps the time that hasn't been used yet: the **accumulator**.
- Each frame, it adds the frame's time to the accumulator, then takes whole steps out of it, one update per step.
- What's left over, less than one step, stays for the next frame.
- At 144 frames a second, most frames take no step and some take one. At 30, each frame takes two. Either way, 60 updates happen each second, each exactly 1/60 s long, so every computer computes exactly the same jump.

## A loop that counts steps: tests

The loop doesn't call `updateTree` itself. It only answers *how many steps this frame?*, which makes it easy to test with made-up times. Create `src/engine/loop.test.ts`:

```ts file=src/engine/loop.test.ts
import { expect, test } from 'vitest';
import { FixedLoop } from './loop';

test('a step is one part of a second', () => {
  expect(new FixedLoop(4).step).toBe(0.25);
});

test('advance takes whole steps and keeps what is left for later', () => {
  const loop = new FixedLoop(4);
  expect(loop.advance(0.125)).toBe(0);
  expect(loop.advance(0.25)).toBe(1);
  expect(loop.advance(0.125)).toBe(1);
});
```

- The tests use 4 steps a second, so a step is 0.25 s and the arithmetic is easy to follow. The game will use 60.
- Trace the second test:
  - `advance(0.125)`: the accumulator holds 0.125 s, less than a step. 0 steps; the 0.125 s waits.
  - `advance(0.25)`: 0.125 + 0.25 = 0.375 s holds 1 whole step. 1 step; 0.125 s left over.
  - `advance(0.125)`: 0.125 + 0.125 = 0.25 s, exactly one step. 1 step; nothing left.
- The test's times are 1/8 and 1/4 of a second. Halves of halves are stored exactly in binary, so the arithmetic has no floating-point error (lesson 1.1) and the trace is exact. Real frame times aren't so tidy, and a sum can land a hair under a whole step. That costs nothing: the time stays in the accumulator and is taken in the next frame.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './loop'"
```

## The accumulator

Create `src/engine/loop.ts`:

```ts file=src/engine/loop.ts
export class FixedLoop {
  readonly step: number;
  private leftover = 0;

  constructor(stepsPerSecond: number) {
    this.step = 1 / stepsPerSecond;
  }

  advance(seconds: number): number {
    this.leftover += seconds;
    let steps = 0;
    while (this.leftover >= this.step) {
      this.leftover -= this.step;
      steps++;
    }
    return steps;
  }
}
```

- `readonly step: number` can be set in the constructor and never again. A step size that changed while the game ran would break determinism, so TypeScript is told to forbid it: `loop.step = 0.1` elsewhere is an error from `npx tsc`.
- `private leftover = 0` is the accumulator, in seconds. `private` means only the class's own methods can use it: `loop.leftover` anywhere else is a type error. Other code can't put the loop into a wrong state, because it can't touch the state at all. (`private` is checked by TypeScript only; the field is still an ordinary property when the program runs.)
- `this.leftover += seconds` is short for `this.leftover = this.leftover + seconds`: the frame's time goes into the accumulator.
- `this.leftover >= this.step` is `true` when the leftover is **greater than or equal to** one step. (`<=` is less than or equal; `>` and `<` are strictly greater and less.) With `>=`, a leftover of exactly one step is taken as a step.
- The `while` loop takes one step out at a time (`-= this.step`) and counts it (`steps++`) for as long as a whole step is left.
- It returns the count. The caller runs that many updates, each with `dt` equal to `loop.step`.

```check
run "npx vitest run src" stdout="21 passed"
run "npx tsc"
```

## After a long pause: a test

When the player drags the window, or the computer sleeps, frames stop. When they start again, the first frame's time can be seconds long. Add a test:

```ts file=src/engine/loop.test.ts
import { expect, test } from 'vitest';
import { FixedLoop } from './loop';

test('a step is one part of a second', () => {
  expect(new FixedLoop(4).step).toBe(0.25);
});

test('advance takes whole steps and keeps what is left for later', () => {
  const loop = new FixedLoop(4);
  expect(loop.advance(0.125)).toBe(0);
  expect(loop.advance(0.25)).toBe(1);
  expect(loop.advance(0.125)).toBe(1);
});

test('after a long pause, a frame takes at most a quarter of a second of steps', () => {
  const loop = new FixedLoop(60);
  expect(loop.advance(3)).toBe(15);
});
```

```predict
question: How many steps does advance(3) take at 60 steps a second, as the code is now?
choice: 15
choice: 180
choice: 1
answer: 180
explain: 3 seconds hold 180 steps of 1/60 s, and the while loop takes them all in one frame: 180 updates before anything is drawn. The game jumps 3 seconds ahead at once.
```

- 180 updates at once has two costs. The player sees the game jump 3 seconds ahead, perhaps straight into a pit they couldn't see.
- Worse, if one update is slow, a frame that runs 180 of them is very slow. The next frame then has even more time to catch up, takes even more steps, and is slower still. The game grinds to a halt. Engine programmers call this the **spiral of death**.
- The fix: never hand out more than a quarter of a second per frame, at most 15 steps at 60 a second. After a long pause, the game simply resumes where it was.

```check
run "npx vitest run src" exit=1 stderr="expected 180 to be 15"
```

## A limit per frame

```ts file=src/engine/loop.ts
const MAX_FRAME = 0.25;

export class FixedLoop {
  readonly step: number;
  private leftover = 0;

  constructor(stepsPerSecond: number) {
    this.step = 1 / stepsPerSecond;
  }

  advance(seconds: number): number {
    this.leftover += Math.min(seconds, MAX_FRAME);
    let steps = 0;
    while (this.leftover >= this.step) {
      this.leftover -= this.step;
      steps++;
    }
    return steps;
  }
}
```

- `const MAX_FRAME = 0.25` names the limit. It's not exported: nothing outside this module needs it. Writing it in capitals is a convention for a fixed setting.
- A named constant says what the number means, and if it ever changes, it changes in one place. `0.25` alone in the middle of `advance` would leave the next reader guessing.
- `Math.min(a, b)` returns the smaller of two numbers, so no frame adds more than 0.25 s. Ordinary frames (a sixtieth of a second, say) are far below the limit and pass through unchanged.

```check
run "npx vitest run src" stdout="22 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "FixedLoop: fixed time steps from an accumulator, at most a quarter second per frame"
```

The story *things move at the same speed on every computer* isn't ticked yet: nothing runs the loop in the app until lesson 1.7.

```check
git-clean
git-tracked src/engine/loop.ts
```

## Challenge: smooth drawing between steps

**Optional, ★★★.** At 144 frames a second and 60 steps a second, some frames take no step, so the picture doesn't change, and motion can look slightly uneven. Engines fix this by drawing objects partway between their last two positions. Add a getter `alpha` to `FixedLoop`: how far the leftover is towards the next step, from 0 to 1. Test it with `FixedLoop(4)`: after `advance(0.125)`, `alpha` is 0.5.

```hints
nudge: The leftover is part of a step. What fraction of a step is it?
concept: Interpolation: a position drawn at alpha between the previous position p0 and the current p1 is p0 + (p1 − p0) × alpha. alpha is the leftover divided by the step size.
shape: get alpha(): number { return this.leftover / this.step; }
```
