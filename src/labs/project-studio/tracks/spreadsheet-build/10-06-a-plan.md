---
title: 10.6 — Estimates, a Plan, and Done
runtime: none
experiments: How good are estimates?
teaches: estimating, sprint goals, sprint planning, definition of done, spikes, toFixed
uses: user stories, acceptance criteria, acceptance tests, destructuring, comparison functions, markdown, git switch, git commit, playground
---

### The story so far

Lessons 10.1 to 10.5 turned Crumb & Co.'s brief into requirements you can build from: questions and answers, a glossary, five user stories in `docs/backlog.md` with acceptance criteria, and those criteria as acceptance tests in `src/acceptance/crumb.test.ts`. S2 passes already; S1 is skipped until `ROUNDUP` exists; the rest are todos.

### What this lesson builds

The last three things a team settles before writing code, and the branch to write it on:

```text
 docs/
 ├── definition-of-done.md    when is a story finished? the same answer for every story
 └── plan.md                  this sprint: its goal, which stories, how long each might take

 git switch -c s1-scaling     the branch for the first story
```

## How good are estimates? {#experiment}

Before you estimate anything, look at how estimates usually turn out. Here are a team's last eight tasks, what they guessed, and what each really took. This step opens `playground/requirements/estimates.mjs`:

```javascript file=playground/requirements/estimates.mjs
// A team's last eight tasks: [name, estimated hours, actual hours].
const tasks = [
  ["lexer", 2, 3], ["parser", 4, 7], ["errors", 1, 1.5], ["graph", 3, 5],
  ["cache", 8, 13], ["grid", 2, 2], ["ranges", 3, 4.5], ["IF", 2, 5],
];

const ratios = tasks.map(([, estimate, actual]) => actual / estimate).sort((a, b) => a - b);
const middle = ratios.length / 2;
const median = (ratios[middle - 1] + ratios[middle]) / 2;
console.log(ratios.map((ratio) => ratio.toFixed(2)).join(" "));
console.log(median.toFixed(2));
```

- **`([, estimate, actual])`** destructures each task, skipping its name: the empty place before the first comma.
- **`actual / estimate`** is how many times longer than guessed the task took: 1 means the estimate was right.
- **The median** is the middle of the sorted ratios (9.3's Your turn): with eight, the average of the 4th and 5th.
- **`toFixed(2)`** writes a number with exactly two decimal places, as text: `1.5625` becomes `"1.56"`.

Before you run it, predict:

```predict
question: The median task took how many times its estimate? (Give a number, like 1 or 2.5.)
answer: 1.56
tolerance: 0.3
explain: About 1.5: the typical task took half as long again as guessed, and only one of the eight was quicker than or equal to its estimate. That's normal, and has been measured for decades: people estimate the work they can see, and forget the tests, the review, the bug found on the way, and the question that had to go back to the client.
verify: node playground/requirements/estimates.mjs
```

Run it: `node playground/requirements/estimates.mjs`.

```text
1.00 1.50 1.50 1.50 1.63 1.67 1.75 2.50
1.56
```

| what the numbers say | what to do about it |
|---|---|
| almost every ratio is over 1 | estimates are optimistic, consistently, not randomly |
| the median is about 1.5 | multiply your own guesses by your own measured ratio |
| one task took 2.5 times as long (IF) | the unfamiliar task is the one that overruns most |

The numbers are a team's, not yours. Your ratio comes from your own records: write down your estimate before each task, and what it took after.

```check
run "node playground/requirements/estimates.mjs" stdout="1.56" label="the median task took 1.56 times its estimate"
```

## Estimating stories {#estimating}

An estimate is for **deciding**: what fits before the Christmas rush, and what to leave out. It's a range, not a promise. Teams estimate in one of two ways:

| | how | good for |
|---|---|---|
| **hours** | "S1 is about 3 hours" | a single developer, a short sprint |
| **story points** | sizes relative to each other, on a coarse scale (1, 2, 3, 5, 8): "S5 is bigger than S1, about twice" | teams, where hours differ by person; the coarse scale admits that 5 or 8 is a guess |

Some stories can't be estimated at all yet. S3, importing the old files, depends on what's in forty files nobody has seen. The honest estimate is "?", and the plan is a **spike**: a short, fixed time spent finding out (open the files, try reading three), after which the story can be estimated.

## Done means done {#done}

"Done" means different things to different people: the code works on my machine; the tests pass; the client has seen it. A **definition of done** is one list, agreed by the team, that every story must meet before anyone calls it done. It stops half-finished work from looking finished. This step creates `docs/definition-of-done.md`:

```markdown file=docs/definition-of-done.md
# Definition of done

A story is done when every one of these is true. Not most of them.

- Its acceptance tests pass, and none of them is skipped.
- Every new function has unit tests, and all the project's tests pass.
- `npx tsc` reports nothing.
- It's merged into `main` and pushed, and its branch is deleted.
- Its heading in `docs/backlog.md` ends with *(done)*.
- It has been shown to the person who asked for it.
```

Each line can be checked, and most of them by a program: the tests, `tsc`, git. The last line can't, and it's the one teams skip most often.

```check
contains docs/definition-of-done.md "acceptance tests pass"
```

## Your turn: the plan, and the first branch

Write `docs/plan.md`, the plan for this sprint:

- a **goal** in one sentence: what the client will be able to do at the end of it (a goal, not a list of tasks);
- a table of the stories, each with your estimate, the estimate multiplied by a ratio, and whether it's in this sprint, with a reason when it isn't;
- a line saying a story is finished when it meets `docs/definition-of-done.md`.

The answers said recipes matter most, so S1 must be in. Commit, then create the branch for S1, `s1-scaling`:

```powershell
git add docs playground
git commit -m "A plan and a definition of done"
git switch -c s1-scaling
```

```hints
nudge: Start from the client's priorities in `answers.md`. What's the smallest thing Priya could use on Monday morning?
concept: The goal names an outcome for a person: "Priya can scale a recipe…". For each story, guess hours, multiply by the ratio from the experiment, and decide. S2 is nearly free (10.4 showed `IF` already does it); S3 needs a spike before anyone can estimate it; S4 the client said not to let hold anything up.
shape: `# Sprint 1 plan…`, a `**Goal:**` line, a table with columns story, estimate, × ratio, this sprint?, then the definition-of-done line.
answer: ~~~markdown
# Sprint 1 plan: Crumb & Co., release 1

**Goal:** Priya can scale a recipe to the batch she needs, eggs included.

| story | estimate (hours) | × 1.6 | this sprint? |
|---|---|---|---|
| S1: Scale a recipe | 3 | 5 | yes |
| S2: Reorder warnings | 1 | 2 | yes: a sheet set up with `IF`, no new code |
| S3: Import the old stock files | ? | ? | no: first, a day looking at the real files |
| S4: Brand colours | 2 | 3 | no: "don't let them hold anything up" |
| S5: Counts on a phone | 5 | 8 | no |

A story is finished when it meets `docs/definition-of-done.md`.
~~~
```

```check
run "node -e \"const t = require('fs').readFileSync('docs/plan.md', 'utf8'); const missing = ['goal', 's1', 'definition-of-done'].filter((w) => !t.toLowerCase().includes(w)); console.log(missing.length === 0 ? '[a plan]' : '[missing: ' + missing.join(', ') + ']')\"" stdout="[a plan]" label="the plan has a goal, includes S1, and points to the definition of done" -- A **Goal:** line, S1 in the table, and a line naming docs/definition-of-done.md.
git-branch s1-scaling -- After committing, run git switch -c s1-scaling.
git-clean -- Commit it: git add docs playground, then git commit.
```
