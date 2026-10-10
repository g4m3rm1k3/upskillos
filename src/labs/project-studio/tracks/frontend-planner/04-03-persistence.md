---
title: 4.3 — Persist safely and recover from bad saved data
track: Frontend Developer Bootcamp — A Task Planner That Remembers
trackOrder: 50.04
runtime: none
reference: optional
---

Outcome: restore the planner after reload without crashing on corrupt storage. JSON converts simple data to a string and back. Parsed data is untrusted: old versions, extensions or users can change it. Validate shape and unique ids at the boundary.

## Isolate storage behind functions

Before trying this step, make a prediction.

```predict
question: Can valid JSON still have the wrong task shape?
choice: Yes
choice: No
answer: Yes
explain: Parsing establishes JSON syntax, not required properties or unique identifiers.
```

Pass a storage object into functions instead of reading a global directly. Tests can then pass a small fake object. Array.every verifies all elements; Set retains unique values. Catch both invalid JSON and unavailable storage. Failed saving returns false rather than pretending data is durable.

```javascript file=planner/storage.mjs
const KEY = 'focus-planner-v1';
export function loadTasks(storage) {
  try {
    const tasks = JSON.parse(storage.getItem(KEY) ?? '[]');
    if (!Array.isArray(tasks) || !tasks.every(task => task && typeof task.id === 'string' && typeof task.title === 'string' && typeof task.done === 'boolean')) return [];
    if (new Set(tasks.map(task => task.id)).size !== tasks.length) return [];
    return tasks;
  } catch { return []; }
}
export function saveTasks(storage, tasks) {
  try { storage.setItem(KEY, JSON.stringify(tasks)); return true; }
  catch { return false; }
}
```

```check
run "node --check planner/storage.mjs"
```

## Restore and save with visible failure

Read storage once before the initial render and save each new state. Accessing window.localStorage itself can throw, so even that access has a guard. The visible message distinguishes saved data from temporary data. This educational app writes on render; a larger app should write only when data changes.

```javascript file=planner/app.js
import { addTask, toggleTask, removeTask, visibleTasks } from './model.mjs';
import { loadTasks, saveTasks } from './storage.mjs';
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let tasks = loadTasks(storage);
const form = document.querySelector('#add');
const list = document.querySelector('#tasks');
const filter = document.querySelector('#filter');
const message = document.querySelector('#message');
function render() {
  const saved = saveTasks(storage, tasks);
  list.replaceChildren();
  const visible = visibleTasks(tasks, filter.value);
  message.textContent = visible.length ? `${visible.length} tasks shown` : 'No matching tasks. Add one or change the filter.';
  if (!saved) message.textContent += ' Changes will be lost after reload: storage unavailable.';
  for (const task of visible) {
    const item = document.createElement('li');
    const toggle = document.createElement('button');
    toggle.textContent = task.title;
    toggle.setAttribute('aria-pressed', String(task.done));
    toggle.addEventListener('click', () => {
      tasks = toggleTask(tasks, task.id);
      render();
      (document.querySelector(`[data-id="${task.id}"]`) ?? filter).focus();
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
page planner/index.html "(() => { const f=document.querySelector('#add'); f.elements.task.value='Persist me'; f.requestSubmit(); return JSON.parse(localStorage.getItem('focus-planner-v1'))[0].title; })()" "Persist me" server=static
```

## Your turn: test corrupted storage without deleting real work

Create planner/storage.test.mjs using node:assert/strict. Pass loadTasks a fake object whose getItem returns broken JSON and expect []; pass saveTasks a fake setItem that throws and expect false. Run the file. Do not clear all localStorage: other projects may share this origin.

```check
run "node planner/storage.test.mjs" stdout="storage recovery passed"
```

```hints
nudge: A fake object only needs the methods the function calls.
concept: getItem returns a string; setItem may throw.
shape: Use deepEqual for arrays and equal for the boolean failure result.
```

## Diagnose, explain and review

Add a task, reload the same URL and verify it returns. In DevTools edit only focus-planner-v1 to malformed JSON and reload; expect a usable empty app. Restore a task afterwards. Discuss privacy: local storage is readable by scripts on this origin and is not encrypted account storage. Do not store passwords or session tokens here.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
