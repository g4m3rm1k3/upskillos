---
title: 8.7 — Challenge: Where Does This Number Come From?
runtime: none
teaches: tracing precedents and dependents, comparison functions
uses: graph traversal, graphs, caches, sets, dom, classlist, design tokens, tests, test-driven development, input limits, git merge, git push
---

### The story so far

Sprint 8 rebuilt recalculation on computer science you learned in the playground first. Lesson 8.1 measured the old way: 7,550 calls to show a sheet with one 100-cell chain, and a `RangeError` for chains longer than about 1,600 cells. A **graph** of which cells read which (8.2), traversed with a to-visit list instead of recursion (8.3), put in **topological order** (8.4), and a **cache** of values (8.5) made the same edit cost 100 evaluations, and the page now redraws only the cells an edit changed (8.6). Everything is on the `recalc` branch.

## The brief

> **From a user:** "When a total looks wrong, I can't tell where it comes from. I click on it and see `=D2+D3+D4`, then I click on D2 and see *its* formula, and so on, cell by cell. Excel has *Trace Precedents* and *Trace Dependents* for this. Can yours?"
>
> **The feature:**
>
> - `book.precedents(address)` gives the names of every cell the given cell's value **comes from**: the cells its formula reads, the cells *their* formulas read, and so on.
> - `book.dependents(address)` gives the names of every cell whose value **would change** if this cell changed.
> - Both lists are in **reading order**: row by row from the top, and left to right along each row. B1 comes before A2.
> - **On the page:** when a cell is selected, its precedents are shaded in one colour and its dependents in another, both from colour tokens. Selecting a different cell clears the old shading.
>
> **Performance and security:** anyone you share a sheet with chooses its formulas, so tracing must stay quick on any sheet. Tracing the last cell of a 10,000-cell chain must take under 100 ms, and must not run out of call stack. A cycle must not make it go round forever.
>
> **Delivery:** with the supplied tests passing, merged into `main`, pushed, and the `recalc` branch deleted.

The acceptance tests are supplied: click **Create provided src/trace.test.ts**:

