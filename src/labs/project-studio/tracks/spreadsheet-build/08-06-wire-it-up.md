---
title: 8.6 — Wire It Up, and Measure Again
runtime: none
experiments: Measure again
teaches: incremental rendering, before and after measurements
uses: caches, topological order, dom, keyboard events, benchmarks, measuring performance, classlist
---

### The story so far

The `Workbook` (8.5) keeps the sheet's text and a value for every cell. `book.set(address, text)` works out the edited cell and everything downstream of it, once each, in topological order, with no recursion through cells, and returns the names of the cells it worked out. Its tests include a differential test that agrees with the old `cellValue` on 300 random sheets, and a chain of 10,000 cells. The page doesn't use it yet: `grid.ts` still keeps a `Sheet` and calls `showAll` after every Enter, and `bench/recalc.ts` measured that at 7,550 calls for a sheet with one 100-cell chain (8.1).

### What this lesson builds

The page, on the workbook, and the numbers that show what changed. By the end:

| an edit to A1, on a sheet with a 100-cell chain | before (8.1) | after |
|---|---|---|
| work done | 7,550 calls to `cellValue` | 100 evaluations |
| time | about 20 ms | about 0.3 ms |
| cells redrawn | all 2,600 | the 100 that changed |
| a chain of 2,600 cells, the whole grid | `RangeError` after about 1,600 | works |

## The grid on the workbook {#workbook}

First, swap the `Sheet` and `cellValue` for the `Workbook`, changing as little as possible: `showAll` still redraws every cell, but now each cell is a lookup of a kept value, not a calculation. This step changes `src/grid.ts`:

```typescript file=src/grid.ts
import { formatAddress, type Address } from "./address.ts";
import { columnName } from "./columns.ts";
import { display } from "./compute.ts";
import { Workbook } from "./workbook.ts";

const columns = 26;
const rows = 100;
const book = new Workbook();

function find<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) {
    throw new Error("The page has no element matching " + selector);
  }
  return element;
}

const table = find<HTMLTableElement>("#grid");

const head = document.createElement("thead");
const headerRow = document.createElement("tr");
headerRow.appendChild(document.createElement("th"));
for (let c = 0; c < columns; c++) {
  const th = document.createElement("th");
  th.textContent = columnName(c);
  headerRow.appendChild(th);
}
head.appendChild(headerRow);
table.appendChild(head);

const body = document.createElement("tbody");
for (let r = 0; r < rows; r++) {
  const tr = document.createElement("tr");
  const rowHeader = document.createElement("th");
  rowHeader.textContent = String(r + 1);
  tr.appendChild(rowHeader);
  for (let c = 0; c < columns; c++) {
    const td = document.createElement("td");
    td.addEventListener("click", () => select({ column: c, row: r }));
    tr.appendChild(td);
  }
  body.appendChild(tr);
}
table.appendChild(body);

const nameBox = find<HTMLDivElement>("#name-box");
const formulaBar = find<HTMLInputElement>("#formula-bar");

let selected: Address = { column: 0, row: 0 };

function cellAt(address: Address): HTMLTableCellElement | undefined {
  return body.rows[address.row]?.cells[address.column + 1];
}

function select(address: Address): void {
  const cell = cellAt(address);
  if (cell === undefined) {
    return;
  }
  cellAt(selected)?.classList.remove("selected");
  selected = address;
  cell.classList.add("selected");
  nameBox.textContent = formatAddress(address);
  formulaBar.value = book.text(address);
  formulaBar.focus();
}

// Every cell shows the value the workbook keeps for it.
function showAll(): void {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const cell = cellAt({ column: c, row: r });
      if (cell !== undefined) {
        const value = book.value({ column: c, row: r });
        cell.textContent = display(value);
        cell.classList.toggle("error", typeof value === "object");
      }
    }
  }
}

formulaBar.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    book.set(selected, formulaBar.value);
    showAll();
    select({ column: selected.column, row: selected.row + 1 });
  }
});

select({ column: 0, row: 0 });
```

Six lines change, each a direct swap:

| before | after | why |
|---|---|---|
| `import { cellValue, display }` | `import { display }` | the page no longer calculates anything |
| `import { Sheet }` | `import { Workbook }` | |
| `const sheet = new Sheet()` | `const book = new Workbook()` | the one place the data lives now |
| `sheet.get(address)` | `book.text(address)` | the formula bar shows what was typed, as before |
| `cellValue(sheet, …)` | `book.value(…)` | a lookup in the cache |
| `sheet.set(…)` | `book.set(…)` | the workbook recalculates what the edit affects |

Start the dev server and try the page: everything works as before. It's faster already, because 2,600 lookups are far cheaper than 2,600 calculations, but it still redraws every cell for every edit.

