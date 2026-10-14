---
title: 5.3 — Shorter syntax without hidden ideas
runtime: none
---

### The story so far

You can write loops and named functions. Library examples often shorten the same operations.

### What this lesson builds

Translate callbacks and compact expressions back into plain loops and decisions.

## Read each abbreviation

filter calls its callback once per element and returns those whose callback is true. map returns the callback results in a new array. face => face * 2 is an arrow function with one parameter and an implicit return; it is equivalent here to function(face) { return face * 2; }. Spread ... expands array elements: inside [] it creates a shallow array copy; inside a call it supplies separate arguments. Math.max expects separate numbers. Destructuring const [first, second] takes positions into names. condition ? a : b is an expression choosing one value, unlike an if statement. null explicitly represents absence. ?? supplies a fallback only for null or undefined, so a scored zero stays zero.

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

The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

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

## Try it — Lose a callback result

Change the map callback to face => { face * 2; }. Braces make a statement body requiring an explicit return, so the new elements are undefined. Restore the implicit-return expression. Explain how braces change this arrow function.



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
