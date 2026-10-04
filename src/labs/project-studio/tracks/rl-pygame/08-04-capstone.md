---
title: 8.4 — Capstone: From a Blank File
track: Reinforcement Learning in pygame
runtime: python
run: capstone.py
console: true
reference: optional
---

Every lesson so far handed you a test file and a plan. This one doesn't. You'll design a reinforcement learning problem of your own, build it as a Gymnasium environment, test it, train an agent on it, judge the result honestly, and write it up. The checks only confirm that the pieces exist and work. What the problem is, how you test it and what you conclude are yours.

A reference solution, a delivery robot, sits under *Full reference file (optional)* in each step. Use it if you're stuck, or to compare afterwards. Copying it gets the checks to pass, and teaches you nothing that the earlier lessons didn't.

## The brief

Build a **small task with a twist that needs a good state design**. Some ideas, each a few lines of rules on a grid:

- **Delivery** (the reference): pick up a parcel at P, bring it to D.
- **Key and door**: collect a key before the locked door will open.
- **Charging**: a battery runs down with each step and must be recharged at a charger before it reaches zero.
- **Patrol**: visit two checkpoints, in either order, then return to base.

Each has the same trap: the **cell alone isn't enough**. Lesson 4.5's Markov property says the state must contain everything the future depends on: whether you carry the parcel, hold the key, how much charge is left, which checkpoints you've visited.

```predict
question: In the reference delivery task, suppose the state were only the cell (25 states), forgetting whether the parcel is carried. What would Q-learning learn?
choice: The same route, just a little more slowly
choice: It never delivers the parcel
choice: Half the route, then it gets lost
answer: It never delivers the parcel
explain: In all 5 seeds, the greedy policy never delivered the parcel: each episode ran out of time at −2.0. The same cell needs one action on the way to the parcel and the opposite action on the way back, and with one row of Q-values per cell, those two needs simply overwrite each other. With the carrying flag in the state, 50 states, every seed learned the optimal route. **The state is a design decision, and it decides what can be learned at all.**
verify: script capstone_markov.py
```

**What's required** (each step checks one):

1. `capstone_env.py`: a class `CapstoneEnv(gymnasium.Env)` that passes `check_env`, registered as `"Capstone-v0"` with a time limit (lesson 8.1).
2. `tests/test_capstone.py`: at least six of your own tests, including at least one for the twist (lesson 4.4). For extra confidence, write a mutant or two of your environment and make sure your tests catch them.
3. `capstone.py`: trains a learner from Chapter 7 with **at least 5 seeds**, judges each greedy policy on separate episodes, measures a random baseline, and prints the line `beats the random baseline` if the mean minus two standard errors is above the baseline (lesson 7.2).
4. `REPORT.md`: sections `### Environment`, `### Method`, `### Results` and `### Limitations`, answering lesson 7.2's checklist.

## Your environment

**Write `capstone_env.py`.** Reuse what you've built: `GridWorld` for the map and `next_cell` for movement, `spaces.Discrete`, `super().reset(seed=seed)`, and `gym.register` with `max_episode_steps`.

How to put two facts into one state number: if the cell is one of 25 and "carrying" is 0 or 1, then `cell + 25 * carrying` gives every combination its own number from 0 to 49. It's lesson 1.1's `row * cols + col` again, and `np.ravel_multi_index` from lesson 8.3 does the same for any number of facts.

```python file=capstone_env.py
import gymnasium as gym
from gymnasium import spaces

from grid import GridWorld

LAYOUT = ["S...P",
          ".##..",
          "...#.",
          ".#...",
          "D...."]


class CapstoneEnv(gym.Env):
    """Fetch the parcel at P and bring it to the depot at D. Every step costs a little.

    The state is the cell plus whether the parcel is being carried, so the same cell can be
    two different states: the future from (cell, empty-handed) and (cell, carrying) differ.
    """

    metadata = {"render_modes": []}

    def __init__(self, step_cost=0.01):
        self.grid = GridWorld(LAYOUT, max_steps=10**9)
        self.parcel = self.grid.find("P")
        self.depot = self.grid.find("D")
        self.step_cost = step_cost
        self.observation_space = spaces.Discrete(self.grid.n_states * 2)
        self.action_space = spaces.Discrete(4)
        self.carrying = False

    def state(self):
        return self.grid.state_of(self.grid.cell) + self.grid.n_states * int(self.carrying)

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.grid.reset()
        self.carrying = False
        return self.state(), {}

    def step(self, action):
        self.grid.cell = self.grid.next_cell(self.grid.cell, int(action))
        if self.grid.cell == self.parcel:
            self.carrying = True
        delivered = self.carrying and self.grid.cell == self.depot
        reward = 1.0 if delivered else -self.step_cost
        return self.state(), reward, delivered, False, {"carrying": self.carrying}


gym.register(id="Capstone-v0", entry_point=CapstoneEnv, max_episode_steps=200)
```

The reference keeps `GridWorld`'s map and movement, but writes its own `step`. Pickup happens when the robot enters P, and delivery ends the episode only if the parcel is carried. The depot without the parcel is ordinary floor. `info["carrying"]` reports the flag for people, as `info["slid"]` did in lesson 4.1.

