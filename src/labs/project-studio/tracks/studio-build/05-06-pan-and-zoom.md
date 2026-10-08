---
title: 5.6 — Pan and Zoom
track: Build Your Own Game Studio
runtime: none
concepts: cameras, screen-vs-world, view-transform, zoom-about-a-point, wheel-events
problem: A level is bigger than the window, and small things are hard to grab. The editor needs a camera you can move and zoom. Then a pixel on screen is no longer a position in the world. How does every click and drag still land on the right thing?
---

So far the game view shows the world from `(0, 0)` to `(800, 450)`, one pixel per unit. Real levels are bigger, and placing a small thing exactly needs a closer look. Every editor has its own **camera** for this: you **pan** (slide the view about) and **zoom** (look closer or further), and the scene doesn't change at all.

With a camera there are two kinds of position, and mixing them up is one of the classic bugs in graphics:

- **World** positions: where things are in the scene. The player is at `(400, 225)` in the world whatever the camera does.
- **Screen** positions: pixels on the canvas, where the pointer is and where things are drawn.

The camera is the transform between them, from lesson 5.2: the **view**. `view.apply(world)` is where a world point is drawn on screen; `view.toLocal(screen)` is the world point under a pixel. Zoomed in 2 times, the view's x step is `(2, 0)`: one world unit is two pixels. So:

- drawing puts every box's corners through the box's transform **and then** the view;
- picking and dragging turn the pointer's screen position into a world position with `view.toLocal` first, and then work exactly as before.

## The test first

Change `e2e/editor.test.ts`:

```ts file=e2e/editor.test.ts
import { expect, test } from 'vitest';
import { _electron as electron } from 'playwright';

test('the editor shows its panels, with the game drawn in the centre one', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.locator('.centre #game canvas').count()).toBe(1);
    expect(await page.textContent('.left h2')).toBe('Scene');
    expect(await page.textContent('.right h2')).toBe('Inspector');
  } finally {
    await app.close();
  }
}, 30000);

test('clicking a node in the scene tree selects it', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.locator('[data-path="level/player"]').count()).toBe(1);
    await page.click('[data-path="level/player"]');
    await expect.poll(() => page.getAttribute('[data-path="level/player"]', 'class')).toBe('selected');
    expect(await page.getAttribute('[data-path="level/wall"]', 'class')).toBe('');
  } finally {
    await app.close();
  }
}, 30000);

test('changing a property in the inspector changes the game, is logged as code, and can be undone', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await page.click('[data-path="level/player"]');
    await expect.poll(() => page.locator('#prop-position-x').count()).toBe(1);
    await page.fill('#prop-position-x', '100');
    await page.press('#prop-position-x', 'Enter');
    await expect.poll(() => page.textContent('#player-x')).toBe('100');
    expect(await page.inputValue('#prop-position-x')).toBe('100');
    expect(await page.textContent('#log')).toBe('scene.setProp("level/player", "position", { x: 100, y: 225 });');
    await page.click('#undo');
    await expect.poll(() => page.textContent('#player-x')).toBe('400');
    expect(await page.inputValue('#prop-position-x')).toBe('400');
  } finally {
    await app.close();
  }
}, 30000);

test('clicking a thing in the game view selects it; clicking empty space selects nothing', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    const view = page.locator('#game canvas');
    await view.click({ position: { x: 400, y: 60 } });
    await expect.poll(() => page.getAttribute('[data-path="level/wall"]', 'class')).toBe('selected');
    await view.click({ position: { x: 410, y: 230 } });
    await expect.poll(() => page.getAttribute('[data-path="level/player"]', 'class')).toBe('selected');
    await view.click({ position: { x: 100, y: 400 } });
    await expect.poll(() => page.textContent('.right p')).toBe('Select a node in the scene tree.');
  } finally {
    await app.close();
  }
}, 30000);

test('dragging a thing moves it, as one change that is logged and can be undone', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    const view = page.locator('#game canvas');
    const box = await view.boundingBox();
    if (!box) throw new Error('The game view is not on the page');
    await page.mouse.move(box.x + 410, box.y + 230);
    await page.mouse.down();
    await page.mouse.move(box.x + 510, box.y + 305, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => page.textContent('#player-x')).toBe('500');
    expect(await page.textContent('#log')).toBe('scene.setProp("level/player", "position", { x: 500, y: 300 });');
    expect(await page.inputValue('#prop-position-x')).toBe('500');
    await page.click('#undo');
    await expect.poll(() => page.textContent('#player-x')).toBe('400');
  } finally {
    await app.close();
  }
}, 30000);

test('the wheel zooms about the pointer and a right-drag pans; clicking and dragging still find the right thing', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    const view = page.locator('#game canvas');
    const box = await view.boundingBox();
    if (!box) throw new Error('The game view is not on the page');
    await page.mouse.move(box.x + 400, box.y + 225);
    await page.mouse.wheel(0, -100);
    await page.mouse.wheel(0, -100);
    await view.click({ position: { x: 380, y: 225 } });
    await expect.poll(() => page.getAttribute('[data-path="level/player"]', 'class')).toBe('selected');
    expect(await page.textContent('#zoom')).toBe('156%');

    await page.mouse.move(box.x + 300, box.y + 300);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(box.x + 400, box.y + 300, { steps: 5 });
    await page.mouse.up({ button: 'right' });
    await page.mouse.move(box.x + 500, box.y + 225);
    await page.mouse.down();
    await page.mouse.move(box.x + 550, box.y + 225, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => page.textContent('#player-x')).toBe('432');
  } finally {
    await app.close();
  }
}, 30000);
```

