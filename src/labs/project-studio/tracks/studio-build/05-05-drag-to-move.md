---
title: 5.5 — Drag to Move
track: Build Your Own Game Studio
runtime: none
concepts: dragging, pointer-capture, live-preview, one-command-per-gesture, parent-space
problem: A drag sends dozens of pointer moves a second. If each one were a command, one drag would take dozens of undos. How does the view show the box following the pointer, but record one change when you let go?
---

Sprint 5's second story: drag the selected thing to move it. A drag is three kinds of pointer event:

- `pointerdown`: the button goes down on a box. Lesson 5.4 already selects it there.
- `pointermove`: the pointer moves, perhaps a hundred times in one drag. The box must follow, every time, so you can place it by eye.
- `pointerup`: the button comes up. The box is where you want it.

The question is what to change on each move. Lesson 4.7 had the same question for typing: typing "100" is three changes to the box's text, but one change to the scene. The inspector kept a **draft** while you typed, and made one command on Enter. A drag works the same way:

- While you drag, only the game's **node** moves: the engine object Phaser draws. The scene's data, the history and the log don't change. This is the draft.
- When you let go, the store's `setProp` makes one command with the final position. The game is built again from the scene, and the new node is exactly where the old one was dragged to.

So one drag is one line in the log, and one Ctrl+Z.

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
```

- The new test is the last one.
- `view.boundingBox()` gives the canvas's place in the window: its `x`, `y`, `width` and `height`. `page.mouse` works in window positions, so each position in the canvas is `box.x + …` and `box.y + …`.
- `boundingBox()` gives `null` if the element isn't shown. `if (!box) throw …` stops the test with a clear message, and tells TypeScript that after that line `box` isn't `null`.
- The drag:
  - `page.mouse.move` to `(410, 230)` in the canvas, inside the player.
  - `page.mouse.down()` presses the button there.
  - `page.mouse.move(…, { steps: 5 })` moves to `(510, 305)` in five pointer moves, as a hand would, not in one jump.
  - `page.mouse.up()` lets go.
- The pointer moved 100 across and 75 down, so the player, which started at `(400, 225)`, must end at `(500, 300)`. The readout must say `500`, the inspector's x box too, and the log must hold **one** line.
- Undo must put it back at 400 in one go.

```check
run "npm run e2e" exit=1 stderr="expected '400' to be '500'" label="the test fails: dragging moves nothing yet"
```

## Where a dragged node goes: a test

Change `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import { dragPosition, drawSelection, pathOf, pick, type OutlinePainter } from './viewport';

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

test('a drag moves a node by as much as the pointer moved', () => {
  const position = dragPosition(new Vec2(100, 100), IDENTITY, new Vec2(110, 105), new Vec2(160, 125));
  expect(position).toEqual(new Vec2(150, 120));
});
```

- A new import, `IDENTITY` from lesson 5.2, and a new test at the end, for one new function: `dragPosition(start, parent, from, to)`. It gives a dragged node's new position: where it started, its parent's transform, and where the pointer was pressed and is now, in world positions.
- The first test: a node at the top of the scene (its parent's transform is the identity) starts at `(100, 100)`. The pointer went from `(110, 105)` to `(160, 125)`: 50 across and 20 down. The node must be at `(150, 120)`: moved by as much as the pointer.

```check
run "npx vitest run src" exit=1 stderr="dragPosition is not a function"
```

## dragPosition

Change `src/editor/viewport.ts`:

```ts file=src/editor/viewport.ts
import { Box } from '../engine/box';
import { corners, type Point } from '../engine/draw';
import type { Node } from '../engine/node';
import type { Transform } from '../engine/transform';
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

export function dragPosition(start: Vec2, _parent: Transform, from: Vec2, to: Vec2): Vec2 {
  return start.add(to.subtract(from));
}
```

- `import type { Transform }`: the file only uses the type.
- The new position is where the node started, moved by the pointer's step: `to.subtract(from)`.
- `_parent` is in the parameters because the test passes it, but this version doesn't use it: the `_` says so (lesson 2.4). For a node at the top of the scene, the parent's transform changes nothing, and that's the only case the test has asked about.

```check
run "npx vitest run src" stdout="114 passed"
run "npx tsc"
```

## Inside a turned parent: a test

Add a test to `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY, transformOf } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import { dragPosition, drawSelection, pathOf, pick, type OutlinePainter } from './viewport';

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
```

- The second test is why it needs the parent. The parent is at `(300, 200)`, turned a quarter turn and twice the size. Its child starts at `(10, 0)` in the parent's coordinates.
  - The pointer moves 20 pixels **down** the screen.
  - The parent is turned a quarter turn clockwise, so its own x axis points down the screen, and twice the size, so 20 pixels is 10 of its steps.
  - So the child must be at `(20, 0)` in its parent: 10 more along the parent's x axis. Adding the pointer's `(0, 20)` to the position would give `(10, 20)`, and the child would jump sideways in the view.

```check
run "npx vitest run src" exit=1 stderr="under a turned, stretched parent"
```

## Moving in the parent's steps

Change `src/editor/viewport.ts`:

```ts file=src/editor/viewport.ts
import { Box } from '../engine/box';
import { corners, type Point } from '../engine/draw';
import type { Node } from '../engine/node';
import type { Transform } from '../engine/transform';
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

