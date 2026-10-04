---
title: 7.3 — Formulas, Part 3: The Parser Builds the Tree
runtime: none
---

You can cut text into tokens (7.1) and work out a tree (7.2). The missing piece turns tokens into the tree. That's the **parser**, and its whole job is to get the structure right: `*` before `+`, brackets first, and `10-2-3` meaning `(10-2)-3`.

It's the most interesting code in the sprint, because a dozen lines will handle formulas of any length and nesting, and they're correct for a reason you can see.

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

The rules are layered: an expression is made of terms, and a term is made of factors. `+` and `-` only ever join **terms**, and a whole run of `*` and `/` is **inside** one term. So in `2+3*4`, the `3*4` has to be a single term before `+` ever sees it: the `+` joins `2` and `(3*4)`. The `*` ends up lower in the tree, so it's worked out first. Nothing in the rules says "multiplication first"; it falls out of which rule is inside which.

That's the general recipe: **operators that should happen first live in a deeper rule.** A deeper rule binds more tightly. In sprint 9 you'll add comparison operators (`>`, `=`), which happen *last*, by adding a rule *above* `expression`. Any new level of operator slots in the same way.

Brackets work because `factor` (the deepest rule) can be `( expression )`: the top rule all over again. Whatever is inside brackets is parsed completely, as one factor, before the operators around it are considered. And because `factor` refers back to `expression`, the grammar is recursive, like the `Expression` type in 7.2. Brackets can nest as deep as you like.

## The tests

This step opens `src/parser.test.ts`:

```typescript file=src/parser.test.ts
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

```check
file src/parser.test.ts
run "npx vitest run parser" exit=1 stderr="parser.ts" label="the parser tests fail: parser.ts doesn't exist yet (red)"
```

## The parser

Each grammar rule becomes one function, with the same name. This way of writing a parser is called **recursive descent**: the functions call each other going down the rules, and back up to `expression` for brackets. This step opens `src/parser.ts`:

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

### Reading through the tokens

`index` is the position of the next token to use. **`peek()`** looks at that token without using it up, and **`advance()`** uses it up (moves `index` on) and returns it. The parser decides what to do by peeking, and only advances once it has decided a token belongs where it is.

`peek`, `advance`, `expression`, `term` and `factor` are written **inside** `parse`, so they all share `tokens` and `index`: closures again (lesson 3.4). Each call of `parse` gets its own `index`, so two formulas being parsed can't disturb each other.

### Why the while loop works left to right

Follow `term` on `8/2/2`:

1. `left = factor()` → `8`.
2. The next token is `/`: use it up, and `left` becomes `8 / factor()` → `8/2`.
3. The next token is another `/`: `left` becomes **`(8/2) / factor()`** → `(8/2)/2`.
4. The next token is `end`, not `*` or `/`: stop, return `left`.

Each time round, the tree built so far becomes the **left** side of the new node. So the earlier operator ends up deeper in the tree, and is worked out first. That's left-to-right grouping, and it comes from building the new node *around* `left` instead of recursing on the right.

### factor, and the base of the recursion

`factor` is where the descent ends. A number or a cell becomes a leaf directly: the base cases. An `(` means "a whole expression is coming": `factor` calls `expression()` to read it, then insists the next token is `)`. That call back up to the top rule is the recursion that allows brackets inside brackets. It always ends, because each `(` uses up a token, and there are only so many tokens.

Anything else where a factor should be is an error: `)` with nothing before it, a second operator (`2+*3`), or running out (`2+` reaches `end`). Each error gives the position of the token it was looking at.

### The last check

After `expression()` returns, the parser has read one complete formula. If anything is left over except `end`, like the `3` in `2 3`, the formula is broken, even though its beginning made sense. Without this check, `2 3` would quietly be treated as `2`.

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
