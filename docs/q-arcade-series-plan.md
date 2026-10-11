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
| 3. From a table to a network | Only the ML that the next chapters need: a function with adjustable numbers, loss, the gradient, gradient descent, one hidden layer. Written in NumPy first, then PyTorch, then Keras. It comes straight after CartPole because actor-critic (Chapter 4) needs a network, and it no longer depends on QMaze. |
| 4. Actor-critic on CartPole: A2C and A3C | The owner's paper is on A2C applied to CartPole, so it comes while CartPole is fresh: CartPole, then a network, then actor-critic, understood together. Q-learning learns what each action is worth and acts on that; policy-gradient methods learn the acting directly, and A2C adds a critic (a value estimate, Chapter 1's idea again) to steady it. A3C, the asynchronous version, comes last in the chapter. It needs several processes at once, so it teaches running them without freezing the PC (the material planned for 7.2 moves here, where it's first needed). |
| 5. QMaze with a table | The second school problem. It's a grid, so the table fits, and the agent learns one fixed maze. Then a new maze shows that a table can't generalise. By now the learner knows networks, so the chapter can end by pointing straight at Chapter 6. |
| 6. Deep Q-learning on QMaze | The classic QMaze solution (a network plus experience replay, then a target network), built in both frameworks. It opens with what was lesson 4.5's second half: the tutorial's network learning the QMaze table. |
| 7. Deep Q-learning on CartPole | Back to CartPole, with DQN this time, and an honest three-way comparison: the table (Chapter 2), A2C (Chapter 4) and DQN. |
| 8. Pac-Man, built in stages | One game with real logic, built once and understood: tile movement, a maze generator, ghosts with the arcade's targeting rules, power pellets as a state machine. Each stage is playable and gets its own learning experiment. |
| 9. Learning from what it sees | The maze as image layers, then pixels; the DQN paper's frame stacking; convolutional networks; training on the GPU. Pac-Man is a real Atari game, so this is the Atari chapter, on our own game. |
| 10. Capstone | A game of the learner's own design plus an agent. This becomes the first Forge example. |

**School milestones (reordered 2026-10-11):** the owner writes a paper on A2C applied to CartPole, so the order is CartPole (Chapter 2), networks (3), A2C and A3C on CartPole (4), then QMaze with a table (5) and with a network (6), then DQN on CartPole (7). Chapters 8–10 have no deadline. The original order put QMaze first, and its lessons are written; see *Reordering the built chapters* below.

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

### 3 · From a table to a network (`qarcade-networks`), 5 lessons, days 5–7

Only what DQN needs. Everything is written by hand once before a library does it.

| # | Lesson | Taught |
|---|---|---|
| 3.1 | A function with knobs | a table is a function; a straight line `y = w·x + b` fitted to points; squared-error loss |
| 3.2 | Downhill | the gradient measured by nudging `w`, then derived; the gradient-descent loop in NumPy; learning rate too high, measured |
| 3.3 | A hidden layer | why one line can't fit a curve; matrix multiply, ReLU, the forward pass; backpropagation by the chain rule, checked against nudging |
| 3.4 | PyTorch | install it (the GPU check: an RTX 5060 is Blackwell and needs a CUDA 12.8+ build); tensors; autograd computing what 4.3 computed by hand; `nn.Module`, loss, optimiser; the training loop, every line explained |
| 3.5 | Keras (first half of the built 4.5) | Keras 3 on the PyTorch backend, so it's one install; the same network with `Sequential`, `compile`, `fit`; what `fit` does, mapped line by line to the 4.4 loop; reading old Keras 2 code (QMaze's `PReLU` import paths) |

### 4 · Actor-critic on CartPole: A2C and A3C (`qarcade-actor-critic`), about 7 lessons

**Status:** written 2026-10-11 (7 lessons, `src/labs/project-studio/tracks/qarcade-actor-critic/`); see *Chapter 4 measurements* below. Planned the same day at the owner's request. Placed straight after CartPole and networks (moved before QMaze the same day) because the owner is writing a paper on A2C applied to CartPole. It uses Chapter 2's CartPole and Chapter 3's PyTorch, and nothing from QMaze or DQN. Written to the explanation standard (story so far, pieces-fit diagram, test groups, inputs tables, maths named and stepped through with a loop).

**The idea in one picture**, for the chapter's opening:

```text
Q-learning (Chapters 1-2)                   actor-critic (this chapter)
  table row -> values: what each move is worth  actor  -> probabilities: how likely to choose each move
  act: take the biggest (plus ε exploring)       act: draw a move from the probabilities (exploring is built in)
  learn: move a value towards its target         critic -> one number: how good this state is
                                                 learn: make moves that did better than the critic expected more likely
```

