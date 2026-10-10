---
title: 4.1 — Arrays, objects and immutable task data
track: Frontend Developer Bootcamp — A Task Planner That Remembers
trackOrder: 50.04
runtime: none
reference: optional
---

Outcome: model a collection before building its controls. An **array** is an ordered list; an **object** groups named properties. A task has a stable id, a title and a boolean done flag. Its array position can change, so position is not its identity.

## Transform data without changing the original

Before trying this step, make a prediction.

```predict
question: Does map itself change the original array?
choice: No
choice: Yes
answer: No
explain: map creates a new array, though a callback can still mutate objects if written incorrectly.
```

[] creates an array; {} creates an object. ... spreads existing entries or properties into a new value. map returns one result per element; filter keeps only matching elements. === compares without converting types. The callback parameter task is one element, not the whole list. An immutable update returns new data and leaves its input intact, which makes reasoning and undo easier.

```javascript file=planner/model.mjs
export function addTask(tasks, text, id) {
  const title = text.trim();
  if (!title) throw new Error('Write a task first');
  return [...tasks, { id, title, done: false }];
}
export function toggleTask(tasks, id) {
  return tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
}
export function visibleTasks(tasks, filter) {
  return tasks.filter(task => filter === 'all' || (filter === 'done' ? task.done : !task.done));
}
```

```check
run "node --check planner/model.mjs"
```

## Prove the previous list survives

Run the test with node planner/model.test.mjs. It compares the old and new state and exercises whitespace and filter behavior. If you want to inspect every task manually, for (const task of tasks) { console.log(task.title); } visits each value. Prefer map when producing a transformed array and a loop for side effects.

```javascript file=planner/model.test.mjs
import assert from 'node:assert/strict';
import { addTask, toggleTask, visibleTasks } from './model.mjs';
const original = [];
const tasks = addTask(original, '  Sketch a screen  ', 'a');
assert.equal(original.length, 0);
assert.equal(tasks[0].title, 'Sketch a screen');
assert.throws(() => addTask([], '   ', 'b'));
const changed = toggleTask(tasks, 'a');
assert.equal(tasks[0].done, false);
assert.equal(changed[0].done, true);
assert.equal(visibleTasks(changed, 'active').length, 0);
assert.equal(visibleTasks(changed, 'done').length, 1);
console.log('planner cases passed');
```

```check
run "node planner/model.test.mjs" stdout="planner cases passed"
```

## Your turn: remove by identity

Export removeTask(tasks, id), returning a new array without the task with that id. Keep unrelated tasks and preserve the original array. Use filter, not splice. Check deleting an unknown id and deleting from an empty list.

```check
run "node --input-type=module -e \"import {removeTask} from './planner/model.mjs'; const a=[{id:'a'},{id:'b'}]; if(removeTask(a,'a').length!==1 || removeTask(a,'a')[0].id!=='b' || a.length!==2 || removeTask([],'x').length!==0) process.exit(1); console.log('remove passed')\"" stdout="remove passed"
```

```hints
nudge: Describe which entries should remain.
concept: filter retains values when its callback returns true.
shape: Return tasks.filter with a strict inequality comparing ids.
```

## Diagnose, explain and review

Temporarily return task.done = !task.done from map. That both mutates the old task and returns a boolean where an object was expected. Run the tests, inspect the resulting array, and restore the object spread. Explain identity versus position using two tasks with the same title.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
