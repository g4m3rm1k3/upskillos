---
title: 5.3 — Shorter syntax without hidden ideas
runtime: none
---

### The story so far

You can write loops and named functions. Library examples often shorten the same operations.

### What this lesson builds

Translate callbacks and compact expressions back into plain loops and decisions.

## Translate one callback at a time {#callback-lab}

Start with a filtering loop you already understand. The for...of form reads each element value in order; it does not supply its index. push appends one value to an array. filter packages that loop: it calls the predicate for each element and retains values whose result is true. A predicate is simply a function answering a yes/no question.

Run this file with node scratch/callbacks.mjs. Predict two sixes in both arrays. Then change the predicate and the loop condition to face >= 3: both should retain [6,6]. Try face < 3: both should retain [2]. Restore equality with 6. This equivalence is the reason filter is safe to use; shorter spelling is not a new scoring rule.

```javascript file=scratch/callbacks.mjs
const faces = [6, 2, 6];
const kept = [];
for (const face of faces) {
  if (face === 6) kept.push(face);
}
const filtered = faces.filter(function (face) { return face === 6; });
console.log(JSON.stringify(kept), JSON.stringify(filtered));
```

```check
run "node scratch/callbacks.mjs" stdout="[6,6] [6,6]"
```

## Read each abbreviation

Now compare operations by their result. filter returns original elements that passed a condition; map returns one transformed value per input. `[6,2,6].map(face => face * 2)` yields [12,4,12], not fewer dice. An arrow function `face => expression` takes one parameter and returns the expression; a braced arrow body requires an explicit return.

Spread `...faces` expands values. Inside `[...faces]` it creates a new outer array; in `Math.max(...faces)` it passes three separate arguments because max does not expect an array. `const [first, second] = faces` destructures the first two positions into names. It does not remove them from faces. `condition ? a : b` is an expression selecting one result; only its selected branch is evaluated.

`null` deliberately marks absence. `absent ?? 0` uses zero only for null or undefined; an existing 0, false or empty string is preserved. This matters for scorecards, where a recorded zero is different from an empty box. Before running, write the seven expected console items separately and identify the expression producing each.

```javascript file=scratch/syntax.mjs
const faces = [6, 2, 6];
const sixes = faces.filter(function (face) { return face === 6; });
const doubled = faces.map(face => face * 2);
const copy = [...faces];
const [first, second] = faces;
const maximum = Math.max(...faces);
const label = maximum === 6 ? 'has six' : 'no six';
const absent = null;
const shown = absent ?? 0;
console.log(sixes.length, doubled[1], copy[0], first, second, label, shown);
```

A shallow copy duplicates the outer array, not nested objects. for (const face of faces) is another loop form: it binds each element value directly. includes(value) asks whether a sequence contains that value. Use these forms only when you can trace their expanded equivalents.

This check executes the shown example. It establishes the listed result for these inputs; add another case and explain why it would catch a different mistake.

```check
run "node scratch/syntax.mjs" stdout="2 4 6 6 2 has six 0"
```

```predict
question: Does [...faces] share the outer array with faces?
choice: No
choice: Yes
answer: No
explain: A new array is created; nested objects, if any, would still be shared.
```


**Explore, then restore:** Change copy[0] and verify faces[0] stays 6. Then use an array of objects and explain why a shallow copy still shares those objects. Try `0 ?? 99` and `null ?? 99`: expect 0 and 99. Restore the example before running its check.

## Try it — Lose a callback result

Change the map callback to face => { face * 2; }. Braces make a statement body requiring an explicit return, so the new elements are undefined. Restore the implicit-return expression. Explain how braces change this arrow function.



## Read a numeric comparison {#sort-comparison}

sort changes the array it is called on. Without a comparator it compares string forms, so [10,2,6] sorts as 10,2,6. A comparator receives two values a and b; a negative result places a earlier, a positive result places it later, and zero treats them as equal for ordering. For ascending numbers, a-b provides these signs: 2-10 is negative; 10-2 is positive.

In the Console predict `[10,2,6].sort((a,b) => a-b)` and then run it. Expect [2,6,10]. Before the independent task, draw two array boxes: the caller's input and the copy you are allowed to sort. The task checks both ordering and independence.

## Your turn — Copy before sorting

Define solve(values) returning a NEW ascending numeric array without changing the input. Array.sort mutates its receiver; its comparison callback returns a negative number when a should come before b. Export the function as solve.

Write practice/03-read-modern-javascript.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/03-read-modern-javascript.mjs'; if (!((() => { const a=[10,2,6]; const b=solve(a); return JSON.stringify(a)==='[10,2,6]' && JSON.stringify(b)==='[2,6,10]' && b!==a; })())) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Where does sort write?
concept: Copy the array before calling a mutating method.
shape: Spread into a new array and sort it with a-b.
```