- The new test is the last one. It zooms, clicks, pans and drags, and checks that each lands on the right thing.
- `page.mouse.wheel(0, -100)` turns the mouse wheel: the second number is how far down, so `-100` is a step up, away from you. That's zoom in, as in every map program. Two steps, with the pointer over the player's centre, `(400, 225)`.
- Each step zooms by 1.25, so two are 1.5625.
- Zooming about the player's centre keeps it there and makes it 1.5625 times bigger: 50 pixels across instead of 32. So `(380, 225)`, which missed the player before (its left edge was at 384), is on it now, and clicking there must select it. Then a new readout, `#zoom`, must say `156%`.
- `page.mouse.down({ button: 'right' })` and `up({ button: 'right' })` press and release the right button. Dragging with it 100 pixels to the right pans the view, so the player is now drawn at 500 across.
- Then a left drag from `(500, 225)` to `(550, 225)` moves the player. 50 pixels at 1.5625 pixels a unit is 32 units, so the player must end at x = 432.

```check
run "npm run e2e" exit=1 stderr="expected '' to be 'selected'" label="the test fails: the wheel doesn't zoom yet"
```

The wheel does nothing yet, so `(380, 225)` is still 4 pixels left of the player, and the click selects nothing.

The test checks the selection before it reads the `#zoom` readout, on purpose. Reading `#zoom` first would make the red a wait for an element that isn't there, ending in *expect.poll() function didn't resolve in time*, which says nothing about zooming. A red should fail on the behaviour that's missing.

## Panning: a test

Change `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY, transformOf } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import { dragPosition, drawSelection, panBy, pathOf, pick, type OutlinePainter } from './viewport';

function level(): Node {
  const root = new Node('root');
  const level = new Node('level');
  const wall = new Box('wall');
  wall.position = new Vec2(100, 100);
  wall.size = new Vec2(200, 20);
  const crate = new Box('crate');
  crate.position = new Vec2(100, 100);
  root.addChild(level);
  level.addChild(wall);
  level.addChild(crate);
  return root;
}

test('pick finds the box under a point, the one drawn last when two overlap', () => {
  const root = level();
  expect(pick(root, new Vec2(30, 105))?.name).toBe('wall');
  expect(pick(root, new Vec2(110, 110))?.name).toBe('crate');
  expect(pick(root, new Vec2(30, 200))).toBe(null);
});

test('pick tests a turned box by its turned shape', () => {
  const root = level();
  const wall = root.get('level/wall') as Box;
  wall.rotation = 90;
  expect(pick(root, new Vec2(30, 105))).toBe(null);
  expect(pick(root, new Vec2(105, 30))?.name).toBe('wall');
});

test("a node's path is the names from the scene's root down to it", () => {
  const root = level();
  expect(pathOf(root.get('level/crate'))).toBe('level/crate');
  expect(pathOf(root.get('level'))).toBe('level');
});

class RecordingPainter implements OutlinePainter {
  calls: string[] = [];

  lineStyle(width: number, color: number): void {
    this.calls.push(`line ${width} ${color.toString(16)}`);
  }

  strokePoints(points: Point[], closeShape: boolean): void {
    this.calls.push(`outline ${points.map((p) => `${p.x},${p.y}`).join(' ')} ${closeShape}`);
  }
}

test('the selected box is outlined; nothing is drawn for no selection, or a node that is not a box', () => {
  const root = level();
  const painter = new RecordingPainter();
  drawSelection(root, 'level/crate', painter, IDENTITY);
  expect(painter.calls).toEqual(['line 2 ffcc00', 'outline 84,84 116,84 116,116 84,116 true']);
  painter.calls = [];
  drawSelection(root, null, painter, IDENTITY);
  drawSelection(root, 'level', painter, IDENTITY);
  expect(painter.calls).toEqual([]);
});

test('a drag moves a node by as much as the pointer moved', () => {
  const position = dragPosition(new Vec2(100, 100), IDENTITY, new Vec2(110, 105), new Vec2(160, 125));
  expect(position).toEqual(new Vec2(150, 120));
});

test("under a turned, stretched parent, the pointer's move is turned into the parent's own steps", () => {
  const parent = transformOf(new Vec2(300, 200), 90, new Vec2(2, 2));
  const position = dragPosition(new Vec2(10, 0), parent, new Vec2(300, 220), new Vec2(300, 240));
  expect(position.x).toBeCloseTo(20);
  expect(position.y).toBeCloseTo(0);
});

test('panning moves the whole view by the pointer\'s step', () => {
  const view = panBy(IDENTITY, new Vec2(30, -10));
  expect(view.apply(new Vec2(100, 100))).toEqual(new Vec2(130, 90));
});
```

