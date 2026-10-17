# Dynamic Programming Lab

The lab at `#/lab/dynamic-programming` (`src/labs/dynamic-programming/`). Read this first when resuming, and update **Where we stopped**. The bar it is built to is [lab-quality-standard.md](lab-quality-standard.md).

The owner's brief (2026-10-17): DP should be **better than every other lab**, really teach and challenge, and cover every topic. It must be **very visual and hands-on**, because DP teaches how to think and break problems down: animations, step through, "click this, watch". When solving, the learner wants to **run and print**, not only check, and to **open the harder problems in CodeLens**.

## What is there

- **Curriculum** (`curriculum.js`): 253 concepts in 6 levels, Foundations to Specialist, each with a stable id, title and scope. Every concept has a lesson (`lessons/`), so none are "coming soon".
- **Design it yourself** (`DesignIt.jsx`, content in `lessons/designs.js` and `lessons/design-linear.js`) on the 11 one-dimensional lessons: stage 00, before any explanation. The learner solves a small case by hand (common wrong answers get a named diagnosis), then makes six decisions: what a cell means, the last choice, the recurrence, base cases, fill order, where the answer is. Every option has a reason, and the wrong ones are real mistakes. Each right choice joins a "Your design so far" card. It ends with one cell of the live table computed by hand, diagnosed with `diagnose()`. Finishing it is saved, along with the wrong-pick count and whether an answer was shown.
- **A lesson** (`Lesson.jsx`) has three stages after that: Understand (sections, procedure, proof, complexity, pitfall), Walk through, and Solve a problem (a coding challenge) or Check understanding (one typed answer).
- **Live table** (`TableTrace.jsx`, data in `tables.js`) on 31 lessons, in the Walk through stage:
  - *Watch it fill*: play, pause, step, scrub, speed, arrow keys. The cell being written glows; arrows come from the cells it reads; the arithmetic is written out; base cases are listed first; the answer cell is marked.
  - *You fill it*: type each cell before it is revealed. Wrong answers get a diagnosis (copied one input, added instead of max/min, off by one). "Show the rule" after one miss, "Reveal" after two. Hard mode hides which cells are read. A clean run is saved ("✓ Filled by you").
  - *Fill order*: click cells in any order; a cell fills only when everything it reads is filled, otherwise the missing cells flash red with arrows. Ends by naming it: a topological order.
  - *Change the input*: every trace takes the learner's own input (lists, strings, grids, triangles, numbers), with limits and plain-language errors, "🎲 Surprise me" and "Lesson example".
- **Call tree** (`CallTree.jsx`, data in `trees.js`) on 15 lessons (11 recurrences; the recursion and memoization lessons use Fibonacci): the plain recursion drawn as a tree and played call by call, with the call stack highlighted. Repeated questions share a colour. The learner predicts the number of calls first (the counts stay hidden until then). The memo switch collapses the tree. "From tree to table" lists states in the order they return, which is a table order.
- **Coding challenges** (69; `lessons/challenges.js`, `core-challenges.js`) in Python (Pyodide) or JavaScript, run in a worker that can be stopped (`runtime/`):
  - **▶ Run**: runs the code as written, shows everything it prints / `console.log`s, and what `solve(...)` returns for the input in the Run box (examples one click away). Not graded. Errors name the learner's line.
  - **✓ Run & check**: the hidden cases. A failing case has "Put this input in the Run box".
  - **🔍 Open in CodeLens** on challenges past the Foundations level: the learner's code plus one `solve(...)` call on the Run box input, stepped line by line in CodeLens. The lab window minimises while CodeLens is open; "Back to the DP lab" reopens it on the same lesson and stage.
  - Ctrl+Enter runs, Ctrl+Shift+Enter checks. Drafts, hints and passes are saved per lesson and language (`progress.js`).
- **Recursion lesson** (`RecursionLesson.jsx`): a reversible call-stack trace of a sum, with a checked prediction.

## How to add to it

- **A design** (plan item 1): add an entry to a `lessons/design-*.js` file and spread it into `DESIGNS` in `lessons/designs.js` (the format is described at the top of that file). `designs.test.js` checks the six kinds in order, one right option with a reason for every option, the right option not always in the same place, the hand-solved answer and the misconceptions against the brute-force oracle, and the apply cell against the live trace. Put every number quoted in an option's reason into its `CLAIMS` list.

