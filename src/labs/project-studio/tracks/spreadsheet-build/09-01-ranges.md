---
title: 9.1 — Ranges: A1:A10
runtime: none
experiments: Walking a rectangle
teaches: ranges, rectangles
uses: graphs, nested loops, lexers, parsers, discriminated unions, tests, vitest, playground, git switch
---

### The story so far

Sprint 8 rebuilt recalculation: a `Workbook` keeps a value for every cell, a `DependencyGraph` knows which cells read which, and an edit works out only the cells downstream of it, once each, in topological order. `references(expression)` gives the graph its edges by listing the cells a formula names. The formula language has numbers, cells, `+ - * / ^`, brackets and negation, and nothing else: no way to write "the total of this column".

### What this sprint builds

A spreadsheet's most-used formulas:

```text
=SUM(A1:A10)
=AVERAGE(B1:B20)
=IF(C1>10, "large", "small")
```

That needs **ranges** (`A1:A10`), **function calls** (`SUM(…)`), a **registry** of functions looked up by name, **comparisons** (`C1>10`) and **text** (`"large"`), and an answer to a question every language designer meets: why can't `IF` work out both of its branches first, the way `SUM` works out its arguments?

### What this lesson builds

Ranges: a rectangle of cells written as two corners. In the formula language, `A1:B3` becomes one node in the tree, and in the dependency graph, an edge from every cell in it:

```text
 A1:B3 is the rectangle      in the tree             in the graph
   A    B
 1 ■    ■                    { kind: "range",         A1, B1, A2, B2, A3, B3
 2 ■    ■                      from: A1, to: B3 }      each → the formula's cell
 3 ■    ■
```

A range on its own isn't a value (what would one number for six cells be?), so `=A1:B3` shows `#VALUE!` until the next lesson gives ranges somewhere to go: functions.

## A branch for the sprint

```powershell
git switch -c functions
```

```check
git-branch functions -- Run git switch -c functions
```

## Walking a rectangle {#walk}

A range is two corners, and the cells in it are every column between the corners' columns, on every row between their rows. That's two nested loops (lesson 3.3), with one twist: the corners can come in either order. `B3:A1` is the same rectangle as `A1:B3`. Try it in the playground first. This step opens `playground/js/rectangle.mjs`:

```javascript file=playground/js/rectangle.mjs
export function rectangle(from, to) {
  const cells = [];
  for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row++) {
    for (let column = Math.min(from.column, to.column); column <= Math.max(from.column, to.column); column++) {
      cells.push(`(${column},${row})`);
    }
  }
  return cells;
}

console.log(rectangle({ column: 0, row: 0 }, { column: 1, row: 2 }).join(" "));
console.log(rectangle({ column: 1, row: 2 }, { column: 0, row: 0 }).join(" "));
```

**`rectangle`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `from` | one corner, as `{ column, row }` | A1 is `{ column: 0, row: 0 }` |
| input `to` | the opposite corner | B3 is `{ column: 1, row: 2 }` |
| returns | every cell in the rectangle, row by row, left to right | six cells |

- **`Math.min(from.row, to.row)` and `Math.max(...)`** make the loops start at the smaller row and end at the larger, whichever corner came first.
- **Row by row, left to right** is reading order, the same as 8.7's `readingOrder`: the outer loop is the rows.

Before you run it, predict:

```predict
question: How many cells does the rectangle from A1 to B3 hold?
choice: 4
choice: 6
choice: 9
answer: 6
explain: Two columns (A and B) times three rows (1 to 3). The size of a rectangle from (c1, r1) to (c2, r2) is (|c2 − c1| + 1) × (|r2 − r1| + 1): the + 1s are there because both corners are inside it.
verify: node -e "import('./playground/js/rectangle.mjs').then(({ rectangle }) => console.log(rectangle({ column: 0, row: 0 }, { column: 1, row: 2 }).length))"
```

Run it: both lines print the same six cells, `(0,0) (1,0) (0,1) (1,1) (0,2) (1,2)`.

