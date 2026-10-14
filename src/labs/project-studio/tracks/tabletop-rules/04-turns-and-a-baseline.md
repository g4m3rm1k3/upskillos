---
title: 6.4 — A match is a sequence of legal turns
runtime: none
---

### The story so far

Scoring and the card are separate from rolling. Combine them in a model that knows nothing about the DOM.

### What this lesson builds

Implement the next rule boundary and explain it with known inputs before connecting it to the interface.

## Turn the rule into examples

newYahtzee creates separate cards with separate calls to blankCard. Rolls begin at zero; holdDie refuses holds before rolling. rollHand rerolls only unheld dice and counts the roll. scoreTurn records once, advances the turn count and switches player with 1-player. After 26 accepted scores the match is done. fill(false) releases all holds. greedyCategory scans legal choices and keeps the highest immediate score; strict > gives a stable first-choice tie break. It is a simple heuristic, not machine learning.



```predict
question: What does a fourth roll change?
choice: Nothing
choice: Only the random dice
answer: Nothing
explain: The guard rejects the entire action before sampling.
```

## Implement newYahtzee

Add the named function to rules.mjs. Read its arguments, returned value and mutation boundary against the explanation above. Unchanged functions remain visible in the diff as context.

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

## Implement rollHand

Add the named function to rules.mjs. Read its arguments, returned value and mutation boundary against the explanation above. Unchanged functions remain visible in the diff as context.

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

## Implement holdDie

Add the named function to rules.mjs. Read its arguments, returned value and mutation boundary against the explanation above. Unchanged functions remain visible in the diff as context.

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

## Implement scoreTurn

Add the named function to rules.mjs. Read its arguments, returned value and mutation boundary against the explanation above. Unchanged functions remain visible in the diff as context.

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

## Implement greedyCategory

Add the named function to rules.mjs. Read its arguments, returned value and mutation boundary against the explanation above. Unchanged functions remain visible in the diff as context.

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
