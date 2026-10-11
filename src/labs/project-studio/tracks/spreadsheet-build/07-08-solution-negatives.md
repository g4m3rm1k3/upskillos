---
title: 7.8 — Solution: Negative Numbers
runtime: none
experiments: The parser: one more kind of factor
teaches: right associativity, exponentiation
uses: unary operators, extending a language, parsers, grammars, recursive descent, trees, recursion, base cases, discriminated unions, narrowing, denial of service, input limits, tests, vitest, git switch, git merge, git push
---

### The story so far

The challenge (7.7) asked for negative numbers in formulas: `=-A1`, `=2*-3`, `=--4`, errors at the right positions, and no crash from 100,000 minus signs in a row. It needed a change in each of the three places that know about formulas: the tree's type, the parser and the evaluator.

### What this lesson builds

Nothing new in the project: this is one full solution, so you can compare it with yours. **If yours passed, keep it.** Here is the tree the solution's parser makes for `2*-3`, and what the evaluator does with it:

```text
        *               2 × (−3) = −6
      /   \
     2    negate        −(3) = −3
            |
            3
```

A negation is a node with **one** child. The rest of the lesson is the three changes that make that tree, one at a time, and then a Your turn that adds a new operator to the language, on your own.

## The new kind of node {#kind}

In `src/expression.ts`, `Expression` gains one member:

```typescript
export type Expression =
  | { kind: "number"; value: number }
  | { kind: "cell"; address: Address }
  | { kind: "negate"; operand: Expression }
  | { kind: "binary"; op: Operator; left: Expression; right: Expression };
```

| kind | children | an example node |
|---|---|---|
| `negate` | one: `operand` | `{ kind: "negate", operand: { kind: "number", value: 3 } }`, the tree for `-3` |

`operand` is the usual name for what an operator works on. Like `left` and `right`, its type is `Expression`, so a negation can hold anything: a number, a cell, a whole bracketed sum, or another negation. That's how `--4` will work with no extra code.

With only this change, `npx tsc` reports `evaluate.ts`: the challenge's "let the compiler list the places" in action.

## The evaluator {#evaluator}

In `src/evaluate.ts`, `evaluate`'s `switch` gains a case:

```typescript
    case "negate": {
      const operand = toNumber(evaluate(expression.operand, valueAt));
      return typeof operand === "number" ? -operand : operand;
    }
```

It's the `binary` case with one side instead of two:

| the operand's value | `toNumber` gives | so the negation is |
|---|---|---|
| `3` | `3` | `-3` |
| `""`, an empty cell | `0` | `-0`, shown as `0` |
| `"Coffee"` | `{ error: "#VALUE!" }` | that error, passed on |
| `{ error: "#DIV/0!" }` | the same error | that error, passed on |

