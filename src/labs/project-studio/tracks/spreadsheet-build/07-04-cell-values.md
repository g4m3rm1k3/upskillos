---
title: 7.4 — Formulas, Part 4: From Cell Text to Cell Value
runtime: none
---

The pieces work on formula text. A cell, though, holds whatever was typed: `Coffee`, `3.50`, or `=B2*C2`. This lesson writes the function that answers "what is this cell's **value**?" for any cell, and the one that turns a value into the text the grid shows.

Where should that code live? Not in the `Sheet`, whose job (sprint 6) is to remember what was typed, nothing more; and not in the evaluator, which knows nothing about sheets on purpose (7.2). It gets a module of its own, `compute.ts`, the one place where the sheet and the formula machinery meet.

## The tests

This step opens `src/compute.test.ts`:

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
```

### Two helpers that make the tests readable

- **`at("B2")`** turns text into an `Address` with sprint 6's `parseAddress`. Writing `{ column: 1, row: 1 }` everywhere would hide what the test means.
- **`sheetWith({ B2: "3.50", ... })`** builds a sheet from an object of address → text. **`Record<string, string>`** is the type of an object used as a dictionary: any string keys, string values. **`Object.entries(cells)`** gives its `[key, value]` pairs, like Python's `cells.items()`, and `for (const [text, value] of ...)` unpacks each pair (lesson 6.3's destructuring).

### What the tests decide

- Text that is a number (`3.50`, `-2`) **is** a number; other text stays text; an empty cell is `""`.
- A formula can use cells that hold formulas themselves: `A3` uses `A2`, which uses `A1`.
- A formula that can't be read shows `#ERROR!`, and so does any formula that uses it: `A4` uses the broken `A1`.
- **`display`** shows `3.5`, not `3.50`. The value is a number, and numbers don't remember how they were typed. (Real spreadsheets have number formats for this; that's a feature for later.)

```check
file src/compute.test.ts
run "npx vitest run compute" exit=1 stderr="compute.ts" label="the compute tests fail: compute.ts doesn't exist yet (red)"
```

## compute.ts

This step opens `src/compute.ts`:

```typescript file=src/compute.ts
import type { Address } from "./address.ts";
import { evaluate } from "./evaluate.ts";
import { FormulaError } from "./lexer.ts";
import { parse } from "./parser.ts";
import type { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export function cellValue(sheet: Sheet, address: Address): Value {
  const text = sheet.get(address);
  if (text.startsWith("=")) {
    try {
      const expression = parse(text.slice(1));
      return evaluate(expression, (other) => cellValue(sheet, other));
    } catch (error) {
      if (error instanceof FormulaError) {
        return { error: "#ERROR!" };
      }
      throw error;
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

### A formula's value: recursion through the sheet

For a cell starting with `=`, `cellValue` parses the rest (`text.slice(1)` drops the `=`) and evaluates it. The `valueAt` it gives the evaluator is:

```typescript
(other) => cellValue(sheet, other)
```

"To find another cell's value, ask `cellValue`." So `cellValue(A3)` evaluates `=A2+A1`; the evaluator asks for A2, which calls `cellValue(A2)`, which evaluates `=A1*10`, which asks for A1, which calls `cellValue(A1)`: `"2"`, a number, a base case. The values come back up: `A1` is 2, `A2` is 20, `A3` is 22.

That's recursion again, but through three functions (`cellValue` → `evaluate` → `valueAt` → `cellValue`) and through the **sheet**, not one tree. It ends when every chain reaches cells without formulas. Notice "when": lesson 7.5 shows a sheet where a chain never reaches one.

This is also where 7.2's decision to inject `valueAt` pays off: the evaluator never needed to know that cells can contain formulas. It asks for values, and `compute.ts` decides what a value is.

### Catching only what's ours

```typescript
} catch (error) {
  if (error instanceof FormulaError) {
    return { error: "#ERROR!" };
  }
  throw error;
}
```

The lexer and the parser throw a `FormulaError` when the **formula** is wrong. That's the user's mistake, and the right response is an error value in the cell. Any **other** error means there's a bug in the program, a mistake of ours. Catching everything and showing `#ERROR!` would hide our bugs inside the user's cells, where nobody would ever look for them. So other errors are thrown on (**re-thrown**), to the Console, where they belong. This is exactly why lesson 7.1 made `FormulaError` a class of its own.

### Text that's a number

```typescript
if (text.trim() !== "" && !Number.isNaN(Number(text))) {
```

`Number(text)` gives the number, or `NaN` if the text isn't one. The `trim()` check (Python's `strip()`) is there because `Number("")` and `Number("   ")` are **0**: JavaScript treats blank text as zero. Without the check, every empty cell would become the number 0.

### display

Three kinds of value, three cases, told apart with `typeof`. After the two `if`s, TypeScript knows the only possibility left is an `ErrorValue`, so `value.error` is allowed: narrowing again, this time by elimination.

```check
run "npx vitest run compute" stdout="5 passed" label="the 5 compute tests pass"
run "npx tsc" label="the project type-checks"
page index.html "(async () => { const { Sheet } = await import('/src/sheet.ts'); const { cellValue, display } = await import('/src/compute.ts'); const s = new Sheet(); const put = (column, row, text) => s.set({ column, row }, text); put(0, 0, ' 12 '); put(1, 0, '=A1/4'); put(2, 0, '=B1*(A1+B1)'); put(3, 0, '=A1+'); put(4, 0, '=D1*2'); put(5, 0, '=A2+1'); put(6, 0, 'x'); put(7, 0, '=G1+1'); return [0, 1, 2, 3, 4, 5, 7, 8].map((column) => display(cellValue(s, { column, row: 0 }))).join(','); })()" "12,3,45,#ERROR!,#ERROR!,1,#VALUE!," server=vite label="cellValue handles spaces round a number, chains of formulas, broken formulas, empty cells (shown blank) and text"
```

## Commit

```powershell
git add src/compute.ts src/compute.test.ts
git commit -m "Work out cell values, formulas included"
```

```check
git-tracked src/compute.ts
git-clean
```
