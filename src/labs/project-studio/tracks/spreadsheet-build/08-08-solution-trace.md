---
title: 8.8 — Solution: Where Does This Number Come From?
runtime: none
experiments: Reading order
teaches: functions as parameters, generalising code
uses: tracing precedents and dependents, comparison functions, graph traversal, graphs, private fields, dom, classlist, design tokens, playground
---

### The story so far

The challenge (8.7) asked for Excel's *Trace Precedents* and *Trace Dependents*: `book.precedents(address)` and `book.dependents(address)`, in reading order, with the page shading both when a cell is selected, and a 10,000-cell chain traced in under 100 ms without running out of stack. Five supplied tests checked it, and the sprint was merged into `main` and pushed.

### What this lesson builds

Nothing new in the project: one solution, about forty lines across four files, and the reasoning behind each part. If yours passed, keep it, and compare:

| file | what changes |
|---|---|
| `graph.ts` | `downstream` and a new `upstream` share one traversal, `reachable`, which takes the direction as a function |
| `workbook.ts` | `precedents` and `dependents`, one line each, and a `readingOrder` helper |
| `grid.ts` | `trace`, called at the end of `select`, and `mark` |
| `style.css` | two colour tokens and two rules |

## One traversal, two directions {#reachable}

`downstream` follows `readersOf`; precedents need the same search following `readsOf`. Writing the loop twice would mean two copies to keep in step. Instead, the loop moves into one private method, and the direction becomes a parameter, **a function**. In `src/graph.ts`, `downstream` becomes:

```typescript
  downstream(cell: string): Set<string> {
    return this.reachable(cell, (current) => this.readersOf(current));
  }

  upstream(cell: string): Set<string> {
    return this.reachable(cell, (current) => this.readsOf(current));
  }

  private reachable(cell: string, next: (cell: string) => Set<string>): Set<string> {
    const found = new Set<string>();
    const toVisit = [cell];
    let current = toVisit.pop();
    while (current !== undefined) {
      for (const other of next(current)) {
        if (!found.has(other)) {
          found.add(other);
          toVisit.push(other);
        }
      }
      current = toVisit.pop();
    }
    return found;
  }
```

**`reachable`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `cell` | where to start | `"B1"` |
| input `next` | a function: given a cell, the cells one edge away in the direction wanted | `(current) => this.readsOf(current)` |
| returns | every cell reachable from `cell` through `next`, at any distance | for B1 in the brief's sheet, `{"A2", "C3", "A1"}` |

- **`next: (cell: string) => Set<string>`** is the type of a function, as `valueAt` was in 7.2. Inside the loop, `next(current)` asks it which cells come next.
- **`(current) => this.readsOf(current)`** is the arrow function `upstream` passes in. It uses `this` from the class, which an arrow function keeps from where it was written.
- **`downstream` and `upstream` are now one line each**, and say only what's different about them: which edges to follow.

Passing behaviour in as a function is how you avoid copying code that differs in one step. You've used it since sprint 3: `addEventListener` takes the function to run, and `sort` takes the comparison.

## Reading order {#reading-order}

A cell's name sorted as text puts `A10` before `A2`, and `A2` before `B1`. Before reading the solution, predict:

```predict
question: What does `["B1", "A2", "A10"].sort()` give, with no comparison function?
choice: ["B1", "A2", "A10"]
choice: ["A10", "A2", "B1"]
choice: ["A2", "A10", "B1"]
answer: ["A10", "A2", "B1"]
explain: Without a comparison function, `sort` compares the names as text, character by character: `A` before `B`, then `1` before `2`, so `A10` sorts before `A2`. Reading order wants B1 first (row 1), then A2, then A10.
verify: node -e "console.log(JSON.stringify(['B1', 'A2', 'A10'].sort()).replace(/,/g, ', '))"
```

In `src/workbook.ts`, the two new methods each find the cells and sort them, and the sorting is a function of its own, outside the class:

```typescript
  precedents(address: Address): string[] {
    return readingOrder(this.graph.upstream(formatAddress(address)));
  }

  dependents(address: Address): string[] {
    return readingOrder(this.graph.downstream(formatAddress(address)));
  }
```

```typescript
// Cell names sorted as people read a sheet: row by row, and left to right along each row.
function readingOrder(cells: Set<string>): string[] {
  const position = (cell: string): number => {
    const address = parseAddress(cell);
    return address === null ? 0 : address.row * 100000 + address.column;
  };
  return [...cells].sort((a, b) => position(a) - position(b));
}
```

**`readingOrder`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `cells` | cell names, in any order | `{"A10", "B1", "A2"}` |
| returns | the same names, row by row, left to right | `["B1", "A2", "A10"]` |

**`position`** turns a name into one number that sorts the right way: the row times 100,000, plus the column. A sheet has at most 18,278 columns (to `ZZZ`), fewer than 100,000, so a later row always gives a bigger number than any column in an earlier one. Then the comparison is a subtraction:

