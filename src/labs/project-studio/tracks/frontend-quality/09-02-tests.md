---
title: 9.2 — Testing behavior at the right boundary
track: Frontend Developer Bootcamp — TypeScript, Testing and Accessibility
trackOrder: 50.09
runtime: none
reference: optional
---

Outcome: build a fast regression suite and distinguish unit, integration and browser tests. Unit tests isolate a rule; integration tests exercise collaborating parts; browser tests use real controls and rendering. None replaces observing a person trying the task. Favor behavior over tests that merely look for source text.

## Collect meaningful regressions

Before trying this step, make a prediction.

```predict
question: Does a unit test of subtraction prove the submit button works?
choice: No
choice: Yes
answer: No
explain: The button, event handler and rendered result need integration or browser coverage.
```

Node’s built-in test runner names cases and reports failures. These cases protect a visible deficit, stable task identity and network rejection. Run node --test quality/contracts.test.mjs. A good test should fail for a plausible defect; it should not depend on a live service or the current date.

```javascript file=quality/contracts.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { remaining } from '../budget/model.mjs';
import { addTask, removeTask } from '../planner/model.mjs';
import { searchBooks } from '../books/api.mjs';
test('deficits remain visible', () => assert.equal(remaining(10, 30), -20));
test('deleting one id keeps a duplicate title', () => {
  const first = addTask([], 'Read', 'a');
  const both = addTask(first, 'Read', 'b');
  assert.equal(removeTask(both, 'a')[0].id, 'b');
  assert.equal(both.length, 2);
});
test('network failure is a rejected request', async () => {
  await assert.rejects(searchBooks('Design', async () => { throw new Error('Offline'); }), /Offline/);
});
```

```check
run "node --test quality/contracts.test.mjs" stdout="tests 3"
```

## Give the suite one command

Add a test script without removing dev, build, preview or typecheck. Run npm test from the portfolio root. In continuous integration run npm ci (using the committed lock), npm test, npm run typecheck and npm run build. Choose a supported Node version in CI matching development.

```json file=package.json
{
  "name": "frontend-portfolio",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1",
    "typecheck": "tsc --noEmit",
    "test": "node --test quality/contracts.test.mjs"
  },
  "devDependencies": {
    "vite": "8.3.4",
    "tailwindcss": "4.3.3",
    "@tailwindcss/vite": "4.3.3",
    "typescript": "7.0.2"
  },
  "dependencies": {
    "bootstrap": "5.3.8",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  }
}
```

```check
run "npm test"
```

## Your turn: protect whitespace validation

Add a named test asserting addTask([], "   ", "blank") throws. Choose a descriptive name such as blank tasks are rejected. Then temporarily remove trim() in the implementation, confirm the test catches the defect, and restore it.

```check
contains quality/contracts.test.mjs "'blank tasks are rejected'"
run "npm test"
```

```hints
nudge: Use the public function rather than inspecting its source.
concept: A whitespace-only value is different from an empty literal string.
shape: Pass three spaces and assert that the operation throws.
```

## Diagnose, explain and review

Change remaining to addition and run npm test: the named deficit test should fail. Restore it. Design a browser scenario: enter a title, click Add, reload, remove, reload. Describe what it covers that unit tests cannot, and test it manually. Prefer queries by accessible role and name when automating UI; avoid fragile CSS layout selectors.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
