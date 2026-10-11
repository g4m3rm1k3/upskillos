---
title: 8.1 — Measure First
runtime: none
experiments: Counting the work; A chain that's too long
teaches: measuring performance, operation counts, performance.now, benchmarks, exponential growth
uses: recursion, call stack, functions, modules, node, playground, git switch
---

### The story so far

Sprint 7 made the spreadsheet calculate. A formula is cut into tokens, parsed into a tree and evaluated, and `cellValue` connects it to the sheet: for a formula cell it parses the formula and evaluates it, asking `cellValue` again for every cell the formula names. After every Enter, `showAll` in `grid.ts` works out all 2,600 cells again. It's correct, and on a small sheet it feels instant. Sprint 7 ended by noticing the cost without measuring it.

### What this sprint builds

Recalculation that does only the work an edit needs. When A1 changes, the spreadsheet will find exactly the cells that depend on A1, put them in an order where each comes after everything it reads, and work each out once. The tools are three ideas from computer science, each learned in the playground first: **graphs**, **graph traversal** and **topological order**, plus a **cache** that stays correct.

### What this lesson builds

Numbers, before any change. Professionals don't optimise what they haven't measured, because a guess about where the time goes is usually wrong. By the end you'll have measured three things:

| measurement | what you'll find |
|---|---|
| a function that calls itself twice, in the playground | its work grows so fast that `fib(30)` makes about 2.7 million calls |
| the spreadsheet showing a sheet with a 100-cell chain of formulas | 7,550 calls to `cellValue` to show 2,600 cells |
| a longer chain of formulas | a crash, before 1,600 cells: the recursion runs out of call stack |

The last one turns a slow design into a broken one, and it's why this sprint matters.

## A branch for the sprint

```powershell
git switch -c recalc
```

```check
git-branch recalc -- Run git switch -c recalc
```

## Counting the work

The easiest way to see how much work code does is to count it. Start in the playground, with a function famous for doing too much: Fibonacci, where each number is the sum of the two before it (0, 1, 1, 2, 3, 5, 8, …). This step opens `playground/js/fib.mjs`:

```javascript file=playground/js/fib.mjs
let calls = 0;

function fib(n) {
  calls++;
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

for (const n of [20, 25, 30]) {
  calls = 0;
  const value = fib(n);
  console.log(`fib(${n}) = ${value}: ${calls} calls`);
}
```

**`fib`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `n` | which Fibonacci number, counted from 0 | `5` |
| returns | that number | `5` (0, 1, 1, 2, 3, **5**) |

- **`calls`** is a counter outside the function. Every call adds one, so after `fib(n)` it holds how many calls the whole calculation took. Counting is the most reliable measurement there is: it gives the same answer on every computer, every time.
- **`n < 2 ? n : …`** is the base case: `fib(0)` is 0 and `fib(1)` is 1. Any other `n` is worked out from the two before it, which is two recursive calls (lesson 7.2).

Here's why it's slow. `fib(4)` calls `fib(3)` and `fib(2)`; but `fib(3)` calls `fib(2)` *again*:

```text
fib(4)
├── fib(3)
│   ├── fib(2)
│   │   ├── fib(1)
│   │   └── fib(0)
│   └── fib(1)
└── fib(2)          ← the same work as the fib(2) above, done again
    ├── fib(1)
    └── fib(0)
```

Nine calls for `fib(4)`. Each extra level roughly doubles the tree. Before you run it, predict:

```predict
question: `fib(25)` makes 242,785 calls. About how many does `fib(30)` make?
choice: About 300,000
choice: About 2.7 million
choice: About 25 million
answer: About 2.7 million
explain: Each step up multiplies the work by about 1.6 (the golden ratio, as it happens), so five steps multiply it by about 1.6⁵ ≈ 11: 242,785 × 11 ≈ 2.7 million. Work that multiplies by a fixed amount with each step up is called **exponential** growth, and it's the shape that makes programs that worked yesterday hang today.
verify: node -e "let calls = 0; const fib = (n) => { calls++; return n < 2 ? n : fib(n - 1) + fib(n - 2); }; fib(30); console.log(calls > 2000000 && calls < 3000000 ? 'About 2.7 million' : calls)"
```

