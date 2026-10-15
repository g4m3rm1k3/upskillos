---
title: 10.2 — Explore without breaking the rules
runtime: none
---

### The story so far

A table cannot learn about an action it never tries. Exploration deliberately samples alternatives during training.

### What this lesson builds

Explain the learning operation with a hand-calculated case, then implement and test it.

## Work through the decision

Suppose a table strongly prefers holding, but the turn total is zero. The rules still permit only rolling. Now suppose both actions are legal and the table has never seen this state: it needs a way to try alternatives. We will separate permission, exploration and preference instead of treating a large estimate as permission.

```predict
question: If hold has a high estimate at turn total zero, may the policy hold?
choice: No
choice: Yes
answer: No
explain: Rule legality overrides model preference.
```

## Implement choose

First ask the rules for legal actions. The policy never gets to overrule that list. At turn=0 it contains only roll; at a positive turn it contains roll and hold. epsilon is a number from 0 to 1 giving the chance to explore. If random() < epsilon, draw another sample and map it to an index in the legal array with floor(sample * length). With epsilon .2, a first sample .1 explores; .8 does not. On a two-action list, a second sample .75 selects index 1, hold.

If not exploring, a one-action list returns that sole action before reading estimates. Otherwise obtain the [roll,hold] row. Larger roll estimate chooses roll; larger hold estimate chooses hold. Equal values—including an unseen [0,0] row—use the explicit baseline rather than relying on an accidental array order. The function assumes a live decision with at least one legal action; callers stop at terminal states.

Passing epsilon=0 removes exploration, but this function still consumes the first random sample for its comparison. That matters to reproducibility because choose and the dice share a random stream. It reads the table and returns an action; it neither performs that action nor updates the table.

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check learning.mjs"
```


**Explore, then restore:** Use a controlled sequence [.1,.75] at a positive turn with epsilon .2: predict hold through exploration. Repeat with epsilon 0 and row [1,-1]: predict roll through estimates. Then set turn 0 with row [-1,1]: legal masking must still choose roll.


Before checking, predict this observation: **exploration samples a legal action and exploitation cannot choose an illegal hold**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {newPig,stateKey} from './pig.mjs';import {choose} from './learning.mjs';const s=newPig();s.turn=4;const samples=[.1,.75];assert.equal(choose({},s,.2,()=>samples.shift()),'hold');const table={[stateKey(s)]:[1,-1]};assert.equal(choose(table,s,0,()=>.8),'roll');s.turn=0;assert.equal(choose({[stateKey(s)]:[-1,1]},s,0,()=>.8),'roll');\""
```

## Try it — Find evidence of the mistake

On paper remove the legal.length===1 guard. A high invalid hold estimate can stall a match. Keep the guard and test an empty turn.



## Your turn — Choose among legal values

Define solve(roll,hold,canHold) returning roll when holding is illegal or roll is at least hold; otherwise hold. Return the action name as a string. Export the function as solve.

Write practice/02-explore-legally.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/02-explore-legally.mjs'; if (!(solve(-1,1,false)===\\\"roll\\\" && solve(0,1,true)===\\\"hold\\\" && solve(1,1,true)===\\\"roll\\\")) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Check permission before comparing estimates.
concept: An illegal hold must be ignored even if its number is largest.
shape: Handle canHold=false first, then compare roll and hold with the required tie rule.
```
