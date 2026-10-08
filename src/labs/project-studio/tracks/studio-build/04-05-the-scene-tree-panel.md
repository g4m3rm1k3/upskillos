---
title: 4.5 — The Scene Tree Panel
track: Build Your Own Game Studio
runtime: none
concepts: recursive-components, conditional-rendering, keys, selection, data-attributes
problem: A scene is a tree of any depth. How does one component draw all of it, nested the way the scene is, and let you click a node to select it?
---

Every game engine's editor has a **scene tree** panel: the scene's nodes listed as an indented outline, children under their parents. Clicking a node **selects** it: the editor marks it, and the inspector (lesson 4.7) shows its properties. Selecting changes nothing in the scene; it says which node the next edit is about.

The store already holds the selection (lesson 4.2). This lesson draws the tree and sets the selection when you click.

## The story's acceptance test

Sprint 4's second story: *see my scene's tree and click a node to select it*. Outside in, as in lesson 4.4: the acceptance test first. Change `e2e/editor.test.ts`:

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
```

- `[data-path="level/player"]` is an **attribute selector**: square brackets select elements whose attribute has that value. This one finds the player's button.
- `expect.poll(() => page.locator(…).count()).toBe(1)` waits until the player's button is on the page. It's there for the red: without it, `page.click` would wait the test's whole 30 seconds for a button that doesn't exist, and fail with *Test timed out*, which says nothing about why. A red should fail fast, on an assertion that names what's missing. With this line, it fails in a second: there's no player button.
- `page.click` clicks it, the way you would.
- `page.getAttribute(selector, 'class')` reads one attribute of the element found. The player's button must become `selected`, and the wall's must stay `''`.
- `expect.poll` waits for the class to change: React draws the change a moment after the click.


```check
run "npm run e2e" exit=1 stderr="expected +0 to be 1" label="the acceptance test fails: there is no tree to click"
```

## The tree's test

Create `src/ui/SceneTree.test.tsx`:

```tsx file=src/ui/SceneTree.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { EditorStore } from '../editor/store';
import { SceneTree } from './SceneTree';

function store(): EditorStore {
  const scene: SceneData = {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [{ type: 'Box', name: 'car', props: {}, children: [{ type: 'Box', name: 'wheel', props: {}, children: [] }] }],
    },
  };
  return new EditorStore(scene, () => {});
}

test('the tree shows every node, children inside their parent, each with its path', () => {
  const html = renderToStaticMarkup(<SceneTree store={store()} />);
  expect(html).toBe(
    '<ul class="tree">' +
      '<li><button type="button" class="" data-path="level">level <small>Node</small></button>' +
      '<ul><li><button type="button" class="" data-path="level/car">car <small>Box</small></button>' +
      '<ul><li><button type="button" class="" data-path="level/car/wheel">wheel <small>Box</small></button></li></ul>' +
      '</li></ul></li>' +
      '</ul>',
  );
});

test('the selected node is marked', () => {
  const s = store();
  s.select('level/car');
  const html = renderToStaticMarkup(<SceneTree store={s} />);
  expect(html).toContain('<button type="button" class="selected" data-path="level/car">');
  expect(html).toContain('<button type="button" class="" data-path="level/car/wheel">');
});
```

- The scene is three levels deep: `level`, its child `car`, and the car's child `wheel`. A tree that works for three levels works for any number, if it's drawn by the same rule at every level.
- The first test spells out the whole HTML, split over lines with `+` to be readable. Each node is a list item, `<li>`, holding a button with the node's name and type; a node's children are a list, `<ul>`, inside its own item. So the HTML nests exactly as the scene does.
- `<ul>` is an **unordered list**: like `<ol>` (lesson 3.7) but not numbered.
- Each button has `data-path="level/car"`: the node's path. An attribute whose name starts with `data-` is a **data attribute**: HTML lets you add any of these to hold your own information. The browser ignores them; the end-to-end test will use this one to find a node's button.
- `class=""` on every button, and `class="selected"` on the selected one: CSS will colour the selected one.
- The second test selects the car, and checks that the car is marked and the wheel isn't.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './SceneTree'"
```

## The SceneTree component

Create `src/ui/SceneTree.tsx`:

```tsx file=src/ui/SceneTree.tsx
import type { NodeData } from '../engine/scene';
import type { EditorStore } from '../editor/store';
import { useStore } from './useStore';

export function SceneTree({ store }: { store: EditorStore }) {
  useStore(store);
  const root = store.scene.root;
  return (
    <ul className="tree">
      <TreeItem node={root} path={root.name} store={store} />
    </ul>
  );
}

function TreeItem({ node, path, store }: { node: NodeData; path: string; store: EditorStore }) {
  return (
    <li>
      <button
        type="button"
        className={store.selected === path ? 'selected' : ''}
        data-path={path}
        onClick={() => store.select(path)}
      >
        {node.name} <small>{node.type}</small>
      </button>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeItem key={child.name} node={child} path={`${path}/${child.name}`} store={store} />
          ))}
        </ul>
      )}
    </li>
  );
}
```