| # | Lesson | Taught |
|---|---|---|
| 4.1 | Learning the acting directly | a **policy** network that outputs probabilities (softmax, stepped through with numbers); drawing a move from them; **REINFORCE**: after an episode, make each move's log-probability bigger in proportion to the return that followed it; the return as Chapter 1's discounted sum, computed backwards with a loop; why "log" (the gradient of log π, worked on a two-action example and checked against nudging, Chapter 3's gradient check) |
| 4.2 | A baseline cuts the noise | REINFORCE's learning curve is noisy, measured over seeds; subtracting a baseline (the average return) leaves the gradient's direction unchanged but shrinks its spread (standard deviation, lesson 2.5, measured before and after); the **advantage** = how much better than expected |
| 4.3 | Actor and critic | a **critic** that learns V(s), the value of a state, by Chapter 1's update (its target is r + γV(s′), or r after an ending); one network with two heads, a shared body; the advantage as r + γV(s′) − V(s) (the TD error, the same quantity as lesson 1.3's nudge distance); the A2C loss: policy term + value term − an **entropy** bonus (entropy computed for a few probability lists, so "keeps exploring" has a number); terminated vs truncated again |
| 4.4 | A2C: many CartPoles in step | **n-step returns** (bootstrapping after n steps, a loop showing 1-step, 5-step and full returns side by side); `gymnasium.vector.SyncVectorEnv` running 8 CartPoles as one batch; "synchronous" explained with a timeline; A2C on CartPole measured over seeds, against Chapter 2's table (499.9 ± 0.1 after 500 episodes) and lesson 2.2's simple rules: reliability, steps and seconds |
| 4.5 | A3C: workers that don't wait | the 2016 paper (Mnih et al., *Asynchronous Methods for Deep Reinforcement Learning*): each worker process has its own CartPole and its own copy of the network, and pushes gradients into a **shared** network without waiting for the others; `torch.multiprocessing` with `share_memory()` and the `spawn` start method Windows needs; **capped at 2 workers with `torch.set_num_threads(1)`**, taught here because it's the first time the series runs several processes (the "don't freeze your computer" material: threads measured, a capped worker pool, checking CPU use, stopping a runaway); a timeline comparing A2C's lock-step with A3C's overlap; measured against A2C, honestly: on one PC, A2C usually matches or beats it, which is why A2C replaced A3C in practice (OpenAI's 2017 finding), and the lesson shows the numbers |
| 4.6 | A2C in Keras | the actor-critic network in Keras; what a custom training step looks like when `fit` can't express the loss; the same results as the PyTorch version, measured |
| 4.7 | An experiment you can write up | for the owner's paper: a learning-curve experiment over seeds with mean ± standard error (lesson 2.5's tools); ablations, each changing one thing (no baseline, no entropy bonus, 1-step against n-step, A2C against A3C); a results table and plots saved as files; how to describe a method, settings and results so someone could repeat them |

**Tests the chapter needs** (each with the bug it catches): softmax probabilities sum to 1 and drawing follows them (a sampler that always takes the biggest); returns computed backwards match a hand-worked list (returns summed forwards); the policy gradient matches nudging (a missing minus sign, which trains the agent to lose); the critic's target ignores V(s′) after `terminated` but not after `truncated`; the entropy of [0.5, 0.5] is log 2 and of [1, 0] is 0; the vector environment resets finished CartPoles on its own; A3C workers really update the shared network (its numbers change while the workers run) and the pool never starts more than 2 processes.

**To measure before writing** (two jobs at a time, 1 thread each):

1. REINFORCE on CartPole: episodes and seconds to reach 500, with and without a baseline, 5 seeds. Lesson runs must finish in about 2 minutes.
2. A2C with 8 vector environments: steps, seconds and reliability over 5 seeds, against Chapter 2's table.
3. A3C with 2 workers on Windows: that `spawn` + shared memory works in the project's Python 3.13 / torch 2.14.1; memory per worker (each imports torch); seconds against A2C.
4. Keras 3 on the torch backend: whether a custom train step for the A2C loss works cleanly, or whether 7.6 should show the loss with `keras.ops` inside a plain loop.

**Settled with the owner (2026-10-11):** it's for school: the owner writes a paper on A2C applied to CartPole. It comes before QMaze and Pac-Man. **Still open:** the paper's due date, which decides how soon this chapter must be built.

**Lesson text to renumber:** see *Reordering the built chapters*.

### 5 · QMaze with a table (`qarcade-qmaze`), 5 lessons, days 4–5

