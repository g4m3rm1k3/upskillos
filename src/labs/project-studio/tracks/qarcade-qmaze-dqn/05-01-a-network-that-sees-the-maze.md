---
title: 5.1 — A Network That Sees the Maze
track: Q-Arcade — Deep Q-learning on QMaze
trackOrder: 12.6
runtime: python
run: dqn.py
---

**Starting a new chapter:** every Q-Arcade chapter uses the same `q-arcade` folder, so your files carry straight on. If the file tree is ever empty, click **Choose folder…** and select `q-arcade`.

### The story so far

- **Chapter 1** built the learning: an agent with a table `Q`, one row per state and one score per action. After every move it computes a **target**, the reward plus γ (gamma, the discount) times the best score of the next state, or just the reward if the game **ended**, and nudges the move's score towards it. It picks moves **ε-greedily**: usually the best score, sometimes at random.
- **Chapter 3** built QMaze, and lesson 3.4 found that a table can't carry what it learned to a new maze. `observe(env)` turns the maze into 100 numbers with the rat as 0.5: a picture of the situation instead of a cell number.
- **Chapter 4** built networks: functions with knobs that compute outputs from inputs, trained by gradient steps. In PyTorch, a step is `zero_grad`, compute the loss, `backward`, `step`.

### What this lesson asks

This is **deep Q-learning**: Q-learning (Chapter 1) with a neural network (Chapter 4) in place of the table. Nothing about the learning rule changes. After each step the target is still r + γ · max Q(next), or just r after an ending. What changes is where the values live and how they're nudged. A table stores four numbers per cell and nudges one of them. A network **computes** four numbers from the whole maze, and is nudged by a gradient step that makes its output for that situation a little closer to the target.

This chapter trains on a **7 × 7 maze** first, with 33 starting cells. The 10 × 10 maze from Chapter 3 works too, but a single training run of it took 10 to 26 minutes on the machine this series was written on, and failed outright with some settings. The small maze trains in under a minute, which is short enough to change things and see what happens. Lesson 5.5 goes back to the big one.

### The table agent and the network agent, side by side

| job | `QAgent` (Chapter 1) | `DQNAgent` (this lesson) |
|---|---|---|
| what it's told about the situation | a state number, e.g. 23 | an observation: 49 numbers, the whole maze |
| where its knowledge lives | `self.Q`, a table | `self.net`, a network |
| "what's each action worth here?" | `self.Q[state]`, a row | `self.values(obs)`, the network's 4 outputs |
| choosing a move | ε-greedy over the row | ε-greedy over the outputs (same rule) |
| learning from one move | nudge one number towards the target | one gradient step moving one output towards the target |

### How the pieces fit

```text
seen_maze.py   SeenMaze: a QMaze whose reset/step hand out observe(self) instead of the cell number
dqn.py
  DQNAgent       values(obs) -> act(obs) -> learn(...) -> update(batch): the Q-learning target, one gradient step
  ByCell         lets lesson 3.2's completion() judge a network agent (it hands out cell numbers)
  train_dqn()    play episodes on SeenMaze, learning after every step; check completion every 10 episodes
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_dqn.py** above.

```python file=tests/test_dqn.py provided
# Tests for seen_maze.py and dqn.py (lesson 5.1).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_dqn.py
import numpy as np
import torch
from pytest import approx


def test_seen_maze_hands_out_the_whole_maze():
    from seen_maze import SMALL_MAZE, SeenMaze
    env = SeenMaze(SMALL_MAZE)
    obs, info = env.reset()
    assert obs.shape == (49,) and obs[0] == 0.5 and info == {}
    obs, reward, terminated, truncated, _ = env.step(3)
    assert obs[7] == 0.5 and obs[0] == 1.0 and reward == -0.04, "down from (0, 0) to (1, 0), cell 7"


def test_seen_maze_is_the_small_one():
    from qmaze import QMaze
    from seen_maze import SMALL_MAZE
    assert SMALL_MAZE.shape == (7, 7) and len(QMaze(SMALL_MAZE).free_cells) == 33


def test_values_are_four_numbers_from_the_network():
    from dqn import DQNAgent
    agent = DQNAgent(49)
    values = agent.values(np.zeros(49))
    assert values.shape == (4,) and values.dtype == np.float32


