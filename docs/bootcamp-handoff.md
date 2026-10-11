# Bootcamp: handoff between sessions

Start every bootcamp session here. The plan is [bootcamp-series-plan.md](bootcamp-series-plan.md); the record of what's been checked, and the traps found, is [bootcamp-audit.md](bootcamp-audit.md).

## Where it stands

| Sprints | State |
|---|---|
| 0–11 | written, at the explanation standard, walked (92 lessons) |
| 12–79 | not written |

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

## Safety: one heavy process at a time

A walk starts many npm, tsc, Vitest and git processes. On 2026-10-11, starting a second Vitest run while a walk was going exhausted the owner's machine and crashed it. Run one walk, or one test run, at a time, and wait for it to finish. Never let a check, test or wrong answer work out a huge range (such as `A1:ZZZ1000000`): code without the limit tries to build billions of cells.

## Sprint 9

Lessons: 9.1 ranges; 9.2 function calls and the registry (`SUM`); 9.3 `AVERAGE`, `MIN`, `MAX`, `COUNT`; 9.4 text, TRUE and FALSE; 9.5 comparisons (`compare.ts`); 9.6 lazy `Argument`s and `IF` (`isTrue`, `choose`); 9.7 challenge: `COUNTIF`/`SUMIF` and a 100,000-cell range limit, merged into `main`; 9.8 its solution. The finished code is 96 tests.

Generators in the scratchpad: `s9_part3.py` builds every step's state from the finished code (`s9dev`); `s9_split.py` splits the builder's 9.4 states into 9.4 and 9.5; `gen_91.py` to `gen_98.py` write the lessons; `walk_9*.py` add walkthrough entries.

Sprint 10 starts Module 2 (Crumb & Co.): see the plan.

## Sprint 10: requirements, for Crumb & Co. (done, walked)

The finished code is in the scratchpad's `s10dev` (a copy of the walked Sprint 9 project): `ROUND` and `ROUNDUP` in `functions.ts` (`numberIn`, `rounding(direction)`), `src/rounding.test.ts` (5), `src/acceptance/crumb.test.ts` (2 tests, 3 `it.todo`), and the client's `docs/crumb/brief.md` and `docs/crumb/answers.md`. Whole project: `103 passed | 3 todo`.

- 10.1 the brief (supplied); vague words become questions; experiment: scaling the brioche gives 17.5 eggs; Your turn: `docs/crumb/questions.md`, at least 10 questions under headings.
- 10.2 the answers (supplied); experiment: Riverside counts flour in kg and Old Town in g, so a naive reorder check misses Old Town's 5,200 g against 6 kg; Your turn: `docs/crumb/glossary.md`.
- 10.3 user stories in `docs/backlog.md`; experiment: a 15-line story linter (`As a …, I want …, so that ….`; flags "and" in the want); Your turn: five stories that pass it.
- 10.4 acceptance criteria, Given/When/Then; experiment: the low-stock criterion already works with `IF`; Your turn: criteria for every story.
- 10.5 acceptance tests in `src/acceptance/crumb.test.ts`, written in steps: story 2 passes now, story 1 `it.skip` (needs `ROUNDUP`), stories 3–5 `it.todo`. Measured: `1 passed | 1 skipped | 3 todo`.
- 10.6 estimates (experiment: past estimates against actual times), a sprint plan, `docs/definition-of-done.md`, and a branch `story/batch-scaling`.
- 10.7 challenge: deliver story 1: `ROUND`/`ROUNDUP` with `src/rounding.test.ts` supplied (0.1*3*10 is 3, -2.5 rounds to -3, at most 15 places), un-skip story 1; security acceptance check: a recipe name typed as HTML shows as text; merge, push, delete the branch.
- 10.8 its solution; Your turn in the playground: whole packs to order (`packs(amount, size)`, with the 15-digit clean-up).

Sprint 10's walked project is `scratchpad/sheet-s108` (on `main`, pushed; 104 tests and 4 todos). Its supplied docs use `### ` headings, because the lesson parser splits steps on every line starting `## `, even inside fences. Sprint 11 is React (plan: "the sheet's interface moved to React, with the engine kept separate"), and should pick up S4 or S5 from the backlog as its client work.

## Sprint 11: React (done, walked)

Finished code in the scratchpad's `s11dev`: `src/main.tsx`, `src/ui/App.tsx` (selection, save with a move, clamped to the sheet, status), `src/ui/FormulaBar.tsx` (its own draft; Enter, Tab, arrows, Escape; keyed by the cell's name so its state resets), `src/ui/Grid.tsx`; `src/grid.ts` removed; `src/ui/App.test.tsx` (5) and `src/ui/keyboard.test.tsx` (5), Testing Library with `// @vitest-environment jsdom`. Installed: react and react-dom 19.3, `@vitejs/plugin-react` 6, `@types/react(-dom)` 19, `@testing-library/react` 16 and `/dom` 10, and **jsdom 29**: jsdom 30 needs Node 24.15. Whole project: 114 passed, 4 todo. Bundle: 12.8 kB by hand, 232 kB (72.7 kB gzipped) with React. In-between states are in `scratchpad/stages11/`; `scratchpad/pagecheck.cjs` measures page experiments (starts Vite, Playwright, always stops both).

- 11.1 keeping the page in step, by hand (playground order list: removing an item leaves "3 items"); Your turn: one `render()`.
- 11.2 branch `react`, install, config; React elements are plain objects; the order list as components with props; Your turn: a `RecipeCard`.
- 11.3 state and events (renders counted in the title: 3 after two removals); Your turn: Clear.
- 11.4 a controlled input; where state lives (typing "flour": 6 renders of the list with the draft in it, 1 with it in `AddItem`); duplicate keys warn; Your turn: focus with `useRef` and `useEffect`.
- 11.5 the sheet in React: `index.html`, `main.tsx`, `Grid` (one justified step), `App`, selection.
- 11.6 editing, tested: `App.test.tsx` supplied; `FormulaBar` (Enter only); without `key` the "shows its text" test fails; Your turn: the "1 cell" test.
- 11.7 challenge, Priya's keyboard request: `keyboard.test.tsx` supplied (Tab, arrows, Escape, clamping, HTML as text); merge `react` into `main`, push, delete.
- 11.8 solution; Your turn: a custom hook, `useStoredState`, in the playground.

Page checks that type into a React input must use the native value setter and a bubbling `input` event; a plain `input.value = …` doesn't reach React's state, and a non-bubbling `keydown` doesn't reach React's listener.

Sprint 11's walked project is `scratchpad/sheet-s118` (on `main`, pushed; 114 tests and 4 todos). A step with no file of its own (prose and a check) has no target for a wrong answer's `edit`: use `editFiles: {"path": [[old, new]]}`. `npx tsc` with errors exits 1 here, not 2. Vitest 5's JSON reporter writes a file (`.vitest/json/output.json`) unless given `--outputFile`; point it into `node_modules` so the learner's tree stays clean. Sprint 12 is front-end architecture (routing, TanStack Query, code splitting): it needs some server to fetch from, which the plan's server module comes after, so decide that first.
