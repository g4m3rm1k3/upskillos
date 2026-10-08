---
title: 5.3 — Drawing Turned Boxes
track: Build Your Own Game Studio
runtime: none
concepts: polygons, interfaces, local-to-global, painter
problem: Phaser's fillRect draws rectangles that are always upright. How do you draw a box that's turned and stretched, without the engine knowing anything about Phaser?
---

After lesson 5.2 the scene can say a wall is turned 30°, but it's still drawn straight. Lesson 1.8's `drawTree` draws each box with `fillRect(x, y, width, height)`, which can only draw a rectangle whose sides run straight across and straight down.

A turned box is still a four-sided shape, just not an upright one. Any shape with straight sides is a **polygon**, and it can be drawn from its corners: join them in order and fill the inside. So the plan is:

- find the box's four corners on its own paper (lesson 5.2): its centre is `(0, 0)`, so they're at plus and minus half its size;
- put each corner through the box's global transform, to find it in the world;
- ask the painter to fill the polygon through those four points.

## The drawing tests

Change `src/engine/draw.test.ts`:

```ts file=src/engine/draw.test.ts
import { expect, test } from 'vitest';
import { Box } from './box';
import { drawTree, type Painter, type Point } from './draw';
import { Node } from './node';
import { Vec2 } from './vec2';

class RecordingPainter implements Painter {
  calls: string[] = [];

  fillStyle(color: number): void {
    this.calls.push(`colour ${color.toString(16)}`);
  }

  fillPoints(points: Point[]): void {
    this.calls.push(`shape ${points.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(' ')}`);
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
  expect(painter.calls).toEqual([
    'colour ff0000',
    'shape 80,40 120,40 120,60 80,60',
    'colour ffffff',
    'shape 106,56 114,56 114,64 106,64',
  ]);
});

test('a turned box is drawn turned: its corners go round its centre', () => {
  const root = new Node('root');
  const bar = new Box('bar');
  bar.position = new Vec2(100, 50);
  bar.size = new Vec2(40, 20);
  bar.rotation = 90;
  root.addChild(bar);

  const painter = new RecordingPainter();
  drawTree(root, painter);
  expect(painter.calls).toEqual(['colour ffffff', 'shape 110,30 110,70 90,70 90,30']);
});
```

