---
title: 5.2 — Let a failure tell you something
runtime: none
---

### The story so far

Node can import your pure function. A printed answer still depends on a person noticing a mistake.

### What this lesson builds

Write a test that fails for a wrong answer and explain what the failure proves.

## Compare actual and expected

!== means not strictly equal. new Error creates an error object with a useful message; throw stops normal execution and reports it. A process ending in an uncaught error has a failure exit status. This simple harness has no testing framework to learn. Its two examples distinguish a working function from one that always returns six.

```javascript file=practice/points-test.mjs
import { facePoints } from './points.mjs';
if (facePoints(6, 6) !== 6) throw new Error('A six should score six');
if (facePoints(2, 6) !== 0) throw new Error('A two should score zero');
console.log('PASS');
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node practice/points-test.mjs" stdout="PASS"
```

```predict
question: Would only testing a six reject a function that always returns six?
choice: No
choice: Yes
answer: No
explain: A counterexample needs an input whose correct answer differs.
```

## Try it — Prove the test can fail

Change facePoints to always return 6. Run node practice/points-test.mjs and read the second error. Restore the function. A passing test that never failed during this experiment would be weak evidence. Later node --test discovers test files; our small harness remains valid JavaScript.



## Your turn — Reject an out-of-range face

Define solve(face) returning true for integer faces 1–6, false for anything else. Number.isInteger(value) checks whether the value is a number with no fractional part; && joins conditions. Export the function as solve.

Write practice/02-tests-and-errors.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/02-tests-and-errors.mjs'; if (!(solve(1) && solve(6) && !solve(0) && !solve(7) && !solve(2.5) && !solve(\\\"3\\\"))) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Bounds alone do not reject fractions.
concept: Validate type and range.
shape: Require Number.isInteger, lower bound and upper bound together.
```
