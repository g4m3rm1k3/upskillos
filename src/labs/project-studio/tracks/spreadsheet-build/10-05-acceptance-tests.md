---
title: 10.5 — Acceptance Tests
runtime: none
experiments: A test that can't pass yet
teaches: acceptance tests, test todo and skip, tests named after criteria
uses: acceptance criteria, user stories, tests, vitest, describe, expect, record types, object entries, IF, comparison operators, git commit
---

### The story so far

Lesson 10.4 gave every story in `docs/backlog.md` its **acceptance criteria**: examples in the form *Given … when … then …*, with real numbers from the client, including the hard cases: 17.5 eggs that must become 18, Old Town counting in grams, and a stock count exactly at its reorder level. An experiment showed that today's spreadsheet already meets S2's Riverside criterion with `IF`.

### What this lesson builds

The criteria, as code that checks them: **acceptance tests**, in a file of their own. At the end of the lesson Vitest reports where the release stands, story by story:

```text
 src/acceptance/crumb.test.ts

 ✓ S2: Riverside's flour says Order more, its butter nothing       done: passes today
 ✓ S2: exactly at the reorder level says nothing                   done (your turn)
 ↓ S1: 30 brioche need 2,500 g of flour and 18 eggs                skipped: needs ROUNDUP
 □ S2: Old Town's grams      □ S3 import      □ S4 colours      □ S5 phones     to do
```

## Acceptance tests and unit tests {#kinds}

You've written tests since lesson 6.1. Those were **unit tests**: each checks one piece of code, in the code's own terms. Acceptance tests are different:

| | unit tests | acceptance tests |
|---|---|---|
| check | one function or class | a whole story, the way the user meets it |
| written in terms of | the code: `tokenize`, `compare` | the client's words and numbers: Riverside, 8 kg |
| come from | the programmer's design | the acceptance criteria the client agreed |
| fail when | a piece is wrong | the client wouldn't accept the release |

So each test's name is its criterion, with the story's id, and each one works the way a user does: typing text into cells, then reading values out. `src/acceptance/` keeps them apart from the unit tests.

## One test for each criterion {#todo}

Start with a test for each criterion that has nothing in it yet. This step creates `src/acceptance/crumb.test.ts`:

```typescript file=src/acceptance/crumb.test.ts
import { describe, it } from "vitest";

// Crumb & Co.'s acceptance criteria (docs/backlog.md), one test each.
describe("Crumb & Co., release 1", () => {
  it.todo("S1: given the brioche makes 12, when Priya asks for 30, then she needs 2,500 g of flour and 18 eggs");
  it.todo("S2: given Riverside has 8 kg of flour and 12 kg of butter, reordering at 10 kg and 5 kg, then only flour says Order more");
  it.todo("S2: given Old Town counted 5,200 g of flour and reorders at 6 kg, then flour says Order more");
  it.todo("S3: given Riverside's file for 03/02/2024 says flour 8, then the app has 8,000 g on 3 February 2024");
  it.todo("S4: given any page, then the background is #f6efe4 and the headings #3b2a20");
  it.todo("S5: given a phone 375 pixels wide, then every count can be typed without scrolling sideways");
});
```

**`it.todo(name)`** registers a test that hasn't been written yet. Vitest lists it as *todo*, neither passing nor failing: a list of the work, kept where the tests are, and counted every time they run. Six criteria, six todos.

```check
run "npx vitest run src/acceptance" stdout="6 todo" label="six criteria, waiting as todos"
```

## Naming a cell {#at}

Tests in the user's terms want cells by name, `"B2"`, not `{ column: 1, row: 1 }`. This step adds the helper from 8.7's tests:

```typescript file=src/acceptance/crumb.test.ts
import { describe, it } from "vitest";
import { parseAddress, type Address } from "../address.ts";

function at(text: string): Address {
  const address = parseAddress(text);
  if (address === null) {
    throw new Error(`Bad address in a test: ${text}`);
  }
  return address;
}

// Crumb & Co.'s acceptance criteria (docs/backlog.md), one test each.
describe("Crumb & Co., release 1", () => {
  it.todo("S1: given the brioche makes 12, when Priya asks for 30, then she needs 2,500 g of flour and 18 eggs");
  it.todo("S2: given Riverside has 8 kg of flour and 12 kg of butter, reordering at 10 kg and 5 kg, then only flour says Order more");
  it.todo("S2: given Old Town counted 5,200 g of flour and reorders at 6 kg, then flour says Order more");
  it.todo("S3: given Riverside's file for 03/02/2024 says flour 8, then the app has 8,000 g on 3 February 2024");
  it.todo("S4: given any page, then the background is #f6efe4 and the headings #3b2a20");
  it.todo("S5: given a phone 375 pixels wide, then every count can be typed without scrolling sideways");
});
```

