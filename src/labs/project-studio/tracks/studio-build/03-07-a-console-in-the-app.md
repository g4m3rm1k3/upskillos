---
title: 3.7 — A Console in the App: Code, Log, Undo
track: Build Your Own Game Studio
runtime: none
concepts: css, html-forms, dom-events, rebuild-from-data
problem: Commands, undo, redo and the code log all work in tests. A game maker can't use any of them yet. How does the window let you type a change, see it happen, read its line in the log, and take it back with Ctrl+Z?
---

This lesson puts Sprint 3 into the running studio:

- A **console**: a box where you type a Scene API line, such as `scene.setProp("level/wall", "color", 16766720);`, and press Enter.
- A **log** under it, showing every change as code.
- **Undo** and **Redo** buttons, and Ctrl+Z / Ctrl+Shift+Z (Cmd on a Mac).

There's no mouse editing yet (that's Sprint 4), so the console is the editor for now. Every change goes through the same commands the mouse will use.

The page also gets its first **CSS**: a console needs a box wide enough to type code in, in a font where code lines up.

## A style sheet

**CSS** (Cascading Style Sheets) is the language that says how HTML looks: fonts, colours, sizes, spacing, layout. HTML says *what* is on the page; CSS says *how it looks*. Create `src/style.css`:

```css file=src/style.css
body {
  font-family: system-ui, sans-serif;
  margin: 16px;
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

- A style sheet is a list of **rules**. Each rule is a **selector**, which says which elements it applies to, then a block in braces `{ }` of **declarations**, each `property: value;`.
- Selectors are the same language as `querySelector` (lesson 0.5). `body` (a tag name) matches the `<body>` element; `#problem` (`#` and an id) matches the element with `id="problem"`.
- `font-family: system-ui, sans-serif;` sets the typeface. It's a list of choices, tried in order: `system-ui` is the font your operating system uses for its own windows; if that isn't available, `sans-serif` is any font without serifs (the small strokes at the ends of letters). The page stops using the browser's default, an old-fashioned serif font, and looks like a desktop program.
- Text styles are **inherited**: a font set on `body` applies to everything inside it, unless a rule for an inner element says otherwise.
- `margin: 16px;` puts 16 pixels of empty space around the outside of the body, so nothing touches the window's edges. `px` is the **unit**: CSS pixels.
- `color: #c0392b;` is the text colour, a dark red, so problems stand out. `#c0392b` is a colour written in hexadecimal, two digits each for red, green and blue: the same idea as `0xc0392b` in lesson 1.8, written CSS's way, with `#`.
- `width: 600px;` makes the code box 600 pixels wide, wide enough for a line of code.
- `font-family: monospace;` gives the code box and the log a **monospaced** font, where every character is the same width. Code is easier to read that way, and the brackets in a line typed and a line logged line up.
- If two rules set the same property for one element, the more specific selector wins, and an id is more specific than a tag name. This is the *cascade* in the name. Nothing here sets a property twice yet.

```check
contains src/style.css "font-family: monospace;"
```

## The console's controls

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
    <h1 id="title"></h1>
    <p id="problem"></p>
    <div id="game"></div>
    <p>Player x: <span id="player-x"></span></p>
    <form id="console">
      <input id="code" placeholder='scene.setProp("level/wall", "color", 16766720);' />
      <button type="submit">Run</button>
      <button type="button" id="undo">Undo</button>
      <button type="button" id="redo">Redo</button>
    </form>
    <ol id="log"></ol>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- `<link rel="stylesheet" href="/src/style.css" />` in the head loads the style sheet. `rel` says what kind of link it is; `href` is the file. Vite serves it while you work, and `vite build` puts it into `dist` as part of the build.
- `<form>` groups controls that are filled in and sent together. Pressing Enter in a form's text box **submits** the form: the browser fires a `submit` event. By default it would then reload the page, sending what was typed to a web server; `main.ts` will stop that.
- `<input id="code" … />` is a one-line text box. It has no end tag: an input has no content, only attributes.
- `placeholder='…'` is grey example text shown while the box is empty. The attribute's value is in single quotes because the value itself contains double quotes; HTML accepts either kind.
- `<button type="submit">` submits the form when clicked, the same as pressing Enter.
- `<button type="button">` does nothing by itself. Undo and Redo are this kind; code will listen for their clicks.
- `<ol>` is an **ordered list**: the browser numbers each `<li>` (list item) inside it. It's empty here; code fills it with the log.

