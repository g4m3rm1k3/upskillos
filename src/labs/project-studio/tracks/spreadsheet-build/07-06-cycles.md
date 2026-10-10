---
title: 7.6 — Catching Cycles
runtime: none
---

A formula that depends on itself crashes the page. The fix needs one idea: **while working out a cell, remember which cells you're in the middle of working out.** If you're asked for one of those again, you've gone round in a circle.

## Remember what's in progress

Think about what the chain of calls looks like when there's a cycle. `cellValue(B1)` is waiting for `cellValue(C1)`, which is waiting for `cellValue(B1)` again. At the moment of the second `cellValue(B1)`, B1 is **still in progress**: its first call hasn't returned. Without a cycle that never happens, because a cell's formula only uses *other* cells, which finish before it does.

So: keep a collection of the cells currently in progress. Add a cell when its formula starts being worked out, and remove it when that's finished. If a cell is asked for while it's in the collection, that's a cycle.

The collection needs exactly one question answered fast: "is this cell in it?" That's what a **`Set`** is for: a collection of unique values with quick `has`, `add` and `delete`, like a Python `set`. It holds each cell's address as text (`"B1"`), because a `Set` compares objects by identity (`toBe`, lesson 6.3), and two `{ column: 1, row: 0 }` objects made separately are different objects, while two `"B1"` strings are equal. That's the same reason the `Sheet`'s map uses text keys.

## The tests

Add a third group of tests to the end of `src/compute.test.ts`:

```typescript file=src/compute.test.ts
import { describe, expect, it } from "vitest";
import { parseAddress, type Address } from "./address.ts";
import { cellValue, display } from "./compute.ts";
import { Sheet } from "./sheet.ts";

// An address from text, for short tests. parseAddress gives null for bad text; these are all good.
function at(text: string): Address {
  const address = parseAddress(text);
  if (address === null) {
    throw new Error(`Bad address in a test: ${text}`);
  }
  return address;
}

function sheetWith(cells: Record<string, string>): Sheet {
  const sheet = new Sheet();
  for (const [text, value] of Object.entries(cells)) {
    sheet.set(at(text), value);
  }
  return sheet;
}

describe("cellValue", () => {
  it("reads numbers as numbers, and anything else as text", () => {
    const sheet = sheetWith({ A1: "3.50", A2: "Coffee", A3: "-2" });
    expect(cellValue(sheet, at("A1"))).toBe(3.5);
    expect(cellValue(sheet, at("A2"))).toBe("Coffee");
    expect(cellValue(sheet, at("A3"))).toBe(-2);
    expect(cellValue(sheet, at("A4"))).toBe("");
  });

  it("calculates a formula, using the values of the cells it names", () => {
    const sheet = sheetWith({ B2: "3.50", C2: "2", D2: "=B2*C2" });
    expect(cellValue(sheet, at("D2"))).toBe(7);
  });

  it("follows formulas that use other formulas", () => {
    const sheet = sheetWith({ A1: "2", A2: "=A1*10", A3: "=A2+A1" });
    expect(cellValue(sheet, at("A3"))).toBe(22);
  });

  it("shows #ERROR! for a formula it can't read, and #VALUE! for arithmetic on text", () => {
    const sheet = sheetWith({ A1: "=2+", A2: "Coffee", A3: "=A2*2", A4: "=A1+1" });
    expect(cellValue(sheet, at("A1"))).toEqual({ error: "#ERROR!" });
    expect(cellValue(sheet, at("A3"))).toEqual({ error: "#VALUE!" });
    expect(cellValue(sheet, at("A4"))).toEqual({ error: "#ERROR!" });
  });
});

describe("display", () => {
  it("turns a value into the text a cell shows", () => {
    expect(display(7)).toBe("7");
    expect(display(3.5)).toBe("3.5");
    expect(display("Coffee")).toBe("Coffee");
    expect(display({ error: "#DIV/0!" })).toBe("#DIV/0!");
  });
});

describe("cycles", () => {
  it("shows #CYCLE! for a formula that uses itself, directly or through other cells", () => {
    const sheet = sheetWith({ A1: "=A1+1", B1: "=C1", C1: "=B1*2" });
    expect(cellValue(sheet, at("A1"))).toEqual({ error: "#CYCLE!" });
    expect(cellValue(sheet, at("B1"))).toEqual({ error: "#CYCLE!" });
    expect(cellValue(sheet, at("C1"))).toEqual({ error: "#CYCLE!" });
  });

  it("does not mistake a cell used twice for a cycle", () => {
    const sheet = sheetWith({ A1: "=2+3", A2: "=A1+A1", A3: "=A2*A1" });
    expect(cellValue(sheet, at("A2"))).toBe(10);
    expect(cellValue(sheet, at("A3"))).toBe(50);
  });

  it("passes a cycle's error on to formulas that use it", () => {
    const sheet = sheetWith({ A1: "=A1", A2: "=A1+1" });
    expect(cellValue(sheet, at("A2"))).toEqual({ error: "#CYCLE!" });
  });
});
```

