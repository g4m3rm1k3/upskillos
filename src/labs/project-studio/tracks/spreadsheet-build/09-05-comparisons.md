---
title: 9.5 — Comparisons
runtime: none
experiments: How JavaScript orders text
teaches: comparison operators, operator precedence levels, character codes, case-insensitive comparison, mixed-type ordering
uses: text literals, booleans as values, lexers, parsers, recursive descent, discriminated unions, switch, errors as values, comparison functions, tests, vitest, playground
---

### The story so far

Lesson 9.4 gave formulas two new kinds of value. Text can be written in a formula, `="large"`, as a `text` node; `"large"+1` is `#VALUE!`; and a missing closing quote is an error from the lexer. TRUE and FALSE are values too, JavaScript's `true` and `false`, shown in capitals and counting as 1 and 0 in arithmetic. But nothing in a formula can make one yet.

### What this lesson builds

The six comparison operators. Each compares two values and gives TRUE or FALSE:

| operator | means | example | gives |
|---|---|---|---|
| `=` | equal | `=1+1=2` | TRUE |
| `<>` | not equal | `=3<>3` | FALSE |
| `<`, `>` | less, greater | `=2>1` | TRUE |
| `<=`, `>=` | less or equal, greater or equal | `=2<=1` | FALSE |

Comparing is the last thing a formula does, after all the arithmetic, so it's a new level at the top of the grammar:

```text
 =A1+1>2*B1

 comparison            ">"
                     /     \
 expression        "+"     "*"
                  /  \     /  \
 (the levels    A1    1   2    B1
  you have)
```

The interesting part is what "less than" means for values of different kinds. The rules are Excel's, in a new file, `src/compare.ts`.

## How JavaScript orders text {#text-order}

JavaScript's `<` works on text too. Try it in the playground. This step opens `playground/js/order.mjs`:

```javascript file=playground/js/order.mjs
console.log("B" < "a");
console.log("10" < "9");
console.log(["banana", "Cherry", "apple"].sort());
console.log("B".toLowerCase() < "a".toLowerCase());
```

Before you run it, predict:

```predict
question: What does `"B" < "a"` give?
choice: true
choice: false
answer: true
explain: JavaScript compares text character by character, by each character's **code**: the number the computer stores for it. Capital letters have the codes 65 to 90 and small letters 97 to 122, so every capital comes before every small letter: `B` (66) is less than `a` (97).
verify: node -e "console.log(String('B' < 'a'))"
```

Run it: `node playground/js/order.mjs`.

```text
true
true
[ 'Cherry', 'apple', 'banana' ]
false
```

| line | gives | because |
|---|---|---|
| `"B" < "a"` | `true` | `B` is 66, `a` is 97 |
| `"10" < "9"` | `true` | text is compared from the first character: `1` (49) is less than `9` (57), and the rest never matters |
| `.sort()` | `Cherry` first | `sort` without a comparison function compares text the same way |
| lower-cased first | `false` | `b` (98) is more than `a` (97): the order a person expects |

