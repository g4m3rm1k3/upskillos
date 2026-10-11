---
title: 9.7 — Challenge: COUNTIF and SUMIF
runtime: none
teaches: criteria, resource limits
uses: function registries, lazy evaluation, comparison operators, mixed-type ordering, case-insensitive comparison, text literals, ranges, input limits, denial of service, regular expressions, tests, test-driven development, working from a brief, git merge, git push
---

### The story so far

Sprint 9 grew the formula language. Ranges (9.1); function calls looked up in a registry (9.2), with `SUM`, `AVERAGE`, `MIN`, `MAX` and `COUNT` (9.3); text and TRUE and FALSE (9.4); comparisons with Excel's rules in `compare.ts` (9.5); and `IF`, with every function now receiving `Argument`s it works out only when it asks (9.6). Everything is on the `functions` branch.

## The brief

> **From a user:** "I keep a sheet of orders: the customer in column A, the quantity in column B. I need to know how many orders were over 10, and the total quantity Apple ordered. In Excel that's `COUNTIF` and `SUMIF`."
>
> **The feature:**
>
> - `COUNTIF(range, criterion)` counts the cells in `range` that pass the **criterion**.
> - `SUMIF(range, criterion)` adds up the numbers in `range` that pass. `SUMIF(range, criterion, sumRange)` checks `range` but adds up the cells in the same positions of `sumRange`: `=SUMIF(A1:A5, "apple", B1:B5)` is Apple's total quantity. The two ranges must be the same size.
> - A **criterion** is text starting with an operator, `">10"`, `"<=4"`, `"<>apple"`, compared with the cell using 9.5's rules; or with no operator, `"apple"` or `12`, meaning *equal to*. Text matches without caring about capitals.
> - An empty cell never passes, except for a criterion that's empty itself.
> - The wrong number of arguments is `#VALUE!`.
>
> **Security:** anyone you share a sheet with chooses its formulas. `=SUM(A1:ZZZ1000000)` names more than 18 billion cells: working it out would use up all the memory of the computer of everyone who opens the sheet, and then crash. A formula naming a range of more than **100,000 cells** must be refused when it's read, before anything is worked out, and show `#ERROR!`.
>
> **Delivery:** with the supplied tests passing, merged into `main`, pushed, and the `functions` branch deleted.

The acceptance tests are supplied: click **Create provided src/countif.test.ts**:

```typescript file=src/countif.test.ts provided
import { describe, expect, it } from "vitest";
import { parseAddress, type Address } from "./address.ts";
import { Workbook } from "./workbook.ts";

function at(text: string): Address {
  const address = parseAddress(text);
  if (address === null) {
    throw new Error(`Bad address in a test: ${text}`);
  }
  return address;
}

const orders = { A1: "apple", A2: "Banana", A3: "apple", A4: "cherry", A5: "", B1: "4", B2: "12", B3: "7", B4: "15", B5: "3" };

function valueOf(formula: string, cells: Record<string, string> = orders): unknown {
  const book = new Workbook();
  for (const [text, value] of Object.entries(cells)) {
    book.set(at(text), value);
  }
  book.set(at("Z99"), formula);
  return book.value(at("Z99"));
}

describe("COUNTIF and SUMIF", () => {
  it("counts the cells that pass a numeric test", () => {
    expect(valueOf('=COUNTIF(B1:B5, ">10")')).toBe(2);
    expect(valueOf('=COUNTIF(B1:B5, "<=4")')).toBe(2);
    expect(valueOf('=COUNTIF(B1:B5, "<>7")')).toBe(4);
    expect(valueOf("=COUNTIF(B1:B5, 12)")).toBe(1);
  });

  it("counts text matches without caring about capitals, and leaves empty cells out", () => {
    expect(valueOf('=COUNTIF(A1:A5, "APPLE")')).toBe(2);
    expect(valueOf('=COUNTIF(A1:A5, "<>apple")')).toBe(2);
  });

  it("adds up the numbers that pass, or the matching numbers from another range", () => {
    expect(valueOf('=SUMIF(B1:B5, ">5")')).toBe(34);
    expect(valueOf('=SUMIF(A1:A5, "apple", B1:B5)')).toBe(11);
  });

  it("gives #VALUE! for the wrong number of arguments, or ranges of different sizes", () => {
    expect(valueOf("=COUNTIF(B1:B5)")).toEqual({ error: "#VALUE!" });
    expect(valueOf('=SUMIF(A1:A5, "apple", B1:B3)')).toEqual({ error: "#VALUE!" });
  });

  it("refuses a range of more than 100,000 cells, but allows 100,000", () => {
    expect(valueOf("=SUM(A1:B50001)", {})).toEqual({ error: "#ERROR!" });
    expect(valueOf("=COUNT(A1:A100000)", {})).toBe(0);
  });
});
```

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| counts the cells that pass a numeric test | criteria with each kind of operator, and a plain number | the `10` in `">10"` left as text: every number ranks below text, so no number is over it, and the count is 0 |
| counts text matches without caring about capitals, and leaves empty cells out | text criteria, and the empty-cell rule | A5, empty, counted as *not apple*, making `"<>apple"` 3 |
| adds up the numbers that pass, or the matching numbers from another range | `SUMIF`, with and without `sumRange` | adding up column A, or every quantity |
| gives #VALUE! for the wrong number of arguments, or ranges of different sizes | the argument checks | `SUMIF` quietly adding up B1:B3 for a check over five cells |
| refuses a range of more than 100,000 cells, but allows 100,000 | the limit, exactly at the edge | no limit at all, or one that's off by one |

