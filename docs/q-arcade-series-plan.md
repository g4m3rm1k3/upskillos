# Q-Arcade: Q-learning by building games in pygame — series plan

**Status:** planned 2026-10-07; the owner approved it the same day, with the corridor chapter kept and one Pac-Man clone with generated mazes in place of Catch, Snake and Breakout-lite. Writing started 2026-10-07, from Chapter 0. Lesson status is in *Progress* at the end.

A new Project Studio series (desktop app). It starts with Q-learning on day one, solves the two school problems (CartPole, then QMaze), and then builds pygame games that agents learn to play, ending with learning from pixels the way DeepMind's Atari agent did, on games we write ourselves.

It is **separate** from the `rl-pygame` track (`docs/rl-pygame-track-plan.md`), which is left unchanged. It borrows that track's measured runtime decisions and its authoring rules. It doesn't depend on any of its lessons.

The finished games and agents are meant to become examples in Forge later (Forge Chapter 28, "Tutorials and Examples Inside Forge", and Chapter 54, "Machine learning as a Forge feature").

## Constraints from the learner

- **Deadline:** Q-learning this week, CartPole and QMaze across this week and next. Shallow learning isn't acceptable either. The route below is short because it adds each idea only when the next step needs it, not because it skips the mechanism.
- **Starting point:** knows Python and everyday programming. Knows little about machine learning, NumPy, Keras or PyTorch. All of it is taught.
- **Just in time:** no front-loaded maths or library chapters. A concept appears in the lesson whose problem needs it.
- **Both Keras and PyTorch.** The course's framework is unknown, and writing every network twice builds fluency. PyTorch comes first each time because its training loop is visible. Keras follows, and the lesson shows which part of that loop `fit()` hides.
- **Bite-sized and typed:** each lesson takes 20–40 minutes, has 3–6 steps, and the learner types every line. Each step is checked by tests (see *How lessons are written*).

## The order, and why

| Order | Why it comes here |
|---|---|
| 1. A five-cell corridor | Q-learning's update can be traced by hand on 5 states × 2 actions, with real numbers, in one lesson. Starting on CartPole would teach two new ideas at once: the update rule and turning continuous numbers into table cells. This is one short chapter, not a detour. CartPole is still the first real problem. |
| 2. CartPole with a table | The first school problem. The only new idea is *binning*: four continuous numbers become one table cell. The agent from Chapter 1 runs unchanged, which shows why the environment interface matters. It ends with where tables break. |
| 3. QMaze with a table | The second school problem. It's a grid, so the table fits, and the agent learns one fixed maze. Then a new maze shows that a table can't generalise, which motivates networks. |
| 4. From a table to a network | Only the ML needed for DQN: a function with adjustable numbers, loss, the gradient, gradient descent, one hidden layer. Written in NumPy first, then PyTorch, then Keras. |
| 5. Deep Q-learning on QMaze | The classic QMaze solution (a network plus experience replay), built in both frameworks. |
| 6. Deep Q-learning on CartPole | No more bins: the four numbers go straight into the network. Adds the target network. Compared honestly with Chapter 2. |
| 7. Pac-Man, built in stages | One game with real logic, built once and understood: tile movement, a maze generator, ghosts with the arcade's targeting rules, power pellets as a state machine. Each stage is playable and gets its own learning experiment. |
| 8. Learning from what it sees | The maze as image layers, then pixels; the DQN paper's frame stacking; convolutional networks; training on the GPU. Pac-Man is a real Atari game, so this is the Atari chapter, on our own game. |
| 9. Capstone | A game of the learner's own design plus an agent. This becomes the first Forge example. |

**School milestones:** Chapters 0–3 (CartPole and QMaze with tables) is about 18 lessons, for this week. Chapters 4–6 (networks, DQN on QMaze and CartPole) is about 13 lessons, for next week. Chapters 7–9 have no deadline.

## Chapters

The working series key is `qarcade`, with tracks `qarcade-setup`, `qarcade-corridor` and so on. Each lesson's file name is its progress key, so names are final once published. Lessons can be inserted later without renumbering, by using an unused number between two existing ones.

### 0 · Setup (`qarcade-setup`), 2 lessons

| # | Lesson | Taught |
|---|---|---|
| 0.1 | A project with its own Python | venv, pinned `requirements.txt` (numpy, pygame-ce, gymnasium, pytest), how a venv redirects imports, PowerShell's execution policy error |
| 0.2 | A window and a loop | the pygame frame loop: event queue, `flip`, `clock.tick`, screen coordinates. **The game loop is the agent–environment loop**, which the rest of the series builds on |