**`at`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `text` | a cell's name | `"B2"` |
| returns | its address | `{ column: 1, row: 1 }` |
| or | throws, if the name is wrong | `"B"`: a mistake in the test, not in the code |

```check
run "npx tsc" label="the project type-checks"
```

## A sheet, typed in {#sheet}

Each test sets up a sheet the way a user would, by typing. This step adds a helper that does that from a list of cells:

```typescript file=src/acceptance/crumb.test.ts
import { describe, it } from "vitest";
import { parseAddress, type Address } from "../address.ts";
import { Workbook } from "../workbook.ts";

function at(text: string): Address {
  const address = parseAddress(text);
  if (address === null) {
    throw new Error(`Bad address in a test: ${text}`);
  }
  return address;
}

// A workbook with these cells typed in, the way a user would type them.
function sheet(cells: Record<string, string>): Workbook {
  const book = new Workbook();
  for (const [text, value] of Object.entries(cells)) {
    book.set(at(text), value);
  }
  return book;
}

// Crumb & Co.'s acceptance criteria (docs/backlog.md), one test each.
describe("Crumb & Co., release 1", () => {
  it.todo("S1: given the brioche makes 12, when Priya asks for 30, then she needs 2,500 g of flour and 18 eggs");
  it.todo("S2: given Riverside has 8 kg of flour and 12 kg of butter, reordering at 10 kg and 5 kg, then only flour says Order more");
  it.todo("S2: given Old Town counted 5,200 g of flour and reorders at 6 kg, then flour says Order more");
  it.todo("S3: given Riverside's file for 03/02/2024 says flour 8, then the app has 8,000 g on 3 February 2024");
  it.todo("S4: given any page, then the background is #f6efe4 and the headings #3b2a20");
  it.todo("S5: given a phone 375 pixels wide, then every count can be typed without scrolling sideways");
});
```

**`sheet`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `cells` | cell names and the text typed into each | `{ B2: "8", C2: "10" }` |
| returns | a `Workbook` (8.5) with all of it typed in | `book.value(at("B2"))` is `8` |

- **`Record<string, string>`** is TypeScript's type for an object whose keys and values are all strings.
- **`Object.entries`** gives each `[name, text]` pair, and `book.set` types it in, formulas included.

```check
run "npx tsc" label="the project type-checks"
```

## S2, as a test {#s2}

The first criterion to turn into a real test is the one that already works. This step replaces S2's todo with the test, and imports `expect`:

```typescript file=src/acceptance/crumb.test.ts
import { describe, expect, it } from "vitest";
import { parseAddress, type Address } from "../address.ts";
import { Workbook } from "../workbook.ts";

function at(text: string): Address {
  const address = parseAddress(text);
  if (address === null) {
    throw new Error(`Bad address in a test: ${text}`);
  }
  return address;
}

// A workbook with these cells typed in, the way a user would type them.
function sheet(cells: Record<string, string>): Workbook {
  const book = new Workbook();
  for (const [text, value] of Object.entries(cells)) {
    book.set(at(text), value);
  }
  return book;
}

// Crumb & Co.'s acceptance criteria (docs/backlog.md), one test each.
describe("Crumb & Co., release 1", () => {
  it.todo("S1: given the brioche makes 12, when Priya asks for 30, then she needs 2,500 g of flour and 18 eggs");
  it("S2: given Riverside has 8 kg of flour and 12 kg of butter, reordering at 10 kg and 5 kg, then only flour says Order more", () => {
    const book = sheet({ B2: "8", C2: "10", D2: '=IF(B2<C2, "Order more", "")', B3: "12", C3: "5", D3: '=IF(B3<C3, "Order more", "")' });
    expect(book.value(at("D2"))).toBe("Order more");
    expect(book.value(at("D3"))).toBe("");
  });

  it.todo("S2: given Old Town counted 5,200 g of flour and reorders at 6 kg, then flour says Order more");
  it.todo("S3: given Riverside's file for 03/02/2024 says flour 8, then the app has 8,000 g on 3 February 2024");
  it.todo("S4: given any page, then the background is #f6efe4 and the headings #3b2a20");
  it.todo("S5: given a phone 375 pixels wide, then every count can be typed without scrolling sideways");
});
```

