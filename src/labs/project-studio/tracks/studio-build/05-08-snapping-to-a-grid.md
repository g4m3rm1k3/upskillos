---
title: 5.8 — Snapping to a Grid
track: Build Your Own Game Studio
runtime: none
concepts: snapping, rounding, floating-point, grids, controlled-checkbox
problem: Placing walls by eye leaves gaps of a pixel or two, and a turn of 44° where you meant 45°. How does the editor make every drag land exactly on a grid, and why can't the steps be any size you like?
---

Sprint 5's last story: moves snap to a grid, so things line up exactly. **Snapping** means a value is rounded to the nearest of a set of allowed values, evenly spaced: every 16 pixels for a position, every 15° for a rotation. Two walls snapped to the same grid meet with no gap.

The rounding is one line: divide by the step, round to a whole number, multiply back. 437 pixels is 27.3 steps of 16; rounded, 27 steps; times 16, 432. This lesson adds:

- a **snap** box in the toolbar, to turn snapping on and off;
- a faint grid drawn in the view while it's on, so you can see where things will land;
- snapping in every tool: positions to 16 pixels, rotations to 15°, scales to quarters.

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

test('the rotate tool turns a thing, and the scale tool stretches it, each drag one change', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    const box = await page.locator('#game canvas').boundingBox();
    if (!box) throw new Error('The game view is not on the page');
    await expect.poll(() => page.locator('#tool-rotate').count()).toBe(1);
    await page.click('#tool-rotate');
    await page.mouse.move(box.x + 650, box.y + 60);
    await page.mouse.down();
    await page.mouse.move(box.x + 617, box.y + 185, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => page.inputValue('#prop-rotation')).toBe('30');

    await page.click('#tool-scale');
    await page.mouse.move(box.x + 410, box.y + 225);
    await page.mouse.down();
    await page.mouse.move(box.x + 420, box.y + 225, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => page.inputValue('#prop-scale-x')).toBe('2');
    expect(await page.textContent('#log')).toBe(
      'scene.setProp("level/wall", "rotation", 30);' + 'scene.setProp("level/player", "scale", { x: 2, y: 2 });',
    );
  } finally {
    await app.close();
  }
}, 30000);

test('with snap on, a dragged thing lands on the grid', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    const box = await page.locator('#game canvas').boundingBox();
    if (!box) throw new Error('The game view is not on the page');
    await expect.poll(() => page.locator('#snap').count()).toBe(1);
    await page.check('#snap');
    await page.mouse.move(box.x + 410, box.y + 230);
    await page.mouse.down();
    await page.mouse.move(box.x + 447, box.y + 250, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => page.textContent('#player-x')).toBe('432');
    expect(await page.textContent('#log')).toBe('scene.setProp("level/player", "position", { x: 432, y: 240 });');
  } finally {
    await app.close();
  }
}, 30000);
```

- The new test is the last one.
- `page.check('#snap')` ticks the checkbox with the id `snap`, which this lesson adds. (`page.uncheck` would untick it.) As in lesson 5.7, the line before checks the box is there, so the red fails fast and says why.
- It drags the player 37 pixels right and 20 down. Without snapping the player would end at `(437, 245)`; with a 16 pixel grid, at the nearest grid point, `(432, 240)`: 27 and 15 steps of 16.

```check
run "npm run e2e" exit=1 stderr="expected +0 to be 1" label="the test fails: there's no snap box yet"
```

## Snapping in the store: a test

Whether snapping is on is used by the toolbar's box and the game view, so it's the store's. Change `src/editor/store.test.ts`:

```ts file=src/editor/store.test.ts
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { findNode } from './scene-api';
import { EditorStore } from './store';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { color: 9807270 }, children: [] },
        { type: 'Box', name: 'car', props: {}, children: [] },
      ],
    },
  };
}

function refuseColor2(data: SceneData): void {
  if (findNode(data, 'level/wall').props.color === 2) throw new Error('2 is not a colour');
}

test('a line of code changes the scene, is logged, and tells every listener', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  store.subscribe(() => calls++);
  store.run('scene.setProp("level/wall", "color", 1);');
  expect(findNode(store.scene, 'level/wall').props.color).toBe(1);
  expect(store.history.code).toEqual(['scene.setProp("level/wall", "color", 1);']);
  expect(calls).toBe(1);
});