```check
run ".venv/Scripts/python -c \"import warnings; warnings.simplefilter('ignore'); from gymnasium.utils.env_checker import check_env; from capstone_env import CapstoneEnv; check_env(CapstoneEnv())\"" label="CapstoneEnv passes Gymnasium's environment checker" -- check_env's error message names the rule that failed; lesson 8.1 shows each one.
run ".venv/Scripts/python -c \"import gymnasium as gym, capstone_env; e = gym.make('Capstone-v0'); e.reset(seed=0); e.step(0)\"" label="Capstone-v0 is registered and runs" -- gym.register(id="Capstone-v0", entry_point=CapstoneEnv, max_episode_steps=...) at the bottom of capstone_env.py.
```

## Your tests

**Write `tests/test_capstone.py`**, with at least six tests. Test the contract of *your* task, as in lesson 4.4: the twist (pickup, the key, the battery), the endings and what isn't an ending, walls, `reset`, the time limit, and `check_env` itself.

```python file=tests/test_capstone.py
import warnings

import gymnasium as gym
from gymnasium.utils.env_checker import check_env

import capstone_env  # noqa: F401
from capstone_env import CapstoneEnv


def make():
    env = CapstoneEnv()
    env.reset(seed=0)
    return env


def test_passes_gymnasiums_checker():
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        check_env(CapstoneEnv())


def test_state_counts_cells_twice():
    assert CapstoneEnv().observation_space.n == 50


def test_reaching_the_parcel_picks_it_up():
    env = make()
    env.grid.cell = (0, 3)
    state, reward, terminated, _, info = env.step(3)
    assert info["carrying"] and state == env.grid.state_of((0, 4)) + 25
    assert reward == -0.01 and not terminated


def test_the_depot_without_the_parcel_is_just_floor():
    env = make()
    env.grid.cell = (3, 0)
    _, reward, terminated, _, _ = env.step(1)
    assert env.grid.cell == (4, 0) and not terminated and reward == -0.01


def test_delivering_ends_with_plus_one():
    env = make()
    env.carrying = True
    env.grid.cell = (3, 0)
    _, reward, terminated, truncated, _ = env.step(1)
    assert reward == 1.0 and terminated and not truncated


def test_walls_block_and_cost_a_step():
    env = make()
    env.grid.cell = (0, 1)
    _, reward, _, _, _ = env.step(1)          # (1, 1) is a wall
    assert env.grid.cell == (0, 1) and reward == -0.01


def test_reset_drops_the_parcel():
    env = make()
    env.carrying = True
    state, _ = env.reset()
    assert not env.carrying and state == 0


def test_registered_with_a_time_limit():
    env = gym.make("Capstone-v0")
    env.reset(seed=0)
    steps = 0
    while True:
        _, _, terminated, truncated, _ = env.step(0)
        steps += 1
        if terminated or truncated:
            break
    assert steps == 200 and truncated
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_capstone.py" label="your capstone tests pass" -- A failing test on correct code is the test's fault: compare what it expects with the rules you wrote.
run ".venv/Scripts/python -c \"import importlib.util as u; s = u.spec_from_file_location('t', 'tests/test_capstone.py'); m = u.module_from_spec(s); s.loader.exec_module(m); n = sum(name.startswith('test_') for name in dir(m)); assert n >= 6, n\"" label="tests/test_capstone.py has at least six tests" -- One test per behaviour, named after what must be true.
```

## Your experiment

**Write `capstone.py`.** Use lesson 7.2's tools: `train` to learn, `greedy_returns` to judge on separate seeds, `sample_mean` and `standard_error` from lesson 2.2, and a random baseline. Choose your settings *before* you look at the results (lesson 7.3), and say in the report how you chose them.

```python file=capstone.py
import gymnasium as gym
import numpy as np

import capstone_env  # noqa: F401  (registers Capstone-v0)
from agents import RandomAgent
from evaluation import greedy_returns
from learners import QLearning
from stats import sample_mean, standard_error
from training import train

SEEDS = 5
EPISODES = 2000
JUDGE_EPISODES = 100
GAMMA = 0.95


def train_and_judge(seed):
    env = gym.make("Capstone-v0")
    agent = QLearning(env.observation_space.n, env.action_space.n, np.random.default_rng(seed),
                      epsilon=0.1, gamma=GAMMA, step=0.1)
    train(env, agent, EPISODES, seed=seed)
    return greedy_returns(gym.make("Capstone-v0"), agent.Q, JUDGE_EPISODES, 1.0, seed=10_000 + seed).mean()


def random_baseline(episodes=500):
    env = gym.make("Capstone-v0")
    return train(env, RandomAgent(env.action_space.n, np.random.default_rng(0)), episodes, seed=20_000).mean()


if __name__ == "__main__":
    scores = [train_and_judge(seed) for seed in range(SEEDS)]
    mean, error = sample_mean(scores), standard_error(scores)
    baseline = random_baseline()
    print(f"Q-learning, greedy policy: {mean:.3f} +/- {2 * error:.3f} per episode over {SEEDS} seeds")
    print(f"random policy: {baseline:.3f} per episode")
    print("beats the random baseline" if mean - 2 * error > baseline else "does not beat the random baseline")
```