```check
run "npx tsc" label="the project type-checks"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const td = (r, c) => rows[r].querySelectorAll('td')[c]; const type = (r, c, text) => { td(r, c).click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; type(1, 1, '3.50'); type(1, 2, '2'); type(1, 3, '=B2*C2'); const before = td(1, 3).textContent; type(1, 2, '4'); return before + ' ' + td(1, 3).textContent; })()" "7 14" server=vite errors=none label="D2 =B2*C2 shows 7, then 14 when C2 changes to 4" -- book.set stores the text and recalculates; showAll reads book.value for each cell.
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const td = (r, c) => rows[r].querySelectorAll('td')[c]; const type = (r, c, text) => { td(r, c).click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; type(0, 0, '=1/0'); return td(0, 0).textContent + ' ' + td(0, 0).classList.contains('error'); })()" "#DIV/0! true" server=vite errors=none label="errors still show, in red (7.5's Your turn)"
```

## Redraw only what changed {#show}

`book.set` already returns the cells whose values it worked out. Draw those, and nothing else. This step replaces `showAll` with `show`, which draws one cell, and changes the Enter handler:

```typescript file=src/grid.ts
import { formatAddress, parseAddress, type Address } from "./address.ts";
import { columnName } from "./columns.ts";
import { display } from "./compute.ts";
import { Workbook } from "./workbook.ts";

const columns = 26;
const rows = 100;
const book = new Workbook();

function find<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) {
    throw new Error("The page has no element matching " + selector);
  }
  return element;
}

const table = find<HTMLTableElement>("#grid");

const head = document.createElement("thead");
const headerRow = document.createElement("tr");
headerRow.appendChild(document.createElement("th"));
for (let c = 0; c < columns; c++) {
  const th = document.createElement("th");
  th.textContent = columnName(c);
  headerRow.appendChild(th);
}
head.appendChild(headerRow);
table.appendChild(head);

const body = document.createElement("tbody");
for (let r = 0; r < rows; r++) {
  const tr = document.createElement("tr");
  const rowHeader = document.createElement("th");
  rowHeader.textContent = String(r + 1);
  tr.appendChild(rowHeader);
  for (let c = 0; c < columns; c++) {
    const td = document.createElement("td");
    td.addEventListener("click", () => select({ column: c, row: r }));
    tr.appendChild(td);
  }
  body.appendChild(tr);
}
table.appendChild(body);

const nameBox = find<HTMLDivElement>("#name-box");
const formulaBar = find<HTMLInputElement>("#formula-bar");

let selected: Address = { column: 0, row: 0 };

function cellAt(address: Address): HTMLTableCellElement | undefined {
  return body.rows[address.row]?.cells[address.column + 1];
}

function select(address: Address): void {
  const cell = cellAt(address);
  if (cell === undefined) {
    return;
  }
  cellAt(selected)?.classList.remove("selected");
  selected = address;
  cell.classList.add("selected");
  nameBox.textContent = formatAddress(address);
  formulaBar.value = book.text(address);
  formulaBar.focus();
}

// Draws one cell, from the value the workbook keeps for it.
function show(key: string): void {
  const address = parseAddress(key);
  const cell = address === null ? undefined : cellAt(address);
  if (address === null || cell === undefined) {
    return;
  }
  const value = book.value(address);
  cell.textContent = display(value);
  cell.classList.toggle("error", typeof value === "object");
}

formulaBar.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    for (const key of book.set(selected, formulaBar.value)) {
      show(key);
    }
    select({ column: selected.column, row: selected.row + 1 });
  }
});

select({ column: 0, row: 0 });
```

**`show`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `key` | a cell's name, as `book.set` returns them | `"A2"` |
| returns | nothing; it sets that cell's text and error colour from `book.value` | A2 shows `3` |

- **`parseAddress(key)`** turns the name back into an address to find the cell on the page. A name that isn't an address, or one off the grid, is skipped: `cellAt` gives `undefined` there (lesson 5.2).
- **`for (const key of book.set(...))`** draws exactly the cells the workbook just worked out, in the order it worked them out.

Here's one Enter, typing `5` into A1 on the 100-cell chain:

| step | what happens |
|---|---|
| `book.set(A1, "5")` | A1 and its 99 downstream cells worked out: 100 evaluations |
| the loop | `show("A1")`, `show("A2")`, … `show("A100")`: 100 cells redrawn |
| everything else | untouched: 2,500 cells not even looked at |

The cell's error colour, from your 7.5 Your turn, moves into `show`, so it's set whenever a cell is drawn.

```check
run "npx tsc" label="the project type-checks"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const td = (r, c) => rows[r].querySelectorAll('td')[c]; const type = (r, c, text) => { td(r, c).click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; type(0, 0, '5'); const c3 = td(2, 2); c3.textContent = 'untouched'; type(0, 1, '=A1*2'); return c3.textContent + ' ' + td(0, 1).textContent; })()" "untouched 10" server=vite errors=none label="an edit redraws only the cells it changed: C3, which nothing touched, keeps its text" -- Draw only the cells book.set returns, with show; no more showAll.
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const td = (r, c) => rows[r].querySelectorAll('td')[c]; const type = (r, c, text) => { td(r, c).click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let previous = null; for (let r = 0; r < 100; r++) for (let c = 0; c < 26; c++) { type(r, c, previous === null ? '1' : '=' + previous + '+1'); previous = letters[c] + (r + 1); } type(0, 0, '1000'); return td(99, 25).textContent; })()" "3599" server=vite errors=none timeout=60 label="a chain through all 2,600 cells, with A1 changed at the end: Z100 shows 3599, and nothing crashes"
```

