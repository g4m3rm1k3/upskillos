---
title: 8.3 — CartPole: Where the Table Breaks
track: Reinforcement Learning in pygame
runtime: python
run: balance.py
console: true
---

**CartPole** is the classic first control problem: a pole balanced on a cart, and two actions, push the cart left or right. Every step the pole stays up scores +1. The episode ends when the pole tips past about 12° or the cart leaves the track, or after 500 steps, the time limit. A random agent keeps it up for about 22 steps. Keeping it up for 475 steps on average counts as "solved".

CartPole's state isn't a cell number. It's **four real numbers**: the cart's position and velocity, and the pole's angle and angular velocity. There are infinitely many states, and a Q-table needs a row per state. This lesson does the obvious thing, cutting each number into ranges called **bins** so the state becomes a cell number again, and finds out how far a table can go. It gets surprisingly far, and fails in an instructive way. That failure is the reason deep reinforcement learning exists.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_cartpole.py** above.

```python file=tests/test_cartpole.py provided
# Tests for cartpole.py and balance.py (lesson 8.3). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_cartpole.py
import numpy as np


def test_discretizer_counts_every_combination_of_bins():
    from cartpole import Discretizer
    assert Discretizer((1, 1, 6, 12)).n_states == 72
    assert Discretizer((3, 3, 6, 12)).n_states == 648


def test_discretizer_lowest_and_highest_corners():
    from cartpole import HIGH, LOW, Discretizer
    d = Discretizer((2, 3, 4, 5))
    assert d(LOW) == 0
    assert d(HIGH) == d.n_states - 1, "the top edge belongs to the last bin, not one past it"


def test_discretizer_bins_combine_like_rows_and_columns():
    from cartpole import Discretizer
    d = Discretizer((1, 1, 2, 3), low=np.zeros(4), high=np.ones(4))
    assert d(np.array([0.5, 0.5, 0.2, 0.9])) == 0 * 3 + 2, "angle bin 0, speed bin 2"
    assert d(np.array([0.5, 0.5, 0.7, 0.1])) == 1 * 3 + 0, "angle bin 1, speed bin 0"


def test_discretizer_clips_values_outside_the_range():
    from cartpole import Discretizer
    d = Discretizer((1, 1, 6, 12))
    assert d(np.array([0.0, 99.0, 0.0, -99.0])) == d(np.array([0.0, 3.0, 0.0, -3.5]))


def test_wrapper_turns_observations_into_state_numbers():
    from cartpole import make_cartpole
    env = make_cartpole((1, 1, 6, 12))
    assert env.observation_space.n == 72 and env.action_space.n == 2
    state, _ = env.reset(seed=0)
    assert type(state) is int and 0 <= state < 72
    state, reward, terminated, truncated, _ = env.step(0)
    assert type(state) is int and reward == 1.0


def test_wrapper_keeps_cartpoles_endings():
    from cartpole import make_cartpole
    env = make_cartpole((1, 1, 6, 12))
    env.reset(seed=0)
    steps = 0
    while True:
        _, _, terminated, truncated, _ = env.step(0)    # always push left: the pole soon falls
        steps += 1
        if terminated or truncated:
            break
    assert terminated and steps < 50


def test_balance_learning_beats_random():
    from balance import train_balancer
    _, lengths = train_balancer(seed=2, episodes=300)
    assert lengths.shape == (300,)
    assert lengths[-50:].mean() > 40, "a random policy averages about 22 steps"


def test_balance_judge_and_watch_run():
    from balance import judge, train_balancer, watch
    agent, _ = train_balancer(seed=0, episodes=30)
    lengths = judge(agent, episodes=5)
    assert lengths.shape == (5,) and (lengths >= 1).all()
    watch(agent, episodes=1)
```

`test_discretizer_lowest_and_highest_corners` guards an off-by-one error that's easy to make: a value exactly at the top of the range must land in the **last** bin, not in an imaginary bin one past it.

```check
file tests/test_cartpole.py -- Click "Create provided tests/test_cartpole.py" above.
```

## From four numbers to one cell

Print CartPole's observation space and you get:

```text
Box([-4.8 -inf -0.419 -inf], [4.8 inf 0.419 inf], (4,), float32)
```

A **Box** space is Gymnasium's description of real-valued observations: an array of a given shape, `(4,)`, with lower and upper limits for each number. Some limits are infinite: nothing stops the cart going very fast. Create `cartpole.py`:

```python file=cartpole.py
import numpy as np

# CartPole's four numbers: cart position, cart velocity, pole angle, pole angular velocity.
LOW = np.array([-2.4, -3.0, -0.21, -3.5])
HIGH = -LOW


class Discretizer:
    def __init__(self, bins, low=LOW, high=HIGH):
        self.bins = np.array(bins)
        self.low = low
        self.high = high
        self.n_states = int(np.prod(self.bins))

    def __call__(self, observation):
        fraction = (np.clip(observation, self.low, self.high) - self.low) / (self.high - self.low)
        index = np.minimum((fraction * self.bins).astype(int), self.bins - 1)
        return int(np.ravel_multi_index(index, self.bins))
```