A spreadsheet user who types `="Apple"="apple"` expects TRUE. So the spreadsheet compares text after lower-casing both sides, as the last line does. (`"10"<"9"` being TRUE is fine: it's the right answer for text, and a cell holding `10` holds a number, not text.)

```check
run "node playground/js/order.mjs" stdout="[ 'Cherry', 'apple', 'banana' ]" label="sort puts the capital C first"
```

## The tests {#tests}

The tests are supplied: click **Create provided src/compare.test.ts** and read them:

```typescript file=src/compare.test.ts provided
import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate.ts";
import { parse } from "./parser.ts";

function calc(formula: string): unknown {
  return evaluate(parse(formula), () => "");
}

describe("comparisons", () => {
  it("compares numbers, giving TRUE or FALSE", () => {
    expect(calc("2>1")).toBe(true);
    expect(calc("2<=1")).toBe(false);
    expect(calc("1+1=2")).toBe(true);
    expect(calc("3<>3")).toBe(false);
  });

  it("does arithmetic before comparing", () => {
    expect(calc("1+2>2*1")).toBe(true);
  });

  it("compares text without caring about capitals", () => {
    expect(calc('"Apple"="apple"')).toBe(true);
    expect(calc('"apple"<"banana"')).toBe(true);
    expect(calc('"B"<"a"')).toBe(false);
  });

  it("puts numbers before text, and text before TRUE and FALSE", () => {
    expect(calc('9<"1"')).toBe(true);
    expect(calc('"zebra"<(1<2)')).toBe(true);
  });

  it("counts an empty cell as 0 next to a number", () => {
    expect(evaluate(parse("A1=0"), () => "")).toBe(true);
    expect(evaluate(parse("A1<1"), () => "")).toBe(true);
  });
});
```

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| compares numbers, giving TRUE or FALSE | all six operators, and the lexer reading `<=` and `<>` as one token each | `2<=1` read as `2 <` and then `=1`, which isn't a formula |
| does arithmetic before comparing | comparison as the top level of the grammar | `1+2>2*1` worked out as `1 + (2>2) * 1` |
| compares text without caring about capitals | `compare.ts`'s text rule | `"B"<"a"` being TRUE, as in JavaScript |
| puts numbers before text, and text before TRUE and FALSE | the order between kinds | `9<"1"` comparing 9 with 1 and giving FALSE |
| counts an empty cell as 0 next to a number | the empty-cell rule | `=A1=0` being FALSE for an empty A1, because `""` is text and text comes after numbers |

```check
file src/compare.test.ts
run "npx vitest run src/compare.test" exit=1 label="the comparison tests fail: there are no comparisons yet (red)"
```

## A kind of node for comparisons {#compare-node}

A comparison has an operator and two sides, like `binary`, but it gives TRUE or FALSE instead of a number, so it gets its own kind and its own type of operator. This step changes `src/expression.ts`:

```typescript file=src/expression.ts
import type { Address } from "./address.ts";

export type Operator = "+" | "-" | "*" | "/" | "^";
export type Comparison = "=" | "<>" | "<" | ">" | "<=" | ">=";

export type Expression =
  | { kind: "number"; value: number }
  | { kind: "text"; value: string }
  | { kind: "cell"; address: Address }
  | { kind: "range"; from: Address; to: Address }
  | { kind: "call"; name: string; args: Expression[] }
  | { kind: "negate"; operand: Expression }
  | { kind: "binary"; op: Operator; left: Expression; right: Expression }
  | { kind: "compare"; op: Comparison; left: Expression; right: Expression };
```

- **`Comparison`** lists the six operators as text, as `Operator` lists the five arithmetic ones.
- **`kind: "compare"`** is the new node: `op`, `left`, `right`.

TypeScript's safety net again lists `evaluate.ts` and `references.ts`, which don't handle `"compare"` yet; the checks go one file at a time until they do.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/expression.ts" label="expression.ts type-checks on its own"
```

## A token for comparisons {#token}

The lexer needs a token for the operators. This step adds it to `src/lexer.ts`, and uses `expression.ts`'s types for both kinds of operator rather than writing them out twice:

```typescript file=src/lexer.ts
import { parseAddress, type Address } from "./address.ts";
import type { Comparison, Operator } from "./expression.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "text"; value: string; start: number }
  | { kind: "cell"; address: Address; start: number }
  | { kind: "name"; name: string; start: number }
  | { kind: "operator"; op: Operator; start: number }
  | { kind: "compare"; op: Comparison; start: number }
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

`import type` brings in only the types, which vanish when the code runs: nothing from `expression.ts` is loaded to run the lexer.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/lexer.ts" label="lexer.ts type-checks on its own"
```

## Reading one or two characters {#lexer}

Three of the operators are two characters long: `<=`, `>=` and `<>`. The lexer has to look at the next character before deciding. This step adds the branch to `src/lexer.ts`:

```typescript file=src/lexer.ts
import { parseAddress, type Address } from "./address.ts";
import type { Comparison, Operator } from "./expression.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "text"; value: string; start: number }
  | { kind: "cell"; address: Address; start: number }
  | { kind: "name"; name: string; start: number }
  | { kind: "operator"; op: Operator; start: number }
  | { kind: "compare"; op: Comparison; start: number }
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
    } else if (char === "<" || char === ">" || char === "=") {
      const two = text.slice(i, i + 2);
      if (two === "<=" || two === ">=" || two === "<>") {
        tokens.push({ kind: "compare", op: two, start });
        i += 2;
      } else {
        tokens.push({ kind: "compare", op: char, start });
        i++;
      }
    } else {
      throw new FormulaError(`Unexpected "${char}"`, start);
    }
  }
  tokens.push({ kind: "end", start: text.length });
  return tokens;
}
```

- **`text.slice(i, i + 2)`** is the character here and the next one. At the end of the text it's just one character, which is fine.
- If those two make one of the long operators, that's the token, and `i` moves past both; otherwise the token is the one character.

The trace, for `2<=1`:

| `i` | char | `two` | what happens |
|---|---|---|---|
| 0 | `2` | | number token, `i` = 1 |
| 1 | `<` | `<=` | one `compare` token, `<=`; `i` = 3 |
| 3 | `1` | | number token |

Checking the pair before the single character is the important part: checking `<` first would give `<` and then `=`, two tokens, and `2<=1` couldn't be parsed.

```check
run "node -e \"import('./src/lexer.ts').then(({ tokenize }) => console.log(tokenize('2<=1<>3').map((t) => t.op ?? t.kind).join(' ')))\"" stdout="number <= number <> number end" label="<= and <> are one token each" -- Look at text.slice(i, i + 2) before the single character.
```

## The comparison level {#comparison}

A new level at the top of the grammar: a comparison is an `expression`, then optionally an operator and another `expression`. This step adds `comparison` to `src/parser.ts`, and starts every formula there:

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

  function comparison(): Expression {
    const left = expression();
    const token = peek();
    if (token.kind === "compare") {
      advance();
      return { kind: "compare", op: token.op, left, right: expression() };
    }
    return left;
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

  const result = comparison();
  const extra = peek();
  if (extra.kind !== "end") {
    throw new FormulaError("Unexpected text after the end of the formula", extra.start);
  }
  return result;
}
```