def test_values_do_not_record_a_graph():
    from dqn import DQNAgent
    agent = DQNAgent(49)
    agent.values(np.zeros(49))
    assert all(p.grad is None for p in agent.net.parameters()), "asking for values must not touch the slopes"


def test_act_is_greedy_without_exploring():
    from dqn import DQNAgent
    agent = DQNAgent(49, epsilon=0.0)
    with torch.no_grad():
        agent.net[-1].bias[:] = torch.tensor([0.0, 0.0, 50.0, 0.0])
    assert {agent.act(np.zeros(49)) for _ in range(50)} == {2}


def test_act_explores_with_epsilon_one():
    from dqn import DQNAgent
    agent = DQNAgent(49, epsilon=1.0)
    assert {agent.act(np.zeros(49)) for _ in range(200)} == {0, 1, 2, 3}


def test_act_returns_plain_ints():
    from dqn import DQNAgent
    agent = DQNAgent(49, epsilon=0.5)
    assert all(type(agent.act(np.zeros(49))) is int for _ in range(20))


def test_update_moves_the_chosen_value_towards_its_target():
    from dqn import DQNAgent
    agent = DQNAgent(49)
    obs = np.zeros(49)
    obs[0] = 0.5
    before = agent.values(obs).copy()
    for _ in range(200):
        agent.update([(obs, 1, 1.0, obs, True)])
    after = agent.values(obs)
    assert after[1] == approx(1.0, abs=0.05), "an ending: the target is just the reward, 1"
    assert abs(after[1] - 1.0) < abs(before[1] - 1.0)


def test_update_target_includes_the_next_value_unless_ended():
    from dqn import DQNAgent
    agent = DQNAgent(49, gamma=0.5)
    obs = np.zeros(49)
    for _ in range(300):
        agent.update([(obs, 0, 1.0, obs, False)])
    assert agent.values(obs).max() == approx(2.0, abs=0.15), "V = 1 + 0.5 V, so V = 2"


def test_train_returns_an_agent_and_when_it_solved():
    from dqn import train_dqn
    agent, solved_at = train_dqn(episodes=2, check_every=1)
    assert hasattr(agent, "net") and (solved_at is None or solved_at <= 2)
```

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `seen` | the agent gets the whole small maze with the rat marked, and the rules are QMaze's | handing out the cell number instead, so the network had nothing to see |
| `values` | asking for values gives 4 plain numbers and leaves no slopes behind | recording a graph on every move, slowly eating memory |
| `act` | ε = 0 always picks the best, ε = 1 tries all four, and the answer is a plain `int` | exploration that never happened, or a tensor where QMaze expects a number |
| `update` | a value moves to its target, and the target includes the next value except after an ending | forgetting `1 - ended`, so the cheese looked like it had a future after the game was over |
| `train` | training runs and reports when (or whether) the maze was solved | |

Two of these test **learning** by its fixed point: where the network's value must end up if the update is right.

- `test_update_moves_the_chosen_value_towards_its_target` repeats one transition that **ends** with reward 1, so the target is always exactly 1, and the value must arrive there.
- `test_update_target_includes_the_next_value_unless_ended` repeats a transition from a state back to **itself**, with reward 1, never ending, and γ = 0.5. If the value is V, the target is 1 + 0.5 V. The two agree only when V = 1 + 0.5 V, which is V = 2. A wrong target, such as one that ignores the next value, would settle somewhere else.

  Finding V by repeating the update is a **recurrence relation** (lesson 1.3), and V = 2 is its **fixed point**: the value where one more update changes nothing. Watch it get there, in a scratch file:

  ```python
  V = 0.0
  for step in range(1, 9):
      V = 1 + 0.5 * V
      print(step, V)
  ```

  It goes 1.0, 1.5, 1.75, 1.875, … halving the distance to 2 each time. A network doesn't jump straight to its target, so it takes the test 300 updates instead of 8, but it heads for the same place.

`agent.net[-1].bias[:] = …` in `test_act_is_greedy_without_exploring` reaches into the network's last layer and sets its biases by hand, so that action 2's value is far above the others whatever the input. That makes the greedy choice known in advance. `torch.no_grad()` around it tells PyTorch not to record the change in a computation graph.

```check
file tests/test_dqn.py -- Click "Create provided tests/test_dqn.py" above.
```

## The maze, seen

Create `seen_maze.py`:

```python file=seen_maze.py
import numpy as np

from new_maze import observe
from qmaze import QMaze

