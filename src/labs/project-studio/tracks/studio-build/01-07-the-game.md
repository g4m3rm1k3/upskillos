---
title: 1.7 — The Game: One Object That Runs a Frame
track: Build Your Own Game Studio
runtime: none
concepts: composition, separation-of-concerns, testing-without-a-browser
problem: The tree, the fixed-step loop and the input all work on their own. Each frame they must work together, in the right order, or presses get lost and steps get counted twice. Where does that order live, and how can it be tested without a window, a screen or a keyboard?
---

The engine now has four separate pieces: the scene tree (`Node`), positions (`Node2D`), time (`FixedLoop`) and the keyboard (`Input`). Each frame needs all of them, in a fixed order:

1. Ask the loop how many steps this frame has.
2. For each step, update the whole tree, then tell the input the step is over.

This lesson writes that order down once, in a `Game` class that **owns** the other pieces. A class that holds other objects and makes them work together is built by **composition**: `Game` *has* a tree, a loop and an input, where `Node2D` *is* a `Node` (inheritance, lesson 1.3).

`Game` will know nothing about windows, Phaser or real keys. The next lesson **glues** it to the browser in `main.ts`, a few lines that are tested end to end. Everything here can be tested by Vitest in a fraction of a second. Keeping the engine apart from the browser is a **separation of concerns**: each part has one job, and can be tested and changed on its own.

## One frame: a test

Create `src/engine/game.test.ts`:

```ts file=src/engine/game.test.ts
import { expect, test } from 'vitest';
import { Game } from './game';
import { Node } from './node';

class Counter extends Node {
  steps: number[] = [];

  override update(dt: number): void {
    this.steps.push(dt);
  }
}

test('a frame updates the tree once for each fixed step, 60 a second', () => {
  const game = new Game();
  const counter = new Counter('counter');
  game.root.addChild(counter);
  game.frame(0.1);
  expect(counter.steps.length).toBe(6);
  expect(counter.steps[0]).toBe(1 / 60);
});
```

- `game.root` will be the root of the scene tree: a game's nodes are added under it.
- `game.frame(seconds)` is what will run once per frame on screen, with the time since the last frame.
- `Counter` records the `dt` of every update it gets. 0.1 s at 60 steps a second is 6 steps, each with `dt` exactly 1/60.
- `steps.length` is how many items the array holds; `steps[0]` is the first item.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './game'"
```

## A game owns the pieces

Create `src/engine/game.ts`:

```ts file=src/engine/game.ts
import { Input } from './input';
import { FixedLoop } from './loop';
import { Node } from './node';

export class Game {
  readonly root = new Node('root');
  readonly input = new Input();
  private readonly loop = new FixedLoop(60);

  frame(seconds: number): void {
    const steps = this.loop.advance(seconds);
    for (let i = 0; i < steps; i++) {
      this.root.updateTree(this.loop.step);
    }
  }
}
```

- Each `Game` makes its own tree root, input and loop when it's made: three fields, each with a starting value.
- `root` and `input` are `readonly` but public: game code adds nodes under `game.root` and actions to `game.input`. Neither field can be replaced, so every part of the program that holds a reference to them keeps seeing the same objects.
- `loop` is `private`: nothing outside `Game` should ever advance time. If two places called `advance`, a frame's time would be counted twice.
- `frame` asks the loop for the number of steps, then the counting loop from lesson 1.4 runs `updateTree` that many times, each with `dt` = one step.

```check
run "npx vitest run src" stdout="28 passed"
run "npx tsc"
```

## Presses inside frames: a test

Now the input. A player presses jump; the next frame happens to hold 6 steps (a slow frame). Add a node that jumps when jump is just pressed, and count its jumps:

```ts file=src/engine/game.test.ts
import { expect, test } from 'vitest';
import { Game } from './game';
import { Input } from './input';
import { Node } from './node';

class Counter extends Node {
  steps: number[] = [];

  override update(dt: number): void {
    this.steps.push(dt);
  }
}

test('a frame updates the tree once for each fixed step, 60 a second', () => {
  const game = new Game();
  const counter = new Counter('counter');
  game.root.addChild(counter);
  game.frame(0.1);
  expect(counter.steps.length).toBe(6);
  expect(counter.steps[0]).toBe(1 / 60);
});

class Jumper extends Node {
  input: Input;
  jumps = 0;

  constructor(name: string, input: Input) {
    super(name);
    this.input = input;
  }

  override update(_dt: number): void {
    if (this.input.isJustPressed('jump')) this.jumps++;
  }
}

test('a press is seen by exactly one step', () => {
  const game = new Game();
  game.input.addAction('jump', ['Space']);
  const jumper = new Jumper('jumper', game.input);
  game.root.addChild(jumper);

  game.input.key('Space', true);
  game.frame(0.1);
  expect(jumper.jumps).toBe(1);

  game.input.key('Space', false);
  game.input.key('Space', true);
  game.frame(0.001);
  expect(jumper.jumps).toBe(1);
  game.frame(1 / 60);
  expect(jumper.jumps).toBe(2);
});
```

- The `Jumper` is handed the game's `Input` when it's made, and keeps a reference to it. That's how game code reaches the keyboard: the object it needs is passed in, not looked up from somewhere global. This is called **dependency injection**, and it's why the test can hand it any `Input` it likes.
- The second press arrives before a frame of 0.001 s: too short for any step. Lesson 1.6 promised such a press isn't lost; the next frame's step must still see it.

```predict
question: What does the first expect find, with frame as it is?
choice: 1 jump
choice: 6 jumps
choice: 0 jumps
answer: 6 jumps
explain: Nothing calls input.endStep, so the press is never forgotten: all 6 steps of the frame see isJustPressed('jump') as true, and the jumper jumps 6 times from one press.
```

```check
run "npx vitest run src" exit=1 stderr="expected 6 to be 1"
```

## Ending each step

```ts file=src/engine/game.ts
import { Input } from './input';
import { FixedLoop } from './loop';
import { Node } from './node';

export class Game {
  readonly root = new Node('root');
  readonly input = new Input();
  private readonly loop = new FixedLoop(60);

  frame(seconds: number): void {
    const steps = this.loop.advance(seconds);
    for (let i = 0; i < steps; i++) {
      this.root.updateTree(this.loop.step);
      this.input.endStep();
    }
  }
}
```

- `endStep` runs after each step's updates, so every node in that step sees the same presses, and the next step sees none of them.
- In a frame with no steps, the loop body never runs, so `endStep` isn't called and the press waits for the next step. That's the 0.001 s frame in the test.
- This order is now in one place. Nothing else in the program has to remember it, so nothing else can get it wrong.

```check
run "npx vitest run src" stdout="29 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "Game: one frame runs the fixed steps, updates the tree, and ends each step's input"
```

```check
git-clean
git-tracked src/engine/game.ts
```

## Challenge: pausing

**Optional, ★★.** Give `Game` a `paused` field. While it's `true`, `frame` updates nothing, and the paused time must not pile up in the loop: unpausing after a minute must not run a quarter second of catch-up steps. Test both.

```hints
nudge: The simplest pause returns from frame before asking the loop anything.
concept: Time spent paused never reaches the accumulator, so there's nothing to catch up on.
shape: paused = false; and at the top of frame: if (this.paused) return;
```
