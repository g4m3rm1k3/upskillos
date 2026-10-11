---
title: 4.1 — Arrays, objects and immutable task data
track: Frontend Developer Bootcamp — A Task Planner That Remembers
trackOrder: 50.04
runtime: none
---

Outcome: model a collection before building its controls. An **array** is an ordered list; an **object** groups named properties. A task has a stable id, a title and a boolean done flag. Its array position can change, so position is not its identity.

### The story so far

The budget app operated on individual numbers. A planner needs a collection of records. Each record describes a task; the list determines which tasks exist. We will build the data transformations before attaching any DOM events.

You already know functions and validation. New syntax includes array literals, object properties, arrow callbacks and spread. Do not rush past those brackets: they describe the shape of the data that later UI code will assume.

## Transform data without changing the original

### Read the data before the algorithm

```javascript
const tasks = [
  { id: 'a', title: 'Read', done: false },
  { id: 'b', title: 'Sketch', done: true }
];
```

The outer square brackets hold an ordered array. Each pair of braces holds one object. `tasks[0]` is the first object, because array positions start at zero. `tasks[0].title` is the string Read. `tasks.length` is 2. The id is data inside the object; it is not the array position.

A useful analogy is a stack of index cards. Each card has an identity written on it, while its position in the stack can change. Sorting the stack should not turn the Sketch card into the Read card. The analogy has a limit: JavaScript objects are references, so two arrays can still point to the same card object unless you copy what you change.

### Three operations, three questions

| Operation | Question it answers | Output |
|---|---|---|
| map | What should each entry become? | An array with one result per input. |
| filter | Which entries should remain? | An array with zero or more of the existing entries. |
| some | Does at least one entry match? | A boolean. |

Read the method name before the callback. If you need a filtered list but return true/false from map, you will get a list of booleans instead.

Before trying this step, make a prediction.

```predict
question: Start with task a done=false. After toggleTask(tasks, a), what is the original task done value?
choice: false
choice: true
choice: undefined
answer: false
explain: The changed object belongs to the new returned array. The original object remains false.
verify: node --input-type=module -e "import { toggleTask } from './planner/model.mjs'; const tasks=[{id:'a',done:false}]; toggleTask(tasks,'a'); console.log(tasks[0].done);"
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

### Trace toggle by stable id

Start with a=false and b=true, and call toggleTask(tasks, 'a'). For a, `task.id === id` is true, so `{ ...task, done: !task.done }` copies its fields and replaces done with true. For b, the condition is false, so it returns the existing b object. The resulting array contains a new a and the unchanged b. The original array still describes a=false, b=true.

Property order in an object spread matters: `{ ...task, done: true }` replaces the copied done value; `{ done: true, ...task }` can replace your new value with the old copied one. Later properties win.

The spread is **shallow**. If task had a nested object such as metadata, spreading task would still share that nested object. Copy each changed level when immutable updates reach nested data; do not assume spread is a deep clone.

**Rule of thumb:** use stable ids for identity and array positions only for position. Two tasks may have the same title. A rename should not create a different task, and a filter should not change which one a Remove action refers to.

Immutable transformations are not a moral rule against every mutation. They are a useful contract at state boundaries: the previous snapshot stays available for comparison, tests and later UI rendering. Inside a local throwaway calculation, a carefully contained mutation may be simpler.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Trace toggleTask on a missing id and explain why it leaves every task’s data unchanged. Then describe the difference between `[...tasks]` and `tasks.map(task => ({ ...task }))`. Neither description should claim that nested objects were deep-copied.
