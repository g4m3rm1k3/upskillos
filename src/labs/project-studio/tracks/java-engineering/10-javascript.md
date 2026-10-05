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

### Separate setup time from event time

`document` is the browser's DOM document object. `querySelector('#title')` asks for the first element matching the CSS id selector #title. The returned value is a reference to that element, or null if none matches. A spelling mismatch therefore becomes an error when code later tries to read its value or call a method. Match the HTML ids before changing event logic.

`const` creates a binding that cannot be reassigned. `const tasks = []` binds an empty array; JavaScript arrays can grow and hold values dynamically. `tasks.push(...)` changes that array's contents without rebinding tasks. JavaScript does not require our Java-style `List<Task>` declaration here.

`addEventListener('submit', event => { ... })` registers a callback. It does not immediately run the body. The browser calls it when this form receives a submit event, passing an event object. `event.preventDefault()` cancels the default navigation; it does not stop the remaining callback statements. The callback can access form, input and tasks declared outside it because functions retain access to their surrounding lexical scope. This retained access is called a **closure**.

`input.value` reads the current text. `trim()` returns text with surrounding whitespace removed. `if (!title) return;` uses JavaScript truthiness: an empty string is false-like, so negating it gives true and returns from the callback. Nonempty strings are true-like. This differs from Java, whose if requires a boolean expression rather than implicit string truthiness.

`{ id: crypto.randomUUID(), title }` is an object literal. The colon separates property name id from its computed value. The shorthand `title` means a property named title with the current variable's value. Braces here create an object; the callback's braces enclose statements. Context changes their grammatical role.

### Trace one submission

After loading, tasks is empty and the callback is waiting. Type `  Plan  ` and submit. The event arrives, navigation is cancelled, title becomes `Plan`, a new object is pushed, and render is called. Reset clears the form only after rendering; focus returns to the input; the status paragraph gets an explanation of local-only storage. A second submission adds another object to the same array.

**Predict:** would moving `const tasks = []` inside the callback preserve the first task on the second submission? No. Each callback would construct a fresh empty array. State lifetime follows where and when construction happens, not the variable's spelling.

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

### Trace the data-to-DOM transformation

A function declaration gives render a callable body. No arguments are declared, because this small prototype reads the captured tasks and list references. `replaceChildren()` with no arguments removes the list element's existing children. It does not empty the tasks array; data and displayed nodes are different objects.

`for (const task of tasks)` takes one array value per iteration. `createElement('li')` constructs a detached list-item element, not yet visible in the document. Setting its textContent creates literal text content. `append(item)` attaches the element to our existing list so the browser can display it.

With tasks [Plan, Review], rendering goes: clear old child nodes; create a Plan node and attach it; create a Review node and attach it. After another render there should still be two list items. **Predict the bug if you remove replaceChildren:** each render appends duplicates to the old DOM even though the data array has not duplicated. Restore that line after observing the distinction.

Using textContent means a title containing `<strong>Plan</strong>` displays those characters. Assigning that same value to innerHTML would ask the browser to parse markup, changing structure and creating an injection boundary. Render user content as text unless you have a deliberate, reviewed rich-text policy.

Reload constructs a new document, executes the script again, and creates a new empty array. The browser is not automatically saving that array to a database. A screenshot cannot tell you where state lives; the reload experiment can.

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

### Read Node input without assuming browser globals

Node runs JavaScript outside the browser, so there is no document or form here. `process.argv` is an array of command-line strings. Its first two entries identify Node and the script; `slice(2)` returns a new array starting with the first user argument. It does not remove those entries from the original array.

For case-insensitive matching, `someText.toLowerCase()` returns a lowercased string. `someText.includes('fix')` returns true if that substring occurs, so `bugfix` matches too. Neither method changes the source string. A loop can count matching values by starting at zero and adding one for each match.

Alternatively, `titles.filter(title => condition)` calls the predicate for each title and returns a new array containing only values for which it returned true. A **predicate** is a function answering a yes/no question. Filter does not mutate the original array. Reading the resulting array's `.length` gives its count. Select a method, then explain what it allocates and what it preserves.

Write `challenges/filter.mjs` for Node. Treat command-line arguments after the script path as task titles; print how many contain `fix`, case-insensitively. Use filter or a loop and explain whether your implementation changes the input array. Empty input prints 0.

JavaScript's `process.argv.slice(2)` gives those arguments. A mismatch on uppercase titles suggests normalization is missing; a mismatch on empty input suggests your initial count is wrong.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.

```check
run "node challenges/filter.mjs Fix Review bugfix" stdout="2"
run "node challenges/filter.mjs" stdout="0"
```
