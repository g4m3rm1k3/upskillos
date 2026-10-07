---
title: 4.4 — Panels Around the Game
track: Build Your Own Game Studio
runtime: none
concepts: effects, refs, component-lifecycle, css-grid, layout
problem: Phaser draws into an element on the page, and needs that element to exist first. React decides when elements exist. How does a component start Phaser at the right moment, stop it when it's no longer needed, and how are the panels laid out around it?
---

This lesson finishes moving the page into React and lays the editor out the way game engines do:

- the **scene tree** on the left (empty until lesson 4.5),
- the **game view** in the middle,
- the **inspector** on the right (empty until lesson 4.7),
- the **console** under the game.

One component, `App`, describes the whole page. `main.tsx` is left with one job: make the game and the store, and hand them to `App`.

## A bigger window

Three columns need more room than the 1000 pixels the window has had since lesson 0.6. Change `electron/main.js`:

```js file=electron/main.js
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

function openWindow() {
  const win = new BrowserWindow({ width: 1400, height: 900 });
  win.loadFile(path.join(import.meta.dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(openWindow);
app.on('window-all-closed', () => app.quit());
```

- The window is now 1400 by 900 pixels: 800 for the game, about 240 for the tree, 300 for the inspector, and the gaps between them.
- A user can still make the window any size. The layout below stretches the middle column to fit.

```check
contains electron/main.js "width: 1400, height: 900"
```

## The game view

Phaser draws into an element you give it as `parent` (lesson 1.9). So far that was `<div id="game">`, written in `index.html`, which exists before any code runs. Now React will make that element, and React draws later (lesson 4.1): the code that starts Phaser must wait until the element is on the page. Create `src/ui/GameView.tsx`:

```tsx file=src/ui/GameView.tsx
import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { drawTree } from '../engine/draw';
import type { Game } from '../engine/game';

export function GameView({ game, readout }: { game: Game; readout: () => string }) {
  const holder = useRef<HTMLDivElement>(null);
  const shown = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    class Play extends Phaser.Scene {
      private graphics!: Phaser.GameObjects.Graphics;

      create(): void {
        this.graphics = this.add.graphics();
      }

      override update(_time: number, delta: number): void {
        game.frame(delta / 1000);
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
  }, [game, readout]);

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

- The `Play` scene class and the `new Phaser.Game(…)` are lesson 1.9's, moved here from `main.tsx`.
- `useRef<HTMLDivElement>(null)` makes a **ref**: an object, `{ current: null }`, that React keeps between draws, like state. Unlike state, changing `current` doesn't make React draw again.
  - `<HTMLDivElement>` is a **type argument** (as in `new Map<string, Maker>`, lesson 2.2): `holder.current` will be a `<div>` element, or `null`.
  - `ref={holder}` on the `<div>` tells React: when you create this element, put it in `holder.current`. That's how a component gets hold of a real element on the page, without `querySelector`.
- `shown` is a second ref, for the `<span>` showing the player's x.
- `useEffect(() => { … }, [game, readout])` runs code **after** React has put the component on the page. This is where to start Phaser: by then `holder.current` is the real `<div>`.
  - The effect's function **returns** another function, `() => phaser.destroy(true)`, the **cleanup**. React calls it when the component is taken off the page, so Phaser stops its loop and removes its canvas. Without it, a game view drawn twice would leave two games running.
  - `[game, readout]` is the **dependency list**: React runs the effect again (cleanup first) only if one of these is a different value from the last draw. Both are the same for the app's whole life, so the effect runs once.
  - `destroy(true)` is Phaser's way to stop a game; `true` also removes the canvas from the page.
- `parent: holder.current` gives Phaser the element itself rather than its id.
- The player's x is written by Phaser's `update`, 60 times a second, straight into `shown.current.textContent`. That's on purpose: drawing a React component 60 times a second for one number is wasted work. React draws what changes when the user acts; the game loop writes what changes every frame. The rule from lesson 4.1, never change what React manages, still holds: React put an empty `<span>` there and never changes its text.
- `readout: () => string` is a prop that's a function: the game view calls it each frame to get the text to show, so it doesn't need to know what a player is.
- `<div id="game" ref={holder}></div>` keeps the id `game`, so the end-to-end tests and lesson 3.7's CSS still find it.

```check
run "npx tsc"
```

## The editor as one component

Create `src/ui/App.tsx`:

```tsx file=src/ui/App.tsx
import type { EditorStore } from '../editor/store';
import type { Game } from '../engine/game';
import { Console } from './Console';
import { GameView } from './GameView';
import { Title } from './Title';

