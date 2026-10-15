# QMaze Lab: plan and status

A desktop lab (`#/lab/qmaze-lab`) that takes someone who knows basic Python and nothing about machine learning to understanding and applying tabular reinforcement learning on grid worlds: the MDP, value functions, Q-learning, SARSA, and A2C. Asked for on 2026-10-11 as a better PyCade: "not just the code runs and you see it", but every data structure drawn, every formula derived and tied to the line that computes it, on several different maps.

Read this file first when resuming. Update **Where we stopped** at the start of the next session.

## What it takes from the other labs

| From | What | How it's used here |
|---|---|---|
| A-Arcade Python | The live stepper (`desktop/app/runtimes/aarcade_stepper.py`, `window.openCalcDesktop.aarcade`): real Python paused before each line, watched values, knobs | Reused as-is: the lab sends its own program files. No new desktop code. Its environment already has NumPy, Gymnasium and PyTorch |
| A-Arcade Python | Per-line explanations checked by a test against the source | One source of truth instead: the lessons' own code notes, indexed by file and line (`lineNotes.js`), are what the Python tab shows; `coverage.test.js` requires a note for every statement |
| ML Lab | Ordered lesson blocks: paragraph, figure, predict, checkpoint, math ↔ code table, derivation | Same block idea; `LessonText` (Markdown + LaTeX) and `parseAnswer` reused |
| PyCade | Prerequisite links from one explanation to the next (tuple → unpacking) | Every lesson names what it builds on and links to it |
| Q-Arcade QMaze chapter | The 10 × 10 maze and its reward numbers | Same maze, same rewards, so the course's version looks familiar |

What PyCade lacked, and this lab must have: an order to learn in (lessons, not one screen), the world drawn as a map with the learner's data on it, by-hand exercises before the code, and checks that the learner understood.

## Design decisions

1. **One small `gridworld.py` runs every map.** Walls, cheese, cats, holes, cliffs and slippery ice are all cells of one text map. The learner reads all of it; nothing is hidden in a library. Lesson 2.6 checks that its transition table is identical to Gymnasium's real `FrozenLake-v1` and `CliffWalking-v1`, so the learner also meets the standard API.
2. **The transition table `P` is built explicitly**, in Gymnasium's own shape: `P[s][a]` is a list of `(probability, next_state, reward, terminated)`. It is what the MDP lessons draw, what value iteration reads, and what the learning algorithms never see.
3. **Python's `random` module, seeded, not NumPy's generator.** Basic Python, and the browser can reproduce it exactly: `engine/mt.js` is Python's Mersenne Twister. The in-browser figures therefore show the same numbers the Python program prints, and a test proves it bit for bit.
4. **Ties are broken at random**, and lesson 3.5 shows why `argmax` on a zero table is a trap.
5. **A2C starts linear.** One-hot state into a single linear layer is a table of logits and a table of values; its gradients can be derived by hand and checked against PyTorch's autograd. A hidden layer comes after.
6. **Real Python on the desktop, everything else everywhere.** Lessons, figures and the in-browser trainer work in the browser; the Python tab (stepping the real program) needs the desktop app and the A-Arcade Python environment.

## Maps

| Map | Size | What it teaches |
|---|---|---|
| Tiny corridor | 1 × 5 | Everything by hand: the whole Q-table fits in a sentence |
| Cheese and cat | 4 × 4 | Two endings, one good and one bad; reward design |
| Classic QMaze | 10 × 10 | Q-Arcade's maze and rewards; a big table; why the "revisit" reward breaks the Markov property |
| Cliff | 4 × 12 | Gymnasium's CliffWalking: SARSA walks safe, Q-learning walks the edge |
| Frozen lake | 4 × 4 and 8 × 8 | Gymnasium's FrozenLake: slippery transitions, values as averages |
| Cats and cheese | 6 × 6 | Several cats and a big and a small cheese: discounting decides which cheese |

## Lessons

31 lessons, all written (`src/labs/qmaze-lab/lessons/part1.js` … `part4.js`, `deepq.js`, `part5.js`):

Part 1, the problem: 1.1 a grid world as data · 1.2 actions · 1.3 the agent–environment loop · 1.4 rewards and the return · 1.5 discounting.
Part 2, the MDP: 2.1 the transition table P · 2.2 the Markov property · 2.3 policies · 2.4 value functions and the Bellman equation · 2.5 optimal values and value iteration · 2.6 the same worlds in Gymnasium.
Part 3, learning: 3.1 averages · 3.2 Monte Carlo prediction · 3.3 TD learning · 3.4 Monte Carlo against TD · 3.5 the Q-table · 3.6 ε-greedy · 3.7 Monte Carlo control · 3.8 Q-learning · 3.9 training and judging · 3.10 SARSA · 3.11 the cliff · 3.12 slippery ice · 3.13 reward design and exploration.
Part 4, A2C: 4.1 table to function · 4.2 softmax · 4.3 the policy gradient · 4.4 critic and advantage · 4.5 A2C line by line · 4.6 three methods compared, and a hidden layer.
Part 5, DQN (`lessons/deepq.js`): 5.1 a Q-network that sees the maze (visited + rat picture) · 5.2 replay memory and a target network · 5.3 DQN line by line, with and without visited marks.
Part 6, apply (`lessons/part5.js`, part id still `part5`): 6.1 build a world and solve it · 6.2 on your own machine, on Gymnasium, and when it doesn't learn.

