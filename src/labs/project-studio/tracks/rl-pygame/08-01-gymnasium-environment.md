---
title: 8.1 — Your Grid World as a Gymnasium Environment
track: Reinforcement Learning in pygame
runtime: python
run: train_gym.py
---

**Gymnasium** is the standard library of reinforcement learning environments in Python: classic control problems such as CartPole, Atari games, robot simulations, and the shared interface they all follow. Write an environment to its interface, and every tool that understands Gymnasium works with it. So does every published algorithm, every tutorial, every library of agents.

You've been writing to that interface since lesson 4.1, on purpose: `reset()` returning `(state, info)`, and `step(action)` returning `(state, reward, terminated, truncated, info)`. This lesson makes `GridWorld` a genuine `gymnasium.Env`: it declares its spaces, seeds the way Gymnasium does, draws itself, registers under a name, and passes Gymnasium's own environment checker. Then your Q-learning agent from Chapter 7 trains on it with **no changes at all**.

Gymnasium's documentation calls this "creating a custom environment". After this lesson, the page at gymnasium.farama.org with that title will read like a summary of what you did.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_gym.py** above.

```python file=tests/test_gym.py provided
# Tests for gym_grid.py and train_gym.py (lesson 8.1). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_gym.py
import warnings

import numpy as np

from grid import MAPS


def test_space_sizes_come_from_the_map():
    from gym_grid import GymGrid
    env = GymGrid(MAPS["walls"])
    assert env.observation_space.n == 25 and env.action_space.n == 4
    assert env.observation_space.contains(24) and not env.observation_space.contains(25)


def test_reset_returns_the_start_and_info():
    from gym_grid import GymGrid
    env = GymGrid(MAPS["walls"])
    assert env.reset(seed=0) == (0, {})


def test_reset_seed_makes_slips_repeatable():
    from gym_grid import GymGrid
    runs = []
    for _ in range(2):
        env = GymGrid(MAPS["open"], slip=0.5)
        env.reset(seed=11)
        runs.append([env.step(3)[0] for _ in range(20)])
    assert runs[0] == runs[1]


def test_step_returns_floats_and_never_truncates_itself():
    from gym_grid import GymGrid
    env = GymGrid(MAPS["open"])
    env.reset(seed=0)
    for _ in range(300):
        state, reward, terminated, truncated, info = env.step(0)
        assert type(reward) is float and truncated is False
    env.grid.cell = (4, 3)
    assert env.step(3)[1:3] == (1.0, True)


def test_step_passes_gymnasiums_checker():
    from gymnasium.utils.env_checker import check_env
    from gym_grid import GymGrid
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        check_env(GymGrid(MAPS["walls"]))


def test_render_rgb_array_is_a_picture_of_the_grid():
    from gym_grid import GymGrid
    from world_view import CELL, TILES
    env = GymGrid(MAPS["walls"], render_mode="rgb_array")
    env.reset(seed=0)
    frame = env.render()
    assert frame.shape == (5 * CELL, 5 * CELL, 3)
    assert tuple(frame[4 * CELL + 5, 4 * CELL + 5]) == TILES["G"], "rows first: frame[y, x]"


def test_render_human_opens_and_closes_a_window():
    from gym_grid import GymGrid
    env = GymGrid(MAPS["walls"], render_mode="human")
    env.reset(seed=0)
    env.step(1)
    env.close()
    assert env.window is None


def test_make_adds_a_time_limit():
    import gymnasium as gym
    import gym_grid  # noqa: F401
    env = gym.make("GridWorld-v0", layout=MAPS["open"])
    env.reset(seed=0)
    steps = 0
    while True:
        _, _, terminated, truncated, _ = env.step(0)
        steps += 1
        if terminated or truncated:
            break
    assert steps == 100 and truncated and not terminated


def test_make_your_agents_learn_on_it():
    from train_gym import trained_agent
    agent, totals = trained_agent(episodes=400)
    assert agent.Q.shape == (25, 4)
    assert np.mean(totals[-100:] == 1.0) > 0.5, "most late episodes reach the goal"


def test_make_show_plays_greedy_episodes():
    from train_gym import show, trained_agent
    agent, _ = trained_agent(episodes=100)
    show(agent, episodes=1)
```

