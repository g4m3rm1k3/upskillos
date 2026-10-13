# KartLab: plan and status

Route: `#/lab/kart-lab`, discovered from `src/labs/kart-lab/meta.js`. Read this file first when resuming, and update **Where we stopped**.

KartLab teaches reinforcement learning on Sunlit Circuit, a small 3D kart racer, from basic Python to drivers that race on a track they have never seen. It follows QMaze, CartPole and Neural Net Lab: ordered lessons built from blocks, every line of every Python program explained, numbers measured by an engine that reproduces the Python exactly, and a Real Python tab that steps the programs on the desktop. The 3D race arena and the training tab from the first version are kept, now running on the rebuilt engine.

## How it is built

| Piece | Where | What it is |
|---|---|---|
| Python programs | `python/` | The source of truth. Plain Python 3, standard library only: `kart.py` (tracks, moves, swept contact, rewards), `observe.py` (sector key, hazard mask, sensors), `drivers.py` (rule drivers), `tabular.py` (Q-learning, SARSA, Double Q), `maxbias.py` (Sutton and Barto's Example 6.7), `linear.py` (semi-gradient linear Q), `race.py` (three-kart races, tournaments) |
| JavaScript engine | `engine/kart.js`, `tabular.js`, `maxbias.js`, `race.js` | The same programs, operation for operation, with QMaze's port of Python's Mersenne Twister. Used by the lessons' figures, the arena, the training worker and the measurement tools |
| Parity | `tools/make_parity.py` → `engine/parity.json`, `engine/parity.test.js` | Python's recorded laps, observations, training runs, maximisation-bias curves, race and tournament, compared exactly with the engine |
| Lessons | `lessons/part1.js` … `part5.js` | 25 lessons in python-steps block format (`../python-steps/Blocks.jsx`). Ids starting `kart-0` are the first version's ids, kept so progress carries over |
| Measurements | `tools/measure.mjs` → `engine/measured.json` | Five training seeds per recipe, 50 held-out laps per track; rule drivers; learning curves; maximisation bias over 2,000 runs |
| Supplied drivers | `tools/train-baselines.mjs` → `baselines.json` | Mint (Q-learning), Coral (SARSA), Violet (Double Q), all sector tables, 6,000 laps; Sky (sensor table) and Ember (linear), 2,500 laps |
| Real Python tab | `PythonTab.jsx`, `programs.js`, `functions.js`, `lineNotes.js` | The shared python-steps tab: the lessons' line notes, function cards and live values |

Engine version `kart-v3` (in `engine/tabular.js`) rejects older checkpoints. Lesson progress from v1 and v2 storage carries over; old drivers do not, and the lab says so once.

## Design decisions

1. **The circuit is data.** A track is a dictionary: a length, barriers `(sector, lane)` and sweepers `(sector, offset)`. A second track, Harbour Loop, uses the same physics and is never practised on; Part 4 tests transfer with it. The 3D arena still draws only Sunlit Circuit.
2. **Two observations.** The sector observation (10,368 keys: sector, lane, speed, hazard mask) memorises one track. The sensor observation (243 keys: lane, speed, and each lane's nearest hazard of any kind, clear / within 6 / within 3) is relative to the kart and transfers. The careful rule driver of lesson 1.6 uses the same sensors.
3. **Ties go to Coast** in `argmax`, deterministically, so frozen drivers and races are deterministic. Exploration uses ε-greedy with a linear schedule over the first 80% of laps.
4. **Races are deterministic**, so tournaments vary the conditions (all six starting orders) rather than repeating races.
5. **Measured, not asserted.** Every number in the lessons comes from `measured.json`, `baselines.json` or a live engine call, and every predict block's answer is recomputed by `lessons.test.js`.

## Lessons

1. A game as an environment: the agent–environment loop · the track as data · five actions · swept collisions · rewards and returns · drivers written by hand.
2. What the driver knows: the observation key · the hazard mask as bits · aliasing and partial observability.
3. Learning to drive: the Q-table · ε-greedy with a schedule · the TD update · a training run and a frozen test · SARSA · maximisation bias · Double Q-learning · reward design · seeds.
4. A track it has never seen: memorisation · sensors · linear function approximation · what generalises.
5. Racing: three learners on one track · a fair tournament · your own experiment.

## Measured findings the lessons rely on

Five training seeds (19, 73, 137, 211, 307), 2,500 practice laps, 50 held-out test laps per track (seeds 800,001 + 97i):

| Recipe | Sunlit | Harbour (never practised) |
|---|---|---|
| Careful rule (no learning) | 80% | 80% |
| Q-learning, sector | 91.2% | 0% |
| SARSA, sector | 86.0% | 0% |
| Double Q, sector | 89.6% | 0.4% |
| Q-learning, sensors | 92.0% | 93.2% |
| Linear, α 0.01 | 91.2% | 90.8% |
| Linear, α 0.05 | 81.6% | 75.6% |

- 500 laps: sector 44.0%, sensors 81.2% (Sunlit). 8,000 laps: sector 96.4% (0.42 hits per lap), sensors 92.0%.
- SARSA crashes less while practising (2.08 against 2.44 hits per practice lap, last 500 laps at ε 0.04) but tests no better.
- Collision penalty 0: 76.8% finished, 3.13 hits per lap; 20: 87.2%.
- Maximisation bias (2,000 runs): Q-learning goes Left up to 94.1% of the time; Double Q never above 50.4%, the random start.
- The supplied drivers finish 84–98% of solo test laps but fail some three-lap races against each other (distribution shift from scripted to learned traffic).

## Checks

| Command | What it checks |
|---|---|
| `npx vitest run src/labs/kart-lab --exclude "**/*.desktop.test.js"` | Engine = Python exactly (`engine/parity.test.js`); rules, learners, races and checkpoints (`engine/rules.test.js`); every predict's number = engine, every note finds its line, every function documented (`lessons/lessons.test.js`); every Python statement explained (`lessons/coverage.test.js`); every lesson, the arena, the training worker, storage migration and the Python tab render (`render.test.jsx`); production bundle with worker and lazy 3D scene (`bundle.test.js`) |
| `KART_PYTHON=python3 npx vitest run src/labs/kart-lab/stepper.desktop.test.js` | Every Python-tab program in the real A-Arcade stepper, and each line's worked arithmetic against what Python computes. Any Python 3 works: the programs use only the standard library |
| `python3 src/labs/kart-lab/tools/make_parity.py` | Regenerate `engine/parity.json` after changing any program in `python/` |
| `node src/labs/kart-lab/tools/measure.mjs`, `node src/labs/kart-lab/tools/train-baselines.mjs` | Regenerate the measurements and the supplied drivers |

## Where we stopped

2026-10-12, v3 rebuild: Python programs, exact JS engine, 25 lessons, 20 figures, Real Python tab, second track, sensor and linear drivers, retrained supplied drivers. Verified with the checks above (all pass), and in the browser: lessons and figures drawn, a driver trained by the real worker (500 laps: 32/50 Sunlit, 0/50 Harbour), saved, seated and raced in the 3D arena.

Not done, if wanted next: self-play (frozen learned drivers as practice traffic) to attack the race distribution shift; drawing Harbour Loop in the 3D arena; a small neural Q-network; continuous steering.
