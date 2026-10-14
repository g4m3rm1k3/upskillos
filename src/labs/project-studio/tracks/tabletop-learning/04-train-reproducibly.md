---
title: 10.4 — Train a table you can reproduce
runtime: none
---

### The story so far

One episode updates a few estimates. Repeated episodes produce experience across many states.

### What this lesson builds

Explain the learning operation with a hand-calculated case, then implement and test it.

## Work through the decision

Object.create(null) makes a dictionary without inherited property names. The table is shared across episodes; game state is fresh each episode. seeded(seed) creates one advancing source, not a fresh generator for every move. i%2 alternates starting seats; % is the remainder operator. Training uses a constant exploration rate 0.2. The returned model records format version, game, target, episode budget, seed, truncations and learned table. This metadata prevents silently using a model for different rules.



```predict
question: Should a fresh game also erase the learned table?
choice: No
choice: Yes
answer: No
explain: State resets each episode; learned estimates accumulate across episodes.
```

## Implement train

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check learning.mjs"
```

## Run a real training experiment

Run this command in the project terminal. Object.keys counts visited state rows. A nonempty table proves updates occurred, not that the policy is strong.

```javascript file=scratch/train.mjs
import {train} from '../learning.mjs';
const model=train(40000,7);
console.log('Visited states:',Object.keys(model.table).length);
```



```check
run "node scratch/train.mjs" stdout="Visited states:"
```

## Try it — Find evidence of the mistake

Temporarily move the table creation inside the episode loop. Only the final game remains learned. Restore the shared table. Train twice with the same seed and compare serialized tables.



## Your turn — Keep metadata with a model

Define solve(table,target) returning {version:1,game:"pig",target,table}. Use the supplied table object; this function packages it, not copies it. Export the function as solve.

Write practice/04-train-reproducibly.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/04-train-reproducibly.mjs'; if (!((() => {const t={};const m=solve(t,30);return m.version===1 && m.game===\\\"pig\\\" && m.target===30 && m.table===t;})())) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Write one concrete input and expected output first.
concept: Separate the boundary case from the usual calculation.
shape: Implement the stated branch or formula, then run both normal and boundary cases.
```
