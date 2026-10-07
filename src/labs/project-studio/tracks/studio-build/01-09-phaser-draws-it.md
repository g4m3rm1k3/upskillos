---
title: 1.9 — Phaser Draws It, in the Window
track: Build Your Own Game Studio
runtime: none
concepts: dependencies, libraries, canvas, glue-code, e2e-testing
problem: The engine can decide what to draw and the player knows how to move, but the window still only says Hello, Studio!. How does a library paint the tree 60 times a second, and how do real key presses reach the player?
---

**Phaser** is a free library for 2D games in the browser. It does the work the studio shouldn't write from scratch: painting thousands of shapes and pictures a second on the graphics card, loading images and sounds, and calling your code once per screen refresh.

The studio uses only a small part of it. Phaser has its own idea of game objects and scenes, but this engine keeps its own tree, its own loop and its own input, which you now understand line by line. Phaser just paints what `drawTree` describes. That keeps the engine testable without a browser (lesson 1.7), and if Phaser were ever replaced, only the code that talks to it would change.

## Install Phaser

```powershell
npm install --save-exact phaser@4.2.1
```

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite build && electron .",
    "typecheck": "tsc",
    "test": "vitest run src",
    "e2e": "vite build && vitest run e2e",
    "check": "npm run typecheck && npm test && npm run e2e"
  },
  "dependencies": {
    "phaser": "4.2.1"
  },
  "devDependencies": {
    "electron": "44.6.0",
    "playwright": "1.63.0",
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- No `--save-dev` this time, so npm puts Phaser in `"dependencies"`: libraries the app itself runs. Everything in `"devDependencies"` is a tool for building and testing it. Lesson 0.3 promised this difference.
- The `phaser` folder in `node_modules` is over 100 MB: the source, several builds, and type definitions. Only the parts the game uses end up in `dist`.

```check
contains package.json "\"dependencies\": {" -- npm install --save-exact phaser@4.2.1 (no --save-dev)
file node_modules/phaser/package.json
```

## A place on the page for the game

Change `index.html`:

```html file=index.html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Studio</title>
  </head>
  <body>
    <h1 id="title"></h1>
    <div id="game"></div>
    <p>Player x: <span id="player-x"></span></p>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- `<div id="game">` is an empty **division**, a box with no meaning of its own. Phaser will put the game inside it.
- The paragraph is a **debug readout**: the player's x position, shown as a number. Programmers watching a game often can't tell from the picture whether a number is right; a readout shows it. The end-to-end test will read it too. `<span>` marks a piece of text inside a line, so code can change just the number.

```check
contains index.html "<div id=\"game\"></div>"
contains index.html "<span id=\"player-x\"></span>"
```

## Painting the tree

Change `src/main.ts`:

```ts file=src/main.ts
import Phaser from 'phaser';
import { drawTree } from './engine/draw';
import { Game } from './engine/game';
import { Vec2 } from './engine/vec2';
import { addMoveActions, Player } from './game/player';
import { greet } from './greet';

const title = document.querySelector('#title');
if (title) title.textContent = greet('Studio');

const game = new Game();
addMoveActions(game.input);
const player = new Player('player', game.input);
player.position = new Vec2(400, 225);
game.root.addChild(player);

class Play extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;

  create(): void {
    this.graphics = this.add.graphics();
  }

  override update(): void {
    this.graphics.clear();
    drawTree(game.root, this.graphics);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: 'game',
  backgroundColor: '#1d2330',
  scene: Play,
});
```

- `import Phaser from 'phaser'` imports the library's default export, one object holding everything Phaser has: `Phaser.Scene`, `Phaser.Game` and the rest.
- The first lines after the imports set up the studio's own game: a `Game`, the movement actions, and a `Player` placed at `(400, 225)`, the middle of an 800-by-450 game.
- A Phaser **scene** is a class you write by extending `Phaser.Scene`. Phaser calls its methods at the right moments:
  - `create()` once, when the scene starts. Phaser's `Scene` class doesn't declare `create`; Phaser just calls it if your scene has one. So it has no `override`.
  - `update()` once per screen refresh. `Scene` does declare it (empty), so `override` is right.
- `this.add.graphics()` makes a Phaser **Graphics** object: a surface you draw shapes on with `fillStyle` and `fillRect`. It's the real `Painter` that `drawTree` was written for.
- `private graphics!: …`: the field gets its value in `create`, not in a constructor, so TypeScript can't see that it's set before `update` uses it. The `!` tells TypeScript "it will be set before it's used". Use `!` only when you know the order for certain, as here: Phaser always calls `create` before `update`.
- Each refresh, `update` wipes the drawing (`clear`) and draws the whole tree again. A game redraws everything every frame; there's no "move the old rectangle". It's simpler, and fast enough for thousands of shapes.
- `new Phaser.Game({ … })` starts Phaser, with a **configuration object**:
  - `type: Phaser.AUTO` draws with **WebGL** (the graphics card) where it can, and falls back to the slower **canvas** drawing where it can't;
  - `width` and `height` are the game's size in pixels;
  - `parent: 'game'` is the id of the element to put it in;
  - `backgroundColor` is a dark blue-grey, written as a CSS colour string;
  - `scene: Play` is the scene class to start. Phaser makes the object itself, with `new Play()`.
- Phaser adds a `<canvas>` element inside the div. A **canvas** is a rectangle of pixels that code can draw on; everything Phaser paints goes into it.

```check
run "npx vite build" stdout="built in" label="the page builds with Phaser in it"
run "npx tsc" exit=1 stdout="node_modules/phaser/types/phaser.d.ts" label="tsc reports errors inside Phaser's own type file"
```

Run `npx tsc`:

```text
node_modules/phaser/types/phaser.d.ts(22,45): error TS2526: A 'this' type is available only in a non-static member of a class or interface.
node_modules/phaser/types/phaser.d.ts(124835,21): error TS2416: Property 'run' in type 'SubmitterMeshToQuad' is not assignable to …
```

- The errors aren't in your code. They're in `phaser.d.ts`, the **type definition file** that describes Phaser's types to TypeScript. It's 148,000 lines long, written for an older TypeScript, and TypeScript 7 finds two mistakes in it.

## Checking your code, not the library's

Add one setting to `tsconfig.json`:

```json file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src", "e2e"]
}
```

- `"skipLibCheck": true` stops `tsc` checking type definition files (`.d.ts` files) for mistakes of their own.
- It still *uses* them. Every call your code makes to Phaser is checked against them as before: `this.graphics.fillRect('ten')` is still an error.
- Nearly every TypeScript project sets this. You can't fix a library's definition file, it's big and slow to check, and its mistakes aren't yours.

```check
run "npx tsc" label="your code type-checks"
```

Run `npm start`. The window shows the heading, a dark game area with a light blue square in the middle, and *Player x:* with nothing after it. The keys do nothing yet.

## Time, keys, and the readout

Now feed the game its time and its keys. Change `src/main.ts`:

```ts file=src/main.ts
import Phaser from 'phaser';
import { drawTree } from './engine/draw';
import { Game } from './engine/game';
import { Vec2 } from './engine/vec2';
import { addMoveActions, Player } from './game/player';
import { greet } from './greet';