How `Discretizer` turns four numbers into one state number:

1. **Clip** each number into a chosen range, `LOW` to `HIGH` (`np.clip`, lesson 1.2), because the true ranges include infinity. The ranges are practical: the pole falls past 0.21 radians, about 12°, so angles beyond that never matter.
2. **Scale** each into a fraction from 0 to 1 of its range.
3. **Bin**: multiply by the number of bins and round down. With 6 angle bins, a fraction of 0.55 gives bin `int(0.55 × 6)` = 3. A fraction of exactly 1.0 would give bin 6, one past the end, so `np.minimum(…, bins − 1)` puts it in the last bin.
4. **Combine** the four bin numbers into one with `np.ravel_multi_index`. It's lesson 1.1's `row * cols + col`, extended to four dimensions: with bins `(1, 1, 6, 12)`, the state is `angle_bin × 12 + speed_bin`. The **number of states** is the product of the bins: 1 × 1 × 6 × 12 = 72.

`BINS = (1, 1, 6, 12)` puts the cart's position and velocity in a single bin each, ignoring them, and spends its resolution on the pole. A pole that's balanced doesn't care where the cart is, at least until the cart hits the end of the track.

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole.py -k discretizer" label="Discretizer turns four numbers into one state number" -- Clip into LOW..HIGH, scale to 0..1, multiply by bins and round down, cap at bins - 1, then np.ravel_multi_index.
```

## A wrapper that hands out cells

```python file=cartpole.py
import gymnasium as gym
import numpy as np
from gymnasium import spaces

# CartPole's four numbers: cart position, cart velocity, pole angle, pole angular velocity.
LOW = np.array([-2.4, -3.0, -0.21, -3.5])
HIGH = -LOW


class Discretizer:
    def __init__(self, bins, low=LOW, high=HIGH):
        self.bins = np.array(bins)
        self.low = low
        self.high = high
        self.n_states = int(np.prod(self.bins))

    def __call__(self, observation):
        fraction = (np.clip(observation, self.low, self.high) - self.low) / (self.high - self.low)
        index = np.minimum((fraction * self.bins).astype(int), self.bins - 1)
        return int(np.ravel_multi_index(index, self.bins))


class DiscreteObservations(gym.ObservationWrapper):
    def __init__(self, env, discretizer):
        super().__init__(env)
        self.discretizer = discretizer
        self.observation_space = spaces.Discrete(discretizer.n_states)

    def observation(self, observation):
        return self.discretizer(observation)


def make_cartpole(bins, render_mode=None):
    return DiscreteObservations(gym.make("CartPole-v1", render_mode=render_mode), Discretizer(bins))
```

`gym.ObservationWrapper` is Gymnasium's built-in version of lesson 7.5's `Shaped`: a wrapper whose only job is to change observations. You write one method, `observation(observation)`, and Gymnasium applies it to everything `reset` and `step` return. The wrapper also declares its new `observation_space`, `Discrete(72)`, so `QLearning` sizes its table from it exactly as before. `make_cartpole` builds `CartPole-v1` (with its 500-step `TimeLimit`) and wraps it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole.py -k wrapper" label="DiscreteObservations turns CartPole into a table-sized world" -- Inherit from gym.ObservationWrapper; set self.observation_space = spaces.Discrete(discretizer.n_states); observation() returns self.discretizer(observation).
```

## Train a balancer

```python file=balance.py
import sys

import numpy as np

from cartpole import make_cartpole
from evaluation import greedy_returns
from learners import QLearning
from training import train

BINS = (1, 1, 6, 12)      # ignore the cart; 6 pole angles x 12 pole speeds


def train_balancer(seed=1, episodes=2000, bins=BINS, report_every=None):
    env = make_cartpole(bins)
    agent = QLearning(env.observation_space.n, env.action_space.n, np.random.default_rng(seed),
                      epsilon=0.1, gamma=0.99, step=0.1)
    env.reset(seed=seed)
    lengths = []
    every = report_every or episodes
    for done in range(0, episodes, every):
        lengths.extend(train(env, agent, every, seed=None))
        if report_every:
            print(f"episodes {done + every:5}: average length of the last {every}: {np.mean(lengths[-every:]):6.1f}")
    return agent, np.array(lengths)


def judge(agent, episodes=100, seed=100, bins=BINS):
    return greedy_returns(make_cartpole(bins), agent.Q, episodes, 1.0, seed)


def watch(agent, episodes=3, bins=BINS):
    env = make_cartpole(bins, render_mode="human")
    for _ in range(episodes):
        state, _ = env.reset()
        while True:
            state, _, terminated, truncated, _ = env.step(int(agent.Q[state].argmax()))
            if terminated or truncated:
                break
    env.close()


if __name__ == "__main__":
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    agent, _ = train_balancer(seed=seed, report_every=200)
    lengths = judge(agent)
    print(f"greedy policy, 100 new episodes: average {lengths.mean():.1f} steps, shortest {lengths.min():.0f}")
    if "quiet" not in sys.argv:
        watch(agent)
```

