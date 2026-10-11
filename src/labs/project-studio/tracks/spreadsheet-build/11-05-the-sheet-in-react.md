---
title: 11.5 — The Sheet in React
runtime: none
experiments: What noticed the page was gone?
justified: The table's header; A component for the whole app
teaches: component boundaries, rendering lists of lists, replacing a user interface
uses: react, jsx, components, props, keys, state, useState, fragments, vite plugins, interfaces, optional properties, default parameters, git rm, tests
---

### The story so far

Lessons 11.1 to 11.4 learned React on a small order list in the playground: components that describe the page from props and state (11.2), state that re-renders when it changes (11.3), and controlled inputs, state kept where it's used, and effects (11.4). Meanwhile the spreadsheet's page is still `src/grid.ts`, kept in step by hand.

### What this lesson builds

The spreadsheet's grid, described in React, and `grid.ts` deleted. The engine doesn't change at all: React only replaces the page.

```text
 index.html          <div id="root">, and main.tsx
 src/main.tsx        new Workbook(), and React renders <App> into #root
 src/ui/App.tsx      the app: the title, the grid, which cell is selected (state)
 src/ui/Grid.tsx     the table: column names, row numbers, and a <td> per cell from the workbook
 src/grid.ts         deleted
 src/*.ts            the engine: unchanged
```

By the end, the grid shows and a click selects a cell. The formula bar comes back in 11.6.

## The table's header {#header}

A new folder, `src/ui/`, holds the React components, apart from the engine. This step creates `src/ui/Grid.tsx`, drawing the table's header row: an empty corner, then a column name for each column:

```tsx file=src/ui/Grid.tsx
import { columnName } from "../columns.ts";
import type { Workbook } from "../workbook.ts";

export function Grid({ book, columns, rows }: { book: Workbook; columns: number; rows: number }) {
  const columnNumbers = Array.from({ length: columns }, (_, c) => c);
  return (
    <table id="grid">
      <thead>
        <tr>
          <th />
          {columnNumbers.map((c) => (
            <th key={c}>{columnName(c)}</th>
          ))}
        </tr>
      </thead>
    </table>
  );
}
```

**`Grid`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `book` | the workbook to show (used in the next step) | `new Workbook()` |
| input `columns`, `rows` | how big the table is | `26`, `100` |
| returns | a `<table>` with a header row | `<th>A</th>` … `<th>Z</th>` |

- **`Array.from({ length: columns }, (_, c) => c)`** (9.3) makes `[0, 1, …, 25]`, so `map` can make one `<th>` per column. `columnName` (4.1) turns each number into `A`, `B`, …
- **`key={c}`**: the columns never move, so their numbers are good keys.

This step is a little over 15 lines, because JSX is nested: most lines are a tag opening or closing.

```check
run "npx tsc" label="the project type-checks"
```

## The rows {#rows}

Then a row per sheet row: its number, and a cell for each column, showing the workbook's value. This step adds the `<tbody>`:

```tsx file=src/ui/Grid.tsx
import { formatAddress } from "../address.ts";
import { columnName } from "../columns.ts";
import { display } from "../compute.ts";
import type { Workbook } from "../workbook.ts";

export function Grid({ book, columns, rows }: { book: Workbook; columns: number; rows: number }) {
  const columnNumbers = Array.from({ length: columns }, (_, c) => c);
  return (
    <table id="grid">
      <thead>
        <tr>
          <th />
          {columnNumbers.map((c) => (
            <th key={c}>{columnName(c)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            <th>{r + 1}</th>
            {columnNumbers.map((c) => {
              const address = { column: c, row: r };
              return <td key={formatAddress(address)}>{display(book.value(address))}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- **A `map` inside a `map`**: the outer one makes the rows, the inner one each row's cells. 26 × 100 is 2,600 `<td>`s, from about ten lines.
- **`display(book.value(address))`** is exactly what `grid.ts`'s `show` put in each cell (8.6): the workbook's cached value, formatted.
- **`key={formatAddress(address)}`**: a cell's name, like `B2`, is unique on the sheet.

The old `grid.ts` *created* 2,600 `<td>`s and then, after each edit, found and changed the ones that changed. `Grid` only *describes* all 2,600, and React does the finding and changing.

```check
run "npx tsc" label="the project type-checks"
```

## A component for the whole app {#app}

`App` is the top of the page: the title and the grid, and the sheet's size, with defaults. This step creates `src/ui/App.tsx`:

```tsx file=src/ui/App.tsx
import type { Workbook } from "../workbook.ts";
import { Grid } from "./Grid.tsx";

interface AppProps {
  book: Workbook;
  columns?: number;
  rows?: number;
}