- **A live table**: add a function to `TRACES` in `tables.js` taking one input object with the lesson's example as defaults. Use `table()` / `line()`; every `set` lists the cells it read and the arithmetic. Add its fields to `INPUTS`. `tables.test.js` then checks it fills in dependency order and agrees with the lesson's reference solution (or an `ORACLE` in the test, written without DP) on the example and on 25 random inputs that went through the real input parser.
- **A call tree**: add a spec to `TREES` in `trees.js` (`params`, `root`, `label`, `children`, `combine`) and map lessons to it in `TREE_FOR`. Add the matching table input to `AS_TABLE` in `trees.test.js`, which checks the tree's answer against the table for every parameter value.
- **A challenge**: see `challenges.js`; expected values come from brute-force oracles (`core-oracles.js`), never from the DP solution being taught.
- Use `trace.css` for the visual components' styles; `style.css` holds the shell.

## Progress and sync

All lesson progress (drafts, passes, quiz, design) is in one localStorage key, `oc-dp-lab` (`progress.js`), which is in `SYNC_KEYS` (`src/context/AuthContext.jsx`). It reaches the learner's account when they are signed in, and a new solve is pushed at once with `pushNow`. Two devices merge with `mergeDpLab` (`src/context/progressMigration.ts`): a pass on either side wins. The old per-lesson keys (`upskillos.dp.v1.<id>`) move into it the first time they are read. A solve shows as a ✓ on the lesson in the sidebar, a ✓ Solved badge on the lesson, ✓ n/m counts on levels and groups, and the header bar. Still local only: the trace's "Filled by you" marks (`upskillos.dp-lab.trace.<id>`).

## Plan

In order of value. Each item lists what it adds against [the standard](lab-quality-standard.md).

1. **"Design it yourself" for every lesson** (standard 1, 3). Done for the one-dimensional family (2026-10-17); the next is grids, then knapsack, then counting, then Structured: before the explanation, the learner builds the DP: what the state means, what the last choice was, the recurrence, base cases, order, where the answer is. Each a choice with a reason for every option, wrong options written from real misconceptions. This is the "how to think" core of the lab.
2. **Visuals for every family that has a table** (2, 3, 4): traces for the remaining Core lessons (circular selection, activity selection, grid resources/direction/two agents, bounded, equal partition, target signs, value-indexed, multidimensional, group and exact-capacity knapsack), then Structured (interval DP with diagonal fill order, matrix chain, palindromes, scheduling). New visual kinds for what isn't a grid: DP on a drawn tree, bitmask states, digit DP, DAG longest path.
3. **Walk back the answer** (2): animate reconstruction on the finished table (which choice made each cell), for the reconstruction, LCS, edit distance, knapsack and path lessons.
4. **Bug hunts** (3, 6): a solution with one classic DP bug (loop direction in 0/1 knapsack, the wrong base case, a shared row, a cache key that misses a parameter). Find the line, fix it, Run to see why.
5. **Code with notes and maths-to-code tables** (5): the reference solution of each core lesson shown line by line, after the learner's own attempt.
6. **More than one check per lesson** (3, 11): several predict/choice items per lesson, every number computed, instead of the single typed answer.
7. **Spaced review and a mastery map** (10), ported from Linear Algebra.
8. **Deepen the Advanced, Expert and Specialist lessons** (all): they are one-row summaries now (`advanced.js`, `expert.js`, `specialist.js`); each becomes a full lesson with a worked example, visual and checks.

Pace: one topic family per session, then update **Where we stopped**.

## Verification

