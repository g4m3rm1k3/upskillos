---
title: 4.3 — Persist safely and recover from bad saved data
track: Frontend Developer Bootcamp — A Task Planner That Remembers
trackOrder: 50.04
runtime: none
---

Outcome: restore the planner after reload without crashing on corrupt storage. JSON converts simple data to a string and back. Parsed data is untrusted: old versions, extensions or users can change it. Validate shape and unique ids at the boundary.

### The story so far

The planner currently forgets its array when the page reloads because in-memory state belongs to that page execution. Persistence adds a second representation: a stored string that can initialize the next execution.

The earlier theme lesson saved one known word. A task list is more complex, so parsing and validation become explicit. We also separate storage operations from the browser global so tests can supply controlled failures.

## Isolate storage behind functions

### A saved file is a message from the past

Think of storage as a note left by an earlier version of your app. It may be correct, outdated, incomplete or unreadable. Read it politely, but do not assume it has today’s expected shape.

JSON.stringify converts supported data into JSON text. JSON.parse converts valid JSON text back into JavaScript values. Neither operation checks your application’s rules. The text `"hello"` is valid JSON, but it is not an array of tasks.

| Boundary | Question |
|---|---|
| Read | Can storage be accessed at all? |
| Parse | Is the saved string valid JSON? |
| Validate container | Is the result an array? |
| Validate entries | Does each task have string id/title and boolean done? |
| Validate identity | Are ids unique? |

A failure at any boundary takes the documented recovery path. The order turns a vague “storage is broken” problem into smaller questions.

Before trying this step, make a prediction.

```predict
question: What does loadTasks return when getItem returns the valid JSON string null?
choice: An empty array
choice: null
choice: An uncaught parsing error
answer: An empty array
explain: JSON parsing succeeds, but null fails the array-shape check. Recovery returns [].
verify: node --input-type=module -e "import { loadTasks } from './planner/storage.mjs'; console.log(Array.isArray(loadTasks({getItem:()=>'null'})) ? 'An empty array' : 'Wrong shape');"
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

### Why pass storage as a parameter?

The real browser supplies an object with getItem and setItem methods. A test can supply another object with those same methods. This is a small interface: the functions care about the operations they need, not the object’s origin.

For example, `{ getItem: () => '{broken' }` always returns invalid JSON. It reproduces the same failure every time without destroying a real saved list. A fake whose setItem throws can reproduce a quota or access failure even if your own browser currently has plenty of space.

The expression `getItem(KEY) ?? '[]'` uses the default only for null or undefined. It does not replace every false-looking value. An empty saved string remains an empty string, fails JSON parsing and follows recovery.

`new Set(tasks.map(task => task.id)).size` counts unique ids. If it differs from tasks.length, at least two entries share an identity. Accepting that state could make one button affect multiple tasks.

**Rule of thumb:** make failed persistence visible when losing the work would surprise the person. A silent catch is acceptable only when there is truly no meaningful consequence to explain. Here changes may vanish after reload, so the UI must say so.

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

### Recovery has a product cost

This teaching version falls back to an empty list and writes its current state during render. That keeps the app usable, but it can replace corrupt stored data. A production tool holding valuable work should consider preserving the original bytes, offering export/recovery and migrating known older formats before resetting anything.

The key includes v1 to identify this format. A new key or schema version alone is not a migration strategy; you still need to decide whether to transform old data, keep it available or explain an incompatibility.

Do not call localStorage.clear() to repair one app. Storage is scoped to an origin, not a folder, so several portfolio apps can share it. Remove or repair only your own namespaced key.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Describe what happens when the stored value is valid JSON but not an array, and when setItem throws after a task was added. Which case changes initial state, and which requires a warning about future reload? Then propose a safer recovery policy for a production note-taking app with valuable user data.
