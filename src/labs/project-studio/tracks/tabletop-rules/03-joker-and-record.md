---
title: 6.3 — Validate before recording
runtime: none
---

### The story so far

Every box can be used only once. A later five-of-a-kind can also trigger placement rules.

### What this lesson builds

Implement the next rule boundary and explain it with known inputs before connecting it to the interface.

## Turn the rule into examples

Another five-of-a-kind after the Yahtzee box was filled invokes Joker placement. Use the matching upper box if empty; otherwise an empty lower box; if no lower boxes remain, another empty upper box. This placement applies even when the earlier Yahtzee was recorded as zero, but the extra 100-point bonus requires an earlier 50. We will separate listing legal choices, previewing a choice and recording it so a rejected action cannot award points.

```predict
question: Does a rejected choice earn a bonus?
choice: No
choice: Yes
answer: No
explain: The guard returns before either ledger changes.
```

## Implement legalCategories

First collect empty indices with a loop and push. Then detect a repeat: the histogram's maximum must be five AND the Yahtzee box (index 11) must already be filled. !== null treats a saved 0 as filled. Without a repeat, all empty categories are available.

On repeated sixes the matching upper index is dice[0]-1 = 5. If that box is empty, return [5] immediately. Otherwise filter the empty indices for lower boxes (indices >= 6). If any remain, return them; if none remain, use the other empty upper boxes. Example: saved Yahtzee 50 and empty Sixes forces Sixes; saved Yahtzee 0 still forces Sixes but will not earn a 100-point bonus. Placement and bonus eligibility are different rules.

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


**Explore, then restore:** List legal indices for an empty card, then fill only index 11 with 0 and use five sixes. Predict [5]. Fill index 5 too and confirm only lower indices remain. Undo your fixture changes.


Before checking, predict this observation: **an occupied zero Yahtzee box still forces matching upper placement**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict'; import {blankCard,legalCategories} from './rules.mjs';const c=blankCard();c.scores[11]=0;assert.deepEqual(legalCategories(c,[6,6,6,6,6]),[5]);\""
```

## Implement preview

The preview is a read-only question: “What could this choice score?” If legalCategories does not include the requested index, return null. Zero cannot represent rejection because zero is a valid sacrifice score. For a legal choice, calculate the joker flag from the existing card and hand, then call points. Preview never fills a box or adds a bonus, so calling it repeatedly for the interface cannot change the game.

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


**Explore, then restore:** Serialize the card with JSON.stringify, call preview twice, and compare the card afterwards. It should be identical. Try an occupied category and expect null rather than 0.


Before checking, predict this observation: **preview returns 50 without changing the card**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {blankCard,preview} from './rules.mjs';const c=blankCard(),before=JSON.stringify(c);assert.equal(preview(c,[6,6,6,6,6],11),50);assert.equal(JSON.stringify(c),before);\""
```

## Implement record

A write must validate before it changes either ledger. Obtain the preview; if it is null return false. Compute extra eligibility from the OLD Yahtzee slot before writing the chosen score. The first Yahtzee sees an empty old slot, so recording 50 must not also add 100. A later repeat sees the old 50 and can add 100 after a legal choice.

Write the score, conditionally increment extra, then return true to signal acceptance. false reports a rejected action; it is not a score. The card is mutated through its reference. The enclosing turn function in the next lesson enforces one accepted record per turn.

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


**Explore, then restore:** Record the first Yahtzee and check total extra is 0. Try recording the same occupied category again and check that both ledgers stay unchanged. For the repeated hand choose its forced upper category and expect extra to rise by 100.


Before checking, predict this observation: **first Yahtzee earns no extra bonus; only a legal later repeat earns 100**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {blankCard,record} from './rules.mjs';const c=blankCard(),d=[6,6,6,6,6];assert.equal(record(c,d,11),true);assert.equal(c.extra,0);assert.equal(record(c,d,11),false);assert.equal(c.extra,0);assert.equal(record(c,d,5),true);assert.equal(c.extra,100);\""
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
