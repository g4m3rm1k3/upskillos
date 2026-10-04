# Learning AI in your own games: plan

Status: approved by the user on 2026-10-03. It extends the bonus lesson (mg8-001, Q-learning on Breakout) into a
chapter.

## What is missing today

The agent can only **be the player**: its actions are the project's input actions, and it drives the game by pressing
keys. **Training lives in the editor:** the trained table exists only while the dialog is open, so nothing ships with
the game, and an enemy cannot use it. The environment is JSON node paths, which suits Breakout but not a guard
that needs "can I see the player?".

To give your own NPCs learned behaviour, Game Studio needs four things:

1. **Agents defined in script.** A script on the NPC says what the agent sees, does and earns, in code:
   `observe()`, `act(action)` and `reward()`. The action is the NPC's own move, not a key the player would
   press. The JSON spec stays for simple cases.
2. **Brains as project files.** Training saves `brains/<name>.json`: the method, bins or features, and the table
   or weights. It is exported with the game. At run time a script loads it and asks it what to do:

   ```js
   const brain = brains.load('brains/ghost.json')
   const action = brain.act(this.observe())
   ```

3. **Training with others in the scene.** While one NPC learns, everything else in the scene runs its own script:
   - a scripted player (one that flees, or wanders), so the NPC can be trained before any human plays;
   - or several NPCs sharing one brain, all learning from the same table.
4. **Seeing what it thinks.** While the game runs, a debug overlay over the NPC shows its state, its Q values and
   the action it chose.

Then **beyond tables**: linear Q-learning on features, for when bins make too many states. It is the step that
leads to deep Q-networks, and it is still small enough to read.

## The chapter: "Game AI that learns" (chapter 9, after the bonus)

**Revised 2026-10-03, at the user's request.** The user is studying Q-learning for a course assignment this week
and asked that the lab teach every concept of the topic, in whatever language the assignment uses. So the
chapter now covers the whole of tabular TD control (Sutton & Barto ch. 6, with the pieces of ch. 2, 3 and 9–10 it
leans on) before applying it to your own games.

The user does their own assignment. The lessons teach and give practice; they do not solve anything set for the
course.

Each lesson has:
- a notebook: the maths, built by hand on a small problem, every number tested;
- a Game Studio task on Cliff Walk or another example, using the lab's instruments: Train in view, Step and
  Predict, Compare, and the overlay.

| # | Lesson | Concepts | In Game Studio |
|---|---|---|---|
| 1 | Learning from every step | Prediction vs control; Monte Carlo vs TD(0); bootstrapping; the TD error; the random walk (Ex. 6.2) | Step and Predict through Cliff Walk's updates |
| 2 | Exploration | ε-greedy and its schedules, softmax (Boltzmann), optimistic initial values; exploration vs exploitation | Compare schedules and starting values on the cliff |
| 3 | Breakout from scratch (added 2026-10-04, the user: "learn how to apply it from scratch to the breakout game", and change the map to see it learn differently) | The recipe: actions, observations (relative, scaled, deciding), reward (failure costly; check random), done, bins; train, judge, ship; a new wall | Breakout Lab: make the paddle an agent, train, Save as brain, edit the wall's map, retrain |
| 4 | On-policy and off-policy: SARSA and Q-learning | The two targets; why SARSA walks safe and Q-learning walks the edge (Ex. 6.6, Fig. 6.4) | Train both in view; Compare them over seeds |
| 5 | Expected SARSA and Double Q-learning | Averaging over the policy; maximization bias (Ex. 6.7) and its fix | Compare all four updates |
| 6 | Experiments that mean something | α, γ and episodes; seeds and spread; learning curves vs greedy scores; reporting results | Compare sweeps of α and γ |
| 7 | Bigger state spaces | Binning, aliasing and the Markov property; how many bins; state design | Breakout and the chaser: bins measured |
| 8 | Beyond tables | Linear function approximation, features, the semi-gradient update; DQN's replay buffer and target network | (notebook; linear Q in Game Studio later) |
| 9 | NPCs that learn in your own game | Script agents, brains, ai.training, scripted opponents, shared brains | Maze Chase: a ghost that learns |
| 10 | When not to learn | Search, state machines, behaviour trees vs learning, measured | The learned ghost vs the breadth-first-search ghost |
| 11 | Capstone | A learning enemy in your own game | Your project |

