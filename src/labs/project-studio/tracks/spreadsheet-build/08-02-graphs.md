---
title: 8.2 — Graphs: Which Cells Read Which
runtime: none
experiments: A graph in code
teaches: graphs, nodes and edges, directed graphs, adjacency lists, spread syntax
uses: recursion, trees, discriminated unions, maps, tests, vitest, playground
---

### The story so far

Lesson 8.1 measured the spreadsheet's recalculation. Showing a sheet with a 100-cell chain of formulas costs 7,550 calls to `cellValue`, because every cell in the chain recalculates every cell above it, and a chain of 1,600 cells crashes with a `RangeError`, the recursion out of call stack. The work is on the `recalc` branch, with the measuring scripts in `bench/`.

### What this lesson builds

The first piece of the fix: knowing, for every formula, **which cells it reads**. Drawn as arrows, a sheet's formulas make a picture called a **graph**:

```text
 A1 = 2          B1 = A1*10        C1 = B1+A1
    ┌──────────────┐
    │              ▼
   A1 ───────▶ B1 ───────▶ C1
```

Each arrow goes from a cell to a cell that reads it: the direction the values flow. In code, the arrows come from one new function, `references`, which looks inside a formula's tree and lists the cells it names:

| formula | `references` gives |
|---|---|
| `=A1*10` | `A1` |
| `=B1+A1` | `B1`, `A1` |
| `=2+3` | nothing |

## Arrows between cells

Here's a sheet small enough to hold in your head:

| cell | holds |
|---|---|
| A1 | `2` |
| B1 | `=A1*10` |
| C1 | `=B1+A1` |

