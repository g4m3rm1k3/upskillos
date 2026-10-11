---
title: 8.4 — Topological Order: Each Cell After What It Reads
runtime: none
experiments: Count what each course waits for; Take the ready ones; A cycle in the plan
teaches: topological order, kahn's algorithm, in-degree, queues, array filter
uses: graphs, reversing a graph, graph traversal, maps, sets, classes, cycle detection, tests, vitest, playground
---

### The story so far

`DependencyGraph` in `src/graph.ts` keeps a formula graph in both directions (8.3): `readsOf(cell)` and `readersOf(cell)`, updated together by `setReads`. `downstream(cell)` follows the readers outward with a to-visit list and a found set, and finds every cell an edit affects, without recursion: a chain of 100,000 cells is no problem. In the playground, the course graph has its reverse, `neededBy`, and you found everything downstream of a course and everything a course needs.

### What this lesson builds

Knowing *which* cells to recalculate isn't enough: they have to be worked out in the right **order**. In A1 → B1 → C1, working out C1 before B1 would use B1's old value. So the graph gets one more method, `order(cells)`, which lines cells up so that each comes after everything it reads, and reports the ones that can't be lined up because they're in a cycle:

| the graph | `order` gives |
|---|---|
| A1 → B1 → C1, and D1 reads A1 and C1 | ordered: A1, B1, C1, D1 |
| A1 ⇄ B1 (a cycle), C1 reads B1, D1 reads nothing | ordered: D1; cyclic: A1, B1, C1 |

An order like that is called a **topological order**, and the method is **Kahn's algorithm**, practised first on the course plan.

## An order that respects every arrow {#idea}

A **topological order** of a graph is a list of all its nodes where every edge points forwards: for each arrow X → Y, X comes before Y in the list. For the courses, it's an order a student could take them in without ever meeting a course before its prerequisites. For the spreadsheet, it's an order to recalculate cells in so that every formula's inputs are already up to date.

You use topological orders all the time without seeing them. `npm install` (lesson 4.2) installs a package's dependencies before the package. A build tool compiles a module before the modules that import it. A project plan schedules a task after the tasks it waits for.

Two facts to keep in mind:

- **There's often more than one.** In A1 → B1 and A1 → C1, both A1, B1, C1 and A1, C1, B1 respect every arrow.
- **A graph with a cycle has none.** If A1 → B1 → A1, then A1 must come before B1 and B1 before A1. That's why the method will also report the cycle: it's what's left when no order exists.

## Count what each course waits for {#waiting}

Kahn's idea: count, for every node, how many of its prerequisites haven't been placed yet. A node whose count is 0 is **ready**: nothing it needs is still waiting. Start with the courses. This step opens `playground/graphs/plan.mjs`:

```javascript file=playground/graphs/plan.mjs
import { needs } from "./courses.mjs";
import { neededBy } from "./needed-by.mjs";

const waitingFor = new Map();
const ready = [];
for (const [course, list] of needs) {
  waitingFor.set(course, list.length);
  if (list.length === 0) {
    ready.push(course);
  }
}
console.log(ready.join(" → "));
```

The count is how many courses each needs. That number has a name: a node's **in-degree**, the number of arrows coming in (your Your turn in 8.2 counted the opposite, arrows going out of each course to others).

| course | needs | waiting for |
|---|---|---|
| Programming 1 | nothing | **0: ready** |
| Discrete Maths | nothing | **0: ready** |
| Programming 2 | Programming 1 | 1 |
| Databases | Programming 1 | 1 |
| Algorithms | Programming 2, Discrete Maths | 2 |
| Web Apps | Programming 2, Databases | 2 |
| Compilers | Algorithms | 1 |