test('a line that fails changes nothing, and the problem says why', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.run('scene.setProp("level/truck", "color", 1);');
  expect(store.problem).toBe('There is no node at "level/truck"');
  expect(store.history.code).toEqual([]);
});

test('a change the check refuses is undone, with the reason', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.run('scene.setProp("level/wall", "color", 2);');
  expect(store.problem).toBe('That change was undone: 2 is not a colour');
  expect(findNode(store.scene, 'level/wall').props.color).toBe(9807270);
  expect(store.history.code).toEqual([]);
});

test('a line that fails part way keeps its earlier changes, and they are checked too', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.run('scene.setProp("level/wall", "color", 1); scene.deleteNode("level/truck");');
  expect(store.problem).toBe('There is no node at "level/truck"');
  expect(store.history.code).toEqual(['scene.setProp("level/wall", "color", 1);']);
  store.run('scene.setProp("level/wall", "color", 2); scene.deleteNode("level/truck");');
  expect(store.problem).toBe('That change was undone: 2 is not a colour');
  expect(findNode(store.scene, 'level/wall').props.color).toBe(1);
});

test('undo and redo, and a message when there is nothing to do', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.undo();
  expect(store.problem).toBe('Nothing to undo');
  store.run('scene.setProp("level/wall", "color", 1);');
  expect(store.problem).toBe('');
  store.undo();
  expect(findNode(store.scene, 'level/wall').props.color).toBe(9807270);
  store.redo();
  expect(findNode(store.scene, 'level/wall').props.color).toBe(1);
});

test('selecting a node tells listeners; a listener that unsubscribes hears nothing more', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  const unsubscribe = store.subscribe(() => calls++);
  store.select('level/car');
  expect(store.selected).toBe('level/car');
  unsubscribe();
  store.select(null);
  expect(calls).toBe(1);
});

test('a selected node that stops existing is no longer selected', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.select('level/car');
  store.run('scene.deleteNode("level/car");');
  expect(store.selected).toBe(null);
  store.undo();
  expect(store.selected).toBe(null);
});

test('setProp changes one property through a command, logged as the code that does the same', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.setProp('level/car', 'position', { x: 10, y: 20 });
  expect(findNode(store.scene, 'level/car').props.position).toEqual({ x: 10, y: 20 });
  expect(store.history.code).toEqual(['scene.setProp("level/car", "position", { x: 10, y: 20 });']);
  store.setProp('level/wall', 'color', 2);
  expect(store.problem).toBe('That change was undone: 2 is not a colour');
});

test('play starts the game; stop builds it again from the scene, as it was before playing', () => {
  let builds = 0;
  const store = new EditorStore(scene(), () => builds++);
  let calls = 0;
  store.subscribe(() => calls++);
  expect(store.playing).toBe(false);
  store.play();
  expect(store.playing).toBe(true);
  expect(builds).toBe(0);
  store.stop();
  expect(store.playing).toBe(false);
  expect(builds).toBe(1);
  expect(calls).toBe(2);
});

test('the tool starts as move; choosing another tells listeners', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  store.subscribe(() => calls++);
  expect(store.tool).toBe('move');
  store.setTool('rotate');
  expect(store.tool).toBe('rotate');
  expect(calls).toBe(1);
});

test('snapping starts off; turning it on tells listeners', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  store.subscribe(() => calls++);
  expect(store.snap).toBe(false);
  store.setSnap(true);
  expect(store.snap).toBe(true);
  expect(calls).toBe(1);
});
```

- The new test is the last one: snapping starts off, and turning it on changes `store.snap` and tells the listeners once.

```check
run "npx vitest run src" exit=1 stderr="expected undefined to be false"
```

## The store's snap

Change `src/editor/store.ts`:

```ts file=src/editor/store.ts
import type { PropValue, SceneData } from '../engine/scene';
import { History } from './history';
import { findNode } from './scene-api';
import { runCode, sceneScript, type SceneScript } from './script';

export type Check = (scene: SceneData) => void;

export type Tool = 'move' | 'rotate' | 'scale';

export class EditorStore {
  readonly history = new History();
  readonly script: SceneScript;
  problem = '';
  selected: string | null = null;
  playing = false;
  tool: Tool = 'move';
  snap = false;
  private version = 0;
  private readonly listeners = new Set<() => void>();

