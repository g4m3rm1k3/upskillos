---
title: 6.1 — Count before scoring
runtime: none
---

### The story so far

A full Yahtzee card has upper categories Ones through Sixes, then three/four of a kind (sum all dice if the multiplicity qualifies), full house (25 for a triple plus pair), small/large straight (30 for four consecutive faces, 40 for five), Yahtzee (50 for five equal faces), and Chance (sum all dice). You choose one unused category per turn. These rules are introduced here; no earlier game course is assumed.

### What this lesson builds

Implement the next rule boundary and explain it with known inputs before connecting it to the interface.

## Turn the rule into examples

For [6,2,6,1,4], Sixes scores 12 and Chance scores 19. For [2,2,2,3,3], a full house scores 25. For [1,2,2,3,4], a small straight scores 30 because four consecutive distinct faces are present. Write these expectations before implementing anything. We will count faces once, then add category groups in small runnable stages.

```predict
question: What is the small-straight score for [1,2,2,3,4]?
choice: 30
choice: 0
answer: 30
explain: The four distinct consecutive faces are present despite a duplicate.
```

## Read a behavior check before trusting it {#assertions-before-rules}

The checkpoints now execute functions with known inputs, rather than only parsing source. Their commands import assert from Node's built-in node:assert/strict module. assert.equal(actual,expected) checks one value; assert.deepEqual compares arrays/objects by contents; assert.ok requires a true condition; assert.throws runs a callback and expects it to throw. A failed assertion exits the command unsuccessfully. Expand a check to see its inputs before running it.

These are test operations, not game rules. Choose the expected answer from the rule and your hand calculation, then compare the implementation. JSON.stringify serializes plain data for inspecting changes. A later fixture uses splice(0,6,...values): it replaces six array entries starting at index zero with the supplied upper scores. Test fixtures may directly construct states to isolate a boundary, even when a user would reach those states through many turns.

The code following -e is one quoted command argument. --input-type=module permits imports there. The earlier module lesson used the same invocation. Passing a check establishes its selected examples; it does not establish every input or explain why the answer is right.

## Implement countsOf

Use one counter for each possible face rather than repeatedly searching the hand. Start seven zeros: index 0 is deliberately unused so a face value is also its counter index. For [6,2,6,1,4], increment counter 6, then 2, then 6 again, then 1 and 4. The result is [0,1,1,0,1,0,2]. Its sum is five, although no individual counter need be five.

The for...of variable face contains a value, not an array position. Number.isInteger rejects fractional faces and numeric strings. The remaining comparisons reject values outside 1–6. Throwing an Error stops the calculation instead of returning a plausible wrong score. counts[face] += 1 changes only the local histogram; it never edits dice. categories is a separate ordered array of labels; its zero-based indices are the scorecard's category ids. Both functions assume a genuine five-die hand when used for Yahtzee scoring.

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


**Explore, then restore:** Pass [1,1,1,1,1] and predict counts[1]===5. Try [0] and expect an error. Restore the valid hand. Explain why index 0 is unused instead of making every lookup subtract one.


Before checking, predict this observation: **the histogram matches the hand and face 0 is rejected**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict'; import {countsOf} from './rules.mjs'; assert.deepEqual(countsOf([6,2,6,1,4]),[0,1,1,0,1,0,2]); assert.throws(()=>countsOf([0]));\""
```

## Score faces and Chance first {#upper-and-chance}

Begin with two rules you can explain without exceptions. The category index is zero-based, so category 5 means Sixes: multiply counts[6] by 6. Chance simply sums every die. With [6,2,6,1,4], Sixes is 12 and Chance 19. Unsupported categories deliberately throw instead of pretending to score zero.

Run these two inputs, then use [1,1,1,1,1] and predict Ones 5 and Chance 5. Restore your original hand. Explain why counting matches alone would produce 2 rather than the required Sixes score 12.

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

export function points(dice, category) {
  const counts = countsOf(dice);
  let sum = 0;
  for (const face of dice) sum += face;
  if (category < 6) return counts[category + 1] * (category + 1);
  if (category === 12) return sum;
  throw new Error('This category is not implemented yet');
}
```

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict'; import {points} from './rules.mjs'; assert.equal(points([6,2,6,1,4],5),12); assert.equal(points([6,2,6,1,4],12),19);\""
```

## Count repeated faces {#repeated-faces}

Math.max(...counts) gives the largest multiplicity. Three/four of a kind require at least that many equal faces, then score the sum of ALL five dice. A normal full house needs one count of 3 and one of 2. includes asks whether a value appears; && requires both. The conditional expression returns the fixed score if true, otherwise zero.

For [2,2,2,3,3], predict three-of-a-kind 12, four-of-a-kind 0 and full house 25. For five twos, full house is normally 0 while Yahtzee is 50. Run both, then explain why the later Joker exception must be explicit rather than accidentally treating every five-of-a-kind as a full house.

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

export function points(dice, category) {
  const counts = countsOf(dice);
  let sum = 0;
  for (const face of dice) sum += face;
  if (category < 6) return counts[category + 1] * (category + 1);
  const largest = Math.max(...counts);
  if (category === 6) return largest >= 3 ? sum : 0;
  if (category === 7) return largest >= 4 ? sum : 0;
  if (category === 8) return counts.includes(3) && counts.includes(2) ? 25 : 0;
  if (category === 11) return largest === 5 ? 50 : 0;
  if (category === 12) return sum;
  throw new Error('This category is not implemented yet');
}
```

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict'; import {points} from './rules.mjs'; assert.equal(points([2,2,2,3,3],6),12); assert.equal(points([2,2,2,3,3],8),25); assert.equal(points([2,2,2,2,2],8),0);\""
```

## Implement points

The previous stages handle totals and repeated faces. Add straights by scanning possible face values 1–6, not the unsorted dice. run counts the current consecutive sequence of present faces; longest remembers the best run seen so far. A missing face resets run to 0. For [1,2,2,3,4], the run grows 1,2,3,4,0,0: the duplicate two does not interrupt presence. Math.max(longest, run) preserves the earlier best after a gap.

The category parameter is an index: 0–5 select upper faces 1–6, 6/7 select three/four of a kind, 8 full house, 9/10 straights, 11 Yahtzee and 12 Chance. Early returns choose exactly one result. A triple plus pair qualifies as a full house; five equal faces normally do not. The joker Boolean, default false, will allow the fixed full-house/straight scores under the repeated-Yahtzee rule taught in lesson 6.3. Parentheses around && group the triple-and-pair condition before || combines it with joker. Unsupported categories end in an error.

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


**Explore, then restore:** Change only the hand to [1,2,2,4,5]: the gap at 3 leaves no four-face straight. Expect 0 for category 9. Then try [2,3,4,5,6] and expect 40 for category 10. Restore the original examples.


Before checking, predict this observation: **a duplicate does not break a straight, but a missing middle face does**. The added check runs the actual exported function; it is separate from the syntax check.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict'; import {points} from './rules.mjs'; assert.equal(points([1,2,2,3,4],9),30); assert.equal(points([1,2,2,4,5],9),0);\""
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
