---
title: 11.3 — State and Events
runtime: none
experiments: Counting renders
teaches: state, useState, hooks, re-rendering, event handlers in JSX, immutable updates
uses: react, jsx, components, props, keys, rendering from state, closures, arrow functions, array filter, spread syntax, playground, git commit
---

### The story so far

Lesson 11.2 installed React and described the order list with two components: `OrderList`, given the items as **props**, returns a heading, a count and a list; `Item` returns one `<li>`. A component is a function that returns a description of the page, and React builds the real elements from it. But the list can't change yet: props come from outside, and nothing here can change them.

### What this lesson builds

A list that changes: click an item to remove it, and the count follows by itself, which 11.1's hand-written version forgot to do.

```text
 click "flour"
   → Item's onClick runs onRemove
   → setItems(the list without flour)       the state changes
   → React calls OrderList again            a re-render
   → it returns a list of 2 and "2 items"   the new description
   → react-dom changes only what differs    one <li> removed, the count's text changed
```

## State, and why a variable won't do {#state}

To re-render, React calls your component function again. So a variable declared inside it starts afresh every time: a `let items = […]` would be back to three items on every render. And a variable outside it can change without React knowing, so nothing would re-render at all.

**State** is a value React keeps for a component between renders, and changing it is how a component says "draw me again". You get it from **`useState`**:

```tsx
const [items, setItems] = useState(["flour", "butter", "eggs"]);
```

**`useState`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input | the value to start with, used on the first render only | `["flour", "butter", "eggs"]` |
| returns `[0]` | the current value, for this render | `items` |
| returns `[1]` | a function that replaces the value and re-renders | `setItems(["butter", "eggs"])` |

Functions whose names start with `use` are **hooks**: they connect a component to something React keeps for it. They have one rule: call them at the top of the component, every render, in the same order, never inside an `if` or a loop, because React tells them apart by their order.

## Clicking to remove {#remove}

This step gives `OrderList` its items as state, and each `Item` a function to call when it's clicked. It also counts renders in the page's title, for the experiment:

```tsx file=playground/react/list.tsx
import { useState } from "react";
import { createRoot } from "react-dom/client";

function Item({ name, onRemove }: { name: string; onRemove: () => void }) {
  return <li onClick={onRemove}>{name}</li>;
}

// Counts how many times OrderList runs, in the tab's title. Only for the experiment.
let renders = 0;

function OrderList() {
  const [items, setItems] = useState(["flour", "butter", "eggs"]);
  renders++;
  document.title = `${renders} renders`;
  return (
    <>
      <h1>Order list</h1>
      <p id="count">{items.length} items</p>
      <ul id="list">
        {items.map((name) => (
          <Item key={name} name={name} onRemove={() => setItems(items.filter((item) => item !== name))} />
        ))}
      </ul>
    </>
  );
}

const root = document.querySelector("#root");
if (root !== null) {
  createRoot(root).render(<OrderList />);
}
```

**`Item`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `props` | a `name`, and `onRemove`, a function to call when clicked | `{ name: "flour", onRemove: () => … }` |
| returns | an `<li>` that calls `onRemove` when clicked | `<li onClick={onRemove}>flour</li>` |

- **`onClick={onRemove}`** is how JSX attaches an event listener: the prop is named after the event, and its value is the function. React adds and removes the real listeners itself.
- **`onRemove={() => setItems(…)}`**: `OrderList` passes each `Item` a function that knows which name to remove, a closure (3.4) over `name`. `Item` doesn't know about the list at all: it just reports the click. Data goes down as props; events come up as functions.
- **`items.filter((item) => item !== name)`** (8.4) makes a **new** array, without the clicked name. The next section says why it must be new.
- **`renders++`** and `document.title` run every time React calls `OrderList`. Changing things outside the component while rendering is a bad habit, and it's here only to watch React work.