```check
run "node -e \"import('./playground/js/rectangle.mjs').then(({ rectangle }) => console.log('[' + rectangle({ column: 2, row: 3 }, { column: 1, row: 1 }).join(' ') + ']'))\"" stdout="[(1,1) (2,1) (1,2) (2,2) (1,3) (2,3)]" label="corners in either order give the same cells, row by row" -- Loop rows from the smaller row to the larger, and columns the same way, inside.
```

## The tests {#tests}

The ranges' tests are supplied: click **Create provided src/ranges.test.ts** and read them:

```typescript file=src/ranges.test.ts provided
import { describe, expect, it } from "vitest";
import { cellsIn, formatAddress, parseAddress, type Address } from "./address.ts";
import { evaluate } from "./evaluate.ts";
import { parse } from "./parser.ts";
import { references } from "./references.ts";

function at(text: string): Address {
  const address = parseAddress(text);
  if (address === null) {
    throw new Error(`Bad address in a test: ${text}`);
  }
  return address;
}

describe("ranges", () => {
  it("lists every cell in a rectangle, row by row", () => {
    expect(cellsIn(at("A1"), at("B2")).map(formatAddress)).toEqual(["A1", "B1", "A2", "B2"]);
  });

  it("gives the same cells whichever corner comes first", () => {
    expect(cellsIn(at("B2"), at("A1")).map(formatAddress)).toEqual(["A1", "B1", "A2", "B2"]);
  });

  it("parses A1:B3 as one range", () => {
    expect(parse("A1:B3")).toEqual({ kind: "range", from: at("A1"), to: at("B3") });
  });

  it("reads every cell in a range", () => {
    expect(references(parse("A1:A3")).map(formatAddress)).toEqual(["A1", "A2", "A3"]);
  });

  it("can't be a value on its own", () => {
    expect(evaluate(parse("A1:A3"), () => 1)).toEqual({ error: "#VALUE!" });
  });
});
```

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| lists every cell in a rectangle, row by row | the cells and their order | a rectangle missing its last row or column, the off-by-one that `<` instead of `<=` gives |
| gives the same cells whichever corner comes first | corners in either order | `B2:A1` giving no cells at all, because the loop starts after it should end |
| parses A1:B3 as one range | the parser | `A1:B3` read as the cell A1, followed by text it can't understand |
| reads every cell in a range | the graph's edges | `=SUM(A1:A3)` not recalculating when A2 changes, because only the corners were listed |
| can't be a value on its own | a range alone is an error | `=A1:A3` quietly showing A1's value |

```check
file src/ranges.test.ts
run "npx vitest run ranges" exit=1 label="the ranges tests fail: nothing here exists yet (red)"
```

## Every cell in a range {#cells-in}

The playground's function, for the project's addresses, goes next to `parseAddress` in `src/address.ts`. This step adds `cellsIn` to the end of the file:

```typescript file=src/address.ts
import { columnIndex, columnName } from "./columns.ts";

export interface Address {
  column: number;
  row: number;
}

export function formatAddress(address: Address): string {
  return columnName(address.column) + (address.row + 1);
}

export function parseAddress(text: string): Address | null {
  const match = /^([A-Z]+)([1-9][0-9]*)$/.exec(text.toUpperCase());
  if (match === null) {
    return null;
  }
  const [, letters, digits] = match;
  if (letters === undefined || digits === undefined) {
    return null;
  }
  return { column: columnIndex(letters), row: Number(digits) - 1 };
}

// Every address in the rectangle with these two corners, row by row.
export function cellsIn(from: Address, to: Address): Address[] {
  const cells: Address[] = [];
  for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row++) {
    for (let column = Math.min(from.column, to.column); column <= Math.max(from.column, to.column); column++) {
      cells.push({ column, row });
    }
  }
  return cells;
}
```

**`cellsIn`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `from` | one corner | B2 |
| input `to` | the opposite corner | A1 |
| returns | every address in between, row by row | A1, B1, A2, B2 |

```check
run "npx vitest run ranges -t \"rectangle\"" stdout="1 passed" label="cellsIn lists a rectangle's cells, row by row"
run "npx vitest run ranges -t \"whichever corner\"" stdout="1 passed" label="whichever corner comes first" -- Start each loop at the smaller of the two, and end at the larger.
```

