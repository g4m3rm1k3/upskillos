---
title: 9.3 — AVERAGE, MIN, MAX and COUNT
runtime: none
experiments: Spread has a limit
teaches: averages of nothing, spread limits
uses: function registries, reduce, variadic functions, rest parameters, ranges, errors as values, measuring performance, call stack, tests, vitest, playground
---

### The story so far

Lesson 9.2 added function calls. The lexer reads a name followed by `(`; the parser builds a `call` node with a list of arguments; `references` gives the graph an edge from every cell any argument reads; and `evaluate` looks the name up in `functions`, a registry `Map`, and calls what it finds with each argument's values: a range's cells, or one value. `SUM` is registered, a helper called `numbers` finds the numbers among the values (skipping text and empty cells, passing an error on), and an unknown name is `#NAME?`.

### What this lesson builds

Four more functions in the registry, each a few lines, and each with one decision worth making on purpose:

| function | gives | the decision |
|---|---|---|
| `AVERAGE` | the total of the numbers ÷ how many there are | the average of **no** numbers: `#DIV/0!`, as in Excel, not 0 and not `NaN` |
| `MIN`, `MAX` | the smallest, the largest | how to find them in a list of 100,000 without crashing |
| `COUNT` | how many of the values are numbers | an error in the range isn't a number, so it isn't counted, and doesn't pass on |

## Spread has a limit {#spread}

