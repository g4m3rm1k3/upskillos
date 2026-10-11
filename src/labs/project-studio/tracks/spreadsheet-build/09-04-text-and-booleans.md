---
title: 9.4 — Text, TRUE and FALSE
runtime: none
experiments: What JavaScript does with mixed types
teaches: type coercion, text literals, booleans as values, indexOf, slice
uses: lexers, parsers, discriminated unions, switch, errors as values, tests, vitest, playground
---

### The story so far

Lessons 9.1 to 9.3 gave formulas ranges and functions: `=SUM(A1:A10)`, `AVERAGE`, `MIN`, `MAX` and `COUNT` all work, looked up by name in the `functions` registry. Every value a formula can make is still a number, an error, or text that came from a cell someone typed into. A formula can't *write* text, and nothing can be true or false.

### What this lesson builds

Two new kinds of value, ready for the comparisons and `IF` in the next lessons:

```text
 =IF(A1>100, "large", "small")
       └──┬──┘  └──┬──┘
          │        └── text written in a formula: this lesson
          └── a comparison, TRUE or FALSE: TRUE and FALSE are this lesson,
              the comparison is lesson 9.5
```

| typed into a cell | the tree | the value | the cell shows |
|---|---|---|---|
| `="large"` | `{ kind: "text", value: "large" }` | `"large"` | large |
| `="large"+1` | a `binary` node with a text side | `{ error: "#VALUE!" }` | #VALUE! |
| `="large` | (no tree: the lexer throws) | | #ERROR! |

TRUE and FALSE get no syntax of their own yet: they're JavaScript's `true` and `false` inside the spreadsheet, shown in capitals, and from lesson 9.5 a comparison makes them.

## What JavaScript does with mixed types {#coercion}

Before deciding what the spreadsheet does with text in a sum, see what JavaScript does. This step opens `playground/js/coercion.mjs`:

```javascript file=playground/js/coercion.mjs
console.log("5" + 1);
console.log("5" * 2);
console.log(true + 1);
console.log("large" * 2);
```

Before you run it, predict:

```predict
question: What does `"5" + 1` give?
choice: 6
choice: 51
choice: An error
answer: 51
explain: When either side of `+` is a string, JavaScript joins instead of adding: it turns the 1 into `"1"` and glues the two together. `*` has no string meaning, so `"5" * 2` turns the text into the number 5 and gives 10. Changing a value's type without being asked is called **type coercion**.
verify: node -e "console.log(String('5' + 1))"
```

Run it: `node playground/js/coercion.mjs`.

```text
51
10
2
NaN
```

| line | gives | because |
|---|---|---|
| `"5" + 1` | `51` (text) | `+` with a string joins |
| `"5" * 2` | `10` | `*` turns `"5"` into 5 |
| `true + 1` | `2` | `true` counts as 1 |
| `"large" * 2` | `NaN` | `"large"` isn't a number, and `NaN` ("not a number") spreads quietly through every sum it touches |