  constructor(
    readonly scene: SceneData,
    private readonly check: Check,
  ) {
    this.script = sceneScript(scene, this.history);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  run(code: string): void {
    this.change(() => runCode(code, this.script));
  }

  setProp(path: string, key: string, value: PropValue): void {
    this.change(() => this.script.setProp(path, key, value));
  }

  undo(): void {
    this.change(() => {
      if (!this.history.undo()) this.problem = 'Nothing to undo';
    });
  }

  redo(): void {
    this.change(() => {
      if (!this.history.redo()) this.problem = 'Nothing to redo';
    });
  }

  play(): void {
    this.playing = true;
    this.changed();
  }

  stop(): void {
    this.playing = false;
    this.check(this.scene);
    this.changed();
  }

  setTool(tool: Tool): void {
    this.tool = tool;
    this.changed();
  }

  setSnap(snap: boolean): void {
    this.snap = snap;
    this.changed();
  }

  select(path: string | null): void {
    this.selected = path;
    this.changed();
  }

  private change(action: () => void): void {
    this.problem = '';
    try {
      action();
    } catch (error) {
      this.problem = (error as Error).message;
    }
    this.checkOrUndo();
    if (this.selected !== null && !this.exists(this.selected)) this.selected = null;
    this.changed();
  }

  private checkOrUndo(): void {
    try {
      this.check(this.scene);
    } catch (error) {
      this.history.undo();
      this.check(this.scene);
      this.problem = `That change was undone: ${(error as Error).message}`;
    }
  }

  private exists(path: string): boolean {
    try {
      findNode(this.scene, path);
      return true;
    } catch {
      return false;
    }
  }

  private changed(): void {
    this.version++;
    for (const listener of this.listeners) listener();
  }
}
```

- `snap = false;`: a `boolean` field, off when the studio opens.
- `setSnap(snap)` sets it and calls `changed()`. The parameter has the same name as the field; `this.snap` is the field, and `snap` alone is the parameter.

```check
run "npx vitest run src" stdout="124 passed"
```

## Snapping: a test

Change `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY, transformOf } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import {
  dragPosition,
  dragRotation,
  dragScale,
  drawSelection,
  panBy,
  pathOf,
  pick,
  snapTo,
  zoomAt,
  type OutlinePainter,
} from './viewport';

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

test('a rotate drag turns by the angle the pointer swept round the origin', () => {
  const origin = new Vec2(100, 100);
  expect(dragRotation(10, origin, new Vec2(150, 100), new Vec2(100, 150))).toBeCloseTo(100);
  expect(dragRotation(10, origin, new Vec2(150, 100), new Vec2(150, 50))).toBeCloseTo(-35);
});

test('a scale drag stretches by how much farther from the origin the pointer is', () => {
  const origin = new Vec2(100, 100);
  expect(dragScale(new Vec2(1, 2), origin, new Vec2(110, 100), new Vec2(100, 130))).toEqual(new Vec2(3, 6));
  expect(dragScale(new Vec2(1, 2), origin, origin, new Vec2(100, 130))).toEqual(new Vec2(1, 2));
});

test('snapTo rounds to the nearest step', () => {
  expect(snapTo(437, 16)).toBe(432);
  expect(snapTo(441, 16)).toBe(448);
  expect(snapTo(52, 15)).toBe(45);
  expect(snapTo(1.3, 0.25)).toBe(1.25);
});
```

- The import list is longer than a line, so it's written one name per line, like a long array.
- `snapTo(value, step)` must round to the nearest step: 437 to 432, 441 to 448 (27.56 steps rounds up to 28), 52° to 45° in steps of 15, and 1.3 to 1.25 in steps of 0.25.

```check
run "npx vitest run src" exit=1 stderr="snapTo is not a function"
```

## snapTo

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

export const GRID = 16;

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

export function dragRotation(start: number, origin: Vec2, from: Vec2, to: Vec2): number {
  return start + angleOf(to.subtract(origin)) - angleOf(from.subtract(origin));
}

export function dragScale(start: Vec2, origin: Vec2, from: Vec2, to: Vec2): Vec2 {
  const reach = from.subtract(origin).length();
  if (reach === 0) return start;
  return start.scale(to.subtract(origin).length() / reach);
}

function angleOf(direction: Vec2): number {
  return (Math.atan2(direction.y, direction.x) * 180) / Math.PI;
}

export function snapTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
```

- `export const GRID = 16;` is the grid's size, in world units. It's named once and used for both snapping and drawing, so they can never disagree.
- `snapTo(value, step)` is `Math.round(value / step) * step`: how many steps, rounded, times the step.

```check
run "npx vitest run src" stdout="125 passed"
```

