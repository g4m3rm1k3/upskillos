# Lesson 3 — The Todo List

## What you'll learn
- Arrays as state — one variable representing a *collection*, not a single value
- The "clear and rebuild" render pattern: destroying and regenerating DOM elements from data
- Event delegation — why you attach one listener to a container instead of one per item
- `dataset` attributes as a way to smuggle information from the DOM back into your JS

## What you'll build
A todo list: type a task, press Enter or click Add, it appears in a list;
click a task to mark it done (strikethrough); click a delete button to remove
it.

## The question
Lesson 1 and 2 each managed a single number. A todo list needs to track an
*unknown, changing number* of items. What does state look like when it's not
just one value?

## 1. Predict

You already know arrays from your JS/Python basics — `push`, indexing,
`.length`. Given that, predict: when the user adds a new todo, do you think
the code should (a) directly insert one new `<li>` into the existing list, or
(b) throw away every `<li>` currently on screen and regenerate the whole list
from the array? Which sounds more wasteful? Which sounds more reliable? Hold
that thought — the answer isn't obvious, and this lesson deliberately picks
the "wasteful-looking" one for a reason that matters later.

## 2. Try it

Create `src/lesson-03-todo-list/index.html`, `style.css`, `script.js`.

**`index.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Todo List</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Todo List</h1>
  <input type="text" id="todo-input" placeholder="New task...">
  <button id="add-btn">Add</button>
  <ul id="todo-list"></ul>
</body>
<script src="script.js"></script>
</html>
```

**`script.js`**
```js
let todos = [];

const input = document.getElementById("todo-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("todo-list");

function addTodo() {
  const text = input.value.trim();
  if (text === "") return;

  todos.push({ text: text, done: false });
  input.value = "";
  render();
}

function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  render();
}

function deleteTodo(index) {
  todos.splice(index, 1);
  render();
}

function render() {
  list.innerHTML = "";

  todos.forEach(function (todo, index) {
    const li = document.createElement("li");
    li.textContent = todo.text;
    li.dataset.index = index;
    if (todo.done) {
      li.classList.add("done");
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.dataset.index = index;
    deleteBtn.classList.add("delete-btn");

    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

addBtn.addEventListener("click", addTodo);

list.addEventListener("click", function (event) {
  const index = Number(event.target.dataset.index);

  if (event.target.classList.contains("delete-btn")) {
    deleteTodo(index);
  } else if (event.target.tagName === "LI") {
    toggleTodo(index);
  }
});
```

### What this code does

**`let todos = [];`**
- One array holds *every* todo. Not one variable per task — a single
  collection. This is the shift from Lessons 1–2: state can be a structured
  collection, not just a primitive.
- `let`, not `const` — the array's *contents* change via `push`/`splice`, and
  while `const` would technically still allow mutating an array's contents
  (only reassignment is forbidden by `const`), `let` here signals "this whole
  variable's meaning is expected to evolve," matching intent.

**`todos.push({ text: text, done: false })`**
- `{ text: text, done: false }` is an **object literal** — a single value
  bundling two related pieces of data (the task's text, and whether it's
  done) under one reference. Compare to Lesson 2, where `guess` was a lone
  number; here, one todo is a small structured record.
- `.push(...)` appends that object as the array's new last element, mutating
  `todos` in place (it does not return a new array — it modifies the existing
  one and returns the new length, which this code ignores).

**`input.value.trim()`**
- `.trim()` is a string method that removes leading/trailing whitespace.
  Without it, a user typing `"   "` (only spaces) would pass the emptiness
  check below and add a blank-looking todo.

**`if (text === "") return;`**
- A **guard clause**: check for an invalid case early, and `return`
  immediately to exit the function before doing anything else. `return` with
  no value inside a function that doesn't use its return value simply stops
  execution right there — nothing after it in `addTodo` runs for this call.
- **Why not wrap the rest of the function in `else` instead?** Functionally
  equivalent here, but a guard clause avoids nesting the "normal path" inside
  an `if` block, which becomes more valuable as functions grow.

**`function render() { ... }`**
- This is the answer to the Predict question: **every single change to
  `todos` — add, toggle, or delete — calls this one function, which throws
  away all existing `<li>` elements and rebuilds them from scratch based on
  the current array.**
