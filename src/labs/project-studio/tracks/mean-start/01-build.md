---
title: Requirements and a First Node Program
track: MEAN — Requirements and Node
runtime: none
---

Outcome: trace a task from user input to stored data and reject an invalid title without a framework. Prerequisites: basic JavaScript and HTML, plus the preceding JavaScript Practice lesson. Modules and async/await were introduced there and will be practiced throughout the series. Use Project Studio Desktop for real files and terminal checks; browser readers can read along but cannot execute Node or MongoDB here.

MEAN means MongoDB (storage), Express (HTTP routing), Angular (browser interface) and Node.js (server runtime). We will build Task Board, a local single-operator app with one project and tasks that can be open or done. This is a bridge from basic JavaScript, not a first programming course.

### The story so far

Continue in the task-board folder from JavaScript Practice. No files from another series are needed. Every chapter uses this same folder. Verify `node --version` and `npm --version`, then create the test subfolder alongside server. Commands run at the project root unless stated otherwise.

## Define the smallest useful rule

Before adding frameworks, decide what a valid title means. A pure function has no network or database effects. Trimming converts " Plan " to "Plan". Returning a new object prevents a caller from choosing stored fields such as version.

```javascript file=server/rules.js
export function taskInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a task object');
  }
  if (typeof value.title !== 'string') throw new Error('Title must be text');
  const title = value.title.trim();
  if (title.length < 1 || title.length > 100) throw new Error('Title must have 1–100 characters');
  return { title };
}
```

## Give Node a package boundary

A package.json describes dependencies and commands. type: module enables import/export in .js files. npm install creates package-lock.json: keep it to record resolved versions. Some commands below refer to files built in later chapters; run only the command requested at each step.

```json file=package.json
{
  "name": "mean-task-board",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server/main.js",
    "test": "node --test test/*.test.js",
    "db:setup": "node server/setup.js",
    "db:inspect": "node server/inspect.js"
  },
  "dependencies": { "express": "^5.1.0", "mongodb": "^6.20.0" }
}
```

## Predict and test the boundary

```predict
question: Does {title: " Plan ", version: 999} preserve version?
explain: No. The rule returns only the trimmed title; the server will own version.
```

Node includes a test runner. assert.throws receives a function that should fail, rather than calling it before the assertion. Run `node --test test/rules.test.js`; no download is needed yet.

```javascript file=test/rules.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { taskInput } from '../server/rules.js';
test('trim titles and discard client metadata', () => {
  assert.deepEqual(taskInput({ title: ' Plan ', version: 999 }), { title: 'Plan' });
});
test('reject malformed and oversized titles', () => {
  for (const value of [null, [], {}, {title:''}, {title:'   '}, {title:3}, {title:'x'.repeat(101)}]) {
    assert.throws(() => taskInput(value));
  }
});
```

```check
run "node --test test/rules.test.js"
```

## Protect local state

Run `npm install`. node_modules is downloaded code; .env holds local configuration. Keep both out of source control. Angular will get its own package and lockfile in chapter 5.

```text file=.gitignore
node_modules/
client/dist/
.angular/
.env
.mongo-data/
```

## Your turn: requirements

Write acceptance examples for creating a trimmed title, rejecting a blank title and retaining a task after a server restart. Draw browser → HTTP API → database. Name a failure at each boundary. Add a test for exactly 100 characters and explain why 101 is a different case.

Record your input, observed result, explanation and new test in evidence/requirements.txt. This file check is a submission gate only; it cannot judge the reasoning. Keep independent experiments in separate files until the guided path is complete.

```hints
nudge: Start at the first place untrusted input enters the app.
concept: A boundary value distinguishes an inclusive limit from an off-by-one error.
shape: Assert that 100 characters survive and that 101 throw; explain the comparison that separates them.
```

```check
file evidence/requirements.txt
```

## Diagnose, explain and review

Temporarily remove trim() and rerun the tests: the padded title test should fail. Restore it. A green result establishes these examples, not persistence or usability. Explain why Angular validation alone cannot enforce a rule for other API clients.