## Tenths and quarters: a learning test

Add a test to `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY, transformOf } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import {
  dragPosition,
  dragRotation,
  dragScale,
  drawSelection,
  panBy,
  pathOf,
  pick,
  snapTo,
  zoomAt,
  type OutlinePainter,
} from './viewport';

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

test('a rotate drag turns by the angle the pointer swept round the origin', () => {
  const origin = new Vec2(100, 100);
  expect(dragRotation(10, origin, new Vec2(150, 100), new Vec2(100, 150))).toBeCloseTo(100);
  expect(dragRotation(10, origin, new Vec2(150, 100), new Vec2(150, 50))).toBeCloseTo(-35);
});

test('a scale drag stretches by how much farther from the origin the pointer is', () => {
  const origin = new Vec2(100, 100);
  expect(dragScale(new Vec2(1, 2), origin, new Vec2(110, 100), new Vec2(100, 130))).toEqual(new Vec2(3, 6));
  expect(dragScale(new Vec2(1, 2), origin, origin, new Vec2(100, 130))).toEqual(new Vec2(1, 2));
});

test('snapTo rounds to the nearest step', () => {
  expect(snapTo(437, 16)).toBe(432);
  expect(snapTo(441, 16)).toBe(448);
  expect(snapTo(52, 15)).toBe(45);
  expect(snapTo(1.3, 0.25)).toBe(1.25);
});

test('steps of 0.1 are not exact in binary, and steps of 0.25 are', () => {
  expect(snapTo(0.3, 0.1)).not.toBe(0.3);
  expect(snapTo(0.3, 0.1)).toBe(0.30000000000000004);
  expect(snapTo(0.8, 0.25)).toBe(0.75);
});
```

- This test is about why scales snap to quarters, not tenths. Computers store numbers in **binary**, in halves, quarters, eighths and so on. A quarter is exactly one of those; a tenth is not, any more than a third can be written exactly in decimal (0.333…). So 0.1 is stored as a number a tiny bit off, and three steps of it come to `0.30000000000000004`, not 0.3. A scale of `0.30000000000000004` would work, but it's ugly in the log and in the scene's file. Quarters, `0.25`, come out exact.
- This is a learning test (lesson 2.1): it doesn't drive any code, it pins down a fact about JavaScript's numbers that a decision rests on. If you ever wonder why scales snap to quarters, here's the answer, and it runs.

```check
run "npx vitest run src" stdout="126 passed" label="it passes at once: it describes JavaScript, not new code"
```

## The grid: a test

Add a test to `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY, transformOf } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import {
  dragPosition,
  dragRotation,
  dragScale,
  drawGrid,
  drawSelection,
  panBy,
  pathOf,
  pick,
  snapTo,
  zoomAt,
  type GridPainter,
  type OutlinePainter,
} from './viewport';

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

test('a rotate drag turns by the angle the pointer swept round the origin', () => {
  const origin = new Vec2(100, 100);
  expect(dragRotation(10, origin, new Vec2(150, 100), new Vec2(100, 150))).toBeCloseTo(100);
  expect(dragRotation(10, origin, new Vec2(150, 100), new Vec2(150, 50))).toBeCloseTo(-35);
});

test('a scale drag stretches by how much farther from the origin the pointer is', () => {
  const origin = new Vec2(100, 100);
  expect(dragScale(new Vec2(1, 2), origin, new Vec2(110, 100), new Vec2(100, 130))).toEqual(new Vec2(3, 6));
  expect(dragScale(new Vec2(1, 2), origin, origin, new Vec2(100, 130))).toEqual(new Vec2(1, 2));
});

test('snapTo rounds to the nearest step', () => {
  expect(snapTo(437, 16)).toBe(432);
  expect(snapTo(441, 16)).toBe(448);
  expect(snapTo(52, 15)).toBe(45);
  expect(snapTo(1.3, 0.25)).toBe(1.25);
});

test('steps of 0.1 are not exact in binary, and steps of 0.25 are', () => {
  expect(snapTo(0.3, 0.1)).not.toBe(0.3);
  expect(snapTo(0.3, 0.1)).toBe(0.30000000000000004);
  expect(snapTo(0.8, 0.25)).toBe(0.75);
});

class LinePainter implements GridPainter {
  lines: string[] = [];

  lineStyle(): void {}

  lineBetween(x1: number, y1: number, x2: number, y2: number): void {
    this.lines.push(`${x1},${y1} to ${x2},${y2}`);
  }
}

test('the grid has a line at every step across the view, in world positions drawn through the view', () => {
  const painter = new LinePainter();
  drawGrid(painter, IDENTITY, 32, 16, 16);
  expect(painter.lines).toEqual(['0,0 to 0,16', '16,0 to 16,16', '32,0 to 32,16', '0,0 to 32,0', '0,16 to 32,16']);
  painter.lines = [];
  drawGrid(painter, zoomAt(IDENTITY, new Vec2(0, 0), 2), 32, 16, 16);
  expect(painter.lines).toEqual(['0,0 to 0,16', '32,0 to 32,16', '0,0 to 32,0']);
});
```