## Measured findings the lessons rely on

- Hidden-layer A2C (32 units) on one-hot states: at lr 0.05 solves the corridor and Cheese and cat but collapses on QMaze, the Cliff and the frozen lake; at lr 0.01 Cheese and cat 3/3 seeds, QMaze 1/3, Cliff 0/3, frozen lake 48–76%. Lesson 4.6 explains why (nothing to generalise over).
- Cats and cheese: from zeros every method takes the small cheese; Q-learning with initial Q = 1 finds the big one on 5/5 seeds; SARSA doesn't (on-policy caution).
- Cliff (α 0.5, γ 1, ε 0.1 fixed, 5 seeds): Q-learning's greedy route −13 every time, SARSA's −17.
- Monte Carlo prediction against TD(0), random policy, seeds 0–9 (Cheese and cat, 300 episodes): error after 50 / 300 episodes is MC 1/n 0.09 / 0.04, MC α 0.05 0.15 / 0.06, TD α 0.05 0.30 / 0.05. Spread of a sample from the start: G is 8× (corridor 10×, frozen lake 60×) wider than r + γV(s′) with exact V. Lesson 3.4.
- Monte Carlo control (first-visit, step 1/n): Cheese and cat, corridor, Cats and cheese as Q-learning. Cliff (γ 1, ε 0.1): 500 episodes, 2/5 seeds reach the goal (the others loop in a corner until the time limit, all actions ≈ −189); 5,000 episodes, 5/5. Frozen lake, 2,000 episodes, γ 0.99: 5–33% success against Q-learning's 72%. Lesson 3.7.
- DQN (`dqn.py` defaults, picture = visited + rat, seeds 0–4, greedy return): Cheese and cat 3,000 moves 0.80 with and without marks; Classic QMaze 20,000 moves with marks −0.64 (42 moves) on all five, without marks −49.79, −0.56, −47.69, −49.16, −48.32 (four loop to the time limit). Browser run of Classic QMaze about 23 s. Lesson 5.3.
- The lab's learners on Gymnasium's own worlds (via `gym_adapter.py`): FrozenLake 74.3% success, CliffWalking −13 / −17.

## Checks

| Command | What it checks |
|---|---|
| `npx vitest run src/labs/qmaze-lab --exclude "**/*.desktop.test.js"` | Engine = Python bit for bit (`parity.test.js`, data from `tools/make_parity.py`); browser A2C = PyTorch to ~2e-7 (`a2c-parity.test.js`, `tools/make_a2c_parity.py`); browser DQN = PyTorch (float64) to 1e-9 (`dqn-parity.test.js`, `tools/make_dqn_parity.py`); every predicted number = engine; every code note matches its line; every Python statement has a note (`coverage.test.js`); every lesson renders and survives every map (`render.test.jsx`); strict esbuild bundle (`bundle.test.js`) |
| `QMAZE_PYTHON=<python with numpy, torch, gymnasium> npx vitest run src/labs/qmaze-lab/stepper.desktop.test.js` | Every Python-tab program in the real A-Arcade stepper |
| `python src/labs/qmaze-lab/tools/check_gymnasium.py` | gridworld.py's P equals Gymnasium's FrozenLake (4×4, 8×8) and CliffWalking |

Regenerate `engine/parity.json` / `engine/a2c-parity.json` with the tools scripts after changing any program in `python/`.

## Where we stopped

2026-10-11, session 1: the whole lab is built (25 lessons, Playground, Python tab, map builder) and verified as above. Not yet checked: the Python tab inside the real Electron window (the stepper itself is tested directly; the A-Arcade Python environment wasn't set up on this machine, so the tab's "Set up Python" flow is untested here).

Next, if wanted: exercises where the learner writes the update functions and they are checked (Pyodide or the desktop stepper); expected SARSA and n-step Q-learning; a check of the Python tab in Electron.

2026-10-12: Monte Carlo added (3.2 prediction, 3.4 against TD, 3.7 control; `python/montecarlo.py`, `engine/montecarlo.js`, `figures/montecarlo.jsx`), later Part 3 lessons renumbered (ids unchanged).

2026-10-12: DQN added as Part 5 (`python/dqn.py`, `engine/dqn.js`, `figures/dqn.jsx`, `lessons/deepq.js`); "Apply it" is now Part 6 (ids unchanged).

2026-10-15: the owner is working through the lab, and wherever they get confused we add the explanation to the lab itself, so every learner gets it. Rules for these edits: add to a lesson without making it longer than it needs to be, and use real values (checked against the engine or `python/`). A **Remember** note (`{ note, kind: 'recall' }`) goes at the top of a later lesson to recall an earlier idea it relies on.
- 1.2: new section "State and action: the two indexes for everything" (numbered map, the four tables `P`, `policy`, `V`, `Q`, one choice question).
- 2.1: a Remember note; "Reading P one bracket at a time" and "One trip through the loops" (the three branches of `build_transitions`, the `*` unpacking), with a predict on `P[0][3][0][1]`.
- 3.5: a Remember note linking `Q[s, a]` to `P[s][a]`.
- Progress: solved checks are now saved by prompt text (`checkKey` in `Blocks.jsx`), not block position, so adding blocks never moves saved answers; old saved positions are converted on load. `lessons.test.js` checks prompts are unique within each lesson. Changing a prompt's text resets that one check.
