---
title: 6.4 — A match is a sequence of legal turns
runtime: none
---

### The story so far

Scoring and the card are separate from rolling. Combine them in a model that knows nothing about the DOM.

### What this lesson builds

Implement the next rule boundary and explain it with known inputs before connecting it to the interface.

## Turn the rule into examples

Write the expected turn sequence: first player rolls, may hold and reroll up to three times, records one category, then the other player acts. A fourth roll and a second score must leave state unchanged. Two players filling all thirteen categories each finish after 26 accepted scoring turns. We will connect these rules without any DOM code.

```predict
question: What does a fourth roll change?
choice: Nothing
choice: Only the random dice
answer: Nothing
explain: The guard rejects the entire action before sampling.
```

## Implement newYahtzee

A match object groups two cards, current player, hand, hold flags, roll count, accepted turn count and completion flag. player is 0 or 1. Five initial ones are placeholders, not a roll: rolls is 0, so scoring is forbidden. cards uses two calls to blankCard, creating independent ledgers. The object is data; it has no DOM references and schedules no opponent by itself.

```javascript file=rules.mjs
import { rollFace } from './rng.mjs';

export const categories = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
  'Three of a kind', 'Four of a kind', 'Full house', 'Small straight',
  'Large straight', 'Yahtzee', 'Chance'];

export function countsOf(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const face of dice) {
    if (!Number.isInteger(face) || face < 1 || face > 6) throw new Error('Invalid face');
    counts[face] += 1;
  }
  return counts;
}

export function points(dice, category, joker = false) {
  const counts = countsOf(dice);
  let sum = 0;
  for (const face of dice) sum += face;
  if (category < 6) return counts[category + 1] * (category + 1);
  const largest = Math.max(...counts);
  if (category === 6) return largest >= 3 ? sum : 0;
  if (category === 7) return largest >= 4 ? sum : 0;
  if (category === 8) return joker || (counts.includes(3) && counts.includes(2)) ? 25 : 0;
  let run = 0;
  let longest = 0;
  for (let face = 1; face <= 6; face += 1) {
    run = counts[face] > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  if (category === 9) return joker || longest >= 4 ? 30 : 0;
  if (category === 10) return joker || longest >= 5 ? 40 : 0;
  if (category === 11) return largest === 5 ? 50 : 0;
  if (category === 12) return sum;
  throw new Error('Unknown category');
}

export function blankCard() {
  return { scores: Array(13).fill(null), extra: 0 };
}
export function total(card) {
  let upper = 0;
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const value = card.scores[i] ?? 0;
    sum += value;
    if (i < 6) upper += value;
  }
  return { base: sum, upper: upper >= 63 ? 35 : 0, extra: card.extra,
    all: sum + (upper >= 63 ? 35 : 0) + card.extra };
}

export function legalCategories(card, dice) {
  const empty = [];
  for (let i = 0; i < 13; i += 1) if (card.scores[i] === null) empty.push(i);
  const repeated = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  if (!repeated) return empty;
  const upper = dice[0] - 1;
  if (card.scores[upper] === null) return [upper];
  const lower = empty.filter(function (i) { return i >= 6; });
  return lower.length > 0 ? lower : empty;
}
export function preview(card, dice, category) {
  if (!legalCategories(card, dice).includes(category)) return null;
  const joker = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  return points(dice, category, joker);
}
export function record(card, dice, category) {
  const score = preview(card, dice, category);
  if (score === null) return false;
  const extra = Math.max(...countsOf(dice)) === 5 && card.scores[11] === 50;
  card.scores[category] = score;
  if (extra) card.extra += 100;
  return true;
}

export function newYahtzee() {
  return { cards: [blankCard(), blankCard()], player: 0, dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false], rolls: 0, turns: 0, done: false };
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```


**Explore, then restore:** Create two matches and mutate one card in the first. Verify both its opponent card and the second match stay unchanged. Draw the arrays and object references if any result surprises you.

## Implement rollHand

Refuse a finished match or a fourth roll before sampling. On the first roll, every position changes regardless of stale holds; later only unheld positions change. !state.held[i] || state.rolls===0 expresses those alternatives. The random argument defaults to Math.random but can be a controlled function in tests. Increment rolls once after the loop and return true. On rejection return false and leave every field untouched.

