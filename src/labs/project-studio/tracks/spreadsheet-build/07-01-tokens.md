---
title: 7.1 — Formulas, Part 1: Reading the Text into Tokens
runtime: none
experiments: The loop, and spaces; Numbers
teaches: lexers, tokens, discriminated unions, custom errors, error positions, template literals
uses: addresses, union types, narrowing, classes, inheritance, throw, while loops, loop invariants, character codes, type-only imports, ctrl+c, tests, test-driven development, branches, playground
---

This sprint makes the spreadsheet a spreadsheet: type `=B2*C2` into D2, and D2 shows `7`. When B2 or C2 changes, D2 changes with it.

To do that, the program has to understand a formula: what it says to calculate, and in what order. That's harder than it looks, and the way it's done here (in three stages: tokens, a tree, then a calculation) is how every programming language, calculator and spreadsheet does it. You'll use the same three stages again in phase 3, for the matrix language.

## A branch

```powershell
git switch -c formulas
```

```check
git-branch formulas -- Run git switch -c formulas
```

## Why not just split the text?

A first idea: `A1+B1` is two things joined by `+`, so split the text at `+`, look up each side, and add. That works for exactly that formula. Now try `A1+B1*2`.

Split at `+`: `A1` and `B1*2`. The right-hand side has a `*` in it, so split that at `*`… and you're writing special cases. Which operator do you split at first? `*` must happen before `+` (the answer is `A1 + (B1*2)`, not `(A1+B1) * 2`), so you'd have to split at the **last** `+` outside brackets, then at `*`… Brackets themselves can't be split at all. Every new feature (brackets, minus signs, functions in sprint 9) makes the splitting code worse, because the text doesn't show the formula's structure. It has to be worked out.

So the work is divided into three steps, each simple on its own:

1. **Tokens.** Cut the text into its meaningful pieces: `A1`, `+`, `B1`, `*`, `2`. This step only recognises pieces; it doesn't care what order they're calculated in.
2. **A tree.** Arrange the pieces to show what's calculated from what (lesson 7.3, the parser).
3. **A value.** Work the tree out (lesson 7.2, the evaluator).

This lesson is step 1. The program that does it is called a **lexer** (or *tokenizer*), and each piece is a **token**.

## The tests first

Write down what the lexer should produce before writing it (sprint 6). The tests are supplied: click **Create provided src/lexer.test.ts** and read them:

```typescript file=src/lexer.test.ts provided
import { describe, expect, it } from "vitest";
import { FormulaError, tokenize } from "./lexer.ts";

describe("tokenize", () => {
  it("splits a formula into numbers, cells and operators", () => {
    expect(tokenize("A1+B1*2")).toEqual([
      { kind: "cell", address: { column: 0, row: 0 }, start: 0 },
      { kind: "operator", op: "+", start: 2 },
      { kind: "cell", address: { column: 1, row: 0 }, start: 3 },
      { kind: "operator", op: "*", start: 5 },
      { kind: "number", value: 2, start: 6 },
      { kind: "end", start: 7 },
    ]);
  });

  it("reads numbers with several digits and a decimal point", () => {
    expect(tokenize("12.5")).toEqual([
      { kind: "number", value: 12.5, start: 0 },
      { kind: "end", start: 4 },
    ]);
  });

  it("skips spaces and keeps brackets", () => {
    expect(tokenize(" ( 2 ) ").map((token) => token.kind)).toEqual(["open", "number", "close", "end"]);
  });

  it("rejects a character that isn't part of a formula", () => {
    expect(() => tokenize("A1 & B1")).toThrow(FormulaError);
    expect(() => tokenize("A1 & B1")).toThrow('Unexpected "&"');
  });

  it("rejects words that aren't cell addresses, and malformed numbers", () => {
    expect(() => tokenize("A0")).toThrow('"A0" is not a cell address');
    expect(() => tokenize("1.2.3")).toThrow('"1.2.3" is not a number');
  });
});
```

### What the tests decide

