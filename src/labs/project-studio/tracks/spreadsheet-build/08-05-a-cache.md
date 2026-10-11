---
title: 8.5 — A Cache That Stays Correct
runtime: none
experiments: Remembering answers; When a remembered answer goes stale
teaches: memoisation, caches, cache invalidation, refactoring, differential testing, seeded random tests
uses: graphs, graph traversal, topological order, recursion, classes, private fields, maps, try catch, instanceof, custom errors, tests, vitest, playground
---

### The story so far

The spreadsheet has the pieces of a better recalculation, tested one by one. `references` lists the cells a formula reads (8.2). `DependencyGraph` keeps those edges in both directions, finds everything `downstream` of a cell without recursion (8.3), and puts a set of cells in **topological order**, each after everything it reads, reporting the ones caught in a cycle (8.4). The grid still uses none of it: after every Enter, `showAll` calls `cellValue` for all 2,600 cells, 7,550 calls for a sheet with one 100-cell chain (8.1).

### What this lesson builds

A **`Workbook`**: the sheet's text, plus a value for every cell, kept up to date. When a cell changes, it works out that cell and everything downstream of it, once each, in topological order, and gives back the cells whose values changed so the page can redraw just those:

```text
 book.set(A1, "10")
    │
    ├─ the graph: A1's new formula reads nothing
    ├─ downstream of A1:            A2, A3
    ├─ in topological order:        A1, A2, A3
    ├─ work out each, reading the values already kept for the cells it reads
    └─ returns ["A1", "A2", "A3"]: the cells to redraw
```

Keeping answers so they don't have to be worked out again is called **caching**, or for a function, **memoisation**. It's the oldest speed-up in computing, and it has one famous difficulty, which is most of this lesson: knowing when a kept answer has gone **stale**.

## Remembering answers {#memo}

Back to lesson 8.1's `fib`, which makes 7 million calls for `fib(32)` because it works out the same small Fibonacci numbers over and over. The fix: the first time `fib(n)` is worked out, remember the answer; every time after, give back the remembered one. This step opens `playground/js/memo.mjs`:

```javascript file=playground/js/memo.mjs
let calls = 0;
const memo = new Map();

function fib(n) {
  calls++;
  if (n < 2) {
    return n;
  }
  if (memo.has(n)) {
    return memo.get(n);
  }
  const value = fib(n - 1) + fib(n - 2);
  memo.set(n, value);
  return value;
}

console.log(`fib(32) = ${fib(32)}: ${calls} calls`);
```

**`fib`'s input, and what it gives back**, the same as in 8.1:

| | what it is | example |
|---|---|---|
| input `n` | which Fibonacci number | `32` |
| returns | that number, from the cache if it was worked out before | `2178309` |

- **`memo`** maps each `n` already worked out to its answer: the **cache**.
- **Look first, work second, remember third.** `memo.has(n)` asks whether `n` has been worked out before, and `memo.get(n)` gives the answer that was kept. Only then is the real work done, and the answer stored before it's returned.

Before you run it, predict:

```predict
question: The plain `fib(32)` made 7,049,155 calls. How many does this one make?
choice: About 3.5 million: half as many
choice: About 60
choice: 32
answer: About 60
explain: Each `fib(n)` from 2 to 32 is worked out once, and each of those makes two calls, one of which is usually answered straight from the cache. The count is 63: 31 values worked out, each making two calls, plus the first call. From 7 million to 63, with four extra lines.
verify: node -e "let calls = 0; const memo = new Map(); const fib = (n) => { calls++; if (n < 2) return n; const known = memo.get(n); if (known !== undefined) return known; const value = fib(n - 1) + fib(n - 2); memo.set(n, value); return value; }; fib(32); console.log(calls < 100 ? 'About 60' : calls)"
```

Run it with `node playground/js/memo.mjs`: `fib(32) = 2178309: 63 calls`. Time it as in 8.1, and the 50 ms becomes a fraction of a millisecond.

```check
run "node playground/js/memo.mjs" stdout="fib(32) = 2178309: 63 calls" label="memoised, fib(32) takes 63 calls" -- Look in memo first; work it out only if it isn't there; store it before returning.
```