```check
contains index.html "<link rel=\"stylesheet\" href=\"/src/style.css\" />"
contains index.html "<form id=\"console\">"
contains index.html "<ol id=\"log\"></ol>"
```

## The scene as data, rebuilt into nodes

First, `main.ts` keeps the scene as data with a history, and builds the nodes from the data. Change `src/main.ts`:

```ts file=src/main.ts
import Phaser from 'phaser';
import mainScene from '../scenes/main.json?raw';
import { buildNode, ENGINE_MAKERS, type Maker } from './engine/build';
import { drawTree } from './engine/draw';
import { Game } from './engine/game';
import type { Node } from './engine/node';
import { parseScene } from './engine/parse';
import type { SceneData } from './engine/scene';
import { History } from './editor/history';
import { addMoveActions, Player } from './game/player';
import { greet } from './greet';

const title = document.querySelector('#title');
if (title) title.textContent = greet('Studio');

const game = new Game();
addMoveActions(game.input);
const makers = new Map<string, Maker>(ENGINE_MAKERS);
makers.set('Player', (name) => new Player(name, game.input));

const problem = document.querySelector('#problem');
const log = document.querySelector('#log');
const history = new History();
let scene: SceneData = { formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } };
let player: Player | null = null;

function show(message: string): void {
  if (problem) problem.textContent = message;
}

function findPlayer(node: Node): Player | null {
  if (node instanceof Player) return node;
  for (const child of node.children) {
    const found = findPlayer(child);
    if (found) return found;
  }
  return null;
}

function showLog(): void {
  if (!log) return;
  const items = history.code.map((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    return item;
  });
  log.replaceChildren(...items);
}

function rebuild(): void {
  const level = buildNode(scene.root, makers);
  for (const child of [...game.root.children]) game.root.removeChild(child);
  game.root.addChild(level);
  player = findPlayer(level);
  showLog();
}

try {
  scene = parseScene(mainScene);
  rebuild();
} catch (error) {
  show(`The scene didn't load. ${(error as Error).message}`);
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
    if (playerX) playerX.textContent = player ? player.position.x.toFixed(0) : '';
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