PyTorch and Keras are not installed here. They arrive in Chapter 4, when they're needed.

### 1 · Q-learning in five cells (`qarcade-corridor`), 5 lessons, day 1

| # | Lesson | Taught |
|---|---|---|
| 1.1 | A corridor you can play | state, action, reward, episode, `reset`/`step` returning `terminated`. Play it with the arrow keys first |
| 1.2 | The Q-table | a NumPy 2D array built up from a list of lists, `Q[s, a]`, `argmax` and ties; what a Q-value *means* (expected total future reward), predicted before it's shown |
| 1.3 | The update, by hand | the running average `estimate += α × (target − estimate)`, then the target `r + γ · max Q(s′, ·)`; trace five updates with real numbers; discounting with γ |
| 1.4 | Explore or exploit | ε-greedy; measure what happens with ε = 0 (it gets stuck) and with ε = 1 (it never uses what it learned) |
| 1.5 | Watch it learn | Q-values drawn on the cells while it trains, a reward-per-episode chart; experiments with α and γ |

### 2 · CartPole with a table (`qarcade-cartpole`), 6 lessons, days 2–3

| # | Lesson | Taught |
|---|---|---|
| 2.1 | The cart and the pole | Gymnasium's `CartPole-v1`: the four numbers and what each means, how the physics advances one 0.02 s tick (Euler step, traced), drawn by us in pygame; play it with the arrow keys |
| 2.2 | A random agent, measured | the baseline: mean episode length over many seeds; `terminated` vs `truncated`, and why it changes the target |
| 2.3 | Four numbers into one cell | binning with `np.digitize`, choosing ranges for unbounded velocities, combining four bin indexes into one state number; predict the table's size |
| 2.4 | Chapter 1's agent on CartPole | the same agent, unchanged; ε decay; first successful balances |
| 2.5 | Judging an agent honestly | greedy evaluation, several seeds, mean ± standard error, which is taught here because one lucky run proves nothing |
| 2.6 | Where tables break | more bins makes learning slower, measured; the curse of dimensionality; the question Chapter 4 answers |

### 3 · QMaze with a table (`qarcade-qmaze`), 5 lessons, days 4–5

The maze follows the classic QMaze rules (Samy Zafrany's Keras tutorial, samyzaf.com/ML/rl/qmaze.html, the source most courses use) so the learner can read their course's code. The owner can't share course files (school policy), so the lessons follow the public tutorial, and 3.5 shows where each rule lives so the learner can compare their course's version themselves. Checked against the tutorial's source on 2026-10-07: a **10×10** maze; free = 1.0, wall = 0.0, rat marked 0.5; actions LEFT 0, UP 1, RIGHT 2, DOWN 3; target bottom-right; rewards +1 cheese, −0.04 move, −0.25 move onto a visited cell, −0.75 invalid move; lost when total reward drops below −0.5 × maze size (−50). The tutorial's `update_state` sets `mode = 'invalid'` instead of `nmode`, and the visited check comes before the invalid one, so the −0.75 penalty never fires (to be shown by running it in 3.5).

| # | Lesson | Taught |
|---|---|---|
| 3.1 | Build the maze game | the maze as a NumPy array, drawing a grid in pygame, the rat moving with keys, tests for walls and edges |
| 3.2 | Rewards that shape behaviour | why each penalty exists: remove the revisit penalty and measure the loops; the minimum-reward cutoff ends hopeless episodes |
| 3.3 | Tabular Q-learning solves the maze | the Chapter 1 agent again; the policy drawn as arrows; completion check from every free start cell |
| 3.4 | A new maze | the trained table on a different maze fails, measured; why a table can't generalise; QMaze's real observation (the whole maze flattened, with the rat marked) |
| 3.5 | Reading the course's code | a guided read of the original QMaze code (`TQMaze`, `Experience`, `qtrain`), mapping each part to what was built; what still needs Chapters 4–5 |

### 4 · From a table to a network (`qarcade-networks`), 5 lessons, days 5–7

Only what DQN needs. Everything is written by hand once before a library does it.

| # | Lesson | Taught |
|---|---|---|
| 4.1 | A function with knobs | a table is a function; a straight line `y = w·x + b` fitted to points; squared-error loss |
| 4.2 | Downhill | the gradient measured by nudging `w`, then derived; the gradient-descent loop in NumPy; learning rate too high, measured |
| 4.3 | A hidden layer | why one line can't fit a curve; matrix multiply, ReLU, the forward pass; backpropagation by the chain rule, checked against nudging |
| 4.4 | PyTorch | install it (the GPU check: an RTX 5060 is Blackwell and needs a CUDA 12.8+ build); tensors; autograd computing what 4.3 computed by hand; `nn.Module`, loss, optimiser; the training loop, every line explained |
| 4.5 | Keras | Keras 3 on the PyTorch backend, so it's one install; the same network with `Sequential`, `compile`, `fit`; what `fit` does, mapped line by line to the 4.4 loop; reading old Keras 2 code (QMaze's `PReLU` import paths) |