```javascript file=rules.mjs
import { rollFace } from './rng.mjs';

export const categories = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
  'Three of a kind', 'Four of a kind', 'Full house', 'Small straight',
  'Large straight', 'Yahtzee', 'Chance'];

export function countsOf(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const face of dice) {
    if (!Number.isInteger(face) || face < 1 || face > 6) throw new Error('Invalid face');
    counts[face] += 1;
  }
  return counts;
}

export function points(dice, category, joker = false) {
  const counts = countsOf(dice);
  let sum = 0;
  for (const face of dice) sum += face;
  if (category < 6) return counts[category + 1] * (category + 1);
  const largest = Math.max(...counts);
  if (category === 6) return largest >= 3 ? sum : 0;
  if (category === 7) return largest >= 4 ? sum : 0;
  if (category === 8) return joker || (counts.includes(3) && counts.includes(2)) ? 25 : 0;
  let run = 0;
  let longest = 0;
  for (let face = 1; face <= 6; face += 1) {
    run = counts[face] > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  if (category === 9) return joker || longest >= 4 ? 30 : 0;
  if (category === 10) return joker || longest >= 5 ? 40 : 0;
  if (category === 11) return largest === 5 ? 50 : 0;
  if (category === 12) return sum;
  throw new Error('Unknown category');
}

export function blankCard() {
  return { scores: Array(13).fill(null), extra: 0 };
}
export function total(card) {
  let upper = 0;
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const value = card.scores[i] ?? 0;
    sum += value;
    if (i < 6) upper += value;
  }
  return { base: sum, upper: upper >= 63 ? 35 : 0, extra: card.extra,
    all: sum + (upper >= 63 ? 35 : 0) + card.extra };
}

export function legalCategories(card, dice) {
  const empty = [];
  for (let i = 0; i < 13; i += 1) if (card.scores[i] === null) empty.push(i);
  const repeated = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  if (!repeated) return empty;
  const upper = dice[0] - 1;
  if (card.scores[upper] === null) return [upper];
  const lower = empty.filter(function (i) { return i >= 6; });
  return lower.length > 0 ? lower : empty;
}
export function preview(card, dice, category) {
  if (!legalCategories(card, dice).includes(category)) return null;
  const joker = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  return points(dice, category, joker);
}
export function record(card, dice, category) {
  const score = preview(card, dice, category);
  if (score === null) return false;
  const extra = Math.max(...countsOf(dice)) === 5 && card.scores[11] === 50;
  card.scores[category] = score;
  if (extra) card.extra += 100;
  return true;
}

export function newYahtzee() {
  return { cards: [blankCard(), blankCard()], player: 0, dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false], rolls: 0, turns: 0, done: false };
}
export function rollHand(state, random = Math.random) {
  if (state.done || state.rolls >= 3) return false;
  for (let i = 0; i < 5; i += 1) {
    if (!state.held[i] || state.rolls === 0) state.dice[i] = rollFace(random);
  }
  state.rolls += 1;
  return true;
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```


**Explore, then restore:** Use () => 0 to force ones. Hold index 0 and reroll with () => 0.999; expect [1,6,6,6,6]. Count samples with a callback that increments a local counter: the reroll should request four, not five.


Before checking, predict this observation: **held die stays one and exactly four samples are consumed**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {newYahtzee,rollHand} from './rules.mjs';const s=newYahtzee();rollHand(s,()=>0);s.held[0]=true;let calls=0;rollHand(s,()=>{calls++;return .999});assert.deepEqual(s.dice,[1,6,6,6,6]);assert.equal(calls,4);\""
```

## Implement holdDie

A hold is meaningful only after at least one roll and before the final roll. Reject done, rolls 0 or >=3 and an index outside the five positions. The UI supplies integer indices from its loop. After the guard, negation flips exactly one Boolean and return true reports success. No die is sampled and no score changes.

```javascript file=rules.mjs
import { rollFace } from './rng.mjs';

export const categories = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
  'Three of a kind', 'Four of a kind', 'Full house', 'Small straight',
  'Large straight', 'Yahtzee', 'Chance'];

export function countsOf(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const face of dice) {
    if (!Number.isInteger(face) || face < 1 || face > 6) throw new Error('Invalid face');
    counts[face] += 1;
  }
  return counts;
}