```check
page playground/react/list.html "(async () => { const li = () => document.querySelectorAll('#list li'); li()[0].click(); await new Promise((r) => setTimeout(r, 50)); li()[0].click(); await new Promise((r) => setTimeout(r, 50)); return document.title + '|' + document.querySelector('#count').textContent + '|' + [...li()].map((x) => x.textContent).join(','); })()" "3 renders|1 items|eggs" server=vite errors=none label="clicking two items removes them, and the count follows"
```

## Counting renders {#experiment}

Before you open the page, predict:

```predict
question: The page opens, then you click two items to remove them. How many times has `OrderList` been rendered?
answer: 3
verify: page playground/react/list.html "(async () => { const li = () => document.querySelectorAll('#list li'); li()[0].click(); await new Promise((r) => setTimeout(r, 50)); li()[0].click(); await new Promise((r) => setTimeout(r, 50)); return String(parseInt(document.title)); })()" server=vite
explain: Once when the page opens, and once for each `setItems`: three. Each render is a call of your function, with that render's `items`. Nothing else re-renders `OrderList`: clicking does nothing by itself, only changing state does.
```

Start Vite, open `http://localhost:5173/playground/react/list.html`, and click two items. The tab's title counts: *3 renders*.

React's development tools have a mode, `StrictMode`, that calls every component twice on purpose, to flush out components that change things while rendering, like this counter. With it on, you'd see *6 renders*. That's another reason the counter is for the experiment only.

## Never change state in place {#immutable}

Why `filter`, and not `items.splice(index, 1)` as in 11.1? Because of how React decides whether anything changed:

| code | what `setItems` receives | React's check, `Object.is(old, new)` | re-renders? |
|---|---|---|---|
| `setItems(items.filter(…))` | a new array | different arrays | yes |
| `items.splice(i, 1); setItems(items)` | the same array, changed inside | the same array | **no**: the page still shows the item, though the array no longer has it |

React compares the new state with the old by **identity**, `Object.is`, not by looking inside: it's fast, and it's only correct if state is never changed in place. So state is treated as **immutable**: to change it, make a new value. For arrays: `filter` to remove, `[...items, name]` (spread, 8.2) to add, `map` to change one.

## Commit

```powershell
git add playground
git commit -m "Order list: state and events"
```

```check
git-clean
```

## Your turn: Clear

Add a button with the id `clear`, after the list, that empties it. Commit.

```hints
nudge: One button, one `onClick`, one `setItems`.
concept: Emptying the list is setting the state to a new, empty array. The count and the list follow, because they're worked out from `items` on every render.
shape: `<button id="clear" onClick={() => setItems([])}>Clear</button>`, after `</ul>`.
answer: ~~~tsx
import { useState } from "react";
import { createRoot } from "react-dom/client";

function Item({ name, onRemove }: { name: string; onRemove: () => void }) {
  return <li onClick={onRemove}>{name}</li>;
}

// Counts how many times OrderList runs, in the tab's title. Only for the experiment.
let renders = 0;

function OrderList() {
  const [items, setItems] = useState(["flour", "butter", "eggs"]);
  renders++;
  document.title = `${renders} renders`;
  return (
    <>
      <h1>Order list</h1>
      <p id="count">{items.length} items</p>
      <ul id="list">
        {items.map((name) => (
          <Item key={name} name={name} onRemove={() => setItems(items.filter((item) => item !== name))} />
        ))}
      </ul>
      <button id="clear" onClick={() => setItems([])}>
        Clear
      </button>
    </>
  );
}

const root = document.querySelector("#root");
if (root !== null) {
  createRoot(root).render(<OrderList />);
}
~~~
```

```check
page playground/react/list.html "(async () => { document.querySelector('#clear').click(); await new Promise((r) => setTimeout(r, 50)); return document.querySelector('#count').textContent + '|' + document.querySelectorAll('#list li').length; })()" "0 items|0" server=vite errors=none label="Clear empties the list, and the count follows" -- A button with id clear, whose onClick sets the items to [].
git-clean -- Commit it: git add playground, then git commit.
```
