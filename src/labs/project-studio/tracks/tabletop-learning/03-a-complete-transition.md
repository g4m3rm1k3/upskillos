---
title: 10.3 — Wait for the opponent’s reply
runtime: none
---

### The story so far

An action can leave you still rolling or pass play to the opponent. A learning transition must end at your own next decision.

### What this lesson builds

Explain the learning operation with a hand-calculated case, then implement and test it.

## Work through the decision

You hold seven points and pass play. Has the consequence of your choice finished? The opponent can still bank points or win before your next decision. We will trace that whole reply first, then decide which old choice receives the learning update.

```predict
question: After the agent holds, whose response belongs in its transition?
choice: The opponent’s whole turn
choice: Only the next die roll regardless of player
answer: The opponent’s whole turn
explain: The successor must be another agent decision or a terminal state.
```

## Observe the successor before updating {#successor-trace}

Use a known state instead of a whole training run: learner bank 8, opponent bank 12, learner unbanked 7. Holding makes the learner bank 15 and passes play. The opponent rolls 4 then 6, reaches its hold-at-10 threshold and banks 10. Only then is the learner's next decision reached: scores [15,22], player 0, turn 0.

The source below returns samples .5 and .9, which map to faces 4 and 6. shift removes and returns the first array entry; ?? 0 is a fallback if extra rolls were unexpectedly requested. The while loop runs only while seat 1 is acting and the game is live. Record the state after each printed line. Then change the opponent's starting bank to 25: after its first 4 it has not won until it banks; after the next roll its baseline banks a win. In that case there is no next learner decision. Restore bank 12 for the check.

```javascript file=scratch/successor.mjs
import { newPig, move, baseline } from '../pig.mjs';
const state = newPig();
state.scores = [8, 12];
state.turn = 7;
const samples = [0.5, 0.9];
function random() { return samples.shift() ?? 0; }
move(state, 'hold', random);
console.log('After learner hold:', JSON.stringify(state.scores));
while (state.player === 1 && state.winner === null) {
  move(state, baseline(state), random);
}
console.log('Next decision:', JSON.stringify(state.scores), state.player, state.turn);
```

```check
run "node scratch/successor.mjs" stdout="Next decision: [15,22] 0 0"
```

## Implement episode

An episode is one complete training game, including both players. Create a fresh game, but receive the existing learned table as an argument. moves counts individual roll/hold actions so an unexpectedly long game can be capped. The outer while continues only while no winner exists and the cap has not been reached.

There are three stages per learner update:

1. If seat 1 acts first, let the fixed baseline move and continue to the next outer iteration. continue skips the rest of this loop body. Do not create a learner update for an opponent's action.
2. On seat 0's decision, capture the OLD state key and chosen action index BEFORE moving. Perform the learner move, then run the entire opponent reply until seat 0 acts again or someone wins. Each move increments the cap counter. If the cap ends an unfinished reply, return null without inventing terminal reward.
3. At the successor, terminal means winner!==null. A terminal reward is +1 for winner 0 or -1 for winner 1; otherwise reward is 0. Read successor values. If turn===0, only roll is legal so nextBest=row[0]; otherwise use the larger action estimate. update ignores nextBest for terminal transitions. Initialize the old row if needed, then assign only table[oldKey][chosenIndex].

The assignment combines two different times: the left side identifies the old choice being learned about, while nextBest comes from the next learner decision. Updating the successor row instead would attach evidence to the wrong action. Return winner at completion, retaining 0 as a valid winner rather than treating it as absence.

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


**Explore, then restore:** Follow the scratch successor example and mark exactly where old key is captured. Temporarily move that capture after move in a scratch copy and explain which row receives misplaced credit. Restore it. Use a controlled source returning 0: repeated busts hit the cap and must return null rather than a false win.


Before checking, predict this observation: **a normal seeded game updates rows; an all-bust stream reports truncation**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {episode} from './learning.mjs';import {seeded} from './rng.mjs';const table={};const winner=episode(table,seeded(7),.2,0);assert.ok(winner===0 || winner===1);assert.ok(Object.keys(table).length>0);assert.equal(episode({},()=>0,0,0),null);\""
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
nudge: Seat zero is a real winner, despite being false in a Boolean context.
concept: Use strict comparisons with 0, 1 and null.
shape: Return a reward for each winner value; do not use if(winner) as the test.
```
