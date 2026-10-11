---
title: 7.6 — Catching Cycles
runtime: none
experiments: Track the cells in progress
teaches: sets, default parameters, finally, cycle detection, denial of service, input limits
uses: recursion, call stack, base cases, try catch, rethrowing, custom errors, maps, parsers, recursive descent, tests, vitest, git commit
---

### The story so far

The sheet works out formulas and shows their values (7.5): `cellValue` reads a cell's text, and for a formula it parses it and evaluates it, asking `cellValue` again for every cell the formula names. That recursion through the sheet ends when every chain reaches cells without formulas. 7.5 found the input where it doesn't: `=A1+1` typed into A1. The chain `A1 → A1 → A1 …` grows until JavaScript runs out of call stack, throws a `RangeError`, and the page stops halfway through drawing.

### What this lesson builds

`cellValue` that notices a circle and says so, instead of crashing:

| cells typed | before this lesson | after |
|---|---|---|
| A1: `=A1+1` | crash; A1 blank, the page stuck | A1: `#CYCLE!` |
| B1: `=C1`, C1: `=B1*2` | crash | both: `#CYCLE!` |
| A2: `=A1+A1`, A1: `=2+3` | `10` | still `10`: using a cell twice isn't a circle |
| D1: `=A1+1`, A1 in a circle | crash | `#CYCLE!`, passed on like any error |

The fix needs one idea: **while working out a cell, remember which cells you're in the middle of working out.** If you're asked for one of those again, you've gone round in a circle.

## Remember what's in progress

Think about what the chain of calls looks like when there's a cycle. `cellValue(B1)` is waiting for `cellValue(C1)`, which is waiting for `cellValue(B1)` again. At the moment of the second `cellValue(B1)`, B1 is **still in progress**: its first call hasn't returned. Without a cycle that never happens, because a cell's formula only uses *other* cells, which finish before it does.

So: keep a collection of the cells currently in progress. Add a cell when its formula starts being worked out, and remove it when that's finished. If a cell is asked for while it's in the collection, that's a cycle.

The collection needs exactly one question answered fast: "is this cell in it?" That's what a **`Set`** is for: a collection of unique values with quick `has`, `add` and `delete`, like a Python `set`. It holds each cell's address as text (`"B1"`), because a `Set` compares objects by identity (`toBe`, lesson 6.3), and two `{ column: 1, row: 0 }` objects made separately are different objects, while two `"B1"` strings are equal. That's the same reason the `Sheet`'s map uses text keys.

## The tests

The new tests are supplied as a whole new `src/compute.test.ts`: the same file as before, including the `0.1 + 0.2` line you added in 7.4's Your turn, with a third group of tests at the end. Click **Create provided src/compute.test.ts**, and read the `cycles` group:

```typescript file=src/compute.test.ts provided
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
    expect(display(0.1 + 0.2)).toBe("0.3");
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

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| shows #CYCLE! for a formula that uses itself, directly or through other cells | circles of one cell and of two | the crash from 7.5, or a check that only catches `=A1` in A1 and misses B1 → C1 → B1 |
| does not mistake a cell used twice for a cycle | ordinary formulas still work | the careless fix described below, which would turn `=A1+A1` into `#CYCLE!` |
| passes a cycle's error on to formulas that use it | the error reaches every cell that depends on the circle | a total that uses a broken cell showing a number, as if nothing were wrong |

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

The collection of cells in progress has to be shared by every call in one chain, so `cellValue` gets a third parameter that each call passes on to the next. Before the code, a question about how JavaScript fills in a parameter that isn't given:

```predict
question: `function f(s = new Set()) { s.add(1); return s.size; }` is called twice, `f()` and then `f()` again. What do the two calls return?
choice: 1, then 2
choice: 1, then 1
answer: 1, then 1
explain: JavaScript works out a default value afresh on every call that doesn't pass one, so each call gets its own new, empty set. (Python is different, and it's a famous trap: `def f(s=set())` makes one set when the function is defined, and every call shares it, so the second call would return 2.)
verify: node -e "function f(s = new Set()) { s.add(1); return s.size; } console.log(f() + ', then ' + f())"
```

