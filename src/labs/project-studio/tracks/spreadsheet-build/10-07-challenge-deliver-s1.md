---
title: 10.7 — Challenge: Deliver S1
runtime: none
teaches: delivering a story, cross-site scripting as a regression
uses: acceptance tests, definition of done, user stories, function registries, floating point, significant digits, lazy evaluation, errors as values, input limits, xss, tests, test-driven development, working from a brief, git merge, git push
---

### The story so far

Sprint 10 did everything a team does before writing code for a client. Crumb & Co.'s brief became questions, answers and a glossary (10.1, 10.2); five user stories in `docs/backlog.md` (10.3) with acceptance criteria (10.4); acceptance tests in `src/acceptance/crumb.test.ts`, where S2 passes and S1 is skipped because there's no `ROUNDUP` (10.5); and a plan, a definition of done, and the branch `s1-scaling` (10.6).

## The brief

> **From Priya:** "When I ask for 30 brioche, I need to see 18 eggs, not 17.5. And the flour in whole grams, please."
>
> **The story:** S1, *Scale a recipe*, delivered to the definition of done.
>
> **The feature:** two spreadsheet functions, as in Excel.
>
> - `ROUND(number, places)` rounds to that many decimal places: `ROUND(3.14159, 2)` is 3.14. Negative places round to tens, hundreds and so on: `ROUND(1234, -2)` is 1200. Halves round away from zero: `ROUND(2.5, 0)` is 3 and `ROUND(-2.5, 0)` is −3.
> - `ROUNDUP(number, places)` rounds away from zero: `ROUNDUP(17.01, 0)` is 18 and `ROUNDUP(-1.2, 0)` is −2.
> - Both round **the number a person sees**. `0.1*3*10` shows as 3 (lesson 7.4), so `ROUNDUP(0.1*3*10, 0)` must be 3, though JavaScript's `Math.ceil` gives 4 for it.
> - Both need exactly two arguments, and pass errors on. More than 15 places either way is `#VALUE!`, not `Infinity` or `NaN`.
>
> **Security:** the shops' managers type into the same sheets. Whatever anyone types, a recipe name like `<b>Brioche</b>` included, must show as the text typed, never as HTML: lesson 3.5's cross-site scripting. Nothing in this story should change that, and a check proves it hasn't.
>
> **Delivery:** to the definition of done: S1's acceptance test no longer skipped, and passing; the supplied unit tests passing; `tsc` clean; S1's heading in the backlog ending *(done)*; merged into `main`, pushed, and `s1-scaling` deleted.

The unit tests are supplied: click **Create provided src/rounding.test.ts**:

```typescript file=src/rounding.test.ts provided
import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate.ts";
import { parse } from "./parser.ts";

function calc(formula: string): unknown {
  return evaluate(parse(formula), () => "");
}

describe("ROUND and ROUNDUP", () => {
  it("rounds to a number of decimal places, or to tens and hundreds", () => {
    expect(calc("ROUND(3.14159, 2)")).toBe(3.14);
    expect(calc("ROUND(1234, -2)")).toBe(1200);
    expect(calc("ROUNDUP(17.5, 0)")).toBe(18);
    expect(calc("ROUNDUP(17.01, 0)")).toBe(18);
  });

  it("rounds halves, and rounds up, away from zero", () => {
    expect(calc("ROUND(2.5, 0)")).toBe(3);
    expect(calc("ROUND(-2.5, 0)")).toBe(-3);
    expect(calc("ROUNDUP(-1.2, 0)")).toBe(-2);
  });

  it("rounds the number a person sees, not the floating-point error behind it", () => {
    expect(calc("ROUNDUP(0.1*3*10, 0)")).toBe(3);
    expect(calc("ROUND(1.005, 2)")).toBe(1.01);
  });

  it("gives #VALUE! for the wrong arguments, and passes errors on", () => {
    expect(calc("ROUND(2.5)")).toEqual({ error: "#VALUE!" });
    expect(calc('ROUND("lots", 0)')).toEqual({ error: "#VALUE!" });
    expect(calc("ROUND(1/0, 0)")).toEqual({ error: "#DIV/0!" });
  });

  it("refuses more than 15 places either way, instead of giving Infinity or NaN", () => {
    expect(calc("ROUND(1.5, 400)")).toEqual({ error: "#VALUE!" });
    expect(calc("ROUND(1.5, -400)")).toEqual({ error: "#VALUE!" });
    expect(calc("ROUND(1.5, 15)")).toBe(1.5);
  });
});
```

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| rounds to a number of decimal places, or to tens and hundreds | the places argument, both signs | `ROUND(1234, -2)` giving 1234, or `ROUNDUP(17.01, 0)` giving 17 |
| rounds halves, and rounds up, away from zero | the direction for negative numbers | `ROUND(-2.5, 0)` giving −2, which is what `Math.round` does |
| rounds the number a person sees, not the floating-point error behind it | the 15-digit clean-up | `ROUNDUP(0.1*3*10, 0)` giving 4, and `ROUND(1.005, 2)` giving 1 because `1.005 * 100` is 100.49999999999999 |
| gives #VALUE! for the wrong arguments, and passes errors on | the arguments | `ROUND(2.5)` crashing, `ROUND("lots", 0)` giving `NaN` |
| refuses more than 15 places either way | the limit | `ROUND(1.5, 400)` working out `10 ** 400`, which is `Infinity`, and showing `NaN` |