A spreadsheet user who typed `="large"+1` made a mistake, and should see it. So the spreadsheet already refuses where JavaScript guesses: text in arithmetic is `#VALUE!` (lesson 7.2's `toNumber`), and that stays. It copies JavaScript on one line only, the third, as Excel does: `=TRUE+1` is 2.

```check
run "node playground/js/coercion.mjs" stdout="51" label="the playground shows JavaScript joining 5 and 1"
```

## The tests {#tests}

The tests are supplied: click **Create provided src/text.test.ts** and read them:

```typescript file=src/text.test.ts provided
import { describe, expect, it } from "vitest";
import { display } from "./compute.ts";
import { evaluate } from "./evaluate.ts";
import { parse } from "./parser.ts";

function calc(formula: string): unknown {
  return evaluate(parse(formula), () => "");
}

describe("text, TRUE and FALSE", () => {
  it("reads text in double quotes", () => {
    expect(calc('"large"')).toBe("large");
    expect(calc('"two words"')).toBe("two words");
  });

  it("won't do arithmetic on text", () => {
    expect(calc('"large"+1')).toEqual({ error: "#VALUE!" });
  });

  it("shows TRUE and FALSE in capitals", () => {
    expect(display(true)).toBe("TRUE");
    expect(display(false)).toBe("FALSE");
  });

  it("rejects text that's never closed", () => {
    expect(() => parse('"large')).toThrow("Text without a closing quote");
  });
});
```

`calc` parses a formula and evaluates it with every cell empty: these formulas read no cells.

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| reads text in double quotes | the lexer, the parser and `evaluate`, together | `="two words"` losing everything after the space, or keeping the quotes |
| won't do arithmetic on text | `#VALUE!` for text written in a formula | `="large"+1` giving `"large1"` or `NaN`, as JavaScript would |
| shows TRUE and FALSE in capitals | `display` | a cell showing `true`, JavaScript's spelling, instead of Excel's |
| rejects text that's never closed | the lexer's error | `="large` quietly reading to the end of the formula, so a missing quote hides |

```check
file src/text.test.ts
run "npx vitest run src/text.test" exit=1 label="the text tests fail: none of it exists yet (red)"
```

## TRUE and FALSE are values {#values}

A cell's value can be a number, text, or an error. This step adds a fourth kind, in `src/values.ts`:

```typescript file=src/values.ts
export type ErrorCode = "#DIV/0!" | "#VALUE!" | "#ERROR!" | "#CYCLE!" | "#NAME?";

export interface ErrorValue {
  error: ErrorCode;
}

export type Value = number | string | boolean | ErrorValue;
```

TypeScript's `boolean` is the type of `true` and `false`. Now run `npx tsc` and read what it lists: `compute.ts` and `evaluate.ts`. `display` ends with `return value.error`, and `toNumber` ends with `return value`, promising an error. Both were safe when anything that wasn't a number or text had to be an error. Now it could be `true`, which has no `.error` and isn't an error. That's the type checker doing what 7.7's exhaustive `switch` did: a new kind of value, and a list of every place that has to decide what to do with it.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/values.ts" label="values.ts type-checks on its own"
```

## TRUE counts as 1 {#to-number}

`toNumber` in `src/evaluate.ts` is where arithmetic asks "what number is this?". This step gives its answer for TRUE and FALSE:

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
  if (typeof value === "boolean") {
    return value ? 1 : 0;
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

**`toNumber`'s input, and what it gives back:**

| input `value` | returns |
|---|---|
| a number | the number |
| `true`, `false` (new) | `1`, `0` |
| `""`, an empty cell | `0` |
| any other text | `{ error: "#VALUE!" }` |
| an error | the error, passed on |

The boolean check goes before the last line, which may now assume an error is all that's left. Nothing can make a boolean yet, so no test can reach this line until lesson 9.5, but the type checker can.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/evaluate.ts" label="evaluate.ts type-checks on its own"
```

## Showing TRUE and FALSE {#display}

`display` turns a value into what the cell shows. This step adds booleans to it, in `src/compute.ts`:

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
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return value.error;
}
```

**`display`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `value` | a cell's value | `true` |
| returns | the text the cell shows | `"TRUE"` |

`String(true)` would give `"true"`; spreadsheets have always written them in capitals. That was the last place on TypeScript's list: the whole project type-checks again.

```check
run "npx vitest run src/text.test" exit=1 stdout="1 passed" label="one text test passes: TRUE and FALSE show in capitals" -- In display: if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
run "npx tsc" label="the project type-checks: every place that reads a value knows about TRUE and FALSE"
```

## A kind of node for text {#text-node}

Text written in a formula is a new kind of node, holding the text without its quotes. This step adds it to `src/expression.ts`:

```typescript file=src/expression.ts
import type { Address } from "./address.ts";

export type Operator = "+" | "-" | "*" | "/" | "^";