SMALL_MAZE = np.array([
    [1, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 1, 0],
    [0, 0, 0, 1, 1, 1, 0],
    [1, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 1, 1, 1],
    [1, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 1, 1, 1],
], dtype=float)


class SeenMaze(QMaze):
    def reset(self, seed=None):
        super().reset(seed)
        return observe(self), {}

    def step(self, action):
        _, reward, terminated, truncated, info = super().step(action)
        return observe(self), reward, terminated, truncated, info
```

- **`SMALL_MAZE`** is 7 × 7: 33 free cells besides the cheese, and a 26-move shortest route from (0, 0).
- **`SeenMaze`** is a `QMaze` whose states are what the tutorial's agent sees: lesson 3.4's `observe`, the maze with the rat marked 0.5, as one array. `class SeenMaze(QMaze):` inherits everything (rules, rewards, random starts) and overrides only `reset` and `step`. Each calls the original (`super().reset(seed)`) and then replaces the cell number with the observation. That's lesson 3.5's subclassing again, and lesson 2.4's wrapper idea from the other direction.

```check
run ".venv/Scripts/python -m pytest -q tests/test_dqn.py -k seen" label="SeenMaze hands the agent the whole small maze, with the rat marked" -- reset and step call the QMaze versions, then return observe(self) in place of the state number.
```

## A network agent

Create `dqn.py`:

```python file=dqn.py
import numpy as np
import torch
from torch import nn


def make_net(size, actions=4):
    return nn.Sequential(nn.Linear(size, size), nn.PReLU(), nn.Linear(size, size), nn.PReLU(), nn.Linear(size, actions))


class DQNAgent:
    def __init__(self, size, gamma=0.95, epsilon=0.1, rate=1e-3, seed=0):
        torch.manual_seed(seed)
        self.rng = np.random.default_rng(seed)
        self.net = make_net(size)
        self.optimiser = torch.optim.Adam(self.net.parameters(), lr=rate)
        self.gamma = gamma
        self.epsilon = epsilon

    def values(self, obs):
        with torch.no_grad():
            return self.net(torch.tensor(obs, dtype=torch.float32).reshape(1, -1))[0].numpy()
```

- **`make_net(size)`** is the tutorial's network (lesson 4.5), in PyTorch: `size` inputs (49 for the small maze), two hidden layers of `size` units with PReLU bends, and 4 outputs, one value per action. `nn.PReLU()` is PyTorch's PReLU, with one difference from Keras's: written like this, it learns **one** negative-side slope shared by the whole layer, where Keras learns one per unit. (`nn.PReLU(size)` would learn one per unit.) It makes little difference here, and it's the kind of detail to check whenever code moves between libraries. With 49 inputs the network has 5,102 knobs.

  Counting them as lesson 4.5 did: each `Linear(49, 49)` has 49 × 49 + 49 = 2,450 knobs, each `PReLU()` has 1, and `Linear(49, 4)` has 49 × 4 + 4 = 200, so 2,450 + 1 + 2,450 + 1 + 200 = 5,102.

**`DQNAgent`'s inputs:**

| input | what it is | why it's an input | default |
|---|---|---|---|
| `size` | how many numbers in an observation | the network's first layer must match it: 49 for the small maze, 100 for the big one | (required) |
| `gamma` | the discount γ | how much the future counts, as in Chapter 1 | 0.95 |
| `epsilon` | the chance of a random move | exploration, as in Chapter 1 | 0.1 |
| `rate` | Adam's learning rate | how big each gradient step is (lesson 4.2) | 0.001 |
| `seed` | the random seed | makes the starting knobs and the exploration repeatable | 0 |

- **The agent's knowledge is `self.net`**, where Chapter 1's agent had `self.Q`. **Adam** (lesson 4.5) will do the nudging.
- **`values(obs)`** is the network's answer to "what is each action worth here?", the row `Q[state]` of a table. The observation becomes a batch of one (`reshape(1, -1)`), `[0]` takes the one result back out, and `.numpy()` turns it into an ordinary array. **`torch.no_grad()`** switches off autograd's recording inside the `with` block. Choosing an action never needs slopes, and recording a graph every step would only waste time and memory.

```check
run ".venv/Scripts/python -m pytest -q tests/test_dqn.py -k values" label="values asks the network for four action values, without recording a graph" -- with torch.no_grad(): return self.net(torch.tensor(obs, dtype=torch.float32).reshape(1, -1))[0].numpy().
```

## Your turn: choosing an action

**Build, on your own:** `act(self, obs)` in `DQNAgent`.

It's lesson 1.4's ε-greedy rule exactly, with the network's values in place of a table row. With probability `self.epsilon`, return a random action from 0 to 3. Otherwise, return the action with the biggest value, breaking ties at random among the best (lesson 1.2's `greedy`). Use `self.rng` for both, and return a plain `int`.

```hints
nudge: Compare your QAgent.act in agent.py. What replaces self.Q[state]?
concept: `self.values(obs)` is the row. The rest is QAgent.act and qtable.greedy, written out: `np.flatnonzero(values == values.max())` gives the best actions, and `self.rng.choice` picks one.
answer: Add to `DQNAgent`, after `values`:
~~~python
    def act(self, obs):
        if self.rng.random() < self.epsilon:
            return int(self.rng.integers(4))
        values = self.values(obs)
        return int(self.rng.choice(np.flatnonzero(values == values.max())))
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_dqn.py -k act" label="act is epsilon-greedy over the network's values" -- With probability epsilon a random int from 0 to 3; otherwise a random choice among the actions whose value equals the biggest.
```

## Learning from one step

Now the learning. Make `dqn.py` this:

```python file=dqn.py
import numpy as np
import torch
from torch import nn


