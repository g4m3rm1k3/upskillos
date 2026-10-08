---
title: 2.5 — The Game Starts from a Scene File
track: Build Your Own Game Studio
runtime: none
concepts: content-vs-code, vite-imports, declaration-files, error-display
problem: Everything needed to read a scene file now exists and is tested. The game still builds its scene in main.ts. How does the running game start from a file instead, so that changing the level means changing the file, and what does a game maker see when the file is wrong?
---

Games separate **content** (levels, characters' starting places, colours: what designers change all day) from **code** (how things behave: what programmers change). Content in files means a level can change without anyone touching code, and each change is a small, readable difference in Git. This lesson moves the scene out of `main.ts` into `scenes/main.json`.

## One call to load a scene: tests

Reading a scene is two steps, checking the text (`parseScene`) then building it (`buildNode`), and a caller shouldn't have to remember the order. Create `src/engine/load.test.ts`:

```ts file=src/engine/load.test.ts
import { expect, test } from 'vitest';
import { Box } from './box';
import { ENGINE_MAKERS } from './build';
import { loadScene } from './load';

const text = JSON.stringify({
  formatVersion: 1,
  root: {
    type: 'Node',
    name: 'level',
    props: {},
    children: [{ type: 'Box', name: 'wall', props: { size: { x: 600, y: 20 } }, children: [] }],
  },
});

test('loadScene turns the text of a scene file into a live tree', () => {
  const root = loadScene(text, ENGINE_MAKERS);
  const wall = root.get('wall');
  expect(wall).toBeInstanceOf(Box);
  expect((wall as Box).size.x).toBe(600);
});

test('a problem in the text or in the scene stops the load, with its message', () => {
  expect(() => loadScene('{', ENGINE_MAKERS)).toThrow('This is not valid JSON');
  expect(() => loadScene(text.replace('"Box"', '"Boxx"'), ENGINE_MAKERS)).toThrow('level/wall: there is no node type "Boxx"');
});
```

- `JSON.stringify({ … })` makes the file's text from an object literal, which is shorter to write than JSON by hand.
- `text.replace('"Box"', '"Boxx"')` returns a copy of the text with the first `"Box"` changed: a broken file made from a good one.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './load'"
```

## loadScene

Create `src/engine/load.ts`:

```ts file=src/engine/load.ts
import { buildNode, type Maker } from './build';
import type { Node } from './node';
import { parseScene } from './parse';

export function loadScene(text: string, makers: ReadonlyMap<string, Maker>): Node {
  return buildNode(parseScene(text).root, makers);
}
```

- One line: check the text, then build the root. Errors from either pass straight through to the caller, with their messages.
- A small function that puts two steps in the right order is worth having. The order is decided once, and the name says what it does in a game maker's words.
- Both tests pass with this one line, so the second never had its own red. That's honest here: it doesn't drive new code, it guards a promise, that errors from either step reach the caller with their messages. If someone later wraps `loadScene` in a `try` that swallows errors, it fails.
- These tests run `parseScene` and `buildNode` for real, through `loadScene`. A test of several real parts working together is called an **integration test**. It catches mistakes in how the parts are joined, which neither part's own unit tests can see; but when it fails, the cause could be in any of the parts. So the parts keep their own unit tests (lessons 2.2 to 2.4), and the integration test only checks the joining.

```check
run "npx vitest run src" stdout="53 passed"
run "npx tsc"
```

## The scene file

Make a folder `scenes` in the project's top folder (next to `src`, because it's content, not code) and create `scenes/main.json`:

```json file=scenes/main.json
{
  "formatVersion": 1,
  "root": {
    "type": "Node",
    "name": "level",
    "props": {},
    "children": [
      {
        "type": "Box",
        "name": "wall",
        "props": { "position": { "x": 400, "y": 60 }, "size": { "x": 600, "y": 20 }, "color": 9807270 },
        "children": []
      },
      {
        "type": "Player",
        "name": "player",
        "props": { "position": { "x": 400, "y": 225 } },
        "children": []
      }
    ]
  }
}
```

- A level holding two nodes: a grey wall, 600 by 20, near the top, and the player in the middle, where `main.ts` used to put it.
- `9807270` is `0x95a5a6`, a grey. A scene editor (Sprint 4) will let you pick colours instead of typing numbers.
- `"type": "Player"` is a type only this game has. The engine's makers don't include it; `main.ts` will add it.
- The wall is listed first, so it's drawn first, under anything that overlaps it (lesson 1.8).

```check
file scenes/main.json
run "node -e \"JSON.parse(require('fs').readFileSync('scenes/main.json', 'utf8'))\"" label="the scene file is valid JSON" -- Read the error: it gives the position of the mistake in the file.
```

## A place for problems

A broken scene file mustn't be a blank window with no explanation. Add a paragraph for the message to `index.html`:

```html file=index.html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Studio</title>
  </head>
  <body>
    <h1 id="title"></h1>
    <p id="problem"></p>
    <div id="game"></div>
    <p>Player x: <span id="player-x"></span></p>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```check
contains index.html "<p id=\"problem\"></p>"
```

## Loading the scene in main.ts

Change `src/main.ts`:

```ts file=src/main.ts
import Phaser from 'phaser';
import mainScene from '../scenes/main.json?raw';
import { ENGINE_MAKERS, type Maker } from './engine/build';
import { drawTree } from './engine/draw';
import { Game } from './engine/game';
import { loadScene } from './engine/load';
import { addMoveActions, Player } from './game/player';
import { greet } from './greet';

const title = document.querySelector('#title');
if (title) title.textContent = greet('Studio');

const game = new Game();
addMoveActions(game.input);
const makers = new Map<string, Maker>(ENGINE_MAKERS);
makers.set('Player', (name) => new Player(name, game.input));

const problem = document.querySelector('#problem');
let player: Player | null = null;
try {
  game.root.addChild(loadScene(mainScene, makers));
  const found = game.root.get('level/player');
  if (!(found instanceof Player)) throw new Error('level/player: must be a Player');
  player = found;
} catch (error) {
  if (problem) problem.textContent = `The scene didn't load. ${(error as Error).message}`;
}

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
    if (playerX && player) playerX.textContent = player.position.x.toFixed(0);
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