const title = document.querySelector('#title');
if (title) title.textContent = greet('Studio');

const game = new Game();
addMoveActions(game.input);
const player = new Player('player', game.input);
player.position = new Vec2(400, 225);
game.root.addChild(player);

window.addEventListener('keydown', (event) => game.input.key(event.code, true));
window.addEventListener('keyup', (event) => game.input.key(event.code, false));

const playerX = document.querySelector('#player-x');

class Play extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;

  create(): void {
    this.graphics = this.add.graphics();
  }

  override update(_time: number, delta: number): void {
    game.frame(delta / 1000);
    this.graphics.clear();
    drawTree(game.root, this.graphics);
    if (playerX) playerX.textContent = player.position.x.toFixed(0);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: 'game',
  backgroundColor: '#1d2330',
  scene: Play,
});
```

- `window.addEventListener('keydown', fn)` registers a listener (as `app.on` did in lesson 0.6): the browser calls `fn` with an **event object** each time a key goes down anywhere in the window. `event.code` is the key's code, such as `'ArrowRight'`. The two lines pass every key down and up to the game's `Input`.
- These lines are **glue code**: they connect the engine to the browser. That's why they're here and not in `Game`, which stays testable without a browser.
- Phaser calls `update(time, delta)` with `delta`, the milliseconds since the last refresh. `delta / 1000` turns it into seconds for `game.frame`, which runs the fixed steps (lesson 1.7). `time` isn't needed, so it's named `_time`.
- The order each refresh is the game loop: **update** (all the fixed steps), then **draw** (clear and redraw the tree).
- `toFixed(0)` turns a number into a string with 0 digits after the point: `457.3333` becomes `'457'`.

Run `npm start` and use the arrow keys or W-A-S-D. The square moves, at the same speed in every direction, and the readout follows.

```check
run "npx vite build" stdout="built in"
run "npx tsc"
```

## Testing it end to end

The unit tests already prove the player moves when `Input` says a key is down. What they can't prove is that real key presses reach `Input`, or that Phaser calls `frame`. Only the running app can show that. Add a second test to `e2e/app.test.ts`:

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

test('holding the right arrow moves the player right', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.textContent('#player-x')).toBe('400');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowRight');
    const x = Number(await page.textContent('#player-x'));
    expect(x).toBeGreaterThan(450);
    expect(x).toBeLessThan(600);
  } finally {
    await app.close();
  }
}, 30000);
```