export function points(dice, category, joker = false) {
  const counts = countsOf(dice);
  let sum = 0;
  for (const face of dice) sum += face;
  if (category < 6) return counts[category + 1] * (category + 1);
  const largest = Math.max(...counts);
  if (category === 6) return largest >= 3 ? sum : 0;
  if (category === 7) return largest >= 4 ? sum : 0;
  if (category === 8) return joker || (counts.includes(3) && counts.includes(2)) ? 25 : 0;
  let run = 0;
  let longest = 0;
  for (let face = 1; face <= 6; face += 1) {
    run = counts[face] > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  if (category === 9) return joker || longest >= 4 ? 30 : 0;
  if (category === 10) return joker || longest >= 5 ? 40 : 0;
  if (category === 11) return largest === 5 ? 50 : 0;
  if (category === 12) return sum;
  throw new Error('Unknown category');
}

export function blankCard() {
  return { scores: Array(13).fill(null), extra: 0 };
}
export function total(card) {
  let upper = 0;
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const value = card.scores[i] ?? 0;
    sum += value;
    if (i < 6) upper += value;
  }
  return { base: sum, upper: upper >= 63 ? 35 : 0, extra: card.extra,
    all: sum + (upper >= 63 ? 35 : 0) + card.extra };
}

export function legalCategories(card, dice) {
  const empty = [];
  for (let i = 0; i < 13; i += 1) if (card.scores[i] === null) empty.push(i);
  const repeated = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  if (!repeated) return empty;
  const upper = dice[0] - 1;
  if (card.scores[upper] === null) return [upper];
  const lower = empty.filter(function (i) { return i >= 6; });
  return lower.length > 0 ? lower : empty;
}
export function preview(card, dice, category) {
  if (!legalCategories(card, dice).includes(category)) return null;
  const joker = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  return points(dice, category, joker);
}
export function record(card, dice, category) {
  const score = preview(card, dice, category);
  if (score === null) return false;
  const extra = Math.max(...countsOf(dice)) === 5 && card.scores[11] === 50;
  card.scores[category] = score;
  if (extra) card.extra += 100;
  return true;
}