| name | row | column | `position` |
|---|---|---|---|
| `B1` | 0 | 1 | 1 |
| `A2` | 1 | 0 | 100,000 |
| `A10` | 9 | 0 | 900,000 |

Sorting 9,999 names this way takes a few milliseconds, well inside the brief's 100 ms. The chain test's whole trace (the traversal and the sort) measured under 20 ms when this lesson was written.

## Shading on the page {#page}

In `src/grid.ts`, `select` ends with `trace(address);`, and two functions do the work:

```typescript
// Marks the cells the selected cell's value comes from, and the cells that depend on it.
function trace(address: Address): void {
  for (const cell of body.querySelectorAll("td.precedent, td.dependent")) {
    cell.classList.remove("precedent", "dependent");
  }
  for (const key of book.precedents(address)) {
    mark(key, "precedent");
  }
  for (const key of book.dependents(address)) {
    mark(key, "dependent");
  }
}

function mark(key: string, kind: string): void {
  const address = parseAddress(key);
  if (address !== null) {
    cellAt(address)?.classList.add(kind);
  }
}
```

**The two functions, their inputs, and what they give back:**

| function | inputs | returns | example |
|---|---|---|---|
| `trace` | the selected address | nothing; clears all shading, then shades the cell's precedents and dependents | `trace(A2)` shades A1 and B1 |
| `mark` | a cell's name, and a class to add | nothing; adds the class, if the cell is on the grid | `mark("B1", "dependent")` |

- **`body.querySelectorAll("td.precedent, td.dependent")`** finds every cell that was shaded for the last selection: a selector with a comma matches either kind. `classList.remove` takes both names at once.
- **`cellAt(address)?.`**: a formula can name a cell that isn't drawn (say `=A500`), and `?.` (lesson 5.2) skips it.

And in `src/style.css`, two tokens on `:root`, `--precedent-bg: #e8f0fe` (a pale blue) and `--dependent-bg: #fdf0dc` (a pale orange), with:

```css
td.precedent {
  background: var(--precedent-bg);
}

td.dependent {
  background: var(--dependent-bg);
}
```

Both are pale, so the cells' text stays as readable as on white.

## Your turn: reachable, for anything

`reachable` in `graph.ts` works on cells. The idea works on any graph, and the playground's two traversals of 8.3 (`downstream.mjs` and your `all-needs.mjs`) are each a copy of it. In `playground/graphs/reach.mjs`, write and export `reachable(start, next)`: everything reachable from `start`, where `next` is a function giving the nodes one step away. Return an array. Then, in the same file, print everything downstream of `Programming 1` and everything `Compilers` needs, each sorted, using `reachable` with the right `next` for each. Commit.

```hints
nudge: Copy the loop from `downstream.mjs`, and replace the one line that knows about courses.
concept: The loop is the same for every graph: a to-visit list, a found set, and for each node visited, the nodes `next(node)` gives. Only `next` knows what the graph is. For the courses, `(course) => neededBy.get(course) ?? []` goes forwards, and `(course) => needs.get(course) ?? []` goes backwards.
shape: `export function reachable(start, next) { const found = new Set(); const toVisit = [start]; let current = toVisit.pop(); while (current !== undefined) { for (const other of next(current)) { … } current = toVisit.pop(); } return [...found]; }`
answer: ~~~javascript
import { needs } from "./courses.mjs";
import { neededBy } from "./needed-by.mjs";

export function reachable(start, next) {
  const found = new Set();
  const toVisit = [start];
  let current = toVisit.pop();
  while (current !== undefined) {
    for (const other of next(current)) {
      if (!found.has(other)) {
        found.add(other);
        toVisit.push(other);
      }
    }
    current = toVisit.pop();
  }
  return [...found];
}

console.log(reachable("Programming 1", (course) => neededBy.get(course) ?? []).sort());
console.log(reachable("Compilers", (course) => needs.get(course) ?? []).sort());
~~~
```

```check
run "node -e \"import('./playground/graphs/reach.mjs').then(({ reachable }) => console.log('[' + reachable(0, (n) => (n < 5 ? [n + 1, n + 2] : [])).sort().join(',') + ']'))\"" stdout="[1,2,3,4,5,6]" label="reachable works on any graph, given its next function: here, numbers" -- Take the graph only through next: call next(current) for the nodes one step on.
run "node -e \"import('./playground/graphs/reach.mjs').then(({ reachable }) => console.log('[' + reachable(0, (n) => [(n + 1) % 3]).sort().join(',') + ']'))\"" stdout="[0,1,2]" label="it finishes on a graph that's one big cycle, and finds the start node again" -- The found set stops it going round forever.
run "node playground/graphs/reach.mjs" stdout="[ 'Algorithms', 'Discrete Maths', 'Programming 1', 'Programming 2' ]" label="it prints everything Compilers needs" -- Use needs, not neededBy, to go backwards from Compilers.
git-clean -- Commit it: git add playground, then git commit.
```
