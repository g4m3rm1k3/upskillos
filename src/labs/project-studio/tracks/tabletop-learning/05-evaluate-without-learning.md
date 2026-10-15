---
title: 10.5 — Measure, don’t congratulate
runtime: none
---

### The story so far

A policy may memorize useful patterns without becoming generally strong. Separate measuring from learning.

### What this lesson builds

Explain the learning operation with a hand-calculated case, then implement and test it.

## Work through the decision

Imagine one player wins six out of ten test games. Another wins six hundred out of a thousand. Both observed rates are 60%, but the evidence has different precision. Before adding the evaluator, we will separate counting outcomes, calculating a rate and expressing uncertainty. None of those operations should change the policy being measured.

```predict
question: Does evaluation change the Q-table?
choice: No
choice: Yes
answer: No
explain: A frozen policy is required to measure what training produced.
```

## Count outcomes before making a claim {#evaluation-counts}

Suppose 100 requested games produce 60 wins, 30 losses and 10 unfinished capped games. Completed games are 90; the observed completed-game win fraction is 60/90, about .667. Reporting 60% silently puts unfinished games in the denominator as if they had known results. Reporting only .667 hides the cap problem. Keep all three counts and name the denominator.

A fraction describes this sample, not an exact unknown long-run rate. Ten wins from ten games is less precise evidence than a thousand wins from a thousand games. A confidence interval is a procedure intended to cover the underlying rate on a stated proportion of repeated comparable experiments; it is not a guarantee that one fixed interval contains it, nor a posterior probability assigned to the model.

We use an approximate Wilson interval as a descriptive summary of completed games. Our starts are balanced and seeds are deterministic, so this is a useful approximate summary under a repeated-game model, not an exact universal guarantee. Censoring many long games can bias the completed-game rate. Always report truncations and compare fixed opponents under the same protocol.

## Calculate one uncertainty interval {#wilson-arithmetic}

Work one numeric example before coding the report: 60 wins and 40 losses gives n=100 and p=.6. Use z=1.96, the standard-normal cutoff for an approximate two-sided 95% interval. z² means z*z, not JavaScript's ^ operator (which is bitwise XOR).

1. denominator = 1 + z²/n = 1.038416.
2. center = (p + z²/(2n))/denominator, about .5963.
3. Inside the square root, compute (p*(1-p) + z²/(4n))/n = .00249604.
4. half = z*sqrt(that)/denominator, about .0943.
5. Bounds center-half and center+half are approximately .502 and .691.

Math.sqrt(x) is the nonnegative square root: sqrt(9) is 3. Math.max(0,low) and Math.min(1,high) keep bounds within valid fraction limits. An explicit n===0 guard returns rate 0 as a sentinel and interval [0,1] before the formula is used. Math.max(1,n) also keeps the formula denominators positive. That sentinel must not be described as an observed 0% win rate. The independent exercise instead uses null for an unavailable estimate, an alternative representation to discuss.

Run this isolated calculation and compare the intermediate numbers with the hand trace. Change n to 10 while keeping p=.6 and predict a wider interval; restore n=100. The Wilson formula is a standard statistical method, not something training learned. [NIST describes the interval and its assumptions](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm).

```javascript file=scratch/wilson.mjs
const n = 100;
const p = 0.6;
const z = 1.96;
const denominator = 1 + z * z / n;
const center = (p + z * z / (2 * n)) / denominator;
const half = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / denominator;
console.log(denominator.toFixed(6), center.toFixed(4), half.toFixed(4));
console.log((center - half).toFixed(3), (center + half).toFixed(3));
```

```check
run "node scratch/wilson.mjs" stdout="0.502 0.691"
```

## Implement evaluate

Separate simulation from updates. For every requested game create a fresh Pig state, alternate the starting player, and create seeded(seed+i). The default evaluation seed 900001 differs from the training seed. During the loop seat 0 uses choose(table,state,0,random), so no exploration occurs; seat 1 uses the fixed baseline. Neither episode nor update is called. move still changes game state, which is different from changing learned values.

Count a winner only after simulation stops. winner 0 increments wins, winner 1 losses, otherwise truncated. n=wins+losses is the completed denominator. Compute rate and the Wilson summary exactly as in the isolated calculation. The returned object stores counts, fraction and bounds as numbers; percentage formatting belongs to the interface.

Reusing the evaluation seed schedule for two policies supports a repeatable comparison, but policies may consume different numbers of random samples and visit different paths. These are not guaranteed identical die sequences turn for turn. Do not choose a training seed by repeatedly optimizing on the final evaluation set: that turns the supposed test into development data. Keep another untouched seed schedule for a final claim.

