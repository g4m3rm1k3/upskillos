---
title: 6.1 — Monte Carlo: Learning from Whole Episodes
track: Reinforcement Learning in pygame
runtime: python
run: watch_mc.py
---

Chapter 5 computed the best policy, but only by reading `P` and `R`, the world's rulebook. A real agent doesn't get the rulebook. It gets to act, and see what happens. From now on, **learning** means estimating values from experience alone.

The first method is the most direct one, and you've already used it to evaluate policies in lesson 4.3: play an episode, see what return actually followed each action, and average. Averaging returns of random experiments is called a **Monte Carlo** method, after the casino. Here it's applied to Q-values, so the agent can improve its behaviour while it learns.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_montecarlo.py** above.

```python file=tests/test_montecarlo.py provided
# Tests for learners.py (TabularAgent, MonteCarlo), training.py and watch_mc.py (lesson 6.1).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_montecarlo.py
import numpy as np
from pytest import approx

from grid import MAPS, GridWorld


def test_tabular_starts_with_an_empty_table():
    from learners import TabularAgent
    agent = TabularAgent(5, 4, np.random.default_rng(0))
    assert agent.Q.shape == (5, 4) and not agent.Q.any()
    assert agent.N.shape == (5, 4) and agent.N.dtype.kind == "i"


def test_tabular_greedy_when_epsilon_is_zero():
    from learners import TabularAgent
    agent = TabularAgent(3, 4, np.random.default_rng(0), epsilon=0.0)
    agent.Q[1] = [0.0, 0.5, 0.2, 0.1]
    assert {agent.act(1) for _ in range(100)} == {1}
    assert type(agent.act(1)) is int


def test_tabular_explores_when_epsilon_is_one():
    from learners import TabularAgent
    agent = TabularAgent(3, 4, np.random.default_rng(0), epsilon=1.0)
    agent.Q[1] = [0.0, 0.5, 0.2, 0.1]
    counts = np.bincount([agent.act(1) for _ in range(4000)], minlength=4)
    assert counts.min() > 850


def test_tabular_nudge_averages_or_steps():
    from learners import TabularAgent
    agent = TabularAgent(2, 2, np.random.default_rng(0))
    for target in (4.0, 0.0, 2.0):
        agent.nudge(0, 1, target)
    assert agent.Q[0, 1] == approx(2.0) and agent.N[0, 1] == 3, "step 1/N: the mean of 4, 0 and 2"
    fixed = TabularAgent(2, 2, np.random.default_rng(0), step=0.5)
    fixed.nudge(0, 0, 4.0)
    assert fixed.Q[0, 0] == approx(2.0), "a constant step moves halfway"


def test_mc_learns_nothing_until_the_episode_ends():
    from learners import MonteCarlo
    agent = MonteCarlo(3, 4, np.random.default_rng(0), gamma=0.9)
    agent.learn(0, 3, 0.0, 1, False, False)
    assert not agent.Q.any(), "the return isn't known until the episode is over"


def test_mc_updates_every_step_with_its_return():
    from learners import MonteCarlo
    agent = MonteCarlo(3, 4, np.random.default_rng(0), gamma=0.9)
    agent.learn(0, 3, 0.0, 1, False, False)
    agent.learn(1, 3, 1.0, 2, True, False)
    assert agent.Q[1, 3] == approx(1.0)
    assert agent.Q[0, 3] == approx(0.9), "0 now, then 1 a step later: 0 + 0.9 * 1"
    assert agent.episode == [], "a new episode starts with an empty memory"


def test_mc_every_visit_averages_repeat_visits():
    from learners import MonteCarlo
    agent = MonteCarlo(3, 4, np.random.default_rng(0), gamma=1.0)
    agent.learn(0, 0, 0.0, 0, False, False)       # bump the edge: still in state 0
    agent.learn(0, 3, 0.0, 1, False, False)
    agent.learn(1, 3, 1.0, 2, True, False)
    assert agent.Q[0, 0] == approx(1.0) and agent.Q[0, 3] == approx(1.0)
    assert agent.N[0].sum() == 2


def test_mc_a_time_out_also_ends_the_episode():
    from learners import MonteCarlo
    agent = MonteCarlo(3, 4, np.random.default_rng(0), gamma=0.9)
    agent.learn(0, 0, -1.0, 0, False, True)
    assert agent.Q[0, 0] == approx(-1.0) and agent.episode == []


def test_train_returns_each_episodes_total_reward():
    from agents import FixedPolicy
    from training import train
    totals = train(GridWorld(["S.G"]), FixedPolicy([3, 3, 3]), 5)
    assert totals.tolist() == [1.0] * 5


def test_train_same_seed_same_learning():
    from learners import MonteCarlo
    from training import train
    runs = []
    for _ in range(2):
        env = GridWorld(MAPS["walls"], max_steps=50)
        agent = MonteCarlo(25, 4, np.random.default_rng(3))
        runs.append(train(env, agent, 30, seed=3).tolist())
    assert runs[0] == runs[1]


def test_train_greedy_value_judges_a_q_table_exactly():
    from training import greedy_value
    Q = np.zeros((4, 4))
    Q[:, 3] = 1.0
    V = greedy_value(GridWorld(["S..G"]), Q, 0.9)
    assert V[0] == approx(0.81)


def test_watch_window_opens_and_closes():
    from watch_mc import make
    from workbench import Workbench
    env, agent = make(0)
    assert Workbench(env, agent).run(max_frames=3) == 3
```

