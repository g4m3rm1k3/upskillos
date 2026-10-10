---
title: 6.2 — Test First: Red, Green, Refactor
runtime: none
experiments: Red: a test for code that doesn't exist; Red again: two letters
teaches: test-driven development, red green refactor, for of loops, round-trip tests
uses: tests, vitest, functions
---

The spreadsheet will soon need the opposite of `columnName`: given the letters `"AA"`, which column number is it? Formulas will contain addresses like `B3`, and the program must turn `B` back into column 1.

This time, write the test **before** the code. It sounds backwards, and it's one of the most useful habits in programming, called **test-driven development** (TDD). It goes in a cycle:

1. **Red**: write a test for the next small piece of behaviour, and watch it fail. Seeing it fail proves the test can tell right from wrong.
2. **Green**: write the simplest code that makes it pass.
3. **Refactor**: tidy the code (or the tests) without changing what they do, with the tests protecting you while you do.

Then the next test.

## Red: a test for code that doesn't exist

Add a second `describe` to `columns.test.ts`, and import `columnIndex` alongside `columnName`:

```typescript file=columns.test.ts
import { describe, expect, it } from "vitest";
import { columnIndex, columnName } from "./columns.ts";

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

describe("columnIndex", () => {
  it("turns single letters into 0 to 25", () => {
    expect(columnIndex("A")).toBe(0);
    expect(columnIndex("Z")).toBe(25);
  });
});
```

Run the tests:

```text
 ❯ columns.test.ts (4 tests | 1 failed) 4ms
   ❯ columnIndex (1)
     × turns single letters into 0 to 25 2ms

 FAIL  columns.test.ts > columnIndex > turns single letters into 0 to 25
TypeError: columnIndex is not a function
 ❯ columns.test.ts:23:12
     21| describe("columnIndex", () => {
     22|   it("turns single letters into 0 to 25", () => {
     23|     expect(columnIndex("A")).toBe(0);
       |            ^
     24|     expect(columnIndex("Z")).toBe(25);
     25|   });
```

Red, and for the right reason: `columnIndex` doesn't exist yet. (`npx tsc` reports the same thing its own way: *Module '"./columns.ts"' has no exported member 'columnIndex'*.)

```check
run "npx vitest run" exit=1 stderr="turns single letters into 0 to 25" label="the new test fails (red)" -- Add the columnIndex test, and don't write columnIndex yet.
```

## Green: the simplest thing that passes

Add `columnIndex` to `columns.ts`, as simple as the test allows:

```typescript file=columns.ts
export function columnName(index: number): string {
  let name = "";
  while (index >= 0) {
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26) - 1;
  }
  return name;
}

export function columnIndex(name: string): number {
  return name.charCodeAt(0) - 65;
}
```

`"A".charCodeAt(0)` is 65 (lesson 3.2), so `A` gives 0 and `Z` gives 25.

```predict
question: What does this simple `columnIndex` give for `"AA"`?
answer: 0
explain: It only looks at the first letter, and `A` is 0. That's why the next test is about two letters: it will fail on exactly this.
verify: node -e "console.log('AA'.charCodeAt(0) - 65)"
``` It's obviously not finished: `"AA"` would give 0. That's deliberate. The tests haven't asked for more yet, and code nobody asked for is code nobody checked.

```text
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

```check
run "npx vitest run" stdout="4 passed" label="green: 4 tests pass"
```

## Red again: two letters

Add a test for the next piece of behaviour, inside the `columnIndex` group:

```typescript file=columns.test.ts
import { describe, expect, it } from "vitest";
import { columnIndex, columnName } from "./columns.ts";

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

describe("columnIndex", () => {
  it("turns single letters into 0 to 25", () => {
    expect(columnIndex("A")).toBe(0);
    expect(columnIndex("Z")).toBe(25);
  });

  it("turns AA into 26", () => {
    expect(columnIndex("AA")).toBe(26);
  });
});
```

```text
 FAIL  columns.test.ts > columnIndex > turns AA into 26
AssertionError: expected +0 to be 26 // Object.is equality

- Expected
+ Received

- 26
+ 0
```

(`+0` is how Vitest writes zero; JavaScript technically has a `+0` and a `-0`.) The simple version looked only at the first letter. Now the test demands more.

```check
run "npx vitest run" exit=1 stderr="turns AA into 26" label="the AA test fails (red)"
```

## Green: letters as digits

Think of the letters as digits in base 26, the way lesson 3.6's challenge did, but now reading the name left to right: each new letter multiplies what you have so far by 26, then adds itself. With `A` counting as 1 (not 0), `AA` is 1 × 26 + 1 = 27, and subtracting 1 at the end gives column 26.

```typescript file=columns.ts
export function columnName(index: number): string {
  let name = "";
  while (index >= 0) {
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26) - 1;
  }
  return name;
}

