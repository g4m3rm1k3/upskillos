---
title: 7.3 — Formulas, Part 3: The Parser Builds the Tree
runtime: none
experiments: Cells, and the end of the formula; Terms: * and /
justified: Parsing one number
teaches: parsers, grammars, recursive descent, operator precedence, associativity, try catch, instanceof
uses: lexers, tokens, trees, recursion, base cases, closures, discriminated unions, custom errors, error positions, tests, vitest, playground
---

### The story so far

Two of the three stages are built. Lesson 7.1's **lexer** turns text into a flat list of tokens, and lesson 7.2's **evaluator** works out a tree. The tree in 7.2's tests was typed out by hand, as objects. The piece in the middle is missing:

```text
 text  ──lexer (7.1)──▶  tokens  ──parser (this lesson)──▶  a tree  ──evaluator (7.2)──▶  a value
```

### What this lesson builds

The **parser**: a function `parse` that takes formula text and gives back the tree. Its whole job is to get the structure right. Here's what it does with `2+3*4`:

```text
 tokens:  2   +   3   *   4   end

 tree:        +                 evaluate gives 2 + 12 = 14
            /   \
           2     *              3 × 4 = 12, worked out first because it's lower
                / \
               3   4
```

The tokens don't say that `*` goes first; the parser has to know. The lesson's last checks run five formulas through `parse` and `evaluate`, and expect exactly these answers:

| formula | the parser must see | answer |
|---|---|---|
| `1+2*3-4` | `*` before `+` and `-` | 3 |
| `(1+2)*(3-4)` | brackets first | -3 |
| `100/10/5` | left to right: `(100/10)/5` | 2 |
| `2*(3+(4*5))` | brackets inside brackets | 46 |
| `7-2-1-1` | left to right again | 3 |

It's the most interesting code in the sprint: about forty lines handle formulas of any length and nesting, and they're correct for a reason you can see.

## The rules, written down first

Before any code, write the rules of what a formula can look like. This kind of description is called a **grammar**:

```text
expression = term   { ("+" | "-") term }
term       = factor { ("*" | "/") factor }
factor     = number | cell | "(" expression ")"
```

Read `{ … }` as "zero or more times". So:

- An **expression** is a term, followed by any number of `+ term` or `- term`. (`2`, `2+3`, `2+3-4`.)
- A **term** is a factor, followed by any number of `* factor` or `/ factor`. (`3`, `3*4`, `3*4/2`.)
- A **factor** is a single number, a single cell, or a whole expression in brackets.

### Why this grammar gets the order right

Here are the rules reading `2+3*4`, from the top rule down. Each indented line is a rule that the line above it asked for:

```text
expression                          reads a term, then any "+ term" or "- term"
  term                              reads a factor, then any "* factor" or "/ factor"
    factor  →  2                    a number
    (next is +, not * or /: this term is just 2)
  + found: read another term
  term
    factor  →  3
    * found: read another factor
    factor  →  4
    (next is end: this term is 3*4)
  (next is end: the expression is 2 + (3*4))
```

The rules are layered: an expression is made of terms, and a term is made of factors. `+` and `-` only ever join **terms**, and a whole run of `*` and `/` is **inside** one term. So in `2+3*4`, the `3*4` has to be a single term before `+` ever sees it: the `+` joins `2` and `(3*4)`. The `*` ends up lower in the tree, so it's worked out first. Nothing in the rules says "multiplication first"; it falls out of which rule is inside which.

That's the general recipe: **operators that should happen first live in a deeper rule.** A deeper rule binds more tightly. In sprint 9 you'll add comparison operators (`>`, `=`), which happen *last*, by adding a rule *above* `expression`. Any new level of operator slots in the same way.

Brackets work because `factor` (the deepest rule) can be `( expression )`: the top rule all over again. Whatever is inside brackets is parsed completely, as one factor, before the operators around it are considered. And because `factor` refers back to `expression`, the grammar is recursive, like the `Expression` type in 7.2. Brackets can nest as deep as you like.

## The tests

The tests are supplied: click **Create provided src/parser.test.ts** and read them:

