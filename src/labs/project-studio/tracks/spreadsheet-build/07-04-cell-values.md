---
title: 7.4 — Formulas, Part 4: From Cell Text to Cell Value
runtime: none
experiments: Text and numbers; Catching only what's ours
teaches: rethrowing, record types, object entries, significant digits
uses: tests, vitest, recursion, dependency injection, custom errors, try catch, instanceof, narrowing, destructuring, floating point
---

### The story so far

All three stages work now, on formula text:

```text
 "B2*C2"  ──tokenize (7.1)──▶  tokens  ──parse (7.3)──▶  a tree  ──evaluate (7.2)──▶  7
```

`evaluate` needs one more thing: `valueAt`, a function that gives the value of any cell the formula names. 7.2's tests made up their own. And the sheet from sprint 6 doesn't hold values at all. `sheet.get(address)` gives back the **text** that was typed: `"Coffee"`, `"3.50"`, `"=B2*C2"`.

### What this lesson builds

The step from typed text to a **value**, for any cell, and from a value to what the cell **shows**. With this sheet typed in, the lesson's functions give:

| cell | typed (`sheet.get`) | value (`cellValue`) | shown (`display`) |
|---|---|---|---|
| A2 | `Coffee` | `"Coffee"`, text | `Coffee` |
| B2 | `3.50` | `3.5`, a number | `3.5` |
| C2 | `2` | `2` | `2` |
| D2 | `=B2*C2` | `7`, worked out from B2 and C2 | `7` |
| E2 | `=A2*2` | `{ error: "#VALUE!" }`, arithmetic on text | `#VALUE!` |
| F2 | `=2+` | `{ error: "#ERROR!" }`, a formula that can't be read | `#ERROR!` |
| G2 | (nothing) | `""` | (blank) |

Two functions do it, in a new module, `src/compute.ts`: **`cellValue(sheet, address)`** and **`display(value)`**. Lesson 7.5 puts them on the page.

Where should that code live? Not in the `Sheet`, whose job (sprint 6) is to remember what was typed, nothing more; and not in the evaluator, which knows nothing about sheets on purpose (7.2). It gets a module of its own, `compute.ts`, the one place where the sheet and the formula machinery meet.

## The tests

The tests are supplied: click **Create provided src/compute.test.ts** and read them:

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

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| reads numbers as numbers, and anything else as text | the line between numbers and text, including `-2` and an empty cell | `3.50` kept as text, so `=A1*2` gives `#VALUE!`; or an empty cell turned into `0`, which then shows as `0` in every blank cell |
| calculates a formula, using the values of the cells it names | the sheet is connected to the evaluator | a formula that sees the cells' *text*: `"3.50" * "2"` |
| follows formulas that use other formulas | chains: a formula's value can come from another formula | `=A2+A1` failing because A2 holds `=A1*10`, text that isn't a number |
| shows #ERROR! for a formula it can't read, and #VALUE! for arithmetic on text | broken formulas become error values, and pass on | one typo in A1 crashing the whole calculation, instead of showing `#ERROR!` in A1 and in A4, which uses it |
| turns a value into the text a cell shows | each kind of value has a way to be shown | an error cell showing `[object Object]`, JavaScript's default text for an object |

```check
file src/compute.test.ts
run "npx vitest run compute" exit=1 stderr="compute.ts" label="the compute tests fail: compute.ts doesn't exist yet (red)"
```

## Text and numbers {#text-numbers}

The simplest cells first: ones without a formula. Before the code, a question about JavaScript:

```predict
question: What is `Number("")`, the number for empty text?
choice: NaN
choice: 0
choice: An error
answer: 0
verify: node -e "console.log(Number(''))"
explain: JavaScript treats blank text as zero: `Number("")` and `Number("   ")` are both `0`. So "is this text a number?" can't just be `!Number.isNaN(Number(text))`, or every empty cell would become 0.
```

This step opens `src/compute.ts`:

```typescript file=src/compute.ts
import type { Address } from "./address.ts";
import type { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export function cellValue(sheet: Sheet, address: Address): Value {
  const text = sheet.get(address);
  if (text.trim() !== "" && !Number.isNaN(Number(text))) {
    return Number(text);
  }
  return text;
}
```

