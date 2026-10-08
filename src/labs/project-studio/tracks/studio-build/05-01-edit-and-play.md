---
title: 5.1 — Edit and Play
track: Build Your Own Game Studio
runtime: none
concepts: edit-mode, play-mode, game-state-vs-scene-data, toolbar
problem: Sprint 5 makes the game view a place to click and drag things. But the game in it is running, and the player moves when you press keys. How can you edit a scene while it's playing, and what should happen to what moved?
---

Sprint 5's stories (lesson 4.8) all happen in the game view: click a thing to select it, drag it, turn it, stretch it. Before any of that, there's a problem. The game in the view is **running**: since lesson 1.9, every frame it updates the nodes, and the player moves while you hold an arrow key.

- An editor shows you the **scene**: the data in `scenes/main.json`, which says the player starts at x = 400.
- A running game shows you the **game state**: where things are now, after the player has walked about. The player might be at x = 523 while the scene still says 400.
- If you dragged the player while it was walking, which one should change? And what should "undo" put back?

Every game engine answers it the same way, with two **modes**:

- **Edit mode**: the game is drawn but doesn't run. What you see is exactly the scene's data, so clicking and dragging edit the data.
- **Play mode**: the game runs, from the scene's data. Nothing you do while playing changes the scene. When you stop, the game is built again from the scene, and everything is back where the scene says.

In Godot it's the Play and Stop buttons; in Unity, the Play button at the top, and Unity famously throws away changes you make while playing, for this reason. This lesson adds them to the studio.

## A test for the two modes

The retrospective said to write the end-to-end test first this sprint. The first Sprint 1 test in `e2e/app.test.ts` holds the right arrow and expects the player to move. That stops being true: the game now starts in edit mode. Change `e2e/app.test.ts`:

```ts file=e2e/app.test.ts
import { expect, test } from 'vitest';
import { _electron as electron } from 'playwright';

test('the app opens a window that greets the studio', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.textContent('#title')).toBe('Hello, Studio!');
    expect(await page.title()).toBe('Studio');
  } finally {
    await app.close();
  }
}, 30000);

test('while editing the keys move nothing; Play starts the game; Stop puts the scene back', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.textContent('#player-x')).toBe('400');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowRight');
    expect(await page.textContent('#player-x')).toBe('400');
    await page.click('#play');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowRight');
    const x = Number(await page.textContent('#player-x'));
    expect(x).toBeGreaterThan(450);
    expect(x).toBeLessThan(600);
    await page.click('#play');
    await expect.poll(() => page.textContent('#player-x')).toBe('400');
    expect(await page.textContent('#play')).toBe('Play');
  } finally {
    await app.close();
  }
}, 30000);
```

- The first test is unchanged.
- The second test now tells the whole story of the two modes:
  - It waits until the readout shows 400, then holds the right arrow for half a second, as before. In edit mode nothing runs, so the readout must still say `400`.
  - `page.click('#play')` clicks a button with the id `play`, which this lesson adds. Then the same key press must move the player, as it did in Sprint 1: more than 450 and less than 600.
  - The same button is now the Stop button. Clicking it must put the player back at 400, where the scene says it starts, and the button must say `Play` again.
- Why one button, not two: you're always in one mode or the other, so one button that switches between them can never show the wrong choice.

```check
run "npm run e2e" exit=1 stderr="to be '400'" label="the test fails: the game runs all the time"
```

The test fails at its first check: the player moved while the studio was meant to be editing.

## Play and stop in the store: a test