Run it: `Programming 1 → Discrete Maths`. (The line above it is printed by `needed-by.mjs` when it's imported.)

```check
run "node playground/graphs/plan.mjs" stdout="Programming 1 → Discrete Maths" label="the two courses that need nothing are ready first" -- Count each course's needs; a course with none goes on the ready list.
```

## Take the ready ones {#ready}

Now the loop. Take the ready courses in turn. Placing one means everything that needs it is waiting for one course fewer, and any course whose count reaches 0 becomes ready, at the end of the list. This step adds the loop to `playground/graphs/plan.mjs`:

```javascript file=playground/graphs/plan.mjs
import { needs } from "./courses.mjs";
import { neededBy } from "./needed-by.mjs";

const waitingFor = new Map();
const ready = [];
for (const [course, list] of needs) {
  waitingFor.set(course, list.length);
  if (list.length === 0) {
    ready.push(course);
  }
}
for (let i = 0; i < ready.length; i++) {
  for (const next of neededBy.get(ready[i]) ?? []) {
    waitingFor.set(next, waitingFor.get(next) - 1);
    if (waitingFor.get(next) === 0) {
      ready.push(next);
    }
  }
}
console.log(ready.join(" → "));
```

**`for (let i = 0; i < ready.length; i++)`** runs while the list is growing: each pass may add to the end, and `ready.length` is read again before every pass. The list is used as a **queue**: items are taken from the front (by `i`) and added at the back, first in, first out.

| `i` | placing | waiting counts that change | added to `ready` |
|---|---|---|---|
| 0 | Programming 1 | Programming 2: 1 → 0, Databases: 1 → 0 | Programming 2, Databases |
| 1 | Discrete Maths | Algorithms: 2 → 1 | |
| 2 | Programming 2 | Algorithms: 1 → 0, Web Apps: 2 → 1 | Algorithms |
| 3 | Databases | Web Apps: 1 → 0 | Web Apps |
| 4 | Algorithms | Compilers: 1 → 0 | Compilers |
| 5 | Web Apps | (no one needs it) | |
| 6 | Compilers | (no one needs it) | |

`i` reaches 7, which is `ready.length`, and the loop ends:

```text
Programming 1 → Discrete Maths → Programming 2 → Databases → Algorithms → Web Apps → Compilers
```

Check it against the picture in 8.2: every course comes after everything it needs. Each course is placed exactly once, and each edge is looked at once (when the course at its start is placed), so the work grows with the size of the graph, not with its square: this is why recalculation will be fast.

```check
run "node playground/graphs/plan.mjs" stdout="Programming 1 → Discrete Maths → Programming 2 → Databases → Algorithms → Web Apps → Compilers" label="all seven courses, each after everything it needs" -- Take ready courses from the front; each one placed makes its dependants wait for one fewer.
```

## A cycle in the plan {#cycle}

What if a mistake in the catalogue made Programming 1 need Compilers? Then Programming 1 → … → Compilers → Programming 1 is a cycle. Before you try it, predict:

```predict
question: With Programming 1 needing Compilers, what does `plan.mjs` print?
choice: All seven courses, in some order
choice: Only Discrete Maths
choice: Nothing, because it loops forever
answer: Only Discrete Maths
explain: Programming 1 now waits for Compilers, so it's never ready, and nothing that needs it ever is either. Discrete Maths needs nothing, so it's placed, but it only makes Algorithms wait for one fewer (still one left, Programming 2). The loop runs out of ready courses and stops, with six courses never placed. That's how Kahn's algorithm finds cycles: they're what's left over.
verify: $d = Join-Path $env:TEMP ('plan' + (Get-Random)); Copy-Item playground/graphs $d -Recurse; (Get-Content "$d/courses.mjs") -replace '\["Programming 1", \[\]\]', '["Programming 1", ["Compilers"]]' | Set-Content "$d/courses.mjs"; $out = node "$d/plan.mjs" | Select-Object -Last 1; Remove-Item -Recurse -Force $d; if ($out -eq 'Discrete Maths') { 'Only Discrete Maths' } else { $out }
```

Try it: in `courses.mjs`, change `["Programming 1", []]` to `["Programming 1", ["Compilers"]]` and run `plan.mjs`. Then put it back with `git restore playground/graphs/courses.mjs` (lesson 1.6).

It doesn't loop forever, because every pass of the loop moves `i` forward, and the list only grows when a count reaches 0, which happens at most once per course. The courses left out are the cycle **and** everything downstream of it: Programming 2 isn't in the cycle, but it needs Programming 1, which is.

```check
contains playground/graphs/courses.mjs "[\"Programming 1\", []]" label="courses.mjs is back as it was" -- Run git restore playground/graphs/courses.mjs.
```

## The two tests left {#tests}

`src/graph.test.ts`, from the last lesson, has two tests that still fail. Read them again:

- **orders cells so each comes after everything it reads**: A1 → B1 → C1, and D1 reads A1 and C1. The only order that respects every arrow is A1, B1, C1, D1, though the cells are handed to `order` as D1, C1, B1, A1.
- **leaves cells in a cycle, and cells downstream of it, out of the order**: A1 and B1 read each other, C1 reads B1, D1 reads nothing. Only D1 can be placed; the other three are `cyclic`.

**`order` takes a set of cells**, not the whole graph: the spreadsheet will hand it just the cells an edit affects, from `downstream`. An edge from a cell outside that set (say C1 reads Z1, which didn't change) doesn't count as something to wait for, because Z1's value is already up to date.

```check
run "npx vitest run graph" exit=1 stdout="3 passed" label="the two order tests fail: there's no order method yet (red)"
```

## Counting, for cells {#count-cells}

The same first loop as the playground, with one difference: only reads **inside** the set count. This step adds `order` to `src/graph.ts`, returning just the cells that are ready at the start, for now:

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

  order(cells: Set<string>): { ordered: string[]; cyclic: string[] } {
    const waitingFor = new Map<string, number>();
    const ready: string[] = [];
    for (const cell of cells) {
      const count = [...this.readsOf(cell)].filter((read) => cells.has(read)).length;
      waitingFor.set(cell, count);
      if (count === 0) {
        ready.push(cell);
      }
    }
    return { ordered: ready, cyclic: [] };
  }
}
```

**`order`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `cells` | the cells to put in order | `{"D1", "C1", "B1", "A1"}` |
| returns `ordered` | the cells that could be placed, each after everything it reads | `["A1", "B1", "C1", "D1"]` (from the next step) |
| returns `cyclic` | the cells that couldn't: in a cycle, or downstream of one | `[]` |

**`.filter((read) => cells.has(read))`** keeps the items of an array for which the function gives `true`, like Python's `[read for read in reads if read in cells]`. Then `.length` counts them. `[...set]` first, because `filter` is an array method and `readsOf` gives a set.

For the first test: D1 reads A1 and C1, both in the set: waiting for 2. C1 and B1 each 1. A1 reads nothing: 0, ready.

```check
run "node -e \"import('./src/graph.ts').then(({ DependencyGraph }) => { const g = new DependencyGraph(); g.setReads('B1', ['A1']); g.setReads('C1', ['B1', 'Z1']); console.log(JSON.stringify(g.order(new Set(['C1', 'B1', 'A1'])).ordered)); })\"" stdout="[\"A1\"]" label="only A1 is ready at the start; Z1, outside the set, isn't waited for" -- Count only the reads that are in the set; a count of 0 means ready.
```

## Placing cells {#place}

The loop from the playground, with `readersOf` for `neededBy`. This step replaces the `return` in `order` with the loop and a return after it:

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

  order(cells: Set<string>): { ordered: string[]; cyclic: string[] } {
    const waitingFor = new Map<string, number>();
    const ready: string[] = [];
    for (const cell of cells) {
      const count = [...this.readsOf(cell)].filter((read) => cells.has(read)).length;
      waitingFor.set(cell, count);
      if (count === 0) {
        ready.push(cell);
      }
    }
    for (let i = 0; i < ready.length; i++) {
      for (const reader of this.readersOf(ready[i] ?? "")) {
        const left = waitingFor.get(reader);
        if (left === undefined) {
          continue;
        }
        waitingFor.set(reader, left - 1);
        if (left - 1 === 0) {
          ready.push(reader);
        }
      }
    }
    return { ordered: ready, cyclic: [] };
  }
}
```

Two differences from the playground, both from the compiler:

- **`ready[i] ?? ""`**: with `noUncheckedIndexedAccess` (lesson 5.1), `ready[i]` might be `undefined` as far as TypeScript knows, though the loop's condition makes sure it isn't. `?? ""` gives an empty name instead, whose readers are an empty set.
- **`left === undefined` → `continue`**: a reader that isn't in the set (say B1 reads A1, but only A1 changed and B1 is outside the set being ordered) has no count, and isn't placed. **`continue`** skips to the next pass of the inner loop.

The first test, as `i` moves along `ready`:

| `i` | placing | counts that change | `ready` afterwards |
|---|---|---|---|
| 0 | A1 | B1: 1 → 0, D1: 2 → 1 | A1, B1 |
| 1 | B1 | C1: 1 → 0 | A1, B1, C1 |
| 2 | C1 | D1: 1 → 0 | A1, B1, C1, D1 |
| 3 | D1 | (no readers) | A1, B1, C1, D1 |

```check
run "npx vitest run graph -t \"each comes after\"" stdout="1 passed" label="cells are ordered, each after everything it reads" -- Take ready cells from the front; each one placed makes its readers in the set wait for one fewer.
```

## What's left over {#cyclic}

Cells never placed are the ones in a cycle, or downstream of one. This step replaces the last `return` of `order`:

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

  order(cells: Set<string>): { ordered: string[]; cyclic: string[] } {
    const waitingFor = new Map<string, number>();
    const ready: string[] = [];
    for (const cell of cells) {
      const count = [...this.readsOf(cell)].filter((read) => cells.has(read)).length;
      waitingFor.set(cell, count);
      if (count === 0) {
        ready.push(cell);
      }
    }
    for (let i = 0; i < ready.length; i++) {
      for (const reader of this.readersOf(ready[i] ?? "")) {
        const left = waitingFor.get(reader);
        if (left === undefined) {
          continue;
        }
        waitingFor.set(reader, left - 1);
        if (left - 1 === 0) {
          ready.push(reader);
        }
      }
    }
    const done = new Set(ready);
    return { ordered: ready, cyclic: [...cells].filter((cell) => !done.has(cell)) };
  }
}
```

For the second test: D1 waits for nothing and is placed. A1 waits for B1, B1 waits for A1, and C1 waits for B1: none of their counts ever reaches 0, so `ready` ends as `["D1"]`, and the other three are `cyclic`. A set of the placed cells (`done`) makes "is it placed?" one quick lookup per cell, instead of a search of `ready` each time (your Your turn in 8.1 measured why).

This replaces nothing yet in the spreadsheet: 7.6's `visiting` set still catches cycles in `cellValue`. The next lesson's `Workbook` uses `order`, and its cycles come from here.

```check
run "npx vitest run graph" stdout="5 passed" label="all 5 graph tests pass"
run "npx tsc" label="the project type-checks"
```

## Commit

```powershell
git add playground src/graph.ts
git commit -m "Put cells in topological order, and find the ones in cycles"
```

```check
git-tracked playground/graphs/plan.mjs
git-clean
```

## Your turn: semesters

A student takes every course they can each semester. Which courses go in which semester? In `playground/graphs/semesters.mjs`, use the same counting as `plan.mjs`, but place courses a **semester at a time**: all the courses ready now are semester 1; placing them makes some others ready, and those are semester 2; and so on. Print one line per semester, exactly in this form:

```text
1: Programming 1, Discrete Maths
```

and so on for the rest. Commit.

```hints
nudge: In `plan.mjs`, the ready list grows while you go through it. Here you want to finish one semester's list before starting the next.
concept: Keep the current semester's courses in one array, and collect the courses that become ready in a new array, `next`. When the current semester is done, print it, and the next semester is `next`. Stop when a semester is empty. This is the same algorithm, processed level by level: a **breadth-first** order.
shape: Start `semester` as the courses that need nothing, and `number` at 1. While `semester` isn't empty: make an empty `next`; for each course in `semester`, count down each course that needs it, pushing it to `next` when it reaches 0; print the line; then `semester = next` and add one to `number`.
answer: ~~~javascript
import { needs } from "./courses.mjs";
import { neededBy } from "./needed-by.mjs";

const waitingFor = new Map();
let semester = [];
for (const [course, list] of needs) {
  waitingFor.set(course, list.length);
  if (list.length === 0) {
    semester.push(course);
  }
}
let number = 1;
while (semester.length > 0) {
  const next = [];
  for (const course of semester) {
    for (const other of neededBy.get(course) ?? []) {
      waitingFor.set(other, waitingFor.get(other) - 1);
      if (waitingFor.get(other) === 0) {
        next.push(other);
      }
    }
  }
  console.log(`${number}: ${semester.join(", ")}`);
  semester = next;
  number++;
}
~~~
```

```check
run "node playground/graphs/semesters.mjs" stdout="1: Programming 1, Discrete Maths\n2: Programming 2, Databases\n3: Algorithms, Web Apps\n4: Compilers\n" label="four semesters, each course in the first one it can be taken" -- A course is ready when every course it needs has been placed, not just one of them, and it's placed once.
git-clean -- Commit it: git add playground, then git commit.
```