export function App({ store, game, readout }: { store: EditorStore; game: Game; readout: () => string }) {
  return (
    <div className="editor">
      <header className="top">
        <Title name="Studio" />
      </header>
      <aside className="left panel">
        <h2>Scene</h2>
      </aside>
      <div className="centre">
        <GameView game={game} readout={readout} />
      </div>
      <aside className="right panel">
        <h2>Inspector</h2>
      </aside>
      <div className="bottom">
        <Console store={store} />
      </div>
    </div>
  );
}
```

- `App` is made of other components: `Title`, `GameView` and `Console`, each passed only what it needs. A page built this way is a tree of components, as a scene is a tree of nodes.
- `className="editor"`: in JSX the HTML attribute `class` is written `className`, because `class` is a TypeScript keyword (lesson 1.1). It gives elements a **class** name that CSS can select.
- An element can have several class names, separated by spaces: `className="left panel"` is in the class `left` *and* the class `panel`. `left` will say where it goes, `panel` how it looks.
- `<aside>` is an element for content beside the main content: side panels. `<h2>` is a second-level heading, under the page's `<h1>`.
- Five parts, in reading order: the top bar with the title, the left panel, the centre with the game, the right panel, and the bottom with the console. The next step places them.

```check
run "npx tsc"
```

## A layout in a grid

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

- `.editor` selects elements with the class `editor`: a `.` and a class name, as `#` and an id selects by id (lesson 3.7).
- `display: grid` makes the element a **grid**: its children are placed in rows and columns that the next rules define.
- `grid-template-columns: 240px 1fr 300px` makes three columns: 240 pixels, then `1fr` (one **fraction** of whatever space is left), then 300 pixels. The middle column takes all the room the side panels don't.
- `grid-template-rows: auto auto 1fr` makes three rows: the first two as tall as what's in them (`auto`), the last taking the rest of the height.
- `grid-template-areas` names the cells, one quoted string per row, one name per column:
  - row 1, `'top top top'`: the top bar across all three columns;
  - row 2, `'left centre right'`;
  - row 3, `'left bottom right'`: the side panels run down two rows, and the console sits under the game.
  - A name that fills several cells must make a rectangle.
- `grid-area: top` (and `left`, `centre`, `right`, `bottom`) puts an element in the area of that name. This is why each part has its own class.
- `gap: 8px` puts 8 pixels between rows and columns.
- `height: 100vh`: `vh` is a hundredth of the window's height (**v**iewport **h**eight), so the grid is exactly as tall as the window, and the last row stretches to the bottom.
- `padding: 8px` is space *inside* the element's edge, between its border and its contents; `margin` (lesson 3.7) is space *outside*.
- `box-sizing: border-box` makes `height` include the padding. By default `height: 100vh` plus 16 pixels of padding would be 16 pixels taller than the window, and the window would scroll.
- `body`'s `margin` is now `0`: the grid's own padding replaces it.
- `overflow: auto`: if what's inside is bigger than the element, show scroll bars instead of spilling out. A long log or a big scene tree scrolls inside its panel.
- `.panel` gives side panels a border: `1px solid #ccc` is 1 pixel wide, a solid line, light grey.
- `h1, h2 { margin: 0; }`: a comma between selectors applies one rule to both. Headings have space around them by default; inside panels it wastes room.
- `font-size: 14px` makes panel headings small, as in most editors.

```check
contains src/style.css "grid-template-areas:"
contains src/style.css "grid-area: centre;"
```

## One root for the page

Change `index.html`:

```html file=index.html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Studio</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- The body is now one empty `<div id="root">` and the script. Everything else on the page is drawn by React, inside it.
- `root` is the usual name for this element in React apps.

```check
contains index.html "<div id=\"root\"></div>"
lacks index.html "id=\"game\""
```

## main.tsx only starts things

Change `src/main.tsx`:

```tsx file=src/main.tsx
import { createRoot } from 'react-dom/client';
import mainScene from '../scenes/main.json?raw';
import { buildNode, ENGINE_MAKERS, type Maker } from './engine/build';
import { Game } from './engine/game';
import type { Node } from './engine/node';
import { parseScene } from './engine/parse';
import type { SceneData } from './engine/scene';
import { EditorStore } from './editor/store';
import { addMoveActions, Player } from './game/player';
import { App } from './ui/App';

const game = new Game();
addMoveActions(game.input);
const makers = new Map<string, Maker>(ENGINE_MAKERS);
makers.set('Player', (name) => new Player(name, game.input));
let player: Player | null = null;

function findPlayer(node: Node): Player | null {
  if (node instanceof Player) return node;
  for (const child of node.children) {
    const found = findPlayer(child);
    if (found) return found;
  }
  return null;
}

function rebuild(scene: SceneData): void {
  const level = buildNode(scene.root, makers);
  for (const child of [...game.root.children]) game.root.removeChild(child);
  game.root.addChild(level);
  player = findPlayer(level);
}

function load(): SceneData {
  const scene = parseScene(mainScene);
  rebuild(scene);
  return scene;
}

function readout(): string {
  return player ? player.position.x.toFixed(0) : '';
}

let scene: SceneData = { formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } };
let loadProblem = '';
try {
  scene = load();
} catch (error) {
  loadProblem = `The scene didn't load. ${(error as Error).message}`;
}
const store = new EditorStore(scene, rebuild);
store.problem = loadProblem;

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
    event.preventDefault();
    if (event.shiftKey) store.redo();
    else store.undo();
    return;
  }
  game.input.key(event.code, true);
});
window.addEventListener('keyup', (event) => game.input.key(event.code, false));

const root = document.querySelector('#root');
if (root) createRoot(root).render(<App store={store} game={game} readout={readout} />);
```

- Phaser isn't imported here any more, nor `drawTree`: `GameView` does the drawing.
- `readout()` returns the player's x as text, or `''` with no player. It's passed to `App`, which passes it to `GameView`. It's defined once, so it's the same function for the app's whole life, and `GameView`'s effect runs only once.
- `createRoot(root).render(<App … />)` draws the whole editor. There's one React root now, instead of two.
- The file is down to 67 lines, and does one job: it makes the game, the makers, the scene and the store, joins them, and starts the editor. Sprint 3's retrospective asked for this.

Run `npm start`. The title is across the top, the scene panel on the left, the game in the middle with the console underneath, and the inspector panel on the right.

```check
run "npx tsc"
run "npm run e2e" stdout="4 passed" label="the game, the keys and the console still work"
```

## A test for the layout

Create `e2e/editor.test.ts`:

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
```

- `page.locator('.centre #game canvas')` finds elements matching a CSS selector, without waiting for one. A space between selectors means "inside": a `<canvas>` inside `#game` inside `.centre`. `.count()` is how many there are.
- Exactly one canvas: Phaser started, drew into the element React made, and only once. If the effect ran before the element existed, Phaser would put its canvas at the end of the page instead, outside `.centre`, and the count would be 0.
- The two headings show the side panels are there.

```check
run "npm run e2e" stdout="5 passed" label="the editor's panels are there, with the game in the centre"
```

## Commit, and tick the first story

The editor is laid out in panels around the game view: the first Sprint 4 story is done. Tick it in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "The editor's layout: App, a game view with an effect, and a CSS grid"
```

```check
run "npm run check"
contains BACKLOG.md "- [x] As a game maker, I want the editor laid out in panels"
git-clean
git-tracked e2e/editor.test.ts
```

## Challenge: a status bar

**Optional, ★.** Add a fourth row to the grid, a status bar across the bottom of the window, showing the number of changes made: `store.history.code.length`. Make a `StatusBar` component that calls `useStore`, add an area called `status` to `grid-template-areas`, and a row to `grid-template-rows`.

```hints
nudge: Each row of grid-template-areas is one quoted string, and needs one size in grid-template-rows.
concept: A component that reads the store must call useStore, or it won't be drawn again when the store changes.
shape: 'status status status' as a fourth row, grid-template-rows: auto auto 1fr auto, and .status { grid-area: status; }
```