export type Expression =
  | { kind: "number"; value: number }
  | { kind: "text"; value: string }
  | { kind: "cell"; address: Address }
  | { kind: "range"; from: Address; to: Address }
  | { kind: "call"; name: string; args: Expression[] }
  | { kind: "negate"; operand: Expression }
  | { kind: "binary"; op: Operator; left: Expression; right: Expression };
```

As with ranges in 9.1, `npx tsc` now lists `evaluate.ts` and `references.ts`: their `switch`es don't handle `"text"` yet. The next steps visit them; until then, the checks type-check one file at a time.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/expression.ts" label="expression.ts type-checks on its own"
```

## Reading text {#lexer}

Text starts at a `"` and runs to the next `"`. This step teaches `src/lexer.ts` to read it, as one token holding what's between the quotes:

```typescript file=src/lexer.ts
import { parseAddress, type Address } from "./address.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "text"; value: string; start: number }
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
    } else if (char === '"') {
      const close = text.indexOf('"', i + 1);
      if (close === -1) {
        throw new FormulaError("Text without a closing quote", start);
      }
      tokens.push({ kind: "text", value: text.slice(i + 1, close), start });
      i = close + 1;
    } else {
      throw new FormulaError(`Unexpected "${char}"`, start);
    }
  }
  tokens.push({ kind: "end", start: text.length });
  return tokens;
}
```

- **`text.indexOf('"', i + 1)`** searches for the next `"`, starting just after the opening one, and gives its position, or `-1` if there isn't one.
- **`text.slice(i + 1, close)`** is everything between the two quotes: from just after the opening one, up to but not including the closing one.
- **`i = close + 1`** carries on just after the closing quote.

The trace, for `="hi"+1` (the lexer sees `"hi"+1`):

| `i` | char | what happens |
|---|---|---|
| 0 | `"` | `close` = `indexOf('"', 1)` = 3; token `text` with `slice(1, 3)` = `hi`; `i` = 4 |
| 4 | `+` | operator token, as before |
| 5 | `1` | number token |

With `"hi` (no closing quote), `indexOf` gives `-1` and the lexer throws *Text without a closing quote* at the opening quote, and the cell shows `#ERROR!`.

```check
run "npx vitest run src/text.test" exit=1 stdout="2 passed" label="two text tests pass: text that's never closed is an error" -- When indexOf gives -1, throw new FormulaError("Text without a closing quote", start).
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/lexer.ts" label="lexer.ts type-checks on its own"
```

## Text in the tree {#parser}

A text token becomes a text node, exactly as a number token becomes a number node. This step changes the start of `factor` in `src/parser.ts`, and adds `text` to the grammar comment's `factor` line:

```typescript file=src/parser.ts
import type { Expression } from "./expression.ts";
import { FormulaError, tokenize, type Token } from "./lexer.ts";

// The grammar, one function per line:
//   expression = term { ("+" | "-") term }
//   term       = power { ("*" | "/") power }
//   power      = factor [ "^" power ]
//   factor     = number | text | cell [ ":" cell ] | call | "-" factor | "(" expression ")"
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
    if (token.kind === "number" || token.kind === "text") {
      return token.kind === "number" ? { kind: "number", value: token.value } : { kind: "text", value: token.value };
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

The `if` now accepts either kind of token, and the `?` `:` builds whichever node matches. A text node can go anywhere a number can: `"large"+1` parses, and it's `evaluate`'s job to refuse it.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/parser.ts" label="parser.ts type-checks on its own"
```

## The value of text {#evaluate}

A text node's value is its text. This step adds `"text"` beside `"number"` in `evaluate`'s `switch`, in `src/evaluate.ts`:

```typescript file=src/evaluate.ts
import { cellsIn, type Address } from "./address.ts";
import type { Expression, Operator } from "./expression.ts";
import { functions } from "./functions.ts";
import type { ErrorValue, Value } from "./values.ts";

export function evaluate(expression: Expression, valueAt: (address: Address) => Value): Value {
  switch (expression.kind) {
    case "number":
    case "text":
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
  if (typeof value === "boolean") {
    return value ? 1 : 0;
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

Two `case` lines with nothing between them share the code that follows: a number node and a text node are both worked out as `expression.value`. Then `="large"+1` goes through `toNumber`, finds text that isn't empty, and gives `#VALUE!`, with no new code.

```check
run "npx vitest run src/text.test" stdout="4 passed" label="all four text tests pass"
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/evaluate.ts" label="evaluate.ts type-checks on its own"
```

## Text reads no cells {#references}

The last place on TypeScript's list: `references`. Text written in a formula reads no cells, like a number, so it gives the graph no edges. This step changes `src/references.ts`:

```typescript file=src/references.ts
import { cellsIn, type Address } from "./address.ts";
import type { Expression } from "./expression.ts";

export function references(expression: Expression): Address[] {
  switch (expression.kind) {
    case "number":
    case "text":
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

```check
run "npx tsc" label="the project type-checks"
run "npx vitest run" label="every test in the project passes"
```

## Commit

```powershell
git add playground src
git commit -m "Text, TRUE and FALSE"
```

```check
git-clean
```

## Your turn: quotes inside text, in the playground

How would a formula hold text with a `"` in it, like *say "hi"*? Excel's rule: inside text, two quotes in a row mean one quote character. So `"say ""hi"""` is the text *say "hi"*. The spreadsheet's lexer keeps the simple rule for now; write the Excel one in the playground.

In `playground/js/quoted.mjs`, write and export `readQuoted(text, start)`. `start` is the position of an opening `"`. It gives back `{ value, next }`: the text with each `""` turned into one `"`, and the position just after the closing quote. If the text is never closed, it gives `null`. Commit.

| call | returns |
|---|---|
| `readQuoted('"say ""hi"""', 0)` | `{ value: 'say "hi"', next: 12 }` |
| `readQuoted('""', 0)` | `{ value: "", next: 2 }` |
| `readQuoted('x="a"&', 2)` | `{ value: "a", next: 5 }` |
| `readQuoted('"abc', 0)` | `null` |

```hints
nudge: `indexOf` can't do it alone: the first `"` it finds might be the first half of a `""`. Walk the characters one at a time, as the lexer does, building up the value.
concept: At a `"`, look one character further. If that's a `"` too, it's an escaped quote: add one `"` to the value and step past both. If not, this quote closes the text: return. Running off the end of the text without returning means it was never closed.
shape: `let value = ""; let i = start + 1; while (i < text.length) { if (text[i] === '"') { if (text[i + 1] === '"') { value += '"'; i += 2; continue; } return { value, next: i + 1 }; } value += text[i]; i++; } return null;`
answer: ~~~javascript
export function readQuoted(text, start) {
  let value = "";
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '"') {
      if (text[i + 1] === '"') {
        value += '"';
        i += 2;
        continue;
      }
      return { value, next: i + 1 };
    }
    value += text[i];
    i++;
  }
  return null;
}
~~~
```

```check
run "node -e \"import('./playground/js/quoted.mjs').then(({ readQuoted }) => { const q = String.fromCharCode(34); const a = readQuoted(q + 'say ' + q + q + 'hi' + q + q + q, 0); const b = readQuoted(q + 'abc', 0); const c = readQuoted(q + q, 0); const d = readQuoted('x=' + q + 'a' + q + '&', 2); console.log('[' + [a.value.replaceAll(q, 'Q'), a.next, String(b), c.value.length, c.next, d.value, d.next].join('|') + ']'); })\"" stdout="[say QhiQ|12|null|0|2|a|5]" label="readQuoted turns doubled quotes into one, finds the closing quote, and gives null for unclosed text (Q stands for a quote in this output)" -- At a quote, look one further: two quotes are one quote character; one quote closes the text.
git-clean -- Commit it: git add playground, then git commit.
```