export function newYahtzee() {
  return { cards: [blankCard(), blankCard()], player: 0, dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false], rolls: 0, turns: 0, done: false };
}
export function rollHand(state, random = Math.random) {
  if (state.done || state.rolls >= 3) return false;
  for (let i = 0; i < 5; i += 1) {
    if (!state.held[i] || state.rolls === 0) state.dice[i] = rollFace(random);
  }
  state.rolls += 1;
  return true;
}
export function holdDie(state, index) {
  if (state.done || state.rolls === 0 || state.rolls >= 3 || index < 0 || index >= 5) return false;
  state.held[index] = !state.held[index];
  return true;
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```


**Explore, then restore:** Call holdDie twice on index 2 after a roll. The flag returns to its original value. Try it before the first roll and after roll three: both calls should return false and change nothing.


Before checking, predict this observation: **holds are refused before rolling and two toggles cancel**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {newYahtzee,rollHand,holdDie} from './rules.mjs';const s=newYahtzee();assert.equal(holdDie(s,2),false);rollHand(s,()=>0);holdDie(s,2);holdDie(s,2);assert.equal(s.held[2],false);\""
```

## Implement scoreTurn

The || guard short-circuits: record is reached only if the match is active and a roll exists. If record rejects the category, no turn advances. After an accepted record, increment turns. Two players using thirteen categories each require 26 accepted choices. Only then is done true. `1 - state.player` swaps 0 and 1; it is arithmetic, not a special switching instruction. Reset rolls and use fill(false) to release holds for the next turn.

```javascript file=rules.mjs
import { rollFace } from './rng.mjs';

export const categories = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
  'Three of a kind', 'Four of a kind', 'Full house', 'Small straight',
  'Large straight', 'Yahtzee', 'Chance'];

export function countsOf(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const face of dice) {
    if (!Number.isInteger(face) || face < 1 || face > 6) throw new Error('Invalid face');
    counts[face] += 1;
  }
  return counts;
}

export function points(dice, category, joker = false) {
  const counts = countsOf(dice);
  let sum = 0;
  for (const face of dice) sum += face;
  if (category < 6) return counts[category + 1] * (category + 1);
  const largest = Math.max(...counts);
  if (category === 6) return largest >= 3 ? sum : 0;
  if (category === 7) return largest >= 4 ? sum : 0;
  if (category === 8) return joker || (counts.includes(3) && counts.includes(2)) ? 25 : 0;
  let run = 0;
  let longest = 0;
  for (let face = 1; face <= 6; face += 1) {
    run = counts[face] > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  if (category === 9) return joker || longest >= 4 ? 30 : 0;
  if (category === 10) return joker || longest >= 5 ? 40 : 0;
  if (category === 11) return largest === 5 ? 50 : 0;
  if (category === 12) return sum;
  throw new Error('Unknown category');
}

export function blankCard() {
  return { scores: Array(13).fill(null), extra: 0 };
}
export function total(card) {
  let upper = 0;
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const value = card.scores[i] ?? 0;
    sum += value;
    if (i < 6) upper += value;
  }
  return { base: sum, upper: upper >= 63 ? 35 : 0, extra: card.extra,
    all: sum + (upper >= 63 ? 35 : 0) + card.extra };
}

export function legalCategories(card, dice) {
  const empty = [];
  for (let i = 0; i < 13; i += 1) if (card.scores[i] === null) empty.push(i);
  const repeated = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  if (!repeated) return empty;
  const upper = dice[0] - 1;
  if (card.scores[upper] === null) return [upper];
  const lower = empty.filter(function (i) { return i >= 6; });
  return lower.length > 0 ? lower : empty;
}
export function preview(card, dice, category) {
  if (!legalCategories(card, dice).includes(category)) return null;
  const joker = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  return points(dice, category, joker);
}
export function record(card, dice, category) {
  const score = preview(card, dice, category);
  if (score === null) return false;
  const extra = Math.max(...countsOf(dice)) === 5 && card.scores[11] === 50;
  card.scores[category] = score;
  if (extra) card.extra += 100;
  return true;
}

export function newYahtzee() {
  return { cards: [blankCard(), blankCard()], player: 0, dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false], rolls: 0, turns: 0, done: false };
}
export function rollHand(state, random = Math.random) {
  if (state.done || state.rolls >= 3) return false;
  for (let i = 0; i < 5; i += 1) {
    if (!state.held[i] || state.rolls === 0) state.dice[i] = rollFace(random);
  }
  state.rolls += 1;
  return true;
}
export function holdDie(state, index) {
  if (state.done || state.rolls === 0 || state.rolls >= 3 || index < 0 || index >= 5) return false;
  state.held[index] = !state.held[index];
  return true;
}
export function scoreTurn(state, category) {
  if (state.done || state.rolls === 0 || !record(state.cards[state.player], state.dice, category)) return false;
  state.turns += 1;
  state.done = state.turns === 26;
  if (!state.done) state.player = 1 - state.player;
  state.rolls = 0;
  state.held.fill(false);
  return true;
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```


**Explore, then restore:** Score once, then immediately call scoreTurn again before rolling. The second call must fail and turns must remain 1. Temporarily move turns+=1 above the guard and predict the damage; restore it before running the checks.


Before checking, predict this observation: **only the first scoring call advances a turn**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {newYahtzee,rollHand,scoreTurn} from './rules.mjs';const s=newYahtzee();rollHand(s,()=>0);assert.equal(scoreTurn(s,0),true);assert.equal(scoreTurn(s,1),false);assert.equal(s.turns,1);\""
```

## Implement greedyCategory

The rule baseline scans legal candidates only. Start best at the first legal index, then replace it only for a strictly larger preview. A tie therefore keeps the earlier candidate. This is an argmax: return the index that achieves the maximum, not the maximum score itself. The caller uses that index to record the category. Call it only while a legal unused category remains.

For a hand of sixes, different categories can tie on their immediate sum. This baseline ignores future category scarcity and rolls only once in the eventual controller. It is intentionally a simple opponent for comparison, not a trained policy.

```javascript file=rules.mjs
import { rollFace } from './rng.mjs';

export const categories = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
  'Three of a kind', 'Four of a kind', 'Full house', 'Small straight',
  'Large straight', 'Yahtzee', 'Chance'];

export function countsOf(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const face of dice) {
    if (!Number.isInteger(face) || face < 1 || face > 6) throw new Error('Invalid face');
    counts[face] += 1;
  }
  return counts;
}

