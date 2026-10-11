---
title: 7.5 — Formulas on the Page
runtime: none
experiments: Break it: a formula that uses itself
teaches: recomputing everything, circular references
uses: dom, event listeners, keyboard events, nested loops, recursion, call stack, rethrowing, classlist, design tokens, contrast, git commit
---

### The story so far

Lesson 7.4 finished the machinery. For any cell, `cellValue(sheet, address)` gives its **value**: a number, text, or an error, working out formulas (and the formulas they use) on the way. `display(value)` turns a value into the text a cell should show. Both have tests, and none of it touches the page yet: the grid still shows exactly what was typed.

### What this lesson builds

The page, connected. After this lesson:

| you do | the cell shows | the formula bar shows |
|---|---|---|
| type `3.50` in B2, `2` in C2, `=B2*C2` in D2 | D2: `7` | `=B2*C2`, when D2 is selected |
| change C2 to `4` | D2: `14`, without touching D2 | `4` |
| type `=1/0` in A1 | `#DIV/0!` | `=1/0` |

Cells show **values**, the bar shows what was **typed**, and when one cell changes, every cell that depends on it changes too. Then you'll find the input that breaks it, which the next lesson fixes.

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

**`showAll`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input | none: it reads the `sheet` and the page's cells | |
| returns | nothing (`void`); it changes the page: every cell's text becomes `display(cellValue(...))` for that cell | D2's text becomes `7` |

It's two loops, one inside the other (lesson 3.3): for each of the 100 rows, for each of the 26 columns, work out the cell and show it. 100 × 26 = 2,600 cells. `cellAt` can give `undefined` (lesson 5.2's check), so the `if` skips any cell that isn't on the page.

The Enter key's handler changes in one line: after `sheet.set(...)` stores the text, it calls `showAll()` instead of putting the typed text into one cell.

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
run "npm test" stdout="41 passed" label="all 41 tests pass"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const type = (r, c, text) => { rows[r].querySelectorAll('td')[c].click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; type(1, 1, '3.50'); type(1, 2, '2'); type(1, 3, '=B2*C2'); const before = rows[1].querySelectorAll('td')[3].textContent; type(1, 2, '4'); return before + ' ' + rows[1].querySelectorAll('td')[3].textContent; })()" "7 14" server=vite errors=none label="D2 =B2*C2 shows 7, then 14 when C2 changes to 4"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); rows[0].querySelectorAll('td')[0].click(); bar.value = '=1/0'; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); rows[0].querySelectorAll('td')[0].click(); return rows[0].querySelectorAll('td')[0].textContent + ' | ' + bar.value; })()" "#DIV/0! | =1/0" server=vite label="A1 shows the value #DIV/0!, while the formula bar shows =1/0"
```

## Break it: a formula that uses itself

A formula can name any cell, including its own. Predict before you try it:

```predict
question: You type `=A1+1` into A1 and press Enter. What happens?
choice: A1 shows #ERROR!
choice: A1 shows 1
choice: A1 stays blank and the selection stays on A1
answer: A1 stays blank and the selection stays on A1
explain: Working out A1 needs A1's value, which needs A1's value, and so on. Nothing in the code stops that chain, so it ends in a crash, not in a value. The explanation is below.
verify: page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); rows[0].querySelectorAll('td')[0].click(); bar.value = '=A1+1'; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return rows[0].querySelectorAll('td')[0].textContent === '' && document.querySelector('#name-box').textContent === 'A1' ? 'A1 stays blank and the selection stays on A1' : 'something else'; })()" server=vite
```

Now type `=A1+1` into A1.

A1 goes **blank**, the selection doesn't move down, and the Console shows a red error:

```text
Uncaught RangeError: Maximum call stack size exceeded
```

What happened? Here's the call stack (lesson 7.2), growing:

```text
  cellValue(A1)        evaluates =A1+1, needs A1's value
  evaluate(+)          needs its left side
  valueAt(A1)          asks for A1
  cellValue(A1)        evaluates =A1+1, needs A1's value
  evaluate(+)          ...
  valueAt(A1)
  cellValue(A1)
  ... thousands more
```

The chain from lesson 7.4 never reaches a cell without a formula. Each call waits for the next, piling onto the call stack until JavaScript runs out of room for it (the limit is around ten thousand calls, depending on the browser) and throws a `RangeError`.

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

## Your turn: errors that stand out

A client's sheet has 400 rows of orders, and one `#DIV/0!` somewhere in them. In black text like everything else, nobody notices it. Spreadsheets show error values in red, so they catch the eye.

Make cells whose value is an error show their text in red, readable against the white background (Styling 4's contrast rule: at least 4.5 : 1), with the colour as a token in `:root`, as Styling 4 set them up. When the error is fixed, the cell must go back to normal. Commit on the `formulas` branch.

```hints
nudge: `showAll` knows each cell's value before it shows it. What tells you a value is an error?
concept: Of the three kinds of value, only an error is an object, so `typeof value === "object"` picks out errors. `element.classList.toggle("error", condition)` adds the class when the condition is true and removes it when it's false, which is what "back to normal" needs; `classList.add` alone would leave the cell red forever. The colour itself belongs in `style.css`, as a custom property used by a `td.error` rule.
shape: In `showAll`: `const value = cellValue(...); cell.textContent = display(value); cell.classList.toggle("error", typeof value === "object");`. In `style.css`: a `--error-text` token in `:root`, and `td.error { color: var(--error-text); }`.
answer: ~~~typescript
        const value = cellValue(sheet, { column: c, row: r });
        cell.textContent = display(value);
        cell.classList.toggle("error", typeof value === "object");
~~~
and in `style.css`, `--error-text: #b42318;` in `:root`, plus:
~~~css
td.error {
  color: var(--error-text);
}
~~~
```

```check
run "npm run check" label="the project type-checks"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const td = (r, c) => rows[r].querySelectorAll('td')[c]; const type = (r, c, text) => { td(r, c).click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; const color = (el) => getComputedStyle(el).color; const normal = color(td(0, 1)); type(0, 0, '=1/0'); const error = color(td(0, 0)); type(0, 0, '5'); const fixed = color(td(0, 0)); const rgb = (t) => t.match(/[0-9.]+/g).slice(0, 3).map(Number); const lum = (c) => c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((t, v, i) => t + v * [0.2126, 0.7152, 0.0722][i], 0); const ratio = 1.05 / (lum(rgb(error)) + 0.05); return [error !== normal ? 'different' : 'same', fixed === normal ? 'normal again' : 'still red', ratio >= 4.5 ? 'readable' : 'too faint'].join(','); })()" "different,normal again,readable" server=vite errors=none label="an error cell is red and readable, and goes back to normal when fixed" -- Toggle a class from showAll (typeof value === "object"), and colour it from a token at 4.5 : 1 or more.
git-clean -- Commit it: git commit -am "Show error values in red"
```
