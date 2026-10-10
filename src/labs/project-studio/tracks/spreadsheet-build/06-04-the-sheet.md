---
title: 6.4 — The Sheet: a Class for the Data
runtime: none
experiments: Map, and why not a grid of arrays; The class
teaches: classes, this, private fields, maps, sparse storage, nullish coalescing, type-only imports
uses: objects, interfaces, tests
---

Where does the spreadsheet keep what you type? Right now, in the page: the text is in the `<td>` elements, and nowhere else. That's why sprint 3's data vanished on refresh, and it's also why nothing could test it: there's no data without a browser page.

This lesson gives the data a home of its own: a **`Sheet`**, an object that knows what's in every cell and has nothing to do with drawing. The page will draw *from* it (next lesson), and the tests can use it with no page at all.

## Classes, from Python

A `Sheet` is a **class**: a kind of object, defined once, from which you make as many objects as you like. You've used Python classes even if you haven't written one: a Python `list` is a class, and `[]` makes an object of it. Here is a Python class and the TypeScript one this lesson writes, side by side, simplified:

```python
class Sheet:
    def __init__(self):
        self.cells = {}

    def get(self, key):
        return self.cells.get(key, "")
```

```typescript
class Sheet {
  private cells = new Map<string, string>();

  get(key: string): string {
    return this.cells.get(key) ?? "";
  }
}
```

- **Fields**: Python creates `self.cells` in `__init__`. TypeScript lists the class's data at the top: `cells = new Map...` runs for every new `Sheet`.
- **`this`** is Python's `self`. The difference: you don't list it as a parameter, it's just there inside every method.
- **`private`**: only the class's own methods may touch `cells`. Code outside must go through `get` and `set`, so the class decides what's allowed (an empty string removes a cell, for instance) and nobody can break that from outside. Python has no enforced `private`; it relies on a `_` naming convention.
- **`new Sheet()`** makes a sheet, where Python would write `Sheet()`.

## Map, and why not a grid of arrays

The cells live in a **`Map`**: JavaScript's dictionary. Keys go in with `.set(key, value)`, come out with `.get(key)` (`undefined` if missing), and leave with `.delete(key)`. `.size` counts them. `Map<string, string>` says both keys and values are strings: the key is the address as text (`"B3"`), the value is what's typed in the cell.

Why not a 26 × 100 array of arrays, a list of rows like the table itself? Most cells in a spreadsheet are empty. A sheet with something in A1 and something in Z10000 would need 260,000 slots for two values. A map stores only the cells that have something in them. This is called **sparse storage**, and it's why the sheet will be able to grow without a fixed size.

Before you trust that reasoning, one experiment about a map's keys, which explains a design decision coming up:

```predict
question: `const m = new Map(); m.set({ column: 1, row: 2 }, "x");` What does `m.get({ column: 1, row: 2 })` give?
choice: "x"
choice: undefined
answer: undefined
explain: A `Map` compares object keys by identity, like `toBe`, and the second `{ column: 1, row: 2 }` is a different object from the first. So the sheet's map uses the address **as text**, `"B3"`: two equal strings are the same key.
verify: node -e "const m = new Map(); m.set({ column: 1, row: 2 }, 'x'); console.log(m.get({ column: 1, row: 2 }))"
```

Try it yourself in Node's prompt (`node`): set a key, then get it with a new object, then with the same object stored in a variable.

## Tests first

The tests are supplied: click **Create provided sheet.test.ts** and read them:

```typescript file=sheet.test.ts provided
import { describe, expect, it } from "vitest";
import { Sheet } from "./sheet.ts";

describe("Sheet", () => {
  it("starts empty", () => {
    const sheet = new Sheet();
    expect(sheet.get({ column: 1, row: 2 })).toBe("");
    expect(sheet.count()).toBe(0);
  });

  it("gives back what was put in a cell", () => {
    const sheet = new Sheet();
    sheet.set({ column: 1, row: 2 }, "Coffee");
    expect(sheet.get({ column: 1, row: 2 })).toBe("Coffee");
  });

  it("keeps each cell separate", () => {
    const sheet = new Sheet();
    sheet.set({ column: 1, row: 2 }, "Coffee");
    sheet.set({ column: 2, row: 1 }, "3.50");
    expect(sheet.get({ column: 1, row: 2 })).toBe("Coffee");
    expect(sheet.get({ column: 2, row: 1 })).toBe("3.50");
    expect(sheet.count()).toBe(2);
  });

  it("replaces a cell's text", () => {
    const sheet = new Sheet();
    sheet.set({ column: 0, row: 0 }, "Item");
    sheet.set({ column: 0, row: 0 }, "Product");
    expect(sheet.get({ column: 0, row: 0 })).toBe("Product");
    expect(sheet.count()).toBe(1);
  });

  it("forgets a cell set to empty text", () => {
    const sheet = new Sheet();
    sheet.set({ column: 0, row: 0 }, "Item");
    sheet.set({ column: 0, row: 0 }, "");
    expect(sheet.get({ column: 0, row: 0 })).toBe("");
    expect(sheet.count()).toBe(0);
  });
});
```

Each test makes its own `new Sheet()`, so no test can be affected by another's leftovers. The *keeps each cell separate* test uses B3 and C2: the swapped pair, so a sheet that confused columns and rows would fail it.

Run only this file's tests, by giving Vitest part of its name:

```powershell
npx vitest run sheet
```

```text
 FAIL  sheet.test.ts [ sheet.test.ts ]
Error: Cannot find module './sheet.ts' imported from C:/Users/you/Documents/spreadsheet/sheet.test.ts
```

Red.

