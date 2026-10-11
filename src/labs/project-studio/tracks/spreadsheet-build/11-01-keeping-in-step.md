---
title: 11.1 — Keeping the Page in Step
runtime: none
experiments: Two places, one forgotten
teaches: UI state, keeping the page in step, rendering from state
uses: dom, event listeners, createelement, textcontent, arrays, template literals, closures, playground, git commit
---

### The story so far

Module 1 built the spreadsheet's engine and a page for it; Sprint 10 brought the first client, Crumb & Co., and delivered their first story. The page is `src/grid.ts`: 113 lines that build the table with `createElement`, and then, whenever something happens, change exactly the parts of the page that should change.

### What this lesson builds

Nothing in the project. This lesson is about a problem, the one React exists to solve, seen first in the spreadsheet and then made small enough to watch in a playground page:

```text
 playground/react/
 ├── by-hand.html    a bakery's order list: add items, click one to remove it
 └── by-hand.js      kept in step by hand, with one place forgotten
```

## What grid.ts does by hand {#by-hand}

Read `src/grid.ts` again, and list what each event changes on the page:

| when | grid.ts changes |
|---|---|
| a cell is clicked (`select`) | the old cell loses `selected`; the new one gains it; the name box; the formula bar's text; focus; every `precedent` and `dependent` class is cleared and set again (`trace`) |
| Enter is pressed | every changed cell's text and its `error` class (`show`); the status line; then all of `select` again, for the cell below |

Every line on the right is a place where the page has to be made to agree with the program's **state**: the workbook, which cell is selected, what changed last. The state lives in variables; the page is a copy of it, kept in step by code you write for each event.

That works while there are few events and few copies. Each feature since has added both. Lesson 8.6's tracing needed code in `select`, and also the clearing of the old marks: forget the clearing, and old marks stay on the page, still looking right. Every new feature means finding every event that affects it. This is the bug that keeps a page in step by hand: not a crash, but a page that quietly says something the state doesn't.

## The page {#page}

Here it is, small. An order list, as Priya might keep for the day's deliveries. This step creates `playground/react/by-hand.html`:

```html file=playground/react/by-hand.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Order list, by hand</title>
  </head>
  <body>
    <h1>Order list</h1>
    <p id="count">0 items</p>
    <ul id="list"></ul>
    <input id="item" aria-label="Item">
    <button id="add">Add</button>
    <script type="module" src="./by-hand.js"></script>
  </body>
</html>
```

| element | id | what it's for |
|---|---|---|
| a paragraph | `count` | how many items are on the list, as text: *3 items* |
| an empty list | `list` | one `<li>` per item, added by the script |
| an input | `item` | where the next item's name is typed; `aria-label` names it for screen readers, since it has no visible label |
| a button | `add` | adds what's in the input to the list |

The ids are how the script finds each element (`document.querySelector("#count")`, lesson 3.3), and how the checks find them too.

```check
file playground/react/by-hand.html
```

## Two places, one forgotten {#experiment}

The script keeps the list in an array, `items`, and the page in step with it. This step creates `playground/react/by-hand.js`:

```javascript file=playground/react/by-hand.js
const items = [];
const list = document.querySelector("#list");

document.querySelector("#add").addEventListener("click", () => {
  const name = document.querySelector("#item").value;
  items.push(name);
  const li = document.createElement("li");
  li.textContent = name;
  li.addEventListener("click", () => {
    items.splice(items.indexOf(name), 1);
    li.remove();
  });
  list.appendChild(li);
  document.querySelector("#count").textContent = `${items.length} items`;
});
```

| event | changes the state | changes the page |
|---|---|---|
| Add is clicked | `items.push(name)` | a new `<li>`, and the count |
| an item is clicked | `items.splice(…)`, which removes it | `li.remove()` |

- **`items.indexOf(name)`** finds where the item is in the array now, and **`splice(index, 1)`** removes one element from there.
- **Each `<li>` gets its own click listener**, a closure (3.4) that remembers its `name` and its `li`.

