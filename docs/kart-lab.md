# KartLab: train a driver for a real game

Route: `#/lab/kart-lab`. The lab is discovered from `src/labs/kart-lab/meta.js`.

## Delivered scope

Sunlit Circuit is an original, low-poly 3D arcade track. Learners train its
players; game construction is not part of the curriculum. Steering changes
between three lanes and the game follows the circuit automatically. Five
actions control lane and speed. Barriers and other racers cause collisions.
This is not a continuous steering or vehicle dynamics simulator.

The lab follows QMaze/CartPole's paper-style lessons, prediction checks,
interactive figures, source excerpts, and separate playground structure:

- Lessons explain the observation/action/reward contract, representation,
  rewards, Q updates, exploration, algorithm comparison and experimental design.
- Train & compare runs real Q-learning, SARSA or Double Q-learning in a worker.
  It exposes learning rate, discount, exploration endpoints, collision penalty,
  episode budget, seed and scripted traffic. Cancellation terminates the worker
  and discards the partial run. Switching tabs keeps training alive; closing the
  lab terminates it.
- Named checkpoints are stored locally, with their training recipe. A storage
  failure is reported. The custom library is bounded, and checkpoints have an
  environment version and validated sparse tables.
- Race & watch supports one human and two trained policies, or three policies.
  Every seat selects a checkpoint. NPC decisions use saved Q-values. Follow any
  racer, switch to the grandstand, slow down, step, pause and scrub the recording.
- The grid-swap tournament uses the same race engine and frozen policies for all
  six starting-position permutations. Exact ties share points, failures earn
  zero, and finished-lap times are reported separately from failures.
- Training records its final episode's actual observations, action values,
  selected actions, transition rewards and numerical updates. The trace viewer
  shows the selected Double Q table and terminal zero-bootstrap behavior.
- Checkpoints can be exported/imported as versioned JSON. Imports validate size,
  training parameters, table indices and finite bounded values. Removing a
  custom checkpoint offers Undo. Supplied models are never removed.
- Code & maths shows excerpts from the actual JavaScript engine source. There is
  no separate approximate learning implementation behind the figures.

`engine/game.js` is shared by training and racing. `engine/learning.js` owns
updates, action selection, frozen evaluation and checkpoint serialization.
`Scene.jsx` only renders; it cannot alter the simulation. A fixed game timestep
keeps decisions independent of rendering. Backgrounding or blurring the tab
pauses races and clears held keys. Leaving the arena unmounts its 3D renderer
and preserves the grid, race state and replay in the lab session. Returning
restores a paused race. Idle 3D scenes render on demand rather than continuously.

## Reproducing the supplied agents

Run `node src/labs/kart-lab/tools/train-baselines.mjs`. It writes
`src/labs/kart-lab/baselines.json` from real training with the seeds and budgets
in that script. Do not hand-edit that checkpoint file. Supplied drivers are
trained policies, not heuristic controllers.

## What evaluations mean

The displayed frozen evaluation uses one lap and 30 seeds outside the sampled
training-seed range. Exploration and learning are disabled. The comparison panel
uses the same traffic seeds, traffic enabled and collision penalty 6 for every
saved driver. Completion and collisions should be compared before mean duration:
mean duration includes failed episodes. Repeated tuning on these seeds makes
them validation data, not an untouched final test.

Races last three laps. Their opponents are learned policies, whereas training
traffic follows fixed scripted trajectories. Competitive racing is therefore a
separate distribution-shift test. The observation contains circuit sector, lane,
speed and a short-range traffic mask. It omits exact opponent positions, speeds
and policies; it is not a full Markov state for the race. Sector-based tables
learn this particular circuit, not general driving from camera images.

The traffic collision rule tests forward swept sectors against opponents'
positions at the start of the decision. Side contact at exactly the same sector
is not modeled. Lane motion is instantaneous in the engine and visually eased.
Eight hits per lap budget or the decision limit ends an episode as a failure.
Training and racing use the same rule, with limits scaled to their lap count.

## Verification (2026-10-12)

- `npx vitest run src/labs/kart-lab src/routes.test.js --maxWorkers=1`: **5 files passed,
  31 tests passed**. Includes a scoped Vite production bundle with the worker
  and lazy 3D scene, state encoding, collision/reward behavior, terminal
  conditions, all three update targets, reproducibility, held-out improvement,
  frozen evaluation, checkpoint round trips, lesson checks and race controls.
- `npm run typecheck`: exit 0, no diagnostics.
- `npm run facts`: regenerated the catalog, including the new lab.
- `npm run catalog:check`: titles, ids and facts current; reports 14 existing
  content problems in the generated inventory.
- `npm run docs:check`: 10 files checked; links, paths and commands exist.
- `git diff --check`: exit 0, no output.
- `npm run build`: exit 0, 15,840 modules transformed; built in 2m 36s.
  Installing the missing `sql.js` dependency resolved the earlier blocker.
  Existing dependency, browser externalization, eval and chunk-size warnings remain.
- Browser: inspected the 3D circuit, learned values and seat controls; trained
  and saved Q-learning and SARSA drivers using the actual worker, evaluated
  the saved drivers, and selected both on the race grid. The default Q run
  completed 29/30 held-out episodes and SARSA 30/30. Saved checkpoints were
  visible across tab switches. Started head-to-head racing.
- Follow-up browser checks verified a complete three-lap race (Violet 31.9 s,
  Mint 32.8 s, Coral 33.2 s), finish banner, recorded decision scrubbing, follow
  selection, grandstand camera, preserving a finished race across tabs, and
  human acceleration/lane changes through keyboard controls.
- The real Double Q worker produced an inspectable final-episode trace showing
  pre-action values, the selected table, target and changed value. The browser
  tournament matched headless results: Violet 18, Coral 10, Mint 8 points.
- Browser download-event waiting stalled in the automation tool; checkpoint
  serialization, validation and round trips are covered by engine tests. Do not
  interpret that tool wait as confirmation that a file reached Downloads.
- Production browser checks at 390 × 844 verified the narrow training layout,
  no horizontal arena overflow, and touch acceleration advancing the simulation.
  The temporary preview server was stopped after verification.

These are lab-internal lesson blocks, not course-loader lesson objects or
notebook cells. Their renderer and every comprehension check are covered by the
adjacent render tests. Browser QA is not a substitute for user playtesting.

## Follow-up scope

Continuous driving physics, additional tracks, DQN/image observations,
self-play training, online multiplayer, persistent/exportable race recordings,
editable learner programs and native Python execution are not implemented.
The renderer/environment/policy boundaries provide places for future expansion;
new games will require their own observation and action schemas and checkpoints.
