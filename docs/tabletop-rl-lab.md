# Tabletop RL Lab: plan and status

Route: `#/lab/tabletop-rl-lab`, discovered from `src/labs/tabletop-rl-lab/meta.js`. Read this file first when resuming, and update **Where we stopped**.

Tabletop RL Lab teaches reinforcement learning on Yahtzee, from basic Python to TD learning with function approximation. One turn of Yahtzee can be solved exactly, so every learner is graded against the right answer, which most learning problems never offer. It follows QMaze, CartPole, Neural Net Lab and KartLab: lessons built from blocks, every line of every Python program explained, numbers measured by an engine that reproduces the Python exactly, and a Real Python tab. The 3D dice table from the first version is kept, now playing the lab's players.

## How it is built

| Piece | Where | What it is |
|---|---|---|
| Python programs | `python/` | Plain Python 3, standard library only: `dice.py`, `scoring.py`, `probability.py` (multinomial chances, reroll outcomes, the chase Markov chain), `simulate.py`, `turn.py`, `exact.py` (backward induction, policy evaluation), `learn.py` (Q-learning, SARSA, afterstates), `game.py` (full rules: upper bonus, extra Yahtzees, Joker), `players.py` (Chaser, Planner), `afterstate.py` (linear card value by TD(0)), `stats.py` |
| JavaScript engine | `engine/dice.js`, `probability.js`, `turn.js`, `learn.js`, `game.js` | The same programs, operation for operation, with QMaze's port of Python's Mersenne Twister |
| Parity | `tools/make_parity.py` → `engine/parity.json`, `engine/parity.test.js` | Dice, scores, chances, the exact solution of all 13 boxes, seeded learning runs, whole games and TD weights, compared exactly |
| Lessons | `lessons/part1.js` … `part5.js` | 32 lessons in five parts, python-steps block format |
| Measurements | `tools/measure.mjs` → `engine/measured.json` | One-turn learning curves (5 boxes × 6 learners, graded exactly), the players over 2,000 evaluation games, TD learning curves, paired comparisons, and the supplied learners' weights |
| Players | `players.js` | Chaser, Planner, Learner (13 weights), Bonus learner (19 weights); Workshop players saved locally |
| Tabs | `Table.jsx` (3D dice, paper scorecard, advisor), `Workshop.jsx` + `engine/trainer.worker.js` (TD(0) training, paired grading, library), `PythonTab.jsx` | |

## Design decisions

1. **Hands are sorted tuples** (252 of them), and keeps are distinct sub-multisets (4,368 hand–keep pairs, 462 different kept sets).
2. **A turn has exactly two decisions**; keeping all five dice is standing. One turn aimed at one box is a finite-horizon MDP, solved by two backups.
3. **Each turn's 15 dice are rolled in advance** (5 per roll), so players on the same seed face the same dice: paired comparisons (common random numbers).
4. **Afterstates twice**: kept dice for one turn (Part 3), the card left after writing a box for the game (Part 4).
5. **The Planner** solves each turn exactly with final hands worth points now plus a value of the card left: 0 (one-turn Planner) or a learned linear value.

## Measured findings the lessons rely on

- Exact one-turn values: Sixes 12.6389, Small straight 18.4633, Chance 23.3333, Yahtzee 2.3014 (= 50 × 4.6029%, the chase chain's chance).
- One turn, 50,000 turns, ε 0.1, seed 0, graded exactly: Q-learning α 0.1 on Sixes 7.378, with step 1/n 11.067; afterstates with 1/n 12.638 (Small straight 18.397, Chance 23.304). Q-learning on Chance with α 0.1 is stuck at 17.65. Yahtzee box: at most 1.51.
- Whole games (2,000 evaluation games from seed 1,000,000): Chaser 150.4, Planner 217.1, Learner 238.5, Bonus learner 243.9 (SE about 1.25). Upper bonus reached: 2.0%, 4.2%, 21.3%, 59.9%. Bonus learner minus Learner +5.40, paired SE 1.06 against 1.80 independent. Published optimum: 254.59 (quoted, not computed here).

## Checks

| Command | What it checks |
|---|---|
| `npx vitest run src/labs/tabletop-rl-lab --exclude "**/*.desktop.test.js"` | Engine = Python exactly (`engine/parity.test.js`); rules (`engine/rules.test.js`); lessons, notes and function cards (`lessons/lessons.test.js`); every statement explained (`lessons/coverage.test.js`); every lesson, the Table, the Workshop and the Python tab render (`render.test.jsx`); production bundle (`bundle.test.js`) |
| `TABLETOP_PYTHON=python3 npx vitest run src/labs/tabletop-rl-lab/stepper.desktop.test.js` | Every Python-tab program in the real stepper, line arithmetic against Python, and the learners' results against the engine |
| `python3 src/labs/tabletop-rl-lab/tools/make_parity.py`, `node src/labs/tabletop-rl-lab/tools/measure.mjs` | Regenerate parity data and measurements after changing a program |

## Where we stopped

2026-10-12, rebuilt from the first version (a 3D table with Q-learning keep policies and five short notes): Python programs, exact engine, 32 lessons, 24 figures, Workshop, Real Python tab. All checks above pass. In the browser: lessons and figures drawn; a 100-game player trained by the real worker, saved and graded against the Learner on 100 paired games (222.4 against 236.6, difference −14.2 ± 5.4).

Not done, if wanted next: exact dynamic programming of the whole game (to compute 254.59 here rather than quote it); a neural value function; other dice games (Pig).
