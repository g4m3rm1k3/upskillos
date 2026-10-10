---
title: 6.1 — The First Test
runtime: none
experiments: A test should be able to fail
teaches: tests, vitest, describe, it, expect, npm test
uses: typescript, functions, git restore
---

In sprint 3 you checked `columnName` by typing `columnName(26)` into the Console and reading the answer. That worked once. But code changes: next month you'll touch `columnName` for some other reason, and nobody will remember to type those checks again. Sprint 5 showed that the type checker won't notice if it starts returning `"BA"`.

A **test** is a small program that runs your code with known inputs and checks the outputs, and it can be run again at any time, in a second. This sprint writes tests, then uses them to build the spreadsheet's first real model of its data.

## A branch

```powershell
git switch -c tests-and-model
```

```check
git-branch tests-and-model -- Run git switch -c tests-and-model
```

## Install Vitest

**Vitest** is a test runner: it finds your test files, runs them, and reports what passed and what failed. It's made by the same team as Vite and uses the same setup, so it understands TypeScript already.

```powershell
npm install --save-dev vitest
```

```text
PS C:\Users\you\Documents\spreadsheet> npm install --save-dev vitest

added 20 packages, and audited 38 packages in 2s

12 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

```check
dir node_modules/vitest -- Run npm install --save-dev vitest
```

## A test file

Tests for `columns.ts` go in `columns.test.ts`, next to it. Vitest runs every file whose name ends in `.test.ts`. This step opens it:

```typescript file=columns.test.ts
import { describe, expect, it } from "vitest";
import { columnName } from "./columns.ts";

describe("columnName", () => {
  it("names the first 26 columns A to Z", () => {
    expect(columnName(0)).toBe("A");
    expect(columnName(25)).toBe("Z");
  });
});
```

### Reading a test

- **`it("…", () => { … })`** is one test: a sentence saying what should be true, and a function that checks it. Read it aloud: *it names the first 26 columns A to Z*.
- **`expect(columnName(0)).toBe("A")`**: run `columnName(0)` and check the result is `"A"`. If it isn't, this test fails, and Vitest reports what it got instead.
- **`describe("columnName", …)`** groups the tests about one thing, so the report reads *columnName > goes on to AA after Z*.

 (Python's equivalent is `pytest`: functions named `test_…` containing `assert` statements.)

## Two more tests {#more-tests}

Add two more tests inside the `describe`, for the two-letter and three-letter names:

```typescript file=columns.test.ts
import { describe, expect, it } from "vitest";
import { columnName } from "./columns.ts";

describe("columnName", () => {
  it("names the first 26 columns A to Z", () => {
    expect(columnName(0)).toBe("A");
    expect(columnName(25)).toBe("Z");
  });

  it("goes on to AA after Z", () => {
    expect(columnName(26)).toBe("AA");
    expect(columnName(27)).toBe("AB");
  });

  it("reaches three letters after ZZ", () => {
    expect(columnName(701)).toBe("ZZ");
    expect(columnName(702)).toBe("AAA");
  });
});
```

Those are your lesson 3.6 checks, written down once and kept. Each test covers one idea, and its sentence says which: when a test fails, its name tells you what broke before you read a line of code.

## Run it

```powershell
npx vitest run
```

```text
PS C:\Users\you\Documents\spreadsheet> npx vitest run

 RUN  v5.0.3 C:/Users/you/Documents/spreadsheet


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  05:43:24
   Duration  560ms (import 43%, worker 31%, transform 23%, tests 3%)
```

Three tests, all passing, in about half a second. `vitest run` runs the tests once and stops. (Plain `vitest` keeps watching your files and re-runs the tests on every save.)

```check
file columns.test.ts
run "npx vitest run" stdout="3 passed" label="the three columnName tests pass"
```

## A test should be able to fail

A test that can't fail is worthless, so watch this one fail. Break `columnName` the way lesson 3.6's hint 3 warned about: drop the "subtract one more". In `columns.ts`, change

```typescript
    index = Math.floor(index / 26) - 1;
```

to `Math.floor(index / 26)`, and change the loop to `do { ... } while (index > 0);` so it still ends. (Or make any change you like that you think is wrong.) Then run the tests:

```text
 ❯ columns.test.ts (3 tests | 2 failed) 5ms
   ❯ columnName (3)
     × goes on to AA after Z 3ms
     × reaches three letters after ZZ 1ms

 FAIL  columns.test.ts > columnName > goes on to AA after Z
AssertionError: expected 'BA' to be 'AA' // Object.is equality

Expected: "AA"
Received: "BA"

 ❯ columns.test.ts:11:28
      9|
     10|   it("goes on to AA after Z", () => {
     11|     expect(columnName(26)).toBe("AA");
       |                            ^
     12|     expect(columnName(27)).toBe("AB");
     13|   });

 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)
