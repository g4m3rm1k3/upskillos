---
title: 4.3 — The Console as a Component
track: Build Your Own Game Studio
runtime: none
concepts: hooks, external-store, component-state, controlled-inputs, lists-and-keys
problem: The store tells listeners when it changes; React redraws a component when it's told to. How are the two joined, and what does a component do with things that belong only to it, like the text half-typed into a box?
---

Lesson 4.2's `show()` redraws the problem and the log by hand. This lesson replaces it with a React component, `Console`, that draws the problem, the code box, the buttons and the log from the store. React works out what to change on the page.

Two kinds of state meet here:

- **The editor's state**, in the store: the scene, the history, the problem. Every panel can see it.
- **A component's own state**: the text in the code box before you press Enter. Nothing else needs it, so it lives in the component, not the store.

## Joining React to the store

React has to know when to draw a component again. A function that connects a component to something React provides is a **hook**: a function whose name starts with `use`, called at the top of a component. Create `src/ui/useStore.ts`:

```ts file=src/ui/useStore.ts
import { useSyncExternalStore } from 'react';
import type { EditorStore } from '../editor/store';

export function useStore(store: EditorStore): void {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
}
```

- `useStore(store)` is a hook of our own. Any component that reads the store calls it first.
- `useSyncExternalStore` is React's hook for state kept **outside** React, like the store. It takes three functions:
  - `subscribe`: React calls it with a listener of its own, when the component first appears on the page, and calls the function it returns when the component goes away. This is lesson 4.2's `subscribe`, passed on its own, which is why it had to be an arrow function.
  - `getSnapshot`: after each listener call, React calls this and compares the result with the last one, using `===`. Only if it's different does React draw the component again.
  - the third, `getServerSnapshot`, is the same for `renderToStaticMarkup`, which has no listeners. The tests use it.
- Why the snapshot is `getVersion` and not the store itself: the store is the same object after every change, so `store === store` would always say "nothing changed", and nothing would ever redraw. The version is a new number after every change.
- The hook's result, the version, isn't needed: the component reads what it wants from the store directly. So `useStore` returns `void`.
- The file is `.ts`, not `.tsx`: it has no JSX in it.

```check
run "npx tsc"
```

## The console's test

Create `src/ui/Console.test.tsx`:

```tsx file=src/ui/Console.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { EditorStore } from '../editor/store';
import { Console } from './Console';

function store(): EditorStore {
  const scene: SceneData = {
    formatVersion: 1,
    root: { type: 'Node', name: 'level', props: {}, children: [{ type: 'Box', name: 'wall', props: {}, children: [] }] },
  };
  return new EditorStore(scene, () => {});
}

test('the log shows each change as a line of code, as text', () => {
  const s = store();
  s.run('scene.setProp("level/wall", "color", 1);');
  s.run('scene.renameNode("level/wall", "<b>");');
  const html = renderToStaticMarkup(<Console store={s} />);
  expect(html).toContain('<li>scene.setProp(&quot;level/wall&quot;, &quot;color&quot;, 1);</li>');
  expect(html).toContain('<li>scene.renameNode(&quot;level/wall&quot;, &quot;&lt;b&gt;&quot;);</li>');
});

test('the problem is shown', () => {
  const s = store();
  s.undo();
  expect(renderToStaticMarkup(<Console store={s} />)).toContain('<p id="problem">Nothing to undo</p>');
});
```

- `store()` makes a store with a check that never throws, `() => {}`: these tests are about what's drawn, not about the engine.
- The first test makes two changes, then draws the console. The log must hold one `<li>` per line of code.
- In HTML text, React writes `"` as `&quot;`, `<` as `&lt;` and `>` as `&gt;`: these are **character references**, how HTML writes a character that would otherwise mean something. The browser shows them as `"`, `<` and `>`. So a node renamed `<b>` appears in the log as the characters `<b>`, never as a bold tag.
- The second test draws the problem: after an undo with nothing to undo, the problem paragraph says so.
- `toContain` checks part of the HTML, not all of it: the form's markup isn't what these tests are about.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './Console'"
```

## The Console component

Create `src/ui/Console.tsx`:

```tsx file=src/ui/Console.tsx
import { useState, type FormEvent } from 'react';
import type { EditorStore } from '../editor/store';
import { useStore } from './useStore';

