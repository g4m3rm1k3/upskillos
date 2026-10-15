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

Pig uses banked scores plus one current turn total, not a category card. TARGET=30 names our short-match winning threshold. newPig(start=0) starts seat 0 unless the caller supplies another seat. Each call creates a fresh scores array. winner=null means ongoing; winner=0 means seat zero won, so never use truthiness to detect a winner. face starts at 1 only as a display placeholder.

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


**Explore, then restore:** Change the starting seat to 1 in a scratch call; the scores and turn should still be zero. Explain why sharing scores between two newPig results would corrupt training episodes.

## Implement actions

A model may prefer an action the rules forbid. actions returns the legal strings, not estimated values. Finished games return an empty array. With turn 0, only roll is legal; otherwise both roll and hold are legal. This boundary gives the UI and training policy the same definition of legality.

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


**Explore, then restore:** Ask for actions at turn 0, turn 4 and winner 0. Predict [roll], [roll,hold] and []. Explain why winner 0 must be checked against null rather than as a Boolean.

## Implement move

First reject any action absent from actions(state). Save player before changing state. On hold, add the unbanked total to that player's bank, then reset turn to 0. If the bank reached TARGET set winner; otherwise swap player using 1-player. On roll, sample once. A face of 1 clears only the unbanked total and passes play; faces 2–6 add to turn without changing player or bank.

Trace bank [8,12], player 0, turn 7: holding gives bank [15,12], turn 0, player 1. From the original state, rolling 1 gives bank [8,12], turn 0, player 1. A bust does not erase earlier banked points. Return true for an accepted action even when the outcome is bad; it means the action was legal, not that the player won.

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


**Explore, then restore:** Use random ()=>0 to force a bust and ()=>.999 to force six. Compare which fields change. Then try hold at turn 0: false and no mutation. Restore your fixture state before each trial.


Before checking, predict this observation: **busting loses the turn total, not banked points**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {newPig,move} from './pig.mjs';const s=newPig();s.scores=[8,12];s.turn=7;move(s,'roll',()=>0);assert.deepEqual(s.scores,[8,12]);assert.equal(s.turn,0);assert.equal(s.player,1);\""
```

## Implement baseline

This hand-written opponent holds when unbanked turn >=10 or banking now wins. Otherwise it rolls. The second condition matters at bank 29, turn 2: it should win immediately rather than chase ten unbanked points. It reads state without changing it. Call it on a live decision state; legal-action masking will protect policy choices separately.

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


**Explore, then restore:** Compare bank 0/turn 9 (roll), bank 0/turn 10 (hold), bank 29/turn 2 (hold). Explain which condition decides each outcome.

## Implement stateKey

The same learned policy must work from either seat. own reads scores[player]; other reads scores[1-player]. A state with scores [4,9], player 1 and turn 3 becomes key "9,4,3". join(',') converts the three array entries to one string separated by commas.

Cap unbanked points at TARGET-own. If own=28, turn 2 and turn 8 both permit an immediate winning hold. Treating those excess totals as the same state reduces the table; the hold outcome and capped roll successor behavior agree for this rule set. This abstraction is specific to short-match Pig, not a general rule for every game.

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


**Explore, then restore:** Compare keys for own 28 with turn 2 and 8: equal. Compare turn 1: different. Swap player and score order together and verify the relative key stays the same.

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
