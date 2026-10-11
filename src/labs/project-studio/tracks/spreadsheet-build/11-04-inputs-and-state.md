---
title: 11.4 — Inputs, and Where State Lives
runtime: none
experiments: Typing re-renders
justified: State where it's used
teaches: controlled inputs, lifting state, colocating state, useRef, useEffect, refs
uses: react, jsx, components, props, state, useState, hooks, keys, immutable updates, event handlers in JSX, spread syntax, playground, git commit
---

### The story so far

Lesson 11.3 gave the order list **state**: `useState` keeps the items between renders, `setItems` replaces them with a new array and makes React call `OrderList` again, and clicking an item removes it, with the count following by itself. Data goes down to `Item` as props; the click comes back up as a function.

### What this lesson builds

The last piece of the order list: typing a new item and adding it. That brings in three ideas the spreadsheet's formula bar will need in 11.6:

| idea | in the order list | in the spreadsheet (11.6) |
|---|---|---|
| a **controlled input**: React holds what's typed | the new item's name | the formula being typed |
| state **where it's used**, so typing doesn't redraw everything | `AddItem` owns its draft | the formula bar owns its draft, not the 2,600-cell grid |
| an **effect**, for work that isn't describing the page | focus the input when the page opens | focus the formula bar |

## A controlled input {#controlled}

An input normally keeps its own text, in the DOM. A **controlled input** gets its text from React state instead, and reports every keystroke back. This step adds one to `OrderList`, with an Add button:

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
  const [draft, setDraft] = useState("");
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
      <input id="item" aria-label="Item" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button id="add" onClick={() => setItems([...items, draft])}>
        Add
      </button>
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
```

| part | what it does |
|---|---|
| `const [draft, setDraft] = useState("")` | the text typed so far, as state |
| `value={draft}` | the input always shows `draft`: React sets it on every render |
| `onChange={(event) => setDraft(event.target.value)}` | each keystroke: `event.target` is the input, `.value` its text with the new character; that becomes the new `draft` |
| `setItems([...items, draft])` | Add: a new array, the old items then the draft (11.3's immutable update) |

Why bother? Because now the text is state like any other: React can check it, clear it, or change it, and what's on the screen is always what the state says. React's `onChange` fires on every keystroke, unlike the DOM's `change` event, which waits until the input loses focus.

```check
page playground/react/list.html "(async () => { const type = async (text) => { const i = document.querySelector('#item'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, text); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); }; const add = async (text) => { await type(text); document.querySelector('#add').click(); await new Promise((r) => setTimeout(r, 50)); }; await add('sugar'); return document.querySelector('#count').textContent + '|' + [...document.querySelectorAll('#list li')].map((x) => x.textContent).join(','); })()" "4 items|flour,butter,eggs,sugar" server=vite errors=none label="typing sugar and clicking Add adds it"
```

## Typing re-renders {#experiment}

`draft` is `OrderList`'s state, and every keystroke sets it. Before you open the page, predict:

```predict
question: The page opens, then you type `flour` into the input, one letter at a time. How many times has `OrderList` been rendered?
answer: 6
verify: page playground/react/list.html "(async () => { const type = async (text) => { const i = document.querySelector('#item'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, text); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); }; const add = async (text) => { await type(text); document.querySelector('#add').click(); await new Promise((r) => setTimeout(r, 50)); }; for (const t of ['f', 'fl', 'flo', 'flou', 'flour']) await type(t); return String(parseInt(document.title)); })()" server=vite
explain: Once when the page opens, then once per letter: every `setDraft` re-renders the component that owns the state, `OrderList`, and with it every `Item`. Typing five letters redraws the whole list five times, though not one item changed.
```

Open the page, type in the input, and watch the title count. Here it's cheap: three items. The spreadsheet's grid is 2,600 cells, and the formula bar is typed into all day.

## State where it's used {#colocate}

The fix is to put the draft in the component that uses it. A new `AddItem` component owns the input, the button and the draft, and tells `OrderList` only when something is added. This step moves them. It's longer than most steps, but most of its lines aren't new: the `draft` state, the input and the button move out of `OrderList` into `AddItem` nearly unchanged.

```tsx file=playground/react/list.tsx
import { useState } from "react";
import { createRoot } from "react-dom/client";

function Item({ name, onRemove }: { name: string; onRemove: () => void }) {
  return <li onClick={onRemove}>{name}</li>;
}

