---
title: 4.1 — React: A First Component
track: Build Your Own Game Studio
runtime: none
concepts: react, components, jsx, props, rendering
problem: An editor is a page full of parts that must change whenever the scene changes: a tree, an inspector, a log. Writing each update by hand with querySelector and textContent gets out of hand fast. What does React do instead, and how does it get into the studio?
---

Sprint 4 turns the window into an editor: a scene tree on the left, the game in the middle, an inspector on the right, the console underneath. Sprint 3's retrospective said `main.ts` had grown to 145 lines doing three jobs. This sprint splits the page into small parts, each in its own file.

**Why a library for this.** Look at `showLog` in `main.ts` (lesson 3.7): after every change it builds the list of log lines again, by hand, with `createElement` and `replaceChildren`. A scene tree and an inspector need the same, but bigger: every time the scene changes, work out what changed on the page and change exactly that. Done by hand for a whole editor, that is thousands of lines, and every forgotten update is a bug: a tree still showing a node that was deleted.

**React** is a library that does it for you. You write a function that says what a part of the page *should* look like for the data it's given. When the data changes, React calls the function again, compares the answer with what's on the page, and makes only the changes needed. You never change the page yourself.

- Such a function is a **component**. A component takes some values (its **props**) and returns a description of some HTML.
- That description is written in **JSX**, HTML-like tags inside TypeScript: `<h1>Hello</h1>` is a value in a `.tsx` file, the way `'Hello'` is.
- The real Game Studio's editor is built the same way, in React.

This lesson installs React and moves the smallest part of the page, the title, into a component.

## Install React

React comes in two packages, and TypeScript needs a description of each. Run:

```powershell
npm install --save-exact react@19.3.0 react-dom@19.3.0
npm install --save-dev --save-exact @types/react@19.3.0 @types/react-dom@19.3.0 @vitejs/plugin-react@6.1.2
```

`package.json` is now:

```json file=package.json
{
  "name": "studio",
  "version": "0.4.0",
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
    "phaser": "4.2.1",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "electron": "44.6.0",
    "playwright": "1.63.0",
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- `react` is the part that knows about components: how to call them, and how to remember things between calls (lesson 4.3).
- `react-dom` is the part that puts components into a web page, the **DOM** (Document Object Model): the tree of elements that `querySelector` searches. React can draw into other places too (phone apps, for instance) through other packages; this is the one for pages.
- Both go in `"dependencies"`, without `--save-dev`, because the app runs them, like Phaser (lesson 1.9).
- `@types/react` and `@types/react-dom` are **type definitions**: `.d.ts` files that tell TypeScript what React's functions take and return. React itself is written in JavaScript, so the types are published separately, by volunteers, under the `@types` name. They're only needed to type-check, so they're dev dependencies.
- `@vitejs/plugin-react` is a **plugin** for Vite: extra code that Vite runs while it builds. It's a dev dependency for the same reason.
- A name starting with `@` and a slash, like `@types/react`, is a **scoped package**: `react` inside the `@types` group. Scopes keep unrelated packages with the same short name apart.

```check
contains package.json "\"react\": \"19.3.0\""
contains package.json "\"react-dom\": \"19.3.0\""
contains package.json "\"@types/react\": \"19.3.0\""
contains package.json "\"@vitejs/plugin-react\": \"6.1.2\""
```

## JSX for TypeScript

JSX isn't part of JavaScript: before a browser can run it, every tag must be turned into a function call. TypeScript has to be told which kind of call. Change `tsconfig.json`:

```json file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx"
  },
  "include": ["src", "e2e"]
}
```

- `"jsx": "react-jsx"` lets TypeScript read JSX in files ending in `.tsx` (a `.ts` file still can't contain it), and type-check it: a misspelled tag attribute is an error, like a misspelled property.
- `react-jsx` names the way tags are turned into calls: `<h1 id="title">Hi</h1>` becomes, roughly, `jsx('h1', { id: 'title', children: 'Hi' })`, a call to a function in React that returns a plain object describing the element. That object is what a component returns. Nothing is on the page yet; React puts it there later.
- With this setting, a `.tsx` file never needs `import React`: the call to `jsx` is imported automatically when the file is built.

```check
contains tsconfig.json "\"jsx\": \"react-jsx\""
run "npx tsc"
```

## JSX for Vite

Vite builds the app, and Vitest uses Vite to run tests, so Vite needs the plugin. Change `vite.config.ts`:

```ts file=vite.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({ base: './', plugins: [react()] });
```

- `import react from '@vitejs/plugin-react'` imports the plugin's **default export** (lesson 0.6): a function that makes the plugin.
- `plugins: [react()]` is a list of plugins Vite runs on every file it builds. The React plugin turns JSX into `jsx(...)` calls the same way TypeScript does, and while `npm run dev` runs, it lets an edited component update on the page without a reload.
- The imports are in alphabetical order of their paths, `@vitejs/…` before `vite`. That's only a habit, kept so imports are easy to scan.

```check
contains vite.config.ts "plugins: [react()]"
run "npx vite build" stdout="built in"
```

## A component's test

The title is the smallest part of the page that already exists: `<h1 id="title">` and the line in `main.ts` that fills it in with `greet('Studio')`. Tests first. Create `src/ui/Title.test.tsx` (make the `ui` folder first: it will hold every part of the editor's user interface):

```tsx file=src/ui/Title.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { Title } from './Title';