## When a remembered answer goes stale {#stale}

`fib(10)` is 55 today and forever: a pure function's answers never change, so its cache never needs emptying. A spreadsheet's cells are different. A2's value, `=A1+1`, is 2 while A1 is 1, and becomes **wrong** the moment A1 changes. A kept value that no longer matches what it was worked out from is **stale**, and showing a stale value is worse than being slow: it's a wrong number on the screen, with nothing to say so.

So a cache needs a rule for **invalidation**: which kept answers to throw away, or work out again, after a change. There's a well-known joke that the two hard problems in computer science are naming things and cache invalidation. Here's the spreadsheet's rule, and every lesson so far this sprint was building towards it:

| after an edit to | work out again | why exactly these |
|---|---|---|
| the edited cell | itself | its text changed |
| everything `downstream` of it (8.3) | every cell that reads it, directly or through others | their inputs may have changed |
| everything else | nothing | nothing it reads changed, so its kept value is still right |

And the order matters: in topological order (8.4), every cell is worked out after everything it reads, so each one reads values that are already up to date. Get the set wrong and a value goes stale; get the order wrong and a value is worked out from a stale one.

Try the danger in Node's prompt: `const memo = new Map(); let a1 = 1; const a2 = () => memo.get("A2") ?? (memo.set("A2", a1 + 1), memo.get("A2"));` then `a2()` (2), then `a1 = 10`, then `a2()` again. Still 2: a stale value, served confidently.

## One rule for plain text {#literal}

The `Workbook` will need to turn a plain cell's text into a value, exactly as `cellValue` does (7.4): `3.50` is the number 3.5, other text stays text. Two copies of one rule drift apart, so first move the rule into a function of its own, which both can use. This step changes the end of `cellValue` in `src/compute.ts`:

```typescript file=src/compute.ts
import { formatAddress, type Address } from "./address.ts";
import { evaluate } from "./evaluate.ts";
import { FormulaError } from "./lexer.ts";
import { parse } from "./parser.ts";
import type { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export const metrics = { cellValueCalls: 0 };

export function cellValue(sheet: Sheet, address: Address, visiting = new Set<string>()): Value {
  metrics.cellValueCalls++;
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
  return literalValue(text);
}

export function literalValue(text: string): Value {
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

**`literalValue`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `text` | a cell's text, when it isn't a formula | `"3.50"` |
| returns | its value: a number, or the text as it is | `3.5`; for `"Coffee"`, `"Coffee"` |

This is a **refactor** (lesson 6.2): the code is arranged differently and does exactly the same thing. The proof is that every test still passes, untouched.

```check
run "npx vitest run" stdout="55 passed" label="all 55 tests still pass: the refactor changed nothing they can see"
contains src/compute.ts "export function literalValue(text: string): Value" label="literalValue is exported for the Workbook to use"
```

## The tests {#tests}

The `Workbook`'s tests are supplied: click **Create provided src/workbook.test.ts** and read them:

```typescript file=src/workbook.test.ts provided
import { describe, expect, it } from "vitest";
import { parseAddress, type Address } from "./address.ts";
import { cellValue } from "./compute.ts";
import { Sheet } from "./sheet.ts";
import { Workbook } from "./workbook.ts";

function at(text: string): Address {
  const address = parseAddress(text);
  if (address === null) {
    throw new Error(`Bad address in a test: ${text}`);
  }
  return address;
}