Which mode the editor is in is state that more than one part of the editor needs: the button shows it, and the game view decides from it whether to run the game. Lesson 4.2 put state like that in the store. Change `src/editor/store.test.ts`:

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
```

- The new test is the last one. Its check function, `() => builds++`, does no checking: it counts how many times it's called. In the app, the store's check is `rebuild` (lesson 4.4's `main.tsx`), which builds the game's nodes again from the scene. So `builds` counts how many times the game was built again.
- `store.playing` must start `false`: the studio opens in edit mode.
- `store.play()` must make it `true`, and must not build anything: the game starts from the nodes as they are, which in edit mode are exactly the scene's.
- `store.stop()` must make it `false` again and build the game once, which puts every node back where the scene says.
- `calls` counts the listeners' calls: play and stop must each tell the listeners once, so the button can change its label.

```check
run "npx vitest run src" exit=1 stderr="expected undefined to be false"
```

`store.playing` doesn't exist yet, so reading it gives `undefined`.

## The store's play and stop

Change `src/editor/store.ts`:

```ts file=src/editor/store.ts
import type { PropValue, SceneData } from '../engine/scene';
import { History } from './history';
import { findNode } from './scene-api';
import { runCode, sceneScript, type SceneScript } from './script';

export type Check = (scene: SceneData) => void;