test('the title greets the studio by name', () => {
  expect(renderToStaticMarkup(<Title name="Studio" />)).toBe('<h1 id="title">Hello, Studio!</h1>');
});
```

- The file ends in `.tsx`, because it contains JSX: `<Title name="Studio" />`.
- `<Title name="Studio" />` uses a component the way HTML uses a tag. A tag starting with a **capital letter** is a component; a lower-case one, like `<h1>`, is an HTML element. That's how JSX tells the two apart.
- `name="Studio"` passes a **prop**: the component will be called with `{ name: 'Studio' }`. The `/>` at the end closes the tag straight away, because it has nothing inside it. In JSX every tag must be closed, even ones HTML lets you leave open.
- `renderToStaticMarkup`, from `react-dom/server`, calls the component, and the components it uses, and turns what they return into a string of HTML. It's meant for servers that send pages already drawn; here it lets a test see a component's HTML without a browser or a window.
- The test says what the component must give: exactly `<h1 id="title">Hello, Studio!</h1>`. The `id` stays `title`, so the end-to-end test from lesson 0.7 can still find it.

Why not a browser in unit tests? Many React projects test components inside **jsdom**, a pretend browser written in JavaScript, with the **Testing Library** package to click and type. That's two more packages and their rules. This studio already has real clicks and typing, in the real app, through Playwright (lesson 0.7). So unit tests check what a component draws for some data, and the end-to-end tests check that clicking works.

What's worth testing in a user interface? What it **shows** for some data, and what it **does** when used: the text, the values in the boxes, which item is marked, what a click changes. Not how it looks (colours, sizes and layout are checked by your eyes, in the running app), and not how React does its work inside. A test that checks details nobody cares about breaks every time someone changes one of them, and a test that breaks on harmless changes is called **brittle**: people learn to ignore it. This first test compares the whole HTML, which is fine for one tag; bigger components' tests look only for the parts that matter, with `toContain`.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './Title'"
```

## The Title component

Create `src/ui/Title.tsx`:

```tsx file=src/ui/Title.tsx
import { greet } from '../greet';

export function Title({ name }: { name: string }) {
  return <h1 id="title">{greet(name)}</h1>;
}
```

