---
title: 11.8 — Solution: Moving Like Excel
runtime: none
experiments: Hooks in the same order
teaches: rules of hooks, custom hooks, lazy initial state, localStorage, clamping
uses: keyboard interaction, default actions, react, components, props, state, useState, hooks, controlled inputs, keys that reset state, lifting state, record types, xss, json, generics, playground
---

### The story so far

The challenge (11.7) asked for Priya's keyboard: Tab saves and moves right, Enter and ↓ save and move down, ↑ saves and moves up, Escape throws the draft away, and the selection never leaves the sheet. Five supplied tests checked it, one of them that typed HTML stays text, and the `react` branch was merged into `main` and pushed.

### What this lesson builds

Nothing new in the project: one solution, and the reasoning behind it. If yours passed, keep it, and compare:

| file | what changes |
|---|---|
| `FormulaBar.tsx` | a `keyDown` function: a table from keys to moves, and Escape |
| `App.tsx` | `save(text, move)`: saves, then moves, clamped to the sheet |

Then a rule every React component must keep, seen breaking, and a hook of your own.

## From a key to a move {#keys}

The bar knows the key and the draft, but not the sheet. So it turns the key into a **move**, and leaves moving to the app. In `FormulaBar.tsx`:

```tsx
  function keyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    const moves: Record<string, { columns: number; rows: number }> = {
      Enter: { columns: 0, rows: 1 },
      ArrowDown: { columns: 0, rows: 1 },
      ArrowUp: { columns: 0, rows: -1 },
      Tab: { columns: 1, rows: 0 },
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      onSave(draft, move);
    } else if (event.key === "Escape") {
      setDraft(text);
    }
  }
```

**`keyDown`'s input, and what it does:**

| `event.key` | `move` | what happens |
|---|---|---|
| `Enter`, `ArrowDown` | 1 row down | `preventDefault()`, then `onSave(draft, move)` |
| `ArrowUp` | 1 row up | the same |
| `Tab` | 1 column right | the same; without `preventDefault()`, the browser would also move the focus out of the bar |
| `Escape` | none | `setDraft(text)`: the bar shows the cell's text again; nothing is saved |
| anything else | none | nothing: letters type, ← and → move the cursor in the draft |

- **`moves[event.key]`** looks the key up in a `Record` (7.4): a table of data instead of a branch per key. A new key, Shift+Tab say, is one line.
- **`onSave`'s type changed**: it now takes the move too, and `App` must accept it. TypeScript makes sure both sides agree.

## Saving, and staying on the sheet {#save}

`App` saves the draft, then moves, keeping each coordinate inside the sheet. In `App.tsx`:

```tsx
  function save(text: string, move: { columns: number; rows: number }): void {
    setChanged(book.set(selected, text));
    setSelected({
      column: Math.min(Math.max(selected.column + move.columns, 0), columns - 1),
      row: Math.min(Math.max(selected.row + move.rows, 0), rows - 1),
    });
  }
```

**`save`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `text` | the draft | `"5"` |
| input `move` | how far to move, in columns and rows | `{ columns: 1, rows: 0 }` |
| returns | nothing: it sets the cell, the status, and the selection | |

**`Math.min(Math.max(x, 0), size - 1)`** **clamps** `x` between 0 and the last column or row: `max` lifts anything below 0 up to 0, and `min` brings anything past the end back to it. On the tests' 3 × 3 sheet:

| from | key | column, clamped | row, clamped | to |
|---|---|---|---|---|
| A1 | ↑ | `min(max(0, 0), 2)` = 0 | `min(max(-1, 0), 2)` = 0 | A1: saved, stays |
| B1 | Tab | `min(max(2, 0), 2)` = 2 | 0 | C1 |
| C1 | Tab | `min(max(3, 0), 2)` = **2** | 0 | C1: saved, stays |

## Why the HTML test passed already {#escaping}

`Grid` puts each value into the page as a child, `{display(value)}`, and React always inserts a string child as **text**: `<img …>` becomes the characters `<`, `i`, `m`, `g`, never an element. It's what `textContent` did for `grid.ts` (3.5). React does have a way to insert HTML, a prop deliberately named `dangerouslySetInnerHTML`; anything a user typed must never go near it. The test is there so that if someone ever does, the suite says so.

## A page for the experiment {#hooks-page}

One more thing about hooks, before you write one. This step creates `playground/react/hooks.html`, a page for an experiment:

```html file=playground/react/hooks.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Hooks, in order</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./hooks.tsx"></script>
  </body>
</html>
```

```check
file playground/react/hooks.html
```

## Hooks in the same order {#experiment}

11.3 said hooks must be called at the top of a component, every render, in the same order, never inside an `if`. Here's a component that breaks the rule on purpose. This step creates `playground/react/hooks.tsx`:

```tsx file=playground/react/hooks.tsx
import { useState } from "react";
import { createRoot } from "react-dom/client";

function Switch() {
  const [on, setOn] = useState(false);
  if (on) {
    const [count] = useState(0);
    return <p id="count">{count}</p>;
  }
  return <button id="turn-on" onClick={() => setOn(true)}>Turn on</button>;
}

const root = document.querySelector("#root");
if (root !== null) {
  createRoot(root).render(<Switch />);
}
```

**`Switch`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input | no props | |
| returns | while `on` is false, a *Turn on* button; once it's true, a paragraph showing `count` | `<button id="turn-on">` |

The second `useState` only runs once `on` is true: the first render calls one hook, every render after the click calls two.

Before you open it, predict:

```predict
question: You click *Turn on*. What happens?
choice: 0 appears
choice: React stops with an error
answer: React stops with an error
verify: page playground/react/hooks.html "(async () => { document.querySelector('#turn-on').click(); await new Promise((r) => setTimeout(r, 50)); return document.querySelector('#count') === null ? 'React stops with an error' : document.querySelector('#count').textContent + ' appears'; })()" server=vite
explain: React doesn't know your variables' names. It remembers each component's hooks as a list, in the order they're called: first `useState` is `on`, second is `count`. The first render called one hook, the next calls two, so React can't match them up, and stops: *Rendered more hooks than during the previous render.* Calling hooks in the same order every time is what lets the list work.
```

Open `http://localhost:5173/playground/react/hooks.html` with the console open (F12), click the button, and read React's message: it shows the two renders' hooks side by side, `useState` then nothing, against `useState` then `useState`.

```check
page playground/react/hooks.html "(async () => { document.querySelector('#turn-on').click(); await new Promise((r) => setTimeout(r, 50)); return document.querySelector('#count') === null ? 'React stops with an error' : document.querySelector('#count').textContent + ' appears'; })()" "React stops with an error" server=vite label="clicking Turn on breaks the rule of hooks, and React stops"
```

## Your own hook {#custom}

A **custom hook** is a function whose name starts with `use`, which calls other hooks. It's how a component's state logic is shared between components, or given a name. The rule of order applies to it too: call it at the top of a component.

One more `useState` feature first. Its starting value can be a **function**, `useState(() => …)`, called only on the first render. That's for a starting value that's expensive or has to be looked up, such as reading the browser's storage, which shouldn't happen on every render.

**`localStorage`** is the browser's storage for a page: text values under text keys, kept after the page closes. `localStorage.setItem("order-list", "[…]")` stores; `getItem` reads, or gives `null`. Values are text, so lists go in as JSON text (4.2), with `JSON.stringify`, and come out with `JSON.parse`. It's only for small things that matter to one person in one browser: it isn't shared, and it isn't safe for anything secret.

## Your turn: an order list that survives a reload

Reload the order list and it's back to flour, butter and eggs. In `playground/react/list.tsx`, write a hook `useStoredState(key, initial)` that works like `useState`, but also keeps the value in `localStorage` under `key`, and starts from what's stored there if anything is. Use it for the items, under the key `order-list`. Then add an item, reload, and check it's still there. Commit.

```hints
nudge: The hook returns the same pair as `useState`: the value, and a function to change it. The function has to do one extra thing.
concept: Inside, `useState` with a starting function that reads `localStorage.getItem(key)`: `null` means nothing stored, so use `initial`; anything else is JSON to parse. Return `[value, store]`, where `store(next)` writes `JSON.stringify(next)` to `localStorage`, then calls the real setter. A generic type parameter, `useStoredState<T>` (5.2), keeps the value's type.
shape: `function useStoredState<T>(key: string, initial: T): [T, (value: T) => void] { const [value, setValue] = useState<T>(() => { … }); function store(next: T): void { … } return [value, store]; }`, then `const [items, setItems] = useStoredState("order-list", ["flour", "butter", "eggs"]);`
answer: ~~~tsx
// Like useState, but the value is also kept in the browser's localStorage under `key`, so it
// survives a reload.
function useStoredState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return saved === null ? initial : JSON.parse(saved);
  });
  function store(next: T): void {
    localStorage.setItem(key, JSON.stringify(next));
    setValue(next);
  }
  return [value, store];
}
~~~
```

```check
page playground/react/list.html "(async () => { const type = async (text) => { const i = document.querySelector('#item'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, text); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); }; const add = async (text) => { await type(text); document.querySelector('#add').click(); await new Promise((r) => setTimeout(r, 50)); }; await add('sugar'); document.querySelectorAll('#list li')[0].click(); await new Promise((r) => setTimeout(r, 50)); return localStorage.getItem('order-list'); })()" "[\"butter\",\"eggs\",\"sugar\"]" server=vite errors=none label="adding sugar and removing flour is saved in localStorage, as JSON" -- store(next) must call localStorage.setItem(key, JSON.stringify(next)) before setting the state.
git-clean -- Commit it: git add playground, then git commit.
```