Run it with `node playground/js/fib.mjs`. Add 32 to the list and run it again: about seven million calls.

```check
run "node playground/js/fib.mjs" stdout="fib(30) = 832040: 2692537 calls" label="fib(30) is 832040, after 2,692,537 calls" -- Count every call with calls++ at the top of fib, and reset calls to 0 before each n.
```

## Timing it

Counting tells you how much work; timing tells you how long it takes, which is what a user feels. **`performance.now()`** gives the time in milliseconds, with fractions, since the program started. Read it before and after, and subtract. This step changes the loop in `playground/js/fib.mjs`:

```javascript file=playground/js/fib.mjs
let calls = 0;

function fib(n) {
  calls++;
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

for (const n of [20, 25, 30]) {
  calls = 0;
  const start = performance.now();
  const value = fib(n);
  const ms = performance.now() - start;
  console.log(`fib(${n}) = ${value}: ${calls} calls, ${ms.toFixed(1)} ms`);
}
```

- **`ms.toFixed(1)`** writes the number with one digit after the point: `19.5`, not `19.512345999`.
- Run it three times. The call counts never change; the times do, by a few milliseconds each run. Other programs share the computer, and Node speeds code up as it runs it. **Always measure more than once**, and trust a difference only when it's much bigger than the wobble.

On the computer this lesson was written on, `fib(30)` took about 20 ms and `fib(32)` about 50 ms: the time grows like the call count.

```check
run "node playground/js/fib.mjs" stdout="fib(30) = 832040: 2692537 calls, " label="it prints the time of each run too" -- Read performance.now() before and after fib(n), and print the difference with toFixed(1).
```

## Counting the spreadsheet's work {#metrics}

Now the same question about the spreadsheet: how many times does `cellValue` run to show the grid? Add a counter to `src/compute.ts`, exported so a measuring script can read it:

```typescript file=src/compute.ts
import { formatAddress, type Address } from "./address.ts";
import { evaluate } from "./evaluate.ts";
import { FormulaError } from "./lexer.ts";
import { parse } from "./parser.ts";
import type { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export const metrics = { cellValueCalls: 0 };

export function cellValue(sheet: Sheet, address: Address, visiting = new Set<string>()): Value {
  metrics.cellValueCalls++;
  const key = formatAddress(address);
  if (visiting.has(key)) {
    return { error: "#CYCLE!" };
  }
  const text = sheet.get(address);
  if (text.startsWith("=")) {
    visiting.add(key);
    try {
      const expression = parse(text.slice(1));
      return evaluate(expression, (other) => cellValue(sheet, other, visiting));
    } catch (error) {
      if (error instanceof FormulaError) {
        return { error: "#ERROR!" };
      }
      throw error;
    } finally {
      visiting.delete(key);
    }
  }
  if (text.trim() !== "" && !Number.isNaN(Number(text))) {
    return Number(text);
  }
  return text;
}

export function display(value: Value): string {
  if (typeof value === "number") {
    return String(Number(value.toPrecision(15)));
  }
  if (typeof value === "string") {
    return value;
  }
  return value.error;
}
```

- **`export const metrics = { cellValueCalls: 0 }`** is an object holding one counter. A `const` can't be reassigned, but the object it holds can be changed: `metrics.cellValueCalls++` changes a property, not the variable. And because it's an object, a script that imports `metrics` sees the same object, and every change to it.
- **Counters like this are called metrics**, and real services keep many of them (requests served, errors, time spent) so that problems show up as numbers before users complain. Module 10 does that for the server.

```check
contains src/compute.ts "metrics.cellValueCalls++" label="cellValue counts its calls" -- Add metrics.cellValueCalls++ as the first line of cellValue.
run "npx vitest run" stdout="45 passed" label="all 45 tests still pass"
```

## A measuring script {#bench}

A script that sets up a situation and measures it is called a **benchmark**. It isn't a test (it doesn't pass or fail) and it isn't part of the app, so it goes in a folder of its own, `bench`, next to `src`. This step opens `bench/recalc.ts`, starting with the situation to measure: a sheet with a chain of 100 formulas down column A, each one more than the cell above:

```typescript file=bench/recalc.ts
import { cellValue, metrics } from "../src/compute.ts";
import { Sheet } from "../src/sheet.ts";

const sheet = new Sheet();
sheet.set({ column: 0, row: 0 }, "1");
for (let row = 1; row < 100; row++) {
  sheet.set({ column: 0, row }, `=A${row}+1`);
}
```

- **`../src/compute.ts`**: `..` is the folder above (lesson 0.1), so this goes up from `bench` and into `src`.
- **The loop** writes `=A1+1` into A2, `=A2+1` into A3, and so on down to A100. Row numbers in the text count from 1 and in the code from 0, so the cell at `row` reads the cell whose name ends in `row` (the one above it).

The sheet holds A1 = 1, A2 = 2, …, A100 = 100. Nothing is measured yet: the next step adds the measuring.

```check
run "node -e \"import('./bench/recalc.ts').then(() => import('./src/compute.ts')).then(({ metrics }) => console.log('[' + metrics.cellValueCalls + ']'))\"" stdout="[0]" label="the script builds the sheet without working anything out yet" -- Only sheet.set calls so far: nothing should call cellValue.
```

## What showing the grid costs {#cost}

Now do what `showAll` does after every Enter, work out all 26 × 100 cells, and measure it. This step adds to `bench/recalc.ts`:

```typescript file=bench/recalc.ts
import { cellValue, metrics } from "../src/compute.ts";
import { Sheet } from "../src/sheet.ts";

const sheet = new Sheet();
sheet.set({ column: 0, row: 0 }, "1");
for (let row = 1; row < 100; row++) {
  sheet.set({ column: 0, row }, `=A${row}+1`);
}

const start = performance.now();
for (let row = 0; row < 100; row++) {
  for (let column = 0; column < 26; column++) {
    cellValue(sheet, { column, row });
  }
}
const ms = performance.now() - start;
console.log(`${metrics.cellValueCalls} calls to cellValue, ${ms.toFixed(1)} ms`);
```

Before you run it, predict:

```predict
question: The grid has 2,600 cells. How many calls to `cellValue` does it take to show it once?
choice: 2,600: one per cell
choice: 7,550
choice: 260,000
answer: 7,550
explain: The 2,500 cells outside the chain cost one call each. But A100's formula asks for A99, which asks for A98, and so on down to A1: 100 calls for A100 alone. A99 costs 99, A98 98, … A1 costs 1. That's 1 + 2 + … + 100 = 5,050 for column A, plus 2,500: 7,550. Every cell in the chain recalculates every cell above it, again.
verify: if ((node bench/recalc.ts) -match '^7550 calls') { '7,550' } else { 'something else' }
```

Run it: `node bench/recalc.ts`.

```text
7550 calls to cellValue, 21.2 ms
```

| cells | calls each | calls in all |
|---|---|---|
| A1 | 1 | 1 |
| A2 | 2 (A2, then A1) | 2 |
| … | | |
| A100 | 100 | 100 |
| column A in all | | 1 + 2 + … + 100 = **5,050** |
| the other 2,500 cells | 1 | **2,500** |
| the whole grid | | **7,550** |

The sum 1 + 2 + … + *n* is *n*(*n* + 1) ÷ 2. Its growth is **quadratic**: a chain twice as long costs four times the work. Twenty milliseconds is still fast, but it's twenty milliseconds after *every* keypress, for a sheet with one short chain in it, and it grows with the square of the chain's length.

```check
run "node bench/recalc.ts" stdout="7550 calls to cellValue" label="showing the grid once costs 7,550 calls" -- Loop over every row and column, call cellValue for each, then print metrics.cellValueCalls and the time.
```

## A chain that's too long {#too-long}

Quadratic is slow. There's worse. A second benchmark is supplied: it builds a chain of any length you give it, and asks for the last cell's value. Click **Create provided bench/deep.ts**:

```typescript file=bench/deep.ts provided
import { cellValue } from "../src/compute.ts";
import { Sheet } from "../src/sheet.ts";

// Usage: node bench/deep.ts <length>
const length = Number(process.argv[2]);
const sheet = new Sheet();
sheet.set({ column: 0, row: 0 }, "1");
for (let row = 1; row < length; row++) {
  sheet.set({ column: 0, row }, `=A${row}+1`);
}
try {
  console.log(length, JSON.stringify(cellValue(sheet, { column: 0, row: length - 1 })));
} catch (error) {
  console.log(length, (error as Error).constructor.name);
}
```

**`process.argv`** is the list of words on the command line that started the program: `node`, the script's path, then whatever you typed after it. So `node bench/deep.ts 1000` makes `process.argv[2]` the text `"1000"`.

Run it for a few lengths:

```powershell
node bench/deep.ts 1000
node bench/deep.ts 1400
node bench/deep.ts 1600
node bench/deep.ts 5000
```

```text
1000 1000
1400 1400
1600 RangeError
5000 RangeError
```

A chain of 1,600 cells crashes. The recursion from lesson 7.4 (`cellValue` → `evaluate` → `cellValue` → …) is three calls deep for each cell in the chain, and the call stack (7.2) runs out somewhere between 1,400 and 1,600 cells, the same `RangeError` as the cycle in 7.5. The exact length moves a little from run to run, for the reason 7.6 found: the engine makes its own code smaller as it runs.

**The grid has 2,600 cells.** A sheet that fits on today's page, with each cell reading the one before it, would crash today's code. That isn't a slow feature; it's a bug, and anyone who can share a sheet with you can trigger it. The design this sprint builds works out a chain without recursion, however long it is.

```check
run "node bench/deep.ts 1000" stdout="1000 1000" label="a chain of 1,000 cells works out to 1000"
run "node bench/deep.ts 5000" stdout="5000 RangeError" label="a chain of 5,000 cells overflows the call stack"
```

## Commit

```powershell
git add playground bench src
git commit -m "Measure recalculation before changing it"
```

```check
git-tracked bench/recalc.ts
git-tracked bench/deep.ts
git-clean
```

## Your turn: measure a lookup

Two ways to ask "is this value in my collection?": an array's `includes`, and a `Set`'s `has` (lesson 7.6). Which is faster, and by how much? Don't guess: measure.

Write `playground/js/lookup.mjs`. Put the numbers 0 to 99,999 into an array and into a `Set`. Then time 10,000 lookups of random numbers with each, and print one line in exactly this form, with your own times:

```text
array: 412.3 ms, set: 0.9 ms
```

Run it three times, and write in a comment at the top of the file what you found, and why you think it is. Commit.

```hints
nudge: The measuring pattern is the one in `fib.mjs`: read the clock, do the work, read the clock again.
concept: `Array.from({ length: 100000 }, (_, i) => i)` makes the array 0 to 99,999, and `new Set(array)` the set. `Math.floor(Math.random() * 100000)` is a random whole number below 100,000. Time each loop of 10,000 lookups separately, with `performance.now()` before and after.
shape: Build both; one timed loop calling `array.includes(n)`; one calling `set.has(n)`; one `console.log` with both times, each `toFixed(1)`.
answer: ~~~javascript
// includes looks at the items one by one; has jumps straight to the answer.
const array = Array.from({ length: 100000 }, (_, i) => i);
const set = new Set(array);

let start = performance.now();
for (let i = 0; i < 10000; i++) {
  array.includes(Math.floor(Math.random() * 100000));
}
const arrayMs = performance.now() - start;

start = performance.now();
for (let i = 0; i < 10000; i++) {
  set.has(Math.floor(Math.random() * 100000));
}
const setMs = performance.now() - start;

console.log(`array: ${arrayMs.toFixed(1)} ms, set: ${setMs.toFixed(1)} ms`);
~~~
```

```check
run "node playground/js/lookup.mjs" stdout="array: " label="it prints the array's time" -- Print a line in the form: array: <time> ms, set: <time> ms
run "node -e \"const { execSync } = require('child_process'); const line = execSync('node playground/js/lookup.mjs').toString(); console.log(/^array: [0-9.]+ ms, set: [0-9.]+ ms/.test(line) ? '[ok]' : line)\"" stdout="[ok]" label="in the form: array: <time> ms, set: <time> ms"
git-clean -- Commit it: git add playground, then git commit.
```