function AddItem({ onAdd }: { onAdd: (name: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <>
      <input id="item" aria-label="Item" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button
        id="add"
        onClick={() => {
          onAdd(draft);
          setDraft("");
        }}
      >
        Add
      </button>
    </>
  );
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
      <AddItem onAdd={(name) => setItems([...items, name])} />
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
```

**`AddItem`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `props` | `onAdd`, a function to call with the new name | `(name) => setItems([...items, name])` |
| returns | the input and the Add button | |

- **The draft is `AddItem`'s state now.** Typing re-renders `AddItem`, and nothing above it: `OrderList` renders once while you type `flour`, and again only when Add changes the items.
- **`setDraft("")` after `onAdd(draft)`** empties the input for the next item.
- **Keep state as close as possible to where it's used**, and move it up only as far as the components that need it share a parent. That second half is called **lifting state up**: `items` lives in `OrderList` because both the list and the Add button need it.

```check
page playground/react/list.html "(async () => { const type = async (text) => { const i = document.querySelector('#item'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, text); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); }; const add = async (text) => { await type(text); document.querySelector('#add').click(); await new Promise((r) => setTimeout(r, 50)); }; for (const t of ['s', 'su', 'sug', 'suga', 'sugar']) await type(t); const typing = document.title; document.querySelector('#add').click(); await new Promise((r) => setTimeout(r, 50)); return typing + '|' + document.querySelector('#count').textContent + '|' + document.querySelector('#item').value + '|'; })()" "1 renders|4 items||" server=vite errors=none label="typing sugar renders OrderList once, not per letter; Add adds it and empties the input"
```

Add *flour* a second time, with the browser's console open (F12). React says:

```text
Encountered two children with the same key, `flour`. Keys should be unique so that components maintain their identity across updates.
```

Two `Item`s now claim the same identity (11.2's keys), so React can't tell which is which. Your turn below fixes it at the source.

## Focus when the page opens {#focus}

The input should be ready to type into as soon as the page opens. Focusing is something done *to* the real DOM element, not a description of the page, so it needs two more hooks. This step adds them to `AddItem`:

```tsx file=playground/react/list.tsx
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

function Item({ name, onRemove }: { name: string; onRemove: () => void }) {
  return <li onClick={onRemove}>{name}</li>;
}

function AddItem({ onAdd }: { onAdd: (name: string) => void }) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  return (
    <>
      <input id="item" aria-label="Item" ref={input} value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button
        id="add"
        onClick={() => {
          onAdd(draft);
          setDraft("");
        }}
      >
        Add
      </button>
    </>
  );
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
      <AddItem onAdd={(name) => setItems([...items, name])} />
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
```

| hook | gives | here |
|---|---|---|
| `useRef(null)` | an object, `{ current: … }`, that React keeps between renders, and that never re-renders anything when it changes | `input`, to hold the real `<input>` |
| `ref={input}` | React puts the real DOM element into `input.current` once it exists | the `<input>` element |
| `useEffect(fn, [])` | runs `fn` **after** React has updated the page; the `[]` means only after the first render | `input.current?.focus()` |

- **Why after?** During a render, the real `<input>` may not exist yet: the description is still being made. Effects run once the page matches it.
- **`[]` is the list of dependencies**: values the effect uses that could change. With none, it runs once; with `[draft]`, it would run after every render where `draft` changed.
- **`?.`** (5.2's optional chaining): `current` is `null` until the element exists.

```check
page playground/react/list.html "document.activeElement === null ? 'nothing' : document.activeElement.id" "item" server=vite errors=none label="the input has focus as soon as the page opens"
```

## Commit

```powershell
git add playground
git commit -m "Order list: adding items"
```

```check
git-clean
```

## Your turn: nothing empty, nothing twice

Clicking Add with an empty input adds an empty item, and adding a name that's already there makes two items with the same key. In `OrderList`, add a function `add(name)` that adds the name only if it isn't empty (spaces don't count) and isn't already on the list, and pass it to `AddItem`. Commit.

```hints
nudge: The check belongs where the items are: in `OrderList`, before `setItems`.
concept: `name.trim()` removes spaces from both ends, so `"  "` becomes `""`. `items.includes(name)` says whether it's on the list already. Only when the name passes both, call `setItems([...items, name])`.
shape: `function add(name: string): void { if (name.trim() !== "" && !items.includes(name)) { setItems([...items, name]); } }`, then `<AddItem onAdd={add} />`.
answer: ~~~tsx
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

function Item({ name, onRemove }: { name: string; onRemove: () => void }) {
  return <li onClick={onRemove}>{name}</li>;
}

function AddItem({ onAdd }: { onAdd: (name: string) => void }) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  return (
    <>
      <input id="item" aria-label="Item" ref={input} value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button
        id="add"
        onClick={() => {
          onAdd(draft);
          setDraft("");
        }}
      >
        Add
      </button>
    </>
  );
}

// Counts how many times OrderList runs, in the tab's title. Only for the experiment.
let renders = 0;

function OrderList() {
  const [items, setItems] = useState(["flour", "butter", "eggs"]);
  renders++;
  document.title = `${renders} renders`;

  // An empty name, or one already on the list, isn't added: keys must stay unique.
  function add(name: string): void {
    if (name.trim() !== "" && !items.includes(name)) {
      setItems([...items, name]);
    }
  }

  return (
    <>
      <h1>Order list</h1>
      <p id="count">{items.length} items</p>
      <ul id="list">
        {items.map((name) => (
          <Item key={name} name={name} onRemove={() => setItems(items.filter((item) => item !== name))} />
        ))}
      </ul>
      <AddItem onAdd={add} />
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
page playground/react/list.html "(async () => { const type = async (text) => { const i = document.querySelector('#item'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, text); i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 50)); }; const add = async (text) => { await type(text); document.querySelector('#add').click(); await new Promise((r) => setTimeout(r, 50)); }; await add(''); await add('flour'); await add('sugar'); return document.querySelector('#count').textContent + '|' + [...document.querySelectorAll('#list li')].map((x) => x.textContent).join(','); })()" "4 items|flour,butter,eggs,sugar" server=vite errors=none label="an empty name and a second flour are ignored; sugar is added" -- In add, skip a name that's empty after trim, or already in items.
git-clean -- Commit it: git add playground, then git commit.
```
