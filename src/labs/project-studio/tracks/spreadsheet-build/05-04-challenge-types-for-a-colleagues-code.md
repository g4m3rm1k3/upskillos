---
title: 5.4 — Challenge: Types for a Colleague's Code
runtime: none
teaches: typing existing code, type aliases, business rules as validation
uses: typescript, union types, narrowing, git push
---

A situation you'll meet in every job: a colleague wrote a module without types, it "works", and now it's yours. Adding types is often the fastest way to find out what's wrong with code you didn't write, because the compiler reads every line, every time. But this sprint showed that types can't find every bug, so the module comes with a small program that shows what the rest of the code expects of it.

## The code

Click **Create provided playground/ts/invoice.ts**, and read it as if it had just become yours:

```typescript file=playground/ts/invoice.ts provided
// invoice.ts: a colleague wrote this. "It works," they said.

export function parseQuantity(text) {
  return Number(text);
}

export function lineTotal(line) {
  return line.price * line.quantity;
}

export function invoiceTotal(lines) {
  let total = 0;
  for (let i = 0; i < lines.length; i++) {
    total = total + lines[i].price;
  }
  return total;
}

export function describe(line) {
  return line.qty + " x " + line.name + " at " + line.price;
}
```

## What the rest of the code expects {#check-program}

The module came with a small program that uses it the way the rest of the code does. Click **Create provided playground/ts/invoice-check.ts**:

```typescript file=playground/ts/invoice-check.ts provided
// invoice-check.ts: what the rest of the program expects of invoice.ts. Don't change this file.
import { describe, invoiceTotal, parseQuantity } from "./invoice.ts";

const lines = [
  { name: "Coffee", price: 3.5, quantity: 2 },
  { name: "Bagel", price: 2.25, quantity: 3 },
];

console.log(describe(lines[0]));
console.log(invoiceTotal(lines));
console.log(JSON.stringify(["2", "0", "-3", "2.5", "abc", ""].map(parseQuantity)));
```

Run the check program, `node playground/ts/invoice-check.ts`, and compare what it prints with what it should.

## The brief

> **Make `invoice.ts` correct, and keep it correct.**
>
> 1. It type-checks with `--strict`: run `npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions playground/ts/invoice-check.ts`.
> 2. `describe` gives `2 x Coffee at 3.5` for the first line.
> 3. `invoiceTotal` gives `13.75` for the two lines.
> 4. **`parseQuantity` accepts only whole numbers of 1 or more**, and gives `null` for everything else: 0, negatives, fractions, text that isn't a number, and blank text. This is a **security** requirement as much as a correctness one: a negative quantity makes a negative total, and in a shop's software a negative total is a refund that nobody approved. Inputs that matter for money are checked where they come in, and rejected, not "fixed".
> 5. **No `any`.** `any` switches the checker off; that's a way to hide bugs, not to fix them.
> 6. Don't change `invoice-check.ts`: it stands for the rest of the program.
> 7. Commit and push.

Two things you'll need that you haven't seen:

- **Naming an object type.** `type Line = { name: string; price: number; quantity: number };` gives the shape a name, and then `line: Line` and `lines: Line[]` (an array of them) can use it.
- **`Number.isInteger(x)`** is true when `x` is a whole number.

## Your turn: make it right

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions playground/ts/invoice-check.ts" label="1. invoice.ts type-checks with --strict" -- Give every parameter and result a type; a named type for a line helps.
run "node playground/ts/invoice-check.ts" stdout="2 x Coffee at 3.5" label="2. a line is described as 2 x Coffee at 3.5"
run "node playground/ts/invoice-check.ts" stdout="13.75" label="3. the invoice totals 13.75" -- 2 coffees at 3.50 and 3 bagels at 2.25.
run "node playground/ts/invoice-check.ts" stdout="[2,null,null,null,null,null]" label="4. only whole quantities of 1 or more are accepted" -- Reject 0, negatives, fractions, junk and blank text with null.
lacks playground/ts/invoice.ts "any" label="5. no any to silence the checker" -- Write the real types instead of any.
git-clean -- Commit it: git add playground, then git commit.
git-pushed -- Push it: git push
```

Notice which bugs the types found and which they didn't. That difference is this sprint's lesson, and the next sprint's tests are the answer to the ones types miss.

```hints
nudge: Start with types for everything, and run the type check: it will point straight at one bug. Then run the check program for the ones it can't see.
concept: With a `Line` type, `line.qty` is an error, because a line has no `qty`. The total's bug is a correct type and a wrong answer: read what's added to `total`. For the quantities, `Number` reads "-3" and "2.5" as numbers, so the rule needs checks of its own after converting, and blank text needs checking before.
shape: Annotate `parseQuantity` as `(text: string): number | null`, the others with `Line` and `Line[]`; fix `qty`; make the total add each line's total; reject blank text, then anything that isn't a whole number of at least 1.
```