This step changes `cellValue` in `src/compute.ts`:

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
    return String(Number(value.toPrecision(15)));
  }
  if (typeof value === "string") {
    return value;
  }
  return value.error;
}
```

**`cellValue`'s inputs now, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `sheet` | the sheet, as before | |
| input `address` | which cell, as before | B1 |
| input `visiting` | the cells whose formulas are being worked out right now, as text like `"B1"`; a new empty `Set` when not given | `Set { "B1", "C1" }` |
| returns | the cell's value, now including `{ error: "#CYCLE!" }` | `{ error: "#CYCLE!" }` |

Here it is on B1: `=C1`, C1: `=B1*2`, called as `cellValue(sheet, B1)`:

| call | `visiting` when it starts | what happens |
|---|---|---|
| `cellValue(B1)` | empty | B1 isn't in it: add `"B1"`, work out `=C1` |
| `cellValue(C1)` | `B1` | C1 isn't in it: add `"C1"`, work out `=B1*2` |
| `cellValue(B1)` | `B1, C1` | **B1 is in it**: return `#CYCLE!` straight away |
| back in C1 | `B1, C1` | `#CYCLE!` * 2 passes the error on (7.2); `finally` removes `"C1"` |
| back in B1 | `B1` | C1's value is `#CYCLE!`, passed on; `finally` removes `"B1"` |

The third call never reads B1's formula again, so the chain stops after three calls instead of ten thousand.

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

## Your turn: a formula can't crash the sheet

Cycles were one way a formula could crash the page. There's another, and it matters more once sheets are shared (Module 4 gives them accounts and a server): **anyone who can type a formula can type a very long one.** The parser handles brackets by recursion, `factor` → `expression` → `term` → `factor`, three calls for each `(`. So a formula with thousands of brackets inside each other runs out of call stack just as the cycle did. In a fresh Node process, `parse` handles 3,000 brackets inside each other and throws a `RangeError` at 5,000. (The exact point moves around between runs, because the JavaScript engine optimises code while it runs, and optimised calls take less room on the stack. That alone is a reason not to rely on it.) A colleague's workbook with one such cell would break the page for everyone who opens it. Making a program stop working for others by sending it input it can't handle is called a **denial of service**, and the defence is the same everywhere: **put a limit on input, and refuse politely past it.**

First, see it: in the project folder, run `node -e "import('./src/parser.ts').then(({ parse }) => parse('('.repeat(20000) + '1' + ')'.repeat(20000)))"`, and read the error's name.

Then make `parse` refuse formulas with more than **100** brackets inside each other, by throwing a `FormulaError` (so the cell shows `#ERROR!`, through 7.4's `catch`). Ordinary formulas, with a few levels of brackets, must still work. Add a test to `src/parser.test.ts` that a formula 5,000 brackets deep throws a `FormulaError`. Commit on the `formulas` branch.

```hints
nudge: Where does the parser go one level deeper for each bracket? Count there.
concept: A counter shared by the parser's functions, like `index`: `let depth = 0;` inside `parse`. Each time `factor` sees an `(`, add one, and check it before calling `expression()`; when the matching `)` has been read, take one away. Throwing before the recursion means the call stack never gets deep: the limit is checked at depth 101, long before the crash.
shape: In `parse`: `let depth = 0;`. In `factor`'s `open` case: `depth++; if (depth > 100) { throw new FormulaError(…, token.start); }` before `expression()`, and `depth--;` before `return inside;`. In the test: `expect(() => parse("(".repeat(5000) + "1" + ")".repeat(5000))).toThrow(FormulaError);`
answer: ~~~typescript
    if (token.kind === "open") {
      depth++;
      if (depth > 100) {
        throw new FormulaError("Too many brackets inside each other", token.start);
      }
      const inside = expression();
      const close = advance();
      if (close.kind !== "close") {
        throw new FormulaError('Expected ")"', close.start);
      }
      depth--;
      return inside;
    }
~~~
```

```check
run "npx vitest run" stdout="45 passed" label="all 45 tests pass, your new one included" -- Add one test to parser.test.ts: a formula 5,000 brackets deep throws a FormulaError.
run "node -e \"import('./src/parser.ts').then(({ parse }) => { try { parse('('.repeat(20000) + '1' + ')'.repeat(20000)); console.log('no error'); } catch (e) { console.log(e.constructor.name); } })\"" stdout="FormulaError" label="a formula 20,000 brackets deep is refused with a FormulaError, not a crash" -- Count the depth in factor's open case and throw a FormulaError past 100.
run "node -e \"import('./src/parser.ts').then(({ parse }) => console.log(JSON.stringify(parse('('.repeat(50) + '1' + ')'.repeat(50)))))\"" stdout="{\"kind\":\"number\",\"value\":1}" label="50 brackets deep still parses" -- The limit is 100, and depth must go back down when each ) is read.
git-clean -- Commit it: git commit -am "Refuse formulas nested too deep"
```