`test_step_passes_gymnasiums_checker` runs `gymnasium.utils.env_checker.check_env`, Gymnasium's own test of whether an environment follows the rules. It's lesson 4.4's idea, tests that guard a contract, written by the people who define the contract.

```check
file tests/test_gym.py -- Click "Create provided tests/test_gym.py" above.
```

## The Env class

Create `gym_grid.py`:

```python file=gym_grid.py
import gymnasium as gym
from gymnasium import spaces

from grid import MAPS, GridWorld


class GymGrid(gym.Env):
    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 8}

    def __init__(self, layout=None, slip=0.0, step_reward=0.0, rewards=None, render_mode=None):
        self.grid = GridWorld(layout or MAPS["walls"], slip=slip, max_steps=10**9,
                              step_reward=step_reward, rewards=rewards)
        self.observation_space = spaces.Discrete(self.grid.n_states)
        self.action_space = spaces.Discrete(self.grid.n_actions)
        self.render_mode = render_mode

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.grid.rng = self.np_random
        return self.grid.reset()

    def step(self, action):
        state, reward, terminated, _, info = self.grid.step(int(action))
        return state, float(reward), terminated, False, info
```

`GymGrid` **inherits from `gym.Env`** and holds a `GridWorld` inside, rather than rewriting it: everything your grid already does is reused. What Gymnasium adds:

- **Spaces.** Every environment declares what observations and actions look like. `spaces.Discrete(25)` means "a whole number from 0 to 24". That's the 25 cells as state numbers, and the 4 actions likewise. Agents and tools read these instead of guessing: `env.observation_space.n` is how many states there are, and `env.action_space.sample()` picks a random legal action. Chapter 8.3 meets the other common kind, `Box`, for continuous numbers.
- **Seeding the Gymnasium way.** `super().reset(seed=seed)` lets `gym.Env` handle seeding: with a seed, it makes `self.np_random`, a NumPy generator exactly like the ones you've used since lesson 2.1. The grid is handed that generator, so its slips follow Gymnasium's seed.
- **`reset(self, *, seed=None, options=None)`**: the bare `*` makes everything after it **keyword-only**. You must write `reset(seed=3)`, never `reset(3)`, which is what the Gymnasium interface requires. `options` is there for environments that accept extra settings when an episode starts. This one ignores it.
- **`step` never truncates.** `max_steps=10**9` effectively turns off the grid's own time limit, and `step` always returns `truncated=False`. In Gymnasium, time limits are added from the **outside**, by a wrapper (the step "Register and make"). That keeps "the world's rules" and "how long we let an experiment run" separate, as lesson 4.1 argued.
- `float(reward)` and `int(action)`: Gymnasium expects a plain float reward, and agents may pass NumPy integers as actions.

```predict
question: Step a `GymGrid` (made directly, not with `gym.make`) 300 times, always moving up from the start of the `open` map. Does it ever report `truncated=True`?
choice: Yes, after 100 steps
choice: No, never
answer: No, never
explain: The environment itself has no time limit: `max_steps` is 10⁹, and `step` always returns `truncated=False`. A time limit is added by a wrapper when you make the environment by name, which comes next. If you step a bare environment yourself, nothing stops an endless episode except you.
verify: .venv/Scripts/python -c "from gym_grid import GymGrid; from grid import MAPS; e = GymGrid(MAPS['open']); e.reset(seed=0); print('No, never' if not any(e.step(0)[3] for _ in range(300)) else 'Yes')"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_gym.py -k \"space or reset or step\"" label="GymGrid declares its spaces, seeds and steps like a Gymnasium environment" -- reset: call super().reset(seed=seed), hand self.np_random to the grid, then return the grid's reset. step: return float(reward) and truncated=False.
```

## Pictures: render modes