- The grid test uses a painter that records each `lineBetween(x1, y1, x2, y2)`: a straight line from one point to the other.
  - On a 32 by 16 canvas with no zoom, a grid of 16 has vertical lines at x = 0, 16 and 32, and horizontal ones at y = 0 and 16.
  - Zoomed in 2 times about `(0, 0)`, the same 32 by 16 canvas only shows 16 by 8 of the world. Its grid lines are at world x = 0 and 16, which are drawn at 0 and 32 on screen, and at world y = 0, drawn at 0. The lines are in the world; only their drawing goes through the view.

```check
run "npx vitest run src" exit=1 stderr="drawGrid is not a function"
```

## drawGrid

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

export interface GridPainter {
  lineStyle(width: number, color: number): unknown;
  lineBetween(x1: number, y1: number, x2: number, y2: number): unknown;
}

export const GRID = 16;

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

export function dragRotation(start: number, origin: Vec2, from: Vec2, to: Vec2): number {
  return start + angleOf(to.subtract(origin)) - angleOf(from.subtract(origin));
}

export function dragScale(start: Vec2, origin: Vec2, from: Vec2, to: Vec2): Vec2 {
  const reach = from.subtract(origin).length();
  if (reach === 0) return start;
  return start.scale(to.subtract(origin).length() / reach);
}

function angleOf(direction: Vec2): number {
  return (Math.atan2(direction.y, direction.x) * 180) / Math.PI;
}

export function snapTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function drawGrid(painter: GridPainter, view: Transform, width: number, height: number, step: number): void {
  const topLeft = view.toLocal(new Vec2(0, 0));
  const bottomRight = view.toLocal(new Vec2(width, height));
  painter.lineStyle(1, 0x2c3444);
  for (let x = Math.ceil(topLeft.x / step) * step; x <= bottomRight.x; x += step) {
    const top = view.apply(new Vec2(x, topLeft.y));
    const bottom = view.apply(new Vec2(x, bottomRight.y));
    painter.lineBetween(top.x, top.y, bottom.x, bottom.y);
  }
  for (let y = Math.ceil(topLeft.y / step) * step; y <= bottomRight.y; y += step) {
    const left = view.apply(new Vec2(topLeft.x, y));
    const right = view.apply(new Vec2(bottomRight.x, y));
    painter.lineBetween(left.x, left.y, right.x, right.y);
  }
}
```

- `interface GridPainter` is the two Phaser `Graphics` methods the grid needs: `lineStyle` and `lineBetween`.
- `drawGrid(painter, view, width, height, step)` draws the grid lines that can be seen:
  - `topLeft` and `bottomRight` are the world positions at the canvas's corners: `view.toLocal` of `(0, 0)` and `(width, height)`. Everything between them is on screen.
  - `lineStyle(1, 0x2c3444)`: 1 pixel lines, a blue grey a little lighter than the background, so the grid is faint.
  - `Math.ceil` rounds **up** to a whole number (`Math.ceil(2.1)` is 3). `Math.ceil(topLeft.x / step) * step` is the first grid line at or right of the left edge.
  - The first `for` loop goes from there in steps of `step`, `x += step`, while `x <= bottomRight.x`. Each line runs from the top of the screen to the bottom, at world x: its two ends, `(x, topLeft.y)` and `(x, bottomRight.y)`, go through `view.apply` to be drawn.
  - The second loop does the same for horizontal lines.
- Why only the lines that can be seen: the world goes on for ever, and so would the grid. Zoomed out to a quarter, the view shows 3,200 by 1,800 units: about 200 lines one way and 113 the other, which is fine. That's why `zoomAt` stops at a quarter.

```check
run "npx vitest run src" stdout="127 passed"
```

## Refactor: a test file in groups

`viewport.test.ts` now has 14 tests about six different things, one after another. Tests are code too, and they get tidied like code: this is the refactor beat, for tests. Change `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { describe, expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY, transformOf } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import {
  dragPosition,
  dragRotation,
  dragScale,
  drawGrid,
  drawSelection,
  panBy,
  pathOf,
  pick,
  snapTo,
  zoomAt,
  type GridPainter,
  type OutlinePainter,
} from './viewport';

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