export function App({ book, columns = 26, rows = 100 }: AppProps) {
  return (
    <>
      <h1>Spreadsheet</h1>
      <Grid book={book} columns={columns} rows={rows} />
    </>
  );
}
```

**`App`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `book` | the workbook | `new Workbook()` |
| input `columns`, `rows` | optional: the sheet's size | left out, so 26 and 100 |
| returns | the page: a heading and the grid | |

- **`columns?: number`** (5.5's optional properties) and **`columns = 26`** (7.6's default parameters): leave them out and the sheet is the usual size; tests in 11.6 will ask for a 3 × 3 sheet, which is quicker to draw and to read.
- **The workbook comes in as a prop**, made outside React. React draws it; the engine knows nothing about React. That boundary is what lets the engine's 103 tests carry on unchanged.

Like the header, this step is a little over 15 lines, for the interface's own lines.

```check
run "npx tsc" label="the project type-checks"
```

## Starting React {#main}

`src/main.tsx` is the new entry point: it makes the workbook and hands it to `App`. This step creates it:

```tsx file=src/main.tsx
import { createRoot } from "react-dom/client";
import { App } from "./ui/App.tsx";
import { Workbook } from "./workbook.ts";

const root = document.querySelector("#root");
if (root === null) {
  throw new Error("The page has no #root element");
}
createRoot(root).render(<App book={new Workbook()} />);
```

It's 11.2's `createRoot(…).render(…)`, with one difference: if the page has no `#root`, it throws an error that says so, rather than drawing nothing, silently (5.2's `find` did the same for `grid.ts`).

```check
run "npx tsc" label="the project type-checks"
```

## The page, emptied {#html}

`index.html` no longer needs the heading, toolbar or table: React draws them. This step leaves only `#root`, and loads `main.tsx`:

```html file=index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Spreadsheet</title>
    <link rel="stylesheet" href="/src/style.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```check
page index.html "[document.querySelectorAll('thead th').length, document.querySelectorAll('tbody tr').length, [...document.querySelectorAll('thead th')].slice(1, 4).map((th) => th.textContent).join(','), document.querySelector('tbody th').textContent].join('|')" "27|100|A,B,C|1" server=vite errors=none label="React draws the grid: a corner and 26 column names, and 100 rows, numbered from 1"
```

## What noticed the page was gone? {#experiment}

`grid.ts` isn't loaded any more. Delete it:

```powershell
git rm src/grid.ts
```

Before you run the tests, predict:

```predict
question: You've deleted the file that drew the whole page. How many of the project's tests fail?
choice: None of them
choice: Some of them
answer: None of them
verify: node -e "const r = require('child_process').spawnSync('npx vitest run', { shell: true, encoding: 'utf8' }); console.log(r.status === 0 ? 'None of them' : 'Some of them')"
explain: Every test so far checks the engine: the lexer, the parser, the workbook, the functions. Nothing ever tested the page, so nothing notices it's gone, or that it's back in a different form. The page checks in the lessons did, but they aren't part of the project's tests. 11.6 adds tests for the page itself.
```

Run them: `npx vitest run`. All pass. That's good news for the engine, which this move mustn't change, and bad news for the page, which nothing protects.

```check
missing src/grid.ts -- Run git rm src/grid.ts
run "npx vitest run" label="every test still passes: none of them was about the page"
```

## Props in an interface {#interface}

`Grid` is about to get more props, and they won't fit on one line. This step moves their types into an interface of their own, `GridProps` (6.3's interfaces), and adds a comment saying what the component draws:

```tsx file=src/ui/Grid.tsx
import { formatAddress } from "../address.ts";
import { columnName } from "../columns.ts";
import { display } from "../compute.ts";
import type { Workbook } from "../workbook.ts";

interface GridProps {
  book: Workbook;
  columns: number;
  rows: number;
}

