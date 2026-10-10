---
title: 6.3 — Addresses: a Type for a Cell's Position
runtime: none
experiments: Reading an address
teaches: addresses, objects, interfaces, regular expressions, destructuring, toequal, null returns
uses: tests, typescript, test-driven development
---

A cell's position has been two loose numbers, `column` and `row`, passed around separately, and lesson 3.4 showed how easily two numbers get swapped. This lesson gives a position a type of its own, **`Address`**, and two functions: one that writes an address as text (`B3`), and one that reads text back into an address.

Tests first again.

## The tests

The tests are supplied: in a real team, a test file is often the spec you're handed. Click **Create provided address.test.ts** and read every test before any code exists:

```typescript file=address.test.ts provided
import { describe, expect, it } from "vitest";
import { formatAddress, parseAddress } from "./address.ts";

describe("formatAddress", () => {
  it("writes the column letters, then the row counted from 1", () => {
    expect(formatAddress({ column: 0, row: 0 })).toBe("A1");
    expect(formatAddress({ column: 1, row: 2 })).toBe("B3");
    expect(formatAddress({ column: 26, row: 99 })).toBe("AA100");
  });
});

describe("parseAddress", () => {
  it("reads an address", () => {
    expect(parseAddress("B3")).toEqual({ column: 1, row: 2 });
    expect(parseAddress("AA100")).toEqual({ column: 26, row: 99 });
  });

  it("accepts lower-case letters", () => {
    expect(parseAddress("b3")).toEqual({ column: 1, row: 2 });
  });

  it("rejects text that isn't an address", () => {
    expect(parseAddress("3B")).toBeNull();
    expect(parseAddress("B")).toBeNull();
    expect(parseAddress("B0")).toBeNull();
    expect(parseAddress("B3 ")).toBeNull();
    expect(parseAddress("")).toBeNull();
  });

  it("undoes formatAddress", () => {
    for (let column = 0; column < 800; column += 7) {
      for (let row = 0; row < 120; row += 13) {
        const address = { column, row };
        expect(parseAddress(formatAddress(address))).toEqual(address);
      }
    }
  });
});
```

### New in these tests

- **`{ column: 1, row: 2 }`** is an **object**: named values in `{ }`. It's like a Python dictionary with fixed keys, written without quotes around the names. You read a value with a dot: `address.column`.
- **`toEqual`** instead of `toBe`. `toBe` asks "is this the very same thing?"; two objects built separately are never the same thing, even with the same contents. `toEqual` compares the contents. It's Python's `is` versus `==`.
- **`toBeNull()`** checks for `null`: `parseAddress` returns `null` for text that isn't an address, rather than guessing.
- The rejects test is where the decisions are written down: `B0` isn't an address (rows start at 1), and neither is `B3 ` with a space. Tests are a precise description of what the code should do.
- **`{ column, row }`** in the last test is short for `{ column: column, row: row }`.

One of those bullets is worth testing yourself. Predict:

```predict
question: In a test, `expect({ column: 1, row: 2 }).toBe({ column: 1, row: 2 })`: pass or fail?
choice: Pass: they're the same
choice: Fail: they're two different objects
answer: Fail: they're two different objects
explain: `toBe` asks whether both sides are the very same object, and `{ … }` makes a new object each time it runs, so two separately written objects never are. `toEqual` compares what's inside them, which is what a test about addresses means.
verify: node -e "console.log(Object.is({ column: 1, row: 2 }, { column: 1, row: 2 }) ? 'Pass: they\u0027re the same' : 'Fail: they\u0027re two different objects')"
```

Run the tests: `address.test.ts` fails with *Cannot find module './address.ts'*. Red.

```check
file address.test.ts
run "npx vitest run" exit=1 stderr="address.ts" label="the address tests fail: address.ts doesn't exist yet (red)"
```

## address.ts

This step opens `address.ts`. Start with the type, and writing an address as text:

```typescript file=address.ts
import { columnIndex, columnName } from "./columns.ts";

export interface Address {
  column: number;
  row: number;
}

export function formatAddress(address: Address): string {
  return columnName(address.column) + (address.row + 1);
}
```

### interface Address

```typescript
export interface Address {
  column: number;
  row: number;
}
```

An **interface** names the shape of an object: an `Address` is any object with a `column` and a `row`, both numbers. It exists only for TypeScript and disappears from the JavaScript the browser runs. From now on, a function can take one `Address` instead of two numbers, and every place that builds one has to say `column:` and `row:` out loud. `select({ column: r, row: c })` is much harder to write by accident than `select(r, c)`.

Run just the `formatAddress` tests: `-t` (for *test name*) picks the tests whose names contain the text.

```check
run "npx vitest run address -t \"counted from 1\"" stdout="1 passed" label="the formatAddress test passes"
```

## Reading an address {#parse}

Now the other direction: text in, `Address` out, or `null` when the text isn't an address. Add `parseAddress` below `formatAddress`:

```typescript file=address.ts
import { columnIndex, columnName } from "./columns.ts";

export interface Address {
  column: number;
  row: number;
}

export function formatAddress(address: Address): string {
  return columnName(address.column) + (address.row + 1);
}

export function parseAddress(text: string): Address | null {
  const match = /^([A-Z]+)([1-9][0-9]*)$/.exec(text.toUpperCase());
  if (match === null) {
    return null;
  }
  const [, letters, digits] = match;
  if (letters === undefined || digits === undefined) {
    return null;
  }
  return { column: columnIndex(letters), row: Number(digits) - 1 };
}
```

### A regular expression

```typescript
/^([A-Z]+)([1-9][0-9]*)$/
```

is a **regular expression**: a pattern for text. Python has the same thing in its `re` module, with the same pattern language. Between the `/` marks:

- **`^`** and **`$`**: the start and the end of the text. Without them, `"xB3y"` would match.
- **`[A-Z]+`**: one or more (`+`) capital letters.
- **`[1-9][0-9]*`**: a digit from 1 to 9, then any number (`*` means zero or more) of digits. That's what rules out `B0` and `B03`.
- **`( )`**: capture what matched inside, so the letters and the digits can be used separately.

**`.exec(text)`** tries the pattern: it returns `null` if the text doesn't match, otherwise a list whose item 0 is the whole match and items 1 and 2 are the two captured parts. `text.toUpperCase()` first, so `b3` matches too.

### Destructuring, and why the extra check

**`const [, letters, digits] = match;`** unpacks the list into variables, like Python's `_, letters, digits = match`. The leading comma skips item 0.

Then an `if` that can never be true: when the pattern matched, both groups always matched too. Delete those four lines and run both tools:

```text
PS C:\Users\you\Documents\spreadsheet> npx tsc
address.ts:18:32 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.

18   return { column: columnIndex(letters), row: Number(digits) - 1 };
                                  ~~~~~~~


Found 1 error in address.ts:18
```

The tests all pass, but `tsc` complains: `noUncheckedIndexedAccess` (lesson 5.1) says reading item 1 of a list might give `undefined`, and TypeScript doesn't know the pattern's rules. The check tells it. Put the lines back.

```check
run "npx vitest run" stdout="11 passed" label="all 11 tests pass"
run "npx tsc" label="the project type-checks"
page index.html "(async () => { const { parseAddress, formatAddress } = await import('/address.ts'); return JSON.stringify([parseAddress('C7'), parseAddress('zz10'), parseAddress('A01'), parseAddress('A 1'), formatAddress({ column: 51, row: 4 })]); })()" "[{\"column\":2,\"row\":6},{\"column\":701,\"row\":9},null,null,\"AZ5\"]" server=vite label="parseAddress and formatAddress handle C7, zz10, A01, A 1 and AZ5"
```

## Commit

```powershell
git add address.ts address.test.ts
git commit -m "Add the Address type, with formatAddress and parseAddress"
```

```check
git-tracked address.ts
git-tracked address.test.ts
git-clean
```

## Your turn: a pattern of your own

US postal codes (ZIP codes) are five digits, like `12345`, optionally followed by a dash and four more digits, like `12345-6789`. In `playground/js/zip.mjs`, export `isZip(text)`, which says whether a piece of text is a ZIP code, using a regular expression. In `playground/js/zip.check.mjs`, write tests for it with Node's test runner (lesson 6.1's Your turn), including text it must **reject**: four digits, six digits, letters, a dash with only three digits after it, and spaces around the code.

```check
run "node --test playground/js/zip.check.mjs" label="your tests pass"
run "node -e \"import('./playground/js/zip.mjs').then((m) => console.log(JSON.stringify(['12345', '12345-6789', '1234', '123456', 'abcde', '12345-678', ' 12345', '12345 '].map(m.isZip))))\"" stdout="[true,true,false,false,false,false,false,false]" label="isZip accepts the two forms and rejects the rest" -- Anchor the pattern at both ends with ^ and $.
run "$d = Join-Path $env:TEMP ('m' + (Get-Random)); New-Item -ItemType Directory $d | Out-Null; Copy-Item playground/js/zip.check.mjs $d; Set-Content (Join-Path $d 'zip.mjs') 'export function isZip(text) { return /[0-9]{5}/.test(text); }'; node --test (Join-Path $d 'zip.check.mjs')" exit=1 label="your tests catch a pattern that isn't anchored" -- Test text with extra characters: six digits, or spaces around the code.
git-clean -- Commit it: git add playground, then git commit.
```

```hints
nudge: Build the pattern in pieces: five digits; then, optionally, a dash and four digits.
concept: `[0-9]{5}` means exactly five digits. `( … )?` makes a group optional. `^` and `$` pin the pattern to the start and end of the text, or `"x12345y"` would match too. `pattern.test(text)` gives `true` or `false`.
shape: `export function isZip(text) { return /^…$/.test(text); }` with the two pieces inside, then a test for each accepted form and each rejected one.
answer: ~~~javascript
export function isZip(text) {
  return /^[0-9]{5}(-[0-9]{4})?$/.test(text);
}
~~~
```