describe('picking', () => {
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

describe('the outline', () => {
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
});

describe('dragging', () => {
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

  test('a rotate drag turns by the angle the pointer swept round the origin', () => {
    const origin = new Vec2(100, 100);
    expect(dragRotation(10, origin, new Vec2(150, 100), new Vec2(100, 150))).toBeCloseTo(100);
    expect(dragRotation(10, origin, new Vec2(150, 100), new Vec2(150, 50))).toBeCloseTo(-35);
  });

  test('a scale drag stretches by how much farther from the origin the pointer is', () => {
    const origin = new Vec2(100, 100);
    expect(dragScale(new Vec2(1, 2), origin, new Vec2(110, 100), new Vec2(100, 130))).toEqual(new Vec2(3, 6));
    expect(dragScale(new Vec2(1, 2), origin, origin, new Vec2(100, 130))).toEqual(new Vec2(1, 2));
  });
});

describe('the view', () => {
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
});

describe('snapping', () => {
  test('snapTo rounds to the nearest step', () => {
    expect(snapTo(437, 16)).toBe(432);
    expect(snapTo(441, 16)).toBe(448);
    expect(snapTo(52, 15)).toBe(45);
    expect(snapTo(1.3, 0.25)).toBe(1.25);
  });

  test('steps of 0.1 are not exact in binary, and steps of 0.25 are', () => {
    expect(snapTo(0.3, 0.1)).not.toBe(0.3);
    expect(snapTo(0.3, 0.1)).toBe(0.30000000000000004);
    expect(snapTo(0.8, 0.25)).toBe(0.75);
  });
});

class LinePainter implements GridPainter {
  lines: string[] = [];

  lineStyle(): void {}

  lineBetween(x1: number, y1: number, x2: number, y2: number): void {
    this.lines.push(`${x1},${y1} to ${x2},${y2}`);
  }
}

describe('the grid', () => {
  test('the grid has a line at every step across the view, in world positions drawn through the view', () => {
    const painter = new LinePainter();
    drawGrid(painter, IDENTITY, 32, 16, 16);
    expect(painter.lines).toEqual(['0,0 to 0,16', '16,0 to 16,16', '32,0 to 32,16', '0,0 to 32,0', '0,16 to 32,16']);
    painter.lines = [];
    drawGrid(painter, zoomAt(IDENTITY, new Vec2(0, 0), 2), 32, 16, 16);
    expect(painter.lines).toEqual(['0,0 to 0,16', '32,0 to 32,16', '0,0 to 32,0']);
  });
});
```

- `describe(name, fn)` groups tests: every `test` inside `fn` belongs to the group. `describe` comes from Vitest, so it joins the import.
- The report now shows each test under its group's name, `picking > pick finds the box under a point, …`, so a failure says which part of the viewport broke before you read the test's own name.
- The helpers sit just before the groups that use them: `level()` at the top, used by several groups, and each recording painter just before the group whose tests use it.
- Not a single test changed, only where they are. So the same 14 must pass: a refactor of tests is checked by the tests, as a refactor of code is.

```check
run "npx vitest run src" stdout="127 passed" label="the same tests pass, now in groups"
```

## The snap box: a test

Change `src/ui/Toolbar.test.tsx`:

```tsx file=src/ui/Toolbar.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { EditorStore } from '../editor/store';
import { Toolbar } from './Toolbar';

test('the button says Play while editing, and Stop while playing', () => {
  const store = new EditorStore({ formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } }, () => {});
  expect(renderToStaticMarkup(<Toolbar store={store} />)).toContain('<button type="button" id="play">Play</button>');
  store.play();
  expect(renderToStaticMarkup(<Toolbar store={store} />)).toContain('<button type="button" id="play">Stop</button>');
});

test('the chosen tool is marked', () => {
  const store = new EditorStore({ formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } }, () => {});
  store.setTool('rotate');
  const html = renderToStaticMarkup(<Toolbar store={store} />);
  expect(html).toContain('<button type="button" id="tool-move" class="">move</button>');
  expect(html).toContain('<button type="button" id="tool-rotate" class="selected">rotate</button>');
});

