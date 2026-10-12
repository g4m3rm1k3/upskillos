# CartPole Lab: plan and status

A desktop lab (`#/lab/cartpole-lab`) built the way QMaze Lab is (lessons, Playground, Real Python), on one problem: CartPole. It takes someone who knows basic Python from the physics of the world to six learners: Q-learning and SARSA on a table of slots, REINFORCE in plain Python and in PyTorch, A2C and DQN. Asked for on 2026-10-11: "the same setup for cartpole, except more explanations in the real python section: what called it, any math or logic translations and what it does".

Read this file first when resuming.

## What it takes from the other labs

| From | What |
|---|---|
| QMaze Lab | The whole shape: lessons as blocks, line notes as the one source of truth for the Python tab, the tests (`lessons.test.js`, `coverage.test.js`, `render.test.jsx`, `bundle.test.js`, `parity.test.js`). Its styles (`qm-…`), `Markdown`, Python's Mersenne Twister (`engine/mt.js`) and the table learners (`engine/tabular.js`) are imported, not copied |
| A-Arcade Python | The live stepper (`desktop/app/runtimes/aarcade_stepper.py`) and its environment, reused as-is; the Python glossary (`explain/python.js`) for the "Python on this line" chips |

## What is new: the Python tab's explanation of a line

For the line about to run (or any line clicked), `PythonTab.jsx` shows:

- **What it does**: the lesson's bullets for that line, and a link to the lesson.
- **In maths**: the note's `tex`.
- **With this step's numbers**: the note's `calc(values)`, worked out from the paused frame's values (`self` becomes a plain object of its attributes), also shown inline on the current line. `stepper.desktop.test.js` checks every such calculation against the value Python then stores.
- **The logic, in words**: the note's `logic`, for conditions, with whether it is true right now.
- **How the program got here**: the real call chain from Python's stack, each caller's line, what the current function was called with, and where it will return to. In the browser, the static call sites (`callSitesOf` in `source.js`).
- **This line calls**: cards from `functions.js` (summary, inputs, return value, lesson); a method call's receiver is looked up in the paused frame to name the right class.
- **The names on this line**: live values, with meanings from `VARS` in `functions.js`, including `self.…` attributes.
- **Python on this line**, and **the function this line is in**.

One statement is one step: Python's tracer pauses on every line of a statement written over several lines and can come back to its first line; `midStatement` in `source.js` makes Step into and Step over carry on past those pauses.

## Lessons

35 lessons in six parts (`lessons/part1.js` … `part6.js`). Notes are `[has, bullets, { tex, calc, logic }?]`.

1. The world: four numbers · one step (Newton, then Euler) · the game loop · rules by hand · returns and discounting · the same as Gymnasium.
2. From numbers to a table: slots · four slots, one state number · what slots lose.
3. Learning a table: the Q-table · ε-greedy · the TD target · Q-learning · judging · SARSA · what the table learned.
4. Learning a policy: one neuron · softmax and a linear policy · the policy gradient · REINFORCE in plain Python · PyTorch · REINFORCE with a network.
5. Actor and critic: the advantage · the network · the rollout · the update · the gradient checked by hand.
6. DQN and beyond: Q-learning with a network · replay · target network and loop · six methods compared · your own CartPole and debugging.

## Measured findings the lessons rely on

- Monte Carlo control (first-visit, step 1/n, 500 games): greedy 500, 195, 188, 197, 197 on seeds 0–4; every lost game is the cart off the track; 2,000 games still about 190. Lesson 3.7.
- REINFORCE gradient from single games (policy frozen after 20 games, seed 0, 2,000 games): θ̇ part average 13.57, spread 34.8, 61% point the average's way with no baseline; b = 25: 13.79, 24.0, 74%; b = 60: 14.10, 59.5, 59%. Over 20,000 games Σ∇log π averages to 0 within its error. Lesson 4.5.

- `python/cartpole.py` equals Gymnasium 1.4's CartPole-v1 exactly (largest difference 0.0 over 5,000 steps).
- Hand rules over 100 games: always left 9.34, random 21.71, lean 43.05, lean ahead (θ + 0.25θ̇ > 0) 500.
- Q-learning, slots (1, 1, 6, 12), 500 games: greedy averages 500, 495, 184, 500, 500 for seeds 0–4; every lost game is the cart leaving the track. Seed 0's table agrees with "lean ahead" in 37 of the 42 rows where it has a preference; its largest value is 99.7 (ceiling 100).
- Linear REINFORCE (plain Python, rate 0.1): 54 → 371 average over 300 games; learned rule θ + 1.74θ̇ + 0.32ẋ > 0.
- REINFORCE (network), A2C and DQN: `engine/measured.json`, from `tools/measure.py`. Greedy over 20 new games, seeds 0–2: REINFORCE 500, 500, 500 (300 games, about 80 s each); A2C 500, 500, 500 (200,000 moves, about 50 s); DQN 293, 397, 157 (50,000 moves, about 130 s). DQN needed a 50,000-move buffer: with 10,000 it rose to about 290 and collapsed to about 120.
- JavaScript's `Math.sin`/`cos`/`exp` can differ from Windows Python's in the last digit (first at step 48 of seed 0's game); CartPole is chaotic, so long browser runs can drift from Python's. `parity.test.js` explains its tolerances.

## Checks

| Command | What it checks |
|---|---|
| `npx vitest run src/labs/cartpole-lab --exclude "**/*.desktop.test.js"` | Engine against Python (`parity.test.js`, data from `tools/make_parity.py`); every predicted number against the engine; every note against its line; every statement noted (`coverage.test.js`); every function documented with every input; every lesson and every line of every file drawn (`render.test.jsx`); strict bundle |
| `CARTPOLE_PYTHON=<python with numpy, torch, gymnasium> npx vitest run src/labs/cartpole-lab/stepper.desktop.test.js` | Every program in the real stepper; every "with this step's numbers" calculation equals what Python computes |
| `python src/labs/cartpole-lab/tools/make_parity.py` | Regenerates `engine/parity.json` (NumPy only) |
| `python src/labs/cartpole-lab/tools/measure.py` | Regenerates `engine/measured.json` (PyTorch, about 15 minutes, 2 threads) |

## Where we stopped

2026-10-11, session 1: the whole lab built and checked as above. Not yet checked: the Python tab inside the real Electron window.

2026-10-12: Monte Carlo added: 3.7 Monte Carlo control (`python/montecarlo.py`, sharing QMaze's `engine/montecarlo.js`) and 4.5 REINFORCE as a Monte Carlo method (`python/gradient_noise.py`, `figures/gradients.jsx`); later lessons renumbered, ids unchanged.
