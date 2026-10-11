---
title: 11.6 — Editing, Tested
runtime: none
experiments: The state that wouldn't reset
teaches: component tests, testing library, jsdom, test environments, accessible names in tests, keys that reset state
uses: react, components, props, state, useState, useRef, useEffect, controlled inputs, colocating state, lifting state, tests, vitest, describe, expect, semver, tracing precedents and dependents, git commit
---

### The story so far

Lesson 11.5 moved the spreadsheet's page to React: `src/main.tsx` makes the workbook and renders `App`; `App` owns which cell is selected; `Grid` draws 2,600 cells from the workbook, and a click selects one. `grid.ts` is gone, and no test noticed, because none of the project's tests had ever looked at the page.

### What this lesson builds

The rest of the old page, and tests for the page this time:

```text
 ┌──────────┬───────────────────────────┐
 │ B2       │ =A1*10                    │   the name box, and the formula bar: FormulaBar
 └──────────┴───────────────────────────┘
 the grid, with the selected cell, its precedents and dependents, and errors marked
 2 cells recalculated                         the status line

 src/ui/App.test.tsx    four tests that use the page the way a person does
```

## Tools for testing components {#install}

Vitest runs in Node, where there's no page. Testing a component needs a stand-in for the browser, and a way to use the page as a person would:

```powershell
npm install -D @testing-library/react@16 @testing-library/dom@10 jsdom@29
```

| package | what it is |
|---|---|
| `jsdom` | a browser's DOM written in JavaScript: `document`, elements, events, without a window on the screen |
| `@testing-library/react` | renders a component into jsdom's `document` |
| `@testing-library/dom` | finds things on the page the way a person would, by their label or text, and fires events at them |

Why `jsdom@29`, when version 30 exists? Version 30 needs Node 24.15 or newer, and `npm` warns `EBADENGINE` on older ones: the `engines` field in a package's `package.json` says which Node versions it supports. 29 runs on any Node 24, and has everything these tests use. Reading the warnings `npm install` prints, and pinning a major version on purpose, is part of the job (4.2's semver).

```check
contains package.json "\"jsdom\": \"^29" -- Run npm install -D @testing-library/react@16 @testing-library/dom@10 jsdom@29
```

## The tests {#tests}

The tests are supplied: click **Create provided src/ui/App.test.tsx** and read them:

```tsx file=src/ui/App.test.tsx provided
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { parseAddress } from "../address.ts";
import { Workbook } from "../workbook.ts";
import { App } from "./App.tsx";

afterEach(cleanup);

// The <td> for a cell name, like "B2": row 2's <tr>, then the cell after the row header.
function cell(name: string): HTMLTableCellElement {
  const address = parseAddress(name);
  const td = address === null ? undefined : document.querySelectorAll("tbody tr")[address.row]?.children[address.column + 1];
  if (!(td instanceof HTMLTableCellElement)) {
    throw new Error(`No cell ${name} on the page`);
  }
  return td;
}

function type(text: string, key = "Enter"): void {
  const bar = screen.getByLabelText("Formula");
  fireEvent.change(bar, { target: { value: text } });
  fireEvent.keyDown(bar, { key });
}

describe("the sheet, in React", () => {
  it("shows every cell's value, worked out by the workbook", () => {
    const book = new Workbook();
    book.set({ column: 0, row: 0 }, "2");
    book.set({ column: 0, row: 1 }, "=A1*10");
    render(<App book={book} columns={3} rows={3} />);
    expect(cell("A2").textContent).toBe("20");
  });

  it("selects a cell when it's clicked, showing its name and its text", () => {
    const book = new Workbook();
    book.set({ column: 1, row: 1 }, "=1+1");
    render(<App book={book} columns={3} rows={3} />);
    fireEvent.click(cell("B2"));
    expect(screen.getByLabelText("Selected cell").textContent).toBe("B2");
    expect(screen.getByLabelText("Formula")).toHaveProperty("value", "=1+1");
    expect(cell("B2").className).toContain("selected");
  });

  it("saves on Enter, recalculates what depends on it, and moves down", () => {
    const book = new Workbook();
    book.set({ column: 0, row: 1 }, "=A1*10");
    render(<App book={book} columns={3} rows={3} />);
    type("4");
    expect(cell("A2").textContent).toBe("40");
    expect(screen.getByLabelText("Selected cell").textContent).toBe("A2");
    expect(document.querySelector("#status")?.textContent).toBe("2 cells recalculated");
  });

  it("shades the selected cell's precedents and dependents", () => {
    const book = new Workbook();
    book.set({ column: 0, row: 1 }, "=A1*10");
    book.set({ column: 0, row: 2 }, "=A2+1");
    render(<App book={book} columns={3} rows={3} />);
    fireEvent.click(cell("A2"));
    expect(cell("A1").className).toContain("precedent");
    expect(cell("A3").className).toContain("dependent");
  });
});
```