## Cribbage with a learning opponent, and labs that start from the finished agent (2026-10-04)

**The user asked for:**
- how to build a card game, cribbage, with machine learning as the opponent, with a developer mode that shows the
  AI's hand;
- every machine-learning lab to start with the final, already-trained model, to show what is being built;
- no steps left out, so the learner can apply the recipe to any game.

**1. Every ML lab starts with the finished agent.**
- A task gets a `goal`: the finished project (the game plus its trained brain). The task panel's first item, ▶ Watch
  the finished agent, runs it in the game area without touching the learner's project.
- The brains are trained ahead of time by a script and stored as a generated file. A test checks they match a fresh
  training run, so they cannot drift from the code.

**2. Cribbage, the game.** A Cribbage Lab example, built step by step in tasks:
- Rules as a script module (`scripts/cribbage.js`):
  - the deck and the deal; the discard to the crib; the cut (starter card, his heels);
  - pegging: the count to 31, go, and scoring 15, 31, pairs, runs and last card;
  - the show: fifteens, pairs, runs, flush and nobs, for the hand and the crib; a game to 121 (61 for training).
- Every scoring rule is tested against known hands (a 29 hand, and so on).
- **Input:** keys 1–6 select cards, Enter confirms; the engine has no mouse input yet.
- **Card faces: SVG, drawn by code.** The user asked that the lessons teach SVG along the way: a JavaScript game
  doesn't need pixel art. So an image can be SVG source text kept in the project (`project.writeSvg(path, source)`,
  undoable, and in the GUI → code log). The Scene API code builds all 52 faces and the back from one function: a
  rounded rect, the corner rank and suit, and the pips. A lesson teaches SVG's coordinates, shapes, paths, text and
  `<g transform>`.
- **Developer mode** (key D): the AI's hand face up, and beside each move it could make, the value it gives that
  move, so you see why it chose.

**3. Agents with changing legal moves.** Cribbage does not fit a fixed action list or bins:
- the moves change every turn (the cards in hand, the pairs that could be thrown);
- the state is too large for a table.
So script agents gain `legalActions()` and `features(action)`. A new learner scores each legal move as
Q(s, a) = w · φ(s, a): semi-gradient Q-learning with features of the move (lesson 9.8, now in Game Studio). It is
another method in Train an agent….
- **Discard:** a one-step choice (a contextual bandit). Its features describe the kept four and the two thrown, and
  whose crib it is. The reward is the points that follow.
- **Pegging:** each card's features are the points it scores now, the count after it, whether it leaves 5 or 21
  (dangerous), whether it sets up a pair or run for the opponent, and its rank. The reward is points pegged minus
  points conceded.
- **Training:** against a scripted opponent, then self-play. Measured against random play and against the scripted
  player, over seeds.

**Progress (2026-10-04):**

**Engine and ML**
- SVG images (`project.writeSvg`): core/svg.test.ts.
- Mouse input (`input.mouse`, `input.mouseScreen`, MouseLeft and MouseRight as keys).
- Turn-based agents: `legalActions()`, `features(action)`, `featureNames`, `temperature`. The engine decides only on
  the agent's turn, among its legal moves; `GameEnv` steps to the next turn.
- `ai.values`, `ai.choose`, `ai.weights`.
- Linear Q-learner (ml/linearq.ts, α schedule), tested in ml/linearq.test.ts.
- Train an agent's Features (linear Q) mode, with a weights table.

