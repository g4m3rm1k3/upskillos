---
title: 5.5 — Solution: Types for a Colleague's Code
runtime: none
experiments: The bug types found
teaches: optional properties, nullish coalescing
uses: typing existing code, type aliases, union types
---

This lesson goes through one solution to the invoice challenge, one bug at a time. **If yours passed every check, keep it**, and compare. The finished module is:

```typescript
type Line = { name: string; price: number; quantity: number };

export function parseQuantity(text: string): number | null {
  if (text.trim() === "") {
    return null;
  }
  const value = Number(text);
  if (!Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

export function lineTotal(line: Line): number {
  return line.price * line.quantity;
}

export function invoiceTotal(lines: Line[]): number {
  let total = 0;
  for (let i = 0; i < lines.length; i++) {
    total = total + lineTotal(lines[i]);
  }
  return total;
}

export function describe(line: Line): string {
  return line.quantity + " x " + line.name + " at " + line.price;
}
```

## Types first {#types-first}

The first move on unfamiliar code is to say what it should take and give, before changing any behaviour:

```typescript
type Line = { name: string; price: number; quantity: number };
```

and then `line: Line`, `lines: Line[]`, and a return type on every function. Writing them down is also a test of whether you understand the module: if you can't say what a function returns, that's the first thing to find out.

## The bug types found

With `line: Line`, the checker stops at `describe`:

```text
error TS2339: Property 'qty' does not exist on type 'Line'.
```

The colleague's `line.qty` was always `undefined`, so the description read `undefined x Coffee at 3.5`. Nothing crashed, which is why it shipped: JavaScript's habit of answering instead of failing (lesson 3.1). With types it can't survive a single check. Try it in your own copy: change `quantity` back to `qty`, run the type check, read the error, and put it back.

## The bug types didn't find

```typescript
total = total + lines[i].price;
```

```predict
question: With `total + lines[i].price`, what does `invoiceTotal` give for the two lines (2 coffees at 3.50, 3 bagels at 2.25)?
answer: 5.75
explain: It adds one price per line, 3.5 + 2.25, ignoring the quantities. The right answer, 2 × 3.5 + 3 × 2.25, is 13.75.
verify: node -e "console.log(3.5 + 2.25)"
```

Every type here is right: a number plus a number is a number. The answer is still wrong, 5.75 instead of 13.75, because it adds each line's **price** instead of its **total**. Only running the code with known inputs and checking the answer finds this, which is what the check program did. The fix reuses the function that already exists:

```typescript
total = total + lineTotal(lines[i]);
```

Reusing `lineTotal`, rather than writing `lines[i].price * lines[i].quantity` again, means the rule for a line's total lives in one place, and a future change (a discount, say) can't be made in one place and forgotten in the other.

## The rule nobody wrote down

```typescript
export function parseQuantity(text: string): number | null {
  if (text.trim() === "") {
    return null;
  }
  const value = Number(text);
  if (!Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}
```

- **Blank text first**, because `Number("")` is `0` and `Number("  ")` is `0` too (lesson 5.2's Your turn).
- **`Number.isInteger(value)`** is false for `2.5`, and for `NaN`, so one test covers fractions and junk.
- **`value < 1`** rejects 0 and every negative.
- **`number | null`**: the caller must deal with "no", because TypeScript won't let it use the result as a number until it has checked for `null` (narrowing, lesson 5.2).

This is called **validating input at the boundary**: the place where text from outside (a form, a file, a request) becomes data inside the program. Checked there, every function after it can trust its numbers. Checked nowhere, a negative quantity travels all the way to a refund.

## What else types can say {#optional}

Two more pieces of TypeScript you'll use constantly, both for values that might not be there:

- **An optional property**, written with `?`: `type Line = { name: string; price: number; quantity: number; discount?: number };` says a line *may* have a `discount`. Reading `line.discount` then gives `number | undefined`, and `--strict` makes you deal with the `undefined`.
- **`??`**, the *nullish coalescing* operator: `a ?? b` is `a`, unless `a` is `undefined` or `null`, in which case it's `b`. So `line.discount ?? 0` is the discount, or 0 when there isn't one.

## Your turn: an optional discount

Click **Create provided playground/ts/discount-check.ts**:

```typescript file=playground/ts/discount-check.ts provided
import { lineTotal } from "./invoice.ts";

console.log(lineTotal({ name: "Tea", price: 2, quantity: 3, discount: 50 }));
console.log(lineTotal({ name: "Tea", price: 2, quantity: 3 }));
```

Give a line an **optional** `discount`, a percentage, in your `invoice.ts`: `lineTotal` takes it off when it's there. The check program should print `3`, then `6`. Everything from the challenge must still pass. Commit and push.

```check
run "node playground/ts/discount-check.ts" stdout="3" label="half off 3 teas at 2.00 is 3"
run "node playground/ts/discount-check.ts" stdout="6" label="without a discount, 3 teas at 2.00 is 6"
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions playground/ts/discount-check.ts playground/ts/invoice-check.ts" label="both check programs type-check with --strict" -- Add discount?: number to the Line type.
git-clean -- Commit it: git add playground, then git commit.
git-pushed
```

```hints
nudge: Two changes: the type learns about the discount, and `lineTotal` uses it.
concept: `discount?: number` makes the property optional. `line.discount ?? 0` is the discount, or 0. A discount of 50 percent leaves 100 − 50 = 50 percent of the price.
shape: Add `discount?: number` to `Line`; in `lineTotal`, multiply the line's total by `(100 - (line.discount ?? 0)) / 100`.
answer: ~~~typescript
type Line = { name: string; price: number; quantity: number; discount?: number };

export function lineTotal(line: Line): number {
  return (line.price * line.quantity * (100 - (line.discount ?? 0))) / 100;
}
~~~
```