- `SceneTree` reads the store (`useStore`), and draws the outer list with one item: the root, whose path is its own name.
- `TreeItem` draws one node and, inside it, all of that node's children, each by calling `TreeItem` again. A component that uses itself is **recursive**, like `findPlayer` (lesson 3.7) and `buildNode` (lesson 2.2). It stops at nodes with no children.
- `TreeItem` isn't exported: only `SceneTree` uses it.
- Its props are the node's data, its path, and the store. Each child's path is the parent's, a `/`, and the child's name: `` `${path}/${child.name}` ``.
- `className={store.selected === path ? 'selected' : ''}`: the conditional operator (lesson 0.4's `? :`) picks the class name. Every item is drawn again after each change, so the mark moves when the selection does.
- `onClick={() => store.select(path)}`: a click selects this node. The store tells its listeners, React draws the tree again, and the clicked item now has the class `selected`.
- `type="button"`: a button is a submit button unless it says otherwise; this one isn't in a form, but the habit avoids surprises.
- `{node.name} <small>{node.type}</small>`: the name, a space, and the type in a `<small>` element, which browsers show in smaller text.
- `{node.children.length > 0 && (…)}` draws the inner list only when there are children:
  - `a && b` gives `a` if `a` is false-like, and `b` otherwise (lesson 1.3's `&&`, used here for its value).
  - In JSX, `false` draws nothing. So with no children it's `false` and nothing is drawn; otherwise it's the `<ul>`.
  - Why `length > 0` and not just `node.children.length`: with no children that would be `0`, and React draws the number `0` on the page. Only `false`, `null` and `undefined` draw nothing.
- `key={child.name}`: each child's name is a good key, because sibling names are unique (lesson 3.2 made sure). Better than the position: if the first child is deleted, the others keep their keys, and React knows they're the same items as before.

```check
run "npx vitest run src" stdout="89 passed"
run "npx tsc"
```

## The tree in its panel

Change `src/ui/App.tsx`:

```tsx file=src/ui/App.tsx
import type { EditorStore } from '../editor/store';
import type { Game } from '../engine/game';
import { Console } from './Console';
import { GameView } from './GameView';
import { SceneTree } from './SceneTree';
import { Title } from './Title';

export function App({ store, game, readout }: { store: EditorStore; game: Game; readout: () => string }) {
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

- `<SceneTree store={store} />` goes under the Scene heading, in the left panel. Nothing else changes.

```check
run "npx tsc"
```

## Styling the tree

Lists and buttons come with the browser's own look: bullets, big indents, grey button boxes. A tree needs none of it. Change `src/style.css`:

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

- `.tree, .tree ul` matches the outer list (class `tree`) and every `<ul>` inside it. A space between two selectors means "inside" (as in lesson 4.4's test), so `.tree ul` is any `<ul>` anywhere inside an element with the class `tree`.
- `list-style: none` removes the bullets.
- `margin: 0` and `padding-left: 16px`: lists are indented by padding on the left. Every level gets 16 pixels more than its parent's, so the outline shows the depth.
- `.tree button` is every button in the tree. `border: none` and `background: none` remove the button's box, so it looks like text.
- `padding: 2px 4px`: two sizes mean top and bottom 2 pixels, left and right 4.
- `font: inherit`: buttons don't take their font from the page by default. `inherit` means "use the parent's", so the tree uses the page's font.
- `cursor: pointer` shows the pointing-hand cursor over the button, so it looks clickable.
- `.tree button.selected`: two selectors written together, with no space, mean "both": a button that also has the class `selected`. Its background is light blue, `#cfe3ff`.
- `.tree small` makes the type names grey, `#777`, so the names stand out.

Run `npm start` and click the nodes: the light blue mark follows your clicks.

```check
contains src/style.css ".tree button.selected {"
contains src/style.css "list-style: none;"
run "npm run e2e" stdout="6 passed" label="the acceptance test passes: clicking a node in the tree selects it"
```

## Commit, and tick the second story

You can see the scene's tree and click a node to select it: tick the second Sprint 4 story in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "The scene tree panel: the scene as an outline, click to select"
```

```check
contains BACKLOG.md "- [x] As a game maker, I want to see my scene's tree"
git-clean
git-tracked src/ui/SceneTree.tsx
```

## Challenge: folding

**Optional, ★★.** Big scenes need folding: a small ▸ / ▾ button before each node with children, which hides or shows them. Is "folded" state for the store, or for each `TreeItem` with `useState`? Think about what should happen to a folded branch after an undo, then decide.

```hints
nudge: Folding is about how the tree looks, not about the scene. Nothing else needs to know.
concept: State that only one component uses can live in that component; React keeps it as long as the item stays in the tree with the same key.
shape: const [open, setOpen] = useState(true); then {open && node.children.length > 0 && (…)} and a button with onClick={() => setOpen(!open)}.
```
