---
title: 7.1 — Formulas, Part 1: Reading the Text into Tokens
runtime: none
experiments: The loop, and spaces; Numbers
teaches: lexers, tokens, discriminated unions, custom errors, error positions, template literals
uses: addresses, union types, narrowing, classes, inheritance, throw, while loops, loop invariants, character codes, type-only imports, ctrl+c, tests, test-driven development, branches, playground
---

### The story so far

Sprint 6 gave the spreadsheet a proper inside. Three pieces matter in this sprint:

- An **address** is a cell's position as two numbers, counted from 0: `{ column: 1, row: 1 }` is B2. `parseAddress("B2")` turns the text into that object, and gives `null` when the text isn't an address, like `"A0"` or `"hello"`.
- The **`Sheet`** remembers what was typed in each cell, as text. `sheet.get(address)` gives that text back, or `""` for an empty cell.
- The **grid** draws the sheet on the page, and everything lives in `src/`, with a test file next to each module.

Right now, a cell shows exactly what was typed. Type `=B2*C2` into D2 and D2 shows `=B2*C2`, the text, not a number.

### What this sprint builds

By the end of the sprint, typing `=B2*C2` into D2 shows `7`, and when B2 or C2 changes, D2 changes with it. To do that, the program has to understand a formula: what it says to calculate, and in what order. It does it in three stages, the way every programming language, calculator and spreadsheet does:

```text
 "A1+B1*2"  ──lexer──▶  A1  +  B1  *  2  end  ──parser──▶      +       ──evaluator──▶  a value
   text      (7.1)       a list of tokens      (7.3)        /   \        (7.2)
                                                          A1     *
                                                                / \
                                                              B1   2
```

You'll use the same three stages again later in the bootcamp, for the matrix language and the database's query language.

### What this lesson builds

The first stage: the **lexer**, a function `tokenize` that cuts formula text into **tokens**, the meaningful pieces. For the formula `(B12 - 3.5)/A1`, the lesson's last check expects exactly this:

| text | `(` | `B12` | `-` | `3.5` | `)` | `/` | `A1` | (the end) |
|---|---|---|---|---|---|---|---|---|
| token kind | open | cell | operator | number | close | operator | cell | end |
| what it carries | | column 1, row 11 | `-` | the number 3.5 | | `/` | column 0, row 0 | |
| `start` (position in the text) | 0 | 1 | 5 | 7 | 10 | 11 | 12 | 14 |

The spaces are gone, `B12` is one piece, not three, and `3.5` is the number 3.5, not three characters. The lesson builds it in `src/lexer.ts`, one kind of token at a time: the `Token` type, an error class, the loop, then numbers, cells, and operators and brackets.

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

That's why the work is divided into the three stages in the picture above, each simple on its own. The lexer only **recognises** pieces: it knows `B12` is a cell and `*` is an operator, and it doesn't care what order anything is calculated in. Order is the parser's job, two lessons from now. Splitting the job this way means each stage can be written and tested without the others.

(A lexer is also called a *tokenizer*. Both names are used in jobs, and in the documentation of every language tool.)

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

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| splits a formula into numbers, cells and operators | every field of every token, positions included | a `start` that records where a token *ends*, so later error messages point at the wrong place |
| reads numbers with several digits and a decimal point | numbers longer than one character | `12.5` read as four tokens, `1`, `2`, `.`, `5`, so the parser sees four numbers in a row |
| skips spaces and keeps brackets | spaces vanish; brackets don't | `( 2 )` failing on its first space, or a lexer that drops brackets, so `(1+2)*3` and `1+2*3` look the same |
| rejects a character that isn't part of a formula | unknown characters stop the lexer | `A1 & B1` silently read as `A1 B1`, a formula the user didn't write |
| rejects words that aren't cell addresses, and malformed numbers | bad words and bad numbers are errors, with a message that names them | `A0` accepted as a cell that doesn't exist, or `1.2.3` turned into `NaN` and calculated with |

