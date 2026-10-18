# ML Foundations Lab

The lab at `#/lab/ml-foundations` (`src/labs/ml-foundations/`). Read this first when resuming, and update **Where we stopped**. It is built to [lab-quality-standard.md](lab-quality-standard.md).

## The brief

The owner's words (2026-10-18): the very first lab of a machine-learning series. It should take the best of every lab (QMaze, Data Science, Linear Algebra, Dynamic Programming) and be better: walkthroughs with visuals and steps, CodeLens, a lot of hands-on work and discovery. The existing ML labs feel "too passive and complex"; this lab builds the complexity up from simple pieces and primes the brain for machine-learning thinking.

It grew from the owner's notebook series in `incomplete ideas/new notebooks` (L01–L12, not added to the app). The lab keeps that series' order and its "pieces with contracts" idea, and fixes what the review found:
- **The pieces now connect.** One world shape is used everywhere: `parse_map` → `legal_moves` → `build_table(maze, slip)` → `sample_outcome(outcomes, u)` → `play_episode(table, start, choose, rng)`. In the notebooks, L02 re-read the raw rows and three different `step` signatures existed.
- **The learner writes the pieces**, and the code they pass becomes the version later lessons run on ("your toolbox"). In the notebooks, the solution sat in the cell below the exercise and the saved module was the author's.
- **The payoff comes first.** Lesson 0 is the finished Q-learner running on a maze, with every line tagged with the lesson that builds it, so each piece has a visible purpose.

## What is there

Each lesson has five stages (`LessonView.jsx`):

1. **Try it** (before any explanation, and the explanations are locked until it is done or skipped): hands-on puzzles on the map, each wrong answer named (a swapped (column, row) click, a diagonal neighbour, forgetting that a slip can land on the intended move, ...).
2. **Watch it run** (`Stepper.jsx`): the real Python on the left with the running line lit (amber = about to run), a picture in the middle with a sentence for each line, every variable on the right (changes glow). Play, pause, step, scrub, speed, arrow keys. It **stops before key lines** and asks the learner to predict (a number, a cell clicked on the map, a choice, or Python text), with misconception feedback; a score counts right-first-time. Every step-through takes the learner's own input: a map editor (click squares, edit the text, 🎲 Surprise me), plus square, move, slip and seed pickers.
3. **Understand** (`Blocks.jsx`): the logic first, the code annotated line by line (mechanism, not just effect), the maths named and mapped symbol by symbol to variables, an interactive figure where useful (the dart board for sampling), predict and choice checks. Every number in them is computed.
4. **Write it** (`WriteIt.jsx`): two "write it" challenges and one bug hunt per lesson, in Python (Pyodide in a worker). ▶ Run runs the code as written and shows every print and the value of any call typed in the Run box (presets one click away); ✓ Run & check grades it on hidden cases, including random maps; a failing case goes to the Run box in one click; hints come one at a time; 🔍 Open in CodeLens steps the learner's code with just the helpers it uses; after a pass, "Compare with the lab's version".
5. **Keep**: the piece card (contract), what to remember, the ML names in a table, and what is next.

Lessons built (2026-10-18): **0 The finish line** (predictions, a live trainer with knobs, three experiments, one game stepped line by line, the program tagged by lesson), **1 Maps from text**, **2 What a move does**, **3 Playing one game**. The rest of the map is in `curriculum.js` (shown in the sidebar as planned).

Progress: one synced key, `oc-ml-foundations` (`progress.js`), in `SYNC_KEYS`, merged by `mergeMlFoundations` in `src/context/progressMigration.ts` (nothing is ever un-done). A solved lesson shows ✓ in the sidebar, part counts, stage dots, and the header bar; a pass is pushed at once.

## How the pieces fit

- `world.js`: the JavaScript twin of every Python piece (drawing, animating, grading), plus the seeded generator, random solvable mazes, and the trainer.
- `python/pieces.js`: the Python reference of every piece (shown, stepped, and the lab version in the toolbox), the finished program `FINISH` with `FINISH_TAGS`, the check helpers (`HARNESS`: the maps, `Dice`, `error_of`, `sorted_table`) and `_ml_norm` (tuples as lists, tuple keys as `"r,c"`, numbers rounded to 6 places, so answers compare the same way in both languages).
- `traces.js`: one frame generator per stepped function. Lines are found by their text (`lineFinder`), never by number.
- `lessons/<lesson>.jsx`: one file per lesson (Try component, Watch components, Understand blocks, challenges, Keep), registered in `lessons/index.js`. `lessons/cases.js` builds check cases from the JS engine.

## How to add a lesson