- **`train_balancer`** is lesson 7.2's train-in-chunks pattern: `train(…, seed=None)` continues the same random stream, `every` episodes at a time, printing progress, so you can watch learning in the output pane during a 20-second run.
- **`judge`** plays the greedy policy on 100 fresh episodes. With γ = 1, each return is the number of steps the pole stayed up (lesson 8.2's trick).
- **`watch`** plays three greedy episodes in CartPole's own `"human"` window.

```predict
question: How many steps does a **random** agent keep the pole up, on average?
answer: 22
tolerance: 4
explain: About 22. That's the baseline. Anything a learner achieves is measured against it, and against 500, the time limit.
verify: script cartpole_random.py
```

Run it with seed 1 (the default).

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole.py -k balance" label="train_balancer learns to beat a random agent" -- train_balancer: a QLearning sized from the wrapped env's spaces (epsilon 0.1, gamma 0.99, step 0.1), trained in chunks with train(env, agent, every, seed=None).
```

## Where tables end

Now the experiments that matter. Each needs the terminal: `.venv\Scripts\python balance.py 0 quiet` trains seed 0 and skips the window.

```predict
question: Train two learners with identical settings, seeds 0 and 1, for 2000 episodes each, and judge each greedy policy on 100 new episodes. How do they compare?
choice: About the same: same settings, same result
choice: Very different: one keeps the pole up every time, one doesn't
answer: Very different: one keeps the pole up every time, one doesn't
explain: Seed 1's greedy policy balances for the full 500 steps in all 100 episodes. Seed 0's averages about 107, which is worse than seed 0 managed while still exploring. Same algorithm, same settings, wildly different results. The next section explains why, and lesson 7.2's rule of many seeds is not optional here.
verify: script cartpole_seeds.py
```

**Why so unstable? The table breaks the Markov property.** A bin lumps together many different real situations: "pole tilted 2° and falling fast" and "pole tilted 4° and falling fast" may share a cell, and need different actions. From inside the table, one cell has several possible futures depending on things it can't see. That's lesson 4.5's sticky ice again, and Q-learning's guarantees assume it away. The learner's estimates for such a cell average over situations it can't tell apart, and they drift as its own policy changes which situations it meets. Sometimes the result happens to work perfectly. Sometimes it doesn't.

```predict
question: Coarser bins are learned from more often. After 1000 episodes, which balances longer: 4 coarse states, bins (1, 1, 2, 2), or 72, bins (1, 1, 6, 12)?
choice: 4 states: each cell gets far more experience
choice: 72 states, by a wide margin
choice: About the same
answer: 72 states, by a wide margin
explain: With 4 states (pole left or right, falling left or right), the table can't express "a little tilted" and "very tilted", so the best it can learn is crude: about 67 steps after 2000 episodes, against about 170 for 72 states. Finer still, (3, 3, 6, 12) with 648 states, did a little better again (about 178), but each cell is visited less often, so learning is slower. This is the curse of dimensionality (lesson 5.2): with b bins for each of d numbers, there are b^d cells. Ten bins for each of CartPole's 4 numbers is 10,000. For a robot arm with 20 joint readings it's 10²⁰, more cells than any agent could ever visit.
verify: script cartpole_bins.py
```

### What comes next: from tables to functions

Every method in this series stored Q in a **table**: one independent number per state and action. CartPole shows the limit: real states are continuous or astronomically many, and a table can't **generalise**. What it learns about one cell tells it nothing about the next cell over, however similar.

The fix is to replace the table with a **function** that computes Q(s, a) from the state's numbers: a weighted sum of features (**linear function approximation**), or a **neural network**. Similar states then automatically get similar values. Everything else you've learned carries straight over:

- The target is still lesson 7.1's `r + γ max over a' of Q(s', a')`. Instead of nudging one table cell towards it, you nudge the function's **weights** in the direction that moves Q(s, a) towards the target (gradient descent: the Notebook Lab's *Machine Learning* series, lessons 18–20 and 46–50).
- Ending versus time-out, ε-greedy exploration, evaluation over seeds, and reward design all apply unchanged.
- The maximisation bias of lesson 7.4 gets *worse* with function approximation. That's why **Double DQN** exists.

That combination, Q-learning with a neural network, plus two stabilisers (a **replay buffer** that learns from stored past transitions, and a **target network** that holds the target still for a while), is **DQN** (Mnih et al., 2015), which learned to play Atari games from pixels. It's also where the GPU from lesson 0.2 finally earns its place: a neural network does millions of the same arithmetic operations at once, which is what a GPU is built for.

Further reading: Sutton & Barto, chapters 9–10 (on-policy prediction and control with approximation) and 11 (why off-policy learning with approximation can diverge, "the deadly triad"); the Notebook Lab's *Deep Q-learning* lesson; Gymnasium's tutorials; *Stable-Baselines3*, a library of tested deep RL algorithms that run on any Gymnasium environment, including yours from lesson 8.1.

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole.py" label="all lesson 8.3 tests pass" -- judge: greedy_returns on a fresh make_cartpole(bins) with gamma 1.0; watch: render_mode="human".
```
