---
title: 2.4 — The Corridor Agent on CartPole
runtime: python
run: watch_cartpole.py
---

This is the payoff of giving the corridor Gymnasium's shape in lesson 1.1. Chapter 1's `QAgent` and `run_episode` were written for five cells; in this lesson they balance a pole **without one line of them changing**. All that's needed is a thin layer in between that turns CartPole's four decimals into a row number, and a way to explore a lot at first and less later.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_cartpole_table.py** above.

```python file=tests/test_cartpole_table.py provided
# Tests for cartpole_table.py and watch_cartpole.py (lesson 2.4).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_cartpole_table.py
import gymnasium as gym
import numpy as np
from pytest import approx


def test_wrapper_turns_observations_into_cells():
    from cartpole_table import TableCartPole
    env = TableCartPole()
    state, info = env.reset(seed=0)
    assert type(state) is int and 0 <= state < env.n_states == 72


def test_wrapper_matches_the_bins():
    from bins import state_index
    from cartpole_table import TableCartPole
    env = TableCartPole()
    state, _ = env.reset(seed=0)
    obs, _ = gym.make("CartPole-v1").reset(seed=0)
    assert state == state_index(obs, env.edges, env.counts)
    assert np.array_equal(env.obs, obs), "the real observation is kept in env.obs"


def test_wrapper_passes_the_rest_through():
    from cartpole_table import TableCartPole
    env = TableCartPole()
    env.reset(seed=0)
    state, reward, terminated, truncated, info = env.step(1)
    assert type(state) is int and reward == 1.0 and terminated is False and truncated is False


def test_linear_starts_and_ends_where_asked():
    from cartpole_table import linear
    assert linear(1.0, 0.01, 0.0) == approx(1.0)
    assert linear(1.0, 0.01, 1.0) == approx(0.01)


def test_linear_is_a_straight_line_between():
    from cartpole_table import linear
    assert linear(1.0, 0.01, 0.5) == approx(0.505)
    assert linear(0.2, 0.02, 0.25) == approx(0.155)


def test_linear_stays_at_the_end_afterwards():
    from cartpole_table import linear
    assert linear(1.0, 0.01, 2.0) == approx(0.01)


def test_learns_far_beyond_random():
    from cartpole_table import train_cartpole
    agent, env, lengths = train_cartpole(300, seed=0)
    assert len(lengths) == 300
    assert np.mean(lengths[-50:]) > 60, "random lasts about 22 steps"


def test_learns_with_exploring_shrinking_to_almost_nothing():
    from cartpole_table import train_cartpole
    agent, _, _ = train_cartpole(50, seed=0)
    assert agent.epsilon == approx(0.01), "from 1.0 down to 0.01 over the first 80% of the episodes"


def test_watch_window_opens_and_closes():
    from watch_cartpole import run
    assert run(max_frames=2, episodes=5) == 2
```

`test_wrapper_matches_the_bins` makes a **second**, separate CartPole and resets it with the same seed, so it knows exactly what observation the wrapper must have seen, and checks the wrapper turned it into the row `state_index` gives.

`test_learns_far_beyond_random` is a test of learning itself: after 300 episodes, the last 50 must average more than 60 steps, nearly three times random's 21.6. Training takes about a second, so the test can afford to really train.

```check
file tests/test_cartpole_table.py -- Click "Create provided tests/test_cartpole_table.py" above.
```

## A wrapper

Create `cartpole_table.py`:

```python file=cartpole_table.py
import gymnasium as gym
import numpy as np

from bins import COUNTS, LIMITS, make_edges, state_index


class TableCartPole:
    n_actions = 2

    def __init__(self, counts=COUNTS, limits=LIMITS):
        self.env = gym.make("CartPole-v1")
        self.counts = counts
        self.edges = [make_edges(count, limit) for count, limit in zip(counts, limits)]
        self.n_states = int(np.prod(counts))
        self.obs = None

    def reset(self, seed=None):
        self.obs, info = self.env.reset(seed=seed)
        return state_index(self.obs, self.edges, self.counts), info

    def step(self, action):
        self.obs, reward, terminated, truncated, info = self.env.step(action)
        return state_index(self.obs, self.edges, self.counts), reward, terminated, truncated, info
```

`TableCartPole` looks, from outside, exactly like `Corridor`: `n_states`, `n_actions`, `reset(seed)` returning `(state, info)`, and `step(action)` returning five values with the state as a row number. Inside, it holds a real CartPole (`self.env`) and passes every call on to it, changing only the observation on the way back. An object that wraps another and changes how it looks is called a **wrapper**. Gymnasium has a class for exactly this, `gymnasium.ObservationWrapper`, and Chapter 7 uses it; writing one by hand first shows there's nothing more to it.