```check
file sheet.test.ts
run "npx vitest run sheet" exit=1 stderr="sheet.ts" label="the Sheet tests fail: sheet.ts doesn't exist yet (red)"
```

## The class

This step opens `sheet.ts`. A first version: a sheet that stores, gives back and counts cells:

```typescript file=sheet.ts
import { formatAddress, type Address } from "./address.ts";

export class Sheet {
  private cells = new Map<string, string>();

  get(address: Address): string {
    return this.cells.get(formatAddress(address)) ?? "";
  }

  set(address: Address, text: string): void {
    this.cells.set(formatAddress(address), text);
  }

  count(): number {
    return this.cells.size;
  }
}
```

- **`import { formatAddress, type Address }`**: `type` marks `Address` as a type-only import. Types vanish when TypeScript becomes JavaScript, and `type` says so, so no tool tries to import an `Address` that doesn't exist at run time.
- **`this.cells.get(...) ?? ""`**: **`??`** gives the right-hand side when the left is `null` or `undefined`. A cell nobody has typed in comes back as `""`, so the rest of the program never meets `undefined` from a sheet. (Python's dictionary `.get(key, "")` does the same in one call.)

Run the tests: four of the five pass. The one that fails says exactly what's missing, and it's the next step.

```check
run "npx vitest run sheet" exit=1 stdout="4 passed" label="four of the five Sheet tests pass" -- Write get, set and count.
```

## Forgetting emptied cells {#empty}

The failing test sets a cell to empty text and expects it **gone**: `count()` back to 0. Storing `""` keeps it in the map. Make an empty string delete the cell instead:

```typescript file=sheet.ts
import { formatAddress, type Address } from "./address.ts";

export class Sheet {
  private cells = new Map<string, string>();

  get(address: Address): string {
    return this.cells.get(formatAddress(address)) ?? "";
  }

  set(address: Address, text: string): void {
    const key = formatAddress(address);
    if (text === "") {
      this.cells.delete(key);
    } else {
      this.cells.set(key, text);
    }
  }

  count(): number {
    return this.cells.size;
  }
}
```

- **`set` with `""`** deletes the cell instead of storing an empty string: an empty cell is a cell that isn't in the map. That keeps `count()` honest.

```check
run "npx vitest run" stdout="16 passed" label="all 16 tests pass"
run "npx tsc" label="the project type-checks"
page index.html "(async () => { const { Sheet } = await import('/sheet.ts'); const s = new Sheet(); s.set({ column: 1, row: 2 }, 'x'); s.set({ column: 2, row: 1 }, 'y'); s.set({ column: 9, row: 9 }, 'z'); s.set({ column: 9, row: 9 }, ''); return [s.get({ column: 1, row: 2 }), s.get({ column: 2, row: 1 }), s.get({ column: 9, row: 9 }), s.count()].join('|'); })()" "x|y||2" server=vite label="a Sheet keeps B3 and C2 apart and forgets emptied cells"
```

## Commit

```powershell
git add sheet.ts sheet.test.ts
git commit -m "Add the Sheet class"
```

```check
git-tracked sheet.ts
git-clean
```

## Your turn: a class of your own

A **stack** is a data structure you'll meet everywhere (the call stack of lesson 7.2 is one): a pile where the last thing put on is the first taken off. Write `class Stack` in `playground/js/stack.mjs`, exported, with:

- `push(item)`: put an item on top;
- `pop()`: take the top item off and return it, or `undefined` when the stack is empty;
- `peek()`: return the top item without removing it (`undefined` when empty);
- `size()`: how many items there are.

Keep the items in a private array. Test it in `playground/js/stack.check.mjs`, including popping from an empty stack. Commit.

```check
run "node --test playground/js/stack.check.mjs" label="your tests pass"
run "node -e \"import('./playground/js/stack.mjs').then(({ Stack }) => { const s = new Stack(); s.push(1); s.push(2); s.push(3); const out = [s.pop(), s.peek(), s.size(), s.pop(), s.pop(), s.pop(), s.size()]; console.log(JSON.stringify(out)); })\"" stdout="[3,2,2,2,1,null,0]" label="push, pop, peek and size behave as a stack" -- pop takes the last item pushed. Popping an empty stack gives undefined (shown as null).
run "$d = Join-Path $env:TEMP ('m' + (Get-Random)); New-Item -ItemType Directory $d | Out-Null; Copy-Item playground/js/stack.check.mjs $d; Set-Content (Join-Path $d 'stack.mjs') 'export class Stack { items = []; push(x) { this.items.push(x); } pop() { return this.items.shift(); } peek() { return this.items[0]; } size() { return this.items.length; } }'; node --test (Join-Path $d 'stack.check.mjs')" exit=1 label="your tests catch a stack that takes from the bottom" -- Push two or more items, then check which one pop gives back.
git-clean -- Commit it: git add playground, then git commit.
```

```hints
nudge: The array does most of the work; the class decides which end is the top.
concept: An array's `push` adds to the end and its `pop` removes from the end, so the end of the array can be the top of the stack. `items[items.length - 1]` is the last item, `undefined` when there's none. A field written `#items` is private in JavaScript (TypeScript's `private` is the same idea, checked by the compiler).
shape: `export class Stack { #items = []; push(item) { … } pop() { … } peek() { … } size() { … } }`.
answer: ~~~javascript
export class Stack {
  #items = [];

  push(item) {
    this.#items.push(item);
  }

  pop() {
    return this.#items.pop();
  }

  peek() {
    return this.#items[this.#items.length - 1];
  }

  size() {
    return this.#items.length;
  }
}
~~~
```
