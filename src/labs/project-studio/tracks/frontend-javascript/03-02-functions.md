---
title: 3.2 — Functions, validation and your first tests
track: Frontend Developer Bootcamp — JavaScript and a Budget Calculator
trackOrder: 50.03
runtime: none
reference: optional
---

Outcome: separate a calculation from its screen and test normal, boundary and invalid input. A function takes named parameters and returns a value. export makes it available to other modules; import names what you want to use. Throwing an Error signals that this input cannot produce a valid result.

## Keep the rule independent of the browser

Before trying this step, make a prediction.

```predict
question: Should spending more than income produce a negative remaining balance?
choice: Yes
choice: No
answer: Yes
explain: A deficit is valid data; rejecting negative inputs is a different rule.
```

The braces delimit the function body. if runs a block only when its condition is true. || means either condition is true; ! negates a boolean. Number.isFinite rejects NaN (not a number) and infinity. Negative remaining balance is allowed: spending can exceed income. Negative input amounts are not allowed. Do not hide a real deficit by clamping it to zero.

```javascript file=budget/model.mjs
export function remaining(income, expenses) {
  if (!Number.isFinite(income) || !Number.isFinite(expenses)) {
    throw new Error('Enter finite numbers');
  }
  if (income < 0 || expenses < 0) {
    throw new Error('Amounts must not be negative');
  }
  return income - expenses;
}
```

```check
run "node --check budget/model.mjs"
```

## Make expected behavior executable

An assertion throws if actual and expected differ. assert.throws takes a function rather than calling remaining immediately, so it can catch the error. () => expression is an arrow function: here it delays a call. Run node budget/model.test.mjs and read the success message. Tests are specifications with examples, not a proof for every input.

```javascript file=budget/model.test.mjs
import assert from 'node:assert/strict';
import { remaining } from './model.mjs';
assert.equal(remaining(100, 25), 75);
assert.equal(remaining(0, 0), 0);
assert.equal(remaining(20, 30), -10);
assert.throws(() => remaining(-1, 0));
assert.throws(() => remaining(NaN, 0));
console.log('budget cases passed');
```

```check
run "node budget/model.test.mjs" stdout="budget cases passed"
```

## Your turn: reject an infinite expense

Add a test for remaining(10, Infinity) that expects an error, before the success message. Choose one more valid pair yourself and compute its answer by hand.

```check
contains budget/model.test.mjs "remaining(10, Infinity)"
run "node budget/model.test.mjs" stdout="budget cases passed"
```

```hints
nudge: Check both parameters, not only income.
concept: The test must call the function inside assert.throws.
shape: Add an arrow callback passing ten and Infinity.
```

## Diagnose, explain and review

Temporarily replace subtraction with addition in model.mjs. The first assertion should fail with actual and expected values. Restore subtraction and rerun. Then remove the finite check temporarily: your new test should fail. This experiment shows that a green check can become red for the defect it claims to catch.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