export function Console({ store }: { store: EditorStore }) {
  useStore(store);
  const [code, setCode] = useState('');

  function submit(event: FormEvent): void {
    event.preventDefault();
    store.run(code);
    setCode('');
  }

  return (
    <section>
      <p id="problem">{store.problem}</p>
      <form id="console" onSubmit={submit}>
        <input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder='scene.setProp("level/wall", "color", 16766720);'
        />
        <button type="submit">Run</button>
        <button type="button" id="undo" onClick={() => store.undo()}>
          Undo
        </button>
        <button type="button" id="redo" onClick={() => store.redo()}>
          Redo
        </button>
      </form>
      <ol id="log">
        {store.history.code.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </section>
  );
}
```

- `useStore(store)` first: when the store changes, React draws `Console` again, and it reads the new problem and log.
- `const [code, setCode] = useState('')` gives the component a piece of state of its own:
  - `useState('')` returns an array of two things: the current value (`''` the first time) and a function to change it. Destructuring names them `code` and `setCode`.
  - The value is kept by React between calls. A plain `let code = ''` inside the function would start at `''` every time the component is drawn, because each draw is a new call.
  - Calling `setCode(x)` stores `x` and asks React to draw the component again, this time with `code` equal to `x`.
- `value={code}` and `onChange={…}` make the input **controlled**: the box shows exactly what's in `code`, and every key typed calls `onChange`, which stores the box's new text with `setCode`. React's state is the truth; the box shows it.
  - `event.target.value` is the input's text after the key was typed. `event.target` is the element the event happened on, the input.
  - Why controlled: the component always knows what's typed, without asking the page, and can change it. `setCode('')` after running a line empties the box, with no `querySelector`.
- `onSubmit={submit}` is how JSX listens for events. It's `addEventListener('submit', …)`, written as an attribute. React's names are `on` and the event's name with a capital letter: `onSubmit`, `onChange`, `onClick`.
- `submit(event: FormEvent)`: `FormEvent` is React's type for a form's event. `type FormEvent` in the import brings in only the type. `event.preventDefault()` stops the page reloading (lesson 3.7), then the line goes to the store, and the box is cleared.
- `onClick={() => store.undo()}` is an arrow function, called on each click. Writing `onClick={store.undo}` would pass the method on its own, and `this` would be lost inside it (lesson 4.2).
- `placeholder='…'`: in JSX an attribute's value can be in single quotes, as in HTML; this one holds double quotes.
- `{store.history.code.map((line, index) => (<li key={index}>{line}</li>))}`: JSX has no loop, so a list is made with `map` (lesson 2.4): each line of code becomes an `<li>`. An array of elements inside braces is drawn one after another.
  - `map` passes each item's position as a second argument, here `index`.
  - `key` is required on each element made in a list. When the list is drawn again, React matches old and new items by key, to know which ones changed. The position works as a key here because log lines are only ever added or removed at the end.
- `<section>` is an element for one part of a page, like `<header>` (lesson 4.1).
- The ids are the old ones, `problem`, `console`, `code`, `log`, `undo`, `redo`, so the CSS from lesson 3.7 and the end-to-end tests still find them.

```check
run "npx vitest run src" stdout="87 passed"
run "npx tsc"
```

## A place for the console

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
    <div id="game"></div>
    <p>Player x: <span id="player-x"></span></p>
    <div id="console-root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- The problem paragraph, the form and the log are gone; `<div id="console-root"></div>` takes their place. React will draw the `Console` inside it.
- `<div>` (division) is an element with no meaning of its own: a box to put things in.
- The game's `<div id="game">` and the player's x stay as plain HTML for now. Lesson 4.4 moves them into React too.

```check
contains index.html "<div id=\"console-root\"></div>"
lacks index.html "<form id=\"console\">"
```

## main.tsx draws the console

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
import { EditorStore } from './editor/store';
import { addMoveActions, Player } from './game/player';
import { Console } from './ui/Console';
import { Title } from './ui/Title';

const header = document.querySelector('#header');
if (header) createRoot(header).render(<Title name="Studio" />);

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

let scene: SceneData = { formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } };
let loadProblem = '';
try {
  scene = load();
} catch (error) {
  loadProblem = `The scene didn't load. ${(error as Error).message}`;
}
const store = new EditorStore(scene, rebuild);
store.problem = loadProblem;

const consoleRoot = document.querySelector('#console-root');
if (consoleRoot) createRoot(consoleRoot).render(<Console store={store} />);

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

- `show()`, its listener and the form's event listeners are gone: `Console` does all of it.
- `createRoot(consoleRoot).render(<Console store={store} />)` draws the console. `store={store}` passes the store as a prop: in JSX, braces hold any expression, here a variable.
- The keyboard listener for Ctrl+Z and the game's keys stays in `main.tsx`. It belongs to the whole window, not to a component.

Run `npm start` and use the console as before: type a line, undo it with the button, redo it with Ctrl+Shift+Z.

```check
run "npx tsc"
run "npm run e2e" stdout="4 passed" label="the console works as before, drawn by React"
```

## Commit

```powershell
git add .
git commit -m "The console is a React component that reads the store"
```

```check
git-clean
git-tracked src/ui/Console.tsx
git-tracked src/ui/useStore.ts
```

## Challenge: Run only when there's code

**Optional, ★.** Make the Run button disabled while the code box is empty. A button's `disabled` attribute in JSX takes a `true` or `false` value in braces. Which state does the condition read: the store's or the component's?

```hints
nudge: Whether the box is empty is in code, the component's own state.
concept: Anything worked out from state is computed while drawing, every time; it isn't stored anywhere.
shape: <button type="submit" disabled={code.trim() === ''}>Run</button>
```