The maze follows the classic QMaze rules (Samy Zafrany's Keras tutorial, samyzaf.com/ML/rl/qmaze.html, the source most courses use) so the learner can read their course's code. The owner can't share course files (school policy), so the lessons follow the public tutorial, and 3.5 shows where each rule lives so the learner can compare their course's version themselves. Checked against the tutorial's source on 2026-10-07: a **10×10** maze; free = 1.0, wall = 0.0, rat marked 0.5; actions LEFT 0, UP 1, RIGHT 2, DOWN 3; target bottom-right; rewards +1 cheese, −0.04 move, −0.25 move onto a visited cell, −0.75 invalid move; lost when total reward drops below −0.5 × maze size (−50). The tutorial's `update_state` sets `mode = 'invalid'` instead of `nmode`, and the visited check comes before the invalid one, so the −0.75 penalty never fires (to be shown by running it in 3.5).

| # | Lesson | Taught |
|---|---|---|
| 5.1 | Build the maze game | the maze as a NumPy array, drawing a grid in pygame, the rat moving with keys, tests for walls and edges |
| 5.2 | Rewards that shape behaviour | why each penalty exists: remove the revisit penalty and measure the loops; the minimum-reward cutoff ends hopeless episodes |
| 5.3 | Tabular Q-learning solves the maze | the Chapter 1 agent again; the policy drawn as arrows; completion check from every free start cell |
| 5.4 | A new maze | the trained table on a different maze fails, measured; why a table can't generalise; QMaze's real observation (the whole maze flattened, with the rat marked) |
| 5.5 | Reading the course's code | a guided read of the original QMaze code (`TQMaze`, `Experience`, `qtrain`), mapping each part to what was built; what still needs Chapters 4–5 |

### 6 · Deep Q-learning on QMaze (`qarcade-qmaze-dqn`), 5 lessons, week 2

| # | Lesson | Taught |
|---|---|---|
| 6.1 | A network instead of a table | input = the maze observation, output = 4 Q-values; the Q-learning target becomes a training label |
| 6.2 | Why naive training fails | training on each step as it happens, measured: correlated samples, forgetting |
| 6.3 | Experience replay | a fixed-size memory (`collections.deque`), random batches; QMaze's `Experience` class rebuilt and explained |
| 6.4 | QMaze solved in PyTorch | full training; win rate from every start cell; training time measured |
| 6.5 | QMaze solved in Keras | the same agent in Keras; `predict` and `train_on_batch` versus the PyTorch loop; outputs compared |

### 7 · Deep Q-learning on CartPole (`qarcade-cartpole-dqn`), 3 lessons, week 2

| # | Lesson | Taught |
|---|---|---|
| 7.1 | No more bins | the four numbers straight into the network; the moving-target problem measured; the target network |
| 7.2 | Both frameworks, many seeds | PyTorch and Keras versions; Huber loss; reward curves over seeds, including the collapse after success and why it happens |
| 7.3 | Table, DQN or A2C? | an honest comparison of Chapter 2's table, Chapter 4's A2C and this chapter's DQN on CartPole: samples, time, reliability; a decision table of what each method needs and where each was measured to work in this series |

### 8 · Pac-Man, built in stages (`qarcade-pacman`), about 8 lessons

Snake was dropped: the owner found it boring, and it teaches little that QMaze hasn't. One game with real logic replaces Catch, Snake and Breakout-lite, so nothing is built and thrown away. Every stage adds to one codebase, is playable, and ends with an agent trained on what exists so far.

| # | Lesson | Taught |
|---|---|---|
| 8.1 | Pac-Man on a small fixed maze | tile-based movement, buffered turns (a turn pressed early waits for the next opening), pellets, `Rect` drawing, a fixed simulation rate separate from drawing |
| 8.2 | Pac-Man as a Gymnasium environment | `gymnasium.Env`: spaces, seeding, render modes, a headless fast mode for training, `check_env` |
| 8.3 | What has to be in the state | with pellets, the eaten pattern is part of the state: 2ⁿ of them, measured; the Markov property; a network agent from Chapter 6 on the pellet maze |
| 8.4 | A maze generator | depth-first-search carving, then braiding (removing dead ends), mirror symmetry, tunnels; tests that prove every generated maze is connected and has no dead ends |
| 8.5 | One maze or many | an agent trained on one maze fails on new ones (QMaze 3.4 again); trained on many generated mazes it generalises; the idea behind OpenAI's Procgen benchmark |
| 8.6 | Blinky | the arcade ghost rule: at each intersection, take the direction that ends closest to a target tile, never reversing; Blinky's target is Pac-Man; the agent learns to avoid a chaser |
| 8.7 | Four ghosts and power pellets | Pinky, Inky and Clyde's targets; scatter, chase and frightened modes on a timer, as a state machine with tests |
| 8.8 | Curriculum | ghosts off, then one, then four; reward balance between pellets and danger; measured honestly, including where the agent stops improving |

**Caution, stated in the lessons:** Ms. Pac-Man is one of the Atari games DQN played worst. Mazes stay small (around 11×11) and ghosts are added one at a time. Training times are measured before a lesson is written, and an agent that learns only part of the game is reported with numbers, not hidden.

### 9 · Learning from what it sees (`qarcade-pixels`), about 4 lessons

| # | Lesson | Taught |
|---|---|---|
| 9.1 | The maze as image layers | an observation of stacked grids (walls, pellets, ghosts, Pac-Man); why a network reading a picture generalises across mazes |
| 9.2 | Convolution | a 3×3 filter applied by hand to a tiny image; why convolution suits grids and pixels; a CNN in PyTorch and in Keras |
| 9.3 | Pixels and frame stacking | an Atari-style wrapper: grayscale, downscaling, frame skip, frame stacking (one frame can't show which way a ghost is moving); each is explained as the DQN paper's answer to a problem |
| 9.4 | Reading the DQN paper | Mnih et al. 2015: each section mapped to the code already written; GPU against CPU times measured |

### 10 · Capstone (`qarcade-capstone`), 2 lessons

| # | Lesson | Taught |
|---|---|---|
| 10.1 | Your game, your agent | design and build a game, its environment, tests and an agent, from a blank folder with no supplied tests |
| 10.2 | A report and a Forge example | an experiment write-up (seeds, error bars); package the game and agent so it can be added to Forge |

**Total:** about 50 lessons.

## How lessons are written

These follow the `rl-pygame` track's rules (`docs/rl-pygame-track-plan.md`, *How lessons are written*) and the owner's standing feedback:

- **The learner types everything.** No prefilled cells to run. Each step is checked by `pytest -k <step>` against a supplied test file, which the lesson's first step explains how to read.
- **Explain the logic, then the code, then an analogy if it helps.** Say why it works and why the obvious alternative fails. Every new call, term or game mechanic gets its mechanism, usually as a trace with real numbers.
- **Prediction checkpoints** (```` ```predict ```` fences) before each surprising result, each with a `verify:` script that proves the stated answer.
- **Every check has at least one wrong answer** in `tracks/qarcade.walkthrough.js` that it must reject.
- **Measure every number the text quotes**, including training times. These lessons are bite-sized, so any training run in a lesson must finish in about 2 minutes on CPU. Chapter 9 is the exception, and says so.
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

1. **The CUDA build** of PyTorch for the RTX 5060 (Blackwell needs CUDA 12.8 or newer), its size, and whether it's worth it before Chapter 9.
2. **Training times on CPU** for QMaze DQN on the 10×10 maze, CartPole DQN and the Pac-Man stages. Any run over about 2 minutes gets a smaller problem or a resumable checkpoint.
3. **Pixel or layered-grid DQN on Pac-Man**, on GPU and CPU.

## Open questions for the owner

- **The series name:** Q-Arcade, confirmed by the owner.
- **Does the course hand in Jupyter notebooks?** If so, Chapters 2 and 3 can each end with a step that turns the project into a submission notebook.
- **The chart helper:** settled. No chart helper was needed; learning curves are printed as tables (lessons 1.4, 2.4), and the corridor watcher draws values in the cells.

## Reordering the built chapters (decided and done 2026-10-11)

**Done:** `series.js` order and labels; `trackOrder` (setup 12.1, corridor 12.2, cartpole 12.3, networks 12.4, actor-critic 12.5, qmaze 12.6, qmaze-dqn 12.7); lesson 4.5 split (the Keras half stays as 3.5 with `build_model` as its Your turn; the maze half is `qarcade-qmaze-dqn/05-00-a-network-that-knows-the-maze.md`, lesson 6.1, with `tests/test_maze_net.py`, `answers/maze_net_agent.py`, and `verify/maze_net_wins.py` moved there); titles and every "lesson X.Y" / "Chapter N" reference renumbered by script; story-so-far and chapter-ending text rewritten for the new order; walkthrough entries updated. **File names were deliberately not renumbered** (AGENTS.md rule 2: lesson ids are `track/filename` and are progress keys), so `qarcade-networks/04-0N` files are lessons 3.N, `qarcade-qmaze/03-0N` are 5.N, and `qarcade-qmaze-dqn/05-0N` are 6.(N+1). New chapters use their own number (`qarcade-actor-critic/04-0N` is 4.N).

The original checklist, kept for the record:

The built lessons follow the old order (QMaze as Chapter 3, networks as 4, QMaze DQN as 5). The new order puts networks and A2C before QMaze. To be done before or with Chapter 4 (actor-critic):

1. **Chapter order in `series.js`:** setup, corridor, cartpole, networks, actor-critic, qmaze, qmaze-dqn, cartpole-dqn, pacman, pixels, capstone. Keep the track folder names (`qarcade-networks` and so on), so saved progress and lesson ids don't change. Update the `trackOrder` frontmatter of each chapter's first lesson to match.
2. **Split lesson 4.5.** Its first half (installing Keras, the curve network, what `fit` hides) stays as the networks chapter's last lesson. Its second half (`maze_net.py`: the tutorial's QMaze network, `table_examples`, `NetworkAgent`) depends on QMaze, so it becomes the first lesson of the QMaze DQN chapter, with its tests split the same way (`test_keras_net.py` keeps the `backend`, `layers` and `fit` groups; a new test file gets `examples`, `tutorial` and `agent`).
3. **Renumber the lessons:** networks 4.x becomes 3.x, QMaze 3.x becomes 5.x, QMaze DQN 5.x becomes 6.x (titles, and every "lesson 3.4"-style cross-reference in every Q-Arcade lesson). Do it with a script that maps old numbers to new ones, then grep for leftovers.
4. **Rewrite the "story so far" sections** that now come in a different order. 4.1–4.4 mention QMaze in passing (the 20,804-knob QMaze network, "Chapters 2 and 3 ended at the same wall"); they should point at CartPole and lesson 2.6 instead, and at the actor-critic chapter as what the network is for. QMaze's lessons can now mention networks as already known.
5. **Fix the walkthrough** (`tracks/qarcade.walkthrough.js` and `qArcade.desktop.test.js`): the order of steps follows the chapter order, and the files each chapter expects to exist change. Rerun the static checks and every chapter's walkthrough.
6. Lessons that mention later chapters by number (Pac-Man as Chapter 7, pixels as 8, CartPole DQN as 6): grep `Chapter [3-9]` in `tracks/qarcade-*` and update them.

## Progress

Lessons live in `src/labs/project-studio/tracks/qarcade-*/`, Your turn answers in each chapter's `answers/`, prediction verify scripts in its `verify/`, and every step's walkthrough entry (with wrong answers) in `tracks/qarcade.walkthrough.js`. `src/labs/project-studio/qArcade.desktop.test.js` walks the series like a learner; besides running every check and wrong answer, it fails if a `pytest -k` word also selects another step's tests (or matches the test file's name), if a wrong answer names a check the step doesn't have, or if a Your turn step shows code or has no hints.

| Chapter | Lessons | Walkthrough |
|---|---|---|
| 0 · Setup | 0.1, 0.2 | passes (2026-10-11, reordered series) |
| 1 · The corridor | 1.1–1.5 | passes (2026-10-11) |
| 2 · CartPole with a table | 2.1–2.6 | passes (2026-10-11) |
| 3 · From a table to a network (`qarcade-networks`) | 3.1–3.5 | passes (2026-10-11) |
| 4 · Actor-critic on CartPole (`qarcade-actor-critic`) | 4.1–4.7 | written 2026-10-11; walkthrough: see below |
| 5 · QMaze with a table (`qarcade-qmaze`) | 5.1–5.5 | passes (2026-10-11) |
| 6 · Deep Q-learning on QMaze (`qarcade-qmaze-dqn`) | 6.1–6.6 | passes (2026-10-11) |
| 7–10 | | not written |

Changes from the chapter tables above, made while writing: 2.2 became "Simple Rules, Measured" (four baselines, including `θ + θ̇ > 0`, which averages 484.8); 2.3's table ignores the cart (72 rows), because it learns in 500 episodes and lesson 2.6 measures the alternatives; 3.4 uses the classic maze transposed as the new maze; 3.5 types the tutorial's environment as published and fixes its two slips in a subclass; 4.5 ends by distilling the Chapter 3 table into the tutorial's network (74 of 74 starts). Chapter 5 trains on a 7 × 7 maze (33 starts) because one DQN run on the 10 × 10 maze took 8 to 26 minutes and failed for 3 of 5 settings; 5.5 returns to the 10 × 10 maze with a target network. The target network moved from Chapter 6 to 5.5, where it was measured to matter.

Measured while writing (Windows 11, Python 3.13.14):

- Tabular CartPole, 72 rows, 500 episodes, 10 seeds: step 0.1 → 469.2 ± 30.8; step 0.5 → 135.0 ± 47.0; step 0.2 shrinking to 0.02 → 499.9 ± 0.1. The agents near 190 steps balance but drive the cart off the track.
- Tabular QMaze, 500 episodes, ε = 0.1, α = 0.1, γ = 0.9: 74 of 74 starts for 10 of 10 seeds; 10 extra moves over the shortest routes for seed 0. Without the wall penalty the rat stands still against walls (19–31 starts solved); without the revisit penalty it steps back and forth (53–66).
- The tutorial's code gives −0.25 for every invalid move (never −0.75); training with −0.25 still solves 74 of 74 for 10 seeds.
- `torch==2.14.1` from PyPI on Windows is the CPU build (`2.14.1+cpu`, 124 MB wheel); with `keras==3.15.1` the full `.venv` is 811 MB. Keras 3 prints NumPy 2 `DeprecationWarning`s from inside `keras/src`; the 4.5 tests filter those only.
- DQN on the 7 × 7 maze (PyTorch, replay of 1,000, batches of 32, 4 updates per move, γ 0.95, ε 0.1): every start solved by episode 80 to 180 for 5 seeds, 17 to 46 s. Without replay (one update on the latest step): 0 to 3 of 33 starts after 400 episodes, 3 seeds. The tutorial's Keras method (fit after every move, 1 epoch): episodes 170 to 230. The trained network solves 0 of 33 starts on the same maze transposed (a table: 9).
- DQN on the 10 × 10 maze, up to 600 episodes: without a target network 15 of 74 starts (811 s); with one refreshed every 500 moves, solved at episodes 320 and 400 (seeds 0, 1; 512 s and 452 s while sharing the CPU).

## Handoff (2026-10-11, end of session) — read this first

**What the owner wants now:** a paper on **A2C applied to CartPole** is due this week, so the series was reordered to CartPole → networks → actor-critic, and Chapter 4 (A2C/A3C) was written. QMaze is not this week. The owner finds this material hard to follow: every lesson must follow the explanation standard (plain-words story so far, pieces-fit diagram, test-group table with the bug each group catches, inputs/returns tables, maths named and stepped through with a loop whose output was verified). Answers to lesson questions go **into the lesson**, not chat.

**Done this session (all uncommitted; the owner commits):**

1. **Reorder** (see *Reordering the built chapters*): `series.js` order and labels, `trackOrder`s, lesson 4.5 split (maze half is now `qarcade-qmaze-dqn/05-00-…`, lesson 6.1), titles and every lesson/chapter cross-reference renumbered, story-so-far and chapter endings rewritten, walkthrough entries updated. File names unchanged (progress keys). **Verified:** full walkthrough of the reordered series, 34 of 34 passed.
2. **Chapter 4, `qarcade-actor-critic/`, 7 lessons:** 4.1 REINFORCE, 4.2 baseline measured, 4.3 actor and critic, 4.4 A2C, 4.5 A3C (and not freezing the PC), 4.6 A2C in Keras, 4.7 an experiment you can write up (ablations, mean ± SE, `results.csv`, `results.png` with matplotlib 3.11.2, a write-up checklist and standard sources). Answers in `answers/`, verify scripts in `verify/`, walkthrough entries at the end of `tracks/qarcade.walkthrough.js` (`const A`). Measurements: *Chapter 4 measurements* below. **Verified:** reference code's 47 tests pass; static checks pass (`… -t "walkthrough entry|verify command|Your turn step|pytest -k|one file per step"`: 5 passed); Project Studio non-desktop tests pass except two pre-existing `electron-basics` failures (another agent's work: steps with several `file=` blocks, and `answers/escape.test.cjs` collected as a test).
3. **Build kit:** `docs/q-arcade-prototypes/actor-critic/` (reference code and tests, `build_4N.py` lesson builders, `measured.json`, the measurement scripts). Regenerate a lesson by editing `reference/` and rerunning its builder (update `PROJ`/`TRACK` in `build_common.py`).

**Not yet confirmed: the Chapter 4 walkthrough** (types every step, runs every check, wrong answer and verify script) was still running at the end of the session. Rerun it, from a copy of a project that has finished Chapter 3 (or the whole series) with Chapter 4's files removed:

```sh
cp -r <kept project> <copy>; rm <copy>/{policy,noise,actor_critic,a2c,a3c,keras_a2c,experiment}.py
QARCADE_START=<copy> QARCADE_FROM=qarcade-actor-critic/04-01 QARCADE_UNTIL=qarcade-actor-critic/04-07   npx vitest run src/labs/project-studio/qArcade.desktop.test.js
```

Wrong answers most likely to need attention if it fails: 4.4 "forgets to clear the old slopes" (must make the 120,000-step learning test fail), 4.7 "did not install it" (matplotlib; modelled on 3.5's Keras install wrong answer), and the verify scripts that train (`a2c_seed0.py` ~26 s, `keras_a2c_score.py` ~72 s, `a3c_time.py` ~80 s, `reinforce_seed0.py` ~30 s, `noise_ratio.py` ~12 s).

**Next, in order:**

1. Confirm the Chapter 4 walkthrough (above); fix anything it finds.
2. Commit (the owner asked to commit only when they say so; pulls conflict with other agents' `series.js` edits until this is committed).
3. Chapter 7, deep Q-learning on CartPole (`qarcade-cartpole-dqn`): the plan below headed "Chapter 6" (written before the reorder), minus its lesson 6.2 (not freezing the PC is now in 4.5). Rerun `cart_proto2.py` first, two at a time. Its 7.3 compares table, A2C and DQN.
4. Later: Pac-Man (8), pixels (9), capstone (10); the queued Markdown Studio triage script.

**Working rules learned:** at most 2 heavy jobs at once, `torch.set_num_threads(1)` (6 parallel runs froze the PC); the scratchpad's long path breaks `pip install torch` (Windows 260-character limit), so use a short path or the walkthrough's `%TEMP%\qarcade-walk-*` projects; heredocs with quotes in Git Bash get mangled, so write scripts to files.

## Chapter 4 measurements (2026-10-11, Windows 11, Python 3.13, torch 2.14.1 CPU, 1 thread per process)

- **REINFORCE** (`policy.py`, 64 tanh units, Adam 0.01, γ 0.99, 300 episodes), greedy score over 20 games, 10 seeds: 228 ± 65, 2 of 10 at 500. **With the baseline** (returns centred and scaled): 352 ± 64, 6 of 10 at 500. Difference ≈ 1.4 combined standard errors. Seed 5 collapses to 9-step games either way.
- **Gradient signal-to-noise** (`noise.py`, 100 games from a policy trained 80 episodes): 6.68 raw, 10.20 centred and scaled. On an untrained policy the baseline barely helps (11.4 vs 7.0 normalised, measured with the prototype).
- **A2C** (`a2c.py`: 8 envs, 5 steps, Adam 0.002, clip 0.5, value 0.5, entropy 0.01, truncation bootstrapped from `info["final_obs"]` with `AutoresetMode.SAME_STEP`): greedy 500 on 5 of 5 seeds, at 500 from 120,000 steps on, about 26 s per 200,000 steps. Learning-rate search with the prototype (3 seeds each): 0.0007 → 443, 170, 254; 0.002 → 500 ×3 (and 5 more seeds at 500); n_steps 16 no better.
- **Threads:** one A2C run of 60,000 steps took 8.3 s wall / 51.5 s CPU with PyTorch's default 20 threads, and 6.4 s / 6.2 s with 1 thread, identical results.
- **A3C** (`a3c.py`, 2 workers, spawn, shared memory, per-worker Adam): 500, 79 s alone (118–122 s on 3 seeds while other jobs ran).
- **Keras A2C** (`keras_a2c.py`, functional model, trained by `train_a2c` through an adapter): 500, 72 s.
- **Experiment** (`experiment.py`, 3 variants × 5 seeds, pool of 2): A2C 500 ± 0; no entropy bonus 500 ± 0; 1-step returns 440 ± 60 (one seed 199), faster early but unstable late; 253 s. Training-game lengths understate the agent (entropy keeps sampled moves unsure), so curves record greedy scores on 5 fresh games.

## Handoff (2026-10-08, end of session)

**Done and verified:** Chapters 0–5, 28 lessons. Each chapter's walkthrough passed: every step typed, every check, every wrong answer, every prediction's `verify:`. Committed in `5ed0a5a8 Q-Arcade`.

**Explanation rework (2026-10-10):** every lesson, 0.1 to 5.5, was rewritten to the owner's explanation standard. Each now has a plain-words "story so far" (no jargon recap tables), a "how the pieces fit" diagram, a table of what each test group protects and the bug it would catch, inputs-and-returns tables for each function, and maths that is named, worked through with real numbers, and given a small loop whose printed output was checked by running it. Code, tests and checks are unchanged. After the rework, the walkthroughs pass for Chapters 0–3 together (23 passed), Chapter 4 (10) and Chapter 5 (10), and `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"` passes (200 tests). Write Chapter 6 onwards to the same standard from the start.

**How to verify a chapter without replaying the whole series** (a full walk installs PyTorch and Keras and takes a long time):

```sh
# whole series:
npx vitest run src/labs/project-studio/qArcade.desktop.test.js
# static checks only (fast): walkthrough keys, -k selection, Your turn rules, one file per step
npx vitest run src/labs/project-studio/qArcade.desktop.test.js -t "walkthrough entry|verify command|Your turn step|pytest -k|one file per step"
# one chapter, from a project kept after the chapter before it (QARCADE_KEEP saves one):
QARCADE_START=<kept folder copy> QARCADE_FROM=qarcade-<chapter>/<NN-NN> QARCADE_KEEP=<new folder> npx vitest run src/labs/project-studio/qArcade.desktop.test.js
```

Kept projects from this session, in `%LOCALAPPDATA%\Temp\`, are disposable and may be gone: `qarcade-after-ch5` is the state after Chapter 5. Copy it before using it as a start (the test writes into it), and delete from the copy any files the chapter you're re-walking creates, or its "did not create the tests" wrong answers will pass.

**How a chapter was built** (repeat this for Chapter 6 onwards):

1. Prototype the final code in a scratch project and measure everything a lesson will quote. Run heavy jobs **two at a time, with `torch.set_num_threads(1)`**: six default-threaded runs froze the owner's PC.
2. Write the test files. Each step's `pytest -k <word>` must select only that step's tests, and the word must not appear in the test file's name. `docs/q-arcade-prototypes/klint.py <test file> <words...>` checks this before writing lessons.
3. Derive each step's intermediate file from the final code with a script, not by hand, and assemble lessons from templates that paste in the tested files.
4. Put Your turn answers in `tracks/<chapter>/answers/` and verify scripts in `tracks/<chapter>/verify/`. Append walkthrough entries with `docs/q-arcade-prototypes/append_walk.py <entries file> "const X = 'qarcade-…';"`.
5. Run the static checks, then the chapter walkthrough. It catches weak tests (a wrong answer that passes) and wrong check indexes. Fix them, then rerun.

**Chapter 6 (`qarcade-cartpole-dqn`), planned with the owner on 2026-10-08:**

- 6.1 No more bins: the four numbers straight into a network; Huber loss; target network.
- 6.2 **Many runs without freezing your computer** (the owner asked for this): threads measured on this exact case (one CartPole DQN run of 300 episodes: 20 threads, PyTorch's default, took 51.3 s wall and 360.2 s of CPU, about 7 cores; 1 thread took 36.7 s wall and 36.1 s CPU, with identical results); a capped worker pool for seeds (2 workers, 1 thread each, kept the machine at about 7 of 28 cores with other programs running); per-process CPU checks; stopping a runaway; when a GPU helps (not for networks this small: measure it in Chapter 9).
- 6.3 Both frameworks, many seeds: the Keras version; collapse after success; keeping the best network.
- 6.4 Table or network? An honest comparison with Chapter 2 (the table reached 499.9 ± 0.1).

**Chapter 6 measurements so far** (`docs/q-arcade-prototypes/cart_proto.py`, 400 episodes, 3 seeds each, ε falling over 200 episodes): plain DQN is unstable. Of 18 runs over 6 settings, only one (sync 100, learning rate 5e-4, seed 1) reached 500 and stayed. The others peaked between 180 and 500 and fell back (final scores 17 to 488). Without a target network it doesn't learn at all (9–10 steps). `docs/q-arcade-prototypes/cart_proto2.py` adds the standard stabilisers (Double DQN, soft target updates with τ = 0.005, gradient clipping, ε falling over 15,000 steps, 60,000 steps per run). Its 4-setting × 3-seed grid was running when the session ended, and its results were lost with the session. **Rerun it first** (two at a time):

```sh
python docs/q-arcade-prototypes/cart_proto2.py "{}" 3
python docs/q-arcade-prototypes/cart_proto2.py "{\"double\": false}" 3
```

Run them from a scratch copy of the Chapter 5 project, because they import nothing from it but need `gymnasium` and `torch`. If no setting is reliable, teach that honestly in 6.3 and keep the best network found during training (evaluate every N steps, save when the score improves).

**Next, in the new order (2026-10-11):** reorder the built chapters (see *Reordering the built chapters*), then Chapter 4 (actor-critic: REINFORCE, A2C, A3C on CartPole, and a write-up lesson for the owner's paper), then CartPole DQN as Chapter 7 (planned below as "Chapter 6", written before the reorder), then Chapters 8–10 as planned above (Pac-Man in stages with generated mazes, learning from what it sees, the capstone). Pac-Man DQN training times must be measured before writing, and probably need the GPU (Chapter 9): measure the CUDA build of PyTorch for the RTX 5060 then.

**Other work from this session, also committed:** Notebook Lab (`src/components/notebooks/PythonNotebook.jsx`):

- typing no longer drops letters: the editor owns its text, using `defaultValue`;
- an **Autocomplete** checkbox in the toolbar, off by default;
- Shift+Enter moves to the next cell and scrolls it to the bottom of the screen;
- a cell that ran without an error has a green border and a green output area.