- The first `expect.poll` waits until the readout shows `400`: Phaser has started and drawn at least one frame.
- `page.keyboard.down('ArrowRight')` makes the window receive a real `keydown` event, as if a key were pressed. `waitForTimeout(500)` holds it for half a second; `keyboard.up` lets go.
- `Number(text)` turns the readout's string into a number.
- `toBeGreaterThan(450)` passes if the value is more than 450; `toBeLessThan(600)` if it's less than 600. Together they check the value is in a range.
- At 200 pixels a second, half a second is 100 pixels, so x should be near 500. The test allows 450 to 600, not exactly 500. A real key held for "half a second" by a test is never exactly half a second, so an exact check would fail now and then for no real reason. A test that fails randomly is called **flaky**, and a flaky test is soon ignored. The range still catches the real failures: no movement at all, or moving at the wrong speed.

```check
run "npm run e2e" stdout="2 passed" label="both end-to-end tests pass"
```

## Commit, and tick the stories

Run `npm run check`. Every Sprint 1 story is now done, committed and tested: a scene drawn in the window, made of a tree of objects, moving at the same speed on every computer, controlled by the keyboard. Tick all four in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "Phaser draws the tree; the arrow keys move the player"
```

- Vite prints a warning while building: *Some chunks are larger than 500 kB*. Phaser makes the built JavaScript about 1.3 MB. On a website that would be slow to download; the studio loads it from disk, so it doesn't matter here.

```check
run "npm run check" label="type-check, unit tests and end-to-end tests all pass"
contains BACKLOG.md "- [x] As a game maker, I want to see my scene drawn"
contains BACKLOG.md "- [x] As a player, I want the keyboard to control the game"
git-clean
```

## Challenge: keys that stick

**Optional, ★★.** Hold the right arrow, and while it's held, click another window (or press Alt+Tab). Let go of the arrow, then come back: the player is still moving. The `keyup` went to the other window, so `Input` never heard it. Fix it: when the window loses **focus** (the `blur` event), release every key.

```hints
nudge: window.addEventListener('blur', …) is called when the window stops being the one the keyboard types into.
concept: Input needs a method that empties held. It's the engine's job to forget keys; main.ts only tells it when.
shape: releaseAll(): void { this.held.clear(); } in Input, and window.addEventListener('blur', () => game.input.releaseAll()); in main.ts
```
