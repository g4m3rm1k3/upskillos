---
title: 10.8 — Solution: Deliver S1
runtime: none
experiments: Why 15 digits?
teaches: functions that make functions, rounding half away from zero, circular imports
uses: delivering a story, definition of done, acceptance tests, floating point, significant digits, functions as parameters, closures, lazy evaluation, errors as values, input limits, template literals, playground
---

### The story so far

The challenge (10.7) asked for Crumb & Co.'s first story, S1, delivered to the definition of done: `ROUND` and `ROUNDUP` as in Excel, rounding the number a person sees and halves away from zero, with at most 15 places; S1's acceptance test no longer skipped; the backlog updated; merged and pushed; and a check that a name typed as HTML still shows as text.

### What this lesson builds

Nothing new in the project: one solution, and the reasoning behind each part. If yours passed, keep it, and compare:

| file | what changes |
|---|---|
| `functions.ts` | `numberIn` turns one argument into a number; `rounding(direction)` makes both functions; two lines register them |
| `crumb.test.ts` | S1's `it.skip` back to `it` |
| `docs/backlog.md` | `### S1: Scale a recipe (done)` |

## Why 15 digits? {#experiment}

The hardest test is `ROUNDUP(0.1*3*10, 0)`. See why in the playground. This step opens `playground/requirements/float.mjs`:

```javascript file=playground/requirements/float.mjs
const value = 0.1 * 3 * 10;
console.log(value);
console.log(Math.ceil(value));
console.log(value.toPrecision(15), value.toPrecision(17));
console.log(Math.ceil(Number(value.toPrecision(15))));
```

Before you run it, predict:

```predict
question: What does `Math.ceil(0.1 * 3 * 10)` give?
answer: 4
explain: `0.1` can't be stored exactly in binary (lesson 0.3), so `0.1 * 3 * 10` is 3.0000000000000004, a hair over 3, and rounding *up* takes it to 4. The cell shows 3, because `display` keeps 15 significant digits. A user who sees 3 and types `=ROUNDUP(…, 0)` expects 3.
verify: node -e "console.log(Math.ceil(0.1 * 3 * 10))"
```

Run it: `node playground/requirements/float.mjs`.

```text
3.0000000000000004
4
3.00000000000000 3.0000000000000004
3
```

| line | gives | because |
|---|---|---|
| `value` | 3.0000000000000004 | the error in `0.1`, multiplied |
| `Math.ceil(value)` | 4 | it's over 3, so up it goes |
| `toPrecision(15)` and `(17)` | 3.00000000000000, 3.0000000000000004 | the error lives in the 17th significant digit; 15 digits leave it out |
| `Math.ceil` after cleaning | 3 | the number the user sees, rounded up |

A double holds about 15 to 17 significant digits; the first 15 are always right. So cleaning to 15 removes the error and keeps every digit a person typed.

```check
run "node playground/requirements/float.mjs" stdout="3.00000000000000 3.0000000000000004" label="the error is in the 17th digit, and 15 digits leave it out"
```

## A number from an argument {#number-in}

Both functions need their arguments as numbers. Since 9.6, an argument is an `Argument`, worked out when asked:

```typescript
// One argument as a number: an empty cell is 0, TRUE and FALSE are 1 and 0, other text is #VALUE!.
function numberIn(arg: Argument): number | ErrorValue {
  const value = arg.value();
  if (typeof value === "number" || typeof value === "object") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value === "" ? 0 : { error: "#VALUE!" };
}
```

**`numberIn`'s input, and what it gives back:**

| input: the argument's value | returns |
|---|---|
| a number | the number |
| an error | the error, to pass on |
| `true`, `false` | 1, 0 |
| `""`, an empty cell | 0 |
| any other text | `{ error: "#VALUE!" }` |

These are `toNumber`'s rules from `evaluate.ts`. They're written again here rather than imported, because `evaluate.ts` already imports `functions.ts` (9.2). If `functions.ts` imported `evaluate.ts` back, each module would need the other loaded first: a **circular import**, where one of them can find the other's exports still undefined while it loads. Keeping imports flowing one way avoids the question.

## One function that makes two {#rounding}

`ROUND` and `ROUNDUP` differ in one step. So `rounding` takes that step, `direction`, and **returns a function**, the `FormulaFunction` the registry stores:

```typescript
// ROUND and ROUNDUP, as Excel does them: the number is first cleaned to 15 significant digits, so
// 0.1*3*10 rounds as 3, and the rounding is done on its size, so halves go away from zero.
function rounding(direction: (size: number) => number): FormulaFunction {
  return (args) => {
    const [first, second] = args;
    if (first === undefined || second === undefined || args.length > 2) {
      return { error: "#VALUE!" };
    }
    const value = numberIn(first);
    const digits = numberIn(second);
    if (typeof value === "object") {
      return value;
    }
    if (typeof digits === "object") {
      return digits;
    }
    if (Math.abs(digits) > 15) {
      return { error: "#VALUE!" };
    }
    const scale = 10 ** Math.trunc(digits);
    const size = direction(Number((Math.abs(value) * scale).toPrecision(15))) / scale;
    return value < 0 ? -size : size;
  };
}
```

```typescript
  ["ROUND", rounding(Math.round)],
  ["ROUNDUP", rounding(Math.ceil)],
```

**`rounding`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `direction` | how to round a size to a whole number | `Math.ceil` |
| returns | a `FormulaFunction`: arguments in, rounded value out | the function registered as `ROUNDUP` |

- **The function it returns is a closure** (3.4) that keeps `direction`. `rounding(Math.ceil)` and `rounding(Math.round)` are two functions, made by one.
- **`Math.abs(value)`** works on the size, and `value < 0 ? -size : size` puts the sign back. On a size, `Math.round`'s halves go up, which is away from zero, and `Math.ceil` goes up, which is away from zero too: the negative cases come free.
- **`10 ** Math.trunc(digits)`** moves the places to round at in front of the decimal point; `Math.trunc` drops any fraction in the places, as Excel does.
- **`Math.abs(digits) > 15`** is checked before `10 ** digits` can become `Infinity`.

The trace, for the tests that matter:

| formula | size × scale | cleaned | direction | ÷ scale, sign | result |
|---|---|---|---|---|---|
| `ROUNDUP(17.5, 0)` | 17.5 | 17.5 | ceil: 18 | 18 | **18** |
| `ROUND(-2.5, 0)` | 2.5 | 2.5 | round: 3 | −3 | **−3** |
| `ROUNDUP(0.1*3*10, 0)` | 3.0000000000000004 | 3 | ceil: 3 | 3 | **3** |
| `ROUND(1.005, 2)` | 100.49999999999999 | 100.5 | round: 101 | 1.01 | **1.01** |
| `ROUND(1234, -2)` | 12.34 | 12.34 | round: 12 | 1200 | **1200** |

## Delivering it {#delivering}

Then the definition of done, line by line: S1's `it.skip` back to `it`, and the acceptance tests show `3 passed | 4 todo`; all 104 tests pass; `tsc` is clean; the heading becomes `### S1: Scale a recipe (done)`; merged, pushed, the branch deleted. The last line, *shown to the person who asked for it*, is a conversation with Priya: type her brioche into the sheet, ask for 30, and watch her read 18 eggs.

## Your turn: amounts, the way people read them

Inside the app every amount is in grams (10.2). At the edge, where a person reads it, 2,500 g is better shown as *2.5 kg*. In `playground/requirements/amounts.mjs`, write and export `formatAmount(grams)`: whole grams, shown as `g` below 1,000 g and as `kg` from 1,000 g up. Commit.

| call | returns |
|---|---|
| `formatAmount(2500)` | `"2.5 kg"` |
| `formatAmount(800)` | `"800 g"` |
| `formatAmount(999.6)` | `"1 kg"`: 1,000 whole grams |
| `formatAmount(1234.5678)` | `"1.235 kg"` |
| `formatAmount(0.1 * 3 * 1000)` | `"300 g"` |

```hints
nudge: Round to whole grams first, then decide which unit. Which order matters for 999.6?
concept: `Math.round(grams)` gives whole grams. Compare *that* with 1,000: 999.6 rounds to 1,000, which is a kilogram. Dividing whole grams by 1,000 gives at most three decimal places, so `${whole / 1000} kg` needs no more rounding.
shape: `export function formatAmount(grams) { const whole = Math.round(grams); return whole >= 1000 ? … : …; }`
answer: ~~~javascript
export function formatAmount(grams) {
  const whole = Math.round(grams);
  return whole >= 1000 ? `${whole / 1000} kg` : `${whole} g`;
}
~~~
```

```check
run "node -e \"import('./playground/requirements/amounts.mjs').then(({ formatAmount }) => console.log('[' + [2500, 800, 1000, 999.6, 1234.5678, 0.1 * 3 * 1000].map(formatAmount).join('|') + ']'))\"" stdout="[2.5 kg|800 g|1 kg|1 kg|1.235 kg|300 g]" label="formatAmount shows whole grams, in g or kg" -- Round to whole grams first, then compare with 1000.
git-clean -- Commit it: git add playground, then git commit.
```