The last two matter most for the user. A spreadsheet that guesses what a broken formula meant shows a wrong number with no warning; one that refuses shows `#ERROR!`, and the user fixes the formula.

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

A `Token` is **one of** these six object shapes: a union type (lesson 5.2). Each shape has a `kind`, a `start`, and whatever else that kind needs:

| kind | extra field | an example token | in the text |
|---|---|---|---|
| `number` | `value`, a number | `{ kind: "number", value: 3.5, start: 7 }` | `3.5` at position 7 |
| `cell` | `address`, an `Address` | `{ kind: "cell", address: { column: 1, row: 11 }, start: 1 }` | `B12` at position 1 |
| `operator` | `op`, one of four strings | `{ kind: "operator", op: "-", start: 5 }` | `-` at position 5 |
| `open`, `close` | none | `{ kind: "open", start: 0 }` | `(` at position 0 |
| `end` | none | `{ kind: "end", start: 14 }` | after the last character |

**How TypeScript uses `kind`.** Suppose some code has a `token: Token` and writes `token.value`. Only number tokens have a `value`, so TypeScript reports *Property 'value' does not exist on type '{ kind: "cell"; … }'*: the token might be a cell. Put the line inside `if (token.kind === "number") { … }` and the error goes: inside that `if`, TypeScript has crossed out the five shapes whose `kind` isn't `"number"`, and only the number shape is left. A union whose members are told apart by one shared field is called a **discriminated union**, and the field (`kind` here) is the *discriminant*. The parser in 7.3 checks `kind` on almost every line, and TypeScript checks each use.

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

**The constructor's inputs, and what `new FormulaError(...)` gives back:**

| | what it is | example |
|---|---|---|
| input `message` | what's wrong, in words a user can read | `'Unexpected "&"'` |
| input `position` | where in the formula, counted from 0 | `3`, for the `&` in `A1 & B1` |
| returns (with `new`) | an error object: an `Error`, plus a `position` | `e.message` is `'Unexpected "&"'`, `e.position` is `3` |

- **`super(message)`** runs `Error`'s own constructor, which stores the message in `this.message` and records the stack trace. A constructor in a class that `extends` must call `super(...)` before using `this`: the parent part of the object has to be built first. (Python: `super().__init__(message)`.)
- **`this.position = position`** stores the second input on the new object, the part `Error` doesn't know about.

**What `throw` does.** From the next step on, `tokenize` will write `throw new FormulaError(...)`, Python's `raise`. Say lesson 7.4's code calls `tokenize("A1 & B1")`. When the loop reaches the `&`, the `throw` line runs, and `tokenize` stops right there: no more characters are read, nothing is returned, and the half-built list of tokens is thrown away. The error goes back to whatever called `tokenize`, and if that code doesn't catch it, to whatever called *that*, up the chain of calls, until something has a `catch` for it. If nothing does, the program stops and prints the error. Lesson 7.4 catches it.

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

**`tokenize`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `text` | the formula, without its `=` | `"(B12 - 3.5)/A1"` |
| returns | the list of tokens, always ending with an `end` token | the eight tokens in the table at the top of the lesson |
| or throws | a `FormulaError`, when the text has something a formula can't contain | `Unexpected "?"`, position 1, for `" ?"` |

**How the loop reads the text.** `i` is the position of the next character not yet read. Each pass of the `while` loop looks at that character and decides what kind of token **starts** there. Then it moves `i` past the whole token. The loop ends when `i` reaches the end of the text, and the `end` token goes last, at position `text.length`.

Here it is on `" ?"`, two characters long, so `text.length` is 2:

| pass | `i` | `char` | branch | what happens |
|---|---|---|---|---|
| 1 | 0 | `" "` | the space | `i++`: `i` is now 1, no token |
| 2 | 1 | `"?"` | the last `else` | throw `Unexpected "?"`, position 1 |