// The table: a header row of column names, then a row of cells for each row of the sheet.
export function Grid({ book, columns, rows }: GridProps) {
  const columnNumbers = Array.from({ length: columns }, (_, c) => c);
  return (
    <table id="grid">
      <thead>
        <tr>
          <th />
          {columnNumbers.map((c) => (
            <th key={c}>{columnName(c)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            <th>{r + 1}</th>
            {columnNumbers.map((c) => {
              const address = { column: c, row: r };
              return <td key={formatAddress(address)}>{display(book.value(address))}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Nothing it draws changes. `{ book, columns, rows }: GridProps` still destructures the props; their types are just written once, by name.

```check
run "npx tsc" label="the project type-checks"
```

## Selecting a cell {#select}

Selection is state: which cell is selected. The grid needs to know it, to mark the cell, and to report clicks. This step gives `Grid` both, as props:

```tsx file=src/ui/Grid.tsx
import { formatAddress, type Address } from "../address.ts";
import { columnName } from "../columns.ts";
import { display } from "../compute.ts";
import type { Workbook } from "../workbook.ts";

interface GridProps {
  book: Workbook;
  columns: number;
  rows: number;
  selected: Address;
  onSelect: (address: Address) => void;
}

// The table: a header row of column names, then a row of cells for each row of the sheet.
export function Grid({ book, columns, rows, selected, onSelect }: GridProps) {
  const columnNumbers = Array.from({ length: columns }, (_, c) => c);
  return (
    <table id="grid">
      <thead>
        <tr>
          <th />
          {columnNumbers.map((c) => (
            <th key={c}>{columnName(c)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            <th>{r + 1}</th>
            {columnNumbers.map((c) => {
              const address = { column: c, row: r };
              const isSelected = c === selected.column && r === selected.row;
              return (
                <td key={formatAddress(address)} className={isSelected ? "selected" : ""} onClick={() => onSelect(address)}>
                  {display(book.value(address))}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

| new prop | what it is | used for |
|---|---|---|
| `selected` | the selected cell's address | the `selected` class on its `<td>` |
| `onSelect` | a function to call with a clicked cell's address | each `<td>`'s `onClick` |

Now run `npx tsc`. It reports that `App` doesn't pass `selected` and `onSelect`: the props are required, and TypeScript has found the one place that uses `Grid`. The next step fixes it.

```check
run "npx tsc" exit=1 stdout="App.tsx" label="TypeScript points at App, which doesn't pass the new props yet"
```

## The selection's state {#selection}

`App` owns the selection, because the formula bar and the name box will need it too (11.4's lifting state up). This step adds it:

```tsx file=src/ui/App.tsx
import { useState } from "react";
import type { Address } from "../address.ts";
import type { Workbook } from "../workbook.ts";
import { Grid } from "./Grid.tsx";

interface AppProps {
  book: Workbook;
  columns?: number;
  rows?: number;
}

export function App({ book, columns = 26, rows = 100 }: AppProps) {
  const [selected, setSelected] = useState<Address>({ column: 0, row: 0 });
  return (
    <>
      <h1>Spreadsheet</h1>
      <Grid book={book} columns={columns} rows={rows} selected={selected} onSelect={setSelected} />
    </>
  );
}
```

- **`useState<Address>(…)`** names the state's type: an `Address`, starting at A1.
- **`onSelect={setSelected}`**: the setter is a function that takes an address, which is exactly what `onSelect` must be, so it can be passed on directly.

Click a cell, and the outline moves: React re-renders `App`, then `Grid`, and changes two `class` attributes, the old cell's and the new one's. That's `grid.ts`'s `select`, without writing it.

```check
run "npx tsc" label="the project type-checks"
page index.html "(async () => { const tds = () => document.querySelectorAll('tbody td'); tds()[27].click(); await new Promise((r) => setTimeout(r, 50)); return [...tds()].filter((td) => td.className === 'selected').length + '|' + tds()[27].className + '|' + tds()[0].className + '|'; })()" "1|selected||" server=vite errors=none label="clicking B2 selects it, and A1 is no longer selected"
```

## Commit

```powershell
git add .
git commit -m "The grid in React"
```

```check
git-clean
```

## Your turn: the row being looked at

Spreadsheets shade the header of the selected cell's row and column, so you can see where you are on a big sheet. Give the selected cell's column header, in the `<thead>`, and its row header, in the `<tbody>`, the class `current`, and add a rule for `th.current` to `src/style.css` with a colour token of its own. Commit.

```hints
nudge: The header cells are made in two `map`s in `Grid`. Each one knows its column or row number, and `selected` is a prop.
concept: In the header `map`, give the `<th>` `className={c === selected.column ? "current" : ""}`; in the rows, the row's `<th>` gets `r === selected.row`. In `style.css`, a token in `:root`, such as `--current-header-bg`, and `th.current { background: var(--current-header-bg); }`.
shape: `<th key={c} className={c === selected.column ? "current" : ""}>…</th>`, and `<th className={r === selected.row ? "current" : ""}>{r + 1}</th>`.
answer: In `Grid.tsx`, the two `<th>`s get a `className`, as in the shape. In `style.css`, `--current-header-bg: #d3e3fd;` in `:root`, and a rule `th.current { background: var(--current-header-bg); }`.
```

```check
page index.html "(async () => { document.querySelectorAll('tbody tr')[2].querySelectorAll('td')[2].click(); await new Promise((r) => setTimeout(r, 50)); const current = [...document.querySelectorAll('th.current')]; const plain = getComputedStyle(document.querySelector('thead th')).backgroundColor; return [current.find((th) => th.closest('thead'))?.textContent, current.find((th) => th.closest('tbody'))?.textContent, current.every((th) => getComputedStyle(th).backgroundColor !== plain)].join('|'); })()" "C|3|true" server=vite errors=none label="selecting C3 marks column C's and row 3's headers, in a colour of their own" -- Give the column's and the row's <th> the class current, and style th.current with a token.
git-clean -- Commit it: git add src, then git commit.
```