The last test uses `A1:B50001`, which is 2 × 50,001 = 100,002 cells: just over the limit, but small enough that code with no limit fails the test quickly instead of using up your computer's memory.

## How a professional would go about it

Read the tests first; they say more exactly than the brief what each case gives. Then look for what exists: `compare` (9.5) already does every comparison a criterion needs, with the right rules for text and numbers. What's missing is turning `">10"` into an operator and a value, and the `10` in `">10"` must become the number 10 before comparing: left as text, it ranks above every number.

Splitting `">10"` is a job for a **regular expression** (lesson 6.3's tool for patterns in text): an optional operator at the start, then the rest. One trap: `<` is also the start of `<=` and `<>`, so the longer operators must be tried first.

A good shape is a helper that turns a criterion into a **function**, `(value) => boolean`: then `COUNTIF` is `filter` and a length, and `SUMIF` uses the same test. For the limit, the parser already knows both corners of every range when it reads one.

## Your turn: build it to the brief

Build it, test first, on the `functions` branch. Then merge into `main`, push, and delete the branch:

```powershell
git add src
git commit -m "COUNTIF and SUMIF, and a limit on range size"
git switch main
git merge functions
git push
git branch -d functions
```

```hints
nudge: Start with `COUNTIF(B1:B5, 12)`, a plain value meaning *equal to*, then add the operators one at a time. The range limit is three lines in the parser, where a `range` node is made.
concept: A regular expression like `/^(<=|>=|<>|<|>|=)?(.*)$/` gives the operator (maybe missing: then `=`) and the rest. If the rest looks like a number, make it one. The criterion's function compares each value with `compare(op, value, target)`, and says no for errors and for empty cells. A range's size is (columns across) × (rows down), each `Math.abs(difference) + 1`.
shape: In `functions.ts`, `function criterion(rule: Value): ((value: Value) => boolean) | ErrorValue`, then `countIf` and `sumIf`, both registered. In `parser.ts`, before returning a `range` node, throw a `FormulaError` if it holds more than 100,000 cells.
answer: Lesson 9.8 goes through one solution, piece by piece.
```

```check
run "npx vitest run src/countif.test" stdout="5 passed" label="the 5 COUNTIF and SUMIF tests pass, the range limit included" -- Turn the criterion into an operator and a value, compare with compare(); refuse ranges over 100,000 cells in the parser.
run "npx vitest run" stdout="96 passed" label="all 96 tests pass"
run "npx tsc" label="the project type-checks"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const td = (r, c) => rows[r].querySelectorAll('td')[c]; const type = (r, c, text) => { td(r, c).click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; type(0, 0, 'apple'); type(1, 0, 'Banana'); type(2, 0, 'APPLE'); type(0, 1, '=COUNTIF(A1:A3, \"apple\")'); type(1, 1, '=SUM(A1:B50001)'); return td(0, 1).textContent + ' ' + td(1, 1).textContent; })()" "2 #ERROR!" server=vite errors=none label="on the page, COUNTIF finds both apples, and a range of more than 100,000 cells shows #ERROR!" -- Register COUNTIF; check the range size where the parser makes a range node.
git-branch main
git-no-branch functions -- After merging, delete the branch.
git-pushed
git-clean
```

## Sprint 9 is done

The formula language now has most of what makes a spreadsheet useful: ranges, a library of functions, text, TRUE and FALSE, comparisons, and `IF`. On the way you met ideas that every programming language is built on: a registry that maps names to code, functions as values, eager and lazy evaluation, and type rules that decide what `"5"+1` means. And a security habit: when other people choose the input, every input needs a limit. Lesson 9.8 goes through one solution to the challenge.