- The outline test now passes a view to `drawSelection`: `IDENTITY`, so the expected corners don't change.
- A new test at the end: `panBy(view, step)` moves the whole view by a step on screen: with `(30, -10)`, a world point at `(100, 100)` is drawn at `(130, 90)`.

```check
run "npx vitest run src" exit=1 stderr="panBy is not a function"
```

## panBy

Change `src/editor/viewport.ts`:

```ts file=src/editor/viewport.ts
import { Box } from '../engine/box';
import { corners, type Point } from '../engine/draw';
import type { Node } from '../engine/node';
import { transformOf, type Transform } from '../engine/transform';
import { Vec2 } from '../engine/vec2';

export interface OutlinePainter {
  lineStyle(width: number, color: number): unknown;
  strokePoints(points: Point[], closeShape: boolean): unknown;
}

export function pick(node: Node, point: Vec2): Box | null {
  for (let i = node.children.length - 1; i >= 0; i--) {
    const found = pick(node.children[i], point);
    if (found) return found;
  }
  if (node instanceof Box) {
    const local = node.globalTransform.toLocal(point);
    if (Math.abs(local.x) <= node.size.x / 2 && Math.abs(local.y) <= node.size.y / 2) return node;
  }
  return null;
}

export function pathOf(node: Node): string {
  const names: string[] = [];
  let current = node;
  while (current.parent) {
    names.unshift(current.name);
    current = current.parent;
  }
  return names.join('/');
}

export function drawSelection(root: Node, path: string | null, painter: OutlinePainter, view: Transform): void {
  if (path === null) return;
  const node = root.get(path);
  if (!(node instanceof Box)) return;
  painter.lineStyle(2, 0xffcc00);
  painter.strokePoints(corners(node, view), true);
}

export function dragPosition(start: Vec2, parent: Transform, from: Vec2, to: Vec2): Vec2 {
  const startGlobal = parent.apply(start);
  return parent.toLocal(startGlobal.add(to.subtract(from)));
}

export function panBy(view: Transform, step: Vec2): Transform {
  return view.then(transformOf(step, 0, new Vec2(1, 1)));
}
```

- `drawSelection` takes a fourth parameter, `view`, and passes it to `corners`, so the outline is drawn through the camera like everything else. `corners` doesn't take it yet: that's next.
- `panBy(view, step)`: `view.then(…)` does the view, then one more transform. `transformOf(step, 0, new Vec2(1, 1))` only moves, by `step`: no turn, no stretch. So every point is drawn `step` further on.
- `Vec2` is now used as a value (`new Vec2`), not only a type, so it's a plain import.

```check
run "npx vitest run src" stdout="116 passed"
```

## Zooming about the pointer: a test