```typescript file=src/parser.test.ts provided
import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate.ts";
import { FormulaError } from "./lexer.ts";
import { parse } from "./parser.ts";

// Parse and evaluate a formula with no cells in it.
function calc(text: string) {
  return evaluate(parse(text), () => "");
}

// The FormulaError a piece of code throws, so a test can look at its position.
function thrownBy(run: () => unknown): FormulaError {
  try {
    run();
  } catch (error) {
    if (error instanceof FormulaError) {
      return error;
    }
    throw error;
  }
  throw new Error("Nothing was thrown");
}

describe("parse", () => {
  it("builds the tree for a single number", () => {
    expect(parse("42")).toEqual({ kind: "number", value: 42 });
  });

  it("puts * and / below + and -, so they happen first", () => {
    expect(parse("A1+B1*2")).toEqual({
      kind: "binary",
      op: "+",
      left: { kind: "cell", address: { column: 0, row: 0 } },
      right: {
        kind: "binary",
        op: "*",
        left: { kind: "cell", address: { column: 1, row: 0 } },
        right: { kind: "number", value: 2 },
      },
    });
    expect(calc("2+3*4")).toBe(14);
    expect(calc("2*3+4")).toBe(10);
  });

  it("works left to right for operators of the same level", () => {
    expect(calc("10-2-3")).toBe(5);
    expect(calc("8/2/2")).toBe(2);
  });

  it("lets brackets change the order", () => {
    expect(calc("(2+3)*4")).toBe(20);
    expect(calc("2*(3+4)")).toBe(14);
  });

  it("explains what's wrong, and where", () => {
    expect(thrownBy(() => parse("2+")).message).toBe("The formula ends too early");
    expect(thrownBy(() => parse("(2+3")).position).toBe(4);
    expect(thrownBy(() => parse("2 3")).position).toBe(2);
    expect(thrownBy(() => parse("*2")).position).toBe(0);
  });
});
```

- **The tree test** checks the exact shape for `A1+B1*2`: the picture at the start of lesson 7.2, written as objects.
- **`calc`** parses and then evaluates, so the other tests can say what they mean in numbers: `2+3*4` is 14, not 20.
- **`10-2-3` is 5**: worked out as `(10-2)-3`. If the parser grouped it as `10-(2-3)`, the answer would be 11. Subtraction and division give different answers depending on grouping, so these tests pin the direction down.
- **`thrownBy`** runs a function and returns the `FormulaError` it throws, so a test can check the error's `position`. `try { … } catch (error) { … }` is Python's `try: … except …:`. Inside `catch`, `error` could be anything (JavaScript lets you throw any value), so **`error instanceof FormulaError`** checks it really is one; after that check, TypeScript knows it has a `position`. Anything else is re-thrown, so a real bug isn't mistaken for a formula error.
- **The positions** are where the problem is: `(2+3` is missing its `)` at position 4, the end; `2 3` has an unexpected `3` at position 2.

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| builds the tree for a single number | the smallest formula | a parser that only works when there's an operator, so `=42` breaks |
| puts * and / below + and -, so they happen first | precedence, checked twice: by the tree's shape and by the answer | `2+3*4` giving 20, the classic calculator bug |
| works left to right for operators of the same level | grouping direction | `10-2-3` giving 11: a bug no precedence test notices, because only `-` and `/` care about direction |
| lets brackets change the order | brackets, on either side of an operator | `(2+3)*4` giving 14, brackets read and then ignored |
| explains what's wrong, and where | four different broken formulas, each with the right message or position | a parser that accepts `2 3` as `2`, or reports every error at position 0, so the user can't find the mistake |

```check
file src/parser.test.ts
run "npx vitest run parser" exit=1 stderr="parser.ts" label="the parser tests fail: parser.ts doesn't exist yet (red)"
```

## Parsing one number {#one-number}

Each grammar rule will become one function, with the same name. This way of writing a parser is called **recursive descent**: the functions call each other going down the rules, and back up to `expression` for brackets. It starts at the bottom, with the smallest formula there is: one number.

This step is bigger than usual, because a parser needs all four of these pieces before it can parse anything at all. Each is explained below the code. It opens `src/parser.ts`:

```typescript file=src/parser.ts
import type { Expression } from "./expression.ts";
import { FormulaError, tokenize, type Token } from "./lexer.ts";

export function parse(text: string): Expression {
  const tokens = tokenize(text);
  let index = 0;

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

  function factor(): Expression {
    const token = advance();
    if (token.kind === "number") {
      return { kind: "number", value: token.value };
    }
    throw new FormulaError("Expected a number, a cell or (", token.start);
  }

  return factor();
}
```

**The four functions, their inputs, and what they give back:**

