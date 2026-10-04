---
title: 7.1 — Formulas, Part 1: Reading the Text into Tokens
runtime: none
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

Write down what the lexer should produce before writing it (sprint 6). This step opens a new file, `src/lexer.test.ts`:

```typescript file=src/lexer.test.ts
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

## The lexer

This step opens `src/lexer.ts`:

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

### How the loop works, and why it's correct

`i` is the position of the next character not yet read. Each pass of the `while` loop looks at that character and decides what kind of token **starts** there. Then it moves `i` past the whole token. The loop ends when `i` reaches the end of the text.

The rule that makes this correct: **every branch moves `i` forward at least one place, or throws.** If any branch forgot to move `i`, the loop would look at the same character forever. Read each branch with that question in mind:

- **A space** is skipped: `i++`, no token.
- **A digit (or a `.`)** starts a number. The inner `while` keeps moving `i` while the characters are digits or dots, so `12.5` is read as one token, not four. Then `text.slice(start, i)` takes the characters from `start` up to (not including) `i` (Python's `text[start:i]`) and `Number(...)` converts them. `Number("1.2.3")` is `NaN`, JavaScript's "not a number" value, which is why the check after it exists. (`NaN` can't be tested with `===`, because `NaN === NaN` is `false` in JavaScript; `Number.isNaN` is the way.)
- **A letter** starts a word, read the same way (letters and digits), and the word must be a cell address. `parseAddress` from sprint 6 does all the work, including rejecting `A0`: one tested function, reused.
- **An operator or a bracket** is a single character: one token, `i++`.
- **Anything else** is a mistake in the formula: throw.

Why does the inner `while` stop at the end of the text, with no `i < text.length` check? Because **`text.charAt(i)` past the end gives `""`, the empty string**, and `""` isn't a digit or a letter, so the loop stops by itself. (`text[i]` would give `undefined` there, and with `noUncheckedIndexedAccess` from lesson 5.1, TypeScript would make you deal with it. `charAt` always gives a string.)

`char >= "0" && char <= "9"` compares characters by their codes (lesson 3.2): the digits are numbered in order, so a character is a digit exactly when its code falls between the code of `"0"` and the code of `"9"`. The same works for letters.

### The Token type: a union, distinguished by kind

```typescript
export type Token =
  | { kind: "number"; value: number; start: number }
  | { kind: "cell"; address: Address; start: number }
  ...
```

A `Token` is **one of** these object shapes: a union type (lesson 5.2), where each member has a different `kind`. That one field makes TypeScript very helpful: in code that has checked `token.kind === "number"`, TypeScript knows the token has a `value`, and it reports an error if you use `token.value` without that check. This is called a **discriminated union**, and `kind` is the *discriminant*. You'll lean on it in every lesson of this sprint.

The operator line shows the same idea at a smaller scale: `op: "+" | "-" | "*" | "/"` means `op` can only be one of those four strings. And look at `tokens.push({ kind: "operator", op: char, start })`: `char` is any string, yet TypeScript accepts it as an `op`, because that line can only run after `char === "+" || char === "-" || ...` was true. TypeScript followed the `if` and narrowed `char` to just those four values.

### FormulaError: an error of our own

```typescript
export class FormulaError extends Error {
```

**`extends Error`** makes `FormulaError` a special kind of JavaScript's built-in `Error`: it has everything an `Error` has (a `message`, a stack trace) plus a `position`. Python does the same with `class FormulaError(Exception):`.

- **`super(message)`** runs `Error`'s own constructor, which stores the message. A constructor in a class that `extends` must call `super(...)` before using `this`: the parent part of the object has to be built first. (Python: `super().__init__(message)`.)
- **`throw new FormulaError(...)`** is Python's `raise`. It stops `tokenize` immediately, and the error travels up through whatever called it, until something **catches** it (lesson 7.4 does).

Why a class of our own instead of a plain `Error`? So the code that catches it can tell a mistake *in the formula* (show `#ERROR!` in the cell) from a bug *in the program* (which should not be hidden). Lesson 7.4 makes exactly that distinction.

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