export function dragPosition(start: Vec2, parent: Transform, from: Vec2, to: Vec2): Vec2 {
  const startGlobal = parent.apply(start);
  return parent.toLocal(startGlobal.add(to.subtract(from)));
}
```

- `dragPosition` works in three moves:
  - `parent.apply(start)`: where the node started, in the world.
  - `.add(to.subtract(from))`: moved by the pointer's step in the world.
  - `parent.toLocal(…)`: back into the parent's coordinates, which is what a node's position is.
- Why from the start every time, not from where the last move left it: each move's position is worked out from the same start and the pointer's total step, so small errors never add up over a hundred moves, and moving back to where you pressed puts the node exactly back.

```check
run "npx vitest run src" stdout="115 passed"
run "npx tsc"
```

## Dragging in the game view

Change `src/ui/GameView.tsx`:

```tsx file=src/ui/GameView.tsx
import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { dragPosition, drawSelection, pathOf, pick } from '../editor/viewport';
import type { Box } from '../engine/box';
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

    const canvas = phaser.canvas;
    let drag: { box: Box; path: string; start: Vec2; from: Vec2 } | null = null;

    canvas.addEventListener('pointerdown', (event) => {
      if (store.playing) return;
      const point = new Vec2(event.offsetX, event.offsetY);
      const hit = pick(game.root, point);
      store.select(hit ? pathOf(hit) : null);
      if (!hit) return;
      drag = { box: hit, path: pathOf(hit), start: hit.position, from: point };
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const to = new Vec2(event.offsetX, event.offsetY);
      const position = dragPosition(drag.start, drag.box.parentTransform, drag.from, to);
      drag.box.position = new Vec2(Math.round(position.x), Math.round(position.y));
    });

    canvas.addEventListener('pointerup', () => {
      if (!drag) return;
      const { box, path, start } = drag;
      drag = null;
      if (box.position.x === start.x && box.position.y === start.y) return;
      store.setProp(path, 'position', { x: box.position.x, y: box.position.y });
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

- `import type { Box }`: the drag remembers which box it's moving.
- `const canvas = phaser.canvas;` names the canvas once, since all three listeners use it.
- `let drag: { … } | null = null;` is what's being dragged, or `null` when nothing is. It's a variable inside the effect, so all three listeners share it, and nothing outside sees it. Its type is written out in place:
  - `box`: the engine node being moved;
  - `path`: its path, for the command at the end;
  - `start`: its position when the drag began. A `Vec2` never changes (lesson 1.1); moving the box gives it a new `Vec2`, so `start` stays the starting position.
  - `from`: where the pointer was pressed.
- Why not React state: nothing React draws depends on the drag while it happens. The game loop draws the box from the node every frame.
- `pointerdown` works as in lesson 5.4, and then, if a box was hit, starts a drag:
  - `drag = { … }` fills in all four.
  - `canvas.setPointerCapture(event.pointerId)`: from now until the button comes up, every pointer event goes to the canvas, even when the pointer leaves it. Without it, a quick drag that slips off the edge would stop getting moves, and the `pointerup` would happen somewhere else. `event.pointerId` says which pointer: a touch screen can have several fingers down.
- `pointermove`:
  - `if (!drag) return;`: a pointer moving with no drag does nothing.
  - `dragPosition(drag.start, drag.box.parentTransform, drag.from, to)` is the new position. `parentTransform` is the getter lesson 5.2 kept separate for this.
  - `Math.round` on each part keeps positions whole pixels: a drag can't be more exact than the pointer anyway, and the log stays readable.
  - It sets `drag.box.position`, the engine node only: this is the draft. The next frame draws the box in its new place.
- `pointerup`:
  - `const { box, path, start } = drag;` takes three properties out of `drag` into variables of the same names. This is **destructuring**, the object form of lesson 4.6's array one.
  - `drag = null;` ends the drag before anything else, so nothing that follows can see a finished drag.
  - If the box is where it started (a click with no move), `return`: a click is not a change.
  - Otherwise `store.setProp(path, 'position', { … })`: one command, with the final position as plain data. The store runs it, and its check builds the game again from the scene: the dragged node is replaced by a new one, in the same place.

```predict
question: Suppose pointermove also called store.setProp(...) after moving the box, so every move made a command. The test drags in five moves. What does the log hold at the end?
choice: One line: the store merges commands for the same property
choice: Five lines, one for each move, and five undos to take it back
choice: Nothing: setProp during a drag is refused
answer: Five lines, one for each move, and five undos to take it back
explain: The store runs every setProp as its own command, so each move is a line in the log and a step in the undo history. A real drag sends a move for every pixel or so: a hundred lines for one drag. Keeping the draft in the engine node and making one command on pointerup is what makes a drag one change.
```

```check
run "npx tsc"
run "npm run e2e" stdout="9 passed" label="a drag moves the player, as one change"
```

Run `npm start`. Drag the wall and the player about. The inspector's numbers change when you let go, not while you drag: the inspector shows the scene, and the scene changes once, at the end. Undo takes back one whole drag at a time.

## Commit, and tick the second story

You can drag a thing to move it: tick the second Sprint 5 story in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "Drag to move: the node follows the pointer, one command when you let go"
```

```check
contains BACKLOG.md "- [x] As a game maker, I want to drag the selected thing to move it"
git-clean
```

## Challenge: Escape cancels a drag

**Optional, ★★.** Pressing Escape during a drag should put the box back where it started and make no command. Where does the `keydown` listener go, and how does it reach `drag`? What must it do to the box, and to `drag`, so that the `pointerup` that follows does nothing?

```hints
nudge: The listener must be added inside the effect, to see drag, and taken off in its cleanup.
concept: Putting the box back is setting its position to drag.start; making pointerup do nothing is setting drag to null.
shape: function cancel(event: KeyboardEvent) { if (event.key === 'Escape' && drag) { drag.box.position = drag.start; drag = null; } } window.addEventListener('keydown', cancel); and in the cleanup, window.removeEventListener('keydown', cancel).
```
