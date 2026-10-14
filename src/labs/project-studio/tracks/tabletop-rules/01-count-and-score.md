---
title: 6.1 — Count before scoring
runtime: none
---

### The story so far

A full Yahtzee card has upper categories Ones through Sixes, then three/four of a kind (sum all dice if the multiplicity qualifies), full house (25 for a triple plus pair), small/large straight (30 for four consecutive faces, 40 for five), Yahtzee (50 for five equal faces), and Chance (sum all dice). You choose one unused category per turn. These rules are introduced here; no earlier game course is assumed.

### What this lesson builds

Implement the next rule boundary and explain it with known inputs before connecting it to the interface.

## Turn the rule into examples

countsOf builds a histogram: index 0 is unused; counts[face] stores how many of that face appeared. for...of reads values directly. Number.isInteger and range checks reject invalid faces. points first handles upper categories with count × face. Math.max(...counts) finds multiplicity. includes tests for the triple and pair. A straight uses consecutive PRESENT faces, so duplicates must not break a run. For [1,2,2,3,4], counts of 1–4 are positive and the longest run is 4. The joker parameter defaults to false; its exceptional rules are taught next.



```predict
question: What is the small-straight score for [1,2,2,3,4]?
choice: 30
choice: 0
answer: 30
explain: The four distinct consecutive faces are present despite a duplicate.
```

## Implement countsOf

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```

## Implement points

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```

## Try it — Reject a plausible mistake

Replace counts[face] > 0 with counts[face] === 1. A duplicate now breaks the straight incorrectly. Restore > 0.



## Your turn — Upper-section score

Define solve(dice, wanted) returning the sum of matching faces. Export the function as solve.

Write practice/01-count-and-score.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/01-count-and-score.mjs'; if (!(solve([6,2,6,1,4],6)===12 && solve([2,2],6)===0)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Which boundary case distinguishes the rule?
concept: Use the stated contract, including the equality/absence case.
shape: Write the simplest loop or branch that preserves the boundary, then test the exceptional case too.
```