**`cellValue`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `sheet` | the `Sheet` holding what was typed | the sheet in the table at the top |
| input `address` | which cell | `{ column: 1, row: 1 }`, B2 |
| returns | the cell's value: a number, text, or (from the next steps) an error | `3.5` |

For a cell without a formula, it's one decision, made on the text:

| text | `text.trim() !== ""` | `Number(text)` | so the value is |
|---|---|---|---|
| `"3.50"` | true | `3.5` | `3.5` |
| `"-2"` | true | `-2` | `-2` |
| `"Coffee"` | true | `NaN` | `"Coffee"`, the text |
| `""` | false | (not asked) | `""` |
| `"   "` | false | (not asked) | `"   "` |

`Number(text)` gives the number, or `NaN` if the text isn't one. The `trim()` check (Python's `strip()`) is there because `Number("")` and `Number("   ")` are **0**: JavaScript treats blank text as zero. Without the check, every empty cell would become the number 0.

- **`sheet.get(address)`** gives the text typed in the cell, `""` when nothing was (lesson 6.4).
- **A number's text becomes a number**, so `3.50` is the value `3.5`, which is what arithmetic needs.

Try `Number` in Node's prompt on text people might type: `"1e3"`, `"0x10"`, `" 7 "`, `"1,000"`. Two of those are numbers you might not expect a spreadsheet to accept; `1,000` is one you'd expect it to accept and it doesn't. Real spreadsheets write their own number reader for exactly this reason.

```check
run "npx vitest run compute -t \"numbers as numbers\"" stdout="1 passed" label="numbers are numbers, other text is text, and empty is empty" -- Check text.trim() !== "" as well as Number.isNaN.
```

## Formulas: recursion through the sheet {#formulas}

A cell starting with `=` holds a formula: parse the rest, and evaluate it. This step adds that:

```typescript file=src/compute.ts
import type { Address } from "./address.ts";
import { evaluate } from "./evaluate.ts";
import { parse } from "./parser.ts";
import type { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export function cellValue(sheet: Sheet, address: Address): Value {
  const text = sheet.get(address);
  if (text.startsWith("=")) {
    const expression = parse(text.slice(1));
    return evaluate(expression, (other) => cellValue(sheet, other));
  }
  if (text.trim() !== "" && !Number.isNaN(Number(text))) {
    return Number(text);
  }
  return text;
}
```

For a cell starting with `=`, `cellValue` parses the rest (`text.slice(1)` drops the `=`) and evaluates it. The `valueAt` it gives the evaluator is:

```typescript
(other) => cellValue(sheet, other)
```

"To find another cell's value, ask `cellValue`." So `cellValue(A3)` evaluates `=A2+A1`; the evaluator asks for A2, which calls `cellValue(A2)`, which evaluates `=A1*10`, which asks for A1, which calls `cellValue(A1)`: `"2"`, a number, a base case. The values come back up: `A1` is 2, `A2` is 20, `A3` is 22.

That's recursion again, but through three functions (`cellValue` → `evaluate` → `valueAt` → `cellValue`) and through the **sheet**, not one tree. It ends when every chain reaches cells without formulas. Notice "when": lesson 7.5 shows a sheet where a chain never reaches one.

This is also where 7.2's decision to inject `valueAt` pays off: the evaluator never needed to know that cells can contain formulas. It asks for values, and `compute.ts` decides what a value is.

```check
run "npx vitest run compute" exit=1 stdout="3 passed" label="three of the five compute tests pass, chains of formulas included" -- Parse text.slice(1), then evaluate it with (other) => cellValue(sheet, other) as valueAt.
```

## Catching only what's ours {#catch}