- The scene is now kept as **data**, in `scene`, with a `History` for its changes. The nodes are built from it by `rebuild`. `loadScene` (lesson 2.5) did both at once and kept no data; this file needs the data, so it calls `parseScene` and `buildNode` itself.
- `let scene: SceneData = { … }` starts as an empty level, so `scene` always holds *a* scene, even if the file fails to load.
- `show(message)` puts a message in the problem paragraph; `show('')` clears it.
- `findPlayer(node)` searches the tree for the first `Player`, recursively: this node, or else the first player found in any child's branch. It replaces `get('level/player')`, because the console can rename the player or the level, and the readout should still find it.
- `showLog` turns each line of `history.code` into a list item:
  - `document.createElement('li')` makes a new, empty `<li>` element. It isn't on the page yet.
  - `item.textContent = line` puts the line in it **as text**. If a line contained `<b>`, it would be shown as the characters `<b>`, never treated as HTML. Anything a person typed must always be put on a page as text; treating it as HTML would let a typed line change the page itself.
  - `log.replaceChildren(...items)` removes everything in the list and puts these items in its place. `...items` spreads the array into separate arguments (lesson 1.4's spread, in a call).
- `rebuild` turns the data into nodes: build a new level, remove whatever was under the game's root (walking a copy, lesson 1.4), add the new level, find the player, and redraw the log. It will run after every change. The data is the truth (lesson 3.1); the nodes are always made fresh from it.
- Rebuilding puts the player back where the *data* says, wherever the arrow keys had moved it. A scene file is the game's **starting state**. Moving the player by playing doesn't change it; editing does.
- `player ? player.position.x.toFixed(0) : ''`: no player, no number.

Run `npm start`: the window shows a monospaced code box with Run, Undo and Redo, and the game as before. The buttons don't do anything yet.

```check
run "npx tsc"
run "npm run e2e" stdout="2 passed" label="the window still loads the scene and the keys still move the player"
```

## The console, and undo

Change `src/main.ts`:

```ts file=src/main.ts
import Phaser from 'phaser';
import mainScene from '../scenes/main.json?raw';
import { buildNode, ENGINE_MAKERS, type Maker } from './engine/build';
import { drawTree } from './engine/draw';
import { Game } from './engine/game';
import type { Node } from './engine/node';
import { parseScene } from './engine/parse';
import type { SceneData } from './engine/scene';
import { History } from './editor/history';
import { runCode, sceneScript } from './editor/script';
import { addMoveActions, Player } from './game/player';
import { greet } from './greet';

const title = document.querySelector('#title');
if (title) title.textContent = greet('Studio');

const game = new Game();
addMoveActions(game.input);
const makers = new Map<string, Maker>(ENGINE_MAKERS);
makers.set('Player', (name) => new Player(name, game.input));

const problem = document.querySelector('#problem');
const log = document.querySelector('#log');
const history = new History();
let scene: SceneData = { formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } };
let player: Player | null = null;

function show(message: string): void {
  if (problem) problem.textContent = message;
}

function findPlayer(node: Node): Player | null {
  if (node instanceof Player) return node;
  for (const child of node.children) {
    const found = findPlayer(child);
    if (found) return found;
  }
  return null;
}

function showLog(): void {
  if (!log) return;
  const items = history.code.map((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    return item;
  });
  log.replaceChildren(...items);
}

function rebuild(): void {
  const level = buildNode(scene.root, makers);
  for (const child of [...game.root.children]) game.root.removeChild(child);
  game.root.addChild(level);
  player = findPlayer(level);
  showLog();
}

try {
  scene = parseScene(mainScene);
  rebuild();
} catch (error) {
  show(`The scene didn't load. ${(error as Error).message}`);
}

const script = sceneScript(scene, history);

function change(action: () => void): void {
  show('');
  try {
    action();
  } catch (error) {
    show((error as Error).message);
    return;
  }
  try {
    rebuild();
  } catch (error) {
    history.undo();
    rebuild();
    show(`That change was undone: ${(error as Error).message}`);
  }
}

function undo(): void {
  change(() => {
    if (!history.undo()) show('Nothing to undo');
  });
}

function redo(): void {
  change(() => {
    if (!history.redo()) show('Nothing to redo');
  });
}

const form = document.querySelector('#console');
const input = document.querySelector('#code');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!(input instanceof HTMLInputElement)) return;
  const code = input.value;
  change(() => runCode(code, script));
  input.value = '';
});
document.querySelector('#undo')?.addEventListener('click', undo);
document.querySelector('#redo')?.addEventListener('click', redo);

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
    return;
  }
  game.input.key(event.code, true);
});
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
    if (playerX) playerX.textContent = player ? player.position.x.toFixed(0) : '';
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

- `const script = sceneScript(scene, history)` is made *after* the scene has loaded, so it changes the loaded scene. Undo replaces `scene.root`, never `scene` itself (lesson 3.4), so `script` stays connected to the right scene for good.
- `change(action)` is the one path every change takes, from the console, the buttons or the keys:
  - clear any old message;
  - run the action. If it throws, show why and stop. Nothing was changed: a syntax error throws before any line runs, and a failed Scene API call is rolled back by its command (lesson 3.4);
  - rebuild the nodes from the new data. If *that* throws, the data is the right shape but the engine refuses it, such as a `colour` prop a `Box` doesn't have (lesson 2.3). So the change just made is undone, the old scene is rebuilt, and the message says what happened and why.