## A colon in the formula {#colon}

The lexer (7.1) has to recognise the `:` between the corners. One more kind of token, and one more branch. This step changes `src/lexer.ts`:

```typescript file=src/lexer.ts
import { parseAddress, type Address } from "./address.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "cell"; address: Address; start: number }
  | { kind: "operator"; op: "+" | "-" | "*" | "/" | "^"; start: number }
  | { kind: "open"; start: number }
  | { kind: "close"; start: number }
  | { kind: "colon"; start: number }
  | { kind: "end"; start: number };

export class FormulaError extends Error {
  position: number;

  constructor(message: string, position: number) {
    super(message);
    this.position = position;
  }
}

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isLetter(char: string): boolean {
  return (char >= "A" && char <= "Z") || (char >= "a" && char <= "z");
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text.charAt(i);
    const start = i;

    if (char === " ") {
      i++;
    } else if (isDigit(char) || char === ".") {
      while (isDigit(text.charAt(i)) || text.charAt(i) === ".") {
        i++;
      }
      const digits = text.slice(start, i);
      const value = Number(digits);
      if (Number.isNaN(value)) {
        throw new FormulaError(`"${digits}" is not a number`, start);
      }
      tokens.push({ kind: "number", value, start });
    } else if (isLetter(char)) {
      while (isLetter(text.charAt(i)) || isDigit(text.charAt(i))) {
        i++;
      }
      const word = text.slice(start, i);
      const address = parseAddress(word);
      if (address === null) {
        throw new FormulaError(`"${word}" is not a cell address`, start);
      }
      tokens.push({ kind: "cell", address, start });
    } else if (char === "+" || char === "-" || char === "*" || char === "/" || char === "^") {
      tokens.push({ kind: "operator", op: char, start });
      i++;
    } else if (char === "(") {
      tokens.push({ kind: "open", start });
      i++;
    } else if (char === ")") {
      tokens.push({ kind: "close", start });
      i++;
    } else if (char === ":") {
      tokens.push({ kind: "colon", start });
      i++;
    } else {
      throw new FormulaError(`Unexpected "${char}"`, start);
    }
  }
  tokens.push({ kind: "end", start: text.length });
  return tokens;
}
```

- **`{ kind: "colon"; start: number }`** joins the `Token` union. It carries nothing but its position.
- **The branch** is the same shape as the brackets': one character, one token, `i++`.

```check
run "node -e \"import('./src/lexer.ts').then(({ tokenize }) => console.log(tokenize('A1:B3').map((t) => t.kind).join(' ')))\"" stdout="cell colon cell end" label="A1:B3 is three tokens: cell, colon, cell" -- A ":" is one token of kind colon.
```

## A kind of node for ranges {#node}

A range is a new kind of node in a formula's tree, holding its two corners. This step adds it to `src/expression.ts`:

```typescript file=src/expression.ts
import type { Address } from "./address.ts";

export type Operator = "+" | "-" | "*" | "/" | "^";

export type Expression =
  | { kind: "number"; value: number }
  | { kind: "cell"; address: Address }
  | { kind: "range"; from: Address; to: Address }
  | { kind: "negate"; operand: Expression }
  | { kind: "binary"; op: Operator; left: Expression; right: Expression };
```

It's the discriminated union from 7.2 again: one more `kind`, with the fields that kind needs.

Now run the project's type check, `npx tsc`, and read what it says:

```text
src/evaluate.ts:5:89 - error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
src/references.ts:4:53 - error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
```

That's lesson 7.7's safety net at work. `Expression` has a new kind, and the two functions that `switch` over every kind of node don't handle it yet. TypeScript has listed exactly the places to visit; the next steps visit them. Until then, the checks type-check one file at a time, as lesson 7.1 did.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/expression.ts" label="expression.ts type-checks on its own"
```

## A range in the tree {#parse}

In the grammar, a range is a cell followed by `:` and another cell. It goes where cells already go, in `factor`. This step teaches `factor` in `src/parser.ts` to read it:

```typescript file=src/parser.ts
import type { Expression } from "./expression.ts";
import { FormulaError, tokenize, type Token } from "./lexer.ts";

