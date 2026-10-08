---
title: 5.7 — Rotate and Scale Tools
track: Build Your Own Game Studio
runtime: none
concepts: tools, angles, atan2, ratios, one-gesture-many-meanings
problem: A drag can mean move, turn or stretch. How does the editor know which, and how does a pointer moving in a straight line become an angle or a size?
---

Sprint 5's third story: rotate and scale things. Lesson 5.2 gave every node a rotation and a scale, and the inspector can set them, but typing angles is slow. Every editor lets you turn and stretch things with the pointer.

A drag is one gesture, so the editor needs to know what you mean by it. Editors use **tools**: you choose the move, rotate or scale tool from a toolbar, and dragging does what the tool does. (Godot and Unity also draw **handles**, little arrows and rings you grab; tools are the simpler start, and the challenge points towards handles.)

Each tool turns the pointer's movement into a value, always measured from the node's centre, its origin:

- **Move**: the pointer's step is added to the position (lesson 5.5).
- **Rotate**: how far the pointer has swung round the origin. Press to the right of the centre and move to below it, and you've swept a quarter turn: 90°.
- **Scale**: how much farther from the origin the pointer is than where you pressed. Press 10 pixels from the centre and drag to 30, and the node is 3 times the size.

Each drag is still one command when you let go.

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
```

- The new test is the last one.
- `page.click('#tool-rotate')` chooses the rotate tool, from a button this lesson adds. The line before it checks the button is there first, so the red fails fast.
- It presses on the wall at `(650, 60)`, 250 pixels right of the wall's centre `(400, 60)`, and drags to `(617, 185)`. That point is 217 right of the centre and 125 below it: 30° round, clockwise, from straight right. So the wall must turn 30°, and the inspector's rotation box must say `30`.
- Then the scale tool: press on the player 10 pixels right of its centre, `(410, 225)`, and drag to 20 right. Twice as far from the centre, so twice the size: the scale's x must be `2`.
- The log must hold two lines, one for each drag. `textContent` of the whole log joins the lines with nothing between them, so the expected text is the two lines added together with `+`.

```check
run "npm run e2e" exit=1 stderr="expected +0 to be 1" label="the test fails: there are no tool buttons yet"
```

There's no rotate button. The `expect.poll` line before the click makes the test say so at once (lesson 4.5): without it, `page.click` would wait for the button until the test ran out of time.

## The tool in the store: a test

Which tool is chosen is used by the toolbar (to mark it) and the game view (to know what a drag means), so it goes in the store. Change `src/editor/store.test.ts`:

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
```

- The new test is the last one. The tool must start as `'move'`, the safest: dragging moves, as it has since lesson 5.5.
- `setTool('rotate')` must change it and tell the listeners once.

```check
run "npx vitest run src" exit=1 stderr="expected undefined to be 'move'"
```

## The store's tool

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

