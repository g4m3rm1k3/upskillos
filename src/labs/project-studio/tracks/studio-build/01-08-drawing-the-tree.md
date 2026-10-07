---
title: 1.8 — Drawing the Tree, and a Player
track: Build Your Own Game Studio
runtime: none
concepts: interfaces, test-doubles, origins, game-objects
problem: The tree knows where everything is, but nothing is on screen. Drawing needs a graphics library, and a test can't look at a screen. How can the code that decides what to draw be tested anyway, and what's the first thing worth drawing?
---

Drawing has two halves:

- **What to draw, and where**: walk the tree, and for each visible node, work out its rectangle from its global position and size. This is the engine's job.
- **Painting pixels**: turning "a blue rectangle at (384, 209), 32 by 32" into coloured pixels in the window, quickly, 60 times a second. That's the job of a graphics library, **Phaser**, in lesson 1.9.

This lesson writes the first half, and tests it without Phaser. It also writes the first piece of game code that isn't a test: a `Player` the arrow keys move.

Until the studio can show pictures (a later sprint), every visible thing is a coloured rectangle, a `Box`. Plenty of finished games started this way. Designers call it **greyboxing**: get the game playing with plain shapes before anyone draws art.

## A box

Create `src/engine/box.ts`:

```ts file=src/engine/box.ts
import { Node2D } from './node2d';
import { Vec2 } from './vec2';

export class Box extends Node2D {
  size = new Vec2(32, 32);
  color = 0xffffff;
}
```

- A `Box` is a `Node2D` (so it has a position and a place in the tree) with a size and a colour.
- `size` is a vector used as a width and a height: 32 by 32 pixels.
- `0xffffff` is a number written in **hexadecimal**, base 16, where the digits go 0–9 then a–f. Colours are usually written this way: two hex digits each for red, green and blue, from `00` (none) to `ff` (255, full). `0xffffff` is full red, green and blue: white. `0x4fc3f7` is a light blue.
- A class with only data and no behaviour needs no test of its own: the drawing tests in the next step use it.

```check
contains src/engine/box.ts "class Box extends Node2D"
run "npx tsc"
```

## What to draw: tests

Phaser draws a rectangle with two calls on a **Graphics** object: `fillStyle(colour)` picks the colour, then `fillRect(x, y, width, height)` fills a rectangle whose top-left corner is at `(x, y)`. The drawing code will make those calls. A test can hand it a stand-in that writes each call down instead of painting, then check the list.

Where is a box's top-left corner? In this engine, a node's position is its **centre**, as in most engines, so a box at `(100, 50)` that's 40 wide and 20 high spans x from 80 to 120 and y from 40 to 60. The point a node's position refers to is its **origin**. Centre origins make turning and lining up easy: a box turns around its middle, and two boxes at the same position are centred on each other.

Create `src/engine/draw.test.ts`:

```ts file=src/engine/draw.test.ts
import { expect, test } from 'vitest';
import { Box } from './box';
import { drawTree, type Painter } from './draw';
import { Node } from './node';
import { Vec2 } from './vec2';

class RecordingPainter implements Painter {
  calls: string[] = [];

  fillStyle(color: number): void {
    this.calls.push(`colour ${color.toString(16)}`);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`rect ${x} ${y} ${width} ${height}`);
  }
}

test('every box is drawn at its global position, centred, parents first', () => {
  const root = new Node('root');
  const car = new Box('car');
  car.position = new Vec2(100, 50);
  car.size = new Vec2(40, 20);
  car.color = 0xff0000;
  const wheel = new Box('wheel');
  wheel.position = new Vec2(10, 10);
  wheel.size = new Vec2(8, 8);
  root.addChild(car);
  car.addChild(wheel);

  const painter = new RecordingPainter();
  drawTree(root, painter);
  expect(painter.calls).toEqual(['colour ff0000', 'rect 80 40 40 20', 'colour ffffff', 'rect 106 56 8 8']);
});
```