`evaluate(expression.operand, valueAt)` is the recursion: work out the child first, as for `binary`. It ends because the operand is a smaller tree. (`-0` is a real value in JavaScript's floating point, the negative of zero; `String(-0)` is `"0"`, so the cell shows `0`.)

## The parser: one more kind of factor {#parser}

In `src/parser.ts`, `factor` gains a case before the one for `(`:

```typescript
    if (token.kind === "operator" && token.op === "-") {
      depth++;
      if (depth > 100) {
        throw new FormulaError("Too many minus signs in a row", token.start);
      }
      const operand = factor();
      depth--;
      return { kind: "negate", operand };
    }
```

The grammar's `factor` line becomes:

```text
factor = number | cell | "-" factor | "(" expression ")"
```

A `-` where a factor is expected can't be subtraction, because subtraction needs something on its left, and a factor is the start of something. So `factor` uses it up and reads **one factor** after it: the `3` in `2*-3`, the whole `(2+3)` in `-(2+3)*4`. Here's `--4`, the two minus signs at positions 0 and 1:

| call | sees | does |
|---|---|---|
| `factor` | `-` at 0 | a negation: depth 1, reads one factor |
| `factor` | `-` at 1 | another negation: depth 2, reads one factor |
| `factor` | `4` | a leaf: returns 4 |
| back | | returns `negate(4)`, depth 1 |
| back | | returns `negate(negate(4))`, depth 0 |

`factor` calling `factor` is recursion, so it needs what 7.6's brackets needed: a limit, counted with the same `depth`. Without it, 100,000 minus signs make 100,000 nested calls, and the call stack runs out.

Predict how the parser reads subtraction followed by a negative number:

```predict
question: How does the parser read `10--2`?
choice: 10 - (-2)
choice: An error: two operators in a row
answer: 10 - (-2)
explain: `expression` reads the term `10`, then sees the first `-` between two things: subtraction. It calls `term` for the right side, and `term` calls `factor`, which sees the second `-` where a factor should start: a negation. So the tree is subtraction with `negate(2)` on its right, and the value is 12.
verify: node -e "Promise.all([import('./src/parser.ts'), import('./src/evaluate.ts')]).then(([{ parse }, { evaluate }]) => console.log(evaluate(parse('10--2'), () => '') === 12 ? '10 - (-2)' : 'something else'))"
```

To see the tree itself, run `node -e "import('./src/parser.ts').then(({ parse }) => console.log(JSON.stringify(parse('--4'))))"` and find the two `negate` nodes inside each other.

## Your turn: a power operator

An accountant asks for compound interest: £1,000 at 5% a year for 10 years is `=1000*1.05^10`. Spreadsheets write "to the power of" as `^`. Add it to the formula language:

| Formula | Value | why |
|---|---|---|
| `=2^3` | 8 | 2 × 2 × 2 |
| `=2*3^2` | 18 | `^` happens before `*` |
| `=2^3^2` | 512 | `^` groups **right to left**, as in maths: `2^(3^2)` = 2⁹ |
| `=(2^3)^2` | 64 | brackets first, as always |
| `=-2^2` | 4 | the minus belongs to the 2 first, as in Excel: `(-2)^2` |
| `=4^0.5` | 2 | a power of 0.5 is a square root |
| `=2^-1` | 0.5 | a negative power |

`=2^` and `=^2` are errors at the right positions, and, for the same reason as minus signs, a formula of 50,000 `^` signs in a row (`2^2^2^…`) shows `#ERROR!`, not a crash. Write tests first. Work on a new branch, `power`, then merge it into `main`, push, and delete the branch.

```hints
nudge: Follow a `^` through the three stages. Which ones have never seen it? Then ask the grammar question from this sprint: which rule should `^` live in, if it happens before `*`?
concept: The lexer must make `^` an operator token, and the `Operator` type must include it (TypeScript then lists `calculate` as missing a case: `left ** right` is JavaScript's power). Operators that happen first live in a deeper rule (7.3), so `^` gets a new rule between `term` and `factor`, and `term` calls it instead of `factor`. Right-to-left grouping is the opposite of `term`'s loop: instead of building around `left`, read a factor, and if a `^` follows, read the **rest** of the powers as the right side, by calling the rule again. That's recursion, so it needs the depth limit.
shape: `power = factor [ "^" power ]`, where `[ … ]` means "optional". `function power(): Expression { const base = factor(); const token = peek(); if (token.kind === "operator" && token.op === "^") { advance(); …depth… return { kind: "binary", op: "^", left: base, right: power() }; } return base; }`, and in `term`, `power()` where it said `factor()`.
answer: ~~~typescript
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
~~~
plus `|| char === "^"` in the lexer's operator branch, `"^"` added to the lexer's `op` type and to `Operator`, `case "^": return left ** right;` in `calculate`, and `power()` in place of both `factor()` calls in `term`.
```

```check
run "npx tsc" label="the project type-checks" -- When tsc reports calculate, add a case for "^".
run "npx vitest run" label="all tests pass, yours included"
page index.html "(async () => { const { parse } = await import('/src/parser.ts'); const { evaluate } = await import('/src/evaluate.ts'); return ['2^3', '2*3^2', '2^3^2', '(2^3)^2', '-2^2', '4^0.5', '2^-1'].map((t) => evaluate(parse(t), () => '')).join(','); })()" "8,18,512,64,4,2,0.5" server=vite label="the power operator: precedence, right-to-left grouping, brackets, minus and fractions" -- 2^3^2 must be 512: read the rest of the powers as the right side, by calling the rule again.
page index.html "(async () => { const { parse } = await import('/src/parser.ts'); return ['2^', '^2'].map((t) => { try { parse(t); return 'ok'; } catch (e) { return e.position; } }).join(','); })()" "2,0" server=vite label="2^ and ^2 are errors at the right positions"
run "node -e \"import('./src/parser.ts').then(({ parse }) => { try { parse('2^'.repeat(50000) + '2'); console.log('no error'); } catch (e) { console.log(e.constructor.name); } })\"" stdout="FormulaError" label="security: 50,000 ^ signs in a row are refused with a FormulaError, not a crash" -- power calls itself once for each ^: count it with depth.
git-branch main
git-no-branch power -- After merging, delete the branch.
git-pushed
git-clean
```