```python file=gym_grid.py
import gymnasium as gym
import numpy as np
import pygame
from gymnasium import spaces

from grid import MAPS, GridWorld
from world_view import CELL, draw_world


class GymGrid(gym.Env):
    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 8}

    def __init__(self, layout=None, slip=0.0, step_reward=0.0, rewards=None, render_mode=None):
        self.grid = GridWorld(layout or MAPS["walls"], slip=slip, max_steps=10**9,
                              step_reward=step_reward, rewards=rewards)
        self.observation_space = spaces.Discrete(self.grid.n_states)
        self.action_space = spaces.Discrete(self.grid.n_actions)
        self.render_mode = render_mode
        self.window = None

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.grid.rng = self.np_random
        state, info = self.grid.reset()
        if self.render_mode == "human":
            self.render()
        return state, info

    def step(self, action):
        state, reward, terminated, _, info = self.grid.step(int(action))
        if self.render_mode == "human":
            self.render()
        return state, float(reward), terminated, False, info

    def render(self):
        size = (self.grid.cols * CELL, self.grid.rows * CELL)
        if self.render_mode == "human":
            if self.window is None:
                pygame.init()
                self.window = pygame.display.set_mode(size)
                self.clock = pygame.time.Clock()
            pygame.event.pump()
            draw_world(self.window, self.grid)
            pygame.display.flip()
            self.clock.tick(self.metadata["render_fps"])
            return None
        if self.render_mode == "rgb_array":
            surface = pygame.Surface(size)
            draw_world(surface, self.grid)
            return np.transpose(pygame.surfarray.array3d(surface), (1, 0, 2))
        return None

    def close(self):
        if self.window is not None:
            pygame.display.quit()
            self.window = None
```

Gymnasium environments draw themselves in one of a few **render modes**, chosen when they're made. `metadata["render_modes"]` lists the ones supported:

- **`"human"`** draws into a real window, every `reset` and `step`, at `render_fps` frames a second. It's the workbench idea, built into the environment. `pygame.event.pump()` lets the operating system's messages through (lesson 0.3), so the window stays responsive while the agent plays. `clock.tick` paces the playback.
- **`"rgb_array"`** draws into an off-screen surface and returns the picture as a NumPy array, for recording videos or for agents that learn from pixels. Gymnasium's convention is shape `(height, width, 3)`, rows first, like the arrays you indexed in lesson 1.2, while pygame's `surfarray` gives `(width, height, 3)`, x first. `np.transpose(…, (1, 0, 2))` swaps the first two axes.
- `close` shuts the window. Every environment should release what it opened.

It reuses `draw_world` from lesson 4.1. The picture of the world was already its own function, so a second place that needs it simply calls it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_gym.py -k render" label="GymGrid renders to a window or to an array" -- rgb_array: draw onto a pygame.Surface of the grid's size, then return np.transpose(pygame.surfarray.array3d(surface), (1, 0, 2)).
```

## Register and make

```python file=gym_grid.py
import gymnasium as gym
import numpy as np
import pygame
from gymnasium import spaces

from grid import MAPS, GridWorld
from world_view import CELL, draw_world


class GymGrid(gym.Env):
    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 8}

    def __init__(self, layout=None, slip=0.0, step_reward=0.0, rewards=None, render_mode=None):
        self.grid = GridWorld(layout or MAPS["walls"], slip=slip, max_steps=10**9,
                              step_reward=step_reward, rewards=rewards)
        self.observation_space = spaces.Discrete(self.grid.n_states)
        self.action_space = spaces.Discrete(self.grid.n_actions)
        self.render_mode = render_mode
        self.window = None

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.grid.rng = self.np_random
        state, info = self.grid.reset()
        if self.render_mode == "human":
            self.render()
        return state, info

    def step(self, action):
        state, reward, terminated, _, info = self.grid.step(int(action))
        if self.render_mode == "human":
            self.render()
        return state, float(reward), terminated, False, info

    def render(self):
        size = (self.grid.cols * CELL, self.grid.rows * CELL)
        if self.render_mode == "human":
            if self.window is None:
                pygame.init()
                self.window = pygame.display.set_mode(size)
                self.clock = pygame.time.Clock()
            pygame.event.pump()
            draw_world(self.window, self.grid)
            pygame.display.flip()
            self.clock.tick(self.metadata["render_fps"])
            return None
        if self.render_mode == "rgb_array":
            surface = pygame.Surface(size)
            draw_world(surface, self.grid)
            return np.transpose(pygame.surfarray.array3d(surface), (1, 0, 2))
        return None

    def close(self):
        if self.window is not None:
            pygame.display.quit()
            self.window = None


