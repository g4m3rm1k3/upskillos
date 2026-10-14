---
title: 10.1 — What the model learns
runtime: none
---

### The story so far

A policy chooses an action from a state. A Q-table estimates the value of each action in each state. It is a learned model even though it is not a neural network. Pig's key includes own banked score, opponent banked score and unbanked turn points. Row position 0 means roll; 1 means hold. Missing rows return [0,0].

### What this lesson builds

Explain the learning operation with a hand-calculated case, then implement and test it.

## Work through the decision

Imagine that rolling in one particular situation currently has an estimate of **0.2**. You try it and eventually win. The observed reward is **1**. Replacing 0.2 with 1 would treat one lucky game as the whole truth. Instead, move one tenth of the way toward the new evidence:

1. Find the gap: `1 - 0.2 = 0.8`.
2. Take one tenth of that gap: `0.1 * 0.8 = 0.08`.
3. Add the correction to the old estimate: `0.2 + 0.08 = 0.28`.

Here `*` means multiplication. The learning rate, called **alpha**, is the fraction of the gap we use. Alpha 0 makes no correction; alpha 1 replaces the estimate with this observation. Alpha 0.1 is 10%, not ten whole points. A fixed small rate keeps reacting to new evidence; it does not make every observed game equally weighted like a simple average.

Our objective is winning. We choose rewards of +1 for a win, -1 for a loss and 0 while a game continues. These are feedback numbers, not Pig's banked score. A **terminal** transition ends the game. A **transition** is one recorded learning experience: the old state and action, followed by the reward and next decision (or game end). For now we will supply these numbers by hand; lesson 10.3 explains how to collect a whole transition including the opponent's response.

A loss also teaches. Starting from 0.2 with reward -1 and alpha 0.1, the gap is `-1 - 0.2 = -1.2`, the correction is -0.12 and the new value is **0.08**. One loss lowers the estimate without necessarily making it negative. Repeated evidence changes it gradually.

If the game continues, we have no final result yet. Suppose the best **legal** next action has an estimate of 0.5. We temporarily use that estimate as evidence. This is called **bootstrapping**: learning partly from another estimate, rather than only from a final observed result. Multiply the future estimate by a discount factor, **gamma**, between 0 and 1. With gamma 0.9 and immediate reward 0, the target is `0 + 0.9 * 0.5 = 0.45`. Starting from 0.2, the gap is 0.25; at alpha 0.1 the correction is 0.025, giving **0.225**.

Now name the two calculations we just performed:

- Terminal target: `reward` alone. There is no future decision after game end.
- Continuing target: `reward + gamma * nextBest`.
- In either case: `new = old + alpha * (target - old)`.

The implementation defaults to gamma 0.99 and alpha 0.15. The hand examples deliberately pass different values so you can check the arithmetic. Discounting reduces the magnitude of distant outcomes: it favors earlier positive rewards, but can also make later negative rewards less costly. It does **not** simply mean “always finish sooner.” A Q-value estimates discounted return under the learning setup. With negative loss rewards and discounting, **0.28 does not mean a 28% chance of winning**.

Before continuing, calculate a terminal update from old -0.4, reward 1 and alpha 0.25. The gap is 1.4, correction 0.35, result -0.05. Explain why a win can leave an estimate below zero.

```predict
question: Does a terminal win use a successor Q-value?
choice: No
choice: Yes
answer: No
explain: The episode has ended; there is no successor decision to bootstrap.
```

## Implement values

The object `table` maps a state key to a two-number array. For example, key `"4,9,3"` means the acting player has 4 banked points, the opponent has 9, and the acting player has 3 unbanked. A stored row `[0.2, -0.1]` estimates roll then hold. A **policy** is the rule for choosing an action from this information; this lesson only reads and updates values, not the choice rule.

Read `table[stateKey(state)]` inside out: call the earlier `stateKey` function, then use the returned string in brackets to look up that object's property. An absent property returns `undefined`. `??` is the nullish-coalescing operator from the modern-JavaScript lesson: it uses `[0, 0]` only when the lookup is `null` or `undefined`. It does not overwrite an existing zero estimate. The fallback array is returned without inserting a row into the table.

`export` makes `values` available to other modules. `return` hands the row to its caller. For an existing row this is the same array object, not a copy: changing a returned element would change the table. Merely reading it does not. The later training lesson owns mutations.

The imports name helpers from earlier lessons. Several are not used until subsequent steps expand this file. No code from another series is required.