`test_mc_updates_every_step_with_its_return` is a two-step episode worked out by hand: right from state 0 (reward 0), then right from state 1 into the goal (reward 1). Afterwards, each `(state, action)` pair should hold the return that followed it.

```check
file tests/test_montecarlo.py -- Click "Create provided tests/test_montecarlo.py" above.
```

## A table-keeping agent

Every learner in this chapter and the next keeps a Q-table, chooses actions ε-greedily from it, and moves entries towards targets. Only the **target** differs from method to method. So that part goes in a base class. Create `learners.py`:

```python file=learners.py
import numpy as np

from averages import update
from chance import bernoulli
from qtable import greedy_action


class TabularAgent:
    def __init__(self, n_states, n_actions, rng, epsilon=0.1, gamma=0.9, step=None):
        self.Q = np.zeros((n_states, n_actions))
        self.N = np.zeros((n_states, n_actions), dtype=int)
        self.rng = rng
        self.epsilon = epsilon
        self.gamma = gamma
        self.step = step

    def act(self, state):
        if bernoulli(self.epsilon, self.rng):
            return int(self.rng.integers(self.Q.shape[1]))
        return greedy_action(self.Q[state], self.rng)

    def nudge(self, state, action, target):
        self.N[state, action] += 1
        step = self.step if self.step is not None else 1 / self.N[state, action]
        self.Q[state, action] = update(self.Q[state, action], target, step)
```

- **`Q`** has one row per state and one column per action, as in lesson 1.1, and **`N`** counts each pair's updates.
- **`act`** is lesson 3.2's ε-greedy, applied to one row of the table: with probability ε a random action, otherwise the best one, with ties broken at random (lesson 1.2). Exploring matters even more here than with bandits: an action never tried from a state is never learned about.
- **`nudge(state, action, target)`** is lesson 2.3's update rule, aimed at one cell of the table: step 1/N for an exact running mean, or a constant step if one was given. Every learning method from here on is a different choice of `target` passed to this one function.

There's no `learn` method here. Each subclass supplies its own, and `TabularAgent` on its own isn't a complete agent, a **base class** meant only to be built on.

```check
run ".venv/Scripts/python -m pytest -q tests/test_montecarlo.py -k tabular" label="TabularAgent keeps a Q-table, acts epsilon-greedily and nudges" -- act: epsilon-greedy on self.Q[state]; nudge: count the update in N, then move Q[state, action] towards the target by 1/N or by self.step.
```

## Monte Carlo: average what actually happened

