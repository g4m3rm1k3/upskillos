---
title: 6.2 — Empty is different from zero
runtime: none
---

### The story so far

The scoring functions calculate possibilities. A scorecard records choices and must remember a deliberate zero.

### What this lesson builds

Implement the next rule boundary and explain it with known inputs before connecting it to the interface.

## Turn the rule into examples

Compare an unused Sixes box with a deliberately scored zero. They add the same amount to a sum, but only the first remains selectable. Next compare upper totals 62 and 63: one more point crosses the 35-point bonus threshold. Our data representation must preserve both distinctions.

```predict
question: Does a recorded zero become an unused category again?
choice: No
choice: Yes
answer: No
explain: Absence is null; a numeric zero is still a chosen score.
```

## Implement blankCard

An empty score box and a recorded zero must remain distinguishable even though both contribute zero to the total. Use null for unused and a number for used. Array(13) allocates an array of length thirteen; fill(null) writes null into every slot. Calling blankCard twice creates two separate object and array allocations. extra starts at 0 and records only later Yahtzee bonuses.

Do not use Array(2).fill(blankCard()) for players: fill would repeat the same card reference. Repeating null is safe because null is a primitive absence value; repeating an object would share that object.

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```


**Explore, then restore:** Create a=blankCard() and b=blankCard(); set a.scores[0]=0. Expect b.scores[0] still null. Replace b=a temporarily, repeat and explain the aliasing; restore separate calls.


Before checking, predict this observation: **a recorded zero on one card does not change another**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict'; import {blankCard} from './rules.mjs'; const a=blankCard(),b=blankCard();a.scores[0]=0;assert.equal(b.scores[0],null);\""
```

## Implement total

Read each box with ?? 0, adding its numeric contribution to sum. For the first six indices also add to upper. The fallback does not write zeros into the card, so unused slots remain unused. The local upper variable is the upper-section sum; the returned upper property is the earned bonus, not that sum. This naming distinction matters when inspecting the result.

With upper scores [3,6,9,12,15,18], upper is 63 and the bonus is 35. If lower scores contribute 20 and extra is 100, the result is base 83, upper 35, extra 100 and all 218. At upper 62 the bonus is 0. The conditional is repeated for the breakdown and the final sum; both must use >= 63. Return a fresh breakdown object without editing card.

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check rules.mjs"
```


**Explore, then restore:** Compute the breakdown by hand, then run the check. Lower one upper face by a point: the overall total falls by 36, not 1, because the bonus disappears too. Restore the score. Explain why this discontinuity is a rule rather than an arithmetic bug.


Before checking, predict this observation: **the breakdown is base 83, bonus 35, extra 100 and total 218**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict'; import {blankCard,total} from './rules.mjs'; const c=blankCard();c.scores.splice(0,6,3,6,9,12,15,18);c.scores[12]=20;c.extra=100;assert.deepEqual(total(c),{base:83,upper:35,extra:100,all:218});\""
```

## Try it — Reject a plausible mistake

Replace a saved zero with null and observe that the representation changes even though the displayed sum stays equal. Restore zero. Totals alone cannot establish category availability.



## Your turn — Compute an upper bonus

Define solve(upper) returning 35 when upper is at least 63, otherwise 0. Export the function as solve.

Write practice/02-scorecard-and-bonus.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/02-scorecard-and-bonus.mjs'; if (!(solve(62)===0 && solve(63)===35 && solve(64)===35)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Which boundary case distinguishes the rule?
concept: Use the stated contract, including the equality/absence case.
shape: Write the simplest loop or branch that preserves the boundary, then test the exceptional case too.
```
