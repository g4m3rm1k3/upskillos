---
title: 7.7 — Challenge: Negative Numbers
runtime: none
---

Type `=-A1` into a cell. It shows `#ERROR!`. So does `=2*-3`. The formula language has no way to write "minus this": the `-` only works *between* two things.

This challenge adds it. It touches the tree's type, the parser and the evaluator, the three pieces you built this sprint, so it's a test of whether you can extend the language yourself. That's the point of the sprint.

## What should work

| Formula | Value |
|---|---|
| `=-5` | -5 |
| `=-A1` (A1 is 4) | -4 |
| `=2*-3` | -6 |
| `=-(2+3)` | -5 |
| `=--4` | 4 |
| `=10--2` | 12 |
| `=-"Coffee"`, through a cell holding Coffee | `#VALUE!` |

## How to think about it

Work out the answers to these before writing code; they're the design.

1. **What new kind of tree node do you need?** A negation has **one** child, not two. (Hint: look at how `binary` is defined in `expression.ts`, and make a sibling with a single `operand`.)
2. **Which grammar rule does a leading `-` belong to?** It applies to the single thing right after it: `-3` in `2*-3`, `-(2+3)` in `-(2+3)*4`. That's a **factor** (lesson 7.3): add `"-" factor` as one more thing a factor can be. Because it calls `factor` again, `--4` works by itself.
3. **What's the value of a negation?** The negative of its operand's value. And errors? The same rule as `binary`: if the operand isn't a number, return what `toNumber` gave you.

The lexer needs no change: it already produces `-` tokens. Write tests first, in `parser.test.ts` or `evaluate.test.ts` (or both), from the table above.

### Let TypeScript tell you what's missing

Add the new kind to `Expression` first, and run `npx tsc` before touching anything else:

```text
src/evaluate.ts:5:89 - error TS2366: Function lacks ending return statement and return type does not
 include 'undefined'.

5 export function evaluate(expression: Expression, valueAt: (address: Address) => Value): Value {
                                                                                          ~~~~~
```

That's the safety net from lesson 7.2. `evaluate`'s `switch` used to cover every kind of `Expression`; now there's a kind it doesn't handle, so the function could reach its end without returning anything, and TypeScript says so. In a big program, this is how you find **every** place a new case has to be handled: change the type, and let the compiler list them.

```check
run "npx tsc" label="the project type-checks" -- If tsc reports evaluate.ts, add a case for your new kind of expression to evaluate's switch.
run "npx vitest run" label="all tests pass, yours included"
page index.html "(async () => { const { parse } = await import('/src/parser.ts'); const { evaluate } = await import('/src/evaluate.ts'); return ['-5', '2*-3', '-(2+3)', '--4', '10--2', '-2*3', '-(1-4)*2'].map((t) => evaluate(parse(t), () => '')).join(','); })()" "-5,-6,-5,4,12,-6,6" server=vite label="-5, 2*-3, -(2+3), --4, 10--2, -2*3 and -(1-4)*2 all work"
page index.html "(async () => { const { parse } = await import('/src/parser.ts'); const { evaluate } = await import('/src/evaluate.ts'); return JSON.stringify([evaluate(parse('-A1'), () => 4), evaluate(parse('-A1'), () => 'Coffee'), evaluate(parse('-A1'), () => ''), evaluate(parse('-A1'), () => ({ error: '#DIV/0!' }))]); })()" "[-4,{\"error\":\"#VALUE!\"},0,{\"error\":\"#DIV/0!\"}]" server=vite label="-A1 is -4 for 4, #VALUE! for text, 0 for empty, and passes errors on"
page index.html "(async () => { const { parse } = await import('/src/parser.ts'); return ['-', '2*-', '-)'].map((t) => { try { parse(t); return 'ok'; } catch (e) { return e.position; } }).join(','); })()" "1,3,1" server=vite label="a minus with nothing after it is still an error, at the right position"
```

## Merge the sprint and push

```powershell
git add src
git commit -m "Support negative numbers: =-A1, =2*-3"
git switch main
git merge formulas
git push
git branch -d formulas
```

`git add src` stages every changed and new file in the `src` folder, in case your tests went in a new file.

```check
git-branch main
git-no-branch formulas -- After merging, delete the branch.
git-tracked src/parser.ts label="main has the formula code"
git-pushed
git-clean
```

## Sprint 7 is done

The spreadsheet calculates. Behind `=B2*C2` there's a lexer, a grammar, a recursive-descent parser, a tree, a recursive evaluator, error values that pass from cell to cell, and cycle detection, each in its own tested module, each of which you could now explain to someone else.

There's a cost you've already noticed in the code: every change recalculates all 2,600 cells, and a cell used by several formulas is recalculated for each of them. Sprint 8 measures how much that costs, and builds the structure that lets the spreadsheet recalculate **only** what a change affects: a graph of which cells depend on which.
