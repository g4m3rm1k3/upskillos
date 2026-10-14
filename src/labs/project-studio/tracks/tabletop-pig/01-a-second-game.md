---
title: 7.1 — Pig gives reuse a reason
runtime: none
---

### The story so far

Yahtzee has dice, a scorecard and turns. Pig needs dice and turns but no category card.

### What this lesson builds

Implement the short-match Pig rules without importing any Yahtzee scoring.

## Learn the game on paper

This course uses Pig to 30 banked points, explicitly a short-match variant. A roll of 2–6 adds to the current unbanked total. A 1 loses that turn total and passes play. Hold banks the turn total and passes play. Banking at least 30 wins immediately; no exact total is required. You cannot hold an empty turn in this implementation. Trace: roll 4, roll 6, hold → bank 10. Trace: roll 4, roll 1 → bank nothing. The other player's banked score never changes during your move.



```predict
question: You have 27 banked and 5 unbanked. Holding does what?
choice: Wins with 32
choice: Requires rolling exactly 3
answer: Wins with 32
explain: The target is a minimum, not an exact landing rule.
```

## Implement newPig

The optional start parameter chooses the first player. winner=null means the game is still running. Scores and turn points are separate so a bust can clear only the latter.

```javascript file=pig.mjs
import { rollFace } from './rng.mjs';

export const TARGET = 30;
export function newPig(start = 0) {
  return { scores: [0, 0], turn: 0, player: start, face: 1, winner: null };
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check pig.mjs"
```

## Implement actions

Return the legal action names. An empty array means the match is terminal. A zero turn permits only roll.

```javascript file=pig.mjs
import { rollFace } from './rng.mjs';

export const TARGET = 30;
export function newPig(start = 0) {
  return { scores: [0, 0], turn: 0, player: start, face: 1, winner: null };
}
export function actions(state) {
  if (state.winner !== null) return [];
  return state.turn === 0 ? ['roll'] : ['roll', 'hold'];
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check pig.mjs"
```

## Implement move

Reject an illegal action before sampling or mutating. Holding checks the winning condition before switching players. Rolling a 1 clears the turn and switches; other faces add. This is the same validation-before-mutation principle as Yahtzee, with different rules.

```javascript file=pig.mjs
import { rollFace } from './rng.mjs';

export const TARGET = 30;
export function newPig(start = 0) {
  return { scores: [0, 0], turn: 0, player: start, face: 1, winner: null };
}
export function actions(state) {
  if (state.winner !== null) return [];
  return state.turn === 0 ? ['roll'] : ['roll', 'hold'];
}
export function move(state, action, random = Math.random) {
  if (!actions(state).includes(action)) return false;
  const player = state.player;
  if (action === 'hold') {
    state.scores[player] += state.turn;
    state.turn = 0;
    if (state.scores[player] >= TARGET) state.winner = player;
    else state.player = 1 - player;
  } else {
    state.face = rollFace(random);
    if (state.face === 1) {
      state.turn = 0;
      state.player = 1 - player;
    } else state.turn += state.face;
  }
  return true;
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check pig.mjs"
```

## Implement baseline

This opponent holds at 10 unbanked, or earlier if banking wins. The threshold is a readable baseline, not a learned value.

```javascript file=pig.mjs
import { rollFace } from './rng.mjs';

export const TARGET = 30;
export function newPig(start = 0) {
  return { scores: [0, 0], turn: 0, player: start, face: 1, winner: null };
}
export function actions(state) {
  if (state.winner !== null) return [];
  return state.turn === 0 ? ['roll'] : ['roll', 'hold'];
}
export function move(state, action, random = Math.random) {
  if (!actions(state).includes(action)) return false;
  const player = state.player;
  if (action === 'hold') {
    state.scores[player] += state.turn;
    state.turn = 0;
    if (state.scores[player] >= TARGET) state.winner = player;
    else state.player = 1 - player;
  } else {
    state.face = rollFace(random);
    if (state.face === 1) {
      state.turn = 0;
      state.player = 1 - player;
    } else state.turn += state.face;
  }
  return true;
}
export function baseline(state) {
  if (state.turn >= 10 || state.scores[state.player] + state.turn >= TARGET) return 'hold';
  return 'roll';
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check pig.mjs"
```

## Implement stateKey

Represent the current player's own score, opponent score and turn total as comma-separated numbers. join joins array values into a string. Totals beyond the amount needed to win are equivalent for the roll/hold decision, so Math.min caps that coordinate. The current player's perspective matters when a trained table plays either seat.

```javascript file=pig.mjs
import { rollFace } from './rng.mjs';

export const TARGET = 30;
export function newPig(start = 0) {
  return { scores: [0, 0], turn: 0, player: start, face: 1, winner: null };
}
export function actions(state) {
  if (state.winner !== null) return [];
  return state.turn === 0 ? ['roll'] : ['roll', 'hold'];
}
export function move(state, action, random = Math.random) {
  if (!actions(state).includes(action)) return false;
  const player = state.player;
  if (action === 'hold') {
    state.scores[player] += state.turn;
    state.turn = 0;
    if (state.scores[player] >= TARGET) state.winner = player;
    else state.player = 1 - player;
  } else {
    state.face = rollFace(random);
    if (state.face === 1) {
      state.turn = 0;
      state.player = 1 - player;
    } else state.turn += state.face;
  }
  return true;
}
export function baseline(state) {
  if (state.turn >= 10 || state.scores[state.player] + state.turn >= TARGET) return 'hold';
  return 'roll';
}
export function stateKey(state) {
  const own = state.scores[state.player];
  const other = state.scores[1 - state.player];
  return [own, other, Math.min(state.turn, TARGET - own)].join(',');
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check pig.mjs"
```

## Try it — Bank too soon

Temporarily add every roll directly to scores. A later 1 no longer removes the turn's risk. Restore the separate turn field. Explain why two totals are required by the rules.



## Your turn — Recognize a winning bank

Define solve(banked, turn, target) returning true when banking reaches or exceeds target. Export the function as solve.

Write practice/01-a-second-game.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/01-a-second-game.mjs'; if (!(solve(27,5,30) && solve(25,5,30) && !solve(20,5,30))) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: What happens when you pass the target?
concept: The rule says at least, not exactly.
shape: Compare the sum against the target with an inclusive bound.
```
