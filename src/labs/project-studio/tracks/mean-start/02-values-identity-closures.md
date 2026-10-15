---
title: Values, Identity and Closures — Explain the State You Change
runtime: none
---

Outcome: distinguish a new variable from a new object, update one nested record without changing the original, and explain how a closure keeps private state. Complete JavaScript Practice and Requirements first; use the same task-board folder and its package.json. This lesson needs no database or downloaded package.

### The story so far

You can filter tasks and validate titles. Now investigate a bug that passing a few happy-path examples can miss: changing one screen's data also changes another screen's data. Before reaching for a state library, understand which references point to the same object.

## Predict the identity of a copy

A primitive such as a number is copied as a value. An object variable holds a reference to an object. Assignment copies that reference. Object spread creates a new outer object but copies its property values, including references to nested objects. This is a shallow copy.

```predict
question: After copying a task with {...task}, will changing copy.details.priority also change task.details.priority?
explain: Yes. The outer objects differ, but both details properties still refer to the same nested object. Copy that changed branch too when an independent update is required.
```

```javascript file=server/identity-demo.mjs
import assert from 'node:assert/strict';
const task = { title: 'Plan', details: { priority: 'normal' } };
const alias = task;
const shallow = { ...task };
assert.equal(alias, task);
assert.notEqual(shallow, task);
assert.equal(shallow.details, task.details);
shallow.details.priority = 'high';
console.log('Original after shallow change:', task.details.priority);
const independent = { ...task, details: { ...task.details, priority: 'low' } };
assert.notEqual(independent.details, task.details);
assert.equal(task.details.priority, 'high');
assert.equal(independent.details.priority, 'low');
console.log('Independent priority:', independent.details.priority);
```

```check
run "node server/identity-demo.mjs" stdout="Independent priority: low"
```

Walk the references on paper: task and alias point at the same outer box; shallow points at another box; both outer boxes point at the original details box. independent has its own details box. A new array created by map can still contain the old objects. JSON serialization is not a universal cloning operation: it changes or loses values outside JSON's data model. Prefer deliberate updates to the changed branches when that is the intended operation.

## Write an update with an explicit contract

The operation below receives valid task records, a string id and a permitted priority. It returns a new array. The changed task and its details are new objects; untouched tasks keep their references. A missing id throws rather than pretending an update happened. This is an application policy, not a JavaScript requirement.

```javascript file=server/priority-rule.mjs
export function withPriority(tasks, id, priority) {
  if (!['low', 'normal', 'high'].includes(priority)) throw new Error('Invalid priority');
  if (!tasks.some(task => task.id === id)) throw new Error('Task not found');
  return tasks.map(task => task.id === id
    ? { ...task, details: { ...task.details, priority } }
    : task);
}
```

## Test values and references separately

deepEqual compares structure; equal compares object identity here. Both matter. Correct visible output can conceal mutation of data held elsewhere. Keeping an unchanged record's identity also makes it possible for a rendering system to recognize that record as unchanged. Do not claim a performance improvement without measuring the actual application.

```javascript file=test/priority-rule.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { withPriority } from '../server/priority-rule.mjs';
test('change only the selected branch without mutating input', () => {
  const input = [
    { id:'a', details:{priority:'normal', estimate:2} },
    { id:'b', details:{priority:'low', estimate:1} }
  ];
  const before = structuredClone(input);
  const result = withPriority(input, 'a', 'high');
  assert.deepEqual(input, before);
  assert.notEqual(result, input);
  assert.notEqual(result[0], input[0]);
  assert.notEqual(result[0].details, input[0].details);
  assert.equal(result[1], input[1]);
  assert.deepEqual(result[0].details, {priority:'high', estimate:2});
});
test('reject an unknown id and an invalid priority', () => {
  assert.throws(() => withPriority([], 'missing', 'high'), /not found/);
  assert.throws(() => withPriority([{id:'a'}], 'a', 'urgent'), /Invalid priority/);
});
```

```check
run "node --test test/priority-rule.test.js"
```

## Observe a closure

Lexical scope means a function resolves variables from where it was defined. A closure retains access to those variables after the outer function returns. Each call to makeCounter creates a different count binding. const prevents rebinding the variable holding the returned function; it does not make that function's captured state constant.

```javascript file=server/closure-demo.mjs
import assert from 'node:assert/strict';
function makeCounter(start) {
  let count = start;
  return () => ++count;
}
const first = makeCounter(0);
const second = makeCounter(10);
assert.equal(first(), 1);
assert.equal(first(), 2);
assert.equal(second(), 11);
console.log('Separate closures: 2 and 11');
```

```check
run "node server/closure-demo.mjs" stdout="Separate closures: 2 and 11"
```

## Your turn: revisioned updates

In a separate practice module, build an update that receives a task, expected revision and new title. Reject a stale revision. Return a new task with a trimmed title and incremented revision; keep the original unchanged. Define what happens for a blank title, a string revision and a missing title. Write tests for each choice and for two updates based on the same original revision.

This in-memory exercise models a rule; it does not create a database concurrency guarantee. Explain why two processes can still race unless the storage operation checks the revision atomically. Save results, reasoning and your new tests in evidence/identity.txt. The file check is a submission gate only.

```hints
nudge: Check the expected revision before calculating a replacement object.
concept: Value validation and object identity are separate parts of the contract.
shape: Validate, compare revisions, return a spread with explicitly replaced fields, then assert the original still equals a saved snapshot.
```

```check
file evidence/identity.txt
```

## Diagnose, explain and review

Replace the changed branch in withPriority with an assignment to task.details.priority. The visible priority may look correct, but the unchanged-input test must fail. Restore the immutable version. Move count outside makeCounter and explain why the instances would now share state; restore the local binding.

Checks establish the stated update and closure examples, not mastery of prototypes, this or all cloning semantics. These remain required later language topics. Without the reference, draw the identity graph and explain exactly which references a safe update should replace.