| line | what it does |
|---|---|
| `// @vitest-environment jsdom` | this file's tests run with jsdom's `document`; the engine's tests stay in plain Node, which is faster |
| `render(<App … columns={3} rows={3} />)` | draws the app into jsdom: a 3 × 3 sheet is quicker to draw, and enough |
| `screen.getByLabelText("Formula")` | finds the element whose accessible name is *Formula*: the `aria-label` a screen reader would read out. If a test can't find it by its name, neither can someone using a screen reader |
| `fireEvent.change(bar, { target: { value: text } })` | sets the input's text the way typing does, so React's `onChange` runs |
| `fireEvent.keyDown(bar, { key })` | presses a key in it |
| `afterEach(cleanup)` | removes what each test drew, so the next starts with an empty page |

`cell("B2")` finds a cell's `<td>`: row 2's `<tr>`, then the cell after the row header.

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| shows every cell's value, worked out by the workbook | `Grid` drawing from the engine | a cell showing its formula, `=A1*10`, instead of 20 |
| selects a cell when it's clicked, showing its name and its text | the name box and the formula bar following the selection | the bar still showing the last cell's text |
| saves on Enter, recalculates what depends on it, and moves down | saving, recalculation on the page, the status line | A2 still showing 0 after A1 changes |
| shades the selected cell's precedents and dependents | 8.7's tracing, on the new page | the shading lost in the move to React |

```check
file src/ui/App.test.tsx
run "npx vitest run src/ui" exit=1 label="the page's tests fail: most of the page isn't there yet (red)"
```

## A formula bar {#bar}

The formula bar is a controlled input (11.4), with a draft of its own: typing a formula re-renders only the bar, never the 2,600-cell grid. This step creates `src/ui/FormulaBar.tsx`:

```tsx file=src/ui/FormulaBar.tsx
import { useState } from "react";

interface FormulaBarProps {
  text: string;
  onSave: (text: string) => void;
}

// What the selected cell holds, editable. The draft is the bar's own: typing re-renders only the bar.
export function FormulaBar({ text, onSave }: FormulaBarProps) {
  const [draft, setDraft] = useState(text);
  return (
    <input id="formula-bar" aria-label="Formula" autoComplete="off" value={draft} onChange={(event) => setDraft(event.target.value)} />
  );
}
```

**`FormulaBar`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `text` | what the selected cell holds now | `"=A1*10"` |
| input `onSave` | a function to call with the draft, when it's saved (next step) | `App`'s `save` |
| returns | an input showing the draft | |

`useState(text)` starts the draft at the cell's text. `aria-label="Formula"` gives the input a name for screen readers, and for the tests.

```check
run "npx tsc" label="the project type-checks"
```

## Saving on Enter {#enter}

This step makes Enter call `onSave` with the draft:

```tsx file=src/ui/FormulaBar.tsx
import { useState } from "react";

interface FormulaBarProps {
  text: string;
  onSave: (text: string) => void;
}

// What the selected cell holds, editable. The draft is the bar's own: typing re-renders only the bar.
export function FormulaBar({ text, onSave }: FormulaBarProps) {
  const [draft, setDraft] = useState(text);
  return (
    <input
      id="formula-bar"
      aria-label="Formula"
      autoComplete="off"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onSave(draft);
        }
      }}
    />
  );
}
```