**The Cribbage example**
- Built: examples/cribbage.ts with cribbage/*.js. The art is all SVG; the developer view shows Q for each move, and
  why (weight × difference from the runner-up).
- The brain: TRAIN=1 cribbage.brain.test.ts retrains it and checks it is the same.

| Measured (Cribbage) | Result |
|---|---|
| Per hand, against the rules player, same 1000 deals | learned +0.21; rules +0.16; random −4.70 |
| Whole games won, of 150 (Easy τ 2, Medium τ 0.6, Hard τ 0) | Easy 26, Medium 57, Hard 80 |

- Features learned so far: the crib's expected value (CRIB_VALUE, by exact enumeration) has to appear in the pegging
  features too, or the discard's crib value is lost one bootstrap step later.

**Finished agent first**
- Every ML task has `finished` (tasks/goals.ts) and ▶ Watch the finished agent in the task panel.
- The brains in tasks/goals/*.json are retrained by TRAIN=1 tasks/goals.test.ts.
- Browser-checked: Cliff Walk draws its table, Breakout is driven by its spec, and Breakout Lab's paddle clears the
  wall.

**Chapter 10 tasks (built, 2026-10-04):** tasks/cribbage.ts has 12 tasks (crib-tour, cards, svg, score, peg, table,
screen, rules, agent, features, train, difficulty). Each starts from the game with a module stubbed. Each has the
finished game first. All pass tasks.test.ts.

Supporting pieces built for the tasks:
- SVG images are edited as text with a live preview (Files › New SVG…, or click an .svg asset).
- Checks can call a script's exports: `module(path)`.
- `play({ training })` runs a check as training does.

**Chapter 10 lessons (built, 2026-10-04):**
- mg10-001 … mg10-012 in src/courses/making-games/10-cribbage/, each linking its task.
- The source is course-sources/making-games.yaml. The chapter 10 block is written by the scratchpad generator
  c10/build10.mjs from l1–l12.mjs; if the scratchpad is gone, edit the YAML directly.
- Notebook cells reuse the game's own modules (imports and exports stripped), so lessons and game agree.
- src/courses/making-games/cribbage.test.js checks every number quoted in the prose against a cell run, and that
  every challenge fails as given and passes when solved.
- Browser-checked:
  - lesson 10.3's SVG cells render as images;
  - the crib-svg task: an SVG edited in its tab, the live preview (left of the text, clear of the task panel), saved,
    step ticked.

**Not yet browser-checked:** each cribbage task done step by step through the UI (the tests prove every start and
solution), and the remaining lessons' notebooks on the page (the JS-cell checker and the tests run every cell).

**Chapter 9 finished (2026-10-04):**
- **Table masks.** Table Q-learning now masks illegal moves (choose and max over legal actions only). Non-turn-based
  agents make the same random draws as before; the locked Breakout results are unchanged.
- **Linear Q for any agent** with features(action).
- **9.8's Try it:** `paddle-features`, Breakout Lab's paddle with nine features. It clears 42 of 48 bricks (the
  table: 48). Its brain is in tasks/goals/paddle-features.json (TRAIN=1 goals.test.ts retrains it).
- **Ghost Lab** (examples/ghostLab.ts): Maze Chase's ghost as a turn-based agent.
  - Legal moves are the ways at a junction, never straight back.
  - A wandering player is the scripted opponent; both ghosts share one brain.
  - With no brain, the ghost plans (breadth-first search). TRAP is a second map.
  - examples/ghostLab.test.ts; MEASURE=1 also checks the trained measurements.
- **Lessons 9.9** (NPCs that learn), **9.10** (learn or plan?) and **9.11** (capstone). They are in the YAML between
  chapter 9's end markers, written by scratchpad c9b/build9b.mjs. Tasks: ghost-agent, learn-or-plan, second-npc.
- **The notebooks** use a grid version of Ghost Lab (one cell a step). src/courses/making-games/npcs.test.js
  checks every quoted number.

| Measured (grid version) | Result |
|---|---|
| Open maze: learned against planning | 10.0 against 9.4 |
| Trap, wandering player: learned against planning | −26.1 against −27.3 |
| Trap, still player: planning | −10.0 (exact) |
| Trap, still player: ghost trained on the wanderer | −150.0 (never catches) |
| Fetch, trained / pickup-reward bug | home 200 of 200 / home 14 of 200 |
| Two chasers on one brain / chaser with ambusher | 4.9 steps / 6.7 to 10.1 steps (the ambusher did not help) |

**Step pictures (2026-10-04):** every new task's steps are done through the editor by e2e/tutorials.shots.mjs
(`npm run game:shots`, or with a task id prefix), each ticks, and its picture is in tasks/shots/.

Fixes the pictures run found:
- The whole-game check stops when the game is stuck, instead of playing 20,000 frames on every edit.
- crib-table writes award() before cut(), which uses it.
- A turn-based agent's trained score, like its random play's, is over 100 games, not 3.

**Not built (optional):** Train in view and the step-through trace only for Table (TD), not for Features (linear Q).

**Next:** the modelling course from lesson 11.2.

**4. The lessons: a mini-series**, every step present.
1. The finished game, played against the trained AI.
2. Cards and the deck.
3. The deal and the crib.
4. Scoring the show.
5. Pegging.
6. A full game with a scripted opponent.
7. Developer mode.
8. The AI's discard: features and a bandit.
9. The AI's pegging: linear Q over moves.
10. Self-play and judging the AI.
11. Shipping the brain.

Each lesson has a notebook and a Game Studio task, with the task's first item showing the finished AI.

## Order of work

1. **Engine.** Script agents (`observe`, `act`, `reward`), brains as files, the run-time `brains` API, and export.
   Each comes with tests, and an acceptance test where a trained ghost runs in an exported game.
2. **Training with other scripts running.** A scripted opponent, and shared brains.
3. **The overlay.**
4. **Linear Q-learning,** in `ml/` next to the tabular version.
5. **The lessons,** in order, each verified as 8.1 was: notebook numbers tested, the task's steps proved by
   `tutorials.shots.mjs`, and results measured over several seeds and quoted as measured.

Estimated size: the engine work is about one session; the lessons are about one session per two lessons. The
real bottleneck is measuring each lesson's claims (training runs over seeds), not writing.

## Progress

**Step 1, the engine: done (2026-10-03).**
- **Script agents** (`engine/game.ts`, `ml/env.ts`):
  - A node whose script has `observe()` and `act(action)` is an agent. It can also have `actions` and
    `observations` (names), `reward()`, `done()` and `decideEvery`.
  - The engine drives it from the brain named in its `brain` field, every `decideEvery` frames.
  - `GameEnv` trains it from `{ agent: 'Path', bins: [...] }`, through the same two methods, so it behaves the
    same in training and in the game.
- **Brains** (project format 4, `BrainData`):
  - `project.saveBrain` / `removeBrain` are undo steps and lines of GUI → code, checked by `problems()`.
  - Brains are saved with the project and exported in `project.json`; older projects migrate to `brains: []`.
- **The `ai` global:** `ai.training` (true while an agent trains, so a player script can play itself),
  `ai.has(path)` and `ai.act(path, numbers)`.
- **The dialog:**
  - Run › Train an agent… accepts `{ agent, bins }`, and takes labels from the trainer (a `describe` message).
  - It has **Save as brain**. "Watch it play" drives a script agent through `game.setAgentPolicy`.
- **Policy code** moved to `ml/brain.ts`, which imports nothing, so the engine uses brains without the trainer.
- **Tests:**
  - `ml/agents.test.ts`: a chaser NPC trained, saved, replayed from the code log, driven by its brain in a
    fresh game, and exported.
  - `ml.acceptance.mjs` 10/10, including Save as brain; `q-agent` shots 5/5; Game Studio unit tests 236/236.
- **Found while testing (for lesson 3, "States that work"):**
  - With only the direction to the target (−1, 0, 1), the chaser stayed in one state for many steps. Every
    action bootstrapped from that same state, and it could not learn in 80 episodes.
  - With the offset in 60 px units cut into 5 bins per axis (25 states), it learns in 200.

**Train in view: done (2026-10-03).** The user wanted to see the machine learn, not only the result.
- **One learner:** Q-learning is now a step-at-a-time `QLearner` (`ml/qlearning.ts`). The worker runs it flat out,
  and the game's runtime runs it inside the visible game, a few ticks per drawn frame.
  - Speeds are real time, 4×, 16×, 64× and Max (game frames per drawn frame).
  - Only the last frame of each burst is drawn.
  - Random play and the final score are measured headless.
- **The same draws in the same order.** Watching learns exactly what headless training learns:
  - `trainview.acceptance.mjs` checks the same score and the same greedy checks, in both;
  - `qlearning.test.ts` locks Breakout's ten greedy checks, 48 44 44 43 44 −5 13 22 −2 48, unchanged by the refactor.
- **The panel:** a strip under the game (the game shrinks to fit above it, so nothing is covered). It shows:
  - what the learner is doing: the episode and how much it explores, or a greedy check game;
  - the speed buttons and the live learning curve;
  - when it is done, Watch it play and the way to Save as brain.
- **Scope:** the player's keys are ignored while it trains; Pause pauses training; Stop ends it.
- **Pictures:** `$TMPDIR/game-studio-train-in-view.png`, `game-studio-train-hud.png`.

**Lab instruments for the concepts: done (2026-10-03).**
- **Four updates** in `QLearner`: Q-learning, SARSA, Expected SARSA and Double Q-learning.
- **Exploration options:** ε-greedy or softmax; linear, exponential or constant schedules; optimistic starting Q.
  Q-learning's default numbers are unchanged; Breakout's checks are locked in the test.
- `ml/td.test.ts` reproduces Sutton & Barto:
  - Example 6.6: Q-learning's 13-move edge path, SARSA's top-row path, SARSA earning more while exploring;
  - Example 6.7: maximization bias, Q-learning against Double Q-learning.
- **Cliff Walk** (`examples/cliffWalk.ts`), the textbook gridworld, as a playable example:
  - the Walker is a script agent; its cell is its state;
  - `ml/overlay.ts` draws the table on the grid while it trains and plays (a `rect` draw kind);
  - `ml/cliff.test.ts` gets the textbook result on the real engine.
- **Step and Predict** (`editor/TrainTrace.tsx`):
  - pause and step one update at a time, written in its algorithm's formula with its real numbers;
  - Predict hides the target and the new Q until you check;
  - `TrainTrace.test.tsx` proves the shown arithmetic gives the learner's numbers, for all four updates.
- **Compare** (`ml/compare.ts`, `editor/CompareView.tsx`):
  - settings over the same seeds, with averaged curves and mean ± sample sd of late return and greedy score;
  - on the cliff it shows Fig. 6.4's shape.
- **Browser:** `cliff.acceptance.mjs` 8/8 (in `npm run game:acceptance`).

**Lesson 9.1, "Learning from Every Step": done (2026-10-03).**
- `src/courses/making-games/9-game-ai-that-learns/001-learning-from-every-step.js`, from the YAML (chapter 9).
- **Notebook:** the random walk; one episode learned by every-visit MC and by TD(0); error curves over 100 runs
  (TD α 0.1: 0.054, α 0.05: 0.035; MC α 0.03: 0.090, α 0.01: 0.094); one Q-learning update; the TD(0) challenge,
  which checks itself.
- **Try it:** the `td-step` task (its pictures made; all 4 steps tick).
- **Checks:** `courses/making-games/td.test.js` pins every printed number. The browser probe ran every cell and
  opened the Try it card. mg8-001's nextLesson is mg9-001.
- **The task panel** now stops above the training strip (it had covered Predict's Check).

**Lesson 9.2, "Exploration": done (2026-10-03).**
- `002-exploration.js`.
- **Notebook,** on the 10-armed bandit over 200 runs: greedy reaches the best arm 42% of the time against ε 0.1's
  82%. Optimistic greedy ends highest (1.41), then UCB (1.39) and softmax (1.36). Also the incremental average and
  constant-α weights, the reward curves, and the ε-greedy probabilities challenge.
- **Try it:** the `explore-compare` task, 3 steps that tick in shots.
  - Cliff, 5 seeds, late return: ε 0.1 constant −43.4 ± 7.2; linear −25.9 ± 8.1; exponential −16.7 ± 2.1;
    softmax −13 ± 0.
  - Greedy ε 0: Q₀ 0 gives −13 on every seed; Q₀ −100 gives a greedy return of −14.2 ± 1.1.
- **Test:** `explore.test.js`.

**Lesson 9.3, "Breakout from Scratch": done (2026-10-04).**
- **Breakout Lab example** (`examples/breakoutLab.ts`):
  - the wall is built when the game starts from a text map in scripts/wall.js;
  - the paddle starts as a plain player's paddle;
  - `PADDLE_AGENT` is the written-out agent, and `PADDLE_SPEC` gives 14 states.
- **The `breakout-scratch` task, 6 steps** (shots: all tick):
  - the first 3 are play checks that run your script (act, observe, reward and done);
  - then train, Save as brain and set the brain field, then edit the map and retrain.
- **Measured** (`ml/breakoutLab.test.ts`): random −5; trained 48 (full wall) and 20 (pyramid); absolute positions
  learn nothing.
  - Over 3 seeds: full 35/48/48, one row 12/10/12, pyramid 20/19/20, sides 16/16/16.
  - Without the falling bit: 43.
- **Notebook:** absolute vs relative on a 20-column catch (10% against 100%), rewards from the score, how states
  multiply, and the observe() challenge. Test: `scratch.test.js`.
- **Compare now keeps the best checked table**, as Train does (`runOnce` with checkEvery 10). On Breakout the final
  table alone was unreliable.

**Lesson 9.4, "SARSA and Q-learning": done (2026-10-04).**
- `004-sarsa-and-q-learning.js`.
- **Notebook,** on a plain-JS cliff:
  - one step, both targets: −9 against −41 (Expected SARSA −9.875);
  - 10 seeds: Q-learning earns −50.4 while learning but walks 13 every time; SARSA earns −27.2 and walks 17 on
    most seeds (two greedy tables loop);
  - edge values: Q-learning −11.0 against SARSA −20.4 at column 1;
  - ε faded to exactly 0: SARSA still walks 17 after 5000 episodes;
  - the two walks drawn; the SARSA-target challenge.
- **Try it:** the `sarsa-vs-q` task (3 steps tick). Test: `sarsa.test.js`.

**Lesson 9.5, "Expected SARSA and Double Q-learning": done (2026-10-04).**
- `005-expected-sarsa-and-double-q-learning.js`.
- **Notebook:**
  - the max of noisy estimates is 1.541, 0.701 and 0.345 (1, 5 and 20 samples; truth 0), against the double
    estimate's 0.003;
  - Example 6.7: Q-learning goes left 70% of the time in the first 10 episodes and 86% in the first 50, peaking at
    96%; Double Q 50% and 28%, peaking at 53%;
  - the cliff at α 1: SARSA −102.7 against Expected SARSA −24.8;
  - the Fig. 6.5 curve; the Double Q target challenge.
- **Try it:** the `all-four` task (2 steps tick). Game Studio's Compare at α 1: SARSA −91.1 ± 15.4 against Expected
  SARSA −22.3 ± 2.1.
- **Test:** `double.test.js`.

**Lesson 9.6, "Experiments That Mean Something": done (2026-10-04).**
- `006-experiments-that-mean-something.js`.
- **Notebook:**
  - 10 seeds of one setting span −73.1 to −92.7 (sd 5.7);
  - 95% intervals: ±9.1, 4.1, 3.3 and 2.0 for 5, 10, 20 and 50 seeds;
  - the α study on the cliff: bigger is better, because the cliff is deterministic;
  - the γ corridor (+1 near against +10 nine steps away, threshold 0.774, exploring starts): 1, 0.9 and 0.8 go far;
    0.7 and 0.5 go near;
  - the α study drawn with bars; the reporting challenge (the population sd fails it).
- **Try it:** the `experiments` task (an α sweep over 5 then 10 seeds; ticks). Test: `experiments.test.js`.
- **YAML builds now auto-quote** plain values containing ": " (scratchpad safeyaml.py). That had broken three
  lessons, once as an invalid JS object.

**Lesson 9.7, "Bigger State Spaces": done (2026-10-04).**
- `007-bigger-state-spaces.js`.
- **Notebook** (the catch game):
  - resolution: 2 bins get worse with training (0.45 → 0.10 → 0.00); 3 and 7 bins catch everything; 39 exact bins
    are slow (0.79 at 100 episodes, 0.67 at 1000, 1.00 at 5000);
  - aliasing with a drifting ball: 0.46 seeing ball − paddle, 0.84 adding the drift, 1.00 with "landing − paddle";
  - updates per state for several designs; the bins-to-state challenge, matched to `brain.ts`.
- **Try it:** the `state-design` task on Breakout Lab (the agent pre-written; ticks).
  - 3 bins across 39/21/21; 7 bins 35/48/48; 13 bins 38/46/42; with "ball going right" 40/44/45 (3 seeds,
    100 episodes).
- **Test:** `states.test.js`. New export: `PADDLE_AGENT_SIDEWAYS`.

**Lesson 9.8, "Beyond Tables": done, notebook only (2026-10-04).**
- `008-beyond-tables.js`.
- **Notebook** (5 seeds):
  - table 0.62/0.91/0.97; tiles alone 0.21/0.41/0.40 (they straddle d = 0); tiles + side feature 0.90/1.00/1.00;
  - one update spreads as a tent from d = 1 to 9;
  - a semi-gradient step by hand;
  - replay: the table catches 0.91 at 30 episodes, not 0.62;
  - the linear update challenge.
- **No Try it task yet:** Game Studio has no linear Q. The lesson says so. Test: `approx.test.js`.
- **Fixed:** `safeyaml.py` now skips block scalars. It had quoted code lines containing ` ? … : …`.

**Next:**
- linear Q (tile coding) in Game Studio's QLearner, then a Try it task for 9.8;
- 9.9 NPCs (shared brains, scripted opponent, Maze Chase ghost);
- 9.10 when not to learn;
- 9.11 capstone.

**Building notes for the next session:**
- Lessons are generated from `course-sources/making-games.yaml`. The chapter 8 and 9 blocks are written by scratchpad
  scripts (q/build.mjs, c9/build9.mjs with l1–l6.mjs). If the scratchpad is gone, edit the YAML directly.
- `course:create --force` regenerates every lesson; only changed files differ.

**Earlier list, kept for reference:**
- step 2: shared brains, several NPCs learning one table, and a scripted opponent in an example;
- step 3: the overlay;
- step 4: linear Q-learning;
- then the lessons, starting with 9.2.

## Decisions

- **Where it goes:** a new chapter 9 after the bonus (the user, 2026-10-03).
- **Lesson 8 stays in:** when not to use learning, measured against the breadth-first-search ghost (the user,
  2026-10-03).
- **Brains ship in exported games:** part of the approved plan; a trained ghost should work on a website too.
- **Python:** the ML Lab's Python could later train on the same environments. Not part of this plan.