**`comparison`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input | the tokens, read from where the parser is | `1+2>2*1` |
| returns | a `compare` node, or, with no operator, the expression on its own | `compare >` with `1+2` on the left and `2*1` on the right |

The sides are read by `expression`, so all the arithmetic is done first: `+`, `*` and the rest sit lower in the tree, and are worked out before the comparison is. And there's an `if`, not a `while`: `1<2<3` stops after `1<2`, and the leftover `<3` is an error, *Unexpected text after the end of the formula*. Excel accepts it and works out `(1<2)<3`: TRUE compared with 3, which is FALSE, because TRUE ranks above every number. Hardly anyone means that, so this spreadsheet asks for brackets instead.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/parser.ts" label="parser.ts type-checks on its own"
```

## Comparisons inside brackets and calls {#everywhere}

Brackets and a function's arguments hold whole formulas, so they read a `comparison` too: `=IF(A1>100, …)` will need it. This step changes those two places, and the grammar comment, in `src/parser.ts`:

```typescript file=src/parser.ts
import type { Expression } from "./expression.ts";
import { FormulaError, tokenize, type Token } from "./lexer.ts";

// The grammar, one function per line:
//   comparison = expression [ ("=" | "<>" | "<" | ">" | "<=" | ">=") expression ]
//   expression = term { ("+" | "-") term }
//   term       = power { ("*" | "/") power }
//   power      = factor [ "^" power ]
//   factor     = number | text | cell [ ":" cell ] | call | "-" factor | "(" comparison ")"
//   call       = name "(" [ comparison { "," comparison } ] ")"
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

  function comparison(): Expression {
    const left = expression();
    const token = peek();
    if (token.kind === "compare") {
      advance();
      return { kind: "compare", op: token.op, left, right: expression() };
    }
    return left;
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
        const inside = comparison();
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
      args.push(comparison());
      while (peek().kind === "comma") {
        advance();
        args.push(comparison());
      }
    }
    const close = advance();
    if (close.kind !== "close") {
      throw new FormulaError('Expected "," or ")"', close.start);
    }
    return { kind: "call", name, args };
  }

  const result = comparison();
  const extra = peek();
  if (extra.kind !== "end") {
    throw new FormulaError("Unexpected text after the end of the formula", extra.start);
  }
  return result;
}
```

Without this, a bracket reads an `expression`, which stops at `<`, and then expects `)`:

| formula | before this step | after |
|---|---|---|
| `(1<2)+1` | `Expected ")"`, at the `<` | a `binary` `+` whose left is `compare <` |
| `SUM(1, 2>1)` | `Expected "," or ")"`, at the `>` | a `call` with two arguments, the second a `compare` |

The grammar comment's `factor` and `call` lines now say `comparison` where they said `expression`, and its first line is the new level.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/parser.ts" label="parser.ts type-checks on its own"
```