A formula that can't be read, like `=2+`, makes `parse` throw a `FormulaError`, and right now nothing catches it: one broken cell would stop everything. This step catches it:

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
```

`try { … } catch (error) { … }` is Python's `try: … except …:`, which you met in 7.3's tests. Inside `catch`, `error` could be anything (JavaScript can throw any value), so `error instanceof FormulaError` checks what it is.

The lexer and the parser throw a `FormulaError` when the **formula** is wrong. That's the user's mistake, and the right response is an error value in the cell. Any **other** error means there's a bug in the program, a mistake of ours. Catching everything and showing `#ERROR!` would hide our bugs inside the user's cells, where nobody would ever look for them. So other errors are thrown on (**re-thrown**), to the Console, where they belong. This is exactly why lesson 7.1 made `FormulaError` a class of its own.

Try it: put `throw new Error("a bug of ours");` as the first line inside the `try`, and run `npx vitest run compute`. The bug isn't turned into `#ERROR!`: every formula test fails, with the message and the line it came from. Take the line out.

```check
run "npx vitest run compute" exit=1 stdout="4 passed" label="four of the five compute tests pass: broken formulas show #ERROR!" -- Wrap the parse and evaluate in try; in catch, return { error: "#ERROR!" } for a FormulaError, and throw anything else on.
```

## display {#display}

Last, the text a cell shows for a value. This step adds `display`:

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

**`display`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `value` | any value `cellValue` can give | `{ error: "#DIV/0!" }` |
| returns | the text the cell shows | `"#DIV/0!"` |

Three kinds of value, three cases, told apart with `typeof`:

| value | which `if` | shown |
|---|---|---|
| `3.5` | `typeof value === "number"`: `String(3.5)` | `3.5` |
| `"Coffee"` | `typeof value === "string"`: the text as it is | `Coffee` |
| `{ error: "#DIV/0!" }` | neither: it must be an `ErrorValue` | `#DIV/0!` |

After the two `if`s, TypeScript knows the only possibility left is an `ErrorValue`, so `value.error` is allowed: narrowing again, this time by elimination. Without `display`, the grid would put each value straight into `textContent`, and an error object would show as `[object Object]`, the text JavaScript gives any object it's asked to turn into a string.

The last check below works out a whole row of cells in the browser, including `" 12 "` with spaces round it (a number: `Number` ignores the spaces), a chain of three formulas, a broken formula and one that uses it, and an empty cell, which shows as nothing.

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

## Your turn: no more 0.30000000000000004

A client tries the sheet and types `=0.1+0.2`. Once lesson 7.5 shows values on the page, they'll see `0.30000000000000004` (lesson 0.3's floating point), and they'll file it as a bug. They're right: the value is as close as a computer can get, but showing all 17 digits is a choice, and a poor one.

Spreadsheets show at most **15 significant digits**, and so should `display`. First add a line to the `display` test in `src/compute.test.ts` that says `display(0.1 + 0.2)` is `"0.3"`, and see it fail. Then change how `display` turns a number into text, so the test passes, `1/3` shows `0.333333333333333`, and large numbers like `123456789012` stay exactly as they are. Commit on the `formulas` branch.

```hints
nudge: The number is right; only its text is wrong. Look up `Number.prototype.toPrecision` on MDN.
concept: `value.toPrecision(15)` rounds to 15 significant digits, but gives text with trailing zeros, like `"0.300000000000000"`. Turning that text back into a number with `Number(...)` drops them, and `String(...)` gives the short form.
shape: `return String(Number(value.toPrecision(15)));`
answer: ~~~typescript
  if (typeof value === "number") {
    return String(Number(value.toPrecision(15)));
  }
~~~
```

```check
run "npx vitest run compute" stdout="5 passed" label="the compute tests pass"
matches src/compute.test.ts "display\(0\.1 ?\+ ?0\.2\)" label="a test says what display(0.1 + 0.2) shows" -- Add expect(display(0.1 + 0.2)).toBe("0.3"); to the display test.
page index.html "(async () => { const { display } = await import('/src/compute.ts'); return [display(0.1 + 0.2), display(1 / 3), display(123456789012), display(-2.5), display(7)].join(' '); })()" "0.3 0.333333333333333 123456789012 -2.5 7" server=vite label="display rounds to 15 significant digits and leaves short numbers alone" -- toPrecision(15), then back through Number and String.
git-clean -- Commit it: git commit -am "Show at most 15 significant digits"
```