- **The text has no `=`.** In the sheet, `=` marks a cell as a formula; the lexer gets what comes after it. That's lesson 7.4's job.
- **Each token is an object with a `kind`**, plus whatever that kind needs: a number token has its `value`, a cell token its `address` (sprint 6's `Address`, already worked out), an operator token its `op`. The tree-builder in lesson 7.3 will ask "what kind of token is this?" over and over, so the answer is the first field.
- **Every token records `start`: its position in the text**, counted from 0. `A1+B1*2` has `+` at position 2. Nothing in the calculation needs that, but error messages do: "unexpected `)` at position 7" is far more helpful than "something's wrong".
- **A last `end` token** marks the end of the text. The tree-builder can then always look at "the next token" without checking whether there is one.
- **`.map((token) => token.kind)`** turns the list of tokens into a list of just their kinds, so the brackets test needn't spell out every position.
- **Bad formulas throw a `FormulaError`.** `toThrow(...)` checks that the function throws, and, given text, that the error's message contains it. `() => tokenize("A1 & B1")` wraps the call in a function, so `expect` can call it and catch what it throws; calling `tokenize` directly would throw before `expect` ever ran.

Run `npx vitest run lexer`:

```text
 FAIL  src/lexer.test.ts [ src/lexer.test.ts ]
Error: Cannot find module './lexer.ts' imported from C:/Users/you/Documents/spreadsheet/src/lexer.test.ts
```

Red, because there's no lexer yet.

```check
file src/lexer.test.ts
run "npx vitest run lexer" exit=1 stderr="lexer.ts" label="the lexer tests fail: lexer.ts doesn't exist yet (red)"
```

## The Token type {#token-type}

The lexer is built in small pieces, each checked before the next. First, what a token *is*. This step opens `src/lexer.ts`:

```typescript file=src/lexer.ts
import type { Address } from "./address.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "cell"; address: Address; start: number }
  | { kind: "operator"; op: "+" | "-" | "*" | "/"; start: number }
  | { kind: "open"; start: number }
  | { kind: "close"; start: number }
  | { kind: "end"; start: number };

```

A `Token` is **one of** these object shapes: a union type (lesson 5.2), where each member has a different `kind`. That one field makes TypeScript very helpful: in code that has checked `token.kind === "number"`, TypeScript knows the token has a `value`, and it reports an error if you use `token.value` without that check. This is called a **discriminated union**, and `kind` is the *discriminant*. You'll lean on it in every lesson of this sprint.

- **`op: "+" | "-" | "*" | "/"`** is the same idea at a smaller scale: `op` can only be one of those four strings.
- **`import type`** brings in only a type (lesson 6.4). `Address` is sprint 6's `{ column, row }`, so a cell token carries an address that's already worked out.

The project's own `npx tsc` can't pass yet, because the tests use functions that don't exist. So this check gives `tsc` just this one file (lesson 5.1's `--ignoreConfig`), plus `--allowImportingTsExtensions`, which `tsconfig.json` normally supplies so that imports can end in `.ts`.

```check
run "npx tsc --noEmit --strict --ignoreConfig --allowImportingTsExtensions src/lexer.ts" label="lexer.ts type-checks on its own"
contains src/lexer.ts "{ kind: \"end\"; start: number }" label="there's an end token kind"
```

## FormulaError: an error of our own {#formula-error}

When a formula is wrong, the lexer will stop with an error that says what's wrong and where. This step adds the error to `src/lexer.ts`:

```typescript file=src/lexer.ts
import type { Address } from "./address.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "cell"; address: Address; start: number }
  | { kind: "operator"; op: "+" | "-" | "*" | "/"; start: number }
  | { kind: "open"; start: number }
  | { kind: "close"; start: number }
  | { kind: "end"; start: number };

export class FormulaError extends Error {
  position: number;

  constructor(message: string, position: number) {
    super(message);
    this.position = position;
  }
}

```

**`extends Error`** makes `FormulaError` a special kind of JavaScript's built-in `Error`: it has everything an `Error` has (a `message`, a stack trace) plus a `position`. Python does the same with `class FormulaError(Exception):`.

- **`super(message)`** runs `Error`'s own constructor, which stores the message. A constructor in a class that `extends` must call `super(...)` before using `this`: the parent part of the object has to be built first. (Python: `super().__init__(message)`.)
- **`throw new FormulaError(...)`**, from the next step on, is Python's `raise`. It stops `tokenize` immediately, and the error travels up through whatever called it, until something **catches** it (lesson 7.4 does).

Why a class of our own instead of a plain `Error`? So the code that catches it can tell a mistake *in the formula* (show `#ERROR!` in the cell) from a bug *in the program* (which should not be hidden). Lesson 7.4 makes exactly that distinction.

```check
run "node -e \"import('./src/lexer.ts').then(({ FormulaError }) => { const e = new FormulaError('bad', 3); console.log(e instanceof Error, e.message, e.position); })\"" stdout="true bad 3" label="a FormulaError is an Error with a message and a position" -- Call super(message) first, then store the position in this.position.
```