- Tests: `npx vitest run src/labs/dynamic-programming`. `designs.test.js` (design content against oracles and traces), `design.test.jsx` (a design used as a learner would), `progress.test.jsx` (one synced key, old keys moved, merge never un-solves, a solve shows everywhere and is pushed), `tables.test.js` (every trace, example and random inputs, against independent answers), `trees.test.js` (trees agree with tables; the memo expands each state once; Fibonacci call counts are 2·F(n+1) − 1), `trace.test.jsx` (watch, you fill it, fill order, input box, call tree, used as a learner would), `run.test.jsx` (Run in JavaScript, and in Python on real Pyodide: prints, return values, error lines; the challenge panel; the CodeLens handoff), `lessons.test.js` (every challenge's reference solutions pass), `index.test.jsx`.
- Browser: `node src/labs/dynamic-programming/tools/browser-check.mjs [out] [--only id,…,run]` starts its own dev server (and stops it), opens every lesson with a table or tree, plays and fills them, solves a challenge in real Python with Run (checking the printed lines), passes Run & check, opens CodeLens and comes back, checks the ✓ appears after the pass, designs every designed lesson with one wrong pick per decision, and screenshots a narrow window. `--only design` runs just the designs. Look at the screenshots.

## How to resume (kept until the whole series is complete)

This file is the handoff between sessions. Nothing in it is deleted until every item in the Plan is done; finished items move to Where we stopped, with the date.

1. Read this file, then [lab-quality-standard.md](lab-quality-standard.md).
2. Run `npx vitest run src/labs/dynamic-programming` to confirm the starting state.
3. Do the **Next** item below, one topic family per session.
4. End the session with: tests, `npm run typecheck`, the browser check (and a look at its screenshots), then update Plan and Where we stopped here.

Reusable, permanent tools: `tools/browser-check.mjs` (browser), `tables.test.js` (checks any new trace on random inputs automatically), and `trees.test.js` (trees against tables).

## Pitfalls found so far

- **Shell heredocs break** when the text contains apostrophes or backticks: the Bash tool reports "unexpected EOF" and writes nothing. Write files with the Write tool, or a Python script with no backticks in it.
- **Component tests need** `// @vitest-environment happy-dom` on line 1, or they fail with "document is not defined".
- **CodeLens opens beneath the lab's desktop window** unless the window is minimised first (`useDesktop()?.minimizeWindow('dynamic-programming')`). Use `window.location.hash`, not `useNavigate`, because the lab's tests render it without a router.
- **The browser check meets a "What's new" popup** after a reload; it clicks "Got it". After resizing the viewport, reload, or the desktop keeps the window at its old size.
- **The grid-paths challenge allows diagonal moves**, but the lesson and table don't, so the table is checked against its own right/down oracle in `tables.test.js`.
- **The 14 "content problems"** reported by `npm run catalog:check` predate this lab; don't chase them here.
- **Element screenshots in the narrow window** show page content from behind the lab below the window's visible area ("Open Lesson Engine"). It is the screenshot capturing the element's whole box, not a layout bug; check that the page does not scroll sideways instead.
- **The lab's base button style** (`.dp-lab button`) has no border or padding. A new plain button needs a class (`dp-di-secondary`) or it shows as bare text.
- **Other sessions share this working tree** (see the owner's parallel-sessions note): commit only DP lab files and this doc.

## Where we stopped

2026-10-17, session "best of every lab":

- Reviewed the Linear Algebra, Book of Nature, QMaze and Data Science labs; wrote [lab-quality-standard.md](lab-quality-standard.md).
- Built the live table (watch / you fill it / fill order / change the input) and wired the 31 traces that existed in `tables.js` but were never shown (the `TableTrace.jsx` their comment named had never been written). Every trace now takes an input. Fixed on the way: `word-break-count` counted words that didn't match the text; `max-product`, `max-square` and `lis` read their answer from a fixed cell, right only for the built-in example; they now take the best cell.
- Built the call tree with prediction, memo collapse and tree-to-table order.
- Added Run (prints, return value, error line; both languages), "Put this input in the Run box", and Open in CodeLens past Foundations; the lab remembers the open lesson and stage.
- Finished the previous session's expert/specialist rows (their tests failed on short explanations).
- Later the same day: built "Design it yourself" for the 11 one-dimensional lessons (plan item 1, first family). Fixed: quiz passes were dropped on every read (`readProgress` kept only code entries). The owner reported that solving showed nothing and progress wasn't saved to the database, so progress moved into the synced `oc-dp-lab` key, with a merge, an immediate push, and ✓ marks everywhere (see Progress and sync).
- **Next:** plan item 1 for the grid family (`grid-paths` to `grid-multiagent`, 8 lessons, 4 with live traces), then knapsack. Then item 2. Consider syncing the "Filled by you" marks too.
