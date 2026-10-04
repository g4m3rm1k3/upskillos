# Reinforcement Learning in pygame — track plan

A Project Studio track (desktop app only) that takes a learner from an empty folder to tabular Q-learning and real Gymnasium environments. Each lesson adds to one project, `rl-workbench`: a pygame program where the environment, the agent and what the agent has learned are all visible while it runs.

Lessons live in `src/labs/project-studio/tracks/rl-pygame/`. Supplied files live in its `support/` folder.

## Why a Project Studio track and not the ML lab

The ML lab and the Notebook Lab series run Python in the browser (Pyodide). They can't open a window, run for minutes, use a GPU or install packages such as Gymnasium's renderers. Project Studio already runs real files from a folder on disk, with diffs, a terminal and checks that run the learner's code. Since this change, a project with a `.venv` runs on that environment's Python (`desktop/app/runtimes/python.cjs`, `projectCommand`).

## The route, compared with the suggested fast track

The suggested fast track uses Notebook Lab ML series lessons 1, 2, 10, 11, 12, 17 and 64–70. Checking those lessons against what Q-learning needs:

| Suggestion | Decision | Evidence |
|---|---|---|
| 1–2 NumPy | Keep | A Q-table is a 2D array; `Q[s].argmax()`, `Q.max(axis=1)` and fancy indexing appear in every RL lesson. |
| 10, 12 Probability, expectation | Keep | Slippery moves, ε-greedy and returns are random; their averages are the values being learned. |
| 11 Distributions | Shrink | Only uniform choices, Bernoulli slips and normal rewards are used. They are taught where they first appear. |
| 13 Estimation and uncertainty | **Add** (standard error only) | Comparing two agents means averaging over seeds and knowing how much the average can be trusted. One lucky run proves nothing. |
| 17 What learning is | **Replace** | Its sections are features, labels, loss, test sets: supervised framing that Q-learning doesn't use. |
| (none) | **Add: the running average** | Every RL method updates `estimate += step × (target − estimate)`. The notebook series first meets it inside the bandits lesson. Here it gets its own lesson first. |
| 64–70 RL core | Keep, in order | Each method fixes a flaw of the one before. Bandits move before the grid world (Sutton & Barto's order): a bandit is the running average with actions and no states. |
| (none) | **Add: Gymnasium** | No notebook lesson covers it. Termination vs truncation changes the Q-learning target, so it gets a lesson. |
| (none) | **Add: setup and pygame** | A virtual environment, pinned packages, a GPU check and the game loop. The game loop is the agent–environment loop. |

## Chapters

All 30 lessons are written and pass the walkthrough test.

| # | Lesson | Notebook source |
|---|---|---|
| 0.1 | A project with its own Python (venv, pinned packages, wheels) | — |
| 0.2 | Know your machine: `doctor.py` (Python, packages, GPU) | — |
| 0.3 | A window and a loop (frames, event queue, `flip`, `tick`, coordinates) | — |
| 1.1 | Arrays: the shape of a Q-table (memory layout, axis, argmax ties) | 1 |
| 1.2 | Indexing and broadcasting: random tie-breaks, the transition table | 2 |
| 2.1 | Probability by simulation: uniform numbers to weighted choices, a slippery floor | 10, 11 |
| 2.2 | Expectation, variance and the standard error | 12, 13 |
| 2.3 | The running average and the step size α | — |
| 3.1 | A room of slot machines (play it yourself; the greedy trap) | 65 |
| 3.2 | Explore or exploit: ε-greedy, optimism, common random numbers, a reusable chart | 65 |
| 3.3 | UCB, drifting machines, refactoring the comparison window | 65 |
| 4.1 | The grid world as a Gymnasium-shaped environment (terminated vs truncated) | 64 |
| 4.2 | The workbench: agent interface, input / simulation / drawing, fixed simulation rate | 64 |
| 4.3 | Returns and discounting; policies as arrow maps | 64 |
| 4.4 | Testing your own environment: mutation testing | — |
| 4.5 | The world as tables: P and R, the Markov property, mouse input | 66 |
| 5.1 | Policy evaluation, checked against played returns and an exact linear solve | 66, 67 |
| 5.2 | Value iteration, greedy policies, policy improvement | 67 |
| 6.1 | Monte Carlo control (and the safe-but-useless trap) | 68 |
| 6.2 | TD(0) against Monte Carlo on the random walk (Sutton & Barto Fig. 6.2) | 69 |
| 6.3 | SARSA on the cliff; cliff tiles and a regression check | 69 |
| 7.1 | Q-learning and Expected SARSA; on- and off-policy | 70 |
| 7.2 | Judging an agent honestly: greedy evaluation, seeds, reference values | 70, 13 |
| 7.3 | Tuning: step × ε heatmap, optimism and bootstrapping, values vs policies | — |
| 7.4 | The maximisation bias and Double Q-learning (Sutton & Barto Ex. 6.7) | — |
| 7.5 | Reward design: hacking, potential-based shaping, wrappers | — |
| 8.1 | Your grid world as a `gymnasium.Env` (spaces, seeding, render modes, register) | — |
| 8.2 | FrozenLake: your agent on Gymnasium's world, judged against its own `P` | — |
| 8.3 | CartPole: discretisation, `ObservationWrapper`, where tables break | — |
| 8.4 | Capstone: an environment, tests, experiment and report from a blank file | — |

Lessons can be inserted later without renumbering existing files: use a new number between two existing ones (for example `02-04-…`). A lesson's progress key is its file name, so never rename a published lesson.

After Chapter 8: neural networks (ML series 46–50) and DQN (lesson 71) in PyTorch, which is where the GPU first matters. A separate planned series rebuilds Game Studio for pygame.

## How lessons are written

- **Explain how, not only what.** Every new call, term or game mechanic gets its mechanism, usually as a worked example with real numbers or a short trace: how `clock.tick` decides how long to sleep, how `reshape` avoids copying, how one uniform number picks a weighted outcome. The learner knows Python but not game development.
- **Measure every number the text quotes.** Outputs, timings and spreads in a lesson come from running the code (the walkthrough runs every step; prompt sessions and measurements were run by hand).
- **Read the tests first.** Each lesson opens with its supplied test file and explains how to read it. Steps are checked with `pytest -k <name>`; a later step's test name must not contain an earlier step's `-k` text (this has caught real bugs: `values` matched `test_normalise_all_equal_values…`).
- **Every check has at least one wrong answer** in `tracks/rl-pygame.walkthrough.js` that it must reject. A wrong answer that passes means the test is weak: the absolute-distance variance passed for ±1 rewards until a die case was added.

- **Prediction checkpoints.** A ```predict fence (format in `src/labs/project-studio/predictions.js`) asks the learner to commit to an answer before the explanation is shown. Number predictions must, and choice predictions may, have a `verify:` command (or `verify: script name.py`, run from `tracks/rl-pygame/verify/`); the walkthrough runs it and fails if the code doesn't produce the stated answer.

- **Rules learned the hard way.** Each one caught a real bug while the track was written:
  - `pytest -k` also matches the test **file's** name, so a test file must not contain any step's `-k` word (`test_cliff.py` with `-k cliff` selects everything). Prefix each test with its step's word, and check that a later step's test name doesn't contain an earlier step's word (`unshaped` contains `shaped`).
  - A `verify:` script runs right after its step, so it may only import files that exist by then.
  - Verify output is compared as text: keep choice answers in plain ASCII (a typographic minus `−` never matches a printed `-`).
  - Python's `__pycache__` treats a file as unchanged when its size and its modification second match; the walkthrough sets `PYTHONDONTWRITEBYTECODE=1` so that a quick, same-length wrong answer is never checked as the old code.
  - Lesson Markdown splits steps on any line starting with `## `, even inside a code block: reference files shown in a lesson use `###` headings.

## Supplied files and where they are taught

Things may be handed over up front, but by the end of the track everything handed over is taught. Each supplied file and the lesson that explains it:

| Supplied file | Supplied in | Taught in |
|---|---|---|
| `tests/test_*.py` (one per lesson) | each lesson's first step | Read and explained in each lesson's "Read the tests first"; writing your own is lesson 4.4, and the capstone 8.4 has none supplied |
| `tests/conftest.py` (SDL dummy drivers) | 0.3 | Explained line by line in 0.3 |
| `mutants.py` and `mutants/*.py` | 4.4 | Explained line by line in 4.4; the learner writes the tests they run against |

Not supplied to the learner: `tracks/rl-pygame/verify/*.py`. They're used only by the walkthrough test, to prove that each prediction's stated answer is what the code produces.

## Runtime decisions

Measured on 2026-10-03 (Windows 11, Python 3.13.14):

- **Python 3.12 or newer.** `numpy==2.5.3` requires Python ≥ 3.12 (its `Requires-Python`).
- **pygame-ce, not pygame.** `pygame==2.6.1` has no wheel for Python 3.14 (`pip download --python-version 3.14` finds none); `pygame-ce==2.5.8` has wheels for 3.12, 3.13 and 3.14 and is still imported as `pygame`.
- **Plain `gymnasium`, no `[toy-text]` or `[classic-control]` extras.** Those extras require upstream `pygame`, which would install over pygame-ce. With `pygame-ce` installed, FrozenLake and CartPole render (`render_mode="rgb_array"` returned 256×256 and 400×600 frames).
- **Checks run `.venv/Scripts/python`** by path, so they don't depend on whether the learner activated the environment. Windows PowerShell's default execution policy (`Restricted`) blocks `Activate.ps1`; Lesson 0.1 explains that error.
- **GPU.** Tabular methods gain nothing from a GPU. The RTX 5060 on the development machine reports compute capability 12.0 (Blackwell), which needs a PyTorch build for CUDA 12.8 or newer. That is taught when PyTorch arrives, using what `doctor.py` reports.

- **Gymnasium environments without extras.** FrozenLake and CartPole render through pygame-ce; `check_env` passes on `GymGrid` and the capstone reference.
- **Step size on sparse rewards.** On FrozenLake, a constant step of 0.1 reached the optimum (0.53–0.54 of 0.542) in every seed within 5000 episodes, while 1/N stalled at 0.2–0.5; lesson 7.3 explains why (averages remember early zero targets).

## Verification

`src/labs/project-studio/rlPygame.desktop.test.js` walks the track like a learner: it creates the venv, installs `requirements.txt`, types each step's file, runs every check, and tries the wrong answers listed in `tracks/rl-pygame.walkthrough.js` (each must fail the named checks).

```sh
npx vitest run src/labs/project-studio/rlPygame.desktop.test.js
```
