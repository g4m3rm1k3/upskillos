---
title: 9.2 — Testing behavior at the right boundary
track: Frontend Developer Bootcamp — TypeScript, Testing and Accessibility
trackOrder: 50.09
runtime: none
---

Outcome: build a fast regression suite and distinguish unit, integration and browser tests. Unit tests isolate a rule; integration tests exercise collaborating parts; browser tests use real controls and rendering. None replaces observing a person trying the task. Favor behavior over tests that merely look for source text.

### The story so far

You already used assertions to develop the budget and planner and used fake responses to test the API. Now we will collect important contracts into a repeatable regression suite.

Regression means a previously working behavior becomes broken by a later change. The goal is not to maximize the number of assertions; it is to get fast, trustworthy evidence about behaviors people depend on.

## Collect meaningful regressions

### Tests are experiments with an oracle

A test arranges a situation, performs an action and compares the observation with an expected result. The expected result is its **oracle**. If you copy the implementation’s formula into the expected result, both can be wrong in the same way.

For remaining balance, compute a small example by hand. For stable identity, use two equal titles with different ids. For a failed request, create a known failure. Those cases each isolate a meaningful contract.

| Boundary | Example | What it does not establish |
|---|---|---|
| Pure function | remaining(10, 30) is -20 | Whether the form reads the right fields. |
| Module collaboration | Search client rejects a failed request | Whether the error is announced accessibly. |
| Browser workflow | Add, reload, remove and reload | Whether a novice understands the wording. |
| Usability observation | A person completes the task without help | Every possible data or network case. |

Think of these as different instruments, not a ladder where one makes all the others unnecessary.

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

### Read a failure as evidence

The test name identifies the contract. The assertion shows the mismatch. Start there before changing the implementation. A failure might reveal a real defect, an incorrect expected value, a changed requirement or a broken test setup. “Make it green” is not enough; explain which possibility the evidence supports.

Mutation experiments help evaluate a test: deliberately replace subtraction with addition, run the suite, and confirm that the intended test fails. Then restore the code. If the test stays green, it does not protect against that defect, whatever its name claims.

An empty test file may exit successfully. The lesson check therefore requires the expected test count rather than treating process exit alone as sufficient proof that test bodies ran.

**Rule of thumb:** choose a normal case, a boundary case and a plausible failure that exercise different decisions. Avoid tests tied to incidental whitespace, private helper names or exact implementation text unless that text itself is the contract.

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

### Reproducibility is part of test quality

A colleague should not need your personal shell history to run the checks. npm test names the suite; npm ci recreates the locked dependency resolution; typecheck and build check other boundaries. Record the Node version because tools can have runtime requirements.

Continuous integration runs the same commands on a fresh machine. It does not repair incomplete tests. A green CI badge proves only that its configured checks passed under its configured conditions.

Keep deterministic fixtures for API cases. A test that fails because a live book catalog changed wastes attention and encourages people to ignore failures. Reserve live connectivity checks for a clearly identified purpose and expectation.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Design a test that catches removing the wrong record when two titles are equal. Explain why it is stronger than checking only the list length. Then name one UI defect that all the pure-function tests could miss and describe the browser action needed to expose it.
