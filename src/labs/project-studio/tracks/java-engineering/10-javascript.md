---
title: JavaScript — events, state and rendering
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

JavaScript executes in the browser alongside the DOM. Java and JavaScript are different languages. Transfer the ideas of state, functions and contracts; do not assume their type systems or equality rules are identical.

## Read an event and update state

`const` prevents rebinding a variable but does not freeze an array. DOM queries return references to elements. An event listener runs when the browser dispatches a submit event; preventDefault stops the default page navigation. The arrow function captures references from its surrounding scope.

The object literal creates a task; push mutates the array. This prototype keeps browser state only. A random id supplies a stable identity for each task. We use textContent for user text rather than interpreting it as HTML. The render function is a declaration added next; functions declared this way are available when the later event occurs.

Type this fragment yourself. Start an empty file at `web/board.js`:

```javascript edit=web/board.js mode=replace
const form = document.querySelector('#new-task');
const input = document.querySelector('#title');
const list = document.querySelector('#tasks');
const message = document.querySelector('#message');
const tasks = [];
form.addEventListener('submit', event => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  tasks.push({ id: crypto.randomUUID(), title });
  render();
  form.reset();
  input.focus();
  message.textContent = 'Task added locally. Reloading clears this prototype.';
});
```

## Render data without interpreting it as markup

A for-of loop visits values, unlike an index loop that visits positions. replaceChildren removes the previous rendering; each new li receives literal text. Enter `<img src=x onerror=alert(1)>` as a title: it should display as text, not execute. That observation connects a coding choice to a security property.

Reload the page and observe the lost tasks. Persistence is a requirement, not something the DOM supplies. Explain which state lives in memory and which came from a file. A breakpoint in render lets you inspect tasks and the DOM separately.

Type this fragment yourself. Append to `web/board.js`:

```javascript edit=web/board.js mode=append
function render() {
  list.replaceChildren();
  for (const task of tasks) {
    const item = document.createElement('li');
    item.textContent = task.title;
    list.append(item);
  }
}
```

```check
file web/board.js
```

## Challenge — Filter without mutating the source

Write `challenges/filter.mjs` for Node. Treat command-line arguments after the script path as task titles; print how many contain `fix`, case-insensitively. Use filter or a loop and explain whether your implementation changes the input array. Empty input prints 0.

JavaScript's `process.argv.slice(2)` gives those arguments. A mismatch on uppercase titles suggests normalization is missing; a mismatch on empty input suggests your initial count is wrong.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.

```check
run "node challenges/filter.mjs Fix Review bugfix" stdout="2"
run "node challenges/filter.mjs" stdout="0"
```