def make_net(size, actions=4):
    return nn.Sequential(nn.Linear(size, size), nn.PReLU(), nn.Linear(size, size), nn.PReLU(), nn.Linear(size, actions))


class DQNAgent:
    def __init__(self, size, gamma=0.95, epsilon=0.1, rate=1e-3, seed=0):
        torch.manual_seed(seed)
        self.rng = np.random.default_rng(seed)
        self.net = make_net(size)
        self.optimiser = torch.optim.Adam(self.net.parameters(), lr=rate)
        self.gamma = gamma
        self.epsilon = epsilon

    def values(self, obs):
        with torch.no_grad():
            return self.net(torch.tensor(obs, dtype=torch.float32).reshape(1, -1))[0].numpy()

    def act(self, obs):
        if self.rng.random() < self.epsilon:
            return int(self.rng.integers(4))
        values = self.values(obs)
        return int(self.rng.choice(np.flatnonzero(values == values.max())))

    def learn(self, obs, action, reward, next_obs, terminated):
        self.update([(obs, action, reward, next_obs, terminated)])

    def update(self, batch):
        obs, actions, rewards, next_obs, terminated = (np.array(column) for column in zip(*batch))
        obs = torch.tensor(obs, dtype=torch.float32)
        next_obs = torch.tensor(next_obs, dtype=torch.float32)
        rewards = torch.tensor(rewards, dtype=torch.float32)
        ended = torch.tensor(terminated, dtype=torch.float32)
        with torch.no_grad():
            targets = rewards + self.gamma * (1 - ended) * self.net(next_obs).max(dim=1).values
        chosen = self.net(obs).gather(1, torch.tensor(actions).reshape(-1, 1))[:, 0]
        loss = nn.functional.mse_loss(chosen, targets)
        self.optimiser.zero_grad()
        loss.backward()
        self.optimiser.step()

```

`update(batch)` takes a list of transitions, `(obs, action, reward, next_obs, terminated)`, and does one gradient step on all of them at once. This step calls it with a list of one. Line by line:

- **`zip(*batch)`** turns a list of transitions into five columns: all the observations together, all the actions together, and so on. `np.array(column)` makes each an array, and the `torch.tensor` lines make tensors of them.
- **The targets**, inside `torch.no_grad()`, are Q-learning's, for every transition at once: `rewards + γ × (1 − ended) × (the best next value)`. Multiplying by `1 − ended` makes the next value vanish after an ending (ended is 1.0) and count otherwise (0.0), with no `if`, so it works on whole arrays. `.max(dim=1).values` is the biggest of the four values in each row.
- **Why `no_grad` around the targets?** A target is meant to be a fixed label, "this is what the value should be", like y in Chapter 4. If autograd recorded it, `backward` would also push the **next** state's value towards the current one, chasing the target as well as the value. Computing it without a graph makes it a constant.
- **`chosen`**: the network gives four values per observation, but the transition only says something about the action actually taken. `.gather(1, actions…)` picks, from each row, the value at that row's action. For a batch of one with action 2, it's the third value.
- **The loss** is the mean squared difference between the chosen values and their targets, and the last three lines are lesson 4.4's: zero the slopes, `backward`, `step`.

**`update` worked through on a batch of two**, with made-up numbers small enough to follow. `zip(*batch)` first:

```python
batch = [
    ("obs A", 2, -0.04, "next A", False),
    ("obs B", 0, 1.0, "next B", True),
]
for column in zip(*batch):
    print(column)