// The grammar, one function per line:
//   expression = term   { ("+" | "-") term }
//   term       = factor { ("*" | "/") factor }
//   factor     = number | cell | "(" expression ")"
export function parse(text: string): Expression {
  const tokens = tokenize(text);
  let index = 0;
  let depth = 0;

  function peek(): Token {
    const token = tokens[index];
    if (token === undefined) {
      throw new FormulaError("The formula ends too early", text.length);
    }
    return token;
  }

  function advance(): Token {
    const token = peek();
    index++;
    return token;
  }

  function expression(): Expression {
    let left = term();
    let token = peek();
    while (token.kind === "operator" && (token.op === "+" || token.op === "-")) {
      advance();
      left = { kind: "binary", op: token.op, left, right: term() };
      token = peek();
    }
    return left;
  }

  function term(): Expression {
    let left = power();
    let token = peek();
    while (token.kind === "operator" && (token.op === "*" || token.op === "/")) {
      advance();
      left = { kind: "binary", op: token.op, left, right: power() };
      token = peek();
    }
    return left;
  }

  function power(): Expression {
    const base = factor();
    const token = peek();
    if (token.kind === "operator" && token.op === "^") {
      advance();
      depth++;
      if (depth > 100) {
        throw new FormulaError("Too many ^ in a row", token.start);
      }
      const exponent = power();
      depth--;
      return { kind: "binary", op: "^", left: base, right: exponent };
    }
    return base;
  }

  function factor(): Expression {
    const token = advance();
    if (token.kind === "number") {
      return { kind: "number", value: token.value };
    }
    if (token.kind === "cell") {
      if (peek().kind !== "colon") {
        return { kind: "cell", address: token.address };
      }
      advance();
      const to = advance();
      if (to.kind !== "cell") {
        throw new FormulaError("Expected a cell after :", to.start);
      }
      return { kind: "range", from: token.address, to: to.address };
    }
    if (token.kind === "operator" && token.op === "-") {
      depth++;
      if (depth > 100) {
        throw new FormulaError("Too many minus signs in a row", token.start);
      }
      const operand = factor();
      depth--;
      return { kind: "negate", operand };
    }
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
    if (token.kind === "end") {
      throw new FormulaError("The formula ends too early", token.start);
    }
    throw new FormulaError("Expected a number, a cell or (", token.start);
  }

  const result = expression();
  const extra = peek();
  if (extra.kind !== "end") {
    throw new FormulaError("Unexpected text after the end of the formula", extra.start);
  }
  return result;
}
```

After `factor` reads a cell, it **peeks** at the next token (7.3): if it isn't a colon, the cell is a cell, as before. If it is, the colon is used up, and the next token must be a cell, or the formula is broken: `A1:` and `A1:5` are errors, at the position of whatever came instead.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/parser.ts" label="parser.ts type-checks on its own"
run "node -e \"import('./src/parser.ts').then(({ parse }) => console.log(JSON.stringify(parse('A1:B3'))))\"" stdout="{\"kind\":\"range\",\"from\":{\"column\":0,\"row\":0},\"to\":{\"column\":1,\"row\":2}}" label="A1:B3 parses to one range node" -- After a cell, peek: a colon means a range; read the second cell.
```

## A range's edges {#edges}

The first place TypeScript listed: `references`, which gives the dependency graph its edges. A range reads every cell in it. This step changes `src/references.ts`:

```typescript file=src/references.ts
import { cellsIn, type Address } from "./address.ts";
import type { Expression } from "./expression.ts";

export function references(expression: Expression): Address[] {
  switch (expression.kind) {
    case "number":
      return [];
    case "cell":
      return [expression.address];
    case "negate":
      return references(expression.operand);
    case "range":
      return cellsIn(expression.from, expression.to);
    case "binary":
      return [...references(expression.left), ...references(expression.right)];
  }
}
```