## How a professional would go about it

Start from the definition of done, not the code: it's the checklist for the end. Then remove S1's `.skip` and watch it fail: that red test is the story. Then the unit tests, one at a time.

Both functions are the same except for the last step: `Math.round` or `Math.ceil`. When two functions differ in one step, one function can make both, given that step as a parameter: 8.8's `reachable(cell, next)` did exactly this.

For the rounding itself: multiply by `10 ** places`, round, divide back. Work on the number's size, `Math.abs`, and put the sign back afterwards, so "away from zero" comes free. And clean the number to 15 significant digits first, as `display` does.

## Your turn: deliver S1

Build it on `s1-scaling`, test first. Then follow the definition of done to the end:

```powershell
git add docs src
git commit -m "S1: scale a recipe, with ROUND and ROUNDUP"
git switch main
git merge s1-scaling
git push
git branch -d s1-scaling
```

```hints
nudge: Take S1's `.skip` off first and read how it fails. Then make `ROUNDUP(17.5, 0)` work, then the rest of the unit tests one by one.
concept: Write a helper that turns an `Argument` into a number (9.6's `value()`, with an empty cell as 0). Then `rounding(direction)`, a function that returns a `FormulaFunction`: check two arguments, get both numbers, refuse more than 15 places, then `direction(Number((Math.abs(value) * 10 ** places).toPrecision(15))) / 10 ** places`, with the sign put back. Register `rounding(Math.round)` and `rounding(Math.ceil)`.
shape: In `functions.ts`: `function numberIn(arg: Argument): number | ErrorValue`, then `function rounding(direction: (size: number) => number): FormulaFunction { return (args) => { … }; }`, and two lines in the registry. In `crumb.test.ts`, `it.skip(` back to `it(`. In `docs/backlog.md`, `### S1: Scale a recipe (done)`.
answer: Lesson 10.8 goes through one solution, piece by piece.
```

```check
run "npx vitest run src/rounding.test" stdout="5 passed" label="the 5 rounding tests pass" -- Clean the size to 15 significant digits, then round it, then put the sign back.
run "npx vitest run src/acceptance" stdout="3 passed | 4 todo" label="S1's acceptance test runs, and passes" -- Change it.skip back to it for S1.
run "npx vitest run" stdout="104 passed | 4 todo" label="all 104 tests pass, and nothing is skipped"
run "npx tsc" label="the project type-checks"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); const bar = document.querySelector('#formula-bar'); const td = (r, c) => rows[r].querySelectorAll('td')[c]; const type = (r, c, text) => { td(r, c).click(); bar.value = text; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); }; type(0, 0, '<b>Brioche</b>'); type(0, 1, '7'); type(0, 2, '=ROUNDUP(B1*30/12, 0)'); return td(0, 0).textContent + '|' + td(0, 0).children.length + '|' + td(0, 2).textContent; })()" "<b>Brioche</b>|0|18" server=vite errors=none label="on the page, ROUNDUP gives 18 eggs, and a name typed as HTML shows as text" -- Register ROUNDUP; and keep showing cell values with textContent, never innerHTML.
run "node -e \"const t = require('fs').readFileSync('docs/backlog.md', 'utf8').split(/\\r?\\n/); console.log(t.some((l) => l.startsWith('### S1') && l.trim().endsWith('(done)')) ? '[S1 done]' : '[S1 not marked done]')\"" stdout="[S1 done]" label="S1 is marked done in the backlog" -- End S1's heading with (done).
git-branch main
git-no-branch s1-scaling -- After merging, delete the branch.
git-pushed
git-clean
```

## Sprint 10 is done

The first story is delivered, and the release has a shape: a backlog in the client's words, criteria the client agreed, tests that say where every story stands, a plan, and a definition of done that S1 has now met. Most of the sprint was spent before any code, and that's normal: a team that skips it builds the wrong thing quickly. Lesson 10.8 goes through one solution to the challenge. Sprint 11 starts the next stories, and with them React.