- **`self.edges`** is computed once, in `__init__`: a list of four edge arrays, one per number. Making them again on every step would give the same answer thousands of times.
- **`np.prod(counts)`** multiplies the counts together: 1 × 1 × 6 × 12 = 72.
- **`self.obs`** keeps the real four numbers from the latest `reset` or `step`. The agent never sees them, but the window does: it needs the real angle to draw the pole.

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole_table.py -k wrapper" label="TableCartPole looks like the corridor, with row numbers for states" -- reset and step pass through to self.env, store the observation in self.obs, and return state_index(self.obs, self.edges, self.counts) in place of it.
```

## Your turn: a schedule

**Build, on your own:** `linear(start, end, progress)` in `cartpole_table.py`.

Lesson 1.4 found that no single ε is best: exploring finds good actions, and exploiting uses them. The standard answer is to **change ε as training goes**: explore almost always at first, when the table knows nothing, then less and less. The simplest way is a straight line from a start value to an end value.

`linear(start, end, progress)` takes `progress` from 0 (the beginning) to 1 (the end) and returns the value that far along the line from `start` to `end`. Past 1, it stays at `end`. The tests give examples: from 1.0 to 0.01, halfway (0.5) is 0.505; from 0.2 to 0.02, a quarter of the way (0.25) is 0.155.

Next step uses it for ε, falling from 1.0 to 0.01 over the first 80% of training.

```hints
nudge: How far is it from `start` to `end`? And what fraction of that distance do you travel at a given `progress`?
concept: The whole distance is `end - start` (negative when the line goes down). At `progress`, you've travelled `progress` of it: `start + (end - start) * progress`. `min(progress, 1.0)` stops it going past the end.
answer: Add to `cartpole_table.py`:
~~~python
def linear(start, end, progress):
    return start + (end - start) * min(progress, 1.0)
~~~
Checking the first example: 1.0 + (0.01 − 1.0) × 0.5 = 1.0 − 0.495 = 0.505.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole_table.py -k linear" label="linear goes in a straight line from start to end, then stays at end" -- return start + (end - start) * min(progress, 1.0).
```

## Training

Add the training function and a learning curve:

```python file=cartpole_table.py
import gymnasium as gym
import numpy as np

from agent import QAgent
from bins import COUNTS, LIMITS, make_edges, state_index
from train import run_episode


class TableCartPole:
    n_actions = 2

    def __init__(self, counts=COUNTS, limits=LIMITS):
        self.env = gym.make("CartPole-v1")
        self.counts = counts
        self.edges = [make_edges(count, limit) for count, limit in zip(counts, limits)]
        self.n_states = int(np.prod(counts))
        self.obs = None

    def reset(self, seed=None):
        self.obs, info = self.env.reset(seed=seed)
        return state_index(self.obs, self.edges, self.counts), info

    def step(self, action):
        self.obs, reward, terminated, truncated, info = self.env.step(action)
        return state_index(self.obs, self.edges, self.counts), reward, terminated, truncated, info


def linear(start, end, progress):
    return start + (end - start) * min(progress, 1.0)


def train_cartpole(episodes=500, seed=0, alpha=0.1, alpha_end=None, gamma=0.99, counts=COUNTS):
    env = TableCartPole(counts)
    agent = QAgent(env.n_states, env.n_actions, alpha=alpha, gamma=gamma, epsilon=1.0, seed=seed)
    lengths = []
    for episode in range(episodes):
        agent.epsilon = linear(1.0, 0.01, episode / (0.8 * episodes))
        if alpha_end is not None:
            agent.alpha = linear(alpha, alpha_end, episode / episodes)
        lengths.append(run_episode(env, agent, seed=seed if episode == 0 else None))
    return agent, env, lengths


if __name__ == "__main__":
    agent, env, lengths = train_cartpole()
    for start in range(0, len(lengths), 50):
        block = lengths[start:start + 50]
        print(f"episodes {start + 1:3}-{start + len(block):3}: average {np.mean(block):5.1f} steps")
