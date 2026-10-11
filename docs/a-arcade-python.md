# A-Arcade Python

A desktop-only lab (`#/lab/a-arcade-python`) that runs the learner's real Q-Arcade code in real Python, one line at a time:

- **Q-learning:** Chapter 1's `qtable.py`, `qlearning.py`, `agent.py` and `train.py`, plus Chapter 2's `bins.py` and `cartpole_table.py`. It runs NumPy and Gymnasium, and starts at `train_cartpole()`.
- **A2C:** Chapter 4's reference `actor_critic.py` and `a2c.py`. It runs PyTorch and 8 Gymnasium CartPoles, and starts at `train_a2c()`.

The files in `src/labs/a-arcade-python/programs/q/` and `programs/a2c/` are copies of the Q-Arcade answers and lessons, unchanged. The program dropdown also offers short runs of both (20 games; 2,000 steps), and nine concept programs in `programs/concepts/`, each a single file showing one idea, in learning order:

| # | Program | The idea | Picture |
|---|---|---|---|
| 1 | `mdp_corridor.py` | An MDP's five parts as plain Python; a policy as a table; returns | the corridor |
| 2 | `value_iteration.py` | The Bellman equation solves the corridor without playing | values spreading back from the goal |
| 3 | `q_corridor.py` | Q-learning learns the same values by playing | a 5 × 2 table filling in |
| 4 | `bandit.py` | Explore or exploit; running averages | bars per slot machine |
| 5 | `one_neuron.py` | Gradient descent on squared error | the line closing in on the points |
| 6 | `log_derivative.py` | Where the policy gradient comes from: ∇J = E[R ∇log π], exact versus sampled | bars: exact, 10 plays, 400 plays |
| 7 | `policy_gradient.py` | Softmax, a baseline, and a policy-gradient step | probabilities and scores |
| 8 | `reinforce.py` | REINFORCE on CartPole, one update per game (measured: average length 34 → 495 over 300 games) | the network and the learning curve |
| 9 | `actor_critic_onestep.py` | One-step actor-critic, the TD error as the advantage, one update per step (measured: 19 → 190) | actor and critic networks |

Every program's overview has a "one family" table placing them all, and the Chapter 4 A2C, by the number that multiplies ∇log π and by when they update. The lab shows the Q-table as heat maps (angle slot × spin slot, one per push) and the network's weights, their change since the start, and their gradients, filling in as you step. In the browser it points to A-Arcade Guided instead.

## How it runs

- **The environment:** `desktop/app/runtimes/aarcade-python.cjs` creates a virtual environment at `<appData>/UpSkillOS/aarcade-python/venv` (the lab's Set up button). It installs NumPy, `gymnasium[classic-control]` and the CPU build of PyTorch. It is separate from the notebooks' TensorFlow environment, and its location doesn't depend on `userData`, which is `Electron` when the app runs from source.
- **One long-lived process:** that runtime starts `desktop/app/runtimes/aarcade_stepper.py`. The program runs in a worker thread under `sys.settrace`, paused before each line of the program's own files; library code runs untraced at full speed. While paused, the program really is suspended: stepping is live, not a replay.
- **Commands:** `load`, `step` (`into`, `over`, `out`, `action`, `line` or `lines`), `set` (a knob such as `agent.epsilon`) and `stop`, sent as JSON lines. Each reply carries the stack with every variable, the watched Q-table or network, what the last function returned, and printed output.
- **One thread:** `OMP_NUM_THREADS=1` and `torch.set_num_threads(1)`, so a long run can't freeze the PC.
- **Step back** replays the lab's record of earlier pauses. It doesn't rewind Python.

## Explanations

- `explain/q.js` and `explain/a2c.js`: what each file is for; each function's purpose, inputs and return value; and, for every line, what it does, its maths, its phase in the loop and, where it does arithmetic, the same arithmetic with the paused step's numbers.
- `explain/python.js`: the Python, NumPy, PyTorch and Gymnasium names used.
- `pieces.js`: the maths breakdown, shared with A-Arcade Breakdown and Guided.

## Checks

| Command | What it checks |
|---|---|
| `npx vitest run src/labs/a-arcade-python` | Every statement has a note and every note matches its line; the stepper on the real programs (into, over, out, next action, run to line, knobs, errors, gradients); every "this line will work out" against what Python then produced; the page driving the real stepper; the browser message. The tests that need Python skip when the venv doesn't exist. |
| `VITE_PORT=5189 node src/labs/a-arcade-python/e2e/desktop.mjs` | The lab in the real Electron app, beside an app that is already open (temporary profile). Start Vite on 5189 first. |

Running the desktop check from VS Code's terminal: `ELECTRON_RUN_AS_NODE` is set there, and the script removes it, because Electron would otherwise start as plain Node. Vite answers on `localhost`, not `127.0.0.1`.