export class EditorStore {
  readonly history = new History();
  readonly script: SceneScript;
  problem = '';
  selected: string | null = null;
  playing = false;
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

- `playing = false;` is a new field. Its type is `boolean`, which TypeScript works out from the value `false`, and every new store starts in edit mode.
- `play()` sets `playing` to `true` and calls `changed()`, which (lesson 4.2) adds one to the version and calls every listener. Nothing else changes: the game's nodes stay as they are.
- `stop()` sets `playing` to `false`, then calls `this.check(this.scene)`. In the app, `check` is `rebuild`: it builds new nodes from `this.scene`, which nothing changed while playing, and puts them in the game in place of the old ones. The player that walked to 523 is thrown away; a new one starts at 400. Then `changed()` tells the listeners.
- Why `check` and not a new `rebuild` parameter: the store already holds the one function that builds the game from the scene. A second parameter would be the same function under another name. The name `check` comes from its other job (lesson 4.2): it throws if the engine refuses the scene. Here the scene hasn't changed since it was last built, so it can't throw.

```check
run "npx vitest run src" stdout="100 passed"
```

## A toolbar's test

The Play button goes in a **toolbar**, a row of buttons above the game view. Later lessons add more buttons to it. Create `src/ui/Toolbar.test.tsx`:

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
```

- The test makes a store with an empty scene: a toolbar doesn't look at the scene.
- In edit mode the button must say `Play`; after `store.play()`, `Stop`. Both times it has the id `play`, which is what the end-to-end test clicks.
- `renderToStaticMarkup` (lesson 4.1) draws the component once, to HTML. Drawing it a second time, after `play()`, shows what it draws in the new state.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './Toolbar'"
```

## The Toolbar component

Create `src/ui/Toolbar.tsx`:

```tsx file=src/ui/Toolbar.tsx
import type { EditorStore } from '../editor/store';
import { useStore } from './useStore';

export function Toolbar({ store }: { store: EditorStore }) {
  useStore(store);
  return (
    <div className="toolbar">
      <button type="button" id="play" onClick={() => (store.playing ? store.stop() : store.play())}>
        {store.playing ? 'Stop' : 'Play'}
      </button>
    </div>
  );
}
```

- `Toolbar` takes the store and reads it with `useStore` (lesson 4.3), so it's drawn again whenever the store changes.
- It draws a `<div>` with the class `toolbar`, holding one button.
- The button's label is `{store.playing ? 'Stop' : 'Play'}`: the conditional operator picks the word for the current mode.
- `onClick={() => (store.playing ? store.stop() : store.play())}`: the same operator picks which method to call. The brackets around it are only there to make it read as one expression.
- A click changes the store; the store tells its listeners; React draws the toolbar again with the other label.

```check
run "npx vitest run src" stdout="101 passed"
run "npx tsc"
```

## The game runs only while playing

Change `src/ui/GameView.tsx`:

```tsx file=src/ui/GameView.tsx
import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { drawTree } from '../engine/draw';
import type { Game } from '../engine/game';
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

- `GameView` now also takes the store: `{ store, game, readout }`, typed `store: EditorStore`.
- The one line that matters: `if (store.playing) game.frame(delta / 1000);`. Every frame, Phaser calls `update`. Before, it always moved the game on by the frame's time. Now it does that only while playing.
- Everything else still happens every frame: the graphics are cleared and the tree drawn again, and the readout is updated. So in edit mode you still see the scene, and any change you make to it is drawn at once.
- `update` reads `store.playing` straight from the store, sixty times a second, not through React. React draws when the store changes; the game loop runs anyway, and only needs to know the mode at the moment it runs.
- `[store, game, readout]`: the effect's list of what it uses (lesson 4.4) now includes the store. It never changes, so Phaser is still started once.

The checker finds the place still to change:

```check
run "npx tsc" exit=1 stdout="TS2741" label="App doesn't pass the store to GameView yet"
```

```text
src/ui/App.tsx(27,10): error TS2741: Property 'store' is missing in type '{ game: Game; readout: () => string; }' but required in type '{ store: EditorStore; game: Game; readout: () => string; }'.
```

## The toolbar above the game

Change `src/ui/App.tsx`:

```tsx file=src/ui/App.tsx
import type { EditorStore } from '../editor/store';
import type { Game } from '../engine/game';
import type { TypeDef } from '../engine/registry';
import { Console } from './Console';
import { GameView } from './GameView';
import { Inspector } from './Inspector';
import { SceneTree } from './SceneTree';
import { Title } from './Title';
import { Toolbar } from './Toolbar';

export function App(props: {
  store: EditorStore;
  game: Game;
  readout: () => string;
  types: ReadonlyMap<string, TypeDef>;
}) {
  const { store, game, readout, types } = props;
  return (
    <div className="editor">
      <header className="top">
        <Title name="Studio" />
      </header>
      <aside className="left panel">
        <h2>Scene</h2>
        <SceneTree store={store} />
      </aside>
      <div className="centre">
        <Toolbar store={store} />
        <GameView store={store} game={game} readout={readout} />
      </div>
      <aside className="right panel">
        <h2>Inspector</h2>
        <Inspector store={store} types={types} />
      </aside>
      <div className="bottom">
        <Console store={store} />
      </div>
    </div>
  );
}
```

- `<Toolbar store={store} />` goes in the centre column, above the game view.
- `<GameView store={store} … />` passes the store on, which is what the checker asked for.

```predict
question: Suppose stop() only set playing to false and called changed(), without this.check(this.scene). You press Play, walk the player to x = 523, and press Stop. What does the readout show?
choice: 400: stopping always shows the scene
choice: 523: the player stays where it walked to
choice: Nothing: the player is removed
answer: 523: the player stays where it walked to
explain: Stopping would only stop the game moving on. The nodes are the same objects that were running, and the player node's position is still 523. The scene data says 400, but nothing builds the nodes from it again, so the view shows game state, not the scene, until the next change rebuilds it. That's exactly the confusion edit mode exists to prevent.
```

```check
run "npx tsc"
run "npm run e2e" stdout="7 passed" label="the keys move nothing while editing, and Stop puts the player back"
```

Run `npm start`. Hold an arrow key: nothing moves. Press Play, walk about, press Stop: the player jumps back. Change the wall's colour in the inspector while playing: the game is built again from the scene, so the player jumps back then too. Changing the scene always starts the game from the new scene.

## Commit

```powershell
git add .
git commit -m "Edit and play: the game runs only while playing; Stop builds it again from the scene"
```

```check
git-clean
git-tracked src/ui/Toolbar.tsx
```

## Challenge: Play with the keyboard

**Optional, ★.** Godot plays with F5 and stops with F8; Unity uses Ctrl+P (Cmd+P on a Mac) for both. Add Ctrl+P / Cmd+P to the `keydown` listener in `main.tsx`, so it plays or stops. Why must it come before the line that passes the key on to `game.input`, and what does `event.preventDefault()` stop here?

```hints
nudge: The listener already handles Ctrl+Z the same way: it checks event.ctrlKey || event.metaKey and event.code.
concept: preventDefault stops the browser's own meaning of a key; in a browser, Ctrl+P opens the print dialog.
shape: if ((event.ctrlKey || event.metaKey) && event.code === 'KeyP') { event.preventDefault(); if (store.playing) store.stop(); else store.play(); return; }
```
