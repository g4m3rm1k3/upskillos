---
title: 10.3 — Wait for the opponent’s reply
runtime: none
---

### The story so far

An action can leave you still rolling or pass play to the opponent. A learning transition must end at your own next decision.

### What this lesson builds

Explain the learning operation with a hand-calculated case, then implement and test it.

## Work through the decision

The agent always trains as seat 0 against a fixed hold-at-10 seat 1. If it holds or busts, simulate the opponent until seat 0 acts again or the game ends. Otherwise maximizing the next row would optimize the other player's interests. moves bounds an episode; a capped unfinished episode is reported as null, not a win or loss. continue jumps to the next loop iteration. The final assignment updates exactly the chosen action at the OLD state key. Object tables create a row only when a training update requires it.



```predict
question: After the agent holds, whose response belongs in its transition?
choice: The opponent’s whole turn
choice: Only the next die roll regardless of player
answer: The opponent’s whole turn
explain: The successor must be another agent decision or a terminal state.
```

## Implement episode

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check learning.mjs"
```

## Try it — Find evidence of the mistake

Trace agent hold → opponent roll 4 → roll 6 → hold → agent decision. Write the old state, reward and successor explicitly. Then trace opponent win; reward is -1 and there is no bootstrap.



## Your turn — Get terminal reward right

Define solve(winner) giving +1 for agent seat 0, -1 for seat 1, and 0 for null. Export the function as solve.

Write practice/03-a-complete-transition.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/03-a-complete-transition.mjs'; if (!(solve(0)===1 && solve(1)===-1 && solve(null)===0)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Write one concrete input and expected output first.
concept: Separate the boundary case from the usual calculation.
shape: Implement the stated branch or formula, then run both normal and boundary cases.
```