export function columnIndex(name: string): number {
  let index = 0;
  for (const letter of name) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
}
```

**`for (const letter of name)`** goes through a string one character at a time, like Python's `for letter in name:`. (`for...of` works on arrays too: `for (const item of items)`.)

```text
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

```check
run "npx vitest run" stdout="5 passed" label="green: 5 tests pass"
```

## Refactor the tests: check every column

`columnIndex` should undo `columnName`, for **every** column. A loop in a test can check far more cases than you'd ever type by hand. Add this test to the `columnIndex` group:

```typescript file=columns.test.ts
import { describe, expect, it } from "vitest";
import { columnIndex, columnName } from "./columns.ts";

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

describe("columnIndex", () => {
  it("turns single letters into 0 to 25", () => {
    expect(columnIndex("A")).toBe(0);
    expect(columnIndex("Z")).toBe(25);
  });

  it("turns AA into 26", () => {
    expect(columnIndex("AA")).toBe(26);
  });

  it("undoes columnName for the first 20,000 columns", () => {
    for (let index = 0; index < 20000; index++) {
      expect(columnIndex(columnName(index))).toBe(index);
    }
  });
});
```

Twenty thousand checks, in milliseconds. It also covers both functions at once: if either one broke, the round trip would break.

```check
run "npx vitest run" stdout="6 passed" label="6 tests pass"
page index.html "(async () => { const { columnIndex } = await import('/columns.ts'); return [columnIndex('A'), columnIndex('Z'), columnIndex('AA'), columnIndex('AZ'), columnIndex('BA'), columnIndex('ZZ'), columnIndex('AAA')].join(','); })()" "0,25,26,51,52,701,702" server=vite label="columnIndex is right for A, Z, AA, AZ, BA, ZZ and AAA"
```

## Commit

```powershell
git commit -am "Add columnIndex, test first"
```

```check
git-clean
```

## Your turn: test first, on your own

Use red, green, refactor to write `wordCount(text)`, which counts the words in a piece of text. Words are separated by one or more spaces, and spaces at either end don't count. So:

| Text | Words |
|---|---|
| `"one"` | 1 |
| `"one two three"` | 3 |
| `"  spaced   out  "` | 2 |
| `""` | 0 |

In the playground, with Node's test runner (lesson 6.1's Your turn): write one test in `playground/js/words.check.mjs`, watch it fail, make it pass in `playground/js/words.mjs` (exporting `wordCount`), and repeat, a case at a time. The empty text is the case most first versions get wrong.

```check
run "node --test playground/js/words.check.mjs" label="your tests pass"
run "node -e \"import('./playground/js/words.mjs').then((m) => console.log(JSON.stringify(['one', 'one two three', '  spaced   out  ', ''].map(m.wordCount))))\"" stdout="[1,3,2,0]" label="wordCount is right for all four cases" -- Check the empty text, and text with spaces at the ends.
run "$d = Join-Path $env:TEMP ('m' + (Get-Random)); New-Item -ItemType Directory $d | Out-Null; Copy-Item playground/js/words.check.mjs $d; Set-Content (Join-Path $d 'words.mjs') 'export function wordCount(text) { return text.split(String.fromCharCode(32)).length; }'; node --test (Join-Path $d 'words.check.mjs')" exit=1 label="your tests catch a version that splits on single spaces" -- Test text with several spaces between words, and at the ends.
git-clean -- Commit it: git add playground, then git commit.
```

```hints
nudge: Start with the one-word case, then the case with extra spaces, then the empty text.
concept: `text.trim()` removes the spaces at the ends. `text.split(" ")` splits at every single space, so two spaces in a row leave an empty word between them; `split(/ +/)` splits at runs of spaces instead (a regular expression, as in lesson 6.3's preview). After trimming, empty text needs a case of its own: `"".split(/ +/)` is `[""]`, one empty word.
shape: Trim; if what's left is empty, return 0; otherwise split on runs of spaces and return the length.
answer: ~~~javascript
export function wordCount(text) {
  const trimmed = text.trim();
  if (trimmed === "") {
    return 0;
  }
  return trimmed.split(/ +/).length;
}
~~~
```