| attribute | what it does |
|---|---|
| `onKeyDown={(event) => …}` | runs for every key pressed while the input has focus |
| `event.key` | the key's name: `"Enter"`, `"a"`, `"ArrowDown"`, `"Tab"` |
| `onSave(draft)` | hands the draft to whoever rendered the bar; the bar doesn't know about the workbook |

`onKeyDown`, not `onChange`: Enter doesn't change the text, so `onChange` never hears about it. The input's attributes are now one per line, as there are too many to read on one.

```check
run "npx tsc" label="the project type-checks"
```

## Focus {#focus}

As in 11.4, the bar takes the focus when it appears, so you can type straight away. This step adds the ref and the effect:

```tsx file=src/ui/FormulaBar.tsx
import { useEffect, useRef, useState } from "react";

interface FormulaBarProps {
  text: string;
  onSave: (text: string) => void;
}

// What the selected cell holds, editable. The draft is the bar's own: typing re-renders only the bar.
export function FormulaBar({ text, onSave }: FormulaBarProps) {
  const [draft, setDraft] = useState(text);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <input
      id="formula-bar"
      aria-label="Formula"
      autoComplete="off"
      ref={input}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onSave(draft);
        }
      }}
    />
  );
}
```

What happens when the bar first appears, in order:

| when | what happens |
|---|---|
| render | `FormulaBar` returns the description of an input; `input.current` is still `null` |
| React updates the page | the real `<input>` exists, and React puts it in `input.current` |
| effects run | `input.current?.focus()`: the cursor is in the bar |

The `[]` means the effect runs after the first render only: not after every keystroke, which would be harmless here, but wasteful.

```check
run "npx tsc" label="the project type-checks"
```

## The name box {#name-box}

Back in `App`, a toolbar above the grid, with the selected cell's name. This step adds it:

```tsx file=src/ui/App.tsx
import { useState } from "react";
import { formatAddress, type Address } from "../address.ts";
import type { Workbook } from "../workbook.ts";
import { Grid } from "./Grid.tsx";

interface AppProps {
  book: Workbook;
  columns?: number;
  rows?: number;
}

export function App({ book, columns = 26, rows = 100 }: AppProps) {
  const [selected, setSelected] = useState<Address>({ column: 0, row: 0 });

  const name = formatAddress(selected);
  return (
    <>
      <h1>Spreadsheet</h1>
      <div id="toolbar">
        <div id="name-box" aria-label="Selected cell">{name}</div>
      </div>
      <Grid
        book={book}
        columns={columns}
        rows={rows}
        selected={selected}
        onSelect={setSelected}
      />
    </>
  );
}
```

| element | id | holds |
|---|---|---|
| a toolbar | `toolbar` | the name box, and (next step) the formula bar, side by side |
| the name box | `name-box` | the selected cell's name |

- **The ids are the old page's**, so `style.css`'s rules for `#toolbar` and `#name-box` (Sprint 3) style them as before.
- **`formatAddress`** (6.3) turns `{ column: 1, row: 1 }` into `B2`, worked out on every render from `selected`: the name can never disagree with the selection, the way 11.1's count could with its list.
- **`aria-label="Selected cell"`** names the box for screen readers and tests.

The grid's props are one per line now, for the same reason as the input's.

```check
run "npx tsc" label="the project type-checks"
```

## The formula bar in the app {#save}

This step puts the `FormulaBar` in the toolbar, and gives it `save`:

```tsx file=src/ui/App.tsx
import { useState } from "react";
import { formatAddress, type Address } from "../address.ts";
import type { Workbook } from "../workbook.ts";
import { FormulaBar } from "./FormulaBar.tsx";
import { Grid } from "./Grid.tsx";

interface AppProps {
  book: Workbook;
  columns?: number;
  rows?: number;
}

export function App({ book, columns = 26, rows = 100 }: AppProps) {
  const [selected, setSelected] = useState<Address>({ column: 0, row: 0 });

  function save(text: string): void {
    book.set(selected, text);
    if (selected.row + 1 < rows) {
      setSelected({ column: selected.column, row: selected.row + 1 });
    }
  }

  const name = formatAddress(selected);
  return (
    <>
      <h1>Spreadsheet</h1>
      <div id="toolbar">
        <div id="name-box" aria-label="Selected cell">{name}</div>
        <FormulaBar text={book.text(selected)} onSave={save} />
      </div>
      <Grid
        book={book}
        columns={columns}
        rows={rows}
        selected={selected}
        onSelect={setSelected}
      />
    </>
  );
}
```