```typescript file=src/trace.test.ts provided
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

function bookWith(cells: Record<string, string>): Workbook {
  const book = new Workbook();
  for (const [text, value] of Object.entries(cells)) {
    book.set(at(text), value);
  }
  return book;
}

describe("tracing", () => {
  it("finds what a value comes from, directly and through other cells, in reading order", () => {
    const book = bookWith({ A1: "2", A2: "=A1*10", B1: "=A2+C3", C3: "4" });
    expect(book.precedents(at("B1"))).toEqual(["A1", "A2", "C3"]);
    expect(book.precedents(at("A1"))).toEqual([]);
  });

  it("finds every cell whose value would change, in reading order", () => {
    const book = bookWith({ A1: "2", A2: "=A1*10", B1: "=A2+C3", C3: "4" });
    expect(book.dependents(at("A1"))).toEqual(["B1", "A2"]);
    expect(book.dependents(at("C3"))).toEqual(["B1"]);
  });

  it("is empty for a cell that reads nothing and that nothing reads", () => {
    const book = bookWith({ A1: "1", D9: "x" });
    expect(book.precedents(at("D9"))).toEqual([]);
    expect(book.dependents(at("D9"))).toEqual([]);
  });

  it("follows a cycle without going round it forever", () => {
    const book = bookWith({ A1: "=B1", B1: "=A1" });
    expect(book.precedents(at("A1"))).toEqual(["A1", "B1"]);
    expect(book.dependents(at("B1"))).toEqual(["A1", "B1"]);
  });

  it("traces a chain of 10,000 cells in under 100 ms, without running out of stack", () => {
    const book = new Workbook();
    for (let row = 1; row < 10000; row++) {
      book.set({ column: 0, row }, `=A${row}+1`);
    }
    const start = performance.now();
    const found = book.precedents({ column: 0, row: 9999 });
    expect(performance.now() - start).toBeLessThan(100);
    expect(found.length).toBe(9999);
    expect(found[0]).toBe("A1");
  });
});
```

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| finds what a value comes from, directly and through other cells, in reading order | precedents at any distance, and the order | A1 missing because it's two steps away, or the cells in whatever order the search found them |
| finds every cell whose value would change, in reading order | dependents, ordered by row first | `["A2", "B1"]`: names sorted as text put A2 first, which isn't reading order |
| is empty for a cell that reads nothing and that nothing reads | the empty case | a cell listed as its own precedent |
| follows a cycle without going round it forever | the found set | a trace that never returns, freezing the page |
| traces a chain of 10,000 cells in under 100 ms, without running out of stack | performance and safety | recursion through cells (8.1's crash), or a slow sort |

## How a professional would go about it

Read the tests, then look for what already exists. Most of this feature is code you've written: `downstream` already finds dependents. Precedents are the same search in the other direction, over `readsOf` instead of `readersOf`, the way your 8.3 Your turn found everything a course needs. When two pieces of code differ in one step only, that's a hint they could share the rest.

Reading order is a sort, and JavaScript's `array.sort` takes a **comparison function**: `(a, b) => …`, returning a negative number when `a` should come first, a positive one when `b` should, and 0 when it doesn't matter. `[3, 1, 2].sort((a, b) => a - b)` gives `[1, 2, 3]`. Without one, `sort` compares items as text, which is why `"A10"` would come before `"A2"`.

For the page, `select` already runs every time the selection moves: it's the place to update the shading.

## Your turn: build it to the brief

Build it, test first, on the `recalc` branch. Then merge into `main`, push, and delete the branch:

```powershell
git add src
git commit -m "Trace precedents and dependents"
git switch main
git merge recalc
git push
git branch -d recalc
```

```hints
nudge: Start with `dependents`: it's `downstream`, sorted. Then ask what `downstream` would look like if it followed the other edges.
concept: An `upstream(cell)` in the graph is `downstream` with `readsOf` in place of `readersOf`. To sort cell names in reading order, compare their positions: parse each name back into an address, and compare rows first, then columns. On the page, `select` can clear every `td.precedent` and `td.dependent`, then add a class to each traced cell, found with `cellAt` (lesson 5.2).
shape: In `graph.ts`, an `upstream` method. In `workbook.ts`, `precedents` and `dependents`, each calling the graph and then a sorting helper. In `grid.ts`, a `trace(address)` function, called at the end of `select`. In `style.css`, two colour tokens and two rules.
answer: Lesson 8.8 goes through one solution, piece by piece.
```

```check
run "npx vitest run trace" stdout="5 passed" label="the 5 tracing tests pass, the 10,000-cell chain included" -- Precedents follow readsOf, dependents readersOf, both with a to-visit list; then sort by row, then column.
run "npx vitest run" stdout="66 passed" label="all 66 tests pass"
run "npx tsc" label="the project type-checks"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const td = (r, c) => rows[r].querySelectorAll('td')[c]; const type = (r, c, text) => { td(r, c).click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; type(0, 0, '2'); type(1, 0, '=A1*10'); type(0, 1, '=A2+C3'); type(2, 2, '4'); const name = (cell) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[cell.cellIndex - 1] + cell.parentElement.rowIndex; const marked = (kind) => [...document.querySelectorAll('td.' + kind)].map(name).join(','); td(1, 0).click(); const first = marked('precedent') + '/' + marked('dependent'); td(2, 2).click(); return first + ' ' + marked('precedent') + '/' + marked('dependent'); })()" "A1/B1 /B1" server=vite errors=none label="selecting A2 marks A1 as a precedent and B1 as a dependent; selecting C3 clears them and marks B1" -- In select, clear the old classes, then add a precedent or dependent class to each traced cell.
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const td = (r, c) => rows[r].querySelectorAll('td')[c]; const type = (r, c, text) => { td(r, c).click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; type(0, 0, '2'); type(1, 0, '=A1*10'); type(0, 1, '=A2'); td(1, 0).click(); const bg = (cell) => getComputedStyle(cell).backgroundColor; const plain = bg(td(5, 5)); return [bg(td(0, 0)) !== plain, bg(td(0, 1)) !== plain, bg(td(0, 0)) !== bg(td(0, 1))].join(' '); })()" "true true true" server=vite errors=none label="precedents and dependents are shaded, in two different colours" -- Two rules in style.css, td.precedent and td.dependent, each with a background from its own token.
git-branch main
git-no-branch recalc -- After merging, delete the branch.
git-pushed
git-clean
```

## Sprint 8 is done

Editing a cell now costs work in proportion to what depends on it, not to the size of the sheet. On the way you used the ideas behind most of the systems you'll build: graphs for anything with dependencies, traversal with a to-visit list and a found set, topological order for doing things in a safe order, caches and the discipline of keeping them correct, and measuring before and after. Lesson 8.8 goes through one solution to the challenge. Sprint 9 builds on the graph: ranges like `A1:A10`, and functions like `SUM`.