test('the snap box is ticked when snapping is on', () => {
  const store = new EditorStore({ formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } }, () => {});
  expect(renderToStaticMarkup(<Toolbar store={store} />)).toContain('<input type="checkbox" id="snap"/>');
  store.setSnap(true);
  expect(renderToStaticMarkup(<Toolbar store={store} />)).toContain('<input type="checkbox" id="snap" checked=""/>');
});
```

- The new test is the last one. With snapping off, the toolbar must draw `<input type="checkbox" id="snap"/>`; with it on, the same with `checked=""`, which is how HTML marks a ticked box.

```check
run "npx vitest run src" exit=1 stderr="to contain '<input type=\"checkbox\" id=\"snap\"/>'"
```

## The snap box

Change `src/ui/Toolbar.tsx`:

```tsx file=src/ui/Toolbar.tsx
import type { EditorStore, Tool } from '../editor/store';
import { useStore } from './useStore';

const TOOLS: Tool[] = ['move', 'rotate', 'scale'];

export function Toolbar({ store }: { store: EditorStore }) {
  useStore(store);
  return (
    <div className="toolbar">
      <button type="button" id="play" onClick={() => (store.playing ? store.stop() : store.play())}>
        {store.playing ? 'Stop' : 'Play'}
      </button>
      {TOOLS.map((tool) => (
        <button
          key={tool}
          type="button"
          id={`tool-${tool}`}
          className={store.tool === tool ? 'selected' : ''}
          onClick={() => store.setTool(tool)}
        >
          {tool}
        </button>
      ))}
      <label>
        <input type="checkbox" id="snap" checked={store.snap} onChange={(event) => store.setSnap(event.target.checked)} />{' '}
        snap
      </label>
    </div>
  );
}
```

- `<label>` around the box and its word: clicking the word ticks the box too. A `<label>` that holds its input needs no `htmlFor` (lesson 4.7 used `htmlFor` because the label and the input were apart).
- `<input type="checkbox" …>` is a tick box.
  - `checked={store.snap}` makes it show the store's value. Like the console's input in lesson 4.3, it's **controlled**: React keeps it in step with the store, never the other way round.
  - `onChange={(event) => store.setSnap(event.target.checked)}`: a click changes it, and `event.target.checked` is whether it's now ticked. The store changes, and the toolbar is drawn again with the new value.
- `{' '}` puts a space between the box and the word. JSX drops a line break and the spaces around it, so a space that matters is written as a string.

```check
run "npx vitest run src" stdout="128 passed"
run "npx tsc"
```

## Snapping in the game view

Change `src/ui/GameView.tsx`:

```tsx file=src/ui/GameView.tsx
import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import {
  dragPosition,
  dragRotation,
  dragScale,
  drawGrid,
  drawSelection,
  GRID,
  panBy,
  pathOf,
  pick,
  snapTo,
  zoomAt,
} from '../editor/viewport';
import type { Box } from '../engine/box';
import { drawTree } from '../engine/draw';
import type { Game } from '../engine/game';
import { IDENTITY } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import type { EditorStore, Tool } from '../editor/store';