The reference trains `QLearning` with 5 seeds, judges each greedy policy on 100 episodes with a separate seed, and compares the mean ± 2 standard errors with a random policy's average. Run it:

```text
Q-learning, greedy policy: 0.890 +/- 0.000 per episode over 5 seeds
random policy: -1.237 per episode
beats the random baseline
```

Every seed found the same 12-step route, which is why the spread is zero. In a world with randomness it wouldn't be.

```check
run ".venv/Scripts/python capstone.py" stdout="beats the random baseline" timeout=600 label="capstone.py shows the learner beats random by more than two standard errors" -- Print exactly "beats the random baseline" when mean - 2 * standard_error > baseline. If it doesn't, the report should say why.
```

## Your report

**Write `REPORT.md`**: what you built, how you trained and judged it, what happened, and what it doesn't show. Use lesson 7.2's checklist: what was measured, how many seeds, compared with what, which settings, and how they were chosen. The **Limitations** section is the most important one. A result is only as useful as its stated limits.

```markdown file=REPORT.md
# Capstone report: a delivery robot

### Environment

A 5 × 5 grid with walls. The agent starts at S (top left), must reach the parcel at P (top right), then bring it to the depot at D (bottom left). Reaching the depot while carrying the parcel ends the episode with +1. Every other step costs 0.01. Episodes are cut off after 200 steps (Gymnasium's `TimeLimit`), which is a truncation, not an ending.

The state is the cell **and** whether the parcel is carried: 25 × 2 = 50 states. The cell alone isn't enough. A Q-learner given only the cell never delivered the parcel, in any of 5 seeds, because the same cell needs opposite actions before and after the pickup.

`check_env` passes, and 8 tests in `tests/test_capstone.py` cover pickup, delivery, the depot without the parcel, walls, reset and the time limit.

### Method

Tabular Q-learning (`learners.QLearning`): ε = 0.1, γ = 0.95, constant step 0.1, 2000 training episodes per seed, 5 seeds. Each trained greedy policy was judged on 100 separate episodes, seeded 10,000 + seed, with no exploration and no learning. The score is the undiscounted reward per episode. Random baseline: a uniformly random policy over 500 episodes.

The settings were chosen once, from what worked on the grid world in Chapter 7, and not tuned on these seeds.

### Results

| policy | reward per episode |
|---|---|
| Q-learning, greedy (5 seeds) | 0.890 ± 0.000 |
| random | −1.237 |

All 5 seeds learned the same 12-step route (4 steps to the parcel, 8 to the depot), so every judged episode scored 1 − 11 × 0.01 = 0.89. The world has no randomness, so the spread is 0. That is the optimum: no route from S to P to D is shorter than 12 steps.

### Limitations

- The world is deterministic and tiny. Results on a slippery floor, or a larger map, would need more episodes, and probably different settings.
- The parcel and depot never move. An agent that had to deliver to changing depots would need the depot in its state, and the state space would grow with every new kind of information.
- 5 seeds is enough here only because every seed reached the same optimum. With any spread, more seeds would be needed to make the standard error meaningful.
```

```check
contains REPORT.md "### Environment"
contains REPORT.md "### Method"
contains REPORT.md "### Results"
contains REPORT.md "### Limitations"
```

## What you can do now

You started this series knowing basic Python. You can now:

- **Set up and check** a reproducible Python project: virtual environments, pinned packages, a machine report, tests, mutation testing.
- **Build interactive programs** in pygame: game loops, events, timers, fixed simulation rates, drawing, charts, heatmaps, mouse and keyboard input.
- **Reason about randomness**: probability by simulation, expected values, variance, standard errors, fair comparisons with common random numbers.
- **Define reinforcement learning problems**: states, actions, rewards, returns, discounting, endings versus time-outs, Markov states, transition tables, and reward design that means what you intend.
- **Plan** with policy evaluation and value iteration, and **learn** with Monte Carlo, TD, SARSA, Expected SARSA, Q-learning and Double Q-learning, knowing why each exists and where each fails.
- **Judge** agents honestly, against baselines and optima, across seeds, with exploration switched off.
- **Use Gymnasium**: write environments for it, wrap them, register them, and run your agents on other people's worlds.

Where to go next:

- **Deep Q-learning**: the Notebook Lab's *Machine Learning* series, lessons 46–50 for neural networks and 71 for Deep Q-learning, then the DQN paper (Mnih et al., 2015). Your GPU from lesson 0.2 is ready for it.
- **Policy gradients**: methods that learn the policy directly, not through Q-values (the Notebook Lab's lesson 72; Sutton & Barto, chapter 13).
- **Sutton & Barto**, *Reinforcement Learning: An Introduction*, free online. Chapters 2–6 should now read as revision, and 7–13 as the next steps.
- **Stable-Baselines3**: tested implementations of modern algorithms, which run on any Gymnasium environment, including `Capstone-v0`.