**`save`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `text` | the draft, from the bar | `"4"` |
| returns | nothing (`void`): it sets the selected cell in the workbook, then selects the cell below, if there is one | A1 = 4, then A2 is selected |

`book.set` changes the workbook, which React doesn't know about. It's `setSelected` that re-renders the app, and with it the grid, which reads the new values from the workbook.

```check
run "npx tsc" label="the project type-checks"
```

## The status line {#status}

8.6's status line said how many cells an edit recalculated. `book.set` returns their names, so they become state. This step adds it:

```tsx file=src/ui/App.tsx
import { useState } from "react";
import { formatAddress, type Address } from "../address.ts";
import type { Workbook } from "../workbook.ts";
import { FormulaBar } from "./FormulaBar.tsx";
import { Grid } from "./Grid.tsx";

interface AppProps {
  book: Workbook;
  columns?: number;
  rows?: number;
}

export function App({ book, columns = 26, rows = 100 }: AppProps) {
  const [selected, setSelected] = useState<Address>({ column: 0, row: 0 });
  const [changed, setChanged] = useState<string[] | null>(null);

  function save(text: string): void {
    setChanged(book.set(selected, text));
    if (selected.row + 1 < rows) {
      setSelected({ column: selected.column, row: selected.row + 1 });
    }
  }

  const name = formatAddress(selected);
  return (
    <>
      <h1>Spreadsheet</h1>
      <div id="toolbar">
        <div id="name-box" aria-label="Selected cell">{name}</div>
        <FormulaBar text={book.text(selected)} onSave={save} />
      </div>
      <Grid
        book={book}
        columns={columns}
        rows={rows}
        selected={selected}
        onSelect={setSelected}
      />
      <div id="status">{changed === null ? "" : `${changed.length} ${changed.length === 1 ? "cell" : "cells"} recalculated`}</div>
    </>
  );
}
```

- **`useState<string[] | null>(null)`**: `null` until the first edit, so the status line starts empty.
- **`setChanged(book.set(…))`**: the list of changed cells is new state, which also re-renders the app, even if an edit leaves the selection where it was.

```check
run "npx tsc" label="the project type-checks"
```

## Marking the cells {#marks}

The last thing `grid.ts` did: shade the selected cell's precedents and dependents (8.7). This step gives `Grid` the traced cells as props, and works out each cell's classes as a list:

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
  precedents: Set<string>;
  dependents: Set<string>;
  onSelect: (address: Address) => void;
}