1. Add the Python piece to `PIECES` and `PIECE_ORDER` (`python/pieces.js`) and its twin to `world.js`.
2. Write a trace in `traces.js` for each function to step through, with one or two `ask`s at the lines that matter, each with the misconceptions that a real learner would have.
3. Write `lessons/<id>.jsx` like `maps.jsx`, register it in `lessons/index.js`, and set `built: true` in `curriculum.js`.
4. Every expected answer comes from `world.js` (never typed), with random maps among the cases.
5. **Teach before asking** (the owner's rule): every question, prediction and experiment has a `teach` ("What you need to know": the rule, the numbers, or a worked example of a similar case) and a reason for the right answer. An estimate needs a method taught first (lesson 0 teaches the random-walk rule, distance², before asking how long the first game takes). `content.test.js` enforces this.
6. Measure before claiming: a number or behaviour quoted in text is computed, or checked by a test (see `finish.test.js`).
7. Add the lesson to `tools/browser-check.mjs`: its title, its pieces, and the one-line fix of its bug hunt.

## Verification

- `npx vitest run src/labs/ml-foundations` (about 10 s):
  - `pieces.test.js` runs real Pyodide. Every lab solution passes its cases and every starter fails one. The trimmed CodeLens program runs every Run preset. Every trace ends with the answer the real Python gives (lesson maps and random ones; legal moves on every open square; the table for every square, move and three slips; episodes with the same dice). Every ask is sane. Lesson 0's program, run as Python, learns the 7×7 maze.
  - `finish.test.js` re-measures every claim in lesson 0 over 40 seeds.
  - `progress.test.js` covers the synced key, cleaning, a merge that never un-does anything, and the toolbox.
  - `lab.test.jsx` uses the lab as a learner would.
  - `content.test.js`: every question teaches first and explains its answer.
- `node src/labs/ml-foundations/tools/browser-check.mjs [out] [--only finish,maps,...]` starts its own dev server (and stops it). For every lesson it does or skips Try it, steps every stepper and answers a prediction wrongly (feedback must show), trains lesson 0 for 200 games (the arrows must reach the cheese), writes every piece in real Python (Run must show the print, Run & check must pass), fails then fixes each bug hunt, checks the ✓, opens CodeLens and comes back, and checks a narrow window for sideways scroll. **Look at the screenshots.**

## Plan

Items 1–3 were built on 2026-10-18 (see Where we stopped); 4 and 5 are still open. Each lesson keeps the five stages and is built to the standard.

1. **Part 2, worth by computation**: 4 Weighted averages (`expected_value`, `option_values`; the worth of a move as a chance-weighted average, on the table from lesson 2), 5 Backfilling (steps-to-go by sweeps and BFS, then worth by sweeps; a visual where values spread from the cheese), 6 Discounting (`discounted_total`, horizons, the flip point between two routes), 7 Plans from values (greedy plan, evaluate and improve), then **A1 value iteration** as an assembly of the learner's own pieces.
2. **Part 3, learning from samples**: 8 Sampling (estimates and their error, the black box), 9 Running averages (the alpha line, fixed alpha vs 1/n, a weights-on-samples picture), 10 Estimates from estimates (TD and the Q update, the order of updates), 11 Trying vs repeating (greedy, epsilon, optimism and UCB on bandits, and a maze where `eps = 0` fails: lesson 0's experiment 2 promises it), then **A2: your own Q-learner**, lesson 0's program written entirely from the learner's toolbox, run on their own maps.
3. **Part 4, from tables to formulas**: 12 Tables vs formulas, 13 Slopes and descent, 14 Layers and backprop, 15 Batches and memory, then **A3 network Q-learning**.
4. **Remember and review** (standard 10): spaced review of the predictions and checks, ported from Linear Algebra's `review.js`.
5. A desktop "Real Python" step-through (QMaze's `PythonTab.jsx`) for the assemblies.

## Pitfalls found so far

- **Derived objects in `useMemo` deps**: `tryParse(text).maze` made a new object every render, so the stepper's frames changed and it reset itself to step 1 mid-question. Memoize the parsed map on the text.
- **`0.1 + 0.2 + 0.7` is exactly 1.0**; `0.7 + 0.2 + 0.1` is 0.9999999999999999. Check a floating-point claim in node before writing it.
- **Apostrophes inside single-quoted JS strings** (an inserted "doesn't") break the parse; write "does not", or use the Write tool rather than a shell replacement.
- **Heredocs that contain triple quotes** break a Python edit script; use the Edit tool.
- **The browser check meets the app's tour and "What's new" popups**, stacked; `dismissPopups()` clicks them with `force` and presses Escape.
- **The stepper's question about a step must show what that step's picture needs** (the chance bar): the picture gets the upcoming frame as `upcoming`.
- **Python's `sum()` of floats is compensated** (Neumaier, since Python 3.12): it can differ from left-to-right adding in the last bit, and that bit decides **ties** between equally good moves (a JS plan said "down" where Python said "right" on `SMALL` with ice). The JS twin uses `pySum` (world.js), which matches CPython exactly; `pieces.test.js` checks it on random lists. Any new piece that uses `sum()` must use `pySum` in its twin.
- **Edit scripts lose escapes.** A Python edit script run from the shell turned `\n` inside JS strings into real newlines and `\'` into `'` (three times). For any text with quotes, backticks or `\n`, use the Edit or Write tool. Shell heredocs with apostrophes fail outright.
- **Sweeping with g = 1 never settles if any square can't reach the cheese** (`SEVEN`'s bottom-left corner). Lessons 4–5 use `sealIslands(text)` (world.js) to wall such squares up; lesson 6 is about exactly this.
- **Python and JavaScript round a half-way value in opposite directions** (−0.0805725 to 6 places). Answers are now compared with `_ml_same` (a 1.5e-6 tolerance after `_ml_norm`), not as rounded text.
- **Playwright name lookups are substring matches**: "Write estimate" also matched "Write estimate_outcomes". The browser check uses `exact: true`.
- **Random mazes often have walled-off squares** (21 of 50 in one sample): seal them when a lesson needs g = 1.
- **A question must be answerable from its teach box.** "How many sweeps?" could not be reasoned out and was replaced by "does the order change the answer?". Check each new question against that rule before writing it.
- **The 14 "content problems"** from `npm run facts` predate this lab.
- **Other sessions share this working tree**: commit only this lab's files, this doc, the two sync lines (`AuthContext.jsx`, `progressMigration.ts`) and the regenerated facts.

## Where we stopped

2026-10-18, first session: the whole lab shell, the five-stage lesson player, the stepper with predictions, the map editor, the Python runner with the toolbox, progress sync, and lessons 0–3. Every test, the typecheck and the browser check pass. Then, on the owner's feedback ("we ask a lot of questions and we don't explain why the correct answers are correct"), every question got a "What you need to know" box, a "Why:" for the right answer, and "Show me the answer". 

Same day, the owner said "build this full series". Shared pieces added first: `TrySequence.jsx` (Try it as data: steps of `md`, `figure`, `choice`, `predict`, `task`, each question with its `teach`) and `ValuePicture` (pictures.jsx). Part 2 traces live in `traces-part2.js`. **Part 2 is built**: lessons 4 (weighted averages), 5 (backfilling), 6 (discounting), 7 (plans) and A1 (your own planner). Each has Try it, step-throughs with predictions, Understand, two write-it challenges and a bug hunt. Discoveries the lessons are built around, all measured: `SEVEN` never settles with g = 1 (the corner squares lose 0.08 a sweep, forever); with g = 0.9 they settle at −0.04 / (1 − 0.9) = −0.4; the edge map (`EDGE` in planner.jsx) switches from the top edge to row 2 at slip 0.4, because slips off the edge cost bumps. 147 tests pass; the browser check passes on lessons 4–7. 

**Part 3 is built**: lessons 8 (sampling), 9 (running averages), 10 (estimates from estimates), 11 (trying vs repeating) and A2 (your own Q-learner). Part 3 twins live in `world-part3.js`, traces in `traces-part3.js`. The helpers now include `Seeded(n)`, a Python port of the page's mulberry32 generator: identical numbers in both languages, so A2's checks replay a whole learning run and compare every guess. Measured discoveries: greedy on the slot machines (means 1, 2, 4) never finds the best one (0 of 300 runs), eps 0.1 always does; random behaviour (eps 1) learns exactly the planner's worths in 50 games, eps 0.1 leaves squares unvisited; news travels back one square per game on a corridor; 300 games learn the 14-move route on `SEVEN` with every seed tried. `claims.test.js` re-measures every claim the Part 2 and 3 texts make. 225 tests pass; the browser check passes on A1 and lessons 8–A2. 

**Part 4 is built, and with it the whole series** (20 lessons): 12 (tables vs formulas), 13 (slopes and descent), 14 (layers and backprop), 15 (batches and memory) and A3 (Q-learning with a formula). Twins in `world-part4.js`, traces in `traces-part4.js`. Measured discoveries: learning from half the maze, a one-hot table misses unseen squares by 0.6 while row and column miss by 0.21, and the single feature "moves to the cheese" does best; gradient descent on (x − 3)² lands in one step at lr 0.5, bounces at lr 1, diverges at 1.1; one tanh unit can't fit a hill (0.08), two can (0.0001); learning the right half of the hill in order wipes out the left (0.0001 → 0.2–0.3), replay keeps most of it; the formula learner with row and column wins the open room (4, 4, 4 moves after 60 games against the table's 4, 6, 6) and fails on `SEVEN` every time. 303 tests, the typecheck, the catalog check and the browser check on all 20 lessons pass.

**Next, if the owner wants more:** spaced review (standard 10); a Real Python (desktop) tab for the assemblies; a network (lesson 14's) inside A3 with a target network, which is full DQN.
