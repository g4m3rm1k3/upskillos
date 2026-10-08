---
title: 5.4 — Click to Select
track: Build Your Own Game Studio
runtime: none
concepts: hit-testing, picking, screen-coordinates, pointer-events, draw-order
problem: You click the game view at some pixel. Which node did you click? The boxes can be turned, stretched, nested and on top of each other. How does the editor find the one you meant?
---

Sprint 5's first story: click a thing in the game view to select it. The scene tree (lesson 4.5) selects by name; the game view has to select by **place**. Finding which object is under a point is called **hit testing**, or **picking**, and every editor and every game with a mouse does it.

The click gives a position in pixels. The plan:

- Find the click in the canvas's own pixels: how far from the canvas's left edge, and from its top. Until the editor has a camera (lesson 5.6) a canvas pixel is exactly a world position: the game draws at `(400, 60)` at 400 pixels across and 60 down.
- Ask each box: is this point inside you? For a turned box that sounds hard, but lesson 5.2 makes it easy. Turn the point into the box's own coordinates with `toLocal`. There the box is upright and centred on `(0, 0)`, so the point is inside if it's no more than half the width from the centre across, and half the height up or down.
- If boxes overlap, the one you see is the one drawn last, so ask them in the opposite order to drawing.
- Turn the box found into its path, and select it in the store.

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
```

- The new test is the last one.
- `page.locator('#game canvas')` finds the canvas Phaser draws into, without waiting for it. A **locator** is a way of finding an element that Playwright uses again each time something is done with it.
- `view.click({ position: { x: 400, y: 60 } })` clicks the canvas at 400 pixels from its left edge and 60 from its top. Playwright waits until the canvas is there, then clicks.
- `(400, 60)` is the wall's centre, so the wall's button in the scene tree must become `selected`.
- `(410, 230)` is inside the player, a 32 pixel square around `(400, 225)`: it reaches from 384 to 416 across, and 209 to 241 down.
- `(100, 400)` is empty floor: clicking it must select nothing, so the inspector shows its message again.

```check
run "npm run e2e" exit=1 stderr="expected '' to be 'selected'" label="the test fails: clicking the game view does nothing yet"
```

## Picking: a test

Create `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import { Node } from '../engine/node';
import { Vec2 } from '../engine/vec2';
import { pick } from './viewport';

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
```

- `level()` builds a small tree of engine nodes, as the game holds them: a `root` (the game's own, lesson 1.7), a `level`, and in it a wall 200 by 20 and a 32 pixel crate, both centred at `(100, 100)`. The crate is added second, so it's drawn on top of the wall.
- The first test:
  - `(30, 105)` is on the wall, and away from the crate.
  - `(110, 110)` is on both. The crate is drawn on top, so the crate must be the one found.
  - `(30, 200)` is on nothing: `null`.
  - `pick(…)?.name`: `?.` is **optional chaining**. If what's before it is `null` or `undefined`, the whole expression is `undefined` instead of an error; otherwise it reads `.name` as usual.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './viewport'"
```

## pick

Create `src/editor/viewport.ts`:

```ts file=src/editor/viewport.ts
import { Box } from '../engine/box';
import type { Node } from '../engine/node';
import type { Vec2 } from '../engine/vec2';

export function pick(node: Node, point: Vec2): Box | null {
  for (let i = node.children.length - 1; i >= 0; i--) {
    const found = pick(node.children[i], point);
    if (found) return found;
  }
  if (node instanceof Box) {
    const offset = point.subtract(node.globalPosition);
    if (Math.abs(offset.x) <= node.size.x / 2 && Math.abs(offset.y) <= node.size.y / 2) return node;
  }
  return null;
}
```

- The file is in `src/editor`, not `src/engine`: picking and outlines are for editing. A game with a mouse could pick too, but this one doesn't need to yet.
- `pick(node, point)` returns the box under `point`, or `null`:
  - `for (let i = node.children.length - 1; i >= 0; i--)` goes through the children from the last to the first. `i--` takes one from `i` after each round. The last child is drawn last, on top, so it's asked first.
  - Each child is asked with `pick` again: a child's own children are drawn after it, so they're on top of it and asked before it. As soon as one finds a box, `return found` stops the search.
  - If no child has it, the node itself: if it's a `Box`, `offset` is the step from the box's centre to the point. `Math.abs` gives a number without its sign (`Math.abs(-7)` is `7`), so `Math.abs(offset.x) <= node.size.x / 2` means "at most half the width from the centre, either way".
  - A plain `Node` or `Node2D` has no size, so it can't be clicked.