Add a test to `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY, transformOf } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import { dragPosition, drawSelection, panBy, pathOf, pick, zoomAt, type OutlinePainter } from './viewport';

function level(): Node {
  const root = new Node('root');
  const level = new Node('level');
  const wall = new Box('wall');
  wall.position = new Vec2(100, 100);
  wall.size = new Vec2(200, 20);
  const crate = new Box('crate');
  crate.position = new Vec2(100, 100);
  root.addChild(level);
  level.addChild(wall);
  level.addChild(crate);
  return root;
}

test('pick finds the box under a point, the one drawn last when two overlap', () => {
  const root = level();
  expect(pick(root, new Vec2(30, 105))?.name).toBe('wall');
  expect(pick(root, new Vec2(110, 110))?.name).toBe('crate');
  expect(pick(root, new Vec2(30, 200))).toBe(null);
});

test('pick tests a turned box by its turned shape', () => {
  const root = level();
  const wall = root.get('level/wall') as Box;
  wall.rotation = 90;
  expect(pick(root, new Vec2(30, 105))).toBe(null);
  expect(pick(root, new Vec2(105, 30))?.name).toBe('wall');
});

test("a node's path is the names from the scene's root down to it", () => {
  const root = level();
  expect(pathOf(root.get('level/crate'))).toBe('level/crate');
  expect(pathOf(root.get('level'))).toBe('level');
});

class RecordingPainter implements OutlinePainter {
  calls: string[] = [];

  lineStyle(width: number, color: number): void {
    this.calls.push(`line ${width} ${color.toString(16)}`);
  }

  strokePoints(points: Point[], closeShape: boolean): void {
    this.calls.push(`outline ${points.map((p) => `${p.x},${p.y}`).join(' ')} ${closeShape}`);
  }
}

test('the selected box is outlined; nothing is drawn for no selection, or a node that is not a box', () => {
  const root = level();
  const painter = new RecordingPainter();
  drawSelection(root, 'level/crate', painter, IDENTITY);
  expect(painter.calls).toEqual(['line 2 ffcc00', 'outline 84,84 116,84 116,116 84,116 true']);
  painter.calls = [];
  drawSelection(root, null, painter, IDENTITY);
  drawSelection(root, 'level', painter, IDENTITY);
  expect(painter.calls).toEqual([]);
});

test('a drag moves a node by as much as the pointer moved', () => {
  const position = dragPosition(new Vec2(100, 100), IDENTITY, new Vec2(110, 105), new Vec2(160, 125));
  expect(position).toEqual(new Vec2(150, 120));
});

test("under a turned, stretched parent, the pointer's move is turned into the parent's own steps", () => {
  const parent = transformOf(new Vec2(300, 200), 90, new Vec2(2, 2));
  const position = dragPosition(new Vec2(10, 0), parent, new Vec2(300, 220), new Vec2(300, 240));
  expect(position.x).toBeCloseTo(20);
  expect(position.y).toBeCloseTo(0);
});

test('panning moves the whole view by the pointer\'s step', () => {
  const view = panBy(IDENTITY, new Vec2(30, -10));
  expect(view.apply(new Vec2(100, 100))).toEqual(new Vec2(130, 90));
});

test('zooming keeps the point under the pointer where it is, and everything else spreads from it', () => {
  const view = zoomAt(IDENTITY, new Vec2(400, 200), 2);
  expect(view.apply(new Vec2(400, 200))).toEqual(new Vec2(400, 200));
  expect(view.apply(new Vec2(410, 200))).toEqual(new Vec2(420, 200));
  expect(view.toLocal(new Vec2(420, 200))).toEqual(new Vec2(410, 200));
});
```

- `zoomAt(view, screen, factor)` zooms by `factor`, about the screen point `screen`, which stays where it is: the thing under the pointer stays under the pointer. Zoom 2 about `(400, 200)`: that point is still at `(400, 200)`, and a point 10 to its right is now 20 to its right. `toLocal` goes the other way, from 20 to the right on screen back to 10 in the world.

```check
run "npx vitest run src" exit=1 stderr="zoomAt is not a function"
```

## zoomAt

Change `src/editor/viewport.ts`:

```ts file=src/editor/viewport.ts
import { Box } from '../engine/box';
import { corners, type Point } from '../engine/draw';
import type { Node } from '../engine/node';
import { transformOf, type Transform } from '../engine/transform';
import { Vec2 } from '../engine/vec2';

export interface OutlinePainter {
  lineStyle(width: number, color: number): unknown;
  strokePoints(points: Point[], closeShape: boolean): unknown;
}

export function pick(node: Node, point: Vec2): Box | null {
  for (let i = node.children.length - 1; i >= 0; i--) {
    const found = pick(node.children[i], point);
    if (found) return found;
  }
  if (node instanceof Box) {
    const local = node.globalTransform.toLocal(point);
    if (Math.abs(local.x) <= node.size.x / 2 && Math.abs(local.y) <= node.size.y / 2) return node;
  }
  return null;
}

export function pathOf(node: Node): string {
  const names: string[] = [];
  let current = node;
  while (current.parent) {
    names.unshift(current.name);
    current = current.parent;
  }
  return names.join('/');
}

export function drawSelection(root: Node, path: string | null, painter: OutlinePainter, view: Transform): void {
  if (path === null) return;
  const node = root.get(path);
  if (!(node instanceof Box)) return;
  painter.lineStyle(2, 0xffcc00);
  painter.strokePoints(corners(node, view), true);
}

export function dragPosition(start: Vec2, parent: Transform, from: Vec2, to: Vec2): Vec2 {
  const startGlobal = parent.apply(start);
  return parent.toLocal(startGlobal.add(to.subtract(from)));
}

export function panBy(view: Transform, step: Vec2): Transform {
  return view.then(transformOf(step, 0, new Vec2(1, 1)));
}

export function zoomAt(view: Transform, screen: Vec2, factor: number): Transform {
  return view.then(transformOf(screen.subtract(screen.scale(factor)), 0, new Vec2(factor, factor)));
}
```

