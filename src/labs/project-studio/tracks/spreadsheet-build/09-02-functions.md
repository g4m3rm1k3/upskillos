---
title: 9.2 — Functions: SUM(A1:A10)
runtime: none
experiments: Functions as values; One helper for nesting
teaches: function calls, function registries, functions as values, rest parameters, reduce, variadic functions, flatMap
uses: ranges, lexers, parsers, recursive descent, discriminated unions, maps, input limits, refactoring, tests, vitest, playground
---

### The story so far

Lesson 9.1 added **ranges** to the formula language: `A1:B3` is one node in the tree, `cellsIn(from, to)` lists its cells row by row, every one of them is an edge in the dependency graph, and a range on its own is `#VALUE!`. The work is on the `functions` branch.

### What this lesson builds

Function calls. `SUM(A1:A3, 10)` becomes a `call` node in the tree, with a name and a list of arguments, and evaluating it looks the name up in a **registry**: a `Map` from names to the functions that do the work.

```text
 =SUM(A1:A3, 10)

 the tree                          evaluating it
 { kind: "call",                    1. functions.get("SUM")       → the sum function
   name: "SUM",                     2. each argument's values:
   args: [                              A1:A3 → [3.5, 2.25, 4]
     { kind: "range", A1:A3 },          10    → [10]
     { kind: "number", 10 } ] }        3. sum([[3.5, 2.25, 4], [10]]) → 19.75
```

A name the registry doesn't know, like `=TOTAL(A1:A3)`, shows `#NAME?`, the error Excel uses for a misspelt function.

## Functions as values {#registry}