## The loop, and spaces {#loop}

Now `tokenize` itself, starting with the loop and the easiest character: a space. Everything it doesn't know yet is an error, for now. This step adds to `src/lexer.ts`:

```typescript file=src/lexer.ts
import type { Address } from "./address.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "cell"; address: Address; start: number }
  | { kind: "operator"; op: "+" | "-" | "*" | "/"; start: number }
  | { kind: "open"; start: number }
  | { kind: "close"; start: number }
  | { kind: "end"; start: number };

export class FormulaError extends Error {
  position: number;

  constructor(message: string, position: number) {
    super(message);
    this.position = position;
  }
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text.charAt(i);
    const start = i;

    if (char === " ") {
      i++;
    } else {
      throw new FormulaError(`Unexpected "${char}"`, start);
    }
  }
  tokens.push({ kind: "end", start: text.length });
  return tokens;
}
```

`i` is the position of the next character not yet read. Each pass of the `while` loop looks at that character and decides what kind of token **starts** there. Then it moves `i` past the whole token. The loop ends when `i` reaches the end of the text, and the `end` token goes last, at position `text.length`.

The rule that makes this correct: **every branch moves `i` forward at least one place, or throws.** If any branch forgot to move `i`, the loop would look at the same character forever. That's the loop invariant (lesson 3.7) for this sprint; check it on every branch you add.

- **`text.charAt(i)`** is the character at position `i`, as a one-character string.
- **`` `Unexpected "${char}"` ``** is a **template literal**: text in backticks, where `${…}` puts a value into the text, like Python's f-string `f'Unexpected "{char}"'`. The message names the character, and `start` says where it is.

Before you run anything, predict:

```predict
question: The lexer only knows spaces so far. What does `tokenize("12")` do?
choice: Gives one number token, 12
choice: Gives two tokens, 1 and 2
choice: It throws: Unexpected "1"
answer: It throws: Unexpected "1"
explain: Every character that isn't a space reaches the last `else`, and the first such character is `1`, at position 0. Numbers are the next step.
verify: node -e "import('./src/lexer.ts').then(({ tokenize }) => { try { tokenize('12'); console.log('no error'); } catch (e) { console.log('It throws: ' + e.message); } })"
```

Try the invariant for yourself: delete the `i++` under the space, save, and run `node -e "import('./src/lexer.ts').then(({ tokenize }) => tokenize(' '))"`. It never finishes; stop it with Ctrl+C (lesson 0.4), and put the `i++` back. One forgotten line, and the program hangs instead of failing.

```check
run "node -e \"import('./src/lexer.ts').then(({ tokenize }) => console.log(JSON.stringify(tokenize('   '))))\"" stdout="[{\"kind\":\"end\",\"start\":3}]" label="three spaces give only the end token, at position 3" -- The space branch moves i on; the end token goes after the loop, at text.length.
run "node -e \"import('./src/lexer.ts').then(({ tokenize }) => { try { tokenize(' ?'); } catch (e) { console.log(e.constructor.name, e.message, e.position); } })\"" stdout="FormulaError Unexpected \"?\" 1" label="an unknown character throws a FormulaError at its position" -- The last else throws new FormulaError with the character and start.
```

## Numbers {#numbers}

A digit, or a `.`, starts a number. This step adds `isDigit` and a branch for numbers to `src/lexer.ts`:

```typescript file=src/lexer.ts
import type { Address } from "./address.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "cell"; address: Address; start: number }
  | { kind: "operator"; op: "+" | "-" | "*" | "/"; start: number }
  | { kind: "open"; start: number }
  | { kind: "close"; start: number }
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
    } else {
      throw new FormulaError(`Unexpected "${char}"`, start);
    }
  }
  tokens.push({ kind: "end", start: text.length });
  return tokens;
}
```