- This passes, and it has a gap you can probably see: it treats every box as upright. The next test is a second example that shows it.

```check
run "npx vitest run src" stdout="110 passed"
run "npx tsc"
```

## A turned box: a test

Add a test to `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import { Node } from '../engine/node';
import { Vec2 } from '../engine/vec2';
import { pick } from './viewport';

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
```

- The second test turns the wall a quarter turn, so it runs up and down. `root.get('level/wall') as Box`: `get` returns a `Node`, and `as Box` tells TypeScript it's a `Box` here, which the test knows. Now `(30, 105)` is off the wall, and `(105, 30)`, 70 pixels above the centre, is on it.
- This is triangulation (lesson 4.7): a second example the simple code gets wrong.

```check
run "npx vitest run src" exit=1 stderr="pick tests a turned box by its turned shape"
```

## Picking by the box's own shape

Change `src/editor/viewport.ts`:

```ts file=src/editor/viewport.ts
import { Box } from '../engine/box';
import type { Node } from '../engine/node';
import type { Vec2 } from '../engine/vec2';

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
```

- Only one line changes. `node.globalTransform.toLocal(point)` turns the point into the box's own coordinates (lesson 5.2). There the box is upright and centred on `(0, 0)`, whatever its turn and stretch, so the same "half the width, half the height" check is right for every box.
- The old `offset` was the same thing for a box that isn't turned or stretched, which is why the first test passed with it.

```check
run "npx vitest run src" stdout="111 passed"
run "npx tsc"
```

## A node's path: a test

Add a test to `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import { Node } from '../engine/node';
import { Vec2 } from '../engine/vec2';
import { pathOf, pick } from './viewport';

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
```

- The third test: `pathOf` gives a node's path, the same kind the scene tree and the store use: `level/crate`. The game's own `root` isn't part of it, because the scene starts at `level`.

```check
run "npx vitest run src" exit=1 stderr="pathOf is not a function"
```

## pathOf

Change `src/editor/viewport.ts`:

```ts file=src/editor/viewport.ts
import { Box } from '../engine/box';
import type { Node } from '../engine/node';
import type { Vec2 } from '../engine/vec2';

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
```

- `pathOf(node)` collects names going up:
  - `while (current.parent)` goes on while there's a parent. The game's `root` has none, so its name is never added.
  - `names.unshift(current.name)` puts a name at the **start** of the array (`push` puts one at the end), because the names are found from the bottom up.
  - `names.join('/')` joins them with slashes.

```check
run "npx vitest run src" stdout="112 passed"
run "npx tsc"
```

## An outline: a test

Add a test to `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { Vec2 } from '../engine/vec2';
import { drawSelection, pathOf, pick, type OutlinePainter } from './viewport';

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
  drawSelection(root, 'level/crate', painter);
  expect(painter.calls).toEqual(['line 2 ffcc00', 'outline 84,84 116,84 116,116 84,116 true']);
  painter.calls = [];
  drawSelection(root, null, painter);
  drawSelection(root, 'level', painter);
  expect(painter.calls).toEqual([]);
});
```

- The last test is for an outline round the selected box, so you can see in the view what's selected:
  - The painter records `lineStyle(width, color)` (how lines are drawn: 2 pixels, yellow `ffcc00`) and `strokePoints(points, closeShape)` (draw the lines through the points, and back to the first if `closeShape` is `true`).
  - The crate's outline is its four corners: 16 either side of `(100, 100)`.
  - With no selection, or a selected node that isn't a box (`level` is a plain `Node`), nothing is drawn.

```check
run "npx vitest run src" exit=1 stderr="drawSelection is not a function"
```

## drawSelection

Change `src/editor/viewport.ts`:

```ts file=src/editor/viewport.ts
import { Box } from '../engine/box';
import { corners, type Point } from '../engine/draw';
import type { Node } from '../engine/node';
import type { Vec2 } from '../engine/vec2';

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

export function drawSelection(root: Node, path: string | null, painter: OutlinePainter): void {
  if (path === null) return;
  const node = root.get(path);
  if (!(node instanceof Box)) return;
  painter.lineStyle(2, 0xffcc00);
  painter.strokePoints(corners(node), true);
}
```

