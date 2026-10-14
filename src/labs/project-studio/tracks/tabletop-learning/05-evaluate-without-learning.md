---
title: 10.5 — Measure, don’t congratulate
runtime: none
---

### The story so far

A policy may memorize useful patterns without becoming generally strong. Separate measuring from learning.

### What this lesson builds

Explain the learning operation with a hand-calculated case, then implement and test it.

## Work through the decision

evaluate creates fresh games on seeds starting at 900001 and alternates starting seats. choose uses epsilon=0; update is never called. Count wins, losses and unfinished capped games separately. Win rate is wins/(wins+losses), with the denominator reported. The Wilson interval is an approximate uncertainty interval for independent Bernoulli outcomes: z=1.96, denominator=1+z²/n, center=(p+z²/(2n))/denominator, half-width=z×sqrt((p(1-p)+z²/(4n))/n)/denominator. Math.sqrt is square root; Math.max(1,n) avoids division by zero. The report bounds the interval to [0,1]. This is uncertainty against this fixed opponent and evaluation protocol, not proof of strength against humans.



```predict
question: Does evaluation change the Q-table?
choice: No
choice: Yes
answer: No
explain: A frozen policy is required to measure what training produced.
```

## Implement evaluate

Add this definition to learning.mjs. Trace the variables against the worked example above; earlier definitions stay unchanged.

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

## Compare frozen policies

console.log prints the report object. JSON.stringify serializes the table for a before/after equality check. Use a separate evaluation seed from training.

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

## Try it — Find evidence of the mistake

Serialize the table before and after evaluation; the strings must match. Change the evaluation seed and report both outcomes rather than selecting the better number. Compare against baseline-versus-baseline, not against zero wins.



## Your turn — Compute a measured rate

Define solve(wins,losses) returning wins divided by completed games, or null when there are none. Export the function as solve.

Write practice/05-evaluate-without-learning.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/05-evaluate-without-learning.mjs'; if (!(solve(60,40)===0.6 && solve(0,0)===null && solve(0,10)===0)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Write one concrete input and expected output first.
concept: Separate the boundary case from the usual calculation.
shape: Implement the stated branch or formula, then run both normal and boundary cases.
```
