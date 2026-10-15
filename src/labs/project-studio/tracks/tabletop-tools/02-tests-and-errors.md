---
title: 5.2 — Let a failure tell you something
runtime: none
---

### The story so far

Node can import your pure function. A printed answer still depends on a person noticing a mistake.

### What this lesson builds

Write a test that fails for a wrong answer and explain what the failure proves.

## Compare actual and expected

A useful test compares an observed result with a result chosen independently. For facePoints(6,6), expect 6; for facePoints(2,6), expect 0. A function that always returns 6 passes the first example and fails the second. Write both expectations before looking at the implementation.

`!==` is strict inequality. `new Error('message')` constructs an error value; `throw` stops ordinary execution and reports it. Node exits unsuccessfully for an uncaught error, which the check runner recognizes. If both comparisons are correct, execution reaches console.log('PASS'). This harness tests behavior; merely running node --check would only parse syntax.

```javascript file=practice/points-test.mjs
import { facePoints } from './points.mjs';
if (facePoints(6, 6) !== 6) throw new Error('A six should score six');
if (facePoints(2, 6) !== 0) throw new Error('A two should score zero');
console.log('PASS');
```



This check executes the shown example. It establishes the listed result for these inputs; add another case and explain why it would catch a different mistake.

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


**Explore, then restore:** Change the expected value in one assertion to something you know is wrong. Observe a nonzero exit and the message. Restore it, then break the implementation instead and identify which assertion fails. Finally restore the implementation and obtain PASS.

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