The state has two copies on the page: the list, and the count. Adding updates both. Look at removing.

Before you open it, predict:

```predict
question: Add flour, butter and eggs, then click butter to remove it. What does the count say?
choice: 2 items
choice: 3 items
answer: 3 items
verify: page playground/react/by-hand.html "(() => { const add = (name) => { document.querySelector('#item').value = name; document.querySelector('#add').click(); }; add('flour'); add('butter'); add('eggs'); document.querySelectorAll('#list li')[1].click(); return document.querySelector('#count').textContent; })()" server=vite
explain: Removing updates `items` and the list, but nothing updates the count, so it still says what it said after the last *add*. The array is right; the list is right; the page is wrong, and nothing on it looks broken.
```

Start Vite (`npx vite`), open `http://localhost:5173/playground/react/by-hand.html`, and try it. Then stop Vite with Ctrl+C.

```check
page playground/react/by-hand.html "(() => { const add = (name) => { document.querySelector('#item').value = name; document.querySelector('#add').click(); }; add('flour'); add('butter'); add('eggs'); document.querySelectorAll('#list li')[1].click(); return document.querySelector('#count').textContent + '|' + document.querySelectorAll('#list li').length; })()" "3 items|2" server=vite errors=none label="after removing one of three, the list has 2 items and the count still says 3"
```

## The page as a function of the state {#render}

There's another way to keep a page in step: don't. Instead, write **one** function that builds the whole page from the state, and call it after every change:

```text
 an event   →   change the state   →   render(): build the page from the state, all of it
```

Then the count can't be forgotten, because nothing updates it specially: `render` always writes it from `items.length`. Adding a feature means adding it to `render`, once. The page is a **function of the state**: the same state always gives the same page.

The price shows when you try it. Rebuilding everything throws away what was there: if the list had an input in it, whatever the user was typing would vanish with the old `<li>`; if it had 10,000 rows, every click would rebuild 10,000. **React** keeps the good half: you write the function from state to page, and React works out the smallest set of changes that turns the page that's there into the one you described. The next lessons build exactly that.

## Your turn: one render()

Rewrite `playground/react/by-hand.js` so that the page is built from the state in one place: a `render()` function that rebuilds the whole list and the count from `items`, called once at the start and after every change. No other code may touch the list or the count. Commit.

```hints
nudge: Start with `render()`: from `items`, make every `<li>`, put them in the list, and write the count. Then make Add and each item's click change `items` and call `render()`.
concept: `items.map((name, i) => …)` can make the `<li>`s; `list.replaceChildren(...rows)` (spread, 8.2) puts them in place of whatever was there. Each `<li>`'s click removes item `i` and calls `render()` again, which rebuilds the list with new listeners.
shape: `const items = []; function render() { const rows = items.map((name, i) => { … }); document.querySelector("#list").replaceChildren(...rows); document.querySelector("#count").textContent = …; }` then the Add listener, then `render();`.
answer: ~~~javascript
const items = [];

// The whole list and the count, rebuilt from items every time anything changes.
function render() {
  const rows = items.map((name, i) => {
    const li = document.createElement("li");
    li.textContent = name;
    li.addEventListener("click", () => {
      items.splice(i, 1);
      render();
    });
    return li;
  });
  document.querySelector("#list").replaceChildren(...rows);
  document.querySelector("#count").textContent = `${items.length} items`;
}

document.querySelector("#add").addEventListener("click", () => {
  items.push(document.querySelector("#item").value);
  render();
});
render();
~~~
```

```check
page playground/react/by-hand.html "(() => { const add = (name) => { document.querySelector('#item').value = name; document.querySelector('#add').click(); }; add('flour'); add('butter'); add('eggs'); document.querySelectorAll('#list li')[1].click(); return document.querySelector('#count').textContent + '|' + document.querySelectorAll('#list li').length; })()" "2 items|2" server=vite errors=none label="after removing one of three, the count and the list agree" -- Write the count in render(), from items.length, and call render() after every change.
git-clean -- Commit it: git add playground, then git commit.
```