- **Why is "wasteful-looking" actually the more reliable choice here?**
  Because it makes exactly one thing responsible for keeping the DOM correct:
  `render()`. There's no code path where `todos` and the visible list can
  drift out of sync, because the visible list is *never* edited directly —
  only ever fully regenerated from `todos`. Contrast this against manually
  inserting/removing individual `<li>`s in three different places (add,
  toggle, delete) — three separate chances to introduce a bug where the DOM
  and the array disagree.
- This "one array in memory, DOM regenerated to match it" pattern is
  precisely the mental model React formalizes and optimizes later in this
  series — you're doing by hand here exactly what a "virtual DOM" automates.

**`list.innerHTML = "";`**
- `.innerHTML` is a property representing the raw HTML markup inside an
  element. Setting it to an empty string deletes every child element
  currently inside `<ul id="todo-list">` — this is the "throw away" half of
  "clear and rebuild."

**`todos.forEach(function (todo, index) { ... })`**
- `.forEach` is an array method that calls the given function once per
  element, passing the element itself and its numeric index as the first two
  arguments. It does not build a new array (unlike `.map`) — it's used purely
  for its side effects here (building DOM elements).
- `todo` — the current object being processed (`{ text, done }`).
- `index` — its position in the array (`0`, `1`, `2`, ...). You'll use this
  to know *which* todo a click refers to later.

**`document.createElement("li")`**
- Unlike `getElementById` (Lesson 1), which *finds* an existing element,
  `createElement` *makes a new one* — in memory only. It is not yet part of
  the visible page until you attach it somewhere with `appendChild`.

**`li.dataset.index = index;`**
- `.dataset` is a property giving access to any `data-*` HTML attributes on
  an element. Setting `li.dataset.index = index` creates (under the hood) a
  `data-index="..."` attribute on the actual HTML element.
- **Why?** This is how information travels from your JS *into* the DOM and
  back out again later. When a click happens on this `<li>`, you'll read
  `event.target.dataset.index` to recover *which* todo was clicked — the DOM
  element is carrying its own array index as a label.
- **Note the type**: `dataset` values are always strings, same caveat as
  Lesson 2's `input.value` — this is why the click handler wraps the read in
  `Number(...)`.

**`li.classList.add("done")`**
- `.classList` is a property giving structured access to an element's CSS
  classes (add/remove/toggle/contains), rather than manipulating the raw
  `class` attribute string yourself. `.add("done")` appends the `done` class,
  which `style.css` (not shown, your job to write) can target for a
  strikethrough style.

**`li.appendChild(deleteBtn); list.appendChild(li);`**
- `.appendChild` inserts a node as the last child of the element it's called
  on. First the delete button is placed inside the `<li>`; then that whole
  `<li>` (button included) is placed inside the `<ul>`. Order matters here —
  `appendChild(deleteBtn)` must happen before `li` is itself attached, though
  in this case it would also work the other way since both operations mutate
  the same objects in memory regardless of what's "live" on the page yet.

**`list.addEventListener("click", function (event) { ... })`**
- This is **event delegation**: instead of attaching a click listener to
  every `<li>` and every delete button individually (which would mean
  re-attaching listeners every time `render()` rebuilds the list), exactly
  *one* listener sits on the parent `<ul>`.
- **Why does this work?** Browser events **bubble** — a click on a `<button>`
  nested inside an `<li>` nested inside a `<ul>` fires the click event on the
  button first, then "bubbles up," also firing (conceptually) on the `<li>`,
  then the `<ul>`, then further up the tree. A listener on `<ul>` catches
  clicks that originated on any descendant.
- `event` — the callback now takes a parameter, unlike Lessons 1–2. This
  object describes the specific event that occurred, most importantly...
- `event.target` — the *exact* element the click actually landed on (the
  button, or the `<li>` itself, or something else), regardless of which
  element the listener is attached to. This is what lets one listener
  distinguish "which specific thing did the user click."
- **What if you'd attached a listener per `<li>` instead?** It would work
  initially, but every call to `render()` destroys the old `<li>` elements
  (via `innerHTML = ""`) and creates brand new ones — any listeners attached
  directly to the old elements are destroyed along with them, and the new
  elements would need fresh listeners attached again inside the `forEach`.
  Delegation sidesteps this entirely: the `<ul>` itself is never destroyed,
  so its one listener survives every re-render for free.

**`event.target.classList.contains("delete-btn")`**
- `.contains(...)` checks whether a given class is present, returning a
  boolean. This is how the delegated listener figures out *what kind* of
  element was clicked — a delete button, vs. the `<li>` itself — since both
  route through the same single listener.