export function points(dice, category, joker = false) {
  const counts = countsOf(dice);
  let sum = 0;
  for (const face of dice) sum += face;
  if (category < 6) return counts[category + 1] * (category + 1);
  const largest = Math.max(...counts);
  if (category === 6) return largest >= 3 ? sum : 0;
  if (category === 7) return largest >= 4 ? sum : 0;
  if (category === 8) return joker || (counts.includes(3) && counts.includes(2)) ? 25 : 0;
  let run = 0;
  let longest = 0;
  for (let face = 1; face <= 6; face += 1) {
    run = counts[face] > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  if (category === 9) return joker || longest >= 4 ? 30 : 0;
  if (category === 10) return joker || longest >= 5 ? 40 : 0;
  if (category === 11) return largest === 5 ? 50 : 0;
  if (category === 12) return sum;
  throw new Error('Unknown category');
}

export function blankCard() {
  return { scores: Array(13).fill(null), extra: 0 };
}
export function total(card) {
  let upper = 0;
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const value = card.scores[i] ?? 0;
    sum += value;
    if (i < 6) upper += value;
  }
  return { base: sum, upper: upper >= 63 ? 35 : 0, extra: card.extra,
    all: sum + (upper >= 63 ? 35 : 0) + card.extra };
}

export function legalCategories(card, dice) {
  const empty = [];
  for (let i = 0; i < 13; i += 1) if (card.scores[i] === null) empty.push(i);
  const repeated = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  if (!repeated) return empty;
  const upper = dice[0] - 1;
  if (card.scores[upper] === null) return [upper];
  const lower = empty.filter(function (i) { return i >= 6; });
  return lower.length > 0 ? lower : empty;
}
export function preview(card, dice, category) {
  if (!legalCategories(card, dice).includes(category)) return null;
  const joker = Math.max(...countsOf(dice)) === 5 && card.scores[11] !== null;
  return points(dice, category, joker);
}
export function record(card, dice, category) {
  const score = preview(card, dice, category);
  if (score === null) return false;
  const extra = Math.max(...countsOf(dice)) === 5 && card.scores[11] === 50;
  card.scores[category] = score;
  if (extra) card.extra += 100;
  return true;
}

export function newYahtzee() {
  return { cards: [blankCard(), blankCard()], player: 0, dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false], rolls: 0, turns: 0, done: false };
}
export function rollHand(state, random = Math.random) {
  if (state.done || state.rolls >= 3) return false;
  for (let i = 0; i < 5; i += 1) {
    if (!state.held[i] || state.rolls === 0) state.dice[i] = rollFace(random);
  }
  state.rolls += 1;
  return true;
}
export function holdDie(state, index) {
  if (state.done || state.rolls === 0 || state.rolls >= 3 || index < 0 || index >= 5) return false;
  state.held[index] = !state.held[index];
  return true;
}
export function scoreTurn(state, category) {
  if (state.done || state.rolls === 0 || !record(state.cards[state.player], state.dice, category)) return false;
  state.turns += 1;
  state.done = state.turns === 26;
  if (!state.done) state.player = 1 - state.player;
  state.rolls = 0;
  state.held.fill(false);
  return true;
}
export function greedyCategory(card, dice) {
  const legal = legalCategories(card, dice);
  let best = legal[0];
  for (const i of legal) if (preview(card, dice, i) > preview(card, dice, best)) best = i;
  return best;
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```


**Explore, then restore:** Construct two equal-scoring legal categories and reverse their supplied order in a scratch argmax. The chosen index should follow the first entry on a tie. Explain why >= would choose the last tie instead.

## Try it — Reject a plausible mistake

Temporarily use [card,card] for the player cards. Recording for one also changes the other because both entries share an object. Restore two calls to blankCard.



## Your turn — Choose a legal maximum

Define solve(scores, legal) returning the first legal index with the largest score. Assume legal is nonempty. Export the function as solve.

Write practice/04-turns-and-a-baseline.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/04-turns-and-a-baseline.mjs'; if (!(solve([99,4,8],[1,2])===2 && solve([8,8],[1,0])===1)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Which boundary case distinguishes the rule?
concept: Use the stated contract, including the equality/absence case.
shape: Write the simplest loop or branch that preserves the boundary, then test the exceptional case too.
```
