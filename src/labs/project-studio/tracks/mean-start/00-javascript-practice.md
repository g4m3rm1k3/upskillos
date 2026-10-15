---
title: JavaScript Practice — Get Ready to Build
track: MEAN — Requirements and Node
runtime: none
---

Outcome: transform an array of records without changing it, import a function from another file and explain a resolved or rejected Promise. You only need basic JavaScript variables, functions, objects and conditions. This lesson practices the syntax the project will use, before frameworks add more moving parts.

### The story so far

Start in an empty task-board folder in Project Studio Desktop. Install Node 22.22.3+ in the Node 22 line (Node 24 also works), and check `node --version`. Create server, practice and evidence folders. Run commands from task-board. Files ending in .mjs use JavaScript modules automatically; the next lesson enables modules for .js too.

Do one small section at a time. Read the code, predict its output, run it, then change an input. If a line is unclear, trace one concrete record through it. Finishing quickly is not the goal: being able to explain a change without the reference is.

## Read one object, then transform several

An object groups named values. An array holds an ordered sequence. The arrow function task => task.status === 'open' receives one task and returns a Boolean. filter keeps records where that function returns true. map converts each remaining record into a new value. Neither operation here changes the original records.

```predict
question: How many titles will be printed, and will the original array still contain the completed task?
explain: Two titles are printed. The original array still has all three records; filter and map create new arrays in this example.
```

```javascript file=server/array-practice.mjs
const tasks = [
  { title: 'Sketch the page', status: 'open' },
  { title: 'Install Node', status: 'done' },
  { title: 'Test a rule', status: 'open' }
];
const openTitles = tasks.filter(task => task.status === 'open').map(task => task.title);
console.log(openTitles.join(' | '));
console.log('Original records:', tasks.length);
```

```check
run "node server/array-practice.mjs" stdout="Original records: 3"
```

Compare filter with map: filter decides whether a record remains; map decides what value represents it. A callback can still mutate an object if you explicitly assign to it. Creating a new array does not automatically make its objects immutable.

## Give a function a clear boundary

export makes a function available to another module. Destructuring, as in { title }, reads a named property into a variable. It does not validate that property's type. The check still matters before calling trim(), which only works on strings.

```javascript file=server/title-practice.mjs
export function cleanTitle(task) {
  const { title } = task;
  if (typeof title !== 'string') throw new Error('Expected a text title');
  return title.trim();
}
```

Our small example assumes task itself is an object. The next lesson strengthens that boundary for null, arrays and missing fields. State your assumptions explicitly so a caller can tell which inputs are safe.

## Run code from another file

The relative import starts at this file's folder. ./title-practice.mjs means its sibling; the file extension is explicit. try runs work that may fail; catch receives a thrown error. A failure is a value you can explain and handle, rather than a reason to guess at edits.

```javascript file=server/module-practice.mjs
import { cleanTitle } from './title-practice.mjs';
console.log(cleanTitle({ title: '  Plan  ' }));
try {
  cleanTitle({ title: 42 });
} catch (error) {
  console.log('Rejected:', error.message);
}
```

```check
run "node server/module-practice.mjs" stdout="Rejected: Expected a text title"
```

## Practice waiting before using a result

An async function always returns a Promise: a result that may be available later or may fail. await obtains the fulfilled value inside an async function or at the top level of a module. A rejected Promise becomes an exception at await, so try/catch can handle it. finally runs for both success and failure; later we use it to close database connections.

This is a deliberately simulated load, not a database. Predict the order: loading, loaded, finished, loading, offline, finished. Removing await changes the value you hold from an array to a Promise.

```javascript file=server/async-practice.mjs
async function loadTasks(offline) {
  if (offline) throw new Error('offline');
  return [{ title: 'Plan', status: 'open' }];
}
for (const offline of [false, true]) {
  console.log('loading');
  try {
    const tasks = await loadTasks(offline);
    console.log('loaded:', tasks.length);
  } catch (error) {
    console.log(error.message);
  } finally {
    console.log('finished');
  }
}
```

```check
run "node server/async-practice.mjs" stdout="loaded: 1"
```

## Read the practice contract

Now implement a small function independently. Put it in practice/answer.mjs and export it as summarizeTasks. It receives an array of valid task records and returns {openCount, titles}: count the open tasks and list only their titles, trimmed, in their original order. Do not change the input records. Empty input should return zero and an empty array. Malformed records are outside this exercise's contract.

Create this checker first. It is a specification you can read, not the implementation. Running it before you create answer.mjs will report a missing module. After creating your answer, run `node practice/check.mjs` to get specific assertion failures.

```javascript file=practice/check.mjs
import assert from 'node:assert/strict';
import { summarizeTasks } from './answer.mjs';
assert.deepEqual(summarizeTasks([]), {openCount: 0, titles: []}, 'Empty input must stay empty');
const input = [
  {title:'  Draft  ',status:'open'},
  {title:'Ignore me',status:'done'},
  {title:' Review ',status:'open'}
];
const before = structuredClone(input);
assert.deepEqual(summarizeTasks(input), {openCount: 2, titles: ['Draft','Review']},
  'Count only open tasks, trim their titles and preserve their order');
assert.deepEqual(input, before, 'Do not mutate the caller\'s records');
assert.deepEqual(summarizeTasks([{title:'Finished',status:'done'}]), {openCount:0,titles:[]},
  'An all-completed list has no open tasks');
console.log('Practice passed: empty, mixed, completed and unchanged input');
```

## Your turn: summarize the board

Write summarizeTasks without a supplied implementation. Use loops or array methods; both are valid. Make the checker pass, then add your own case with two open tasks sharing the same title. Explain whether a summary should preserve both. Save the observed results and explanation in evidence/javascript.txt.

```hints
nudge: First select the records that belong in the answer.
concept: Filtering chooses records, mapping changes their representation, and length counts an array.
shape: Build a new array of trimmed titles from open records, then return that array and its length in an object.
```

```check
run "node practice/check.mjs" stdout="Practice passed"
file evidence/javascript.txt
```

## Diagnose, explain and review

Remove await in async-practice.mjs. Observe that tasks.length is undefined, because tasks now refers to a Promise. Restore await. Then deliberately include completed tasks in your answer and verify that the practice checker fails; repair it. The checks establish the listed cases only, not every JavaScript skill. The evidence file check records submission, not understanding.

Before continuing, explain filter versus map, import versus export, and a value versus a Promise. If one is still unclear, repeat its experiment with your own records. You will meet the same operations again in the API and Angular lessons.
