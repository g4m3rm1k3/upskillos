---
title: 8.3 — Reverse Edges and Everything Downstream
runtime: none
experiments: Turning the arrows round; Everything downstream
teaches: reversing a graph, graph traversal, depth-first search, visited sets, explicit stacks
uses: graphs, adjacency lists, maps, sets, classes, private fields, recursion, call stack, tests, vitest, playground
---

### The story so far

The spreadsheet's formulas make a **graph** (8.2): each cell is a node, and an edge goes from a cell to each cell that reads it. `references(expression)` lists the cells a formula reads, by walking its tree. In the playground, `courses.mjs` stores a graph of courses as an **adjacency list**: a `Map` from each course to the courses it needs.

### What this lesson builds

Two questions every spreadsheet edit asks, answered with a class, `DependencyGraph`, in `src/graph.ts`:

| question | method | for A1 → B1 → C1 |
|---|---|---|
| which cells does this cell read? | `readsOf("C1")` | `B1` |
| which cells read this one? | `readersOf("A1")` | `B1` |
| which cells depend on this one, directly **or through others**? | `downstream("A1")` | `B1`, `C1` |

The last one is the list of cells to recalculate after an edit. Finding it means **traversing** the graph: following edges from node to node until there's nowhere new to go. It's done with a loop, not recursion, so a chain as long as the grid can't overflow the call stack.

## Turning the arrows round {#reverse}

The course graph says, for each course, what it **needs**. The spreadsheet needs the opposite question: when A1 changes, what **reads** it? For the courses: if Programming 1 is cancelled, which courses need it directly? Answering that from `needs` means searching every course's list for "Programming 1". Asked once, that's fine; asked after every edit, for every cell, it's slow. So keep a second map, with every edge turned round. This step opens `playground/graphs/needed-by.mjs`:

```javascript file=playground/graphs/needed-by.mjs
import { needs } from "./courses.mjs";

export const neededBy = new Map();
for (const [course, list] of needs) {
  for (const need of list) {
    const others = neededBy.get(need) ?? [];
    others.push(course);
    neededBy.set(need, others);
  }
}

console.log(neededBy.get("Programming 1"));
```

Here's the loop on the first three courses. Each edge "*course* needs *need*" becomes an entry the other way round, "*need* is needed by *course*":

| course | its needs | `neededBy` afterwards |
|---|---|---|
| Programming 1 | none | (empty) |
| Discrete Maths | none | (empty) |
| Programming 2 | Programming 1 | Programming 1 → [Programming 2] |
| Databases | Programming 1 | Programming 1 → [Programming 2, Databases] |

- **`for (const [course, list] of needs)`** goes through a map's entries, each a `[key, value]` pair, unpacked by destructuring (lesson 6.3).
- **`neededBy.get(need) ?? []`** gives the list so far, or a new empty one the first time a course is seen. The array is changed in place by `push`, then stored.

Run it with `node playground/graphs/needed-by.mjs`. Every edge is still there exactly once; it's just filed under the other end. This is called **reversing** the graph, and the spreadsheet will keep both directions at once: what each cell reads, and what reads it.

```check
run "node playground/graphs/needed-by.mjs" stdout="[ 'Programming 2', 'Databases' ]" label="Programming 1 is needed by Programming 2 and Databases" -- For every course, add it to the neededBy list of each course it needs.
```

## Everything downstream {#downstream}

If Programming 1 is cancelled, Programming 2 and Databases can't run, and nor can anything that needs **them**, and so on. That whole set is everything **downstream** of Programming 1. Before any code, predict:

```predict
question: If Programming 1 is cancelled, how many of the other six courses can't run?
choice: 2
choice: 4
choice: 5
answer: 5
explain: Programming 2 and Databases need it directly. Algorithms and Web Apps need Programming 2, and Compilers needs Algorithms. Only Discrete Maths, which needs nothing, survives. Following edges outward until there's nowhere new to go finds all five.
verify: node playground/graphs/downstream.mjs | Select-String -Quiet 'Compilers' | ForEach-Object { if ($_) { '5' } }
```

The method: keep a list of courses **to visit**, starting with Programming 1, and a set of courses **found**. Take a course off the list; every course that needs it and hasn't been found yet is found, and goes on the list to visit in turn. When the list is empty, everything downstream has been found. This step opens `playground/graphs/downstream.mjs`:

```javascript file=playground/graphs/downstream.mjs
import { neededBy } from "./needed-by.mjs";

const found = new Set();
const toVisit = ["Programming 1"];
let current = toVisit.pop();
while (current !== undefined) {
  for (const next of neededBy.get(current) ?? []) {
    if (!found.has(next)) {
      found.add(next);
      toVisit.push(next);
    }
  }
  current = toVisit.pop();
}
console.log([...found]);
```