And on `"   "`, three spaces: three passes of the space branch take `i` from 0 to 3, the `while` test `3 < 3` is false, the loop ends, and the list is just `[{ kind: "end", start: 3 }]`. The first check below runs exactly those two cases.

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

**`isDigit`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `char` | one character, as a string (or `""` past the end of the text) | `"5"` |
| returns | `true` when it's one of `0` to `9`, otherwise `false` | `true`; for `"."`, `false` |

**How `char >= "0" && char <= "9"` works.** Comparing two strings with `>=` compares their character codes (lesson 3.2). The digits have the codes 48 (`"0"`) to 57 (`"9"`), in order, with nothing else in between. So for `"5"`, code 53: is 53 ≥ 48, and is 53 ≤ 57? Both yes: a digit. For `"."`, code 46, the first test fails. For `""`, the empty string, the first test fails too, because an empty string sorts before every other string.

**How a number is read.** Here's the inner `while` on `12.5*`, starting with `start` and `i` both 0:

| `i` | `text.charAt(i)` | digit or `.`? | so |
|---|---|---|---|
| 0 | `"1"` | yes | `i++` |
| 1 | `"2"` | yes | `i++` |
| 2 | `"."` | yes | `i++` |
| 3 | `"5"` | yes | `i++` |
| 4 | `"*"` | no | the loop stops, with `i` at 4 |

Then **`text.slice(start, i)`**, `slice(0, 4)`, takes the characters from position 0 up to, not including, position 4: `"12.5"` (Python's `text[0:4]`). **`Number("12.5")`** turns that text into the number 12.5, and the token is `{ kind: "number", value: 12.5, start: 0 }`. The outer loop carries on from `i` = 4, the `*`, which is exactly the first character not yet read.

**Why the check for `NaN`.** The inner loop accepts any run of digits and dots, so it also reads `1.2.3` as one piece. `Number("1.2.3")` can't make a number from that, and gives **`NaN`**, JavaScript's "not a number" value, instead of an error. A `NaN` that got into the calculation would quietly turn every result it touched into `NaN`, so the lexer stops there with a `FormulaError`. It tests with `Number.isNaN(value)`, because `value === NaN` is always `false`: by the rules of floating point (lesson 0.3), `NaN` isn't equal to anything, not even itself.

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

**`isLetter`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `char` | one character, as a string (or `""` past the end) | `"b"` |
| returns | `true` for `A` to `Z` (codes 65 to 90) or `a` to `z` (97 to 122), otherwise `false` | `true`; for `"1"`, `false` |

It's `isDigit`'s range test twice, joined by `||`, because capitals and small letters are two separate runs of codes. So `b2` is read as a word as well as `B2`, and `parseAddress` (which upper-cases the text first, lesson 6.3) accepts both.

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

**The whole lexer, traced.** Here is `tokenize("(B12 - 3.5)/A1")`, the formula from the top of the lesson. Each row is one pass of the outer loop:

| `i` at the start | `char` | branch | token pushed | `i` after |
|---|---|---|---|---|
| 0 | `(` | open | `open`, start 0 | 1 |
| 1 | `B` | letter: reads `B12` | `cell` B12, start 1 | 4 |
| 4 | (a space) | space | none | 5 |
| 5 | `-` | operator | `operator -`, start 5 | 6 |
| 6 | (a space) | space | none | 7 |
| 7 | `3` | digit: reads `3.5` | `number` 3.5, start 7 | 10 |
| 10 | `)` | close | `close`, start 10 | 11 |
| 11 | `/` | operator | `operator /`, start 11 | 12 |
| 12 | `A` | letter: reads `A1` | `cell` A1, start 12 | 14 |

Now `i` is 14, the length of the text, so the loop ends and `end` is pushed at 14: the table at the top of the lesson, token for token. Notice the last column. Every pass ends with `i` bigger than it started: the invariant, holding on every branch. The last check below runs this exact formula in the browser.

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