describe("Workbook", () => {
  it("works out formulas, and keeps their values", () => {
    const book = new Workbook();
    book.set(at("B2"), "3.50");
    book.set(at("C2"), "2");
    book.set(at("D2"), "=B2*C2");
    expect(book.value(at("D2"))).toBe(7);
    expect(book.text(at("D2"))).toBe("=B2*C2");
  });

  it("recalculates what depends on an edit, and only that", () => {
    const book = new Workbook();
    book.set(at("A1"), "1");
    book.set(at("A2"), "=A1+1");
    book.set(at("A3"), "=A2+1");
    book.set(at("B1"), "=5*5");
    book.evaluations = 0;
    const changed = book.set(at("A1"), "10");
    expect(changed).toEqual(["A1", "A2", "A3"]);
    expect(book.evaluations).toBe(3);
    expect(book.value(at("A3"))).toBe(12);
  });

  it("works out each cell once, however many cells read it", () => {
    const book = new Workbook();
    book.set(at("B1"), "=A1+A1");
    book.set(at("C1"), "=A1+B1");
    book.set(at("D1"), "=B1+C1");
    book.evaluations = 0;
    book.set(at("A1"), "1");
    expect(book.evaluations).toBe(4);
    expect(book.value(at("D1"))).toBe(5);
  });

  it("shows #CYCLE! in a circle, and recovers when it's broken", () => {
    const book = new Workbook();
    book.set(at("A1"), "=B1+1");
    book.set(at("B1"), "=A1+1");
    expect(book.value(at("A1"))).toEqual({ error: "#CYCLE!" });
    book.set(at("B1"), "5");
    expect(book.value(at("A1"))).toBe(6);
  });

  it("agrees with cellValue on every cell of many random sheets", () => {
    let seed = 1;
    const random = (n: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const cells = ["A1", "A2", "A3", "B1", "B2"];
    for (let round = 0; round < 300; round++) {
      const book = new Workbook();
      const sheet = new Sheet();
      for (let edit = 0; edit < 12; edit++) {
        const cell = cells[random(cells.length)] ?? "A1";
        const other = cells[random(cells.length)] ?? "A1";
        const texts = [String(random(10)), `=${other}+${random(5)}`, `=${other}*${random(3)}`, `=${other}+${cells[random(cells.length)]}`, ""];
        const text = texts[random(texts.length)] ?? "";
        book.set(at(cell), text);
        sheet.set(at(cell), text);
      }
      for (const cell of cells) {
        expect(book.value(at(cell)), `round ${round}, ${cell}`).toEqual(cellValue(sheet, at(cell)));
      }
    }
  });

  it("recalculates a chain of 10,000 cells without running out of stack", () => {
    const book = new Workbook();
    for (let row = 1; row < 10000; row++) {
      book.set({ column: 0, row }, `=A${row}+1`);
    }
    book.set({ column: 0, row: 0 }, "1");
    expect(book.value({ column: 0, row: 9999 })).toBe(10000);
  });
});
```

Two of these tests are new kinds:

- **"agrees with cellValue on every cell of many random sheets"** is a **differential test**. Instead of writing down the right answers, it builds 300 random sheets, each by 12 random edits, and checks that the new code gives exactly what the old, trusted `cellValue` gives for every cell. The old code is slow but it's been tested since sprint 7; agreeing with it on hundreds of sheets nobody designed is strong evidence, and it catches cases no one thought to write a test for. The random edits are biased towards formulas that read other cells, so cycles are common: about two rounds in three end with a `#CYCLE!` somewhere.
- **`random`** isn't `Math.random`. It's a tiny generator with a fixed starting **seed**, so the "random" sheets are the same on every run. A random test that fails must fail the same way next time, or nobody can fix it.

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| works out formulas, and keeps their values | the basics: text in, values out, the formula still there to read | a workbook that shows the formula's text instead of its value, or forgets the text once it's worked out |
| recalculates what depends on an edit, and only that | the cache's whole point: three evaluations, not every cell | B1, which reads nothing that changed, recalculated anyway; or the cells returned in the wrong order for redrawing |
| works out each cell once, however many cells read it | no repeated work | A1 read by three formulas and worked out three times, which is 7.4's problem back again |
| shows #CYCLE! in a circle, and recovers when it's broken | cycles found, and stale `#CYCLE!` values cleared | a cell that shows `#CYCLE!` forever, after the circle is broken |
| agrees with cellValue on every cell of many random sheets | everything at once, on 300 sheets | any of the above, on a sheet shape nobody thought of |
| recalculates a chain of 10,000 cells without running out of stack | no recursion through cells | lesson 8.1's `RangeError`, at 1,600 cells |

```check
file src/workbook.test.ts
run "npx vitest run workbook" exit=1 stderr="workbook.ts" label="the workbook tests fail: workbook.ts doesn't exist yet (red)"
```

## The shape of a workbook {#shape}

Start with what a workbook holds. This step opens `src/workbook.ts`:

```typescript file=src/workbook.ts
import { formatAddress, type Address } from "./address.ts";
import { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export class Workbook {
  private sheet = new Sheet();
  private values = new Map<string, Value>();

  text(address: Address): string {
    return this.sheet.get(address);
  }

  value(address: Address): Value {
    return this.values.get(formatAddress(address)) ?? "";
  }
}
```

**The two methods, their inputs, and what they give back:**

| method | input | returns | example |
|---|---|---|---|
| `text` | an address | what was typed there, from the sheet | `"=B2*C2"` |
| `value` | an address | the value kept for it, or `""` for a cell never worked out | `7` |

- **The `Sheet`** (6.4) still holds what was typed. The `Workbook` wraps it: code outside talks to the workbook, never to the sheet directly.
- **`values`** is the cache: a value for every cell that holds something, keyed by its name. Reading a value is now a lookup, not a calculation.

```check
run "node -e \"import('./src/workbook.ts').then(({ Workbook }) => { const book = new Workbook(); console.log(JSON.stringify([book.text({ column: 0, row: 0 }), book.value({ column: 0, row: 0 })])); })\"" stdout="[\"\",\"\"]" label="a new workbook is empty: no text, no values" -- text reads the sheet; value reads the values map, with ?? "" for a missing one.
```

## Reading a formula once {#read}

`cellValue` parsed a formula every time it was asked for the value. The workbook parses it once, when it's typed, keeps the tree, and records its edges in the graph. This step adds `readFormula`:

```typescript file=src/workbook.ts
import { formatAddress, type Address } from "./address.ts";
import type { Expression } from "./expression.ts";
import { DependencyGraph } from "./graph.ts";
import { parse } from "./parser.ts";
import { references } from "./references.ts";
import { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export class Workbook {
  private sheet = new Sheet();
  private graph = new DependencyGraph();
  private formulas = new Map<string, Expression | null>();
  private values = new Map<string, Value>();

  text(address: Address): string {
    return this.sheet.get(address);
  }

  value(address: Address): Value {
    return this.values.get(formatAddress(address)) ?? "";
  }

  private readFormula(key: string, text: string): string[] {
    this.formulas.delete(key);
    if (!text.startsWith("=")) {
      return [];
    }
    const expression = parse(text.slice(1));
    this.formulas.set(key, expression);
    return references(expression).map(formatAddress);
  }
}
```

**`readFormula`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `key` | the cell's name | `"C1"` |
| input `text` | its new text | `"=B1+A1"` |
| returns | the names of the cells it reads, for the graph | `["B1", "A1"]`; for a plain value, `[]` |

- **`formulas`** keeps each formula's tree, so evaluating it later skips the lexer and the parser.
- **`this.formulas.delete(key)`** first: if C1 used to hold a formula and now holds `5`, its old tree must go.
- **`private`**: only the workbook's own `set` will call it (two steps from now).

The project's own `npx tsc` can't pass until the last step of this lesson, because the supplied tests already call `book.set`. So, as in lesson 7.1, the checks until then give `tsc` just this one file.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/workbook.ts" label="workbook.ts type-checks on its own"
```

## A formula that can't be read {#bad-formula}

`parse` throws a `FormulaError` for a formula like `=2+` (7.3). That cell's value is `#ERROR!`, and it reads no cells. This step wraps the parsing in `try`:

```typescript file=src/workbook.ts
import { formatAddress, type Address } from "./address.ts";
import type { Expression } from "./expression.ts";
import { DependencyGraph } from "./graph.ts";
import { FormulaError } from "./lexer.ts";
import { parse } from "./parser.ts";
import { references } from "./references.ts";
import { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export class Workbook {
  private sheet = new Sheet();
  private graph = new DependencyGraph();
  private formulas = new Map<string, Expression | null>();
  private values = new Map<string, Value>();

  text(address: Address): string {
    return this.sheet.get(address);
  }

  value(address: Address): Value {
    return this.values.get(formatAddress(address)) ?? "";
  }

  private readFormula(key: string, text: string): string[] {
    this.formulas.delete(key);
    if (!text.startsWith("=")) {
      return [];
    }
    try {
      const expression = parse(text.slice(1));
      this.formulas.set(key, expression);
      return references(expression).map(formatAddress);
    } catch (error) {
      if (!(error instanceof FormulaError)) {
        throw error;
      }
      this.formulas.set(key, null);
      return [];
    }
  }
}
```

- **`null` in `formulas`** means "a formula that can't be read". `Map<string, Expression | null>` says so in the type: a cell's entry is a tree, or `null`, or missing (not a formula at all). Three cases, which the next step's `compute` tells apart.
- **Anything else is re-thrown**, as in 7.4: a `FormulaError` is the user's mistake, and anything else is ours.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/workbook.ts" label="workbook.ts type-checks on its own"
```

## Working out a plain cell {#compute-plain}

Now the calculation itself, for one cell, starting with cells that hold no formula. This step adds `compute`, and a counter of how many times it runs:

```typescript file=src/workbook.ts
import { formatAddress, parseAddress, type Address } from "./address.ts";
import { literalValue } from "./compute.ts";
import type { Expression } from "./expression.ts";
import { DependencyGraph } from "./graph.ts";
import { FormulaError } from "./lexer.ts";
import { parse } from "./parser.ts";
import { references } from "./references.ts";
import { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export class Workbook {
  private sheet = new Sheet();
  private graph = new DependencyGraph();
  private formulas = new Map<string, Expression | null>();
  private values = new Map<string, Value>();
  evaluations = 0;

  text(address: Address): string {
    return this.sheet.get(address);
  }

  value(address: Address): Value {
    return this.values.get(formatAddress(address)) ?? "";
  }

  private readFormula(key: string, text: string): string[] {
    this.formulas.delete(key);
    if (!text.startsWith("=")) {
      return [];
    }
    try {
      const expression = parse(text.slice(1));
      this.formulas.set(key, expression);
      return references(expression).map(formatAddress);
    } catch (error) {
      if (!(error instanceof FormulaError)) {
        throw error;
      }
      this.formulas.set(key, null);
      return [];
    }
  }

  private compute(key: string): Value {
    this.evaluations++;
    const address = parseAddress(key);
    return address === null ? "" : literalValue(this.sheet.get(address));
  }
}
```

- **`parseAddress(key)`** turns the name back into an address, to read the sheet. It can't be `null` for a name the workbook made itself, but its type says it might be, and `""` is an honest answer for a name that isn't a cell.
- **`literalValue`** is the rule you just moved out of `cellValue`: one rule, now used in two places.
- **`evaluations`** is public on purpose: the tests and the benchmark read it, as 8.1's `metrics` were read.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/workbook.ts" label="workbook.ts type-checks on its own"
```

## Working out a formula {#compute}

A cell with a formula is worked out by evaluating its kept tree. This step adds the two formula cases to the start of `compute`:

```typescript file=src/workbook.ts
import { formatAddress, parseAddress, type Address } from "./address.ts";
import { literalValue } from "./compute.ts";
import { evaluate } from "./evaluate.ts";
import type { Expression } from "./expression.ts";
import { DependencyGraph } from "./graph.ts";
import { FormulaError } from "./lexer.ts";
import { parse } from "./parser.ts";
import { references } from "./references.ts";
import { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export class Workbook {
  private sheet = new Sheet();
  private graph = new DependencyGraph();
  private formulas = new Map<string, Expression | null>();
  private values = new Map<string, Value>();
  evaluations = 0;

  text(address: Address): string {
    return this.sheet.get(address);
  }

  value(address: Address): Value {
    return this.values.get(formatAddress(address)) ?? "";
  }

  private readFormula(key: string, text: string): string[] {
    this.formulas.delete(key);
    if (!text.startsWith("=")) {
      return [];
    }
    try {
      const expression = parse(text.slice(1));
      this.formulas.set(key, expression);
      return references(expression).map(formatAddress);
    } catch (error) {
      if (!(error instanceof FormulaError)) {
        throw error;
      }
      this.formulas.set(key, null);
      return [];
    }
  }

  private compute(key: string): Value {
    this.evaluations++;
    const expression = this.formulas.get(key);
    if (expression === null) {
      return { error: "#ERROR!" };
    }
    if (expression !== undefined) {
      return evaluate(expression, (other) => this.values.get(formatAddress(other)) ?? "");
    }
    const address = parseAddress(key);
    return address === null ? "" : literalValue(this.sheet.get(address));
  }
}
```

**`compute`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `key` | the cell's name | `"C1"` |
| returns | its value, worked out from the values already kept | `22`, for `=B1+A1` with B1 = 20 and A1 = 2 |

The three cases, in order:

| `formulas.get(key)` | means | value |
|---|---|---|
| `null` | a formula that can't be read | `{ error: "#ERROR!" }` |
| a tree | a formula | `evaluate`, with `valueAt` reading **the cache**: `this.values.get(...)` |
| `undefined` | not a formula | `literalValue` of the text |

**This is where the recursion goes.** `cellValue`'s `valueAt` called `cellValue` again, and that chain is what ran out of stack. Here, `valueAt` is a lookup in `values`: it never calls `compute`. That's only correct if every cell a formula reads is already up to date when it's worked out, which is exactly what topological order guarantees. The next step puts them together.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/workbook.ts" label="workbook.ts type-checks on its own"
```

## Setting a cell {#set}

Everything comes together in `set`. This step adds it:

```typescript file=src/workbook.ts
import { formatAddress, parseAddress, type Address } from "./address.ts";
import { literalValue } from "./compute.ts";
import { evaluate } from "./evaluate.ts";
import type { Expression } from "./expression.ts";
import { DependencyGraph } from "./graph.ts";
import { FormulaError } from "./lexer.ts";
import { parse } from "./parser.ts";
import { references } from "./references.ts";
import { Sheet } from "./sheet.ts";
import type { Value } from "./values.ts";

export class Workbook {
  private sheet = new Sheet();
  private graph = new DependencyGraph();
  private formulas = new Map<string, Expression | null>();
  private values = new Map<string, Value>();
  evaluations = 0;

  text(address: Address): string {
    return this.sheet.get(address);
  }

  value(address: Address): Value {
    return this.values.get(formatAddress(address)) ?? "";
  }

  set(address: Address, text: string): string[] {
    const key = formatAddress(address);
    this.sheet.set(address, text);
    this.graph.setReads(key, this.readFormula(key, text));
    const affected = this.graph.downstream(key);
    affected.add(key);
    const { ordered, cyclic } = this.graph.order(affected);
    for (const cell of ordered) {
      this.values.set(cell, this.compute(cell));
    }
    for (const cell of cyclic) {
      this.values.set(cell, { error: "#CYCLE!" });
    }
    return [...ordered, ...cyclic];
  }

  private readFormula(key: string, text: string): string[] {
    this.formulas.delete(key);
    if (!text.startsWith("=")) {
      return [];
    }
    try {
      const expression = parse(text.slice(1));
      this.formulas.set(key, expression);
      return references(expression).map(formatAddress);
    } catch (error) {
      if (!(error instanceof FormulaError)) {
        throw error;
      }
      this.formulas.set(key, null);
      return [];
    }
  }

  private compute(key: string): Value {
    this.evaluations++;
    const expression = this.formulas.get(key);
    if (expression === null) {
      return { error: "#ERROR!" };
    }
    if (expression !== undefined) {
      return evaluate(expression, (other) => this.values.get(formatAddress(other)) ?? "");
    }
    const address = parseAddress(key);
    return address === null ? "" : literalValue(this.sheet.get(address));
  }
}
```

**`set`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `address` | the cell being changed | A1 |
| input `text` | what was typed | `"10"` |
| returns | the names of every cell whose value was worked out again, in the order they were | `["A1", "A2", "A3"]` |

Here it is on the second test's sheet, A1 → A2 → A3 and B1 on its own, when A1 changes to 10:

| line | result |
|---|---|
| `this.sheet.set(address, text)` | the sheet holds `10` in A1 |
| `this.graph.setReads(key, this.readFormula(key, text))` | A1 reads nothing; its edges are cleared |
| `this.graph.downstream(key)` | `{A2, A3}`; B1 isn't there: it reads nothing that changed |
| `affected.add(key)` | `{A2, A3, A1}`: the cell itself needs working out too |
| `this.graph.order(affected)` | ordered `[A1, A2, A3]`, cyclic `[]` |
| the first loop | `compute` three times: A1 = 10, A2 = 11, A3 = 12, each reading the one just stored |
| the second loop | nothing: no cycles |
| returns | `["A1", "A2", "A3"]` |

Three evaluations, where `showAll` would have called `cellValue` 2,600 times or more. And the cycles 7.6 caught with the `visiting` set are now caught by the graph: what `order` can't place gets `#CYCLE!`.

```check
run "npx vitest run workbook" stdout="6 passed" label="the 6 workbook tests pass, the 300 random sheets included"
run "npx tsc" label="the project type-checks"
run "node -e \"import('./src/workbook.ts').then(({ Workbook }) => { const book = new Workbook(); for (let row = 1; row < 20000; row++) book.set({ column: 0, row }, '=A' + row + '+1'); book.evaluations = 0; book.set({ column: 0, row: 0 }, '1'); console.log('[' + book.value({ column: 0, row: 19999 }) + ' ' + book.evaluations + ']'); })\"" stdout="[20000 20000]" label="a chain of 20,000 cells: A20000 is 20000, after 20,000 evaluations, and no crash" -- set works out the edited cell and everything downstream of it, once each, in topological order.
```

## Commit

```powershell
git add playground src
git commit -m "A Workbook that keeps values and recalculates only what an edit affects"
```

```check
git-tracked src/workbook.ts
git-clean
```

## Your turn: paths through a grid

How many ways are there to walk from the top-left cell of a grid to the bottom-right, moving only right or down? In a 2 by 2 grid, there are 2 (right then down, or down then right). In a 3 by 3, there are 6. In general, the number of paths into a cell is the number into the cell above it plus the number into the cell to its left, and a cell in the top row or the left column has exactly 1.

In `playground/js/paths.mjs`, write and export `paths(rows, columns)`, recursively, from that rule. Then make it fast enough that `paths(25, 25)` answers at once, with memoisation. (It's 32,247,603,683,100. Without a cache, working it out would take longer than you'll wait.) Commit.

```hints
nudge: Write the plain recursive version first, from the rule, and try `paths(3, 3)`. Then add a cache, as `memo.mjs` did for `fib`.
concept: The rule is `paths(r, c) = paths(r - 1, c) + paths(r, c - 1)`, with `paths(1, c)` and `paths(r, 1)` both 1. The cache needs a key for **two** numbers: turn them into one string, like `` `${r},${c}` ``, so `3,4` and `4,3` are different keys.
shape: `const memo = new Map(); export function paths(r, c) { if (r === 1 || c === 1) return 1; const key = …; look in memo; work it out; store it; return it; }`
answer: ~~~javascript
const memo = new Map();

export function paths(rows, columns) {
  if (rows === 1 || columns === 1) {
    return 1;
  }
  const key = `${rows},${columns}`;
  const known = memo.get(key);
  if (known !== undefined) {
    return known;
  }
  const value = paths(rows - 1, columns) + paths(rows, columns - 1);
  memo.set(key, value);
  return value;
}
~~~
```

```check
run "node -e \"import('./playground/js/paths.mjs').then(({ paths }) => console.log('[' + [paths(2, 2), paths(3, 3), paths(1, 9), paths(4, 2)].join(' ') + ']'))\"" stdout="[2 6 1 4]" label="paths is right for small grids" -- Top row or left column: 1. Otherwise, the paths from above plus the paths from the left.
run "node -e \"import('./playground/js/paths.mjs').then(({ paths }) => console.log('[' + paths(25, 25) + ']'))\"" stdout="[32247603683100]" label="paths(25, 25) answers within 5 seconds: it's memoised" timeout=5 -- Keep each answer in a Map, keyed by rows and columns together, and look there first.
git-clean -- Commit it: git add playground, then git commit.
```