```

Read it like any error: **which test** (*goes on to AA after Z*), **what was expected and what was received** (`"AA"`, got `"BA"`), and **where** (line 11, with the code). The first test still passes, which narrows down the problem: single letters are fine, two letters aren't.

Before you run the tests, predict:

```predict
question: You dropped the "subtract one more" from `columnName`. How many of the three tests fail?
answer: 2
explain: Single letters still come out right: for 0 to 25 the loop runs once, and the subtraction never mattered. From 26 on, every name is off, so the AA test and the ZZ/AAA test both fail. A test that still passes after a deliberate break is a test of something else.
verify: node -e "const n = (i) => { let s = ''; do { s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26); } while (i > 0); return s; }; const t = [[[0, 'A'], [25, 'Z']], [[26, 'AA'], [27, 'AB']], [[701, 'ZZ'], [702, 'AAA']]]; console.log(t.filter((c) => c.some(([i, x]) => n(i) !== x)).length)"
```

Now run `npx tsc`: no errors. The types are all fine; the answers are wrong. That's sprint 5's lesson, shown by the tools themselves.

Put `columns.ts` back the way it was (`git restore columns.ts` does it in one command, lesson 1.6), and run the tests again: 3 passed.

```check
run "npx vitest run" stdout="3 passed" label="all three tests pass again" -- Restore columns.ts with git restore columns.ts
```

## npm test

Add a `test` script, so the project runs its tests with the same command as almost every JavaScript project:

```json file=package.json
{
  "name": "spreadsheet",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "check": "tsc",
    "test": "vitest run",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "typescript": "^7.0.2",
    "vite": "^8.3.2",
    "vitest": "^5.0.3"
  }
}
```

Keep your own version numbers. `npm test` is short for `npm run test`.

```check
contains package.json "\"test\": \"vitest run\"" -- Add "test": "vitest run" to the scripts.
run "npm test" stdout="3 passed" label="`npm test` runs the tests"
```

## Commit

```powershell
git add columns.test.ts
git commit -am "Test columnName"
```

```check
git-tracked columns.test.ts
git-clean
```

## Your turn: tests for your own module

In lesson 4.1 you wrote `playground/js/stats.mjs`, with `sum` and `average`. Test it, in `playground/js/stats.check.mjs`, with **Node's own test runner**: tests don't need a tool like Vitest, they're just code that checks code. The shape:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { sum } from "./stats.mjs";

test("adds the numbers", () => {
  assert.equal(sum([1, 2]), 3);
});
```

`assert.equal(actual, expected)` is Vitest's `expect(actual).toBe(expected)`. Write tests for: the sum of `[1, 2, 3]`; the sum of an **empty** array, which should be `0`; and the average of `[2, 4]`. Run them with `node --test playground/js/stats.check.mjs`. (The file is named `.check.mjs`, not `.test.mjs`, so that Vitest, which runs every `.test.` file in the project, leaves your playground alone.)

Then do what this lesson did: break `stats.mjs` on purpose, see your tests fail, and put it back. Commit.

```check
run "node --test playground/js/stats.check.mjs" label="your tests pass" -- Run node --test playground/js/stats.check.mjs and read what failed.
run "$d = Join-Path $env:TEMP ('m' + (Get-Random)); New-Item -ItemType Directory $d | Out-Null; Copy-Item playground/js/stats.check.mjs $d; Set-Content (Join-Path $d 'stats.mjs') 'export function sum(n) { return 0; } export function average(n) { return 0; }'; node --test (Join-Path $d 'stats.check.mjs')" exit=1 label="your tests fail when sum and average are wrong" -- A test must be able to fail: check the actual numbers, not just that the functions exist.
run "$d = Join-Path $env:TEMP ('m' + (Get-Random)); New-Item -ItemType Directory $d | Out-Null; Copy-Item playground/js/stats.check.mjs $d; Set-Content (Join-Path $d 'stats.mjs') 'export function sum(n) { let t = 0; for (let i = 0; i < n.length; i++) { t = t + n[i]; } return n.length ? t : NaN; } export function average(n) { return sum(n) / n.length; }'; node --test (Join-Path $d 'stats.check.mjs')" exit=1 label="your tests notice when an empty array doesn't sum to 0" -- Test the empty array: sum([]) should be 0.
git-clean -- Commit it: git add playground, then git commit.
```

The second and third checks copy your test file next to a deliberately wrong `stats.mjs`, and pass only if your tests **fail** there. That's how to test tests.

```hints
nudge: Three `test(...)` calls, each with one `assert.equal`.
concept: Import `average` as well as `sum`. The empty array is the edge case: what should the total of no numbers be?
shape: `test("sums 1, 2 and 3", () => { assert.equal(sum([1, 2, 3]), 6); });` and two more like it.
answer: ~~~javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { average, sum } from "./stats.mjs";

test("sums 1, 2 and 3", () => {
  assert.equal(sum([1, 2, 3]), 6);
});

test("sums an empty array to 0", () => {
  assert.equal(sum([]), 0);
});

test("averages 2 and 4", () => {
  assert.equal(average([2, 4]), 3);
});
~~~
```