- `export type Tool = 'move' | 'rotate' | 'scale';` is a union of three strings (lesson 4.6's `PropKind` is the same idea). A tool can be only one of those three; `store.setTool('spin')` is an error the checker catches.
- `tool: Tool = 'move';` is the field. The type is written out: from the value alone, TypeScript would decide it's any `string`.
- `setTool(tool)` sets it and calls `changed()`, like `select`.

```check
run "npx vitest run src" stdout="120 passed"
```

## Turning: a test

Change `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY, transformOf } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import { dragPosition, dragRotation, drawSelection, panBy, pathOf, pick, zoomAt, type OutlinePainter } from './viewport';

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
```

- A new test at the end, with an origin at `(100, 100)`.
- `dragRotation(start, origin, from, to)` must add the angle swept to the starting rotation:
  - from `(150, 100)`, straight right of the origin, to `(100, 150)`, straight below it: a quarter turn clockwise, 90°. Started at 10°, so 100°.
  - from straight right to `(150, 50)`, up and to the right: 45° anticlockwise, which is -45°. So 10 - 45 = -35.

```check
run "npx vitest run src" exit=1 stderr="dragRotation is not a function"
```

## dragRotation

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

export function dragRotation(start: number, origin: Vec2, from: Vec2, to: Vec2): number {
  return start + angleOf(to.subtract(origin)) - angleOf(from.subtract(origin));
}

function angleOf(direction: Vec2): number {
  return (Math.atan2(direction.y, direction.x) * 180) / Math.PI;
}
```

- `angleOf(direction)` gives the angle of a step, in degrees:
  - `Math.atan2(y, x)` gives the angle, in radians, from straight right round to the step `(x, y)`, between -π and π. Note the order: `y` first. For `(0, 50)`, straight down, it's π / 2; for `(50, -50)`, it's -π / 4.
  - `* 180 / Math.PI` turns radians into degrees: lesson 5.2's sum, backwards.
- `dragRotation` adds the angle of the pointer now, minus the angle where it was pressed, both measured from the origin, to the starting rotation. `to.subtract(origin)` is the step from the origin to the pointer.
  - Going all the way round makes the angle jump from 180 to -180, so the rotation can jump by 360 too. A turn of 360° looks the same as none, so what's drawn never jumps; only the number does.

```check
run "npx vitest run src" stdout="121 passed"
```

## Stretching: a test

Add a test to `src/editor/viewport.test.ts`:

```ts file=src/editor/viewport.test.ts
import { expect, test } from 'vitest';
import { Box } from '../engine/box';
import type { Point } from '../engine/draw';
import { Node } from '../engine/node';
import { IDENTITY, transformOf } from '../engine/transform';
import { Vec2 } from '../engine/vec2';
import { dragPosition, dragRotation, dragScale, drawSelection, panBy, pathOf, pick, zoomAt, type OutlinePainter } from './viewport';

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
```

- `dragScale(start, origin, from, to)` must multiply the starting scale by how many times farther the pointer is:
  - from 10 pixels away, `(110, 100)`, to 30 pixels away, `(100, 130)`: 3 times. A scale of `(1, 2)` becomes `(3, 6)`. The direction doesn't matter, only the distance.
  - pressed exactly on the origin, the distance is 0, and "how many times farther than 0" has no answer. Then the scale must stay as it was.
- The second example, pressed on the origin, is an edge case: a distance of 0, which a division would turn into `Infinity`.

```check
run "npx vitest run src" exit=1 stderr="dragScale is not a function"
```

## dragScale

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
```

- `dragScale`:
  - `reach` is how far from the origin the pointer was pressed: `from.subtract(origin).length()`.
  - If it's `0`, `return start`: no change, instead of dividing by 0.
  - Otherwise, `start.scale(…)` multiplies both parts of the starting scale by the new distance over `reach`. Both parts, so a box keeps its shape: dragging makes it bigger or smaller, not wider or taller. The inspector can still set them one at a time.

```check
run "npx vitest run src" stdout="122 passed"
```

## Tool buttons: a test

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
```

- The new test chooses `rotate`, then checks there's a button for each tool, with the id `tool-` and its name, and that only the chosen one has the class `selected`.

```check
run "npx vitest run src" exit=1 stderr="to contain '<button type=\"button\" id=\"tool-move\""
```

## The tool buttons

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
    </div>
  );
}
```

- `import type { EditorStore, Tool }`: both from the store.
- `const TOOLS: Tool[] = ['move', 'rotate', 'scale'];` lists the tools in the order the buttons appear. It's outside the component, so it's made once, not every time the toolbar is drawn.
- `TOOLS.map((tool) => (…))` draws a button for each, after the Play button:
  - `key={tool}`: the names are different, so each is a good key (lesson 4.5).
  - `` id={`tool-${tool}`} ``: `tool-move`, `tool-rotate`, `tool-scale`.
  - `className` is `selected` for the store's tool, as in the scene tree.
  - A click calls `store.setTool(tool)`.

```check
run "npx vitest run src" stdout="123 passed"
run "npx tsc"
```

## The toolbar's look

Change `src/style.css`:

```css file=src/style.css
body {
  font-family: system-ui, sans-serif;
  margin: 0;
}

.editor {
  display: grid;
  grid-template-columns: 240px 1fr 300px;
  grid-template-rows: auto auto 1fr;
  grid-template-areas:
    'top top top'
    'left centre right'
    'left bottom right';
  gap: 8px;
  height: 100vh;
  padding: 8px;
  box-sizing: border-box;
}

.top {
  grid-area: top;
}

.left {
  grid-area: left;
}

.centre {
  grid-area: centre;
}

.right {
  grid-area: right;
}

.bottom {
  grid-area: bottom;
  overflow: auto;
}

.panel {
  border: 1px solid #ccc;
  padding: 8px;
  overflow: auto;
}

h1,
h2 {
  margin: 0;
}

h2 {
  font-size: 14px;
}

.tree,
.tree ul {
  list-style: none;
  margin: 0;
  padding-left: 16px;
}

.tree button {
  border: none;
  background: none;
  padding: 2px 4px;
  font: inherit;
  cursor: pointer;
}

.tree button.selected {
  background: #cfe3ff;
}

.tree small {
  color: #777;
}

.toolbar {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 4px;
}

.toolbar button.selected {
  background: #cfe3ff;
}

.field {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 4px;
}

.field label,
.field span {
  width: 64px;
}

.field input[type='number'] {
  width: 72px;
}

#problem {
  color: #c0392b;
}

#code {
  width: 600px;
  font-family: monospace;
}

#log {
  font-family: monospace;
}
```

- `.toolbar` is a flex box (lesson 4.7): the buttons in a row, 4 pixels apart, lined up through their middles, with 4 pixels under the row.
- `.toolbar button.selected` gives the chosen tool the same light blue as the scene tree's selection, so you can see which tool you have.

```check
contains src/style.css ".toolbar button.selected {"
```

## Every tool in the game view

Change `src/ui/GameView.tsx`:

```tsx file=src/ui/GameView.tsx
import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { dragPosition, dragRotation, dragScale, drawSelection, panBy, pathOf, pick, zoomAt } from '../editor/viewport';
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
        box.position = new Vec2(Math.round(position.x), Math.round(position.y));
      } else if (drag.tool === 'rotate') {
        box.rotation = Math.round(dragRotation(drag.rotation, box.globalPosition, drag.from, to));
      } else {
        const scale = dragScale(drag.scale, box.globalPosition, drag.from, to);
        box.scale = new Vec2(Math.round(scale.x * 100) / 100, Math.round(scale.y * 100) / 100);
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

- `import type { EditorStore, Tool }`, and the two new functions.
- The drag remembers more now:
  - `tool`: the tool chosen when the drag started. Changing the tool in the middle of a drag (with a keyboard shortcut, say) won't change what this drag does.
  - `position`, `rotation` and `scale`: all three as they were at the start. One drag only changes one of them, but which one depends on the tool.
  - `moved`: whether the pointer has moved since it was pressed. It replaces lesson 5.5's comparison of positions, which only worked for moving.
- `pointerdown` fills them in from the box that was hit, with `store.tool`.
- `pointermove`:
  - `drag.moved = true;`.
  - `if … else if … else` picks the tool. `else if` checks a second condition only when the first was false; the last `else` is the one left, scale.
  - Move is lesson 5.5's code.
  - Rotate: `dragRotation(drag.rotation, box.globalPosition, drag.from, to)`, rounded to a whole degree. The origin is `box.globalPosition`: the box's centre in the world, where `from` and `to` are too. It doesn't move while the box turns.
  - Scale: `dragScale(…)`, each part rounded to two decimal places: `Math.round(scale.x * 100) / 100` multiplies by 100, rounds, and divides back. So 1.2345 becomes 1.23.
- `pointerup` makes one command for the tool's property: `position`, `rotation` (a number) or `scale`. A `Vec2` is turned into plain `{ x, y }` data, as before.
- Inside a parent that's turned, a node's own rotation is measured in the parent, but turning it by 30° turns it 30° on screen too: turns add up. Inside a parent that's stretched more one way than the other, they don't quite, and the challenge in lesson 5.2 shows a better way to read a node's angle on screen.

```check
run "npx tsc"
run "npm run e2e" stdout="11 passed" label="the rotate and scale tools turn and stretch, one change per drag"
```

Run `npm start`. Choose rotate and swing the wall round; choose scale and grow the player. Press near the centre to scale: a small move far from the centre is a small change, near the centre a big one.

## Commit, and tick the third story

You can rotate and scale things: tick the third Sprint 5 story in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "Rotate and scale tools: a drag turns or stretches, as one change"
```

```check
contains BACKLOG.md "- [x] As a game maker, I want to rotate and scale things"
git-clean
```

## Challenge: a rotation handle

**Optional, ★★★.** Choosing a tool is one click too many. Draw a small circle 40 pixels above the selected box's centre, on screen, and make a drag that starts on it rotate, whatever the tool. Test the "is the pointer on the handle" function first. Why should the 40 pixels be on screen, not in the world?

```hints
nudge: The handle's screen position is view.apply of the box's global position, plus (0, -40).
concept: Handles are for the hand, so they stay the same size on screen at any zoom; that's why they're in screen pixels.
shape: function onHandle(view: Transform, box: Box, screen: Vec2): boolean { const handle = view.apply(box.globalPosition).add(new Vec2(0, -40)); return screen.subtract(handle).length() <= 6; }
```