- `zoomAt(view, screen, factor)`: `view.then(…)` does the view, then one more transform, which stretches by `factor` and moves by `screen - screen * factor`. A screen point `p` goes to `screen - screen * factor + p * factor`, which is `screen + (p - screen) * factor`: its distance from `screen` grows by `factor`, and `screen` itself stays put.

```check
run "npx vitest run src" stdout="117 passed"
```

## Limits: a test

Add a test to `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY, transformOf } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import { dragPosition, drawSelection, panBy, pathOf, pick, zoomAt, type OutlinePainter } from './viewport';

function level(): Node {
  const root = new Node('root');
  const level = new Node('level');
  const wall = new Box('wall');
  wall.position = new Vec2(100, 100);
  wall.size = new Vec2(200, 20);
  const crate = new Box('crate');
  crate.position = new Vec2(100, 100);
  root.addChild(level);
  level.addChild(wall);
  level.addChild(crate);
  return root;
}

test('pick finds the box under a point, the one drawn last when two overlap', () => {
  const root = level();
  expect(pick(root, new Vec2(30, 105))?.name).toBe('wall');
  expect(pick(root, new Vec2(110, 110))?.name).toBe('crate');
  expect(pick(root, new Vec2(30, 200))).toBe(null);
});

test('pick tests a turned box by its turned shape', () => {
  const root = level();
  const wall = root.get('level/wall') as Box;
  wall.rotation = 90;
  expect(pick(root, new Vec2(30, 105))).toBe(null);
  expect(pick(root, new Vec2(105, 30))?.name).toBe('wall');
});

test("a node's path is the names from the scene's root down to it", () => {
  const root = level();
  expect(pathOf(root.get('level/crate'))).toBe('level/crate');
  expect(pathOf(root.get('level'))).toBe('level');
});

class RecordingPainter implements OutlinePainter {
  calls: string[] = [];

  lineStyle(width: number, color: number): void {
    this.calls.push(`line ${width} ${color.toString(16)}`);
  }

  strokePoints(points: Point[], closeShape: boolean): void {
    this.calls.push(`outline ${points.map((p) => `${p.x},${p.y}`).join(' ')} ${closeShape}`);
  }
}

test('the selected box is outlined; nothing is drawn for no selection, or a node that is not a box', () => {
  const root = level();
  const painter = new RecordingPainter();
  drawSelection(root, 'level/crate', painter, IDENTITY);
  expect(painter.calls).toEqual(['line 2 ffcc00', 'outline 84,84 116,84 116,116 84,116 true']);
  painter.calls = [];
  drawSelection(root, null, painter, IDENTITY);
  drawSelection(root, 'level', painter, IDENTITY);
  expect(painter.calls).toEqual([]);
});

test('a drag moves a node by as much as the pointer moved', () => {
  const position = dragPosition(new Vec2(100, 100), IDENTITY, new Vec2(110, 105), new Vec2(160, 125));
  expect(position).toEqual(new Vec2(150, 120));
});

test("under a turned, stretched parent, the pointer's move is turned into the parent's own steps", () => {
  const parent = transformOf(new Vec2(300, 200), 90, new Vec2(2, 2));
  const position = dragPosition(new Vec2(10, 0), parent, new Vec2(300, 220), new Vec2(300, 240));
  expect(position.x).toBeCloseTo(20);
  expect(position.y).toBeCloseTo(0);
});

test('panning moves the whole view by the pointer\'s step', () => {
  const view = panBy(IDENTITY, new Vec2(30, -10));
  expect(view.apply(new Vec2(100, 100))).toEqual(new Vec2(130, 90));
});

test('zooming keeps the point under the pointer where it is, and everything else spreads from it', () => {
  const view = zoomAt(IDENTITY, new Vec2(400, 200), 2);
  expect(view.apply(new Vec2(400, 200))).toEqual(new Vec2(400, 200));
  expect(view.apply(new Vec2(410, 200))).toEqual(new Vec2(420, 200));
  expect(view.toLocal(new Vec2(420, 200))).toEqual(new Vec2(410, 200));
});

test('zoom stays between a quarter and eight times', () => {
  expect(zoomAt(IDENTITY, new Vec2(0, 0), 100).xAxis.length()).toBe(8);
  expect(zoomAt(IDENTITY, new Vec2(0, 0), 0.01).xAxis.length()).toBe(0.25);
});
```

- Zoom must stay between a quarter and 8 times, however far the wheel is turned. `view.xAxis.length()` is the zoom: the length of one world step on screen.
- These are boundary values: a turn of the wheel so far that the zoom would pass a limit, either way.