The test is the criterion, line by line:

| criterion | test |
|---|---|
| Given Riverside has 8 kg of flour and reorders at 10 kg | `B2: "8", C2: "10"` |
| (and 12 kg of butter, reordering at 5 kg) | `B3: "12", C3: "5"` |
| when the evening counts are in | `sheet({ … })` works every formula out |
| then flour says Order more | `expect(book.value(at("D2"))).toBe("Order more")` |
| (and butter says nothing) | `expect(book.value(at("D3"))).toBe("")` |

```check
run "npx vitest run src/acceptance" stdout="1 passed | 5 todo" label="S2 passes, the rest are todo"
```

## A test that can't pass yet {#experiment}

S1 needs a function that rounds up, and the spreadsheet doesn't have one. Write the test anyway: it's exactly what the criterion says. This step replaces S1's todo:

```typescript file=src/acceptance/crumb.test.ts
import { describe, expect, it } from "vitest";
import { parseAddress, type Address } from "../address.ts";
import { Workbook } from "../workbook.ts";

function at(text: string): Address {
  const address = parseAddress(text);
  if (address === null) {
    throw new Error(`Bad address in a test: ${text}`);
  }
  return address;
}

// A workbook with these cells typed in, the way a user would type them.
function sheet(cells: Record<string, string>): Workbook {
  const book = new Workbook();
  for (const [text, value] of Object.entries(cells)) {
    book.set(at(text), value);
  }
  return book;
}

// Crumb & Co.'s acceptance criteria (docs/backlog.md), one test each.
describe("Crumb & Co., release 1", () => {
  it("S1: given the brioche makes 12, when Priya asks for 30, then she needs 2,500 g of flour and 18 eggs", () => {
    const book = sheet({ B2: "1000", B3: "7", E1: "30", C2: "=B2*E1/12", C3: "=ROUNDUP(B3*E1/12, 0)" });
    expect(book.value(at("C2"))).toBe(2500);
    expect(book.value(at("C3"))).toBe(18);
  });

  it("S2: given Riverside has 8 kg of flour and 12 kg of butter, reordering at 10 kg and 5 kg, then only flour says Order more", () => {
    const book = sheet({ B2: "8", C2: "10", D2: '=IF(B2<C2, "Order more", "")', B3: "12", C3: "5", D3: '=IF(B3<C3, "Order more", "")' });
    expect(book.value(at("D2"))).toBe("Order more");
    expect(book.value(at("D3"))).toBe("");
  });

  it.todo("S2: given Old Town counted 5,200 g of flour and reorders at 6 kg, then flour says Order more");
  it.todo("S3: given Riverside's file for 03/02/2024 says flour 8, then the app has 8,000 g on 3 February 2024");
  it.todo("S4: given any page, then the background is #f6efe4 and the headings #3b2a20");
  it.todo("S5: given a phone 375 pixels wide, then every count can be typed without scrolling sideways");
});
```

Before you run the tests, predict:

```predict
question: What will C3 be, when the test reads it?
choice: 18
choice: 17.5
choice: an error: #NAME?
answer: an error: #NAME?
explain: There's no `ROUNDUP` in the registry, so the call is an unknown name, and 9.2 made that `#NAME?`. The test is right and the code isn't there yet: a failing acceptance test is the most exact description of the work left that you can write.
verify: node -e "import('./src/workbook.ts').then(({ Workbook }) => { const b = new Workbook(); b.set({ column: 0, row: 0 }, '=ROUNDUP(17.5, 0)'); console.log('an error: ' + b.value({ column: 0, row: 0 }).error); })"
```

Run them: `npx vitest run src/acceptance`. One fails: `expected { error: '#NAME?' } to be 18`.

```check
run "npx vitest run src/acceptance" exit=1 stdout="1 failed" label="S1 fails: ROUNDUP doesn't exist yet"
```

## Skipped, until it's picked up {#skip}

A failing test can't stay like this. If `npx vitest run` is always red, nobody notices when something *else* breaks: the one failure everyone expects hides every new one. But deleting the test would lose the criterion. So it's marked **skipped**, with `it.skip`, until the story is picked up. This step changes S1's `it` to `it.skip`:

```typescript file=src/acceptance/crumb.test.ts
import { describe, expect, it } from "vitest";
import { parseAddress, type Address } from "../address.ts";
import { Workbook } from "../workbook.ts";