**`toVisit.pop()`** takes the last item off the array and returns it, or `undefined` when the array is empty: that's what ends the loop. Here's every pass:

| pass | `current` | found new | `toVisit` afterwards |
|---|---|---|---|
| 1 | Programming 1 | Programming 2, Databases | Programming 2, Databases |
| 2 | Databases | Web Apps | Programming 2, Web Apps |
| 3 | Web Apps | (none) | Programming 2 |
| 4 | Programming 2 | Algorithms (Web Apps is already found) | Algorithms |
| 5 | Algorithms | Compilers | Compilers |
| 6 | Compilers | (none) | (empty) |

Then `pop` gives `undefined`, and the loop ends with five courses found.

- **The `found` set** is what makes it finish. Web Apps is reached twice, from Databases and from Programming 2, and is visited only once. Without the check, a cycle would send the loop round forever: 7.6's "cells in progress" set, doing the same job.
- **Taking from the end** of the list, as `pop` does, goes deep first: from Databases straight on to Web Apps before coming back for Programming 2. This is **depth-first search**. Taking from the front instead (`shift`) would visit everything one edge away, then two, and so on: **breadth-first search**. For finding *everything* downstream, either works.
- **No recursion.** The list `toVisit` does the job the call stack did in `cellValue`. A list can hold millions of items; the call stack ran out at about 1,600 cells (8.1).

```check
run "node playground/graphs/downstream.mjs" stdout="Compilers" label="everything downstream of Programming 1 is found, Compilers included"
run "node -e \"import('./playground/graphs/downstream.mjs')\"" stdout="'Programming 2'" label="and nothing is missed, Programming 2 included" -- Push every newly found course onto toVisit, so its own dependants are visited too.
```

## The tests {#tests}

Now the same two ideas for cells. The tests for the whole `DependencyGraph` are supplied, including two for the next lesson: click **Create provided src/graph.test.ts** and read them:

```typescript file=src/graph.test.ts provided
import { describe, expect, it } from "vitest";
import { DependencyGraph } from "./graph.ts";

// B1 reads A1, C1 reads B1: the chain A1 → B1 → C1.
function chain(): DependencyGraph {
  const graph = new DependencyGraph();
  graph.setReads("B1", ["A1"]);
  graph.setReads("C1", ["B1"]);
  return graph;
}

describe("DependencyGraph", () => {
  it("records what each cell reads, and the reverse: who reads it", () => {
    const graph = chain();
    expect([...graph.readsOf("C1")]).toEqual(["B1"]);
    expect([...graph.readersOf("A1")]).toEqual(["B1"]);
    expect([...graph.readersOf("C1")]).toEqual([]);
  });

  it("forgets the old edges when a formula changes", () => {
    const graph = chain();
    graph.setReads("C1", ["A1"]);
    expect([...graph.readersOf("B1")]).toEqual([]);
    expect([...graph.readersOf("A1")].sort()).toEqual(["B1", "C1"]);
  });

  it("finds everything downstream of a cell, and nothing else", () => {
    const graph = chain();
    graph.setReads("D9", ["Z1"]);
    expect([...graph.downstream("A1")].sort()).toEqual(["B1", "C1"]);
    expect([...graph.downstream("C1")]).toEqual([]);
  });

  it("orders cells so each comes after everything it reads", () => {
    const graph = chain();
    graph.setReads("D1", ["A1", "C1"]);
    const { ordered, cyclic } = graph.order(new Set(["D1", "C1", "B1", "A1"]));
    expect(ordered).toEqual(["A1", "B1", "C1", "D1"]);
    expect(cyclic).toEqual([]);
  });

  it("leaves cells in a cycle, and cells downstream of it, out of the order", () => {
    const graph = new DependencyGraph();
    graph.setReads("A1", ["B1"]);
    graph.setReads("B1", ["A1"]);
    graph.setReads("C1", ["B1"]);
    graph.setReads("D1", []);
    const { ordered, cyclic } = graph.order(new Set(["A1", "B1", "C1", "D1"]));
    expect(ordered).toEqual(["D1"]);
    expect(cyclic.sort()).toEqual(["A1", "B1", "C1"]);
  });
});
```