```check
run "npx vitest run src" exit=1 stderr="expected 100 to be 8"
```

Nothing stops the zoom yet: a factor of 100 zooms 100 times.

## Keeping the zoom in range

Change `src/editor/viewport.ts`:

```ts file=src/editor/viewport.ts
import { Box } from '../engine/box';
import { corners, type Point } from '../engine/draw';
import type { Node } from '../engine/node';
import { transformOf, type Transform } from '../engine/transform';
import { Vec2 } from '../engine/vec2';

export interface OutlinePainter {
  lineStyle(width: number, color: number): unknown;
  strokePoints(points: Point[], closeShape: boolean): unknown;
}

export function pick(node: Node, point: Vec2): Box | null {
  for (let i = node.children.length - 1; i >= 0; i--) {
    const found = pick(node.children[i], point);
    if (found) return found;
  }
  if (node instanceof Box) {
    const local = node.globalTransform.toLocal(point);
    if (Math.abs(local.x) <= node.size.x / 2 && Math.abs(local.y) <= node.size.y / 2) return node;
  }
  return null;
}

export function pathOf(node: Node): string {
  const names: string[] = [];
  let current = node;
  while (current.parent) {
    names.unshift(current.name);
    current = current.parent;
  }
  return names.join('/');
}

export function drawSelection(root: Node, path: string | null, painter: OutlinePainter, view: Transform): void {
  if (path === null) return;
  const node = root.get(path);
  if (!(node instanceof Box)) return;
  painter.lineStyle(2, 0xffcc00);
  painter.strokePoints(corners(node, view), true);
}

export function dragPosition(start: Vec2, parent: Transform, from: Vec2, to: Vec2): Vec2 {
  const startGlobal = parent.apply(start);
  return parent.toLocal(startGlobal.add(to.subtract(from)));
}

export function panBy(view: Transform, step: Vec2): Transform {
  return view.then(transformOf(step, 0, new Vec2(1, 1)));
}

export function zoomAt(view: Transform, screen: Vec2, factor: number): Transform {
  const zoom = Math.min(8, Math.max(0.25, view.xAxis.length() * factor));
  const change = zoom / view.xAxis.length();
  return view.then(transformOf(screen.subtract(screen.scale(change)), 0, new Vec2(change, change)));
}
```

- `view.xAxis.length() * factor` is the new zoom. `Math.max(0.25, …)` gives the bigger of the two numbers, so it's never less than 0.25; `Math.min(8, …)` the smaller, so never more than 8. Together they **clamp** the zoom into that range.
- `change` is how much the zoom actually changes, after clamping: the new zoom divided by the old.
- The extra transform stretches by `change` and moves by `screen - screen * change`. A screen point `p` goes to `screen - screen * change + p * change`, which is `screen + (p - screen) * change`: its distance from `screen` grows by `change`, and `screen` itself stays put.
- The extra transform now stretches by `change`, not `factor`. When the zoom isn't at a limit, they're the same, so the last test still passes.

```check
run "npx vitest run src" stdout="118 passed"
run "npx tsc" exit=1 stdout="TS2554" label="corners doesn't take a view yet, and GameView doesn't pass one"
```

```text
src/editor/viewport.ts(39,38): error TS2554: Expected 1 arguments, but got 2.
src/ui/GameView.tsx(26,9): error TS2554: Expected 4 arguments, but got 3.
```

The tests pass, because JavaScript ignores an argument a function doesn't take, and the identity changes nothing anyway. The checker doesn't let it go, and lists the next two steps.

## Drawing through the view: a test

Change `src/engine/draw.test.ts`:

```ts file=src/engine/draw.test.ts
import { expect, test } from 'vitest';
import { Box } from './box';
import { drawTree, type Painter, type Point } from './draw';
import { Node } from './node';
import { transformOf } from './transform';
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

test('a view moves and zooms everything drawn: here twice the size, 10 pixels to the right', () => {
  const root = new Node('root');
  const crate = new Box('crate');
  crate.position = new Vec2(100, 50);
  root.addChild(crate);

  const painter = new RecordingPainter();
  drawTree(root, painter, transformOf(new Vec2(10, 0), 0, new Vec2(2, 2)));
  expect(painter.calls).toEqual(['colour ffffff', 'shape 178,68 242,68 242,132 178,132']);
});
```

- A new test at the end: a 32 pixel crate at `(100, 50)`, drawn through a view that doubles everything and moves it 10 to the right.
- The crate's top left corner is `(84, 34)` in the world. Doubled that's `(168, 68)`, and 10 to the right, `(178, 68)`. Its size on screen is 64.

```check
run "npx vitest run src" exit=1 stderr="to deeply equal [ 'colour ffffff'"
```

## drawTree and corners take a view

Change `src/engine/draw.ts`:

```ts file=src/engine/draw.ts
import { Box } from './box';
import type { Node } from './node';
import { IDENTITY, type Transform } from './transform';
import { Vec2 } from './vec2';

export interface Point {
  x: number;
  y: number;
}

export interface Painter {
  fillStyle(color: number): unknown;
  fillPoints(points: Point[]): unknown;
}

export function corners(box: Box, view: Transform): Vec2[] {
  const half = box.size.scale(0.5);
  const local = [new Vec2(-half.x, -half.y), new Vec2(half.x, -half.y), new Vec2(half.x, half.y), new Vec2(-half.x, half.y)];
  const toView = box.globalTransform.then(view);
  return local.map((corner) => toView.apply(corner));
}

export function drawTree(node: Node, painter: Painter, view: Transform = IDENTITY): void {
  if (node instanceof Box) {
    painter.fillStyle(node.color);
    painter.fillPoints(corners(node, view));
  }
  for (const child of node.children) drawTree(child, painter, view);
}
```

- `corners(box, view)`: `box.globalTransform.then(view)` is one transform from the box's own paper straight to the screen. Each corner goes through it.
- `drawTree(node, painter, view: Transform = IDENTITY)`: `= IDENTITY` gives the parameter a **default value**. If a call leaves it out, as the first two tests do, `view` is `IDENTITY`. So the game, which has no camera, can call `drawTree` as before.
- `drawTree` passes `view` on to each child.
- The view is just one more transform after all the others. The engine still knows nothing about cameras or the editor: it draws through whatever transform it's given.

```check
run "npx vitest run src" stdout="119 passed"
run "npx tsc" exit=1 stdout="Expected 4 arguments, but got 3" label="GameView doesn't pass a view yet"
```

## The camera in the game view

Change `src/ui/GameView.tsx`:

```tsx file=src/ui/GameView.tsx
import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { dragPosition, drawSelection, panBy, pathOf, pick, zoomAt } from '../editor/viewport';
import type { Box } from '../engine/box';
import { drawTree } from '../engine/draw';
import type { Game } from '../engine/game';
import { IDENTITY } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import type { EditorStore } from '../editor/store';

export function GameView({ store, game, readout }: { store: EditorStore; game: Game; readout: () => string }) {
  const holder = useRef<HTMLDivElement>(null);
  const shown = useRef<HTMLSpanElement>(null);
  const zoomShown = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let view = IDENTITY;
    let pan: Vec2 | null = null;
    let drag: { box: Box; path: string; start: Vec2; from: Vec2 } | null = null;

    class Play extends Phaser.Scene {
      private graphics!: Phaser.GameObjects.Graphics;

      create(): void {
        this.graphics = this.add.graphics();
      }

      override update(_time: number, delta: number): void {
        if (store.playing) game.frame(delta / 1000);
        const shownView = store.playing ? IDENTITY : view;
        this.graphics.clear();
        drawTree(game.root, this.graphics, shownView);
        drawSelection(game.root, store.selected, this.graphics, shownView);
        if (shown.current) shown.current.textContent = readout();
        if (zoomShown.current) zoomShown.current.textContent = `${Math.round(shownView.xAxis.length() * 100)}%`;
      }
    }

    const phaser = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 450,
      parent: holder.current,
      backgroundColor: '#1d2330',
      scene: Play,
    });

    const canvas = phaser.canvas;

    canvas.addEventListener('pointerdown', (event) => {
      if (store.playing) return;
      canvas.setPointerCapture(event.pointerId);
      const point = new Vec2(event.offsetX, event.offsetY);
      if (event.button !== 0) {
        pan = point;
        return;
      }
      const world = view.toLocal(point);
      const hit = pick(game.root, world);
      store.select(hit ? pathOf(hit) : null);
      if (hit) drag = { box: hit, path: pathOf(hit), start: hit.position, from: world };
    });

    canvas.addEventListener('pointermove', (event) => {
      const point = new Vec2(event.offsetX, event.offsetY);
      if (pan) {
        view = panBy(view, point.subtract(pan));
        pan = point;
      }
      if (drag) {
        const position = dragPosition(drag.start, drag.box.parentTransform, drag.from, view.toLocal(point));
        drag.box.position = new Vec2(Math.round(position.x), Math.round(position.y));
      }
    });

    canvas.addEventListener('pointerup', () => {
      pan = null;
      if (!drag) return;
      const { box, path, start } = drag;
      drag = null;
      if (box.position.x === start.x && box.position.y === start.y) return;
      store.setProp(path, 'position', { x: box.position.x, y: box.position.y });
    });

    canvas.addEventListener(
      'wheel',
      (event) => {
        if (store.playing) return;
        event.preventDefault();
        view = zoomAt(view, new Vec2(event.offsetX, event.offsetY), event.deltaY < 0 ? 1.25 : 0.8);
      },
      { passive: false },
    );

    return () => phaser.destroy(true);
  }, [store, game, readout]);

  return (
    <div>
      <div id="game" ref={holder}></div>
      <p>
        Player x: <span id="player-x" ref={shown}></span> Zoom: <span id="zoom" ref={zoomShown}></span>
      </p>
    </div>
  );
}
```