function at(text: string): Address {
  const address = parseAddress(text);
  if (address === null) {
    throw new Error(`Bad address in a test: ${text}`);
  }
  return address;
}

// A workbook with these cells typed in, the way a user would type them.
function sheet(cells: Record<string, string>): Workbook {
  const book = new Workbook();
  for (const [text, value] of Object.entries(cells)) {
    book.set(at(text), value);
  }
  return book;
}

// Crumb & Co.'s acceptance criteria (docs/backlog.md), one test each.
describe("Crumb & Co., release 1", () => {
  it.skip("S1: given the brioche makes 12, when Priya asks for 30, then she needs 2,500 g of flour and 18 eggs", () => {
    const book = sheet({ B2: "1000", B3: "7", E1: "30", C2: "=B2*E1/12", C3: "=ROUNDUP(B3*E1/12, 0)" });
    expect(book.value(at("C2"))).toBe(2500);
    expect(book.value(at("C3"))).toBe(18);
  });

  it("S2: given Riverside has 8 kg of flour and 12 kg of butter, reordering at 10 kg and 5 kg, then only flour says Order more", () => {
    const book = sheet({ B2: "8", C2: "10", D2: '=IF(B2<C2, "Order more", "")', B3: "12", C3: "5", D3: '=IF(B3<C3, "Order more", "")' });
    expect(book.value(at("D2"))).toBe("Order more");
    expect(book.value(at("D3"))).toBe("");
  });

  it.todo("S2: given Old Town counted 5,200 g of flour and reorders at 6 kg, then flour says Order more");
  it.todo("S3: given Riverside's file for 03/02/2024 says flour 8, then the app has 8,000 g on 3 February 2024");
  it.todo("S4: given any page, then the background is #f6efe4 and the headings #3b2a20");
  it.todo("S5: given a phone 375 pixels wide, then every count can be typed without scrolling sideways");
});
```

| | runs? | Vitest shows | use it for |
|---|---|---|---|
| `it` | yes | passed or failed | a test that must pass now |
| `it.skip` | no | skipped | a written test waiting for its story to be built |
| `it.todo` | (no code) | todo | a criterion nobody has written as a test yet |

Old Town's criterion stays a todo: it needs amounts in grams, which come in with S3's import.

```check
run "npx vitest run src/acceptance" stdout="1 passed | 1 skipped | 4 todo" label="S2 passes, S1 is skipped until its story starts"
run "npx vitest run" stdout="97 passed | 1 skipped | 4 todo" label="the whole project is green: nothing fails"
```

## Commit

```powershell
git add src
git commit -m "Acceptance tests for Crumb & Co."
```

```check
git-clean
```

## Your turn: exactly at the reorder level

10.4 found a hard case: Maya said a shop orders more when stock is *below* its reorder level, so exactly 10 kg against a reorder level of 10 kg says nothing. Add it to `crumb.test.ts` as an S2 test, after the first one, with the same formula. Check that it passes, then commit.

```hints
nudge: Copy the S2 test's shape: `sheet({ … })` with a count, a level and the formula, then one `expect`.
concept: The situation is B2 and C2 both `"10"`. The formula is the same `=IF(B2<C2, "Order more", "")`. The result to expect is `""`. If you'd written `<=` in the formula, this is the test that would catch it.
shape: `it("S2: given exactly 10 kg of flour and a reorder level of 10 kg, then flour says nothing", () => { const book = sheet({ … }); expect(book.value(at("D2"))).toBe(""); });`
answer: ~~~typescript
  it("S2: given exactly 10 kg of flour and a reorder level of 10 kg, then flour says nothing", () => {
    const book = sheet({ B2: "10", C2: "10", D2: '=IF(B2<C2, "Order more", "")' });
    expect(book.value(at("D2"))).toBe("");
  });
~~~
```

```check
run "npx vitest run src/acceptance" stdout="2 passed | 1 skipped | 4 todo" label="two S2 tests pass" -- Add an it(…) test with B2 and C2 both "10", expecting "".
git-clean -- Commit it: git add src, then git commit.
```
