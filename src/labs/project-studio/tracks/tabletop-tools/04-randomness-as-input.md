---
title: 5.4 — Repeat an experiment
runtime: none
---

### The story so far

The browser game uses Math.random. A test needs control over the next value.

### What this lesson builds

Pass a random source into a die function and generate reproducible experimental sequences.

## Pass behavior as an argument

A default parameter uses its expression only when the caller omits the argument or passes undefined. rollFace(random = Math.random) accepts any callable source with the same [0,1) contract. This is dependency injection in its smallest form: an input replaces a hidden dependency.

```javascript file=rng.mjs
export function rollFace(random = Math.random) {
  return 1 + Math.floor(random() * 6);
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --input-type=module -e \"import {rollFace} from './rng.mjs'; console.log(rollFace(() => 0), rollFace(() => 0.999));\"" stdout="1 6"
```

## Keep the generator state in a closure

seeded returns an inner function that remembers state after seeded returns. The recurrence multiplies the current state, adds a constant, then keeps an unsigned 32-bit result with >>> 0. >>> is a bitwise unsigned right-shift operator; shifting by zero performs conversion to that range. Dividing by 2^32 converts it into [0,1). The constants define one reproducible generator, not a cryptographic guarantee. A seed is its initial state.

```javascript file=rng.mjs
// A repeatable source for experiments, not a security random generator.
export function seeded(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function rollFace(random = Math.random) {
  return 1 + Math.floor(random() * 6);
}
```

Draw two boxes for two calls to seeded(7). They begin equal but own separate state. Calling only one advances only its box. Training and evaluation must use distinct seeds; reseeding on every die roll would repeat the first result.

The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --input-type=module -e \"import {seeded} from './rng.mjs'; const a=seeded(7),b=seeded(7); console.log(a()===b(),a()===b());\"" stdout="true true"
```

```predict
question: Two generators share a seed. One advances twice and the other once. Must their next results match?
choice: No
choice: Yes
answer: No
explain: The state includes how far each generator has advanced.
```

## Try it — Restart every roll

Temporarily construct seeded(7) inside every test roll. Observe the repeated first value. Restore one generator outside the roll loop. A reproducible sequence is not a constant sequence.



## Your turn — Consume the right number of samples

Define solve(random) returning the sum of two die rolls. Call random exactly twice. Export the function as solve.

Write practice/04-randomness-as-input.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/04-randomness-as-input.mjs'; if (!((() => { let calls=0; const random=()=>{calls+=1;return calls===1?0:0.999;}; return solve(random)===7 && calls===2; })())) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Two dice need two draws.
concept: A copied face is not an independent draw.
shape: Apply the die mapping separately to each call and add the faces.
```