// The table: a header row of column names, then a row of cells for each row of the sheet.
export function Grid({ book, columns, rows, selected, precedents, dependents, onSelect }: GridProps) {
  const columnNumbers = Array.from({ length: columns }, (_, c) => c);
  return (
    <table id="grid">
      <thead>
        <tr>
          <th />
          {columnNumbers.map((c) => (
            <th key={c} className={c === selected.column ? "current" : ""}>
              {columnName(c)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            <th className={r === selected.row ? "current" : ""}>{r + 1}</th>
            {columnNumbers.map((c) => {
              const address = { column: c, row: r };
              const key = formatAddress(address);
              const classes = [
                c === selected.column && r === selected.row ? "selected" : "",
                precedents.has(key) ? "precedent" : "",
                dependents.has(key) ? "dependent" : "",
              ];
              return (
                <td key={key} className={classes.filter((name) => name !== "").join(" ")} onClick={() => onSelect(address)}>
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

- **`precedents`, `dependents`**: `Set`s of cell names, so `has` answers "is this one of them?" quickly for each of the 2,600 cells.
- **`classes`**: one entry for each reason a cell might be marked, its class name or `""`; `filter` drops the empty ones, and `join(" ")` makes the `class` attribute, such as `"selected dependent"`.

`npx tsc` now reports that `App` doesn't pass the two new props. The step after next fixes that.

```check
run "npx tsc" exit=1 stdout="App.tsx" label="TypeScript points at App, which doesn't pass precedents and dependents yet"
```

## Errors in red {#errors}

And a cell whose value is an error gets the `error` class, which `style.css` has coloured red since 7.5. This step keeps the value in a variable, since it's now needed twice, and adds the reason to the list:

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
  precedents: Set<string>;
  dependents: Set<string>;
  onSelect: (address: Address) => void;
}

// The table: a header row of column names, then a row of cells for each row of the sheet.
export function Grid({ book, columns, rows, selected, precedents, dependents, onSelect }: GridProps) {
  const columnNumbers = Array.from({ length: columns }, (_, c) => c);
  return (
    <table id="grid">
      <thead>
        <tr>
          <th />
          {columnNumbers.map((c) => (
            <th key={c} className={c === selected.column ? "current" : ""}>
              {columnName(c)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            <th className={r === selected.row ? "current" : ""}>{r + 1}</th>
            {columnNumbers.map((c) => {
              const address = { column: c, row: r };
              const key = formatAddress(address);
              const value = book.value(address);
              const classes = [
                c === selected.column && r === selected.row ? "selected" : "",
                precedents.has(key) ? "precedent" : "",
                dependents.has(key) ? "dependent" : "",
                typeof value === "object" ? "error" : "",
              ];
              return (
                <td key={key} className={classes.filter((name) => name !== "").join(" ")} onClick={() => onSelect(address)}>
                  {display(value)}
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

`typeof value === "object"` is true only for an error: every other value is a number, text or a boolean (9.4).

```check
contains src/ui/Grid.tsx "\"error\"" -- Add typeof value === "object" ? "error" : "" to the classes.
run "npx tsc" exit=1 stdout="App.tsx" label="App still needs to pass the traced cells"
```

## Tracing, from the state {#trace}

`App` works the traced cells out from the selection, on every render, with 8.7's `precedents` and `dependents`. This step passes them to the grid:

```tsx file=src/ui/App.tsx
import { useState } from "react";
import { formatAddress, type Address } from "../address.ts";
import type { Workbook } from "../workbook.ts";
import { FormulaBar } from "./FormulaBar.tsx";
import { Grid } from "./Grid.tsx";

interface AppProps {
  book: Workbook;
  columns?: number;
  rows?: number;
}

export function App({ book, columns = 26, rows = 100 }: AppProps) {
  const [selected, setSelected] = useState<Address>({ column: 0, row: 0 });
  const [changed, setChanged] = useState<string[] | null>(null);

  function save(text: string): void {
    setChanged(book.set(selected, text));
    if (selected.row + 1 < rows) {
      setSelected({ column: selected.column, row: selected.row + 1 });
    }
  }

  const name = formatAddress(selected);
  return (
    <>
      <h1>Spreadsheet</h1>
      <div id="toolbar">
        <div id="name-box" aria-label="Selected cell">{name}</div>
        <FormulaBar text={book.text(selected)} onSave={save} />
      </div>
      <Grid
        book={book}
        columns={columns}
        rows={rows}
        selected={selected}
        precedents={new Set(book.precedents(selected))}
        dependents={new Set(book.dependents(selected))}
        onSelect={setSelected}
      />
      <div id="status">{changed === null ? "" : `${changed.length} ${changed.length === 1 ? "cell" : "cells"} recalculated`}</div>
    </>
  );
}
```

There's no code to clear the old marks, as `grid.ts`'s `trace` needed: each render describes the marks for the cell selected *now*, and React removes the classes that are no longer described.

```check
run "npx tsc" label="the project type-checks"
```

## The state that wouldn't reset {#experiment}

Everything the old page did is back. Before you run the tests, predict:

```predict
question: Which of the four tests fails?
choice: None of them
choice: shows every cell's value
choice: selects a cell when it's clicked, showing its name and its text
choice: shades the selected cell's precedents and dependents
answer: selects a cell when it's clicked, showing its name and its text
verify: node -e "require('child_process').spawnSync('npx vitest run src/ui --reporter=json --outputFile=node_modules/.result.json', { shell: true }); const failed = JSON.parse(require('fs').readFileSync('node_modules/.result.json', 'utf8')).testResults.flatMap((f) => f.assertionResults).filter((t) => t.status === 'failed'); console.log(failed.length === 0 ? 'None of them' : failed[0].title)"
explain: Click B2, and the name box says B2, but the bar still shows A1's text. `useState(text)` uses `text` only on the first render (11.3): after that, the draft is the bar's own, and a new `text` prop doesn't replace it. React keeps a component's state for as long as the component stays in the same place in the tree, and the bar never moves.
```

Run them: `npx vitest run src/ui`. Three pass; the one about selecting fails: `expected <input …> to have property "value" with value '=1+1'`.

```check
run "npx vitest run src/ui" exit=1 stdout="1 failed" label="one test fails: the bar keeps the old cell's draft"
```

## A key that resets {#key}

The fix is the **key** from 11.2, used on a single component. A key is a component's identity: when it changes, React treats it as a different component, throws the old one and its state away, and makes a new one, whose `useState(text)` starts from the new cell's text. This step gives the bar the selected cell's name as its key:

```tsx file=src/ui/App.tsx
import { useState } from "react";
import { formatAddress, type Address } from "../address.ts";
import type { Workbook } from "../workbook.ts";
import { FormulaBar } from "./FormulaBar.tsx";
import { Grid } from "./Grid.tsx";

interface AppProps {
  book: Workbook;
  columns?: number;
  rows?: number;
}

export function App({ book, columns = 26, rows = 100 }: AppProps) {
  const [selected, setSelected] = useState<Address>({ column: 0, row: 0 });
  const [changed, setChanged] = useState<string[] | null>(null);

  function save(text: string): void {
    setChanged(book.set(selected, text));
    if (selected.row + 1 < rows) {
      setSelected({ column: selected.column, row: selected.row + 1 });
    }
  }

  const name = formatAddress(selected);
  return (
    <>
      <h1>Spreadsheet</h1>
      <div id="toolbar">
        <div id="name-box" aria-label="Selected cell">{name}</div>
        <FormulaBar key={name} text={book.text(selected)} onSave={save} />
      </div>
      <Grid
        book={book}
        columns={columns}
        rows={rows}
        selected={selected}
        precedents={new Set(book.precedents(selected))}
        dependents={new Set(book.dependents(selected))}
        onSelect={setSelected}
      />
      <div id="status">{changed === null ? "" : `${changed.length} ${changed.length === 1 ? "cell" : "cells"} recalculated`}</div>
    </>
  );
}
```

Click a cell, and the bar is a new `FormulaBar`, for that cell. Its focus effect runs again too, because it's a new component's first render.

```check
run "npx vitest run src/ui" stdout="4 passed" label="the four page tests pass"
run "npx vitest run" label="every test in the project passes"
```

## Commit

```powershell
git add .
git commit -m "Editing the sheet in React, with tests"
```

```check
git-clean
```

## Your turn: 1 cell, not 1 cells

The status line says *1 cell recalculated* when only the edited cell changed, and *2 cells* otherwise. Only the plural is tested. Add a test to `App.test.tsx`, at the end of the `describe`, that types into a cell nothing depends on and checks the singular. Then break the singular in `App.tsx` on purpose, watch your test fail, put it back, and commit.

```hints
nudge: The third test is nearly what you need, without the formula in A2.
concept: Render an `App` with an empty workbook, `type("4")`, and expect the status's `textContent` to be `"1 cell recalculated"`. A test is only worth keeping if it can fail: changing `"cell"` to `"cells"` in `App.tsx` must make it fail.
shape: `it("says 1 cell, not 1 cells, when nothing else depends on the edit", () => { render(<App book={new Workbook()} columns={3} rows={3} />); type("4"); expect(…).toBe("1 cell recalculated"); });`
answer: ~~~tsx
  it("says 1 cell, not 1 cells, when nothing else depends on the edit", () => {
    render(<App book={new Workbook()} columns={3} rows={3} />);
    type("4");
    expect(document.querySelector("#status")?.textContent).toBe("1 cell recalculated");
  });
~~~
```

```check
run "npx vitest run src/ui/App.test" stdout="5 passed" label="five page tests, the singular included" -- Add an it(…) that types 4 into an empty sheet and expects 1 cell recalculated.
git-clean -- Commit it: git add src, then git commit.
```