Draw an arrow from a cell to every cell that reads it: A1 → B1 (B1's formula names A1), B1 → C1, and A1 → C1. That's the picture above. When A1 changes, you can follow the arrows out of it to find every cell that has to be worked out again: B1 and C1. When C1 changes, no arrows leave it: nothing else needs work.

Pictures like this are called **graphs**, and they're one of the most useful ideas in computing. The words:

- Each dot (here, each cell) is a **node**.
- Each arrow is an **edge**. Edges with a direction, like these, make a **directed graph**.
- Following edges from node to node is a **path**: A1 → B1 → C1.
- A path that comes back to where it started is a **cycle**. Put `=B1+1` in A1 and A1 → B1 → A1 is a cycle: lesson 7.6's `#CYCLE!`, seen as a picture.

The same picture describes things that have nothing to do with spreadsheets. Courses and their prerequisites. Tasks and what must be done before them. npm packages and the packages they depend on (lesson 4.2). Roads between towns. Learn to work with graphs once, and you can work with all of them, which is why the next few lessons practise each idea on a graph of courses first.

## A graph in code {#courses}

How do you store a graph? The usual way is a list, for each node, of the nodes its edges lead to or come from: an **adjacency list**. In JavaScript, a `Map` from each node to an array. This step opens `playground/graphs/courses.mjs`, a small university's courses, each with the courses it needs first:

```javascript file=playground/graphs/courses.mjs
export const needs = new Map([
  ["Programming 1", []],
  ["Discrete Maths", []],
  ["Programming 2", ["Programming 1"]],
  ["Databases", ["Programming 1"]],
  ["Algorithms", ["Programming 2", "Discrete Maths"]],
  ["Web Apps", ["Programming 2", "Databases"]],
  ["Compilers", ["Algorithms"]],
]);
```

- **`new Map([[key, value], …])`** makes a map from a list of pairs: the same `Map` as the `Sheet`'s (lesson 6.4), filled in one go.
- **Each value is an array of what that course needs.** That's an edge in each entry: "Algorithms needs Discrete Maths". Drawn the way the spreadsheet's arrows are drawn (from what's needed to what needs it), it's Discrete Maths → Algorithms.

Drawn out, the whole graph is:

```text
 Programming 1 ──▶ Programming 2 ──▶ Algorithms ──▶ Compilers
       │                 │               ▲
       ▼                 ▼               │
   Databases ───────▶ Web Apps     Discrete Maths
```

Try it in Node's prompt, from the project folder: `const { needs } = await import("./playground/graphs/courses.mjs")`, then `needs.get("Web Apps")`, and `needs.size` (seven nodes). Count the edges by hand from the picture before the check below counts them in code.

```check
run "node -e \"import('./playground/graphs/courses.mjs').then(({ needs }) => console.log(needs.size, [...needs.values()].reduce((sum, list) => sum + list.length, 0)))\"" stdout="7 7" label="seven courses, joined by seven edges" -- Each course is one entry; each name in a course's array is one edge.
```

## The tests {#tests}

Back to the spreadsheet. The function that finds a formula's edges is supplied with its tests: click **Create provided src/references.test.ts** and read them:

```typescript file=src/references.test.ts provided
import { describe, expect, it } from "vitest";
import { parse } from "./parser.ts";
import { references } from "./references.ts";
import { formatAddress } from "./address.ts";

function readsOf(formula: string): string[] {
  return references(parse(formula)).map(formatAddress);
}

describe("references", () => {
  it("finds no cells in a formula of numbers", () => {
    expect(readsOf("1+2*3")).toEqual([]);
  });

  it("finds a single cell", () => {
    expect(readsOf("B3")).toEqual(["B3"]);
  });

  it("finds every cell, left to right, at any depth", () => {
    expect(readsOf("A1+B2*(C3-D4)")).toEqual(["A1", "B2", "C3", "D4"]);
  });

  it("looks inside negations", () => {
    expect(readsOf("-A1*-(B1)")).toEqual(["A1", "B1"]);
  });

  it("lists a cell once for each time the formula uses it", () => {
    expect(readsOf("A1+A1")).toEqual(["A1", "A1"]);
  });
});
```

`readsOf` parses a formula and turns each address back into text, so the tests can say `"B3"` instead of `{ column: 1, row: 2 }`. **`.map(formatAddress)`** passes the function `formatAddress` itself to `map`, which calls it on each address: the same as `.map((address) => formatAddress(address))`, shorter.

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| finds no cells in a formula of numbers | a formula without cells has no edges | numbers mistaken for cells, so `=2+3` waits for a cell that doesn't exist |
| finds a single cell | the simplest edge | a cell leaf left out, so `=B3` never recalculates when B3 changes |
| finds every cell, left to right, at any depth | the whole tree is searched | a search that stops at the top node, missing `C3` and `D4` inside the brackets: a formula that goes stale when they change |
| looks inside negations | 7.7's new kind of node | `=-A1` never updating, because the search doesn't know `negate` |
| lists a cell once for each time the formula uses it | the function reports what's there, and leaves duplicates for the graph to handle | (a decision more than a bug: whoever stores the edges must not count A1 twice) |

The third test is the one users would notice. A formula that misses an edge doesn't fail: it shows an old value, silently, until something else happens to recalculate it.

```check
file src/references.test.ts
run "npx vitest run references" exit=1 stderr="references.ts" label="the references tests fail: references.ts doesn't exist yet (red)"
```

## Leaves and negations {#leaves}

`references` walks the tree the way `evaluate` does (lesson 7.2): one case for each kind of node, and recursion where a node has children. Start with the cases that have at most one child. This step opens `src/references.ts`:

```typescript file=src/references.ts
import type { Address } from "./address.ts";
import type { Expression } from "./expression.ts";

export function references(expression: Expression): Address[] {
  switch (expression.kind) {
    case "number":
      return [];
    case "cell":
      return [expression.address];
    case "negate":
      return references(expression.operand);
  }
  return [];
}
```

**`references`' input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `expression` | a formula's tree, from `parse` | the tree for `-B3` |
| returns | the addresses of the cells it names, left to right | `[{ column: 1, row: 2 }]` |

- **`number`**: a leaf with no cell in it: an empty list.
- **`cell`**: a leaf that *is* a cell: a list of that one address.
- **`negate`**: whatever its operand reads. Recursion, with one child.
- **`return []` after the `switch`** is temporary. Without a `binary` case, the `switch` doesn't cover every kind, and TypeScript requires the function to return something on every path (lesson 7.2's exhaustiveness). The next step adds the last case and removes it.

```check
run "npx vitest run references -t \"single cell\"" stdout="1 passed" label="a single cell is found"
run "npx vitest run references -t \"numbers\"" stdout="1 passed" label="a formula of numbers reads no cells"
```

## Branches: both sides {#binary}

A `binary` node has two children, and the cells it reads are the left side's, then the right side's. This step finishes `src/references.ts`:

```typescript file=src/references.ts
import type { Address } from "./address.ts";
import type { Expression } from "./expression.ts";

export function references(expression: Expression): Address[] {
  switch (expression.kind) {
    case "number":
      return [];
    case "cell":
      return [expression.address];
    case "negate":
      return references(expression.operand);
    case "binary":
      return [...references(expression.left), ...references(expression.right)];
  }
}
```

**`[...a, ...b]`** is **spread syntax**: `...` lays an array's items out in place, so `[...[1, 2], ...[3]]` is `[1, 2, 3]`, one flat list. (Python: `[*a, *b]`, or `a + b`.) Without the dots, `[a, b]` would be a list of two lists.

Here it is on `A1+B2*C3`, whose tree is `+` with `A1` on the left and `B2*C3` on the right:

| call | returns |
|---|---|
| `references(+)` | waits for both sides |
| `references(A1)` | `[A1]` |
| `references(*)` | waits for both sides |
| `references(B2)` | `[B2]` |
| `references(C3)` | `[C3]` |
| back in `references(*)` | `[...[B2], ...[C3]]` = `[B2, C3]` |
| back in `references(+)` | `[...[A1], ...[B2, C3]]` = `[A1, B2, C3]` |

Now the `switch` covers every kind of `Expression`, and the `return []` that followed it is gone. Before you run the tests, predict:

```predict
question: What does `references` give for the formula `A1+A1`?
choice: One A1
choice: Two A1s
answer: Two A1s
explain: The tree has two `cell` leaves that both happen to be A1, and `references` reports every leaf it finds. Whether "B1 reads A1 twice" should be one edge or two is a decision for whoever builds the graph from these lists: the next lesson's graph keeps each edge once.
verify: node -e "Promise.all([import('./src/parser.ts'), import('./src/references.ts')]).then(([{ parse }, { references }]) => console.log(references(parse('A1+A1')).length === 2 ? 'Two A1s' : 'One A1'))"
```

```check
run "npx vitest run references" stdout="5 passed" label="the 5 references tests pass"
run "npx tsc" label="the project type-checks"
```

## Commit

```powershell
git add playground src/references.ts src/references.test.ts
git commit -m "Find the cells each formula reads"
```

```check
git-tracked src/references.ts
git-clean
```

## Your turn: the most needed course

A university wants to know which course to schedule most often: the one the most other courses need **directly**. In `playground/graphs/most-needed.mjs`, import `needs` from `./courses.mjs`, count for each course how many courses list it as a need, and print the winner in this form:

```text
Databases is needed by 5 courses
```

(Those aren't the right name or number: work them out.) If two courses tie, either may win. Commit.

```hints
nudge: The adjacency list says what each course needs. You want the opposite count: how many times each course *appears* in those lists.
concept: Make a second map, from each course to a number. Go through every course's list of needs, and for each name in it, add one to that name's count. Then find the entry with the biggest count. Counting the edges that arrive at a node is called its **in-degree**.
shape: `const count = new Map();` then `for (const list of needs.values()) for (const need of list) count.set(need, (count.get(need) ?? 0) + 1);` then a loop over `count` keeping the biggest.
answer: ~~~javascript
import { needs } from "./courses.mjs";

const count = new Map();
for (const list of needs.values()) {
  for (const need of list) {
    count.set(need, (count.get(need) ?? 0) + 1);
  }
}

let best = "";
let most = 0;
for (const [course, n] of count) {
  if (n > most) {
    best = course;
    most = n;
  }
}
console.log(`${best} is needed by ${most} courses`);
~~~
```

```check
run "node playground/graphs/most-needed.mjs" stdout="is needed by 2 courses" label="the most needed course is needed by 2 courses" -- Count how many lists each course appears in; the biggest count is 2.
run "node playground/graphs/most-needed.mjs" stdout="Programming" label="and it's one of the two Programming courses" -- Programming 1 and Programming 2 are each needed by two courses.
git-clean -- Commit it: git add playground, then git commit.
```
