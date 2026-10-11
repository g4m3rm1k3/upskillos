# Bootcamp: handoff between sessions

Start every bootcamp session here. The plan is [bootcamp-series-plan.md](bootcamp-series-plan.md); the record of what's been checked, and the traps found, is [bootcamp-audit.md](bootcamp-audit.md).

## Where it stands

| Sprints | State |
|---|---|
| 0–7 | written, at the explanation standard, walked (60 lessons) |
| 8 | in progress (see below) |
| 9–79 | not written |

Update this table, and the plan's *Progress* table, at the end of every sprint.

## The standard

Every lesson matches [07-01-tokens.md](../src/labs/project-studio/tracks/spreadsheet-build/07-01-tokens.md), which the owner approved: a story so far, what the lesson builds (a picture), what each supplied test protects, an inputs-and-returns table for every function, traces with real values, steps of at most 15 lines, a prediction, an experiment, and a Your turn with a hint ladder. Every number quoted is measured.

## How to write a sprint

1. **Build the sprint's final code first**, in a copy of the last kept walk project (`scratchpad/sheet-s<NN>`), with its tests passing, and measure every number the lessons will quote.
2. **Write the lessons from that code**, step by step. A scratchpad generator that builds each step's file snapshot from the final file, and asserts the last snapshot equals it, keeps blocks consistent.
3. **Walkthrough entries** in `tracks/spreadsheet-build.walkthrough.js`: every step's wrong answers (that must fail named checks), every Your turn's right answer. Wrong answers never push.
4. **Checks while writing:** `node scripts/check-bootcamp-teaching.mjs --from <NN>-01 --until <NN>-08` must report nothing missing.
5. **Walk it** from the kept project: `SHEET_START=<kept> SHEET_FROM=spreadsheet-build/<NN>-01 SHEET_UNTIL=spreadsheet-build/<NN>-08 SHEET_KEEP=<new kept> npx vitest run src/labs/project-studio/spreadsheetBuild.desktop.test.js`, in the background. Fix and re-walk until green.
6. **Then** `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"` and `npm run facts`, and update the tables here, in the plan and in the audit.

Never run git on this repository. Lessons teach git inside the learner's project only.

## Kept walk projects

The walk's finished projects live in the session scratchpad, which doesn't survive between sessions. A new session regenerates one by walking from the start, or from the last sprint whose project it has: `SHEET_KEEP=<folder>` saves one.

## Sprint 8 (in progress)

Design: 8.1 measure first (count `cellValue` calls and time a full recalculation); 8.2 graphs and `references(expression)`; 8.3 reverse edges and `downstream`; 8.4 topological order (Kahn's algorithm, cycles as what's left over); 8.5 a value cache that stays correct (`Workbook`, with a differential test against `cellValue`); 8.6 the grid on the `Workbook`, measured again; 8.7 challenge: trace dependents, with performance and security acceptance tests; 8.8 its solution.