`=SUM(A1:A100)`, next lesson, will read 100 cells, and a change to any one of them recalculates it, because each is an edge in the graph.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/references.ts" label="references.ts type-checks on its own"
run "npx vitest run ranges -t \"every cell in a range\"" stdout="1 passed" label="a range reads every cell in it" -- references gives cellsIn(from, to) for a range.
```

## A range on its own {#meaning}

The second place: `evaluate`. A range on its own has no single value to give (what would one number for six cells be?), and says so. This step changes `src/evaluate.ts`:

```typescript file=src/evaluate.ts
import type { Address } from "./address.ts";
import type { Expression, Operator } from "./expression.ts";
import type { ErrorValue, Value } from "./values.ts";

export function evaluate(expression: Expression, valueAt: (address: Address) => Value): Value {
  switch (expression.kind) {
    case "number":
      return expression.value;
    case "cell":
      return valueAt(expression.address);
    case "range":
      return { error: "#VALUE!" };
    case "negate": {
      const operand = toNumber(evaluate(expression.operand, valueAt));
      return typeof operand === "number" ? -operand : operand;
    }
    case "binary": {
      const left = toNumber(evaluate(expression.left, valueAt));
      if (typeof left !== "number") {
        return left;
      }
      const right = toNumber(evaluate(expression.right, valueAt));
      if (typeof right !== "number") {
        return right;
      }
      return calculate(expression.op, left, right);
    }
  }
}

function toNumber(value: Value): number | ErrorValue {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value === "" ? 0 : { error: "#VALUE!" };
  }
  return value;
}

function calculate(op: Operator, left: number, right: number): Value {
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? { error: "#DIV/0!" } : left / right;
    case "^":
      return left ** right;
  }
}
```

Excel does the same: a range where one value is expected is `#VALUE!`. Inside a function call, next lesson, a range will mean all its cells' values.

```check
run "npx vitest run ranges" stdout="5 passed" label="the 5 ranges tests pass"
run "npx tsc" label="the project type-checks again"
```

## Commit

```powershell
git add playground src
git commit -m "Ranges: A1:B3 in formulas, with an edge from every cell"
```

```check
git-tracked src/ranges.test.ts
git-clean
```

## Your turn: the range that holds them all

A user selects some cells and asks for a formula over them. Which range should it use? The smallest one holding every selected cell. In `playground/js/cover.mjs`, write and export `cover(names)`: given an array of cell names like `["B3", "D1", "C5"]`, return the range text that covers them all, `"B1:D5"`. A single cell gives a range of one, like `"C2:C2"`. Use `parseAddress` and `formatAddress` from the project: `import { formatAddress, parseAddress } from "../../src/address.ts";` works in Node, which removes the types (lesson 5.1). Commit.

```hints
nudge: It's lesson 6.8's bounding box, with cell names in and range text out.
concept: Turn each name into an address with `parseAddress`. Keep the smallest column and row seen, and the largest. The top-left corner is (smallest column, smallest row), the bottom-right is (largest column, largest row); `formatAddress` turns each back into a name, and `:` joins them.
shape: `export function cover(names) { const addresses = names.map(parseAddress); const from = { column: Math.min(...), row: Math.min(...) }; const to = …; return formatAddress(from) + ":" + formatAddress(to); }`
answer: ~~~javascript
import { formatAddress, parseAddress } from "../../src/address.ts";

export function cover(names) {
  const addresses = names.map(parseAddress);
  const columns = addresses.map((a) => a.column);
  const rows = addresses.map((a) => a.row);
  const from = { column: Math.min(...columns), row: Math.min(...rows) };
  const to = { column: Math.max(...columns), row: Math.max(...rows) };
  return formatAddress(from) + ":" + formatAddress(to);
}
~~~
```

```check
run "node -e \"import('./playground/js/cover.mjs').then(({ cover }) => console.log('[' + [cover(['B3', 'D1', 'C5']), cover(['C2']), cover(['Z1', 'A100'])].join(' ') + ']'))\"" stdout="[B1:D5 C2:C2 A1:Z100]" label="cover finds the smallest range holding every cell" -- The top-left is the smallest column and smallest row; the bottom-right the largest of each.
git-clean -- Commit it: git add playground, then git commit.
```
