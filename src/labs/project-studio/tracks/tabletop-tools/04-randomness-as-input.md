---
title: 5.4 — Repeat an experiment
runtime: none
---

### The story so far

The browser game uses Math.random. A test needs control over the next value.

### What this lesson builds

Pass a random source into a die function and generate reproducible experimental sequences.

## Pass behavior as an argument

A die function has two jobs: obtain a sample and map it to a face. Tests should control the first without duplicating the second. A default parameter `random = Math.random` uses that function only when the caller omits the argument or passes undefined. Notice there are no parentheses after Math.random in the default: we pass behavior, not one sampled number.

Inside rollFace, random() performs exactly one call. A supplied `() => 0` is a zero-argument function returning 0; it forces face 1. A supplied `() => 0.999` forces face 6. This is a small example of dependency injection: a caller supplies a dependency rather than the calculation hiding it.

```javascript file=rng.mjs
export function rollFace(random = Math.random) {
  return 1 + Math.floor(random() * 6);
}
```



This check executes the shown example. It establishes the listed result for these inputs; add another case and explain why it would catch a different mistake.

```check
run "node --input-type=module -e \"import {rollFace} from './rng.mjs'; console.log(rollFace(() => 0), rollFace(() => 0.999));\"" stdout="1 6"
```


**Explore, then restore:** Pass `() => 0.5` and predict 4. Then accidentally pass 0.5 instead of a function and observe the not-callable error. Restore the function. Explain why testing with a fixed input is different from hoping a random roll eventually produces the boundary face.

## Keep the generator state in a closure

Think of a generator as a box containing one integer. Calling it replaces that integer using a fixed recurrence, then reports a fraction. The inner next function retains access to its own outer state variable after seeded returns: this is the closure used earlier by die-button handlers. Two calls to seeded create two boxes, even with the same initial seed.

The multiplier 1664525 and increment 1013904223 define this particular generator. `>>> 0` converts the arithmetic result to an unsigned 32-bit integer, wrapping it into 0 through 4294967295. Dividing by 4294967296 (2 to the power 32) gives a fraction in [0,1). With seed 0, the first integer is 1013904223, giving about 0.2361. This algorithm is chosen for repeatable experiments, not for secrets or proof of ideal randomness. A seed alone describes a sequence only together with this algorithm and the call order.

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

This check executes the shown example. It establishes the listed result for these inputs; add another case and explain why it would catch a different mistake.

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


**Explore, then restore:** Make a=seeded(7) and b=seeded(7). Compare a()===b() twice: both true. Call only a() once more, then compare their next outputs: the streams are offset. Recreate both to restore synchronization. Explain why recreating seeded(7) inside every roll would return the same first sample every time.

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