In JavaScript (and Python), a function is a value like any other: it can be stored in a variable, passed to another function (you've done that since `addEventListener`), and kept in a `Map` under a name. A **registry** is exactly that: look a function up by its name, then call what you found. Try it in the playground. This step opens `playground/js/registry.mjs`:

```javascript file=playground/js/registry.mjs
function double(x) {
  return x * 2;
}

function total(...numbers) {
  return numbers.reduce((sum, n) => sum + n, 0);
}

const commands = new Map([
  ["DOUBLE", double],
  ["TOTAL", total],
]);

const run = commands.get("TOTAL");
console.log(run(1, 2, 3), commands.get("DOUBLE")(21));
```

**The two functions, their inputs, and what they give back:**

| function | inputs | returns | example |
|---|---|---|---|
| `double` | one number | twice it | `double(21)` is `42` |
| `total` | any number of numbers | their sum | `total(1, 2, 3)` is `6` |

- **`...numbers`** is a **rest parameter**: however many arguments the call passes, they arrive together as one array, `numbers`. Python writes it `*numbers`. A function that takes any number of arguments is called **variadic**.
- **`numbers.reduce((sum, n) => sum + n, 0)`** walks the array, keeping a running result: it starts at `0`, and for each number `n` the result becomes `sum + n`. For `[1, 2, 3]`: 0 + 1 = 1, 1 + 2 = 3, 3 + 3 = 6.
- **`commands.get("TOTAL")`** gives back the function itself, not a call of it. `run` now *is* `total`, and `run(1, 2, 3)` calls it.

Before you run it, predict:

```predict
question: What does `commands.get("TRIPLE")` give?
choice: An error: there's no TRIPLE
choice: undefined
choice: A function that does nothing
answer: undefined
explain: A `Map` gives `undefined` for a key it doesn't hold, as it did for cells in lesson 6.4. Calling it, `commands.get("TRIPLE")(3)`, would then fail with *TypeError: … is not a function*. So the spreadsheet must check what it found before calling it, and show an error in the cell.
verify: node -e "console.log(String(new Map([['DOUBLE', (x) => x * 2]]).get('TRIPLE')))"
```

Run it: `6 42`. Then try `commands.get("TRIPLE")(3)` in Node's prompt to see the `TypeError`.

```check
run "node playground/js/registry.mjs" stdout="6 42" label="TOTAL adds any number of arguments; DOUBLE doubles" -- total takes ...numbers and reduces them to a sum.
```

## The tests {#tests}

The functions' tests are supplied: click **Create provided src/functions.test.ts** and read them:

```typescript file=src/functions.test.ts provided
import { describe, expect, it } from "vitest";
import { parseAddress, type Address } from "./address.ts";
import { Workbook } from "./workbook.ts";

function at(text: string): Address {
  const address = parseAddress(text);
  if (address === null) {
    throw new Error(`Bad address in a test: ${text}`);
  }
  return address;
}

function valueOf(formula: string, cells: Record<string, string> = {}): unknown {
  const book = new Workbook();
  for (const [text, value] of Object.entries(cells)) {
    book.set(at(text), value);
  }
  book.set(at("Z99"), formula);
  return book.value(at("Z99"));
}

const prices = { A1: "3.50", A2: "2.25", A3: "Coffee", A4: "", A5: "4" };

describe("functions", () => {
  it("adds up numbers, cells and ranges, skipping text and empty cells", () => {
    expect(valueOf("=SUM(1, 2, 3)")).toBe(6);
    expect(valueOf("=SUM(A1:A5)", prices)).toBe(9.75);
    expect(valueOf("=SUM(A1:A2, 10)", prices)).toBe(15.75);
  });

  it("averages, and finds the smallest and largest", () => {
    expect(valueOf("=AVERAGE(A1:A5)", prices)).toBe(3.25);
    expect(valueOf("=MIN(A1:A5)", prices)).toBe(2.25);
    expect(valueOf("=MAX(A1:A5)", prices)).toBe(4);
  });

  it("counts the numbers", () => {
    expect(valueOf("=COUNT(A1:A5)", prices)).toBe(3);
  });

  it("passes on an error from any cell it reads", () => {
    expect(valueOf("=SUM(A1:A2)", { A1: "1", A2: "=1/0" })).toEqual({ error: "#DIV/0!" });
  });

  it("gives #DIV/0! for the average of nothing, and #NAME? for a function it doesn't know", () => {
    expect(valueOf("=AVERAGE(A1:A3)")).toEqual({ error: "#DIV/0!" });
    expect(valueOf("=TOTAL(A1:A3)")).toEqual({ error: "#NAME?" });
  });

  it("recalculates when a cell in a range changes", () => {
    const book = new Workbook();
    book.set(at("A1"), "1");
    book.set(at("A2"), "2");
    book.set(at("B1"), "=SUM(A1:A3)");
    book.set(at("A3"), "10");
    expect(book.value(at("B1"))).toBe(13);
  });
});
```

`valueOf` builds a workbook, sets the cells it's given, puts the formula in Z99, and reads Z99's value back: each test is one formula, worked out the way the page would work it out, graph and all. This lesson makes `SUM` work; the next adds the others, so three of the six tests will still fail at the end of this one.

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| adds up numbers, cells and ranges, skipping text and empty cells | `SUM`, with every kind of argument | `Coffee` in A3 turning the whole total into `#VALUE!`, or `SUM(A1:A2, 10)` forgetting the 10 |
| averages, and finds the smallest and largest | the next lesson's functions | |
| counts the numbers | the next lesson's | |
| passes on an error from any cell it reads | errors as values, through a function | `=SUM(A1:A2)` showing 1 when A2 is `#DIV/0!`, hiding the broken cell |
| gives #DIV/0! for the average of nothing, and #NAME? for a function it doesn't know | unknown names | `=TOTAL(…)` crashing with a `TypeError` instead of showing an error in the cell |
| recalculates when a cell in a range changes | ranges in the graph | B1 = `SUM(A1:A3)` still showing 3 after A3 changes, because A3's edge was missing |

```check
file src/functions.test.ts
run "npx vitest run functions" exit=1 label="the functions tests fail: SUM isn't a thing yet (red)"
```

## Names and commas {#names}

`SUM` is a word, and until now every word in a formula had to be a cell address: `"SUM" is not a cell address`. A function's name is followed by `(`, and a cell never is, so the lexer can tell them apart by looking one character ahead. Arguments are separated by commas, which need a token too. This step changes `src/lexer.ts`:

```typescript file=src/lexer.ts
import { parseAddress, type Address } from "./address.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "cell"; address: Address; start: number }
  | { kind: "name"; name: string; start: number }
  | { kind: "operator"; op: "+" | "-" | "*" | "/" | "^"; start: number }
  | { kind: "open"; start: number }
  | { kind: "close"; start: number }
  | { kind: "colon"; start: number }
  | { kind: "comma"; start: number }
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
      if (text.charAt(i) === "(") {
        tokens.push({ kind: "name", name: word.toUpperCase(), start });
      } else {
        const address = parseAddress(word);
        if (address === null) {
          throw new FormulaError(`"${word}" is not a cell address`, start);
        }
        tokens.push({ kind: "cell", address, start });
      }
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
    } else if (char === ",") {
      tokens.push({ kind: "comma", start });
      i++;
    } else {
      throw new FormulaError(`Unexpected "${char}"`, start);
    }
  }
  tokens.push({ kind: "end", start: text.length });
  return tokens;
}
```

- **`text.charAt(i) === "("`** looks at the character just after the word: a name if it's `(`, a cell otherwise. That's important for a name like `LOG10`, which is *also* a valid cell address (column LOG, row 10): only the `(` says which it is.
- **`word.toUpperCase()`**: `sum`, `Sum` and `SUM` are the same function, as in every spreadsheet.

```check
run "node -e \"import('./src/lexer.ts').then(({ tokenize }) => console.log(tokenize('sum(A1, 2)').map((t) => t.kind === 'name' ? t.name : t.kind).join(' ')))\"" stdout="SUM open cell comma number close end" label="sum(A1, 2) is a name, a bracket, a cell, a comma, a number, a bracket" -- A word followed by ( is a name, in capitals; a comma is a token of its own.
```

## One helper for nesting {#nested}

Before adding calls to the parser, a tidy-up it needs. Lessons 7.6 to 7.8 counted nesting depth in three places (brackets, minus signs, `^`), each with the same lines, and a function call nests too: `SUM(SUM(SUM(…)))` is recursion in the parser. A fourth copy is the moment to make one helper. This step adds it to `src/parser.ts`, and uses it for `^`:

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

  // Reads something nested inside something else, counting how deep the nesting goes, so a
  // formula can't nest deep enough to run out of call stack.
  function nested<T>(start: number, read: () => T): T {
    depth++;
    if (depth > 100) {
      throw new FormulaError("Too deeply nested", start);
    }
    const result = read();
    depth--;
    return result;
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
      return { kind: "binary", op: "^", left: base, right: nested(token.start, power) };
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

**`nested`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| type argument `T` | whatever the reading gives back | `Expression` |
| input `start` | where the nested thing starts, for the error's position | the `^`'s position |
| input `read` | a function that reads the nested thing | `power` |
| returns | whatever `read` gave back | the exponent's tree |
| or throws | a `FormulaError` past 100 levels | `Too deeply nested` |

`nested(token.start, power)` passes the function `power` itself (no brackets after it) for `nested` to call between counting up and counting down. Passing **the reading** as a function is what lets one helper fit every place that nests: lesson 8.8's `reachable` did the same with directions.

```check
run "npx vitest run parser" label="the parser's tests all still pass"
run "node -e \"import('./src/parser.ts').then(({ parse }) => { try { parse('2^'.repeat(150) + '2'); console.log('no error'); } catch (e) { console.log(e.message); } })\"" stdout="Too deeply nested" label="150 powers in a row are refused, by the helper"
```

## Every nesting, through the helper {#nested-all}

Now the other two places. This step changes the minus-sign and bracket cases of `factor` to use `nested`:

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

  // Reads something nested inside something else, counting how deep the nesting goes, so a
  // formula can't nest deep enough to run out of call stack.
  function nested<T>(start: number, read: () => T): T {
    depth++;
    if (depth > 100) {
      throw new FormulaError("Too deeply nested", start);
    }
    const result = read();
    depth--;
    return result;
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
      return { kind: "binary", op: "^", left: base, right: nested(token.start, power) };
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
      return { kind: "negate", operand: nested(token.start, factor) };
    }
    if (token.kind === "open") {
      return nested(token.start, () => {
        const inside = expression();
        const close = advance();
        if (close.kind !== "close") {
          throw new FormulaError('Expected ")"', close.start);
        }
        return inside;
      });
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

- **`nested(token.start, factor)`** reads the operand of a minus sign, counted.
- **`nested(token.start, () => { … })`** passes an arrow function for the brackets, because reading them is three things (the inside, then the `)`, then the check) rather than one call.

The three messages are now one, `Too deeply nested`; nothing tested the old wording, only that a `FormulaError` is thrown. Run all the tests: every parser test passes unchanged, 7.6's and 7.7's depth limits included. That's what makes it a **refactor** (lesson 6.2).

```check
run "npx vitest run parser" label="the parser's tests all still pass, depth limits included"
run "node -e \"import('./src/parser.ts').then(({ parse }) => { const deep = (s) => { try { parse(s); return 'ok'; } catch (e) { return e.constructor.name; } }; console.log([deep('('.repeat(150) + '1' + ')'.repeat(150)), deep('-'.repeat(150) + '1'), deep('2^'.repeat(150) + '2'), deep('('.repeat(50) + '1' + ')'.repeat(50))].join(' ')); })\"" stdout="FormulaError FormulaError FormulaError ok" label="brackets, minus signs and powers are all still limited, and 50 deep is still fine"
```

## A kind of node for calls {#call-node}

A call is a name and a list of arguments, each argument a whole expression. This step adds it to `src/expression.ts`:

```typescript file=src/expression.ts
import type { Address } from "./address.ts";

export type Operator = "+" | "-" | "*" | "/" | "^";

export type Expression =
  | { kind: "number"; value: number }
  | { kind: "cell"; address: Address }
  | { kind: "range"; from: Address; to: Address }
  | { kind: "call"; name: string; args: Expression[] }
  | { kind: "negate"; operand: Expression }
  | { kind: "binary"; op: Operator; left: Expression; right: Expression };
```

`args: Expression[]` makes the type recursive (lesson 7.2) in a new way: a node holding a list of trees. As with ranges, `npx tsc` now lists `evaluate` as not handling every kind.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/expression.ts" label="expression.ts type-checks on its own"
```

## Reading a call {#call}

In the grammar, a call is a name, `(`, then arguments separated by commas, then `)`. Start with the simplest call there is, one with no arguments, like `NOW()`. This step adds a case to `factor`, and a function `call`, to `src/parser.ts`:

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

  // Reads something nested inside something else, counting how deep the nesting goes, so a
  // formula can't nest deep enough to run out of call stack.
  function nested<T>(start: number, read: () => T): T {
    depth++;
    if (depth > 100) {
      throw new FormulaError("Too deeply nested", start);
    }
    const result = read();
    depth--;
    return result;
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
      return { kind: "binary", op: "^", left: base, right: nested(token.start, power) };
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
    if (token.kind === "name") {
      return nested(token.start, () => call(token.name));
    }
    if (token.kind === "operator" && token.op === "-") {
      return { kind: "negate", operand: nested(token.start, factor) };
    }
    if (token.kind === "open") {
      return nested(token.start, () => {
        const inside = expression();
        const close = advance();
        if (close.kind !== "close") {
          throw new FormulaError('Expected ")"', close.start);
        }
        return inside;
      });
    }
    if (token.kind === "end") {
      throw new FormulaError("The formula ends too early", token.start);
    }
    throw new FormulaError("Expected a number, a cell or (", token.start);
  }

  function call(name: string): Expression {
    advance();
    const close = advance();
    if (close.kind !== "close") {
      throw new FormulaError('Expected "," or ")"', close.start);
    }
    return { kind: "call", name, args: [] };
  }

  const result = expression();
  const extra = peek();
  if (extra.kind !== "end") {
    throw new FormulaError("Unexpected text after the end of the formula", extra.start);
  }
  return result;
}
```

**`call`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `name` | the function's name, from the token | `"NOW"` |
| returns | a `call` node | `{ kind: "call", name: "NOW", args: [] }` |
| or throws | a `FormulaError`, if `)` doesn't follow | `Expected "," or ")"` |

- **The first `advance()`** uses up the `(`: the lexer only makes a name token when a `(` follows, so it's always there.
- **`nested(token.start, () => call(token.name))`** counts calls in the depth limit, so `SUM(SUM(SUM(…)))` a thousand deep is refused, not a crash.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/parser.ts" label="parser.ts type-checks on its own"
run "node -e \"import('./src/parser.ts').then(({ parse }) => console.log(JSON.stringify(parse('now()'))))\"" stdout="{\"kind\":\"call\",\"name\":\"NOW\",\"args\":[]}" label="NOW() parses to a call with no arguments"
```

## Arguments {#arguments}

Now what goes between the brackets: an expression, then `, expression` as many times as there are commas. This step adds that to `call`:

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

  // Reads something nested inside something else, counting how deep the nesting goes, so a
  // formula can't nest deep enough to run out of call stack.
  function nested<T>(start: number, read: () => T): T {
    depth++;
    if (depth > 100) {
      throw new FormulaError("Too deeply nested", start);
    }
    const result = read();
    depth--;
    return result;
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
      return { kind: "binary", op: "^", left: base, right: nested(token.start, power) };
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
    if (token.kind === "name") {
      return nested(token.start, () => call(token.name));
    }
    if (token.kind === "operator" && token.op === "-") {
      return { kind: "negate", operand: nested(token.start, factor) };
    }
    if (token.kind === "open") {
      return nested(token.start, () => {
        const inside = expression();
        const close = advance();
        if (close.kind !== "close") {
          throw new FormulaError('Expected ")"', close.start);
        }
        return inside;
      });
    }
    if (token.kind === "end") {
      throw new FormulaError("The formula ends too early", token.start);
    }
    throw new FormulaError("Expected a number, a cell or (", token.start);
  }

  function call(name: string): Expression {
    advance();
    const args: Expression[] = [];
    if (peek().kind !== "close") {
      args.push(expression());
      while (peek().kind === "comma") {
        advance();
        args.push(expression());
      }
    }
    const close = advance();
    if (close.kind !== "close") {
      throw new FormulaError('Expected "," or ")"', close.start);
    }
    return { kind: "call", name, args };
  }

  const result = expression();
  const extra = peek();
  if (extra.kind !== "end") {
    throw new FormulaError("Unexpected text after the end of the formula", extra.start);
  }
  return result;
}
```

- **`peek().kind !== "close"`**: if the next token is `)`, there are no arguments, and `NOW()` still works.
- **The `while`** is the grammar's `{ "," expression }`: each comma is used up, then another argument is read.

Here's `SUM(A1:A2, 10)` after the name:

| step | token | `args` afterwards |
|---|---|---|
| `advance()` | `(` | `[]` |
| `args.push(expression())` | `A1`, `:`, `A2` | `[range A1:A2]` |
| the `while` sees a comma | `,` | |
| `args.push(expression())` | `10` | `[range A1:A2, number 10]` |
| the `while` sees `)`, and stops | | |
| `advance()`, checked | `)` | |

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/parser.ts" label="parser.ts type-checks on its own"
run "node -e \"import('./src/parser.ts').then(({ parse }) => console.log(JSON.stringify(parse('sum(A1:A2, 10)'))))\"" stdout="{\"kind\":\"call\",\"name\":\"SUM\",\"args\":[{\"kind\":\"range\",\"from\":{\"column\":0,\"row\":0},\"to\":{\"column\":0,\"row\":1}},{\"kind\":\"number\",\"value\":10}]}" label="SUM(A1:A2, 10) parses to a call with two arguments" -- After the (, read an expression, then another after each comma, then the ).
```

## The grammar, up to date {#grammar}

The comment at the top of `src/parser.ts` still describes lesson 7.3's grammar: no powers, no ranges, no calls. This step brings it up to date, so the next person to read the parser starts from the truth:

```typescript file=src/parser.ts
import type { Expression } from "./expression.ts";
import { FormulaError, tokenize, type Token } from "./lexer.ts";

// The grammar, one function per line:
//   expression = term { ("+" | "-") term }
//   term       = power { ("*" | "/") power }
//   power      = factor [ "^" power ]
//   factor     = number | cell [ ":" cell ] | call | "-" factor | "(" expression ")"
//   call       = name "(" [ expression { "," expression } ] ")"
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

  // Reads something nested inside something else, counting how deep the nesting goes, so a
  // formula can't nest deep enough to run out of call stack.
  function nested<T>(start: number, read: () => T): T {
    depth++;
    if (depth > 100) {
      throw new FormulaError("Too deeply nested", start);
    }
    const result = read();
    depth--;
    return result;
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
      return { kind: "binary", op: "^", left: base, right: nested(token.start, power) };
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
    if (token.kind === "name") {
      return nested(token.start, () => call(token.name));
    }
    if (token.kind === "operator" && token.op === "-") {
      return { kind: "negate", operand: nested(token.start, factor) };
    }
    if (token.kind === "open") {
      return nested(token.start, () => {
        const inside = expression();
        const close = advance();
        if (close.kind !== "close") {
          throw new FormulaError('Expected ")"', close.start);
        }
        return inside;
      });
    }
    if (token.kind === "end") {
      throw new FormulaError("The formula ends too early", token.start);
    }
    throw new FormulaError("Expected a number, a cell or (", token.start);
  }

  function call(name: string): Expression {
    advance();
    const args: Expression[] = [];
    if (peek().kind !== "close") {
      args.push(expression());
      while (peek().kind === "comma") {
        advance();
        args.push(expression());
      }
    }
    const close = advance();
    if (close.kind !== "close") {
      throw new FormulaError('Expected "," or ")"', close.start);
    }
    return { kind: "call", name, args };
  }

  const result = expression();
  const extra = peek();
  if (extra.kind !== "end") {
    throw new FormulaError("Unexpected text after the end of the formula", extra.start);
  }
  return result;
}
```

Each line is one function of the parser, as in 7.3. `[ … ]` means optional, and `{ … }` means any number of times.

```check
contains src/parser.ts "call       = name" label="the grammar comment includes calls"
```

## A call's edges {#call-edges}

A call reads every cell any of its arguments reads. This step adds a case to `src/references.ts`:

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
    case "call":
      return expression.args.flatMap(references);
    case "binary":
      return [...references(expression.left), ...references(expression.right)];
  }
}
```

**`expression.args.flatMap(references)`** calls `references` on each argument, each giving a list, and joins the lists into one: `flatMap` is `map`, then flattening one level. For `SUM(A1:A2, B1)`: `[[A1, A2], [B1]]` becomes `[A1, A2, B1]`.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/references.ts" label="references.ts type-checks on its own"
run "node -e \"Promise.all([import('./src/parser.ts'), import('./src/references.ts'), import('./src/address.ts')]).then(([{ parse }, { references }, { formatAddress }]) => console.log('[' + references(parse('SUM(A1:A2, B1)')).map(formatAddress).join(' ') + ']'))\"" stdout="[A1 A2 B1]" label="SUM(A1:A2, B1) reads A1, A2 and B1" -- A call reads whatever each of its arguments reads: flatMap references over the arguments.
```

## An error for an unknown name {#name-error}

`#NAME?` is a new kind of error value. This step adds it to the list in `src/values.ts`:

```typescript file=src/values.ts
export type ErrorCode = "#DIV/0!" | "#VALUE!" | "#ERROR!" | "#CYCLE!" | "#NAME?";

export interface ErrorValue {
  error: ErrorCode;
}

export type Value = number | string | ErrorValue;
```

```check
contains src/values.ts "\"#NAME?\"" label="#NAME? is one of the error codes"
```

## What a function is {#function-type}

Now the registry, in a new module. Start with what a function **is** to the spreadsheet, and an empty registry. This step opens `src/functions.ts`:

```typescript file=src/functions.ts
import type { ErrorValue, Value } from "./values.ts";

// A function receives its arguments' values: a list for each argument, holding every cell of a
// range, or the one value of anything else.
export type FormulaFunction = (args: Value[][]) => Value;

export const functions = new Map<string, FormulaFunction>([]);
```

- **`FormulaFunction`** is the type of every spreadsheet function: it takes a list with one entry per argument, `Value[][]`, and gives back one value. Each entry is itself a list, because one argument can stand for many values: a range gives all its cells' values, and anything else gives a list of one.
- **The registry** is a `Map` from names to `FormulaFunction`s, empty for now, and exported so `evaluate` can look names up.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/functions.ts" label="functions.ts type-checks on its own"
```

## The numbers in the arguments {#numbers}

Most functions want just the numbers out of their arguments. This step adds a helper that finds them:

```typescript file=src/functions.ts
import type { ErrorValue, Value } from "./values.ts";

// A function receives its arguments' values: a list for each argument, holding every cell of a
// range, or the one value of anything else.
export type FormulaFunction = (args: Value[][]) => Value;

// The numbers among all the arguments' values, skipping text and empty cells, or the first error.
function numbers(args: Value[][]): number[] | ErrorValue {
  const found: number[] = [];
  for (const arg of args) {
    for (const value of arg) {
      if (typeof value === "object") {
        return value;
      }
      if (typeof value === "number") {
        found.push(value);
      }
    }
  }
  return found;
}

export const functions = new Map<string, FormulaFunction>([]);
```

**`numbers`' input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `args` | the arguments' values, one list per argument | `[[3.5, 2.25, "Coffee", "", 4], [10]]` |
| returns | every number among them, in order | `[3.5, 2.25, 4, 10]` |
| or returns | the first error it meets, so the error passes on | `{ error: "#DIV/0!" }` |

Text and empty cells are skipped, as Excel's `SUM` skips them: a column of prices with a heading at the top still adds up. An error isn't skipped: a total over a broken cell must say so (7.2's rule, again).

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/functions.ts" label="functions.ts type-checks on its own"
```

## SUM {#sum}

The first function in the registry. This step adds `sum`, and registers it under the name `SUM`:

```typescript file=src/functions.ts
import type { ErrorValue, Value } from "./values.ts";

// A function receives its arguments' values: a list for each argument, holding every cell of a
// range, or the one value of anything else.
export type FormulaFunction = (args: Value[][]) => Value;

// The numbers among all the arguments' values, skipping text and empty cells, or the first error.
function numbers(args: Value[][]): number[] | ErrorValue {
  const found: number[] = [];
  for (const arg of args) {
    for (const value of arg) {
      if (typeof value === "object") {
        return value;
      }
      if (typeof value === "number") {
        found.push(value);
      }
    }
  }
  return found;
}

function sum(args: Value[][]): Value {
  const all = numbers(args);
  return Array.isArray(all) ? all.reduce((total, n) => total + n, 0) : all;
}

export const functions = new Map<string, FormulaFunction>([
  ["SUM", sum],
]);
```

**`sum`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `args` | the arguments' values | `[[3.5, 2.25, "Coffee", "", 4], [10]]` |
| returns | the total of the numbers, or the first error | `19.75` |

**`Array.isArray(all)`** asks whether `numbers` gave a list (then add it up, with `reduce` from the playground) or an error (then pass it on). TypeScript narrows `all` either way (lesson 5.2).

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/functions.ts" label="functions.ts type-checks on its own"
```

## Calling a function {#evaluate}

Last, `evaluate` learns what a `call` node means. This step changes `src/evaluate.ts`:

```typescript file=src/evaluate.ts
import { cellsIn, type Address } from "./address.ts";
import type { Expression, Operator } from "./expression.ts";
import { functions } from "./functions.ts";
import type { ErrorValue, Value } from "./values.ts";

export function evaluate(expression: Expression, valueAt: (address: Address) => Value): Value {
  switch (expression.kind) {
    case "number":
      return expression.value;
    case "cell":
      return valueAt(expression.address);
    case "range":
      return { error: "#VALUE!" };
    case "call": {
      const run = functions.get(expression.name);
      if (run === undefined) {
        return { error: "#NAME?" };
      }
      return run(expression.args.map((arg) => valuesOf(arg, valueAt)));
    }
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

// Every value an argument stands for: all the cells of a range, or the one value of anything else.
function valuesOf(expression: Expression, valueAt: (address: Address) => Value): Value[] {
  return expression.kind === "range"
    ? cellsIn(expression.from, expression.to).map(valueAt)
    : [evaluate(expression, valueAt)];
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

- **`functions.get(expression.name)`** looks the name up. `undefined` means no such function: `#NAME?`.
**`valuesOf`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `expression` | one argument's tree | `A1:A3` |
| input `valueAt` | how to read a cell's value, as for `evaluate` | the workbook's cache |
| returns | every value the argument stands for | `[3.5, 2.25, "Coffee"]`; for `10`, `[10]` |

- **`valuesOf`** turns each argument into its list of values: a range gives every cell's value (that's where ranges finally mean something), and anything else is evaluated as usual and wrapped in a list of one.
- **`run(...)`** calls the function that was found, with every argument's values.

Here's `=SUM(A1:A3, 10)`, with A1 = 3.50, A2 = 2.25, A3 = `Coffee`:

| step | result |
|---|---|
| `functions.get("SUM")` | the `sum` function |
| `valuesOf(A1:A3)` | `[3.5, 2.25, "Coffee"]` |
| `valuesOf(10)` | `[10]` |
| `sum([[3.5, 2.25, "Coffee"], [10]])` | `numbers` gives `[3.5, 2.25, 10]`, and the total is `15.75` |

```check
run "npx vitest run functions" exit=1 stdout="3 passed" label="three of the six function tests pass: SUM, errors, and recalculation" -- Look the name up; #NAME? when it's missing; call it with each argument's values.
run "npx tsc" label="the project type-checks"
```

## Commit

```powershell
git add playground src
git commit -m "Function calls, a registry of functions, and SUM"
```

```check
git-tracked src/functions.ts
git-clean
```

## Your turn: a command-line calculator

The registry idea works anywhere you look something up by name and run it: commands in a chat bot, routes in a web server (Module 6), actions in a menu. In `playground/js/calc.mjs`, write and export `calc(line)`, which takes text like `"TOTAL 1 2 3"`: a command name, then numbers separated by spaces. Look the name up in a registry with at least `TOTAL` (the sum) and `LARGEST` (the biggest number), and return the result. For a name the registry doesn't know, return the text `unknown command: NAME`, with the name as typed. Commit.

```hints
nudge: Split the line into words; the first is the name, the rest are the numbers.
concept: `line.split(" ")` gives the words. `const [name, ...rest] = words` takes the first word and collects the others: a rest element, the destructuring version of `...numbers`. `rest.map(Number)` turns the words into numbers, and `run(...numbers)` spreads them back out as separate arguments.
shape: `const commands = new Map([["TOTAL", …], ["LARGEST", …]]); export function calc(line) { const [name, ...words] = line.split(" "); const run = commands.get(name); if (run === undefined) return …; return run(...words.map(Number)); }`
answer: ~~~javascript
const commands = new Map([
  ["TOTAL", (...numbers) => numbers.reduce((sum, n) => sum + n, 0)],
  ["LARGEST", (...numbers) => Math.max(...numbers)],
]);

export function calc(line) {
  const [name, ...words] = line.split(" ");
  const run = commands.get(name);
  if (run === undefined) {
    return `unknown command: ${name}`;
  }
  return run(...words.map(Number));
}
~~~
```

```check
run "node -e \"import('./playground/js/calc.mjs').then(({ calc }) => console.log('[' + [calc('TOTAL 1 2 3'), calc('LARGEST 4 9 2'), calc('TOTAL 5')].join(' ') + ']'))\"" stdout="[6 9 5]" label="TOTAL and LARGEST work, with any number of numbers" -- Split into words; the first is the name, the rest become numbers, spread into the function.
run "node -e \"import('./playground/js/calc.mjs').then(({ calc }) => console.log('[' + calc('SQUARE 3') + ']'))\"" stdout="[unknown command: SQUARE]" label="an unknown command says so, instead of crashing" -- Check what the registry gave back before calling it.
git-clean -- Commit it: git add playground, then git commit.
```