```javascript file=learning.mjs
import { seeded } from './rng.mjs';
import { TARGET, newPig, actions, move, baseline, stateKey } from './pig.mjs';

export function values(table, state) {
  return table[stateKey(state)] ?? [0, 0];
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check learning.mjs"
```

## Implement update

Read the function's six parameters in call order: old estimate, observed reward, best legal next estimate, whether the game ended, learning rate, discount. `terminal` is a boolean (`true` or `false`). Parameters `alpha = 0.15` and `gamma = 0.99` have defaults used only when the caller omits them or supplies `undefined`; passing 0 is allowed and uses 0.

The expression `terminal ? reward : reward + gamma * nextBest` uses the conditional operator: when terminal is true, take the part before `:`, otherwise the part after it. Only the chosen branch is evaluated. Multiplication happens before addition. Parentheses in `(target - old)` force that subtraction before multiplying by alpha. `const target` names an intermediate result so you can inspect the calculation.

`update` returns a number. It does not change a table, modify old, or choose an action. Its caller must store the returned result. Keep this calculation separate from game simulation so we can test its arithmetic without random rolls.

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check learning.mjs"
```

## Check the arithmetic with real calls {#arithmetic-check}

Create this small test file. `assert` is Node's built-in checking module from the testing chapter; `assert.ok(condition)` throws if its condition is false. Computers approximate many decimal fractions, so `Math.abs(actual - expected) < 1e-12` checks that the absolute error is smaller than 0.000000000001. `1e-12` is scientific notation for that small number. `assert.equal` checks exact equality; `deepEqual` compares the contents of arrays or objects. These tests exercise the imported functions, not a second copy of their formulas.

```javascript file=scratch/check-update.mjs
import assert from 'node:assert/strict';
import { newPig } from '../pig.mjs';
import { values, update } from '../learning.mjs';

assert.ok(Math.abs(update(0.2, 1, 999, true, 0.1) - 0.28) < 1e-12);
assert.ok(Math.abs(update(0.2, -1, 999, true, 0.1) - 0.08) < 1e-12);
assert.ok(Math.abs(update(0.2, 0, 0.5, false, 0.1, 0.9) - 0.225) < 1e-12);
assert.equal(update(0.2, 1, 999, true, 0), 0.2);
assert.equal(update(0.2, 1, 999, true, 1), 1);
const table = {};
assert.deepEqual(values(table, newPig()), [0, 0]);
assert.deepEqual(table, {});
console.log('PASS update arithmetic and read-only lookup');
```

The deliberately absurd next estimate 999 must have no effect on a terminal result. The alpha boundary cases establish “no change” and “replace completely.” The last assertions establish that looking up an unseen state does not create a row. Run `node scratch/check-update.mjs` from the project folder. These cases establish these properties, not convergence of an entire trained policy.

```check
run "node scratch/check-update.mjs" stdout="PASS update arithmetic and read-only lookup"
```

## Try it — Find evidence of the mistake

In `update`, temporarily remove the conditional and always use `reward + gamma * nextBest` as the target. Run `node scratch/check-update.mjs`: the first assertion should fail because a finished game incorrectly borrows value from a nonexistent future. Restore the conditional and rerun until PASS. Then predict and try changing alpha from 0.1 to 0.5 in a scratch call: the terminal win update from 0.2 becomes 0.6. Do not alter the expected values merely to make a broken implementation pass.



## Your turn — Update a terminal value

Define `solve(old, reward, alpha)` applying a terminal update and export it as `solve`. Do not import or call `update`: reconstruct the calculation yourself. It must return a number without printing it or changing outside state. Check a win (0.2, 1, 0.1 → 0.28), a loss (0.2, -1, 0.1 → 0.08), alpha 0 (unchanged), and alpha 1 (equal to reward). Explain why this function needs no next-state value. Then choose a starting negative value and verify one update by hand.

Write practice/01-a-value-is-an-estimate.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/01-a-value-is-an-estimate.mjs'; if (!(Math.abs(solve(0.2,1,0.1)-0.28)<1e-12 && Math.abs(solve(0.2,-1,0.1)-0.08)<1e-12 && solve(0.2,1,0)===0.2 && solve(0.2,1,1)===1)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: From 0.2 to 1, what is the gap, and what is one tenth of it?
concept: A terminal target is just the reward. Add a fraction of the gap to the old estimate.
shape: Compute a difference, multiply it by alpha, then add that correction to old. Return that value.
```