gym.register(id="GridWorld-v0", entry_point=GymGrid, max_episode_steps=100)
```

`gym.register` gives the environment a name, `"GridWorld-v0"`, and default settings. `max_episode_steps=100` is the time limit. The `-v0` is a version number: if an environment's rules ever change, it gets a new version, so results reported for `-v0` stay reproducible.

Then `gym.make("GridWorld-v0", layout=…, slip=0.2)` builds it, passing the keyword arguments on to `GymGrid`, and **wraps** it. A wrapper is an object around the environment with the same interface (lesson 7.5's `Shaped`). Print one:

```text
<TimeLimit<OrderEnforcing<PassiveEnvChecker<GymGrid<GridWorld-v0>>>>>
```

Read it from the inside out: `GymGrid` is your environment. `PassiveEnvChecker` checks the first `reset` and `step` results for mistakes. `OrderEnforcing` raises an error if you `step` before `reset`. `TimeLimit` counts steps and returns `truncated=True` at 100. `env.unwrapped` reaches through all of them to `GymGrid` itself.

```predict
question: How many wrappers does `gym.make("GridWorld-v0")` put around your GymGrid?
answer: 3
explain: TimeLimit, OrderEnforcing and PassiveEnvChecker, from the outside in. Each adds one responsibility and passes everything else through. That's why a time limit, an order check and an API check didn't need a single line in your environment.
verify: script wrapper_count.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_gym.py -k \"make_adds\"" label="gym.make wraps GridWorld-v0 with a 100-step time limit" -- gym.register(id="GridWorld-v0", entry_point=GymGrid, max_episode_steps=100) at the bottom of gym_grid.py.
```

## Train your agent on it

`train_gym.py` trains lesson 7.1's `QLearning` on the Gymnasium version, then plays three greedy episodes in a `"human"` window:

```python file=train_gym.py
import sys

import gymnasium as gym
import numpy as np

import gym_grid  # noqa: F401  (importing it registers GridWorld-v0)
from grid import MAPS
from learners import QLearning
from training import train


def trained_agent(episodes=1000, seed=0, slip=0.2):
    env = gym.make("GridWorld-v0", layout=MAPS["walls"], slip=slip)
    agent = QLearning(env.observation_space.n, env.action_space.n, np.random.default_rng(seed), epsilon=0.1, gamma=0.9)
    totals = train(env, agent, episodes, seed=seed)
    env.close()
    return agent, totals


def show(agent, episodes=3, slip=0.2):
    env = gym.make("GridWorld-v0", layout=MAPS["walls"], slip=slip, render_mode="human")
    for _ in range(episodes):
        state, _ = env.reset()
        while True:
            state, _, terminated, truncated, _ = env.step(int(agent.Q[state].argmax()))
            if terminated or truncated:
                break
    env.close()


if __name__ == "__main__":
    agent, totals = trained_agent()
    print(f"reached the goal in {np.mean(totals[-100:] == 1.0):.0%} of the last 100 training episodes")
    if "quiet" not in sys.argv:
        show(agent)
```

Look at what's **not** in this file: no adapter, and no change to `QLearning` or `train`. The agent gets its table size from the spaces, `observation_space.n` and `action_space.n`, and `train` calls `reset(seed=…)`, `reset()` and `step(…)`, which mean exactly the same thing here. When the `TimeLimit` wrapper truncates an episode, `QLearning` still bootstraps from the next state (lesson 7.1), which is exactly right, because a time-out isn't an ending.

`import gym_grid` is needed only for what importing it *does*: it runs `gym.register`. The `# noqa: F401` comment tells code checkers that an "unused" import is intentional.

Run it. The output pane reports how often training episodes reached the goal near the end, then a window plays the learned policy on the slippery map.

The interface you built in lesson 4.1 is the interface the rest of the field uses. Lesson 8.2 puts your agent on one of Gymnasium's own environments, FrozenLake, unchanged.

```check
run ".venv/Scripts/python -m pytest -q tests/test_gym.py" label="all lesson 8.1 tests pass" -- trained_agent: gym.make("GridWorld-v0", ...), a QLearning sized from the spaces, then train(env, agent, episodes, seed=seed).
```
