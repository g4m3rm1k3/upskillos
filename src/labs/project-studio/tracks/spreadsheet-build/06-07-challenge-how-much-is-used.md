---
title: 6.7 — Challenge: How Much of the Sheet Is Used?
runtime: none
teaches: working from acceptance tests, performance as a requirement
uses: classes, maps, sparse storage, addresses, tests, branches, test-driven development
---

Saving a sheet, printing it and scrolling to its end all need one question answered: **which part of the sheet has anything in it?** The answer is the smallest rectangle holding every non-empty cell, from its top-left corner to its bottom-right. This challenge adds it to the `Sheet`, from a spec and a set of acceptance tests, with no code shown.

## The spec

> Add a method **`used()`** to `Sheet`:
>
> - It returns `{ from, to }`, two `Address`es: `from` is the top-left corner of the smallest rectangle that holds every non-empty cell, and `to` is its bottom-right corner.
> - For an empty sheet, it returns `null`.
> - Emptying a cell can make the rectangle smaller.
> - **It must answer at once, however far apart the cells are.** A sheet with something in A1 and something in column 18,277, row 1,000,000 holds two cells. Checking every position in between would mean about 18 billion checks: the page would freeze. So would a server asked the question by anyone who can type into two cells. Speed here isn't a nicety, it's what stops one user's sheet from hanging the program.

Click **Create provided src/sheet-used.test.ts**: the acceptance tests.

```typescript file=src/sheet-used.test.ts provided
import { describe, expect, it } from "vitest";
import { Sheet } from "./sheet.ts";

describe("Sheet.used", () => {
  it("is null for an empty sheet", () => {
    expect(new Sheet().used()).toBeNull();
  });

  it("is a single cell when only one cell has something in it", () => {
    const sheet = new Sheet();
    sheet.set({ column: 2, row: 4 }, "x");
    expect(sheet.used()).toEqual({ from: { column: 2, row: 4 }, to: { column: 2, row: 4 } });
  });

  it("is the smallest rectangle holding every non-empty cell", () => {
    const sheet = new Sheet();
    sheet.set({ column: 3, row: 1 }, "a");
    sheet.set({ column: 1, row: 5 }, "b");
    sheet.set({ column: 4, row: 2 }, "c");
    expect(sheet.used()).toEqual({ from: { column: 1, row: 1 }, to: { column: 4, row: 5 } });
  });

  it("shrinks when the outermost cell is emptied", () => {
    const sheet = new Sheet();
    sheet.set({ column: 0, row: 0 }, "a");
    sheet.set({ column: 9, row: 9 }, "b");
    sheet.set({ column: 9, row: 9 }, "");
    expect(sheet.used()).toEqual({ from: { column: 0, row: 0 }, to: { column: 0, row: 0 } });
  });

  it("answers at once for cells very far apart", () => {
    const sheet = new Sheet();
    sheet.set({ column: 0, row: 0 }, "near");
    sheet.set({ column: 18277, row: 999999 }, "far");
    const start = performance.now();
    expect(sheet.used()).toEqual({ from: { column: 0, row: 0 }, to: { column: 18277, row: 999999 } });
    expect(performance.now() - start).toBeLessThan(50);
  });
});
```

Work on a branch, `used-range`; merge it and push when every check passes.

## Your turn: build it to the tests

```check
run "npx vitest run sheet-used" stdout="5 passed" label="all five acceptance tests pass" -- Run npx vitest run sheet-used and read which test fails first.
run "npx vitest run sheet-used -t \"very far apart\"" stdout="1 passed" label="it answers at once, however far apart the cells are" -- Look only at the cells the sheet has stored, not at every position.
run "npm run check" label="the project type-checks"
run "npm test" stdout="21 passed" label="all 21 of the project's tests pass"
git-branch main -- Finish on main, after merging: git switch main, git merge used-range
git-no-branch used-range -- Delete the branch once it's merged.
git-pushed
git-clean
```

```hints
nudge: The sheet's map holds exactly the cells that have something in them. Which of them is furthest left, furthest right, highest and lowest?
concept: `this.cells.keys()` gives the map's keys, the addresses as text, and `for (const key of …)` visits each one (lesson 6.2). `parseAddress` turns each back into an `Address`. `Math.min` and `Math.max` give the smaller and larger of two numbers. Before the first cell, there's no rectangle yet: that's the `null` case.
shape: Keep a `from` and a `to`, both starting as `null`. For each key: parse it; if there's no rectangle yet, the cell is the whole rectangle; otherwise stretch `from` down to the smaller column and row, and `to` up to the larger. After the loop, return `null` or `{ from, to }`.
```