- The recording painter (lesson 1.8) now has `fillPoints(points)` in place of `fillRect`. It records `shape` and each point as `x,y`.
  - `Math.round` rounds a number to the nearest whole number, so a corner at `110.00000000000001` (lesson 5.2's tiny errors) is recorded as `110`.
  - `.map(…)` makes the text for each point, and `.join(' ')` joins them into one string with a space between each.
- The first test is lesson 1.8's, with the same boxes. Its expected rectangles are now four corners each, in this order: top left, top right, bottom right, bottom left. The car, 40 by 20 around `(100, 50)`, goes from x 80 to 120 and y 40 to 60.
- The second test turns a 40 by 20 bar a quarter turn about its centre, `(100, 50)`. Turned, it's 20 wide and 40 tall: x from 90 to 110, y from 30 to 70.
  - Its first corner, the top left before turning, `(-20, -10)` on its paper, goes round to `(110, 30)`: the top right. A clockwise quarter turn moves every corner one place on.

```check
run "npx vitest run src" exit=1 stderr="painter.fillRect is not a function"
```

The recorder no longer has the method `drawTree` calls.

## Drawing by corners

Change `src/engine/draw.ts`:

```ts file=src/engine/draw.ts
import { Box } from './box';
import type { Node } from './node';
import { Vec2 } from './vec2';

export interface Point {
  x: number;
  y: number;
}

export interface Painter {
  fillStyle(color: number): unknown;
  fillPoints(points: Point[]): unknown;
}

export function corners(box: Box): Vec2[] {
  const half = box.size.scale(0.5);
  const local = [new Vec2(-half.x, -half.y), new Vec2(half.x, -half.y), new Vec2(half.x, half.y), new Vec2(-half.x, half.y)];
  const global = box.globalTransform;
  return local.map((corner) => global.apply(corner));
}

export function drawTree(node: Node, painter: Painter): void {
  if (node instanceof Box) {
    painter.fillStyle(node.color);
    painter.fillPoints(corners(node));
  }
  for (const child of node.children) drawTree(child, painter);
}
```

- `interface Point` is anything with an `x` and a `y` number. A `Vec2` is one.
- The `Painter` interface (lesson 1.8) now asks for `fillPoints(points: Point[])` in place of `fillRect`. `fillStyle` stays.
- Why `Point` and not `Vec2`: the painter in the app is Phaser's `Graphics`, and the engine never names Phaser (ADR 2). Phaser's `Graphics` already has a method `fillPoints`, which takes an array of Phaser's own vectors. TypeScript checks that `Graphics` fits our `Painter` by comparing the two methods, and accepts it because every Phaser vector has an `x` and a `y` number: it's a `Point`. Our `Vec2` isn't Phaser's vector, and Phaser's vector isn't our `Vec2`, so with `Vec2` here the check would fail.
- `corners(box)` returns the box's four corners in the world:
  - `half` is half the size: for a 40 by 20 box, `(20, 10)`.
  - `local` lists the corners on the box's own paper, going round: top left `(-20, -10)`, top right `(20, -10)`, bottom right `(20, 10)`, bottom left `(-20, 10)`.
  - `global` is the box's global transform, read once rather than once per corner: each read of the getter works it out again.
  - `local.map((corner) => global.apply(corner))` puts each corner through it.
- It's exported because lesson 5.4 draws an outline round the selected box from the same corners.
- `drawTree` fills the box's colour, then `fillPoints(corners(node))`. Nothing else changes: children are still drawn after their parents, so they're on top.
- Why corners go round, not across: the painter joins the points in the order given. Top left, top right, bottom left, bottom right would draw a bow tie.

```check
run "npx vitest run src" stdout="109 passed"
run "npx tsc" label="Phaser's Graphics fits the new Painter"
```

`GameView` didn't change: it still passes `this.graphics` to `drawTree`, and the checker accepts it as a `Painter`.

```predict
question: The wall is 600 by 20, centred at (400, 60). You set its scale to (0.5, 1) and its rotation to 30. Which of these is drawn?
choice: A bar 600 long, turned 30°, then squashed across the screen to 300 wide
choice: A bar 300 long and 20 thick, turned 30° clockwise about (400, 60)
choice: A bar 300 long, turned 30° about its left end
answer: A bar 300 long and 20 thick, turned 30° clockwise about (400, 60)
explain: transformOf stretches the node's own x step by 0.5 and then the turned paper is placed at the position. The stretch happens along the box's own axis, before it's turned, so the bar is half as long and just as thick. Its centre is its (0, 0), which the transform puts at the position, so it turns about its centre.
```

```check
run "npm run e2e" stdout="7 passed" label="the app still opens and draws, and the keys and console still work"
```

Run `npm start`, select the wall, and type 30 in its rotation and 0.5 in its scale's first box. The wall turns about its centre and shortens along its own length. Undo puts it back, one change at a time.

## Commit

```powershell
git add .
git commit -m "Boxes are drawn from their four corners, so they turn and stretch"
```

```check
git-clean
```

## Challenge: circles

**Optional, ★★.** Add a `Circle` node type with a `radius`, drawn as a polygon of 32 points round its centre. Add it to the engine's makers and the registry, test first. A circle with a scale of `(2, 1)`: what shape is drawn, and why does that come for free?

```hints
nudge: The points are on the node's own paper: (cos a, sin a) times the radius, for 32 angles a.
concept: Every point goes through the global transform, which stretches x and y by the scale. A stretched circle is an ellipse.
shape: for (let i = 0; i < 32; i++) { const a = (i / 32) * 2 * Math.PI; points.push(global.apply(new Vec2(Math.cos(a), Math.sin(a)).scale(radius))); }
```