That last check fills the whole grid with one chain, each cell reading the one before it, then changes A1, so all 2,600 cells are recalculated in one go. In 8.1 a chain that long ran out of call stack at about 1,600 cells.

## Measure again {#measure}

Same situation as 8.1's benchmark, measured on the workbook. This step opens `bench/after.ts`:

```typescript file=bench/after.ts
import { Workbook } from "../src/workbook.ts";

const book = new Workbook();
book.set({ column: 0, row: 0 }, "1");
for (let row = 1; row < 100; row++) {
  book.set({ column: 0, row }, `=A${row}+1`);
}

book.evaluations = 0;
const start = performance.now();
const changed = book.set({ column: 0, row: 0 }, "2");
const ms = performance.now() - start;
console.log(`${book.evaluations} evaluations, ${changed.length} cells to redraw, ${ms.toFixed(2)} ms`);
```

It builds the same 100-cell chain, then measures one edit to A1: **`book.evaluations = 0`** first, so building the chain doesn't count. Before you run it, predict:

```predict
question: How many evaluations does the edit to A1 take now?
choice: 7,550, the same as before
choice: 5,050
choice: 100
answer: 100
explain: A1 and the 99 cells downstream of it, each worked out once, reading the value just kept for the cell above. The 2,500 empty cells aren't touched, and no cell in the chain recalculates the cells above it.
verify: if ((node bench/after.ts) -match '^100 evaluations') { '100' } else { 'something else' }
```

Run both benchmarks, three times each:

```powershell
node bench/recalc.ts
node bench/after.ts
```

```text
7550 calls to cellValue, 21.6 ms
100 evaluations, 100 cells to redraw, 0.25 ms
```

The calls dropped from 7,550 to 100: that number doesn't wobble, and it's the real result. The time dropped from about 20 ms to about a quarter of a millisecond, eighty times faster on this sheet, and the gap grows with the chain: the old way was quadratic in the chain's length, the new one is linear. Try a 1,000-cell chain in both (change the `100`s): the old one makes about half a million calls, the new one 1,000.

An edit nothing depends on is cheaper still: one evaluation, for the edited cell. Add a line that sets F51 to `hello` and prints the evaluations again, if you'd like to see it.

```check
run "node bench/after.ts" stdout="100 evaluations, 100 cells to redraw" label="an edit to A1 takes 100 evaluations and redraws 100 cells" -- Set evaluations to 0 after building the chain, then time one book.set.
run "node bench/recalc.ts" stdout="7550 calls to cellValue" label="the old way still measures 7,550 calls, for comparison"
```

## Commit

```powershell
git add bench src
git commit -m "Show values from the workbook, redrawing only what changed"
```

```check
git-tracked bench/after.ts
git-clean
```

## Your turn: say what was recalculated

Spreadsheets show what they're doing in a status line at the bottom of the window. Add one: a `<div id="status">` after the grid in `index.html`, which after every Enter says how many cells were recalculated, in exactly this form: `3 cells recalculated`, or `1 cell recalculated` for one. Commit on the `recalc` branch.

```hints
nudge: `book.set` already tells you which cells it worked out. How many are there?
concept: Keep what `book.set` returns in a variable, draw each cell, then use the array's `length`. The singular needs its own word: `changed.length === 1 ? "cell" : "cells"` (the `? :` operator from lesson 7.2).
shape: In `index.html`, `<div id="status"></div>` after the table. In `grid.ts`, `const status = find<HTMLDivElement>("#status");`, and in the Enter handler: `const changed = book.set(...)`; the loop over `changed`; then `status.textContent = ...`.
answer: ~~~typescript
    const changed = book.set(selected, formulaBar.value);
    for (const key of changed) {
      show(key);
    }
    status.textContent = `${changed.length} ${changed.length === 1 ? "cell" : "cells"} recalculated`;
~~~
with `const status = find<HTMLDivElement>("#status");` near the other `find` calls, and `<div id="status"></div>` after the table in `index.html`.
```

```check
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const td = (r, c) => rows[r].querySelectorAll('td')[c]; const type = (r, c, text) => { td(r, c).click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; type(0, 0, '1'); type(1, 0, '=A1+1'); type(2, 0, '=A2+1'); type(0, 0, '5'); const three = document.querySelector('#status').textContent; type(4, 1, 'x'); return three + '|' + document.querySelector('#status').textContent; })()" "3 cells recalculated|1 cell recalculated" server=vite errors=none label="the status line counts the cells recalculated, with cell for one" -- Show changed.length after every Enter, and use cell, not cells, for one.
run "npx tsc" label="the project type-checks"
git-clean -- Commit it: git commit -am "Say how many cells were recalculated"
```