| function | input | returns | example, parsing `"42"` |
|---|---|---|---|
| `parse` | `text`, the formula without its `=` | the tree for the whole formula, or throws a `FormulaError` | returns `{ kind: "number", value: 42 }` |
| `peek` | none: it reads `tokens` and `index` | the next token, **without** using it up | the number token, `42` |
| `advance` | none | the next token, and moves `index` on past it | the number token; `index` goes from 0 to 1 |
| `factor` | none | the tree for one factor: here, a number leaf | `{ kind: "number", value: 42 }` |

**How `index` moves.** `index` is the position of the next token to use, in the list `tokenize` made. For `"42"` the list is two tokens, `[number 42, end]`:

| step | `index` before | call | gets | `index` after |
|---|---|---|---|---|
| `parse` calls `factor` | 0 | `advance()` | the number token | 1 |
| `factor` returns the number leaf | | | | 1 |

**`peek()`** looks at a token without using it up, and **`advance()`** uses it up and returns it. The parser decides what to do by peeking, and only advances once it has decided a token belongs where it is. (`advance` calls `peek` to get the token, so its "ran out of tokens" check happens in one place. It can't really happen, because every list ends with `end` and nothing advances past `end` without throwing, but `tokens[index]` could be `undefined` as far as TypeScript knows, so `peek` handles it.)

`peek`, `advance`, `expression`, `term` and `factor` are written **inside** `parse`, so they all share `tokens` and `index`: closures again (lesson 3.4). Each call of `parse` gets its own `index`, so two formulas being parsed can't disturb each other.

### factor: the bottom rule

`factor` uses up one token and decides what it is. A number becomes a leaf of the tree directly: a **base case**, as in 7.2's evaluator. Anything else is an error, for now, with the position of the token it was looking at.

```check
run "npx vitest run parser -t \"single number\"" stdout="1 passed" label="42 parses to a number node"
run "node -e \"import('./src/parser.ts').then(({ parse }) => { const at = (t) => { try { parse(t); return 'ok'; } catch (e) { return e.message + '@' + e.position; } }; console.log(at('+')); })\"" stdout="Expected a number, a cell or (@0" label="a + where a number should be is an error at position 0" -- factor throws a FormulaError with the token's start.
```

## Cells, and the end of the formula {#cells}

A cell is a leaf too. And two ways a formula can go wrong get their own messages: running out of formula, and text left over after it. This step adds them:

```typescript file=src/parser.ts
import type { Expression } from "./expression.ts";
import { FormulaError, tokenize, type Token } from "./lexer.ts";

export function parse(text: string): Expression {
  const tokens = tokenize(text);
  let index = 0;

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

  function factor(): Expression {
    const token = advance();
    if (token.kind === "number") {
      return { kind: "number", value: token.value };
    }
    if (token.kind === "cell") {
      return { kind: "cell", address: token.address };
    }
    if (token.kind === "end") {
      throw new FormulaError("The formula ends too early", token.start);
    }
    throw new FormulaError("Expected a number, a cell or (", token.start);
  }

  const result = factor();
  const extra = peek();
  if (extra.kind !== "end") {
    throw new FormulaError("Unexpected text after the end of the formula", extra.start);
  }
  return result;
}
```

- **`token.kind === "end"`** where a factor should be means the formula stopped too early, as in `2+` (once `+` exists).
- **`const result = factor();`** reads the formula, and then `peek()` looks at what's left.

### The last check

After `factor()` returns (`expression()`, by the end of the lesson), the parser has read one complete formula. If anything is left over except `end`, like the `3` in `2 3`, the formula is broken, even though its beginning made sense. Without this check, `2 3` would quietly be treated as `2`.

Try it: comment out the `if (extra.kind !== "end")` check, and run `node -e "import('./src/parser.ts').then(({ parse }) => console.log(parse('2 3')))"`. You get a tree for `2`, and the `3` is silently lost. Put the check back.

```check
run "node -e \"import('./src/parser.ts').then(({ parse }) => { const at = (t) => { try { parse(t); return 'ok'; } catch (e) { return e.message + '@' + e.position; } }; console.log(JSON.stringify(parse('B2'))); })\"" stdout="{\"kind\":\"cell\",\"address\":{\"column\":1,\"row\":1}}" label="B2 parses to a cell node" -- A cell token becomes { kind: 'cell', address }.
run "node -e \"import('./src/parser.ts').then(({ parse }) => { const at = (t) => { try { parse(t); return 'ok'; } catch (e) { return e.message + '@' + e.position; } }; console.log([at('2 3'), at('')].join(' | ')); })\"" stdout="Unexpected text after the end of the formula@2 | The formula ends too early@0" label="leftover text and an empty formula are both errors, at the right positions" -- Peek after the formula: anything but end is an error at its start; end where a factor should be is 'The formula ends too early'.
```

## Terms: * and / {#term}

The second rule: `term = factor { ("*" | "/") factor }`, a factor followed by any number of `* factor` or `/ factor`. This step adds `term`, and `parse` now reads a term:

```typescript file=src/parser.ts
import type { Expression } from "./expression.ts";
import { FormulaError, tokenize, type Token } from "./lexer.ts";

export function parse(text: string): Expression {
  const tokens = tokenize(text);
  let index = 0;

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

  function term(): Expression {
    let left = factor();
    let token = peek();
    while (token.kind === "operator" && (token.op === "*" || token.op === "/")) {
      advance();
      left = { kind: "binary", op: token.op, left, right: factor() };
      token = peek();
    }
    return left;
  }

  function factor(): Expression {
    const token = advance();
    if (token.kind === "number") {
      return { kind: "number", value: token.value };
    }
    if (token.kind === "cell") {
      return { kind: "cell", address: token.address };
    }
    if (token.kind === "end") {
      throw new FormulaError("The formula ends too early", token.start);
    }
    throw new FormulaError("Expected a number, a cell or (", token.start);
  }

  const result = term();
  const extra = peek();
  if (extra.kind !== "end") {
    throw new FormulaError("Unexpected text after the end of the formula", extra.start);
  }
  return result;
}
```

Before you run it, predict:

```predict
question: What does `8/2/2` work out to with this parser?
choice: 2
choice: 8
answer: 2
explain: The loop builds `(8/2)/2`: each new node goes around the tree built so far. `8/(2/2)` would be 8.
verify: node -e "Promise.all([import('./src/parser.ts'), import('./src/evaluate.ts')]).then(([{ parse }, { evaluate }]) => { const calc = (t) => evaluate(parse(t), () => ''); console.log(calc('8/2/2')); })"
```

**`term`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input | none: it reads tokens from `index` on | the tokens of `8/2/2` |
| returns | the tree for one term: a factor, or several joined by `*` and `/` | `(8/2)/2` as a tree |

### Why the while loop works left to right

Follow `term` on `8/2/2`:

1. `left = factor()` → `8`.
2. The next token is `/`: use it up, and `left` becomes `8 / factor()` → `8/2`.
3. The next token is another `/`: `left` becomes **`(8/2) / factor()`** → `(8/2)/2`.
4. The next token is `end`, not `*` or `/`: stop, return `left`.

Each time round, the tree built so far becomes the **left** side of the new node. So the earlier operator ends up deeper in the tree, and is worked out first. That's left-to-right grouping, and it comes from building the new node *around* `left` instead of recursing on the right.

Try the other way: in `term`, change `right: factor()` to `right: term()`, and run the same `node -e` as the prediction's check. Now `8/2/2` gives 8, because the rest of the formula is parsed first and becomes the right side. Put `factor()` back.

```check
run "node -e \"Promise.all([import('./src/parser.ts'), import('./src/evaluate.ts')]).then(([{ parse }, { evaluate }]) => { const calc = (t) => evaluate(parse(t), () => ''); console.log([calc('2*3*4'), calc('8/2/2'), calc('A1*3')].join(',')); })\"" stdout="24,2,0" label="* and / work left to right" -- In the loop: advance past the operator, then left = a binary node with left and factor() as its sides.
```

## Expressions: + and - {#expression}

The top rule, `expression = term { ("+" | "-") term }`, has the same shape as `term`, one level up. This step adds it, and `parse` now starts from the top:

```typescript file=src/parser.ts
import type { Expression } from "./expression.ts";
import { FormulaError, tokenize, type Token } from "./lexer.ts";

export function parse(text: string): Expression {
  const tokens = tokenize(text);
  let index = 0;

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
    let left = factor();
    let token = peek();
    while (token.kind === "operator" && (token.op === "*" || token.op === "/")) {
      advance();
      left = { kind: "binary", op: token.op, left, right: factor() };
      token = peek();
    }
    return left;
  }

  function factor(): Expression {
    const token = advance();
    if (token.kind === "number") {
      return { kind: "number", value: token.value };
    }
    if (token.kind === "cell") {
      return { kind: "cell", address: token.address };
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

**`expression`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input | none: it reads tokens from `index` on | the tokens of `2+3*4` |
| returns | the tree for a whole expression: one term, or several joined by `+` and `-` | `2 + (3*4)` as a tree |

Here it is on `2+3*4`, the tokens numbered from 0, with `index` at each call:

| call | `index` | what it does | gives |
|---|---|---|---|
| `expression` | 0 | calls `term` for its left side | |
| `term` → `factor` | 0 → 1 | uses up `2` | the leaf 2 |
| `term` | 1 | peeks: `+` isn't `*` or `/`, so it stops | the leaf 2 |
| `expression` | 1 → 2 | `+` is its operator: uses it up, calls `term` for the right side | |
| `term` → `factor` | 2 → 3 | uses up `3` | the leaf 3 |
| `term` | 3 → 4 | `*`: uses it up, calls `factor` | |
| `factor` | 4 → 5 | uses up `4` | the leaf 4 |
| `term` | 5 | peeks: `end`, stops | the node `3*4` |
| `expression` | 5 | peeks: `end`, stops | the node `2 + (3*4)` |

The `*` was handled entirely inside the second call to `term`, before `expression` saw anything after the `+`. That's precedence, done by which function is called from which.

Read `expression` and `term` side by side: the only differences are the operators and the rule they call. That's the grammar's layering (above, *Why this grammar gets the order right*) turned into code. `+` only ever joins whole terms, so `2+3*4` reads `3*4` as one term before the `+` sees it.

```check
run "npx vitest run parser" exit=1 stdout="3 passed" label="three of the five parser tests pass: precedence and left-to-right grouping" -- expression has the same loop as term, with + and -, calling term().
run "node -e \"Promise.all([import('./src/parser.ts'), import('./src/evaluate.ts')]).then(([{ parse }, { evaluate }]) => { const calc = (t) => evaluate(parse(t), () => ''); console.log([calc('2+3*4'), calc('2*3+4'), calc('10-2-3')].join(',')); })\"" stdout="14,10,5" label="2+3*4 is 14, 2*3+4 is 10, and 10-2-3 is 5"
```

## Brackets {#brackets}

Last, the third choice for a factor: `"(" expression ")"`. This step adds it, and puts the grammar at the top of the file, now that the code follows it line for line:

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
    let left = factor();
    let token = peek();
    while (token.kind === "operator" && (token.op === "*" || token.op === "/")) {
      advance();
      left = { kind: "binary", op: token.op, left, right: factor() };
      token = peek();
    }
    return left;
  }

  function factor(): Expression {
    const token = advance();
    if (token.kind === "number") {
      return { kind: "number", value: token.value };
    }
    if (token.kind === "cell") {
      return { kind: "cell", address: token.address };
    }
    if (token.kind === "open") {
      const inside = expression();
      const close = advance();
      if (close.kind !== "close") {
        throw new FormulaError('Expected ")"', close.start);
      }
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

An `(` means "a whole expression is coming": `factor` calls `expression()` to read it, then insists the next token is `)`. That call back up to the top rule is the recursion that allows brackets inside brackets. It always ends, because each `(` uses up a token, and there are only so many tokens.

Here's `(2+3)*4`, as a stack of calls. Each line is called by the one above it:

```text
expression                        the whole formula
  term                            reads a factor, then any * or /
    factor                        sees "(": a whole expression is coming
      expression                  the top rule again, for what's inside the brackets
        term → factor → 2
        + found
        term → factor → 3
        (next is ")", not + or -: this expression is 2+3)
    factor                        uses up ")": the bracket is closed; returns the 2+3 tree
  term                            * found: reads another factor
    factor → 4
  (this term is (2+3)*4)
```

The `+` was inside a `factor`, which is deeper than `term`, so it's worked out before the `*`: `(2+3)*4` is 20. The grammar didn't need a special rule for brackets; it reuses `expression`.

Anything else where a factor should be is an error: `)` with nothing before it, a second operator (`2+*3`), or running out (`2+` reaches `end`).

```check
run "npx vitest run parser" stdout="5 passed" label="the 5 parser tests pass"
run "npx tsc" label="the project type-checks"
page index.html "(async () => { const { parse } = await import('/src/parser.ts'); const { evaluate } = await import('/src/evaluate.ts'); return ['1+2*3-4', '(1+2)*(3-4)', '100/10/5', '2*(3+(4*5))', '7-2-1-1'].map((t) => evaluate(parse(t), () => '')).join(','); })()" "3,-3,2,46,3" server=vite label="the parser gets precedence, brackets, nesting and left-to-right grouping right"
page index.html "(async () => { const { parse } = await import('/src/parser.ts'); return ['(1+2', '1+', '1 2', ')', '((1)', '1+()'].map((t) => { try { parse(t); return 'ok'; } catch (e) { return e.position; } }).join(','); })()" "4,2,2,0,4,3" server=vite label="the parser rejects broken formulas with the right positions"
```

## Commit

```powershell
git add src/parser.ts src/parser.test.ts
git commit -m "Add the formula parser"
```

```check
git-tracked src/parser.ts
git-clean
```

## Your turn: a parser for nested lists

A settings file lets people write lists of numbers, with lists inside lists: `[1, [2, 3], [], [[4]]]`. Here's the grammar:

```text
list = "[" [ item { "," item } ] "]"
item = number | list
```

`[ … ]` in the grammar means "optional": a list can be empty. Write `playground/js/list.mjs`, exporting `parseList(text)`, which gives JavaScript arrays: `parseList("[1, [2, 3], []]")` is `[1, [2, 3], []]`. Numbers are whole numbers; spaces can go anywhere between the pieces. Anything else, including a list that's never closed and text after the last `]`, throws an `Error` that says where.

Work straight on the characters this time, with no separate lexer: an index `i`, and a `skipSpaces()` helper. Test it in `playground/js/list.check.mjs`, including broken lists. Commit.

```hints
nudge: One function per grammar rule, as in `parse`: `list()` and `item()`, sharing an index `i`.
concept: `item` looks at the next character: a `[` means a list is coming, so it calls `list()` (the recursion); digits mean a number. `list` uses up the `[`, reads items separated by `,`, then insists on a `]`. After the top list, anything left over is an error, like the parser's last check.
shape: `export function parseList(text) { let i = 0; function skipSpaces() { … } function item() { … } function list() { … } skipSpaces(); … const result = list(); skipSpaces(); if (i < text.length) throw …; return result; }`
answer: ~~~javascript
export function parseList(text) {
  let i = 0;

  function skipSpaces() {
    while (text.charAt(i) === " ") {
      i++;
    }
  }

  function item() {
    skipSpaces();
    if (text.charAt(i) === "[") {
      return list();
    }
    const start = i;
    while (text.charAt(i) >= "0" && text.charAt(i) <= "9") {
      i++;
    }
    if (i === start) {
      throw new Error(`Expected a number or [ at position ${i}`);
    }
    return Number(text.slice(start, i));
  }

  function list() {
    i++;
    const items = [];
    skipSpaces();
    if (text.charAt(i) === "]") {
      i++;
      return items;
    }
    items.push(item());
    skipSpaces();
    while (text.charAt(i) === ",") {
      i++;
      items.push(item());
      skipSpaces();
    }
    if (text.charAt(i) !== "]") {
      throw new Error(`Expected , or ] at position ${i}`);
    }
    i++;
    return items;
  }

  skipSpaces();
  if (text.charAt(i) !== "[") {
    throw new Error(`Expected [ at position ${i}`);
  }
  const result = list();
  skipSpaces();
  if (i < text.length) {
    throw new Error(`Unexpected text at position ${i}`);
  }
  return result;
}
~~~
```

```check
run "node --test playground/js/list.check.mjs" label="your tests pass"
run "node -e \"import('./playground/js/list.mjs').then(({ parseList }) => console.log(JSON.stringify([parseList('[1, [2, 3], [], [[4]]]'), parseList(' [ 10 , 20 ] '), parseList('[]')])))\"" stdout="[[1,[2,3],[],[[4]]],[10,20],[]]" label="nested, spaced and empty lists parse to arrays" -- item calls list() when it sees [; list reads items separated by commas.
run "node -e \"import('./playground/js/list.mjs').then(({ parseList }) => console.log(['[1, 2', '[1 2]', '[1,]', '[1] x', '1'].map((t) => { try { parseList(t); return 'ok'; } catch (e) { return 'error'; } }).join(',')))\"" stdout="error,error,error,error,error" label="broken lists are all rejected" -- Check for the closing ], for a number after each comma, and for leftover text.
run "$d = Join-Path $env:TEMP ('m' + (Get-Random)); New-Item -ItemType Directory $d | Out-Null; Copy-Item playground/js/list.check.mjs $d; Set-Content (Join-Path $d 'list.mjs') 'export function parseList(t) { return JSON.parse(t.trim().endsWith(`]`) ? t : t + `]`); }'; node --test (Join-Path $d 'list.check.mjs')" exit=1 label="your tests catch a parser that quietly closes an unclosed list" -- Test that a list with no closing ] throws.
git-clean -- Commit it: git add playground, then git commit.
```
