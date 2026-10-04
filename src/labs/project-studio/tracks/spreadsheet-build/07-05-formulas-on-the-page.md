---
title: 7.5 — Formulas on the Page
runtime: none
---

Everything is in place except the page. This lesson connects them: cells show their **values**, the formula bar shows what was **typed**, and when one cell changes, every cell that depends on it changes too. Then you'll find the input that breaks it.

## Show values, not text

Replace `grid.ts`. Two things change: the import of `cellValue` and `display`, and a new function `showAll`, which the Enter key calls instead of drawing just one cell.

```typescript file=src/grid.ts
import { formatAddress, type Address } from "./address.ts";
import { columnName } from "./columns.ts";
import { cellValue, display } from "./compute.ts";
import { Sheet } from "./sheet.ts";

const columns = 26;
const rows = 100;
const sheet = new Sheet();

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
  formulaBar.value = sheet.get(address);
  formulaBar.focus();
}

// Every cell shows its value, worked out from the sheet. One cell's change can change any
// cell whose formula uses it, so all of them are worked out again.
function showAll(): void {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const cell = cellAt({ column: c, row: r });
      if (cell !== undefined) {
        cell.textContent = display(cellValue(sheet, { column: c, row: r }));
      }
    }
  }
}

formulaBar.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sheet.set(selected, formulaBar.value);
    showAll();
    select({ column: selected.column, row: selected.row + 1 });
  }
});

select({ column: 0, row: 0 });
```

### Why every cell, every time

When you type into C2, which cells need redrawing? C2, obviously, and also every cell whose formula mentions C2, and every cell whose formula mentions *those*, and so on. The code doesn't yet know which cells those are: it would have to read every formula to find out. So `showAll` takes the simple, certainly-correct route: work out all 2,600 cells again.

Simple and correct is the right first version. It's also wasteful (one change, 2,600 calculations), and a cell used by several formulas is worked out once for each of them. Sprint 8 measures that cost and replaces it with "work out only what depends on the change". Being correct first and then measuring before optimising (lesson 4.3's lesson about measuring, applied to code) is a habit worth keeping.

### The formula bar shows the formula

Nothing changed in `select`: it already showed `sheet.get(address)`, the typed text, while the cell now shows the value. That's how every spreadsheet works: the cell shows `7`, the bar shows `=B2*C2`. Sprint 6's design (the sheet stores text, the page draws from it) made that separation free.

## Try it

Start the dev server and type, in the column-letter order you'd read them:

- B2: `3.50`, C2: `2`, D2: `=B2*C2`. D2 shows `7`.
- Click C2 and change it to `4`. D2 changes to `14`.
- A1: `=1/0` shows `#DIV/0!`. Click it: the bar shows `=1/0`.
- A2: `=A1+5` shows `#DIV/0!` too: the error passed on.
- A3: `=2*(` shows `#ERROR!`.

```check
run "npm test" stdout="36 passed" label="all 36 tests pass"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const type = (r, c, text) => { rows[r].querySelectorAll('td')[c].click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; type(1, 1, '3.50'); type(1, 2, '2'); type(1, 3, '=B2*C2'); const before = rows[1].querySelectorAll('td')[3].textContent; type(1, 2, '4'); return before + ' ' + rows[1].querySelectorAll('td')[3].textContent; })()" "7 14" server=vite errors=none label="D2 =B2*C2 shows 7, then 14 when C2 changes to 4"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); rows[0].querySelectorAll('td')[0].click(); bar.value = '=1/0'; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); rows[0].querySelectorAll('td')[0].click(); return rows[0].querySelectorAll('td')[0].textContent + ' | ' + bar.value; })()" "#DIV/0! | =1/0" server=vite label="A1 shows the value #DIV/0!, while the formula bar shows =1/0"
```

## Break it: a formula that uses itself

Type `=A1+1` into A1.

A1 goes **blank**, the selection doesn't move down, and the Console shows a red error:

```text
Uncaught RangeError: Maximum call stack size exceeded
```

What happened? `cellValue(A1)` evaluates `=A1+1`, which asks for A1's value, which calls `cellValue(A1)`, which evaluates `=A1+1`, which asks for A1… The chain from lesson 7.4 never reaches a cell without a formula. Each call waits for the next, piling onto the call stack (7.2) until JavaScript runs out of room for it and throws a `RangeError`.

It isn't a `FormulaError`, so `cellValue` re-throws it, as designed: from the program's point of view, this *is* a bug. The error escapes `showAll` halfway through drawing, which is why A1 is blank and the rest of the Enter handler (moving the selection) never ran.

A formula that depends on itself, directly (`=A1+1` in A1) or through a chain (B1 uses C1, and C1 uses B1), is called a **circular reference**, or a **cycle**. A formula can't have a value if working it out needs its own value first. The spreadsheet has to notice, and say so in the cell, instead of crashing. That's the next lesson.

Clear A1 (select it, empty the formula bar, press Enter) before you commit.

## Commit

The cycle crash is known, and fixed in the very next lesson, still on this branch: that's why it's fine to commit here, and why `main` never sees it.

```powershell
git commit -am "Show formula values in the grid"
```

```check
git-clean
```
