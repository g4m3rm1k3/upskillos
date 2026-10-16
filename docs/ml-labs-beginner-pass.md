# Machine learning labs: the beginner pass

Started 2026-10-15 at the owner's request: go through every machine learning lab (not Data Science Studio or Data Science on the Web, which are still being built) and add what a beginner needs to follow it, without breaking a lab or making it worse. It began with QMaze Lab, where the owner couldn't follow `build_transitions` until the lab said plainly what a state and an action are and what `P[s][a]` holds.

## What gets added

Three kinds of addition, in this order of value:

1. **The building blocks, named early.** The few kinds of value that everything in a lab is made of, shown together in an early lesson with real values. In QMaze: a state is a cell's number, an action is a move's number, and `P`, `policy`, `V` and `Q` are all tables looked up by them.
2. **Remember notes.** `{ added: true, note: '…', kind: 'recall' }` at the top of a later lesson that relies on an earlier idea: one to three sentences, naming the lesson that taught it. Shown with the eyebrow "Remember".
3. **Unpacking with real values.** Where code returns a tuple, builds a nested structure or indexes something several times, one worked example taking it apart one step at a time, with the values the real code gives (checked against the engine or `python/`).

## Rules

- Mark every block added to a lesson with `added: true`. Saved progress used to be keyed by block position; `src/labs/python-steps/progress.js` rebuilds the old layout by leaving `added` blocks out, so old saved answers and drafts still find their questions. Never add `added` to a block that was already there.
- Never change an existing check's prompt (it's the key its saved answer is stored under) or remove one.
- Every number in an addition is the real one: a `predict` gets a `compute` from the engine, so `lessons.test.js` checks it.
- Keep additions short. The labs work; this is the extra a beginner needs, not a rewrite.
- After each lab: its tests (`npx vitest run src/labs/<lab> --exclude "**/*.desktop.test.*"`) and `npx vitest run src/labs/python-steps`.

## Progress keys (done 2026-10-15)

All lesson labs now save checks by prompt (a derivation by title) through `src/labs/python-steps/progress.js`: QMaze, KartLab, Tabletop RL, Neural Net, Math for ML, CartPole, NLP Studio (also its derivation state and written code), and ML Lab's predictions. Math for ML's exercise drafts move from their old position key on first load. `python-steps/lessonKeys.test.js` checks every interactive block in every lab has a unique key.

## Status by lab

| Lab | Lessons | Status |
|---|---|---|
| QMaze Lab | 35 | Done 2026-10-15: 1.2 state and action as the indexes; 1.3 `reset`/`step` with real values; 2.1 `P` one bracket at a time and `build_transitions`' branches; Remember notes in 2.1, 2.4, 3.5, 3.8, 4.5; 4.5 A2C's shapes in one table; 5.2 `zip(*batch)` and 5.3 picking one value per row, on tiny examples. |
| KartLab | 25 | Done 2026-10-15: 1.1 a real `reset` and two `step`s (the state dictionary, action numbers, float display); 2.1 key and action as the indexes, `Q[key][action]` with key 376; Remember notes in 3.3, 4.3. |
| Tabletop RL Lab | 32 | Done 2026-10-15: 3.1 one real Q row, `Q[(hand, rolls_left)][kept]`, and the one-die tuple `(2,)`; Remember notes in 3.3, 4.7. |
| Neural Net Lab | 37 | Done 2026-10-15: 1.6 the network dictionary and `forward`'s three return values with real numbers; Remember notes in 2.2, 3.2, 4.3, 5.2; 6.3 one batch through the CNN, shape by shape. |
| CartPole Lab | 34 | Done 2026-10-15: 1.3 `reset` and `step` with real values (the 4-tuple, pushes visible in the numbers); 2.2 state number and action as the indexes (the same start is row 29); Remember notes in 3.3, 4.2; 5.4 A2C's shapes in one table. |
| NLP Studio | 46 | Done 2026-10-15: 3.1 text → words → vocabulary → vectors with real values; Remember notes in 3.4, 4.4, 5.4, 6.3; 5.6 the tiny GPT's shapes, checked by running `forward`. |
| Math for ML Lab | 171 | Done 2026-10-15, deliberately light: read the opening of all 65 lessons that build on 3+ others; they already restate each inherited symbol inline with a lesson link, so blanket Remember notes would only repeat them. Added two where a symbol was cited but not restated: 5.21 (what $\Sigma$'s entries are) and 8.29 (the advantage $A_t$). Note: this lab's text must link lessons as `[[#id]]`, never by number (a test enforces it). |
| Machine Learning Lab | 61 labs | Done 2026-10-15: a collapsed refresher (`{ added: true, bridge: … }`, "Refresher (optional): what this lab uses from Labs …") after the first paragraph of every lab's first lesson, restating in the earlier labs' own formulas what the lesson's prerequisite line names. 58 labs; not Lab 01 (no prerequisites), Lab 08 (already had one) or Lab 33 (the final capstone). Written from each lesson's `formula`; the script is idempotent (skips a lesson that has its refresher). Labs 03 and 37 keep blocks inside `lessons.js`. |
| A-Arcade family, Pycade | tracers | Looked at 2026-10-15, no change: they explain every line live as it runs, and A-Arcade Guided's first step already names the Q-table as one row per state and one column per action. |

## Checks run (2026-10-15)

Full suite without the Project Studio desktop walkthroughs (`npx vitest run --exclude "**/*.desktop.test.js"`): 413 files passed, 2 skipped; 14,518 tests passed, 318 skipped. `npm run typecheck`: no errors. Not yet seen in a browser: the new sections render in the render tests, but nobody has looked at them in the app.