The graph names cells by text, `"A1"`, not by `Address` objects: a `Set` or a `Map` compares objects by identity (lesson 6.4's experiment), and two `{ column: 0, row: 0 }` objects are different keys. `[...set]` spreads a set into an array, so `toEqual` can compare it. `.sort()` is there where the order doesn't matter.

### What each test protects

| test | protects | the bug it would catch |
|---|---|---|
| records what each cell reads, and the reverse | both directions, kept from one call | a graph that only knows one direction, so finding what reads A1 means searching every cell |
| forgets the old edges when a formula changes | editing a formula moves its edges | C1 changed from `=B1` to `=A1`, but B1 still listed as read by C1: C1 recalculated after every change to B1, forever |
| finds everything downstream of a cell, and nothing else | the traversal, and only it | a cell unrelated to the edit (D9) recalculated anyway, or C1 missed because it's two steps away |
| orders cells… | lesson 8.4 | |
| leaves cells in a cycle… out of the order | lesson 8.4 | |

The second test is the subtle one. A stale edge doesn't show up as a wrong number; it shows up as wasted work, and as the wrong cells being recalculated, which is how real spreadsheets have gone slow.

```check
file src/graph.test.ts
run "npx vitest run graph" exit=1 stderr="graph.ts" label="the graph tests fail: graph.ts doesn't exist yet (red)"
```

## What a cell reads {#reads}

Start with one direction: what each cell reads. This step opens `src/graph.ts`:

```typescript file=src/graph.ts
export class DependencyGraph {
  private reads = new Map<string, Set<string>>();

  setReads(cell: string, cells: string[]): void {
    this.reads.set(cell, new Set(cells));
  }

  readsOf(cell: string): Set<string> {
    return this.reads.get(cell) ?? new Set();
  }
}
```

**The methods so far, their inputs, and what they give back:**

| method | inputs | returns | example, for the chain |
|---|---|---|---|
| `setReads` | a cell, and the cells its formula reads | nothing; stores them | `setReads("C1", ["B1"])` |
| `readsOf` | a cell | the set of cells it reads; empty for a cell that reads nothing | `readsOf("C1")` is `{"B1"}` |

- **`Map<string, Set<string>>`**: each cell's key leads to a **set** of the cells it reads. A set keeps each cell once, so `=A1+A1` (two A1s, from 8.2's `references`) is one edge.
- **`setReads` replaces** what was there: a formula that changes says everything it reads, afresh.

```check
run "node -e \"import('./src/graph.ts').then(({ DependencyGraph }) => { const g = new DependencyGraph(); g.setReads('B1', ['A1', 'A1']); console.log(JSON.stringify([...g.readsOf('B1')]), JSON.stringify([...g.readsOf('Z9')])); })\"" stdout="[\"A1\"] []" label="a cell read twice is one edge, and an unknown cell reads nothing" -- Store new Set(cells), and give back an empty Set for a cell that isn't stored.
```

## Who reads a cell {#readers}

Now the other direction, kept up to date by the same `setReads` call. This step changes `src/graph.ts`:

```typescript file=src/graph.ts
export class DependencyGraph {
  private reads = new Map<string, Set<string>>();
  private readers = new Map<string, Set<string>>();

  setReads(cell: string, cells: string[]): void {
    for (const old of this.reads.get(cell) ?? []) {
      this.readers.get(old)?.delete(cell);
    }
    const now = new Set(cells);
    this.reads.set(cell, now);
    for (const other of now) {
      const readers = this.readers.get(other) ?? new Set<string>();
      readers.add(cell);
      this.readers.set(other, readers);
    }
  }

  readsOf(cell: string): Set<string> {
    return this.reads.get(cell) ?? new Set();
  }

  readersOf(cell: string): Set<string> {
    return this.readers.get(cell) ?? new Set();
  }
}
```

**`readersOf`'s input, and what it gives back:**

| | what it is | example, for the chain |
|---|---|---|
| input `cell` | a cell | `"A1"` |
| returns | the set of cells whose formulas read it | `{"B1"}` |

`setReads` now does three things, in order. Here it is changing C1 from `=B1` to `=A1`, the second test:

| part | what it does | `readers` afterwards |
|---|---|---|
| before | | A1 → {B1}, B1 → {C1} |
| the first loop: forget the old edges | C1 used to read B1, so take C1 out of B1's readers | A1 → {B1}, B1 → {} |
| store what C1 reads now | `reads`: C1 → {A1} | (unchanged) |
| the second loop: add the new edges | C1 reads A1, so add C1 to A1's readers | A1 → {B1, C1}, B1 → {} |

This is the same reversing as `needed-by.mjs`, done one formula at a time, as formulas change. The two maps must always agree, and only `setReads` changes them, which is why both are `private` (lesson 6.4): no other code can update one and forget the other.

```check
run "npx vitest run graph -t \"who reads it\"" stdout="1 passed" label="what each cell reads, and who reads it, are both recorded"
run "npx vitest run graph -t \"forgets the old edges\"" stdout="1 passed" label="changing a formula moves its edges" -- Before storing the new reads, take the cell out of the readers of everything it used to read.
```

## Everything downstream of a cell {#cells-downstream}

And the traversal, exactly the playground's, with `readersOf` for `neededBy`. This step adds to `src/graph.ts`:

```typescript file=src/graph.ts
export class DependencyGraph {
  private reads = new Map<string, Set<string>>();
  private readers = new Map<string, Set<string>>();

  setReads(cell: string, cells: string[]): void {
    for (const old of this.reads.get(cell) ?? []) {
      this.readers.get(old)?.delete(cell);
    }
    const now = new Set(cells);
    this.reads.set(cell, now);
    for (const other of now) {
      const readers = this.readers.get(other) ?? new Set<string>();
      readers.add(cell);
      this.readers.set(other, readers);
    }
  }

  readsOf(cell: string): Set<string> {
    return this.reads.get(cell) ?? new Set();
  }

  readersOf(cell: string): Set<string> {
    return this.readers.get(cell) ?? new Set();
  }

  downstream(cell: string): Set<string> {
    const found = new Set<string>();
    const toVisit = [cell];
    let current = toVisit.pop();
    while (current !== undefined) {
      for (const reader of this.readersOf(current)) {
        if (!found.has(reader)) {
          found.add(reader);
          toVisit.push(reader);
        }
      }
      current = toVisit.pop();
    }
    return found;
  }
}
```

**`downstream`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `cell` | the cell that changed | `"A1"` |
| returns | every cell that reads it, directly or through other cells; not the cell itself, unless it's in a cycle | `{"B1", "C1"}` for the chain |

The "unless" is worth a moment. If A1 reads B1 and B1 reads A1, then starting from A1: B1 reads it, so B1 is found; A1 reads B1, so **A1** is found. A cell that turns up downstream of itself is in a cycle, which the next lesson uses.

Try it on a long chain, the case that crashed `cellValue` in 8.1. In Node's prompt: `const { DependencyGraph } = await import("./src/graph.ts")`, then build a chain of 100,000 cells with `const g = new DependencyGraph(); for (let i = 1; i < 100000; i++) g.setReads("A" + (i + 1), ["A" + i]);` and ask `g.downstream("A1").size`. It answers 99,999, at once, with no `RangeError`.

```check
run "npx vitest run graph" exit=1 stdout="3 passed" label="three of the five graph tests pass; the other two are the next lesson's"
run "node -e \"import('./src/graph.ts').then(({ DependencyGraph }) => { const g = new DependencyGraph(); for (let i = 1; i < 100000; i++) g.setReads('A' + (i + 1), ['A' + i]); console.log('[' + g.downstream('A1').size + ']'); })\"" stdout="[99999]" label="a chain of 100,000 cells is traversed without running out of stack" -- Keep a toVisit list and a found set: no recursion.
```

## Commit

```powershell
git add playground src/graph.ts src/graph.test.ts
git commit -m "A dependency graph: what each cell reads, who reads it, and everything downstream"
```

```check
git-tracked src/graph.ts
git-clean
```

## Your turn: everything a course needs

`downstream` follows edges forward. A student planning a degree asks the opposite: to take Compilers, which courses must I take first, directly **or** through others? In `playground/graphs/all-needs.mjs`, write and export `allNeeds(course)`, using `needs` from `courses.mjs`, that returns an array of every course needed, directly or through others, sorted alphabetically. Below it, print `allNeeds("Compilers")` and `allNeeds("Programming 1")`. No recursion: a to-visit list and a found set. Commit.

```hints
nudge: It's `downstream.mjs` again, with the arrows the other way.
concept: `downstream` follows `neededBy` (who needs this?). `allNeeds` follows `needs` (what does this need?), which `courses.mjs` already stores, so nothing needs reversing. The to-visit list and the found set work exactly as before.
shape: `export function allNeeds(course) { const found = new Set(); const toVisit = [course]; let current = toVisit.pop(); while (current !== undefined) { for (const need of needs.get(current) ?? []) { … } current = toVisit.pop(); } return [...found].sort(); }`
answer: ~~~javascript
import { needs } from "./courses.mjs";

export function allNeeds(course) {
  const found = new Set();
  const toVisit = [course];
  let current = toVisit.pop();
  while (current !== undefined) {
    for (const need of needs.get(current) ?? []) {
      if (!found.has(need)) {
        found.add(need);
        toVisit.push(need);
      }
    }
    current = toVisit.pop();
  }
  return [...found].sort();
}

console.log(allNeeds("Compilers"));
console.log(allNeeds("Programming 1"));
~~~
```

```check
run "node -e \"import('./playground/graphs/all-needs.mjs').then(({ allNeeds }) => console.log(JSON.stringify([allNeeds('Compilers'), allNeeds('Web Apps'), allNeeds('Programming 1')])))\"" stdout="[[\"Algorithms\",\"Discrete Maths\",\"Programming 1\",\"Programming 2\"],[\"Databases\",\"Programming 1\",\"Programming 2\"],[]]" label="allNeeds finds every course needed, directly or not, sorted" -- Follow needs, not neededBy, and sort the result.
git-clean -- Commit it: git add playground, then git commit.
```
