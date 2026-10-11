---
title: 3.2 — Functions, validation and your first tests
track: Frontend Developer Bootcamp — JavaScript and a Budget Calculator
trackOrder: 50.03
runtime: none
---

Outcome: separate a calculation from its screen and test normal, boundary and invalid input. A function takes named parameters and returns a value. export makes it available to other modules; import names what you want to use. Throwing an Error signals that this input cannot produce a valid result.

### The story so far

You have evaluated expressions and followed a decision. Now you will name a reusable operation: given income and expenses, return the remaining balance. The same operation can serve a terminal test and a browser form.

This is our first deliberate separation of concerns. The model knows budget rules. It does not know about input boxes, dollars on a screen or which button was clicked.

## Keep the rule independent of the browser

### A function is a small contract

Think of a function as a labeled machine with input slots and an output tray. You put in income and expenses; it gives back the balance or reports that the inputs are unacceptable. The analogy is useful only if you also inspect the contract: some functions change outside state, whereas this one simply computes from its arguments.

A **parameter** is a name in the function definition. An **argument** is an actual value supplied at a call. In `remaining(100, 25)`, 100 becomes income and 25 becomes expenses for this call. A later call gets its own parameter values.

```text
remaining(100, 25)
  finite? yes, yes
  nonnegative inputs? yes, yes
  return 100 - 25
caller receives 75
```

`return` immediately ends this call and gives a result to the caller. `console.log` merely prints; a function that only logs can still return undefined. Use return when another part of the program needs the value.

Before trying this step, make a prediction.

```predict
question: What does remaining(20, 30) do?
choice: Returns -10
choice: Throws because the result is negative
choice: Returns 10
answer: Returns -10
explain: The inputs are finite and nonnegative. Their difference may be negative; that is a valid deficit.
verify: node --input-type=module -e "import { remaining } from './budget/model.mjs'; console.log('Returns ' + remaining(20, 30));"
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

### Validation is a boundary, not decoration

The function promises meaningful numeric arithmetic. A string, NaN or Infinity violates that promise. `Number.isFinite` checks the value without silently turning a string into a number. The caller must do conversion deliberately.

The validation order matters for explanation. First reject values that are not finite numbers. Then reject negative input amounts. Finally perform subtraction. A negative **result** is allowed because it communicates a deficit. Rejecting that result would hide precisely the situation the user needs to understand.

`throw new Error(...)` exits the normal path. Code farther up the call chain can catch the error and decide how to present it. The model supplies an explanation; it does not force an alert box or a page reload.

**Rule of thumb:** validate where data enters a trusted part of the program, and keep the rule in one place. Browser validation improves the interaction, but another caller can still call the model directly. Conversely, do not repeat arbitrary checks in every internal line after a clear boundary has established the contract.

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

### Why a callback is needed for an expected error

Compare these two expressions:

```javascript
remaining(-1, 0)
() => remaining(-1, 0)
```

The first calls the function immediately. The second creates a new function that will make the call later. `assert.throws` needs the second form so it can surround that later call with its own error handling. The arrow does not run the body merely because you wrote it.

Assertions are tripwires. `assert.equal(actual, expected)` stays quiet if the values agree and stops the test if they do not. A final success message is useful only if all earlier assertions ran. An empty file that exits successfully has tested nothing.

Choose cases by the contract: an ordinary balance, zero, a deficit, a negative input and a non-finite input. Repeating five similar positive examples gives less information than testing those different boundaries.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain the difference between returning 75 and printing 75. Then walk through `remaining(20, 30)` and `remaining(-20, 30)` and say why one is a valid result while the other is an error. Design one case that would catch an accidental addition in place of subtraction.