```python file=learners.py
import numpy as np

from averages import update
from chance import bernoulli
from qtable import greedy_action


class TabularAgent:
    def __init__(self, n_states, n_actions, rng, epsilon=0.1, gamma=0.9, step=None):
        self.Q = np.zeros((n_states, n_actions))
        self.N = np.zeros((n_states, n_actions), dtype=int)
        self.rng = rng
        self.epsilon = epsilon
        self.gamma = gamma
        self.step = step

    def act(self, state):
        if bernoulli(self.epsilon, self.rng):
            return int(self.rng.integers(self.Q.shape[1]))
        return greedy_action(self.Q[state], self.rng)

    def nudge(self, state, action, target):
        self.N[state, action] += 1
        step = self.step if self.step is not None else 1 / self.N[state, action]
        self.Q[state, action] = update(self.Q[state, action], target, step)


class MonteCarlo(TabularAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.episode = []

    def learn(self, state, action, reward, next_state, terminated, truncated):
        self.episode.append((state, action, reward))
        if terminated or truncated:
            G = 0.0
            for s, a, r in reversed(self.episode):
                G = r + self.gamma * G
                self.nudge(s, a, G)
            self.episode = []
```

How `MonteCarlo.learn` works:

1. **During the episode, it only remembers.** Each step's `(state, action, reward)` is appended to `self.episode`. It can't learn yet: the return that follows an action depends on everything after it, which hasn't happened.
2. **When the episode ends**, either way, it walks the episode **backwards**, building each step's return with lesson 4.3's rule, `G = r + γ·G`, and nudges that step's Q towards it. The last step's return is just its reward. The step before gets its reward plus γ times that, and so on back to the start.
3. It clears the memory for the next episode.

`*args, **kwargs` in `__init__` passes whatever arguments it was given straight on to `TabularAgent.__init__`. `*args` collects the positional ones and `**kwargs` the named ones, so `MonteCarlo` accepts exactly what its parent does without repeating the list.

A pair visited twice in one episode gets nudged twice, once with each return that followed it. That's **every-visit** Monte Carlo. **First-visit** Monte Carlo uses only the first visit's return. Both converge, and the textbooks discuss both.

**Why this is learning, and more than evaluating.** The agent acts ε-greedily on its *current* Q, and Q improves after every episode. So the policy it follows improves too, which produces better episodes and better estimates. That's lesson 5.2's evaluate-and-improve loop, generalized policy iteration, with evaluation done by averaging real returns instead of sweeping tables.

```predict
question: An episode: right from state 0 (reward 0), then right from state 1 into the goal (reward 1). With γ = 0.9, what does Monte Carlo set Q[0, right] to, starting from an empty table?
answer: 0.9
tolerance: 0.001
explain: Walking backwards: the last step's return is 1, so Q[1, right] = 1. The first step's return is 0 + 0.9 × 1 = 0.9, and since it's that pair's first update (step 1/1), Q[0, right] = 0.9 exactly.
verify: .venv/Scripts/python -c "import numpy as np; from learners import MonteCarlo; a = MonteCarlo(3, 4, np.random.default_rng(0), gamma=0.9); a.learn(0, 3, 0.0, 1, False, False); a.learn(1, 3, 1.0, 2, True, False); print(round(a.Q[0, 3], 3))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_montecarlo.py -k mc" label="MonteCarlo learns each step's return when the episode ends" -- Remember (state, action, reward) every step. When the episode ends, walk it backwards with G = reward + gamma * G, nudging each pair towards its G, then clear the memory.
```

## Training, and judging what was learned

```python file=training.py
import numpy as np

from mdp import tables
from planning import evaluate_policy, greedy_policy


def train(env, agent, episodes, seed=0):
    env.reset(seed=seed)
    totals = np.zeros(episodes)
    for episode in range(episodes):
        state, _ = env.reset()
        while True:
            action = agent.act(state)
            next_state, reward, terminated, truncated, _ = env.step(action)
            agent.learn(state, action, reward, next_state, terminated, truncated)
            totals[episode] += reward
            state = next_state
            if terminated or truncated:
                break
    return totals


def greedy_value(env, Q, gamma):
    P, R, terminal = tables(env)
    V, _ = evaluate_policy(P, R, terminal, greedy_policy(Q), gamma)
    return V
```

- **`train`** is lesson 4.3's `run_episode` loop repeated, without the drawing. It records each episode's total reward, so you can see learning happen as a rising curve. It seeds the environment once.
- **`greedy_value`** judges the **finished** Q-table. It takes the greedy policy the table recommends and evaluates it **exactly**, with lesson 5.1's sweeps on the true tables. A learner never gets to see those tables. We can, as the experimenter, and it's the fairest test there is: no noise, and directly comparable with the optimal values from lesson 5.2. "How good is what it learned?" gets a precise answer.

