---
title: 4.2 — Render state, handle events and show empty states
track: Frontend Developer Bootcamp — A Task Planner That Remembers
trackOrder: 50.04
runtime: none
reference: optional
---

Outcome: make the task planner usable with no framework. State is the current data; rendering turns it into elements. Treat data as the source of truth. Replacing a list is simple but can remove focus, so deliberately restore it after an interaction.

## Describe the controls

Before trying this step, make a prediction.

```predict
question: Can replacing a focused DOM button remove keyboard focus from that control?
choice: Yes
choice: No
answer: Yes
explain: The old node no longer exists; the interface must choose a sensible focus destination.
```

The form collects one task; the select filters visible state. Empty-state text explains the next action. Design empty, populated, invalid and filtered-empty views before polishing shadows.

```html file=planner/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Focus Planner</title>
  <link rel="stylesheet" href="../cafe/styles.css">
</head>
<body>
  <main>
    <h1>Focus Planner</h1>
    <form id="add"><label for="task">Next task</label> <input id="task" name="task" required maxlength="120"><button>Add task</button></form>
    <label for="filter">Show</label>
    <select id="filter"><option value="all">All</option><option value="active">Active</option><option value="done">Done</option></select>
    <p id="message" role="status">No tasks yet. Add one small next step.</p>
    <ul id="tasks"></ul>
  </main>
  <script type="module" src="app.js"></script>
</body>
</html>
```

```check
page planner/index.html "document.querySelector('#task').labels.length" "1" server=static
```

## Render from one state array

createElement and textContent keep user input as text. append attaches nodes; replaceChildren clears the old list. crypto.randomUUID generates stable ids. Optional chaining ?. calls focus only if the element exists. Because filtered items can disappear, the next exercise supplies a fallback. Test adding two tasks, toggling one, and switching every filter.

```javascript file=planner/app.js
import { addTask, toggleTask, removeTask, visibleTasks } from './model.mjs';
let tasks = [];
const form = document.querySelector('#add');
const list = document.querySelector('#tasks');
const filter = document.querySelector('#filter');
const message = document.querySelector('#message');
function render() {
  list.replaceChildren();
  const visible = visibleTasks(tasks, filter.value);
  message.textContent = visible.length ? `${visible.length} tasks shown` : 'No matching tasks. Add one or change the filter.';
  for (const task of visible) {
    const item = document.createElement('li');
    const toggle = document.createElement('button');
    toggle.textContent = task.title;
    toggle.setAttribute('aria-pressed', String(task.done));
    toggle.addEventListener('click', () => {
      tasks = toggleTask(tasks, task.id);
      render();
      document.querySelector(`[data-id="${task.id}"]`)?.focus();
    });
    toggle.dataset.id = task.id;
    item.append(toggle);
    list.append(item);
  }
}
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    tasks = addTask(tasks, form.elements.task.value, crypto.randomUUID());
    render();
    form.reset();
    form.elements.task.focus();
  } catch (error) { message.textContent = error.message; }
});
filter.addEventListener('change', render);
render();
```

```check
page planner/index.html "(() => { const f=document.querySelector('#add'); f.elements.task.value='Read'; f.requestSubmit(); return document.querySelectorAll('#tasks li').length; })()" "1" server=static
```

## Your turn: keep focus when a task disappears

When toggling in the Active filter hides the just-completed item, move focus to the filter select; otherwise keep focus on the matching task button. Replace the optional focus call with a fallback using ?? (use the right value only when the left is null or undefined).

```check
page planner/index.html "(() => { const f=document.querySelector('#add'); f.elements.task.value='Read'; f.requestSubmit(); const select=document.querySelector('#filter'); select.value='active'; select.dispatchEvent(new Event('change')); document.querySelector('#tasks button').click(); return document.activeElement === select && document.querySelectorAll('#tasks li').length === 0; })()" "true" server=static
```

```hints
nudge: The old button no longer exists after rendering.
concept: querySelector returns null when no element matches; ?? supplies a fallback.
shape: Choose the matching task button or filter, then call focus once.
```

## Diagnose, explain and review

Add a task named `<img src=x onerror=alert(1)>`. It must appear literally as text and must not execute. Temporarily misspell #tasks in the selector to see a null-related exception in DevTools; restore it. Tab through after filtering: a visually correct list can still strand keyboard users.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
