---
title: 4.2 — Render state, handle events and show empty states
track: Frontend Developer Bootcamp — A Task Planner That Remembers
trackOrder: 50.04
runtime: none
---

Outcome: make the task planner usable with no framework. State is the current data; rendering turns it into elements. Treat data as the source of truth. Replacing a list is simple but can remove focus, so deliberately restore it after an interaction.

### The story so far

The planner model can now add, toggle, filter and remove records without using the browser. This lesson gives that state a visible form. The difficult part is not drawing a button; it is keeping data, screen and focus consistent after every interaction.

The model is the source of truth. We will redraw from it rather than trying to infer saved data by reading labels back from the page.

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

### Design the empty screen as a first-class state

A blank list could mean “no tasks exist,” “the filter matched nothing,” “data is loading,” or “something broke.” People should not have to guess. The message should explain the state and suggest a useful next action.

For this local planner, there is no network loading phase. Do not add a spinner merely because modern apps often have one. Choose states from the actual behavior of your product.

```check
page planner/index.html "document.querySelector('#task').labels.length" "1" server=static
```

## Render from one state array

### Rendering is a projection

Think of a departure board at a station. The timetable data exists independently of which screen shows it. A screen projects selected information for travelers; scratching out a word on the display would not update the timetable system.

Our tasks array is the timetable. render is the process that projects it into elements. The analogy stops at implementation: this tiny app recreates list nodes, while larger rendering systems often update only the differences.

```text
submit → model returns new tasks → assign tasks → render → focus input
click task → model returns new tasks → assign tasks → render → restore sensible focus
change filter → same tasks → render a different projection
```

Notice that changing the filter does not delete tasks. Visible data and stored data are different things.

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

### Read one loop iteration

For each visible task, create an li and a button. Assign the task title as text, set its pressed state from done, attach a callback, append the button to the item, and append the item to the list. `document.createElement` creates a detached node; it becomes part of the page only when appended.

The listener closes over the task from that loop iteration. A **closure** is a function retaining access to variables from where it was created. Here it lets the button remember which stable task id to toggle. It does not mean the whole page freezes at that moment: the callback reads and updates the outer tasks variable when it runs.

`replaceChildren()` discards the old nodes. That keeps this teaching implementation simple but means a focused button may disappear. The next focus call is part of the interaction, not cosmetic polish. When filtering removes the button, a sensible existing control must receive focus instead.

**Rule of thumb:** after any UI change, ask three questions: What is the data now? What does the person see? Where is their focus? A solution that answers only the middle question can look correct and still be difficult to use.

Avoid adding event listeners repeatedly to a persistent element on every render. This implementation creates new task buttons each time and attaches one listener to each; the form listener is attached once outside render. That distinction prevents repeated submissions caused by accumulated handlers.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Add two tasks, filter to Active and complete one. Describe the data array, the visible list and the expected focused element after each action. Then explain why user text that looks like an HTML tag must remain text in a task title.