`Math.max(3, 9, 2)` is 9, and **spread** (lesson 8.2's `...`) lays an array out as separate arguments, so `Math.max(...numbers)` looks like the obvious way to find the largest of a list. Try it on big lists in the playground. This step opens `playground/js/spread.mjs`:

```javascript file=playground/js/spread.mjs
for (const size of [1000, 100000, 125000, 1000000]) {
  const numbers = Array.from({ length: size }, (_, i) => i);
  try {
    const largest = Math.max(...numbers);
    console.log(size, "spread:", largest);
  } catch (error) {
    console.log(size, "spread:", error.constructor.name);
  }
  const largest = numbers.reduce((most, n) => Math.max(most, n), numbers[0]);
  console.log(size, "reduce:", largest);
}
```

- **`Array.from({ length: size }, (_, i) => i)`** makes the array 0, 1, 2, … up to `size − 1`. (`_` is a name for an argument you don't use.)
- **`reduce`** (9.2) keeps the largest so far: each number is compared with it, one at a time, and the bigger one is kept.

Before you run it, predict:

```predict
question: What does `Math.max(...numbers)` do with a million numbers?
choice: Gives 999999
choice: Throws a RangeError
choice: Takes a few seconds, then gives 999999
answer: Throws a RangeError
explain: Spread turns the array into a million separate arguments to one call, and every argument of a call takes room on the call stack, the same stack recursion ran out of in lessons 7.5 and 8.1. `reduce` passes two numbers at a time, however long the list is.
verify: node -e "const a = Array.from({ length: 1000000 }, (_, i) => i); try { Math.max(...a); console.log('Gives 999999'); } catch (e) { console.log('Throws a ' + e.constructor.name); }"
```

Run it: `node playground/js/spread.mjs`.

```text
1000 spread: 999
1000 reduce: 999
100000 spread: 99999
100000 reduce: 99999
125000 spread: RangeError
125000 reduce: 124999
1000000 spread: RangeError
1000000 reduce: 999999
```

On the computer this lesson was written on, spread worked at 120,000 numbers and failed at 125,000; the limit depends on the engine and on what else is on the stack. A spreadsheet's range can hold 100,000 cells (the challenge at the end of this sprint sets that limit), too close for comfort. So the spreadsheet's `MIN` and `MAX` use `reduce`.

```check
run "node playground/js/spread.mjs" stdout="1000000 reduce: 999999" label="reduce finds the largest of a million numbers" -- Keep the largest so far: numbers.reduce((most, n) => Math.max(most, n), numbers[0]).
run "node playground/js/spread.mjs" stdout="1000000 spread: RangeError" label="spreading a million numbers runs out of stack"
```

## AVERAGE {#average}

The average is the total divided by how many numbers there are. The question is what the average of *no* numbers is: 0 ÷ 0. JavaScript gives `NaN` for that; Excel gives `#DIV/0!`, an error the user can see and fix. This step adds `average` to `src/functions.ts`, and registers it:

```typescript file=src/functions.ts
import type { ErrorValue, Value } from "./values.ts";

// A function receives its arguments' values: a list for each argument, holding every cell of a
// range, or the one value of anything else.
export type FormulaFunction = (args: Value[][]) => Value;

// The numbers among all the arguments' values, skipping text and empty cells, or the first error.
function numbers(args: Value[][]): number[] | ErrorValue {
  const found: number[] = [];
  for (const arg of args) {
    for (const value of arg) {
      if (typeof value === "object") {
        return value;
      }
      if (typeof value === "number") {
        found.push(value);
      }
    }
  }
  return found;
}

function sum(args: Value[][]): Value {
  const all = numbers(args);
  return Array.isArray(all) ? all.reduce((total, n) => total + n, 0) : all;
}

function average(args: Value[][]): Value {
  const all = numbers(args);
  if (!Array.isArray(all)) {
    return all;
  }
  return all.length === 0 ? { error: "#DIV/0!" } : all.reduce((total, n) => total + n, 0) / all.length;
}

export const functions = new Map<string, FormulaFunction>([
  ["SUM", sum],
  ["AVERAGE", average],
]);
```

**`average`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `args` | the arguments' values | `[[3.5, 2.25, "Coffee", "", 4]]` |
| returns | the total ÷ the count of numbers | (3.5 + 2.25 + 4) ÷ 3 = `3.25` |
| or returns | `#DIV/0!` when there are no numbers, or the first error | `=AVERAGE(A1:A3)` on empty cells |

Text and empty cells aren't counted: `Coffee` doesn't make the average smaller by counting as a 0. That's the difference between "the average of the prices" and "the average of the cells".

```check
run "npx vitest run functions" exit=1 stdout="4 passed" label="four of the six function tests pass: the average of nothing is #DIV/0!" -- Divide the total by all.length, and give #DIV/0! when all.length is 0.
```

## MIN and MAX {#min-max}

Smallest and largest, with `reduce`, as in the playground. This step adds both:

```typescript file=src/functions.ts
import type { ErrorValue, Value } from "./values.ts";

// A function receives its arguments' values: a list for each argument, holding every cell of a
// range, or the one value of anything else.
export type FormulaFunction = (args: Value[][]) => Value;

// The numbers among all the arguments' values, skipping text and empty cells, or the first error.
function numbers(args: Value[][]): number[] | ErrorValue {
  const found: number[] = [];
  for (const arg of args) {
    for (const value of arg) {
      if (typeof value === "object") {
        return value;
      }
      if (typeof value === "number") {
        found.push(value);
      }
    }
  }
  return found;
}

function sum(args: Value[][]): Value {
  const all = numbers(args);
  return Array.isArray(all) ? all.reduce((total, n) => total + n, 0) : all;
}

function average(args: Value[][]): Value {
  const all = numbers(args);
  if (!Array.isArray(all)) {
    return all;
  }
  return all.length === 0 ? { error: "#DIV/0!" } : all.reduce((total, n) => total + n, 0) / all.length;
}

function min(args: Value[][]): Value {
  const all = numbers(args);
  return Array.isArray(all) ? all.reduce((least, n) => Math.min(least, n), all[0] ?? 0) : all;
}

function max(args: Value[][]): Value {
  const all = numbers(args);
  return Array.isArray(all) ? all.reduce((most, n) => Math.max(most, n), all[0] ?? 0) : all;
}

export const functions = new Map<string, FormulaFunction>([
  ["SUM", sum],
  ["AVERAGE", average],
  ["MIN", min],
  ["MAX", max],
]);
```

**The two functions, their inputs, and what they give back:**

| function | input | returns | example |
|---|---|---|---|
| `min` | the arguments' values | the smallest number, 0 if there are none, or the first error | `2.25` |
| `max` | the arguments' values | the largest number, 0 if there are none, or the first error | `4` |

- **`all[0] ?? 0`** starts the comparison at the first number, so the result is always one of the numbers: starting at 0 would make `MIN` of `[3, 5]` wrongly 0 (the same trap as lesson 6.8's bounding box). `?? 0` covers an empty list, which then gives 0, as Excel does.
- **`reduce`**, not spread: safe for any range the sheet allows.

```check
run "npx vitest run functions" exit=1 stdout="5 passed" label="five of the six function tests pass, MIN and MAX included" -- Start the reduce at the first number, all[0], not at 0.
```

## COUNT {#count}

`COUNT` counts the values that are numbers. It's the one function here that **doesn't** pass errors on: Excel's `COUNT` answers "how many numbers are there?", and an error isn't a number, so it's simply not counted. This step adds it:

```typescript file=src/functions.ts
import type { ErrorValue, Value } from "./values.ts";

// A function receives its arguments' values: a list for each argument, holding every cell of a
// range, or the one value of anything else.
export type FormulaFunction = (args: Value[][]) => Value;

// The numbers among all the arguments' values, skipping text and empty cells, or the first error.
function numbers(args: Value[][]): number[] | ErrorValue {
  const found: number[] = [];
  for (const arg of args) {
    for (const value of arg) {
      if (typeof value === "object") {
        return value;
      }
      if (typeof value === "number") {
        found.push(value);
      }
    }
  }
  return found;
}

function sum(args: Value[][]): Value {
  const all = numbers(args);
  return Array.isArray(all) ? all.reduce((total, n) => total + n, 0) : all;
}

function average(args: Value[][]): Value {
  const all = numbers(args);
  if (!Array.isArray(all)) {
    return all;
  }
  return all.length === 0 ? { error: "#DIV/0!" } : all.reduce((total, n) => total + n, 0) / all.length;
}

function min(args: Value[][]): Value {
  const all = numbers(args);
  return Array.isArray(all) ? all.reduce((least, n) => Math.min(least, n), all[0] ?? 0) : all;
}

function max(args: Value[][]): Value {
  const all = numbers(args);
  return Array.isArray(all) ? all.reduce((most, n) => Math.max(most, n), all[0] ?? 0) : all;
}

function count(args: Value[][]): Value {
  let total = 0;
  for (const arg of args) {
    total += arg.filter((value) => typeof value === "number").length;
  }
  return total;
}

export const functions = new Map<string, FormulaFunction>([
  ["SUM", sum],
  ["AVERAGE", average],
  ["MIN", min],
  ["MAX", max],
  ["COUNT", count],
]);
```

**`count`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `args` | the arguments' values | `[[3.5, 2.25, "Coffee", "", 4]]` |
| returns | how many of them are numbers | `3` |

**`.filter((value) => typeof value === "number").length`** keeps the numbers (lesson 8.4's `filter`) and counts them. It doesn't use `numbers`, because `numbers` stops at the first error, and `COUNT` mustn't.

```check
run "npx vitest run functions" stdout="6 passed" label="all six function tests pass"
run "npx tsc" label="the project type-checks"
```

## Commit

```powershell
git add playground src
git commit -m "AVERAGE, MIN, MAX and COUNT"
```

```check
git-clean
```

## Your turn: MEDIAN, in the playground

The **median** is the middle value of a sorted list: of `[7, 1, 3]`, it's 3. With an even count there are two middles, and the median is their average: of `[4, 1, 3, 2]`, it's (2 + 3) ÷ 2 = 2.5. Medians are what reports use for "typical", because one huge value moves an average but not a median. In `playground/js/median.mjs`, write and export `median(...numbers)`, variadic like `TOTAL`, giving `null` for no numbers. Don't change the order of the caller's array. Commit.

```hints
nudge: Sort a copy, then look in the middle. The middle of a list of length `n` is around `n / 2`.
concept: `[...numbers]` copies the array, so sorting it leaves the caller's alone. Sort numbers with a comparison function (lesson 8.7): `(a, b) => a - b`; without one, `sort` compares them as text, and `10` comes before `9`. For an odd length, the middle is at index `Math.floor(n / 2)`; for an even length, average the items at `n / 2 - 1` and `n / 2`.
shape: `export function median(...numbers) { if (numbers.length === 0) return null; const sorted = [...numbers].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }`
answer: ~~~javascript
export function median(...numbers) {
  if (numbers.length === 0) {
    return null;
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}
~~~
```

```check
run "node -e \"import('./playground/js/median.mjs').then(({ median }) => console.log('[' + [median(7, 1, 3), median(4, 1, 3, 2), median(10, 9, 100), median()].join(' ') + ']'))\"" stdout="[3 2.5 10 ]" label="median is right for odd and even counts, sorts numbers as numbers, and gives null for none" -- Sort a copy with (a, b) => a - b; for an even count, average the two middle values.
git-clean -- Commit it: git add playground, then git commit.
```