### 5 · Deep Q-learning on QMaze (`qarcade-qmaze-dqn`), 5 lessons, week 2

| # | Lesson | Taught |
|---|---|---|
| 5.1 | A network instead of a table | input = the maze observation, output = 4 Q-values; the Q-learning target becomes a training label |
| 5.2 | Why naive training fails | training on each step as it happens, measured: correlated samples, forgetting |
| 5.3 | Experience replay | a fixed-size memory (`collections.deque`), random batches; QMaze's `Experience` class rebuilt and explained |
| 5.4 | QMaze solved in PyTorch | full training; win rate from every start cell; training time measured |
| 5.5 | QMaze solved in Keras | the same agent in Keras; `predict` and `train_on_batch` versus the PyTorch loop; outputs compared |

### 6 · Deep Q-learning on CartPole (`qarcade-cartpole-dqn`), 3 lessons, week 2

| # | Lesson | Taught |
|---|---|---|
| 6.1 | No more bins | the four numbers straight into the network; the moving-target problem measured; the target network |
| 6.2 | Both frameworks, many seeds | PyTorch and Keras versions; Huber loss; reward curves over seeds, including the collapse after success and why it happens |
| 6.3 | Table or network? | an honest comparison with Chapter 2: sample count, time, reliability |

### 7 · Pac-Man, built in stages (`qarcade-pacman`), about 8 lessons

Snake was dropped: the owner found it boring, and it teaches little that QMaze hasn't. One game with real logic replaces Catch, Snake and Breakout-lite, so nothing is built and thrown away. Every stage adds to one codebase, is playable, and ends with an agent trained on what exists so far.

| # | Lesson | Taught |
|---|---|---|
| 7.1 | Pac-Man on a small fixed maze | tile-based movement, buffered turns (a turn pressed early waits for the next opening), pellets, `Rect` drawing, a fixed simulation rate separate from drawing |
| 7.2 | Pac-Man as a Gymnasium environment | `gymnasium.Env`: spaces, seeding, render modes, a headless fast mode for training, `check_env` |
| 7.3 | What has to be in the state | with pellets, the eaten pattern is part of the state: 2ⁿ of them, measured; the Markov property; a network agent from Chapter 6 on the pellet maze |
| 7.4 | A maze generator | depth-first-search carving, then braiding (removing dead ends), mirror symmetry, tunnels; tests that prove every generated maze is connected and has no dead ends |
| 7.5 | One maze or many | an agent trained on one maze fails on new ones (QMaze 3.4 again); trained on many generated mazes it generalises; the idea behind OpenAI's Procgen benchmark |
| 7.6 | Blinky | the arcade ghost rule: at each intersection, take the direction that ends closest to a target tile, never reversing; Blinky's target is Pac-Man; the agent learns to avoid a chaser |
| 7.7 | Four ghosts and power pellets | Pinky, Inky and Clyde's targets; scatter, chase and frightened modes on a timer, as a state machine with tests |
| 7.8 | Curriculum | ghosts off, then one, then four; reward balance between pellets and danger; measured honestly, including where the agent stops improving |

**Caution, stated in the lessons:** Ms. Pac-Man is one of the Atari games DQN played worst. Mazes stay small (around 11×11) and ghosts are added one at a time. Training times are measured before a lesson is written, and an agent that learns only part of the game is reported with numbers, not hidden.

### 8 · Learning from what it sees (`qarcade-pixels`), about 4 lessons