export function GameView({ store, game, readout }: { store: EditorStore; game: Game; readout: () => string }) {
  const holder = useRef<HTMLDivElement>(null);
  const shown = useRef<HTMLSpanElement>(null);
  const zoomShown = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let view = IDENTITY;
    let pan: Vec2 | null = null;
    let drag: {
      tool: Tool;
      box: Box;
      path: string;
      from: Vec2;
      position: Vec2;
      rotation: number;
      scale: Vec2;
      moved: boolean;
    } | null = null;

    class Play extends Phaser.Scene {
      private graphics!: Phaser.GameObjects.Graphics;

      create(): void {
        this.graphics = this.add.graphics();
      }

      override update(_time: number, delta: number): void {
        if (store.playing) game.frame(delta / 1000);
        const shownView = store.playing ? IDENTITY : view;
        this.graphics.clear();
        if (!store.playing && store.snap) drawGrid(this.graphics, view, 800, 450, GRID);
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
      if (!hit) return;
      drag = {
        tool: store.tool,
        box: hit,
        path: pathOf(hit),
        from: world,
        position: hit.position,
        rotation: hit.rotation,
        scale: hit.scale,
        moved: false,
      };
    });

    canvas.addEventListener('pointermove', (event) => {
      const point = new Vec2(event.offsetX, event.offsetY);
      if (pan) {
        view = panBy(view, point.subtract(pan));
        pan = point;
      }
      if (!drag) return;
      const to = view.toLocal(point);
      const box = drag.box;
      drag.moved = true;
      if (drag.tool === 'move') {
        const position = dragPosition(drag.position, box.parentTransform, drag.from, to);
        const step = store.snap ? GRID : 1;
        box.position = new Vec2(snapTo(position.x, step), snapTo(position.y, step));
      } else if (drag.tool === 'rotate') {
        box.rotation = snapTo(dragRotation(drag.rotation, box.globalPosition, drag.from, to), store.snap ? 15 : 1);
      } else {
        const scale = dragScale(drag.scale, box.globalPosition, drag.from, to);
        box.scale = store.snap
          ? new Vec2(snapTo(scale.x, 0.25), snapTo(scale.y, 0.25))
          : new Vec2(Math.round(scale.x * 100) / 100, Math.round(scale.y * 100) / 100);
      }
    });

    canvas.addEventListener('pointerup', () => {
      pan = null;
      if (!drag) return;
      const { tool, box, path, moved } = drag;
      drag = null;
      if (!moved) return;
      if (tool === 'move') store.setProp(path, 'position', { x: box.position.x, y: box.position.y });
      else if (tool === 'rotate') store.setProp(path, 'rotation', box.rotation);
      else store.setProp(path, 'scale', { x: box.scale.x, y: box.scale.y });
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

- The import list is one name per line now, and adds `drawGrid`, `GRID` and `snapTo`.
- In `update`, the grid is drawn first, under everything, but only `if (!store.playing && store.snap)`: in edit mode with snapping on. The game itself has no grid. 800 and 450 are the canvas's size.
- In `pointermove`, each tool snaps its value:
  - Move: `store.snap ? GRID : 1` is the step. Snapping to steps of 1 is rounding to whole pixels, which lesson 5.5 did with `Math.round`, so one line does both.
  - Rotate: steps of 15° with snapping, whole degrees without. 15° divides a quarter turn into six: 15, 30, 45, 60, 75 and 90 are all there.
  - Scale: quarters with snapping. Without it, lesson 5.7's two decimal places stay, because `snapTo(value, 0.01)` would bring back tenths' problem: `0.01` isn't exact either.
- The snapped value is what the box shows while dragging, so you see it jump from grid point to grid point, and what the command records when you let go.
- Positions snap in the parent's coordinates. For a node at the top of the scene, that's the world, and it lines up with the grid drawn. Inside a turned parent, the parent's own grid is turned too: that's usually what you want for the parts of a car.

```check
run "npx tsc"
run "npm run e2e" stdout="12 passed" label="with snap on, a drag lands on the grid"
```

```predict
question: Snap is on. The player is at (432, 240). You press on it and move the pointer 7 pixels right, then 7 more. Where is the player drawn after each move?
choice: 439, then 446: snapping happens when you let go
choice: 432, then 448: it stays until it's nearer the next grid point, then jumps
choice: 448, then 448: any move goes to the next grid point
answer: 432, then 448: it stays until it's nearer the next grid point, then jumps
explain: Each move works out the unsnapped position from the start, 439 then 446, and rounds it to the nearest multiple of 16. 439 is 27.4 steps, so 27: 432. 446 is 27.9, so 28: 448. The box stays put until the pointer has gone more than half a step, then jumps a whole step.
```

Run `npm start`, tick snap, and drag, turn and stretch things. Line the player up against the wall's edge, and zoom in to check there's no gap.

## Commit, and tick the fourth story

Moves snap to a grid: tick the fourth Sprint 5 story in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "Snapping: positions to a 16 pixel grid, turns to 15 degrees, scales to quarters"
```

```check
contains BACKLOG.md "- [x] As a game maker, I want moves to snap to a grid"
git-clean
```

## Challenge: a grid size in the toolbar

**Optional, ★★.** Some levels want a grid of 8, others 32. Move the grid size into the store, with a number box in the toolbar that sets it, test first. What should happen to things already placed on a 16 pixel grid when you change it to 32?

```hints
nudge: GRID becomes store.grid, read when a drag moves and when the grid is drawn.
concept: Snapping only changes what you drag. Nothing already placed moves, which is how every editor behaves.
shape: grid = 16; setGrid(grid: number): void { if (grid > 0) { this.grid = grid; this.changed(); } }
```