```

```text
('obs A', 'obs B')
(2, 0)
(-0.04, 1.0)
('next A', 'next B')
(False, True)
```

The `*` hands each transition to `zip` as a separate argument, and `zip` takes the first item of each, then the second, and so on: rows become columns. Then, with the network's outputs replaced by numbers you can read:

```python
import torch

values = torch.tensor([[0.1, 0.2, 0.3, 0.4],      # the network's 4 values for obs A
                       [0.5, 0.6, 0.7, 0.8]])     # and for obs B
actions = torch.tensor([2, 0])
print(values.gather(1, actions.reshape(-1, 1))[:, 0])

rewards = torch.tensor([-0.04, 1.0])
ended = torch.tensor([0.0, 1.0])
best_next = torch.tensor([0.5, 0.9])              # the biggest of the 4 values for each next obs
print(rewards + 0.95 * (1 - ended) * best_next)
```

```text
tensor([0.3000, 0.5000])
tensor([0.4350, 1.0000])
```

`gather` took position 2 from row A (0.3) and position 0 from row B (0.5): the values of the actions actually taken. The targets: A didn't end, so −0.04 + 0.95 × 1 × 0.5 = 0.435. B ended, so `1 - ended` is 0, the next value is wiped out, and the target is just the reward, 1.0. The loss is then the average of (0.3 − 0.435)² and (0.5 − 1.0)², and the gradient step moves both chosen values towards their targets.

Compare it with the table's `q_update`: `Q[state, action] = nudge(Q[state, action], target, alpha)`. The table moves one number a fraction α of the way to the target. The network takes a gradient step that moves its output **for this observation and this action** towards the target. Because all its knobs are shared, the step also moves its outputs for **similar** observations. That's the generalisation the table couldn't do. It's also, as you're about to see, a problem.

**`learn`**, for now, updates on the step that just happened.

```check
run ".venv/Scripts/python -m pytest -q tests/test_dqn.py -k update" label="update moves the chosen value towards its Q-learning target" -- targets = rewards + gamma * (1 - ended) * net(next_obs).max(dim=1).values, without a graph; chosen = net(obs).gather(1, actions); loss = mse; zero_grad, backward, step.
```

## Training it

Make `dqn.py` this:

```python file=dqn.py
import time

import numpy as np
import torch
from torch import nn

from maze_tools import completion
from new_maze import observe
from qmaze import QMaze
from seen_maze import SMALL_MAZE, SeenMaze


def make_net(size, actions=4):
    return nn.Sequential(nn.Linear(size, size), nn.PReLU(), nn.Linear(size, size), nn.PReLU(), nn.Linear(size, actions))


class DQNAgent:
    def __init__(self, size, gamma=0.95, epsilon=0.1, rate=1e-3, seed=0):
        torch.manual_seed(seed)
        self.rng = np.random.default_rng(seed)
        self.net = make_net(size)
        self.optimiser = torch.optim.Adam(self.net.parameters(), lr=rate)
        self.gamma = gamma
        self.epsilon = epsilon

    def values(self, obs):
        with torch.no_grad():
            return self.net(torch.tensor(obs, dtype=torch.float32).reshape(1, -1))[0].numpy()

    def act(self, obs):
        if self.rng.random() < self.epsilon:
            return int(self.rng.integers(4))
        values = self.values(obs)
        return int(self.rng.choice(np.flatnonzero(values == values.max())))

    def learn(self, obs, action, reward, next_obs, terminated):
        self.update([(obs, action, reward, next_obs, terminated)])

    def update(self, batch):
        obs, actions, rewards, next_obs, terminated = (np.array(column) for column in zip(*batch))
        obs = torch.tensor(obs, dtype=torch.float32)
        next_obs = torch.tensor(next_obs, dtype=torch.float32)
        rewards = torch.tensor(rewards, dtype=torch.float32)
        ended = torch.tensor(terminated, dtype=torch.float32)
        with torch.no_grad():
            targets = rewards + self.gamma * (1 - ended) * self.net(next_obs).max(dim=1).values
        chosen = self.net(obs).gather(1, torch.tensor(actions).reshape(-1, 1))[:, 0]
        loss = nn.functional.mse_loss(chosen, targets)
        self.optimiser.zero_grad()
        loss.backward()
        self.optimiser.step()