- So whatever is typed, the scene on screen and in the data is never left broken.
- `undo` and `redo` wrap `history.undo()` and `history.redo()` in `change`, and say so when there's nothing to do.
- `form?.addEventListener('submit', …)`: `?.` because `querySelector` might find nothing (lesson 1.4's optional chaining).
- `event.preventDefault()` stops the browser's **default action** for the event, here reloading the page on submit.
- `input instanceof HTMLInputElement`: `querySelector` returns a general `Element`, and only an input element has `value`. The check narrows it. `input.value` is the text in the box; it's kept in `code`, run, and then the box is cleared for the next line.
- `'click'` events call `undo` and `redo` themselves. They're passed without brackets, so they're called later, on each click (as `openWindow` was in lesson 0.6).
- The keyboard listener now does three things:
  - `event.target` is the element the key went to. Keys typed into the code box are text, not game controls, so they're ignored here (otherwise typing `a` would move the player left).
  - `event.ctrlKey` is `true` while Ctrl is held, `event.metaKey` while Cmd (on a Mac) or the Windows key is held. With either, and Z, it's undo, or redo if `event.shiftKey` (Shift) is held too. `preventDefault` stops the browser's own Ctrl+Z, and `return` keeps the key from reaching the game.
  - Any other key goes to the game as before.
- `keyup` always reaches the game, even from the code box, so a key that was held when you clicked into the box is still let go.

Run `npm start` and type into the box: `scene.setProp("level/wall", "color", 16766720);` and Enter. The wall turns gold and the line appears in the log. Then `scene.setProp("level/player", "position", { x: 200, y: 300 });`. Click somewhere outside the box and press Ctrl+Z twice, then Ctrl+Shift+Z.

```check
run "npx tsc"
run "npx vite build" stdout="built in"
```

## Testing the console end to end

Create `e2e/console.test.ts`:

```ts file=e2e/console.test.ts
import { expect, test } from 'vitest';
import { _electron as electron } from 'playwright';

test('a line typed in the console changes the scene, is logged, and can be undone', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.textContent('#player-x')).toBe('400');
    await page.fill('#code', 'scene.setProp("level/player", "position", { x: 100, y: 225 });');
    await page.press('#code', 'Enter');
    await expect.poll(() => page.textContent('#player-x')).toBe('100');
    expect(await page.textContent('#log')).toBe('scene.setProp("level/player", "position", { x: 100, y: 225 });');
    await page.click('#undo');
    await expect.poll(() => page.textContent('#player-x')).toBe('400');
    expect(await page.textContent('#log')).toBe('');
  } finally {
    await app.close();
  }
}, 30000);

test('a change that would break the scene is undone, with the reason', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.textContent('#player-x')).toBe('400');
    await page.fill('#code', 'scene.setProp("level/wall", "colour", 1);');
    await page.press('#code', 'Enter');
    await expect.poll(() => page.textContent('#problem')).toBe('That change was undone: level/wall: a Box has no property "colour"');
    expect(await page.textContent('#log')).toBe('');
  } finally {
    await app.close();
  }
}, 30000);
```

- `page.fill(selector, text)` puts text into an input, replacing what's there, as if typed.
- `page.press(selector, 'Enter')` presses a key with that element focused: here, Enter in the code box, which submits the form.
- `page.click(selector)` clicks an element, here the Undo button.
- The text of `#log`, an `<ol>`, is the text of all its items run together: one line after one change, nothing after the undo.
- The second test types a change the engine refuses. The data accepts it (it's a number), building fails, and `change` must undo it and say why.

```check
run "npm run e2e" stdout="4 passed" label="all four end-to-end tests pass"
```

## Commit, and tick the stories

All three Sprint 3 stories are done: changes can be undone and redone, and each one is shown as a line of code. Tick them in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "A console in the app: Scene API lines, a code log, undo and redo"
```

```check
run "npm run check"
contains BACKLOG.md "- [x] As a game maker, I want to undo any change to my scene"
git-clean
git-tracked e2e/console.test.ts
```

## Challenge: buttons that know

**Optional, ★★.** Undo and Redo are always clickable, even when there's nothing to undo. Give `History` two getters, `canUndo` and `canRedo`, and make `rebuild` disable each button when it can't do anything. A button's `disabled` property, `true` or `false`, greys it out and ignores clicks. Then add a CSS rule so disabled buttons look faded: the selector `button:disabled` matches only disabled buttons, and `opacity: 0.4;` makes an element 40% visible.

```hints
nudge: canUndo is true while done has anything in it.
concept: The buttons' state is derived from the history, like the log, so it's set in the same place the log is drawn: every rebuild.
shape: get canUndo(): boolean { return this.done.length > 0; } — and in rebuild: if (undoButton instanceof HTMLButtonElement) undoButton.disabled = !history.canUndo;
```