```

- **`QAgent(env.n_states, env.n_actions, ...)`** is Chapter 1's agent, unchanged, with a 72-row table. **`run_episode`** is lesson 1.4's loop, unchanged. Neither knows it's playing CartPole.
- **ε falls from 1.0 to 0.01** over the first 80% of the episodes (`episode / (0.8 * episodes)` reaches 1 at episode 400 of 500), then stays at 0.01 for the last 100. At the start every action is random, because the table knows nothing worth exploiting.
- **`alpha_end`** is for next lesson: if it's given, α also falls in a straight line. Left as `None`, α stays fixed (0.1 here).
- **γ = 0.99**, not 0.9. Every step pays 1, so the value of a state is roughly "how many more steps can I survive from here", discounted. With γ = 0.9, a reward 50 steps away is worth 0.9⁵⁰ = 0.005 of a reward now: the agent couldn't tell a state that survives 50 more steps from one that survives 500. With 0.99, it's 0.99⁵⁰ = 0.6, so far-off survival still counts.
- **The total reward of an episode is its length**, since every step pays 1, so `run_episode`'s return value can be used directly as the episode's length.

Run it in the terminal: `.venv\Scripts\python cartpole_table.py`. It takes about two seconds.

```predict
question: The first 50 episodes, with ε near 1, are almost random. What will they average?
answer: 24
tolerance: 4
explain: 24.0 steps, close to the random policy's 21.6 from lesson 2.2, because ε starts at 1.0 and has only fallen to about 0.88 by episode 50. The table can't help yet. What follows is learning.
verify: .venv/Scripts/python -c "import numpy as np; from cartpole_table import train_cartpole; print(np.mean(train_cartpole()[2][:50]))"
```

```text
episodes   1- 50: average  24.0 steps
episodes  51-100: average  26.5 steps
episodes 101-150: average  39.7 steps
episodes 151-200: average  51.7 steps
episodes 201-250: average  68.1 steps
episodes 251-300: average  85.2 steps
episodes 301-350: average 233.6 steps
episodes 351-400: average 136.0 steps
episodes 401-450: average 403.2 steps
episodes 451-500: average 468.9 steps
```

From 24 steps to 469. Remember what the agent was given: a row number from 0 to 71 and a 1 for every step survived. It was never told which number is the angle, or that pushing right tips the pole left. Part of the improvement is ε falling, of course: less random pushing helps on its own. But ε at 0.01 with an empty table would still only reach random-like lengths. The table had to fill with values worth exploiting.

Look at episodes 301–350 against 351–400: 233.6, then **136.0**, then 403.2. Learning isn't steady. One explanation is the slots: each row stands for many different states (lesson 2.3), and an action that's right for most of them can be wrong for some, so a run of unlucky episodes can pull a value the wrong way for a while. Next lesson asks the honest question that a single run like this can't answer: was this agent good, or lucky?

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole_table.py -k learns" label="train_cartpole learns to balance far longer than random" -- Make a QAgent with epsilon=1.0, then each episode set agent.epsilon = linear(1.0, 0.01, episode / (0.8 * episodes)) and run one episode.
```

## Watch it balance

Create `watch_cartpole.py`. It trains an agent (with next lesson's better α schedule, so you see one of the good ones), then lets it play in the window from lesson 2.1:

```python file=watch_cartpole.py
import pygame

from cartpole_table import train_cartpole
from cartpole_view import HEIGHT, WIDTH, draw


def run(max_frames=None, episodes=500):
    agent, env, _ = train_cartpole(episodes, alpha=0.2, alpha_end=0.02)
    agent.epsilon = 0.0
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("A trained agent balancing")
    font = pygame.font.Font(None, 24)
    clock = pygame.time.Clock()
    state, _ = env.reset(seed=100)
    steps = 0
    message = "The agent is playing. Close the window to stop."
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        state, reward, terminated, truncated, _ = env.step(agent.act(state))
        steps += 1
        if terminated or truncated:
            message = f"{'Balanced to the limit' if truncated else 'Fell'} after {steps} steps; starting again."
            state, _ = env.reset()
            steps = 0
        draw(screen, font, env.obs, steps, message)
        pygame.display.flip()
        clock.tick(50)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run()
```

- **Training happens before the window opens**, in a few seconds, so the window appears after a short pause.
- **`agent.epsilon = 0.0`**: the agent plays greedily, with no random pushes, so what you see is purely what it learned.
- **`draw(screen, font, env.obs, ...)`**: the agent chose its action from a row number, but the picture is drawn from the real observation the wrapper kept.

Press **Run** and watch. The cart makes small, constant corrections, much like your own pushes in slow motion, except it never gets tired.

```check
run ".venv/Scripts/python -m pytest -q tests/test_cartpole_table.py -k watch" label="the trained agent's window opens and closes"
run ".venv/Scripts/python -m pytest -q tests/test_cartpole_table.py" label="all lesson 2.4 tests pass"
```

### What you have

A Q-learning agent that balances CartPole, made from Chapter 1's parts plus a wrapper and a schedule. That's the first school problem solved with a table. The next lesson makes sure it's solved properly: one good run proves very little.