The second test matters as much as the first. `A2 = A1+A1` uses A1 **twice**, but that's not a cycle: the first A1 finishes before the second starts. A careless fix (add a cell when its formula starts, and never remove it) would see A1 a second time and call it a cycle. A1 is a formula here, `=2+3`, on purpose: a plain number never goes into the collection, so with a number the careless fix would slip through this test.

Run `npx vitest run compute` now:

```text
     × shows #CYCLE! for a formula that uses itself, directly or through other cells 6ms
     × passes a cycle's error on to formulas that use it 3ms

RangeError: Maximum call stack size exceeded
RangeError: Maximum call stack size exceeded

      Tests  2 failed | 6 passed (8)
```

Two red, with the same `RangeError` as the page. The *used twice* test passes for now, because nothing marks cells yet; it's there to catch the careless fix.

```check
run "npx vitest run compute" exit=1 stderr="Maximum call stack size exceeded" label="the cycle tests fail with the RangeError (red)"
```

## Mark the error

Add `#CYCLE!` to the error codes in `src/values.ts`. (The name is ours: Excel shows a warning and `0`, Google Sheets shows `#REF!`. A specific name says exactly what's wrong.)

```typescript file=src/values.ts
export type ErrorCode = "#DIV/0!" | "#VALUE!" | "#ERROR!" | "#CYCLE!";

export interface ErrorValue {
  error: ErrorCode;
}

export type Value = number | string | ErrorValue;
```

```check
contains src/values.ts "\"#CYCLE!\""
```

## Track the cells in progress

```typescript file=src/compute.ts
import { formatAddress, type Address } from "./address.ts";
import { evaluate } from "./evaluate.ts";
import { FormulaError } from "./lexer.ts";
import { parse } from "./parser.ts";
import type { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export function cellValue(sheet: Sheet, address: Address, visiting = new Set<string>()): Value {
  const key = formatAddress(address);
  if (visiting.has(key)) {
    return { error: "#CYCLE!" };
  }
  const text = sheet.get(address);
  if (text.startsWith("=")) {
    visiting.add(key);
    try {
      const expression = parse(text.slice(1));
      return evaluate(expression, (other) => cellValue(sheet, other, visiting));
    } catch (error) {
      if (error instanceof FormulaError) {
        return { error: "#ERROR!" };
      }
      throw error;
    } finally {
      visiting.delete(key);
    }
  }
  if (text.trim() !== "" && !Number.isNaN(Number(text))) {
    return Number(text);
  }
  return text;
}

export function display(value: Value): string {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return value.error;
}
```

### How it works

- **`visiting = new Set<string>()`** is a parameter with a **default value**: a caller that doesn't pass a set (the grid, the tests) gets a new, empty one. The recursive call passes the **same** set along, `cellValue(sheet, other, visiting)`, so every cell in one chain of calls shares one record of what's in progress. (Python has default values too, with a trap JavaScript doesn't have: in Python, `def f(visiting=set())` creates **one** set shared by *every* call, forever. JavaScript evaluates the default afresh on each call, so each top-level call gets its own.)
- **The check comes first**: if this cell is already in progress, return `#CYCLE!` without reading its formula again. That returned error then passes on through each waiting formula (lesson 7.2's rule), so every cell in the circle shows `#CYCLE!`.
- **`visiting.add(key)`** just before working out the formula, so it's marked during exactly the time it's in progress.

### finally: tidying up on every way out

```typescript
} finally {
  visiting.delete(key);
}
```

The cell must come off the list **whenever** its calculation ends: when it returns a value, when it returns `#ERROR!` from the `catch`, and even when an unexpected error is re-thrown. A `finally` block runs in all of those cases, after the `try` (and any `catch`) and before the function is left, however it's left. It's Python's `finally` too.

Without the `delete`, `A1` would stay marked after its first use, and `=A1+A1` would wrongly report a cycle. That's the second test. Try it: comment out the `delete` line and run the tests to watch exactly that test fail, then put it back.

```check
run "npx vitest run" stdout="44 passed" label="all 44 tests pass"
run "npx tsc" label="the project type-checks"
page index.html "(async () => { const { Sheet } = await import('/src/sheet.ts'); const { cellValue, display } = await import('/src/compute.ts'); const s = new Sheet(); const put = (column, row, text) => s.set({ column, row }, text); put(0, 0, '=B1+C1'); put(1, 0, '=C1*2'); put(2, 0, '=4'); put(0, 1, '=B2'); put(1, 1, '=C2'); put(2, 1, '=A2'); put(3, 1, '=A2+1'); return [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1]].map(([column, row]) => display(cellValue(s, { column, row }))).join(','); })()" "12,#CYCLE!,#CYCLE!,#CYCLE!,#CYCLE!" server=vite label="a cell used twice is fine (A1 = 12); a three-cell circle and a formula using it show #CYCLE!"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); rows[0].querySelectorAll('td')[0].click(); bar.value = '=A1+1'; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return rows[0].querySelectorAll('td')[0].textContent + ' ' + document.querySelector('#name-box').textContent; })()" "#CYCLE! A2" server=vite errors=none label="on the page, =A1+1 in A1 shows #CYCLE! and the selection moves on"
```

## Commit

```powershell
git commit -am "Show #CYCLE! instead of crashing on circular references"
```

```check
git-clean
```
