---
title: 10.6 — A model file is an input boundary
runtime: none
---

### The story so far

Saving data is useful only if loading it preserves the meaning of every entry.

### What this lesson builds

Explain the learning operation with a hand-calculated case, then implement and test it.

## Work through the decision

A file can contain perfectly readable JSON and still describe Pig with a different winning target. Start with two questions: can the data be read, and does it mean what this game expects? Validation answers the second question before replacing a working model.

```predict
question: Should a target-100 table be silently loaded into target-30 Pig?
choice: No
choice: Yes
answer: No
explain: The same state key would describe a different winning objective.
```

## Implement validateModel

An imported object is an input, not trusted model state. Validate outer metadata before reading rows: a compatible version, game and target identify the same interpretation; episodes must be a nonnegative integer. typeof table==='object' alone would also accept arrays, so Array.isArray rejects them explicitly. A null table must be rejected before any entry iteration. Conditions joined by || stop as soon as a rejection is known.

Object.entries gives [key,row] pairs; destructuring names them. split(',') separates three text coordinates; map(Number) converts them. some(predicate) asks whether any item fails. The first two coordinates are banked scores below TARGET; the third is a capped turn total no greater than TARGET-own. Each row must be an array of two finite numbers. Number.isFinite rejects NaN and Infinity without converting strings. Math.abs(x)>1.001 bounds our estimates with a small numeric tolerance because rewards are bounded ±1 and discounts do not amplify them.

Throwing stops validation before the caller assigns the candidate to model. Returning model gives the validated object itself, not a deep copy. This checker establishes this schema, not whether it was trained honestly or plays well. Joining the converted parts back with commas must reproduce the original key exactly. This rejects alternate spellings such as leading zeros, whitespace or an empty coordinate: policy lookups use the canonical spelling. Reject rather than silently keeping unreachable duplicate states. Do not silently reinterpret different game rules.

```javascript file=learning.mjs
import { seeded } from './rng.mjs';
import { TARGET, newPig, actions, move, baseline, stateKey } from './pig.mjs';

export function values(table, state) {
  return table[stateKey(state)] ?? [0, 0];
}
export function choose(table, state, epsilon, random) {
  const legal = actions(state);
  if (random() < epsilon) return legal[Math.floor(random() * legal.length)];
  if (legal.length === 1) return legal[0];
  const row = values(table, state);
  if (row[0] === row[1]) return baseline(state);
  return row[0] > row[1] ? 'roll' : 'hold';
}
export function update(old, reward, nextBest, terminal, alpha = 0.15, gamma = 0.99) {
  const target = terminal ? reward : reward + gamma * nextBest;
  return old + alpha * (target - old);
}

// One transition ends at the learner's NEXT decision, after the opponent responds.
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

export function validateModel(model) {
  if (!model || model.version !== 1 || model.game !== 'pig' || model.target !== TARGET ||
      !model.table || typeof model.table !== 'object' || Array.isArray(model.table) ||
      !Number.isInteger(model.episodes) || model.episodes < 0) throw new Error('Not a compatible Pig model');
  for (const [key, row] of Object.entries(model.table)) {
    const parts = key.split(',').map(Number);
    if (parts.length !== 3 || parts.join(',') !== key || parts.some(x => !Number.isInteger(x) || x < 0) ||
        parts[0] >= TARGET || parts[1] >= TARGET || parts[2] > TARGET - parts[0] ||
        !Array.isArray(row) || row.length !== 2 || row.some(x => !Number.isFinite(x) || Math.abs(x) > 1.001)) {
      throw new Error('Invalid state or value in model');
    }
  }
  return model;
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check learning.mjs"
```


**Explore, then restore:** Make copies with target 100, a one-value row and an infinite estimate. Predict which check rejects each. Then try a valid but all-zero table: it passes compatibility while playing the fallback. Explain why valid data is not evidence of useful learning.

## Read the acceptance suite

The arithmetic tests call update with known numbers and compare error against a tolerance. The legal-action test gives an illegal hold a tempting high value and confirms roll still wins by legality. The player-relative key test uses seat 1 so a hidden seat-zero assumption cannot pass accidentally.

The reproducibility test trains twice with identical settings and deep-compares whole models. It then serializes the table, evaluates, and compares again to establish non-mutation. Validation tests each change a single field so their failure has an interpretable cause. Read every expected result before running; a PASS only establishes these cases, not convergence or statistical superiority.

```javascript file=tests/learning.check.mjs provided
import test from 'node:test';
import assert from 'node:assert/strict';
import { seeded } from '../rng.mjs';
import { newPig, stateKey } from '../pig.mjs';
import { update, choose, train, evaluate, validateModel } from '../learning.mjs';

test('hand-calculated update and terminal non-bootstrap', () => {
  assert.ok(Math.abs(update(0.2,1,999,true,0.1)-0.28)<1e-12);
  assert.ok(Math.abs(update(0.2,0,0.5,false,0.1,0.9)-0.225)<1e-12);
  assert.ok(Math.abs(update(0.2,-1,999,true,0.1)-0.08)<1e-12);
});
test('legal action masking and player-relative state', () => {
  const state=newPig();
  const key=stateKey(state);
  assert.equal(choose({[key]:[-1,1]},state,0,seeded(1)),'roll');
  state.scores=[4,9];state.player=1;state.turn=3;
  assert.equal(stateKey(state),'9,4,3');
});
test('reproducible training, frozen evaluation and format validation', () => {
  const a=train(3000,7), b=train(3000,7);
  assert.deepEqual(a,b);
  assert.ok(Object.keys(a.table).length>100);
  const before=JSON.stringify(a.table);
  const report=evaluate(a.table,200);
  assert.equal(report.wins+report.losses+report.truncated,200);
  assert.equal(JSON.stringify(a.table),before);
  assert.deepEqual(evaluate(a.table,0),{wins:0,losses:0,truncated:0,rate:0,low:0,high:1});
  assert.equal(validateModel(a),a);
  assert.throws(()=>validateModel({...a,target:100}));
  assert.throws(()=>validateModel({...a,table:{'00,0,0':[0,0]}}));
  assert.throws(()=>validateModel({...a,table:{',0,0':[0,0]}}));
  assert.throws(()=>validateModel({...a,table:{'0,0,0':[NaN,0]}}));
  assert.throws(()=>validateModel({...a,table:{'30,0,0':[0,0]}}));
});
```



```check
run "node --test tests/learning.check.mjs"
```


**Explore, then restore:** Change one test fixture from target 100 to 30 without changing its expected rejection: the test should fail because that fixture is no longer invalid. Restore 100. This checks that the negative test actually exercises the intended boundary.

## Try it — Find evidence of the mistake

Change the target field in a saved copy and load it. It must be rejected while the old model remains usable. Never edit the only saved model during this experiment.



## Your turn — Reject non-finite estimates

Define solve(row) returning true only for an array of exactly two finite numbers, each between -1 and 1. Export the function as solve.

Write practice/06-validate-and-test-a-model.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/06-validate-and-test-a-model.mjs'; if (!(solve([0,1]) && !solve([NaN,0]) && !solve([2,0]) && !solve([0]))) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Can you read row.length safely on every input?
concept: Validate container, length, number type and range separately.
shape: Use Array.isArray before checking two entries, then reject any non-finite or out-of-range value.
```
