---
title: 7.7 — Challenge: Negative Numbers
runtime: none
teaches: unary operators, extending a language
uses: lexers, tokens, parsers, grammars, recursive descent, trees, recursion, discriminated unions, tests, vitest, denial of service, input limits, git merge, git push
---

### The story so far

The sheet calculates. A formula goes through the three stages you built: the **lexer** (7.1) cuts it into tokens, the **parser** (7.3) arranges them into a tree following the grammar, and the **evaluator** (7.2) works the tree out, with `cellValue` (7.4) connecting it to the sheet. 7.6 stopped two kinds of formula from crashing the page: circles of cells, and brackets nested thousands deep.

Type `=-A1` into a cell, though, and it shows `#ERROR!`. So does `=2*-3`. The formula language has no way to write "minus this": the `-` only works *between* two things.

This challenge adds it. It touches the tree's type, the parser and the evaluator, all three of the pieces you built, so it's a test of whether you can extend the language yourself. That's the point of the sprint.

## The brief

> **Negative numbers in formulas.** A minus sign in front of something makes it negative, wherever a number could go:
>
> | Formula | Value |
> |---|---|
> | `=-5` | -5 |
> | `=-A1` (A1 is 4) | -4 |
> | `=2*-3` | -6 |
> | `=-(2+3)` | -5 |
> | `=--4` | 4 |
> | `=10--2` | 12 |
> | `=-A1`, with A1 holding `Coffee` | `#VALUE!` |
> | `=-A1`, with A1 empty | 0 |
>
> **Errors still say where.** `=-` and `=2*-` are errors, at the position where something was expected.
>
> **Security: it can't crash the sheet.** A formula of 100,000 minus signs before a number must show `#ERROR!`, like 7.6's deep brackets, not crash the page.

## How a professional would go about it

Changing a language means changing the type its trees are made of, and then every piece of code that looks at those trees. In a big program you can't remember them all. So change the **type first**, and let the compiler list the places:

```text
src/evaluate.ts:5:89 - error TS2366: Function lacks ending return statement and return type does not
 include 'undefined'.

5 export function evaluate(expression: Expression, valueAt: (address: Address) => Value): Value {
                                                                                          ~~~~~
```

That's what `npx tsc` prints after one new kind is added to `Expression` and nothing else. `evaluate`'s `switch` used to cover every kind of `Expression` (lesson 7.2); now there's one it doesn't handle, so the function could reach its end without returning, and TypeScript says so. Each error is a place to visit.

Then, as in every lesson this sprint: tests first, from the brief's table, in `parser.test.ts` or `evaluate.test.ts` (or both).

## Your turn: build it to the brief

Make every row of the brief work, with tests. The lexer needs no change: it already produces `-` tokens. Then merge the `formulas` branch into `main`, push, and delete the branch:

```powershell
git add src
git commit -m "Support negative numbers: =-A1, =2*-3"
git switch main
git merge formulas
git push
git branch -d formulas
```

`git add src` stages every changed and new file in the `src` folder, in case your tests went in a new file.

```hints
nudge: Three questions are the whole design. What new kind of tree node is it? Which grammar rule does a leading `-` belong to? What's the value of a negation, and of a negated error?
concept: A negation has **one** child, so it's a new kind with a single `operand`, a sibling of `binary`. A leading `-` applies to the single thing right after it (`-3` in `2*-3`, `-(2+3)` in `-(2+3)*4`), which is a **factor**: add `"-" factor` as one more thing a factor can be. Because it calls `factor` again, `--4` works by itself. Its value is the negative of its operand's value, with the same rule for errors as `binary`: if `toNumber` didn't give a number, return what it gave. And that `factor` → `factor` call is recursion, so 100,000 minus signs need the same depth limit as 7.6's brackets.
shape: `expression.ts`: `| { kind: "negate"; operand: Expression }`. `parser.ts`, in `factor`, after `advance()`: `if (token.kind === "operator" && token.op === "-") { …count depth… return { kind: "negate", operand: factor() }; }`. `evaluate.ts`: `case "negate": { const operand = toNumber(evaluate(expression.operand, valueAt)); return typeof operand === "number" ? -operand : operand; }`.
answer: Lesson 7.8 goes through a full solution, piece by piece.
```

```check
run "npx tsc" label="the project type-checks" -- If tsc reports evaluate.ts, add a case for your new kind of expression to evaluate's switch.
run "npx vitest run" label="all tests pass, yours included"
page index.html "(async () => { const { parse } = await import('/src/parser.ts'); const { evaluate } = await import('/src/evaluate.ts'); return ['-5', '2*-3', '-(2+3)', '--4', '10--2', '-2*3', '-(1-4)*2'].map((t) => evaluate(parse(t), () => '')).join(','); })()" "-5,-6,-5,4,12,-6,6" server=vite label="-5, 2*-3, -(2+3), --4, 10--2, -2*3 and -(1-4)*2 all work"
page index.html "(async () => { const { parse } = await import('/src/parser.ts'); const { evaluate } = await import('/src/evaluate.ts'); return JSON.stringify([evaluate(parse('-A1'), () => 4), evaluate(parse('-A1'), () => 'Coffee'), evaluate(parse('-A1'), () => ''), evaluate(parse('-A1'), () => ({ error: '#DIV/0!' }))]); })()" "[-4,{\"error\":\"#VALUE!\"},0,{\"error\":\"#DIV/0!\"}]" server=vite label="-A1 is -4 for 4, #VALUE! for text, 0 for empty, and passes errors on"
page index.html "(async () => { const { parse } = await import('/src/parser.ts'); return ['-', '2*-', '-)'].map((t) => { try { parse(t); return 'ok'; } catch (e) { return e.position; } }).join(','); })()" "1,3,1" server=vite label="a minus with nothing after it is still an error, at the right position"
run "node -e \"import('./src/parser.ts').then(({ parse }) => { try { parse('-'.repeat(100000) + '1'); console.log('no error'); } catch (e) { console.log(e.constructor.name); } })\"" stdout="FormulaError" label="security: 100,000 minus signs are refused with a FormulaError, not a crash" -- Each leading minus is one more level of recursion. Count it, as the brackets are counted.
git-branch main
git-no-branch formulas -- After merging, delete the branch.
git-tracked src/parser.ts label="main has the formula code"
git-pushed
git-clean
```

## Sprint 7 is done

The spreadsheet calculates. Behind `=B2*C2` there's a lexer, a grammar, a recursive-descent parser, a tree, a recursive evaluator, error values that pass from cell to cell, cycle detection and limits that keep hostile formulas from crashing it, each in its own tested module, each of which you could now explain to someone else.

There's a cost you've already noticed in the code: every change recalculates all 2,600 cells, and a cell used by several formulas is recalculated for each of them. Sprint 8 measures how much that costs, and builds the structure that lets the spreadsheet recalculate **only** what a change affects: a graph of which cells depend on which.