- `interface OutlinePainter` lists the two Phaser `Graphics` methods the outline uses, as `Painter` does for drawing (lesson 1.8). Phaser's `strokePoints` has more parameters, all optional, so it fits.


```check
run "npx vitest run src" stdout="113 passed"
run "npx tsc"
```

## Clicks in the game view

Change `src/ui/GameView.tsx`:

```tsx file=src/ui/GameView.tsx
import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { drawSelection, pathOf, pick } from '../editor/viewport';
import { drawTree } from '../engine/draw';
import type { Game } from '../engine/game';
import { Vec2 } from '../engine/vec2';
import type { EditorStore } from '../editor/store';

export function GameView({ store, game, readout }: { store: EditorStore; game: Game; readout: () => string }) {
  const holder = useRef<HTMLDivElement>(null);
  const shown = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    class Play extends Phaser.Scene {
      private graphics!: Phaser.GameObjects.Graphics;

      create(): void {
        this.graphics = this.add.graphics();
      }

      override update(_time: number, delta: number): void {
        if (store.playing) game.frame(delta / 1000);
        this.graphics.clear();
        drawTree(game.root, this.graphics);
        drawSelection(game.root, store.selected, this.graphics);
        if (shown.current) shown.current.textContent = readout();
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

    phaser.canvas.addEventListener('pointerdown', (event) => {
      if (store.playing) return;
      const hit = pick(game.root, new Vec2(event.offsetX, event.offsetY));
      store.select(hit ? pathOf(hit) : null);
    });

    return () => phaser.destroy(true);
  }, [store, game, readout]);

  return (
    <div>
      <div id="game" ref={holder}></div>
      <p>
        Player x: <span id="player-x" ref={shown}></span>
      </p>
    </div>
  );
}
```

- In `update`, `drawSelection(game.root, store.selected, this.graphics)` comes after `drawTree`, so the outline is on top of every box. It reads the selection from the store every frame, so it follows the selected node wherever it goes, even while playing.
- `phaser.canvas` is the `<canvas>` element Phaser made inside the holder. Phaser makes it in its constructor, so it's there on the next line.
- `canvas.addEventListener('pointerdown', …)`: a **pointer** event happens for a mouse, a pen or a finger on a touch screen. `pointerdown` is a button or finger going down, the start of a click.
- `if (store.playing) return;`: while the game is playing, clicks belong to the game, not the editor.
- `event.offsetX` and `event.offsetY` are where the pointer is, in pixels from the left and top edges of the element it's over: the canvas. That's a canvas pixel, which (for now) is a world position. `clientX` and `clientY` are measured from the window's corner instead, and would need the canvas's own position taken off.
- `pick(game.root, …)` finds the box, and `store.select(hit ? pathOf(hit) : null)` selects its path, or nothing. The store tells its listeners, so the tree and the inspector are drawn again.
- The listener is never taken off. `phaser.destroy(true)` removes the canvas from the page, and the listener goes with it.
- Why `pointerdown` and not `click`: a `click` comes after the button goes back up. Lesson 5.5 starts dragging when the button goes down.

```check
run "npx tsc"
run "npm run e2e" stdout="8 passed" label="clicking the game view selects what's under the pointer"
```

Run `npm start`. Click the wall, the player and the floor: the yellow outline and the tree follow. Turn the wall to 45° in the inspector and click near its ends and just off its sides: only the turned shape counts.

## Commit, and tick the first story

You can click a thing in the game view to select it: tick the first Sprint 5 story in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "Click to select: picking in the game view, and an outline round the selection"
```

```check
contains BACKLOG.md "- [x] As a game maker, I want to click a thing in the game view to select it"
git-clean
git-tracked src/editor/viewport.ts
```

## Challenge: click again to go deeper

**Optional, ★★★.** When boxes overlap, the one on top always wins. Many editors let you click again in the same place to select the one underneath, and again for the next. Write `pickAll(node, point)`, which returns every box under the point, top first, test first. Then in the game view: if the selected path is in that list, select the next one; if not, the first.

```hints
nudge: pickAll is pick without the early return: collect every hit into an array.
concept: The order must be the same as pick's: children last to first, each child's children before the child.
shape: const hits = pickAll(game.root, point).map(pathOf); const index = hits.indexOf(store.selected ?? ''); store.select(hits.length === 0 ? null : hits[(index + 1) % hits.length]);
```
