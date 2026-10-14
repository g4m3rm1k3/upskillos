---
title: 10.2 — Explore without breaking the rules
runtime: none
---

### The story so far

A table cannot learn about an action it never tries. Exploration deliberately samples alternatives during training.

### What this lesson builds

Explain the learning operation with a hand-calculated case, then implement and test it.

## Work through the decision

epsilon is the chance of a random legal action. If the source returns less than epsilon, select an index in legal actions; otherwise take the higher estimate. At an empty turn only roll is legal even if hold's number is larger. Tied or unseen rows use the explicit baseline. Evaluation sets epsilon to zero. That removes exploration but does not update or prove the table.



```predict
question: If hold has a high estimate at turn total zero, may the policy hold?
choice: No
choice: Yes
answer: No
explain: Rule legality overrides model preference.
```

## Implement choose

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check learning.mjs"
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
nudge: Write one concrete input and expected output first.
concept: Separate the boundary case from the usual calculation.
shape: Implement the stated branch or formula, then run both normal and boundary cases.
```