- `RecordingPainter` is a **test double**: an object that stands in for a real one (here, Phaser's Graphics) so the code under test can run without it. Because this one records what it's asked to do, it's often called a **spy**.
- `implements Painter` promises it has every method the `Painter` type lists, with the right types. `npx tsc` checks the promise. `Painter` will be defined in the next step.
- `import { drawTree, type Painter }`: `type` marks an import used only as a type. It's erased when the code runs, because a type isn't a value.
- `color.toString(16)` writes a number in base 16: `0xff0000` becomes `'ff0000'`, so the list reads like the code.
- The expected calls: the car first, its centre `(100, 50)` minus half its size `(20, 10)` gives the corner `(80, 40)`. Then the wheel, whose global position is `(110, 60)`, minus half of 8 each way: `(106, 56)`. The root is a plain `Node`, so it draws nothing.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './draw'"
```

## drawTree

Create `src/engine/draw.ts`:

```ts file=src/engine/draw.ts
import { Box } from './box';
import type { Node } from './node';

export interface Painter {
  fillStyle(color: number): unknown;
  fillRect(x: number, y: number, width: number, height: number): unknown;
}

export function drawTree(node: Node, painter: Painter): void {
  if (node instanceof Box) {
    const centre = node.globalPosition;
    painter.fillStyle(node.color);
    painter.fillRect(centre.x - node.size.x / 2, centre.y - node.size.y / 2, node.size.x, node.size.y);
  }
  for (const child of node.children) drawTree(child, painter);
}
```

- An **interface** names a shape an object must have: these two methods, taking these types. It has no code and makes no objects. It's a type, erased when the program runs.
- TypeScript checks interfaces by **shape**: any object with matching methods fits, whether or not it says `implements`. Phaser's Graphics has `fillStyle` and `fillRect` with these parameters, so it's a `Painter` without knowing this interface exists. The engine never imports Phaser.
- The return type `unknown` means "returns something, which the caller won't use". Phaser's methods return the Graphics object; the spy's return nothing. Both fit.
- `drawTree` is a plain **function**, not a method: drawing isn't something a node does to itself, it's something done *to* the tree.
- `node instanceof Box` narrows `node` to `Box`, so `node.color` and `node.size` type-check.
- The corner is the centre minus half the size: `/ 2` divides by 2.
- Then it recurses into the children, parents first. Things drawn later appear on top, so a car's wheels are painted over the car's body.
- `import type { Node }`: this file only uses `Node` as a type, so the import is erased too.

```check
run "npx vitest run src" stdout="30 passed"
run "npx tsc" label="drawTree type-checks, and RecordingPainter really is a Painter"
```

## A player: a test

The first game object: a box that the arrow keys (or W, A, S and D) move at 200 pixels a second. It lives in a new folder, `src/game`, because it's part of a game, not part of the engine. Create `src/game/player.test.ts`:

```ts file=src/game/player.test.ts
import { expect, test } from 'vitest';
import { Input } from '../engine/input';
import { addMoveActions, Player } from './player';

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
```

- `'../engine/input'`: `..` means the folder above, so from `src/game` this reaches `src/engine/input.ts`.
- `addMoveActions(input)` will add the four movement actions to an `Input`. The test needs them, and so will the real game: writing them once, in a function both use, means the test checks the same keys the game uses.
- 60 steps of 1/60 s is one second, so the player should be 200 pixels right of where it started.
- In the second test, holding W (up) for half a second moves the player 100 pixels *up*: y goes down by 100.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './player'"
```

## The player

Create `src/game/player.ts`:

```ts file=src/game/player.ts
import { Box } from '../engine/box';
import type { Input } from '../engine/input';

const SPEED = 200;

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

- `const SPEED = 200` names the speed in pixels a second, like `MAX_FRAME` in lesson 1.5.
- `addMoveActions` gives each action two keys: the arrows, and W-A-S-D for players who keep their left hand on the keyboard.
- `Player` is a `Box` (so it's drawn), coloured light blue in its constructor, after `super(name)` has set it up as a box. It keeps the `Input` it was given (dependency injection, as `Jumper` did in lesson 1.7).
- `update` is all of the player's behaviour:
  - `direction` is a vector of length 1, or 0 when no key is held, from `Input.vector` (lesson 1.6);
  - `SPEED * dt` is how many pixels to move this step: 200 × 1/60 ≈ 3.33;
  - `direction.scale(…)` is the movement this step, and `position.add(…)` the new position.
- Every piece of the engine from this sprint meets here: vectors, the tree, `update` with `dt`, and input actions.

```check
run "npx vitest run src" stdout="32 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "drawTree draws boxes through a Painter; a Player the arrow keys move"
```

```check
git-clean
git-tracked src/game/player.ts
```

## Challenge: drawing in layers

**Optional, ★★.** At the moment, a node drawn later always appears on top. Add a `z` field to `Box` (0 by default) so a box with a higher `z` is drawn over one with a lower `z`, wherever they are in the tree. Test it with the spy: two sibling boxes, the first with `z` 1, must be drawn second.

```hints
nudge: Collect every box first, with a walk of the tree that pushes boxes onto an array, then sort the array, then draw it.
concept: Array sort with a comparison function: boxes.sort((a, b) => a.z - b.z) puts lower z first. JavaScript's sort keeps equal items in their original order, so boxes with the same z still draw parents first.
shape: function collect(node: Node, boxes: Box[]): void { if (node instanceof Box) boxes.push(node); for (const child of node.children) collect(child, boxes); }
```