- **`char >= "0" && char <= "9"`** compares characters by their codes (lesson 3.2): the digits are numbered in order, so a character is a digit exactly when its code falls between the code of `"0"` and the code of `"9"`.
- **The inner `while`** keeps moving `i` while the characters are digits or dots, so `12.5` is read as one token, not four. Then `text.slice(start, i)` takes the characters from `start` up to (not including) `i` (Python's `text[start:i]`), and `Number(...)` converts them.
- **`Number("1.2.3")` is `NaN`**, JavaScript's "not a number" value, which is why the check after it exists. `NaN` can't be tested with `===`, because `NaN === NaN` is `false` in JavaScript; `Number.isNaN` is the way.

Why does the inner `while` stop at the end of the text, with no `i < text.length` check? Because **`text.charAt(i)` past the end gives `""`, the empty string**, and `""` isn't a digit, so the loop stops by itself. (`text[i]` would give `undefined` there, and with `noUncheckedIndexedAccess` from lesson 5.1, TypeScript would make you deal with it. `charAt` always gives a string.)

Try `Number` on its own in Node's prompt (`node`): `Number("12.5")`, `Number("1.2.3")`, `Number(".")`, `Number(".5")`. Which of them would the lexer turn into an error?

```check
run "npx vitest run lexer -t \"reads numbers\"" stdout="1 passed" label="the numbers test passes" -- The inner while reads digits and dots; the token's start is where the number began.
run "node -e \"import('./src/lexer.ts').then(({ tokenize }) => { try { tokenize('1.2.3'); console.log('no error'); } catch (e) { console.log(e.message); } })\"" stdout="\"1.2.3\" is not a number" label="1.2.3 is rejected" -- Check Number.isNaN(value) and throw a FormulaError naming the digits.
```

## Cells {#cells}

A letter starts a word, and in a formula the only words (until sprint 9's functions) are cell addresses. This step adds `isLetter`, a branch for cells, and `parseAddress` to the import:

```typescript file=src/lexer.ts
import { parseAddress, type Address } from "./address.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "cell"; address: Address; start: number }
  | { kind: "operator"; op: "+" | "-" | "*" | "/"; start: number }
  | { kind: "open"; start: number }
  | { kind: "close"; start: number }
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
    } else {
      throw new FormulaError(`Unexpected "${char}"`, start);
    }
  }
  tokens.push({ kind: "end", start: text.length });
  return tokens;
}
```

The word is read the same way as a number (letters and digits this time), and **`parseAddress` from sprint 6 does all the work**, including rejecting `A0`: one tested function, reused. When it gives `null`, the word isn't an address, and that's a mistake in the formula.

- **`isLetter`** uses the same character-code ranges as `isDigit`, twice: capitals and small letters, joined by `||`. So `b2` is read as well as `B2`, and `parseAddress` decides whether it's valid.
- **Why letters *and* digits?** An address is letters followed by digits. In `B12+1`, the inner loop reads `B`, `1`, `2`, then stops at `+`: the word is `B12`. Reading letters only would stop at `B`, and `B` alone isn't an address.
- **The import changes**: `parseAddress` is a function, used when the code runs, so it can't be a type-only import any more.

```check
run "npx vitest run lexer -t \"cell addresses\"" stdout="1 passed" label="the test for bad words and numbers passes" -- Read letters and digits, then parseAddress the word; null means it isn't an address.
run "node -e \"import('./src/lexer.ts').then(({ tokenize }) => console.log(JSON.stringify(tokenize('B12'))))\"" stdout="[{\"kind\":\"cell\",\"address\":{\"column\":1,\"row\":11},\"start\":0},{\"kind\":\"end\",\"start\":3}]" label="B12 is one cell token: column 1, row 11"
```

## Operators and brackets {#operators}

The last pieces are a single character each: one token, then `i++`. This step finishes `src/lexer.ts`:

```typescript file=src/lexer.ts
import { parseAddress, type Address } from "./address.ts";

export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "cell"; address: Address; start: number }
  | { kind: "operator"; op: "+" | "-" | "*" | "/"; start: number }
  | { kind: "open"; start: number }
  | { kind: "close"; start: number }
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
    } else if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ kind: "operator", op: char, start });
      i++;
    } else if (char === "(") {
      tokens.push({ kind: "open", start });
      i++;
    } else if (char === ")") {
      tokens.push({ kind: "close", start });
      i++;
    } else {
      throw new FormulaError(`Unexpected "${char}"`, start);
    }
  }
  tokens.push({ kind: "end", start: text.length });
  return tokens;
}
```

Look at `tokens.push({ kind: "operator", op: char, start })`: `char` is any string, yet TypeScript accepts it as an `op`, because that line can only run after `char === "+" || char === "-" || ...` was true. TypeScript followed the `if` and narrowed `char` to just those four values (lesson 5.2).

Every branch now moves `i` or throws. Read them once more with the invariant in mind.

```check
run "npx vitest run lexer" stdout="5 passed" label="the 5 lexer tests pass"
run "npx tsc" label="the project type-checks"
page index.html "(async () => { const { tokenize } = await import('/src/lexer.ts'); return tokenize('(B12 - 3.5)/A1').map((t) => t.kind + '@' + t.start).join(' '); })()" "open@0 cell@1 operator@5 number@7 close@10 operator@11 cell@12 end@14" server=vite label="tokenize('(B12 - 3.5)/A1') gives the right tokens at the right positions"
```

## Commit

```powershell
git add src/lexer.ts src/lexer.test.ts
git commit -m "Add the formula lexer"
```

```check
git-tracked src/lexer.ts
git-clean
```

## Your turn: a lexer for durations

A timesheet app lets people type how long a task took: `1h 30m`, or `2h 5m 10s`. Before anything can add those up, the text has to be cut into tokens: the same job as `tokenize`, smaller. Write `playground/js/duration.mjs`, exporting `tokenizeDuration(text)`:

- a run of digits is `{ kind: "number", value }`, with `value` a number;
- `h`, `m` or `s` is `{ kind: "unit", unit }`;
- spaces are skipped;
- anything else throws an `Error` whose message is `Unexpected "x" at position N`.

So `tokenizeDuration("1h 30m")` gives `[{ kind: "number", value: 1 }, { kind: "unit", unit: "h" }, { kind: "number", value: 30 }, { kind: "unit", unit: "m" }]`. Plain JavaScript this time: no types, no `start` in the tokens, no end token.

Test it in `playground/js/duration.check.mjs` (lesson 6.4's `node:test`), including a character that isn't allowed. Commit.

```hints
nudge: It's `tokenize` with fewer branches: a loop over the text, one branch per kind of character.
concept: The loop invariant still holds: every branch moves `i` forward or throws. A run of digits is read with an inner `while`, then `Number(text.slice(start, i))`. `"hms".includes(char)` asks whether a character is one of the units.
shape: `export function tokenizeDuration(text) { const tokens = []; let i = 0; while (i < text.length) { const char = text.charAt(i); if (char === " ") … else if (digit) … else if ("hms".includes(char)) … else throw … } return tokens; }`
answer: ~~~javascript
export function tokenizeDuration(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const char = text.charAt(i);
    const start = i;
    if (char === " ") {
      i++;
    } else if (char >= "0" && char <= "9") {
      while (text.charAt(i) >= "0" && text.charAt(i) <= "9") {
        i++;
      }
      tokens.push({ kind: "number", value: Number(text.slice(start, i)) });
    } else if ("hms".includes(char)) {
      tokens.push({ kind: "unit", unit: char });
      i++;
    } else {
      throw new Error(`Unexpected "${char}" at position ${start}`);
    }
  }
  return tokens;
}
~~~
```

```check
run "node --test playground/js/duration.check.mjs" label="your tests pass"
run "node -e \"import('./playground/js/duration.mjs').then(({ tokenizeDuration }) => console.log(JSON.stringify(tokenizeDuration('2h 5m 10s'))))\"" stdout="[{\"kind\":\"number\",\"value\":2},{\"kind\":\"unit\",\"unit\":\"h\"},{\"kind\":\"number\",\"value\":5},{\"kind\":\"unit\",\"unit\":\"m\"},{\"kind\":\"number\",\"value\":10},{\"kind\":\"unit\",\"unit\":\"s\"}]" label="2h 5m 10s gives six tokens" -- Numbers are { kind: 'number', value }, units { kind: 'unit', unit }.
run "node -e \"import('./playground/js/duration.mjs').then(({ tokenizeDuration }) => { try { tokenizeDuration('1h 3x'); console.log('no error'); } catch (e) { console.log(e.message); } })\"" stdout="Unexpected \"x\" at position 4" label="1h 3x is rejected at position 4" -- Throw new Error with the character and its position.
run "$d = Join-Path $env:TEMP ('m' + (Get-Random)); New-Item -ItemType Directory $d | Out-Null; Copy-Item playground/js/duration.check.mjs $d; Set-Content (Join-Path $d 'duration.mjs') 'export function tokenizeDuration(text) { const out = []; for (const m of text.matchAll(/([0-9]+)|([hms])/g)) out.push(m[1] ? { kind: `number`, value: Number(m[1]) } : { kind: `unit`, unit: m[2] }); return out; }'; node --test (Join-Path $d 'duration.check.mjs')" exit=1 label="your tests catch a lexer that skips characters it doesn't know" -- Test that a character such as x throws.
git-clean -- Commit it: git add playground, then git commit.
```