| # | Lesson | Taught |
|---|---|---|
| 8.1 | The maze as image layers | an observation of stacked grids (walls, pellets, ghosts, Pac-Man); why a network reading a picture generalises across mazes |
| 8.2 | Convolution | a 3×3 filter applied by hand to a tiny image; why convolution suits grids and pixels; a CNN in PyTorch and in Keras |
| 8.3 | Pixels and frame stacking | an Atari-style wrapper: grayscale, downscaling, frame skip, frame stacking (one frame can't show which way a ghost is moving); each is explained as the DQN paper's answer to a problem |
| 8.4 | Reading the DQN paper | Mnih et al. 2015: each section mapped to the code already written; GPU against CPU times measured |

### 9 · Capstone (`qarcade-capstone`), 2 lessons

| # | Lesson | Taught |
|---|---|---|
| 9.1 | Your game, your agent | design and build a game, its environment, tests and an agent, from a blank folder with no supplied tests |
| 9.2 | A report and a Forge example | an experiment write-up (seeds, error bars); package the game and agent so it can be added to Forge |

**Total:** about 43 lessons.

## How lessons are written

These follow the `rl-pygame` track's rules (`docs/rl-pygame-track-plan.md`, *How lessons are written*) and the owner's standing feedback:

- **The learner types everything.** No prefilled cells to run. Each step is checked by `pytest -k <step>` against a supplied test file, which the lesson's first step explains how to read.
- **Explain the logic, then the code, then an analogy if it helps.** Say why it works and why the obvious alternative fails. Every new call, term or game mechanic gets its mechanism, usually as a trace with real numbers.
- **Prediction checkpoints** (```` ```predict ```` fences) before each surprising result, each with a `verify:` script that proves the stated answer.
- **Every check has at least one wrong answer** in `tracks/qarcade.walkthrough.js` that it must reject.
- **Measure every number the text quotes**, including training times. These lessons are bite-sized, so any training run in a lesson must finish in about 2 minutes on CPU. Chapter 8 is the exception, and says so.
- **Experiments, not only answers.** Each lesson ends with a *Your turn* that changes one thing (α, γ, ε, bins, reward, observation) and asks the learner to predict and then measure.
- **Two frameworks:** PyTorch first, Keras second. A test checks that both produce outputs of the same shape and similar quality.

## Supplied files and where they are taught

Things may be supplied up front. By the end of the series, everything supplied has been taught.

| Supplied file | Supplied in | Taught in |
|---|---|---|
| `tests/test_*.py` (one per lesson) | each lesson's first step | read in each lesson; the learner writes their own in 9.1 |
| `tests/conftest.py` (SDL dummy drivers for headless tests) | 0.2 | explained line by line in 0.2 |
| Chart helper (reward-per-episode plot in pygame) | 1.5 | to be decided: teach it in 1.5, or supply it and teach it in 7.1 with the other drawing code |

## To measure before writing (a spike)

The `rl-pygame` plan's runtime findings (Python ≥ 3.12, `pygame-ce` rather than `pygame`, plain `gymnasium` with no extras) are reused: `numpy==2.5.3`, `pygame-ce==2.5.8`, `gymnasium==1.3.0`, `pytest==9.1.1` installed and imported on Python 3.13.14 on 2026-10-07.

Measured 2026-10-07 (Windows 11, Python 3.13.14, RTX 5060):

- **PyTorch CPU build:** `torch==2.14.1` from `https://download.pytorch.org/whl/cpu` installs in about 100 s; with `keras==3.15.1` the whole `.venv` is 776 MB. Keras 3 runs on it with `KERAS_BACKEND=torch` (a fit, `predict` at 1.2 ms per call, `train_on_batch` of 32 at 1.6 ms).
- **Windows path length:** the first install failed with `No such file or directory` for a file under `torch\_inductor\...\dense_blockscaled_gemm_kernel.py`, because the project folder's path was long and `LongPathsEnabled` is 0 on this machine (260-character limit). In `Documents\q-arcade` that file's path is 149 characters, which fits. Lesson 4.4 explains the error and the fix.
- **Corridor exploration (Ch 1), 100 seeds, α = 0.5, γ = 0.9:** treasure found by the greedy policy after 200 episodes: ε = 0: 6, ε = 0.1: 44, ε = 0.3: 81 (100 after 1000), ε = 1: 100. Mean reward while learning (1000 episodes): ε = 0.3 best at 0.76, ε = 1 only 0.33.
- **Tabular CartPole (Ch 2), 3 seeds:** results vary a lot between seeds; `(6, 6, 12, 12)` bins are worst at 1000 episodes and best at 3000 (greedy 500, 450, 500; 44 s a run). A reliable recipe is still being searched.

Still to measure:

1. **The CUDA build** of PyTorch for the RTX 5060 (Blackwell needs CUDA 12.8 or newer), its size, and whether it's worth it before Chapter 8.
2. **Training times on CPU** for QMaze DQN on the 10×10 maze, CartPole DQN and the Pac-Man stages. Any run over about 2 minutes gets a smaller problem or a resumable checkpoint.
3. **Pixel or layered-grid DQN on Pac-Man**, on GPU and CPU.

## Open questions for the owner

- **The series name:** Q-Arcade, confirmed by the owner.
- **Does the course hand in Jupyter notebooks?** If so, Chapters 2 and 3 can each end with a step that turns the project into a submission notebook.
- **The chart helper:** teach it at once, or supply it and teach it later (see the table above).