- New imports: `panBy`, `zoomAt` and `IDENTITY`.
- A third ref, `zoomShown`, for a new readout after the player's x: `Zoom: <span id="zoom" …>`.
- Three variables at the top of the effect:
  - `let view = IDENTITY`: the editor's camera, a world-to-screen transform. It starts showing the world as before.
  - `let pan: Vec2 | null = null`: while panning, the last screen position of the pointer.
  - `drag`, as before. It moved up, so all three are declared before `Play`, which reads `view`.
- In `update`:
  - `const shownView = store.playing ? IDENTITY : view;`: while playing you see what the game shows, with no editor camera. Stop, and the editor's camera is back where you left it.
  - `drawTree` and `drawSelection` draw through `shownView`.
  - The zoom readout: `shownView.xAxis.length() * 100`, rounded, with `%`. A **template literal** (lesson 1.2's backticks) puts the number and the `%` together.
- `pointerdown`:
  - `setPointerCapture` now comes first, for both buttons.
  - `event.button` says which button went down: `0` is the left (main) button, `1` the middle, `2` the right. Any but the left starts a pan: `pan = point;`, and nothing is picked.
  - `const world = view.toLocal(point);` turns the screen point into a world one. Picking and the drag's `from` use `world`: they're about the scene, so they work in world positions.
- `pointermove`:
  - When panning: `point.subtract(pan)` is how far the pointer moved since the last event, on screen. `panBy` moves the view by that much, and `pan = point` remembers where the pointer is now. Panning works in screen pixels, because the view is about the screen.
  - When dragging: `view.toLocal(point)` turns the pointer into a world position before `dragPosition`, which works in the world.
- `pointerup`: `pan = null;` ends any pan, then the drag ends as before.
- `wheel`:
  - Each turn of the wheel is a `wheel` event; `event.deltaY` is how far, less than 0 for a turn away from you. That zooms in by 1.25; the other way, by 0.8, which is 1 / 1.25, so one step in and one out is back where you were.
  - `event.preventDefault()` stops what the browser would otherwise do with the wheel: scroll the page.
  - `{ passive: false }` is a third argument to `addEventListener`. Browsers assume wheel listeners are **passive**, which means they promise not to call `preventDefault`, so the page can scroll at once without waiting for them. `passive: false` says this one does call it.
- Why the camera lives here and not in the store: nothing but the game view uses it, and it changes on every pan and zoom. ADR 5's rule (lesson 4.8): a component keeps the state nothing else needs.

```check
run "npx tsc"
run "npm run e2e" stdout="10 passed" label="zoom and pan work, and clicks and drags still find the right thing"
```

```predict
question: Suppose pointermove forgot view.toLocal, and passed the screen point straight to dragPosition, while from was a world point. You zoom in to 200% and drag the player 40 pixels right. What happens?
choice: It moves 20 units right, as it should
choice: It jumps away at the start of the drag, because a screen point and a world point are subtracted
choice: It moves 40 units right: twice as far as the pointer on screen
answer: It jumps away at the start of the drag, because a screen point and a world point are subtracted
explain: to - from is meant to be the pointer's step in the world. With to on screen and from in the world, it's the step between two different kinds of position, which is large even before the pointer moves. Mixing screen and world positions is exactly the bug this lesson's tests guard against: everything about the scene is done in world positions, and turned into screen ones only to draw.
```

Run `npm start`. Zoom with the wheel over a corner of the wall, and the corner stays under the pointer. Pan with the right button. Click, drag and zoom out again. Press Play: the game shows its own view; Stop, and the editor's camera is back.

## Commit

```powershell
git add .
git commit -m "The editor's camera: pan and zoom, with picking and dragging done in world positions"
```

```check
git-clean
```

## Challenge: frame the selection

**Optional, ★★.** Godot and Unity both have a key (F) that moves the camera so the selected thing is in the middle of the view. Write `frame(view, world, screenCentre)` in `viewport.ts`, test first: a view with the same zoom, moved so that `world` is drawn at `screenCentre`. Then call it on F in the game view, with the selected box's `globalPosition`.

```hints
nudge: Keep the axes of the view and change only its origin.
concept: view.apply(world) is where world is drawn now; the view must move by screenCentre minus that.
shape: return panBy(view, screenCentre.subtract(view.apply(world)));
```