- A component is a function whose name starts with a capital letter and which returns JSX. `Title` returns one `<h1>` element.
- `{ name }: { name: string }` is the function's one parameter: the props object. `{ name }` **destructures** it (lesson 3.1 did this to an array; this is the same for an object): it takes the object's `name` property into a variable called `name`. After the colon, `{ name: string }` is the props object's type. So `<Title name={5} />` would be a type error.
- `{greet(name)}`: inside JSX, braces `{ }` hold an ordinary expression. Its value is put on the page **as text**: if `name` were `'<b>'`, the page would show the characters `<b>`, never a bold tag, the same protection as `textContent` in lesson 3.7.
- No return type is written. TypeScript works it out from the `return`: the type React uses for a described element. Writing it out adds nothing a reader needs.
- `greet` is lesson 0.4's function, reused unchanged. The component decides where the greeting goes; `greet` decides what it says.

```check
run "npx vitest run src" stdout="78 passed"
run "npx tsc"
```

## main.ts becomes main.tsx

The page will draw the title with React, so `main.ts` will contain JSX, and must end in `.tsx`. Rename it with Git:

```powershell
git mv src/main.ts src/main.tsx
```

- `git mv` (lesson 0.3) renames the file and tells Git it's the same file under a new name, so its history follows it.
- Every TypeScript file is also a valid `.tsx` file, so nothing inside it needs to change for the rename. `index.html` still asks for `main.ts`; the next two steps fix that.

```check
file src/main.tsx
missing src/main.ts
run "npx tsc"
```

## React draws the title

Change `src/main.tsx`:

```tsx file=src/main.tsx
import Phaser from 'phaser';
import { createRoot } from 'react-dom/client';
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
import { Title } from './ui/Title';

const header = document.querySelector('#header');
if (header) createRoot(header).render(<Title name="Studio" />);

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

- `import { createRoot } from 'react-dom/client'`: `react-dom/client` is the part of React DOM for pages in a browser, as `react-dom/server` was for strings.
- `createRoot(header)` hands an element on the page to React. From now on React manages everything *inside* `<header>`: you never change it with `textContent` or `replaceChildren` again, or React and your code would fight over it.
- `.render(<Title name="Studio" />)` tells React what to draw inside it. React calls `Title`, gets the `<h1>` description, and creates the real `<h1>` element on the page.
- `render` doesn't draw at once: React does it a moment later, after the code that's running now finishes. That doesn't matter for the title, but it will matter for the game in lesson 4.4.
- The `if (header)` check is lesson 0.5's: `querySelector` may find nothing, and `createRoot` needs an element.
- The old two lines that set `title.textContent` are gone, and so is the import of `greet`: `Title` uses it now.
- Everything else in the file is as lesson 3.7 left it.

```check
contains src/main.tsx "createRoot(header).render(<Title name=\"Studio\" />);"
run "npx tsc"
```

## The page

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
    <header id="header"></header>
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
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- `<header id="header"></header>` replaces `<h1 id="title"></h1>`. `<header>` is an element for the top of a page; it looks like a plain `<div>` but says what it is for. It starts empty, and React puts the `<h1>` inside it.
- The script is now `/src/main.tsx`. Vite builds `.tsx` the same as `.ts`.

Run `npm start`. The window looks exactly as before. The difference is who drew the title.

```check
contains index.html "<header id=\"header\"></header>"
contains index.html "src=\"/src/main.tsx\""
run "npm run e2e" stdout="4 passed" label="the title, the keys and the console still work"
```

## Commit

```powershell
git add .
git commit -m "React: the title is a component, tested by its HTML"
```

```check
git-clean
git-tracked src/ui/Title.tsx
git-tracked src/main.tsx
```

## Challenge: a second prop

**Optional, ★.** Give `Title` a second prop, `version: string`, and show it in a `<small>` after the greeting: `Hello, Studio! <small>0.4.0</small>`. Update the test first. In `main.tsx`, pass `version="0.4.0"`.

```hints
nudge: Props are the fields of the one object a component is called with. Add a field to its type and to the destructuring.
concept: JSX can hold several elements and text side by side inside one parent, as HTML can.
shape: export function Title({ name, version }: { name: string; version: string }) { return <h1 id="title">{greet(name)} <small>{version}</small></h1>; }
```
