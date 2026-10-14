---
title: 6.3 — Validate before recording
runtime: none
---

### The story so far

Every box can be used only once. A later five-of-a-kind can also trigger placement rules.

### What this lesson builds

Implement the next rule boundary and explain it with known inputs before connecting it to the interface.

## Turn the rule into examples

When another five-of-a-kind is rolled after the Yahtzee box was filled (even with zero), the matching upper box is required if empty. Otherwise choose an empty lower box; if none remain, choose any empty upper box. Under these Joker rules full house/small straight/large straight score their fixed values. A 100-point extra bonus is awarded only if the earlier Yahtzee box contains 50. legalCategories returns indices; filter keeps eligible lower indices. preview returns null for a forbidden choice and never mutates. record validates first, computes bonus eligibility from the OLD card, writes the score, then awards a bonus once.



```predict
question: Does a rejected choice earn a bonus?
choice: No
choice: Yes
answer: No
explain: The guard returns before either ledger changes.
```

## Implement legalCategories

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```

## Implement preview

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```

## Implement record

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```

## Try it — Reject a plausible mistake

On paper move extra += 100 above validation. An illegal attempt would award points. Keep validation first and trace first Yahtzee versus later Yahtzee: the first one is 50, not 150.



## Your turn — List unused slots

Define solve(scores) returning the indices whose value is null. A zero is occupied. Export the function as solve.

Write practice/03-joker-and-record.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/03-joker-and-record.mjs'; if (!(JSON.stringify(solve([null,0,50,null]))===\\\"[0,3]\\\")) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Which boundary case distinguishes the rule?
concept: Use the stated contract, including the equality/absence case.
shape: Write the simplest loop or branch that preserves the boundary, then test the exceptional case too.
```