```check
run ".venv/Scripts/python -m pytest -q tests/test_montecarlo.py -k train" label="train runs episodes and greedy_value judges a Q-table" -- greedy_value: build the tables, turn Q into greedy_policy(Q), and evaluate that policy.
```

## Watch it learn

```python file=watch_mc.py
import sys

import numpy as np

from grid import MAPS, GridWorld
from learners import MonteCarlo
from mdp import tables
from planning import value_iteration
from training import greedy_value, train
from workbench import Workbench

GAMMA = 0.9


def make(seed, slip=0.0):
    env = GridWorld(MAPS["walls"], slip=slip, max_steps=100)
    agent = MonteCarlo(env.n_states, env.n_actions, np.random.default_rng(seed), epsilon=0.1, gamma=GAMMA)
    return env, agent


def report(seeds=10, episodes=2000, slip=0.0):
    env, _ = make(0, slip)
    best, _ = value_iteration(*tables(env), GAMMA)
    print(f"best possible value of S: {best[0]:.3f}")
    for seed in range(seeds):
        env, agent = make(seed, slip)
        train(env, agent, episodes, seed=seed)
        print(f"seed {seed}: the learned greedy policy is worth {greedy_value(env, agent.Q, GAMMA)[0]:.3f}")


if __name__ == "__main__":
    if "report" in sys.argv:
        report()
    else:
        env, agent = make(0)
        Workbench(env, agent).run("Monte Carlo learning on walls")
```

The workbench from lesson 4.2 already draws arrows for any agent with a `Q` attribute, so watching Monte Carlo learn needs no new drawing code. That was the point of agreeing on the agent interface early. `make` builds a fresh environment and learner for a seed. `report` trains 10 learners, one per seed, and judges each with `greedy_value` against the best possible value from value iteration.

Run it, and turn the speed up to 240 steps a second. Early on there are no arrows, because every action ties at 0. Watch them appear near the goal and the hole first, then spread back towards the start, since those are the pairs whose returns are seen first.

Then, in the terminal:

```text
.venv\Scripts\python watch_mc.py report
```

```predict
question: Each of 10 seeds trains a Monte Carlo learner for 2000 episodes on `walls` (no slip, ε = 0.1). How many end with a greedy policy that reaches the optimal value, 0.478?
choice: All 10
choice: About 8 of 10
choice: About 2 of 10
answer: About 8 of 10
explain: 8 of 10 learn a shortest route exactly. The other 2 learn a greedy policy worth 0: it never reaches the goal. In those runs the agent fell into the hole (−1) early and often, but found the goal only rarely, 8 steps away through a maze, with random moves only 10% of the time. So, from its experience, wandering forever (return 0) beats anything that risks the hole. It's the greedy trap from lesson 3.1, now in a maze, and it survives even 6000 episodes. **Monte Carlo can only value what it has actually experienced.**
verify: script mc_seeds.py
```

### What Monte Carlo can and can't do

- **It needs no model.** Only experience, and its estimates are averages of real returns, so they're **unbiased**: on average they're right.
- **It waits for the end.** Nothing is learned until an episode finishes. A task that never ends, or a very long one, gives it nothing to work with.
- **Its targets are noisy.** A whole episode's return adds up the randomness of every step in it, so averaging needs many episodes (lesson 2.2: noise shrinks only as 1/√n).
- **Time-outs.** A truncated episode's return stops at the time limit, as if nothing could happen afterwards. That's lesson 4.1's warning about treating a time-out as an ending. Here it does little harm: after 100 steps, γ¹⁰⁰ ≈ 0.00003. In tasks with short time limits, it matters.

Lesson 6.2 removes the waiting and most of the noise, with an idea that sounds like cheating and isn't: update an estimate from **another estimate**.

```check
run ".venv/Scripts/python -m pytest -q tests/test_montecarlo.py" label="all lesson 6.1 tests pass" -- make(seed) must return a GridWorld on the walls map and a MonteCarlo learner seeded with seed.
```