```javascript file=learning.mjs
import { seeded } from './rng.mjs';
import { TARGET, newPig, actions, move, baseline, stateKey } from './pig.mjs';

export function values(table, state) {
  return table[stateKey(state)] ?? [0, 0];
}
export function update(old, reward, nextBest, terminal, alpha = 0.15, gamma = 0.99) {
  const target = terminal ? reward : reward + gamma * nextBest;
  return old + alpha * (target - old);
}

// One transition ends at the learner's NEXT decision, after the opponent responds.
export function choose(table, state, epsilon, random) {
  const legal = actions(state);
  if (random() < epsilon) return legal[Math.floor(random() * legal.length)];
  if (legal.length === 1) return legal[0];
  const row = values(table, state);
  if (row[0] === row[1]) return baseline(state);
  return row[0] > row[1] ? 'roll' : 'hold';
}
export function episode(table, random, epsilon, start) {
  const state = newPig(start);
  let moves = 0;
  while (state.winner === null && moves < 2000) {
    if (state.player === 1) {
      move(state, baseline(state), random);
      moves += 1;
      continue;
    }
    const key = stateKey(state);
    const action = choose(table, state, epsilon, random);
    const index = action === 'roll' ? 0 : 1;
    move(state, action, random);
    moves += 1;
    while (state.player === 1 && state.winner === null && moves < 2000) {
      move(state, baseline(state), random);
      moves += 1;
    }
    if (moves >= 2000 && state.winner === null) return null;
    const terminal = state.winner !== null;
    const reward = terminal ? (state.winner === 0 ? 1 : -1) : 0;
    const row = values(table, state);
    const nextBest = state.turn === 0 ? row[0] : Math.max(...row);
    if (!table[key]) table[key] = [0, 0];
    table[key][index] = update(table[key][index], reward, nextBest, terminal);
  }
  return state.winner;
}
export function train(episodes = 40000, seed = 7) {
  const table = Object.create(null);
  const random = seeded(seed);
  let truncated = 0;
  for (let i = 0; i < episodes; i += 1) {
    if (episode(table, random, 0.2, i % 2) === null) truncated += 1;
  }
  return { version: 1, game: 'pig', target: TARGET, episodes, seed, truncated, table };
}

export function evaluate(table, games = 1000, seed = 900001) {
  let wins = 0;
  let losses = 0;
  let truncated = 0;
  for (let i = 0; i < games; i += 1) {
    const state = newPig(i % 2);
    const random = seeded(seed + i);
    let moves = 0;
    while (state.winner === null && moves < 2000) {
      const action = state.player === 0 ? choose(table, state, 0, random) : baseline(state);
      move(state, action, random);
      moves += 1;
    }
    if (state.winner === 0) wins += 1;
    else if (state.winner === 1) losses += 1;
    else truncated += 1;
  }
  const n = wins + losses;
  if (n === 0) return { wins, losses, truncated, rate: 0, low: 0, high: 1 };
  const rate = n ? wins / n : 0;
  // Wilson interval: stable even when all outcomes agree.
  const z = 1.96;
  const denominator = 1 + z * z / Math.max(1, n);
  const center = (rate + z * z / (2 * Math.max(1, n))) / denominator;
  const half = z * Math.sqrt((rate * (1 - rate) + z * z / (4 * Math.max(1, n))) / Math.max(1, n)) / denominator;
  return { wins, losses, truncated, rate, low: Math.max(0, center - half), high: Math.min(1, center + half) };
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check learning.mjs"
```


**Explore, then restore:** Serialize the table before and after evaluation: the strings must match. Run the same settings twice and compare reports, then change the evaluation seed. Record both results. Explain why “best result after many reruns” overstates the evidence.


Before checking, predict this observation: **all outcomes are accounted for and the learned table stays unchanged**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {train,evaluate} from './learning.mjs';const m=train(2000,7),before=JSON.stringify(m.table);const r=evaluate(m.table,100,900001);assert.equal(r.wins+r.losses+r.truncated,100);assert.equal(JSON.stringify(m.table),before);assert.ok(r.low<=r.rate && r.rate<=r.high);assert.deepEqual(evaluate(m.table,0),{wins:0,losses:0,truncated:0,rate:0,low:0,high:1});\""
```

## Compare frozen policies

This runner trains once, stores the model, then evaluates both the learned table and an empty-table fallback under the same evaluation defaults. JSON.stringify produces a text snapshot of enumerable model data. Comparing before/after table strings detects changes in this deterministic object construction; it is not a general mathematical equivalence test for arbitrary objects with different property order.

Read wins, losses and truncated before the fraction. State the opponent (hold-at-10), short-match target (30), training seed/budget and evaluation seed/budget with any claim. A baseline-versus-baseline result near half is a useful reference, not a requirement that every finite sample equal exactly 50%.

```javascript file=scratch/evaluate.mjs
import {train,evaluate} from '../learning.mjs';
const model=train(40000,7);
const before=JSON.stringify(model.table);
console.log('Learned:',evaluate(model.table));
console.log('Baseline:',evaluate({}));
if(before!==JSON.stringify(model.table)) throw Error('Evaluation trained the table');
```



```check
run "node scratch/evaluate.mjs" stdout="Baseline:"
```


**Explore, then restore:** Change only the evaluation seed and keep the earlier report alongside it. Repeat with a smaller training budget. A lower or overlapping result is a valid observation; write a hypothesis rather than hiding it.

## Try it — Find evidence of the mistake

Serialize the table before and after evaluation; the strings must match. Change the evaluation seed and report both outcomes rather than selecting the better number. Compare against baseline-versus-baseline, not against zero wins.



## Your turn — Compute a measured rate

Define solve(wins,losses) returning wins divided by completed games, or null when there are none. Export the function as solve.

Write practice/05-evaluate-without-learning.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/05-evaluate-without-learning.mjs'; if (!(solve(60,40)===0.6 && solve(0,0)===null && solve(0,10)===0)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: How many outcomes actually have a winner?
concept: Zero completed games means no estimate, not a measured loss rate.
shape: Check the completed count before dividing; return null for no data.
```