## Ranking the kinds {#rank}

What should `9<"1"` give? Excel's rule: every number is less than every text, and every text is less than TRUE and FALSE. Then, within a kind, numbers by size. This step creates `src/compare.ts` with the core of that:

```typescript file=src/compare.ts
import type { Comparison } from "./expression.ts";

// Numbers come before text, and text before TRUE and FALSE, as in Excel.
function rank(value: number | string | boolean): number {
  return typeof value === "number" ? 0 : typeof value === "string" ? 1 : 2;
}

function order(left: number | string | boolean, right: number | string | boolean): number {
  if (rank(left) !== rank(right)) {
    return rank(left) - rank(right);
  }
  return Number(left) - Number(right);
}
```

**The two functions, their inputs, and what they give back:**

| function | inputs | returns | example |
|---|---|---|---|
| `rank` | a value | 0 for a number, 1 for text, 2 for TRUE or FALSE | `rank("1")` is `1` |
| `order` | two values | negative if the left comes first, positive if the right does, 0 if equal | `order(9, "1")` is 0 − 1 = `-1` |

- **A number for an order** is a common trick (8.7's `sort` comparison used it): one function answers all six questions, and the operators are worked out from it later.
- **`Number(left) - Number(right)`** handles numbers, and also TRUE and FALSE, which are 1 and 0: FALSE comes before TRUE.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/compare.ts" label="compare.ts type-checks on its own"
```

## Text, without capitals {#text-rule}

Two texts are compared after lower-casing them, as in the playground. This step adds that rule to `order`:

```typescript file=src/compare.ts
import type { Comparison } from "./expression.ts";

// Numbers come before text, and text before TRUE and FALSE, as in Excel.
function rank(value: number | string | boolean): number {
  return typeof value === "number" ? 0 : typeof value === "string" ? 1 : 2;
}

function order(left: number | string | boolean, right: number | string | boolean): number {
  if (rank(left) !== rank(right)) {
    return rank(left) - rank(right);
  }
  if (typeof left === "string" && typeof right === "string") {
    const a = left.toLowerCase();
    const b = right.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return Number(left) - Number(right);
}
```

`a < b ? -1 : a > b ? 1 : 0` turns JavaScript's `<` and `>` on text into the same kind of number. It can't use subtraction: `"apple" - "banana"` is `NaN`.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/compare.ts" label="compare.ts type-checks on its own"
```

## An empty cell is 0 next to a number {#empty-rule}

An empty cell's value is `""`, which is text, so by the rank rule `=A1<1` would be FALSE for an empty A1. Excel treats an empty cell compared with a number as 0, and so does this step, at the top of `order`:

```typescript file=src/compare.ts
import type { Comparison } from "./expression.ts";

// Numbers come before text, and text before TRUE and FALSE, as in Excel. An empty cell
// compared with a number counts as 0.
function rank(value: number | string | boolean): number {
  return typeof value === "number" ? 0 : typeof value === "string" ? 1 : 2;
}

function order(left: number | string | boolean, right: number | string | boolean): number {
  if (left === "" && typeof right === "number") {
    return order(0, right);
  }
  if (right === "" && typeof left === "number") {
    return order(left, 0);
  }
  if (rank(left) !== rank(right)) {
    return rank(left) - rank(right);
  }
  if (typeof left === "string" && typeof right === "string") {
    const a = left.toLowerCase();
    const b = right.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return Number(left) - Number(right);
}
```

`order(0, right)` calls `order` again with the `""` replaced by 0. The trace, for an empty A1 in `=A1<1`:

| call | what happens | returns |
|---|---|---|
| `order("", 1)` | `""` next to a number: becomes `order(0, 1)` | −1 |
| `order(0, 1)` | same rank; `Number(0) - Number(1)` | −1 |

So `A1<1` is TRUE. (`=A1=""` stays TRUE too: that's two texts, which are equal.)

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/compare.ts" label="compare.ts type-checks on its own"
```

## From an order to an answer {#compare}

`compare` is what the rest of the code calls: an operator and two values in, TRUE or FALSE out. This step adds it, with the first two operators:

```typescript file=src/compare.ts
import type { Comparison } from "./expression.ts";

// Numbers come before text, and text before TRUE and FALSE, as in Excel. An empty cell
// compared with a number counts as 0.
function rank(value: number | string | boolean): number {
  return typeof value === "number" ? 0 : typeof value === "string" ? 1 : 2;
}

function order(left: number | string | boolean, right: number | string | boolean): number {
  if (left === "" && typeof right === "number") {
    return order(0, right);
  }
  if (right === "" && typeof left === "number") {
    return order(left, 0);
  }
  if (rank(left) !== rank(right)) {
    return rank(left) - rank(right);
  }
  if (typeof left === "string" && typeof right === "string") {
    const a = left.toLowerCase();
    const b = right.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return Number(left) - Number(right);
}

export function compare(op: Comparison, left: number | string | boolean, right: number | string | boolean): boolean {
  const difference = order(left, right);
  switch (op) {
    case "=":
      return difference === 0;
    case "<>":
      return difference !== 0;
  }
}
```

**`compare`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `op` | one of the six operators | `"<="` |
| input `left`, `right` | two values, not errors | `"Apple"`, `"apple"` |
| returns | TRUE or FALSE | `order` gives 0, so `<=` is `true` |

`=` is "the order is 0"; `<>` is "it isn't". Now type-check the file, and read the error:

```text
src/compare.ts:27:109 - error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
```

That's the safety net again, this time for `Comparison`: TypeScript knows it has six members, and the `switch` handles two. If `op` were `"<"`, the function would end without returning anything.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/compare.ts" exit=1 stdout="TS2366" label="TypeScript says four operators are missing"
```

## The other four {#rest}

This step adds them to `compare`'s `switch`:

```typescript file=src/compare.ts
import type { Comparison } from "./expression.ts";

// Numbers come before text, and text before TRUE and FALSE, as in Excel. An empty cell
// compared with a number counts as 0.
function rank(value: number | string | boolean): number {
  return typeof value === "number" ? 0 : typeof value === "string" ? 1 : 2;
}

function order(left: number | string | boolean, right: number | string | boolean): number {
  if (left === "" && typeof right === "number") {
    return order(0, right);
  }
  if (right === "" && typeof left === "number") {
    return order(left, 0);
  }
  if (rank(left) !== rank(right)) {
    return rank(left) - rank(right);
  }
  if (typeof left === "string" && typeof right === "string") {
    const a = left.toLowerCase();
    const b = right.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return Number(left) - Number(right);
}

export function compare(op: Comparison, left: number | string | boolean, right: number | string | boolean): boolean {
  const difference = order(left, right);
  switch (op) {
    case "=":
      return difference === 0;
    case "<>":
      return difference !== 0;
    case "<":
      return difference < 0;
    case ">":
      return difference > 0;
    case "<=":
      return difference <= 0;
    case ">=":
      return difference >= 0;
  }
}
```

Each operator is a question about the one number `order` gave:

| `op` | true when the order is | `order(2, 1)` is 1, so |
|---|---|---|
| `<` | negative: the left comes first | FALSE |
| `>` | positive: the right comes first | TRUE |
| `<=` | negative or 0 | FALSE |
| `>=` | positive or 0 | TRUE |

With all six handled, the `switch` can't fall off the end, and the error goes.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/compare.ts" label="compare.ts type-checks on its own"
```

## Working out a comparison {#evaluate}

`evaluate` works out both sides, passes on an error from either, and calls `compare`. This step changes `src/evaluate.ts`:

```typescript file=src/evaluate.ts
import { cellsIn, type Address } from "./address.ts";
import { compare } from "./compare.ts";
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
    case "compare": {
      const left = evaluate(expression.left, valueAt);
      if (typeof left === "object") {
        return left;
      }
      const right = evaluate(expression.right, valueAt);
      if (typeof right === "object") {
        return right;
      }
      return compare(expression.op, left, right);
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

- **`typeof left === "object"`**: the only value that's an object is an error, so this is "if the left side is an error, that's the answer", the way arithmetic passes errors on.
- **No `toNumber`**: comparing text is allowed. `="a"<"b"` is TRUE, where `="a"+"b"` is `#VALUE!`.

And now that something makes TRUE and FALSE, 9.4's `toNumber` line is reachable: `=(1<2)+1` is 2.

```check
run "npx vitest run src/compare.test" stdout="5 passed" label="all five comparison tests pass"
run "node -e \"Promise.all([import('./src/parser.ts'), import('./src/evaluate.ts')]).then(([p, e]) => console.log('[' + e.evaluate(p.parse('(1<2)+1'), () => '') + ']'))\"" stdout="[2]" label="TRUE counts as 1: (1<2)+1 is 2"
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/evaluate.ts" label="evaluate.ts type-checks on its own"
```

## A comparison's edges {#references}

A comparison reads the cells its two sides read, like `binary`. This step adds `"compare"` beside `"binary"` in `src/references.ts`:

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
    case "compare":
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
git commit -m "Comparisons"
```

```check
git-clean
```

## Your turn: sorting mixed values, in the playground

`sort` with no comparison function puts `10` before `9` and `Cherry` before `apple`. In `playground/js/sort-mixed.mjs`, write and export `sortMixed(values)`: it gives back a new array, sorted the spreadsheet's way (numbers by size, then text ignoring capitals, then FALSE, then TRUE), and leaves the caller's array as it was. Commit.

| call | returns |
|---|---|
| `sortMixed([true, "banana", 10, "Cherry", 9, false, "apple"])` | `[9, 10, "apple", "banana", "Cherry", false, true]` |

```hints
nudge: `sort` takes a comparison function, `(a, b) => …`, that returns a negative number, 0 or a positive number. `compare.ts`'s `order` is exactly that kind of function.
concept: Copy before sorting: `[...values]`. In the comparison, compare the kinds' ranks first; only for two of the same kind, compare the values: lower-cased for text, `Number(a) - Number(b)` for numbers and booleans.
shape: `function rank(value) { … }` as in compare.ts, then `export function sortMixed(values) { return [...values].sort((a, b) => { if (rank(a) !== rank(b)) return rank(a) - rank(b); if (typeof a === "string") { … } return Number(a) - Number(b); }); }`
answer: ~~~javascript
function rank(value) {
  return typeof value === "number" ? 0 : typeof value === "string" ? 1 : 2;
}

export function sortMixed(values) {
  return [...values].sort((a, b) => {
    if (rank(a) !== rank(b)) {
      return rank(a) - rank(b);
    }
    if (typeof a === "string") {
      const x = a.toLowerCase();
      const y = b.toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    }
    return Number(a) - Number(b);
  });
}
~~~
```

```check
run "node -e \"import('./playground/js/sort-mixed.mjs').then(({ sortMixed }) => { const values = [true, 'banana', 10, 'Cherry', 9, false, 'apple']; const sorted = sortMixed(values); console.log('[' + sorted.join(',') + '][' + values.join(',') + ']'); })\"" stdout="[9,10,apple,banana,Cherry,false,true][true,banana,10,Cherry,9,false,apple]" label="sortMixed sorts the spreadsheet's way and leaves the original alone" -- Rank first (number, text, boolean); within text, compare lower-cased; copy with [...values] before sorting.
git-clean -- Commit it: git add playground, then git commit.
```