class ByCell:
    def __init__(self, agent, maze):
        self.agent = agent
        self.env = QMaze(maze)
        self.epsilon = 0.0

    def act(self, state):
        self.env.cell = divmod(state, self.env.cols)
        return int(self.agent.values(observe(self.env)).argmax())


def train_dqn(maze=SMALL_MAZE, episodes=400, seed=0, check_every=10, **settings):
    env = SeenMaze(maze, random_start=True)
    agent = DQNAgent(env.maze.size, seed=seed, **settings)
    obs, _ = env.reset(seed=seed)
    start = time.perf_counter()
    solved_at = None
    for episode in range(1, episodes + 1):
        if episode > 1:
            obs, _ = env.reset()
        while True:
            action = agent.act(obs)
            next_obs, reward, terminated, truncated, _ = env.step(action)
            agent.learn(obs, action, reward, next_obs, terminated)
            obs = next_obs
            if terminated or truncated:
                break
        if episode % check_every == 0:
            wins, total = completion(ByCell(agent, maze), maze)
            print(f"episode {episode:3}: solves {wins} of {total} starts  ({time.perf_counter() - start:.0f} s)", flush=True)
            if wins == total:
                solved_at = episode
                break
    return agent, solved_at


if __name__ == "__main__":
    agent, solved_at = train_dqn()
    print("solved every start at episode", solved_at)
```

- **`ByCell`** adapts a network agent for lesson 3.2's `completion`, which hands out cell numbers. It rebuilds the observation for that cell and returns the greedy action, as lesson 4.5's `NetworkAgent` did.
- **`train_dqn`** is lesson 1.4's `train`, written out with one addition. Every `check_every` episodes it runs the completion check, prints how many starts the greedy agent solves, and stops as soon as it solves them all, as the tutorial's `qtrain` does. It returns the agent and the episode at which it solved the maze, or `None`.
- **`**settings`** collects any other keyword arguments, such as `gamma=0.9`, and passes them on to `DQNAgent`, so experiments can change the agent without changing this function.

Predict, then run it with `.venv\Scripts\python dqn.py`. It plays 400 episodes, in about 20 seconds:

```predict
question: The table agent solved its maze in 500 episodes. How many of the 33 starts will this network agent solve after 400?
choice: All 33
choice: About half
choice: Almost none
answer: Almost none
explain: Almost none. Measured on three seeds, it solved between 0 and 3 of the 33 starts at every check: at 100, 200, 300 and 400 episodes. It isn't improving at all. The next lesson explains why, and fixes it with one idea.
verify: script naive_fails.py
```

```text
episode  10: solves 3 of 33 starts  (1 s)
episode  20: solves 0 of 33 starts  (1 s)
episode  30: solves 2 of 33 starts  (2 s)
…
episode 380: solves 2 of 33 starts  (20 s)
episode 390: solves 3 of 33 starts  (21 s)
episode 400: solves 3 of 33 starts  (21 s)
solved every start at episode None
```

The learning rule is right: the update tests prove it. The trouble is in **what it learns from**. Think about what the network sees in a row of steps: the rat at (2, 3), then (2, 4), then (2, 5). Each observation differs from the last by two numbers. Each update pushes the network's values for *this* corner of the maze, and, because the knobs are shared, nudges every similar situation too. Ten steps along a corridor are ten pushes in the same direction, and they undo what the network learned about the other side of the maze a moment ago. Then the rat wanders elsewhere and the opposite happens. The network chases the rat's latest experience instead of building up knowledge of the whole maze. A table never had this problem, because updating one row changed nothing else.

```check
run ".venv/Scripts/python -m pytest -q tests/test_dqn.py -k train" label="train_dqn trains, checks completion and reports when it solved the maze"
run ".venv/Scripts/python -m pytest -q tests/test_dqn.py" label="all lesson 5.1 tests pass"
```

### What you have

A deep Q-learning agent: Chapter 1's learning rule, Chapter 4's network, and the tutorial's view of the maze. Every part is tested, and together they don't work. Next lesson adds the tutorial's **experience replay**, and the same agent solves the maze.