- `import mainScene from '../scenes/main.json?raw'`: the `?raw` at the end tells Vite to give the file's **text** as a string, instead of a module. When Vite builds, it copies the text into the built JavaScript, so the finished app carries its scene with it. `mainScene` holds exactly what `readFileSync` would give, and it goes through the same checks a scene file opened from disk will (Sprint 6).
- The makers: a copy of the engine's, plus `'Player'`, whose maker is a closure over `game.input` (lesson 2.2). That's how a player built from a file still gets its keyboard.
- `let player: Player | null = null` will hold the player once it's found. It starts as `null` in case the scene doesn't load.
- The `try` block loads the scene and adds its root under the game's root. Then it looks up the player by path and checks it really is a `Player`. A file could put any type at that name, so this is a check, not an `as`. After the check, TypeScript knows `found` is a `Player`.
- The `catch` puts the message in the problem paragraph, starting with what happened (*The scene didn't load.*) and then exactly where. The game still starts, with whatever loaded, so the window isn't blank.
- In `update`, `if (playerX && player)` skips the readout when there's no player.

```check
run "npx vite build" stdout="built in" label="Vite builds the page, with the scene's text inside"
run "npx tsc" exit=1 stdout="Cannot find module '../scenes/main.json?raw'" label="tsc doesn't know what a ?raw import is"
```

Run `npx tsc`:

```text
src/main.ts(2,23): error TS2307: Cannot find module '../scenes/main.json?raw' or its corresponding type declarations.
```

- `?raw` is a Vite feature, not part of JavaScript, so TypeScript doesn't know a `?raw` import gives a string.

## Telling TypeScript about Vite

Create `src/vite-env.d.ts`:

```ts file=src/vite-env.d.ts
/// <reference types="vite/client" />
```

- A file ending `.d.ts` is a **declaration file**: types only, no code, like Phaser's `phaser.d.ts` (lesson 1.9).
- `/// <reference types="vite/client" />` is a special comment that pulls in the types Vite publishes for code it builds, including *a module ending `?raw` exports a string*. It's in `src`, so `tsconfig.json`'s `"include"` finds it.

```check
run "npx tsc" label="main.ts type-checks, and mainScene is a string"
run "npm run e2e" stdout="2 passed" label="the player still starts at x 400, now from the file"
```

Run `npm start`: the grey wall is at the top, and the player moves as before.

## Content without code

Two experiments with the file, with `npm start` after each:

1. In `scenes/main.json`, change the player's `"x": 400` to `"x": 200` and the wall's `"color"` to `16766720`. Start the app: the player starts on the left, and the wall is gold. No code changed.
2. Now misspell the player's type: `"Playr"`.

```predict
question: What does the window show with "type": "Playr"?
choice: A blank window
choice: The wall, no player, and a message naming the problem
choice: An error in the terminal, and no window
answer: The wall, no player, and a message naming the problem
explain: buildNode throws at level/player: there is no node type "Playr". The catch in main.ts shows "The scene didn't load. level/player: there is no node type "Playr"". The game still runs, so the window isn't blank. Nothing was added under the game's root, so the wall isn't drawn either: the whole scene is refused, not half of it.
```

- The game maker sees what's wrong and where, in their terms: the node's path and the type they typed. Compare *Cannot read properties of undefined (reading 'position')*, which is what trusting the file would have shown.

Put the file back as it was: `"Player"`, `"x": 400`, and colour `9807270`.

```check
contains scenes/main.json "\"type\": \"Player\"" -- Change "Playr" back to "Player".
contains scenes/main.json "\"color\": 9807270"
```

## Commit, and tick the stories

All three Sprint 2 stories are done: the scene is plain text in Git, the game starts from it, and a wrong file gives a clear message. Tick them in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "The game starts from scenes/main.json; a broken scene shows what's wrong"
```

```check
run "npm run check"
contains BACKLOG.md "- [x] As a game maker, I want the game to start from the scene file"
git-clean
git-tracked scenes/main.json
```

## Challenge: a room

**Optional, ★.** Using only `scenes/main.json`, build a room around the player: four walls, top, bottom, left and right, just inside the edges of the 800-by-450 game, in a colour of your choice. Then group them under a plain `Node` called `walls`, and check the game still finds `level/player`.

```hints
nudge: A wall's position is its centre. A wall along the left edge, 20 wide and 400 high, centred 30 pixels in from the edge, sits at x 30, y 225.
concept: Grouping nodes under a plain Node doesn't move them: a Node has no position, so Node2D positions pass straight through it (lesson 1.3).
shape: { "type": "Node", "name": "walls", "props": {}, "children": [ …the four Box nodes… ] }
```
