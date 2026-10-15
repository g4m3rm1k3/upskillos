---
title: 10.4 — Train a table you can reproduce
runtime: none
---

### The story so far

One episode updates a few estimates. Repeated episodes produce experience across many states.

### What this lesson builds

Explain the learning operation with a hand-calculated case, then implement and test it.

## Work through the decision

A fresh game must reset scores but retain what the opponent learned. Draw two boxes: current match state and accumulated action estimates. We will place their creation at different loop levels, then repeat an experiment to test that those lifetimes are right.

```predict
question: Should a fresh game also erase the learned table?
choice: No
choice: Yes
answer: No
explain: State resets each episode; learned estimates accumulate across episodes.
```

## Implement train

Training has two lifetimes. The table persists across games; each episode creates fresh game state. Put Object.create(null) outside the for loop to retain learned values. This creates a dictionary without inherited property names. const protects the table binding but permits entries to change. Keep one seeded(seed) function outside the loop as well, so successive games continue its stream.

The counter i starts at 0 and runs through episodes-1. i%2 alternates starting player; % is remainder, not percent. Pass exploration .2 for every game. A returned null increments truncated rather than wins or losses. The returned object packages the table with version, game, target, budget, seed and truncations. Property shorthand table means table:table; it does not copy the table.

Two identical calls are reproducible only because code, seed, call order, budget and opponent are identical. A new seed can produce a different table and strength. A larger table only means more rows have been updated, not that their estimates are good.

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check learning.mjs"
```


**Explore, then restore:** Train twice with 2000 episodes and seed 7; compare JSON.stringify results. Then change only the seed to 8. Expect reproducibility for identical settings, not identity across seeds. Keep this result even if the second seed later evaluates worse.


Before checking, predict this observation: **identical training settings produce identical packaged models**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {train} from './learning.mjs';const a=train(2000,7),b=train(2000,7);assert.deepEqual(a,b);assert.equal(a.episodes,2000);assert.equal(a.seed,7);assert.ok(Object.keys(a.table).length>0);\""
```

## Run a real training experiment

The small runner imports train rather than duplicating its loop. Calling it is synchronous in Node, so the next console line prints only when training ends. Object.keys(model.table) lists own state keys; length counts visited rows. This is coverage of observed states, not a win-rate measurement. Keep the result object's metadata next to any report so another person can reproduce the setup.

Run node scratch/train.mjs, then try a smaller budget and note how runtime and row count change. Restore the provided budget. Do not infer that “twice as many games means twice as strong”; evaluation comes next.

```javascript file=scratch/train.mjs
import {train} from '../learning.mjs';
const model=train(40000,7);
console.log('Visited states:',Object.keys(model.table).length);
```



```check
run "node scratch/train.mjs" stdout="Visited states:"
```


**Explore, then restore:** Temporarily log model.seed and model.truncated too. Explain each value in words. Remove the extra logging only after you can distinguish training budget, visited states and capped games.

## Try it — Find evidence of the mistake

Temporarily move the table creation inside the episode loop. Only the final game remains learned. Restore the shared table. Train twice with the same seed and compare serialized tables.



## Your turn — Keep metadata with a model

Define solve(table,target) returning {version:1,game:"pig",target,table}. Use the supplied table object; this function packages it, not copies it. Export the function as solve.

Write practice/04-train-reproducibly.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/04-train-reproducibly.mjs'; if (!((() => {const t={};const m=solve(t,30);return m.version===1 && m.game===\\\"pig\\\" && m.target===30 && m.table===t;})())) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Which metadata tells you what a table means?
concept: Packaging should preserve the supplied table reference.
shape: Return a new object with version, game, target and the original table.
```