**`event.target.tagName === "LI"`**
- `.tagName` returns the element's tag name as an **uppercase** string
  (`"LI"`, not `"li"`) — a common surprise if you forget it and compare
  against lowercase.

### What happens

Typing a task and clicking Add: `addTodo` validates, mutates `todos`, clears
the input, calls `render()`. `render()` wipes the `<ul>` and rebuilds every
`<li>` from the current array — for one item, this looks identical to just
adding one `<li>`, but the mechanism is "rebuild everything," not "add one."

## 3. Why?

### Mental model

```
todos (array in memory)
   ↓ any mutation (push / splice / toggle done)
render() called
   ↓
list.innerHTML = ""   (destroy everything currently shown)
   ↓
todos.forEach(...)     (rebuild from current data, item by item)
   ↓
DOM now matches todos exactly, because it was regenerated from it
```

One listener, on the parent, distinguishes *what* was clicked using
`event.target` — rather than many listeners, one per child, that would need
constant re-attachment as children are destroyed and recreated.

## 4. Change one thing

```diff
 function render() {
   list.innerHTML = "";

   todos.forEach(function (todo, index) {
     const li = document.createElement("li");
     li.textContent = todo.text;
     li.dataset.index = index;
     if (todo.done) {
       li.classList.add("done");
     }
+    if (index === 0) {
+      li.classList.add("first-item");
+    }
```

**What changed:** the first todo in the list now gets an extra CSS class.
**What did not change:** `render()` is still called the same way, from the
same three places (`addTodo`, `toggleTodo`, `deleteTodo`) — the rebuild
mechanism itself didn't need to know anything new; you only changed *what
render does with the data it already receives*, not *when* it runs.

## 5. Put it in the project

This lesson's `render()` function — "wipe and rebuild the DOM from an
in-memory array" — is the single most important pattern in this entire
curriculum's vanilla-JS phase. Lesson 4's reaction timer, and every Phase B
game, reuse this exact idea: one source of truth in memory, one function that
makes the DOM match it, called after every mutation.

## 6. Trap

Predict, then test: add three todos, then delete the *first* one by clicking
its Delete button. Does the correct todo disappear?

Run it — it should work correctly, but here's the trap to actually watch for:
add three todos, delete the middle one, then try to toggle what is now the
*first remaining* todo, but click fast, before `render()` visually settles
(hard to trigger by hand, but reason through it): could `event.target.dataset.index`
ever refer to a todo that no longer exists, or the wrong one?

Look closely at `render()`: `li.dataset.index = index;` is set fresh from
the *current* `forEach` loop every single time `render()` runs — meaning
after any delete, every remaining item's `data-index` is recalculated to
match its *new* position in the array, not its old one. **The trap isn't a
bug here — it's the reason this pattern is safe**: because indices are
never cached anywhere except inside the render that just ran, there's no way
for a stale index to survive a re-render. If you ever refactor this app to
*not* fully rebuild on every change, you'd have to solve this problem
explicitly instead of getting it for free.

## 7. Exercise

Pick at least one:

- **Predict:** If `deleteTodo` used `todos[index] = null;` instead of
  `todos.splice(index, 1);`, what would happen to the *length* of the array,
  and what would `render()` do with the `null` entry? (Try it after
  predicting.)
- **Modify:** Add an "items remaining" counter below the list, showing how
  many todos have `done: false`. (Hint: `.filter()`.)
- **Break:** Remove the `event.target.tagName === "LI"` check (leave only
  the delete-button check) and click directly on a todo's text. What happens
  now, and why?
- **Trace:** Write out, step by step, everything that happens in memory and
  in the DOM between clicking "Delete" on the second todo and the list
  visually updating.

## What to remember
- State can be a collection (array of objects), not just a single value —
  and one function can be responsible for keeping the whole DOM in sync with
  it.
- "Clear and rebuild" trades a little raw efficiency for a strong guarantee:
  the DOM can never drift out of sync with your data, because it's never
  edited directly.
- Event delegation — one listener on a parent, reading `event.target` — beats
  many listeners on children that get destroyed and recreated on every
  render.
- `dataset` is how you attach your JS-side data (like an array index) onto
  an actual DOM element so a later event can read it back.

## Next lesson
Lesson 4 keeps this same render pattern but adds `setInterval`/`setTimeout` —
time-based state changes instead of purely click-triggered ones — and the
cleanup discipline (`clearInterval`) that prevents timers from silently
piling up, which becomes essential once Phase B's games run a continuous
game loop.
