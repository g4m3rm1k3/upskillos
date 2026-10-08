---
title: 5.2 — Experience Replay
runtime: python
run: dqn.py
---

Last lesson's network learned from each step once, the moment it happened, and got nowhere: 0 to 3 of 33 starts after 400 episodes. The fix is the idea behind the tutorial's `Experience` class, and behind DeepMind's Atari agent: **don't learn from the step you just took. Keep a memory of recent steps, and learn from a random handful of them.**

That one change does three things at once:

1. **It breaks the chains.** A random handful of memories comes from all over the maze and from many different episodes, so one gradient step pushes in many directions at once, instead of ten steps in a row all pushing the same corner.
2. **Every experience is used many times.** A step stays in memory for the next thousand steps and can be drawn into many batches. Rare experiences, like reaching the cheese, aren't seen once and forgotten.
3. **The batch is an average.** Its loss is a mean over many transitions, so each gradient step is less noisy than one built from a single transition.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_replay.py** above.

```python file=tests/test_replay.py provided
# Tests for replay.py and dqn.py's memory (lesson 5.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_replay.py
import numpy as np


def test_memory_keeps_only_the_newest():
    from replay import ReplayMemory
    memory = ReplayMemory(3, np.random.default_rng(0))
    for item in range(5):
        memory.add(item)
    assert len(memory) == 3 and list(memory.items) == [2, 3, 4]


def test_sample_takes_different_items():
    from replay import ReplayMemory
    memory = ReplayMemory(100, np.random.default_rng(0))
    for item in range(100):
        memory.add(item)
    batch = memory.sample(32)
    assert len(batch) == 32 and len(set(batch)) == 32, "no item twice in one batch"


def test_sample_reaches_old_and_new_memories():
    from replay import ReplayMemory
    memory = ReplayMemory(100, np.random.default_rng(0))
    for item in range(100):
        memory.add(item)
    seen = set()
    for _ in range(50):
        seen.update(memory.sample(10))
    assert min(seen) < 10 and max(seen) >= 90


def test_sample_is_repeatable_with_the_same_generator():
    from replay import ReplayMemory
    a, b = ReplayMemory(10, np.random.default_rng(3)), ReplayMemory(10, np.random.default_rng(3))
    for item in range(10):
        a.add(item)
        b.add(item)
    assert a.sample(5) == b.sample(5)


def test_batches_wait_until_there_are_enough():
    from dqn import DQNAgent
    agent = DQNAgent(49, batch=32)
    before = [p.detach().clone() for p in agent.net.parameters()]
    for _ in range(31):
        agent.learn(np.zeros(49), 0, -0.04, np.zeros(49), False)
    assert all(torch_equal(a, b) for a, b in zip(before, agent.net.parameters())), "31 memories: not enough for a batch yet"
    agent.learn(np.zeros(49), 0, -0.04, np.zeros(49), False)
    assert not all(torch_equal(a, b) for a, b in zip(before, agent.net.parameters())), "the 32nd starts learning"


def test_batches_remember_everything_learned():
    from dqn import DQNAgent
    agent = DQNAgent(49, memory=50)
    for i in range(60):
        agent.learn(np.full(49, i), 0, 0.0, np.zeros(49), False)
    assert len(agent.memory) == 50


def torch_equal(a, b):
    import torch
    return torch.equal(a, b)
```

`test_batches_wait_until_there_are_enough` checks that nothing is learned until the memory holds a full batch. It copies every weight tensor first (`p.detach().clone()`: a copy cut off from the computation graph) and compares afterwards with `torch.equal`, which is true only when two tensors are identical.

```check
file tests/test_replay.py -- Click "Create provided tests/test_replay.py" above.
```

## A memory

Create `replay.py`:

```python file=replay.py
from collections import deque


class ReplayMemory:
    def __init__(self, capacity, rng):
        self.items = deque(maxlen=capacity)
        self.rng = rng

    def __len__(self):
        return len(self.items)

    def add(self, item):
        self.items.append(item)

```

- **`deque(maxlen=capacity)`**: a `deque` (lesson 3.3) with a maximum length. When it's full, adding an item at one end silently drops the oldest from the other. So the memory always holds the newest `capacity` steps: old experience, from when the agent knew less, ages out by itself. The tutorial does the same with a list and `del self.memory[0]`.
- **`__len__`** is the method Python calls for `len(memory)`. Defining it makes the memory work with `len`, like a list does.

```check
run ".venv/Scripts/python -m pytest -q tests/test_replay.py -k memory" label="the memory keeps only the newest items, up to its capacity"
```

## Your turn: a random handful

**Build, on your own:** `sample(self, n)` in `ReplayMemory`.

Return a list of `n` items from the memory, chosen at random, with **no item twice** in the same batch. Use the memory's own generator, `self.rng`.

`self.rng.choice(how_many_there_are, n, replace=False)` picks `n` different positions from 0 up to `how_many_there_are − 1`. `replace=False` means "without putting each choice back", so no position comes up twice. Then turn the positions into items.

```hints
nudge: First choose n positions; then fetch the item at each.
concept: `chosen = self.rng.choice(len(self.items), n, replace=False)`, then a list comprehension over `chosen`.
answer: Add to `ReplayMemory`:
~~~python
    def sample(self, n):
        chosen = self.rng.choice(len(self.items), n, replace=False)
        return [self.items[i] for i in chosen]
~~~
Indexing a deque by position (`self.items[i]`) is fine for a memory of a thousand; for millions, real replay memories use a fixed-size array instead.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_replay.py -k sample" label="sample draws n different items at random, from old and new memories alike" -- chosen = self.rng.choice(len(self.items), n, replace=False); return [self.items[i] for i in chosen].
```

## Learning from memories

Make `dqn.py` this:

```python file=dqn.py
import time

import numpy as np
import torch
from torch import nn

from maze_tools import completion
from new_maze import observe
from qmaze import QMaze
from replay import ReplayMemory
from seen_maze import SMALL_MAZE, SeenMaze


def make_net(size, actions=4):
    return nn.Sequential(nn.Linear(size, size), nn.PReLU(), nn.Linear(size, size), nn.PReLU(), nn.Linear(size, actions))


class DQNAgent:
    def __init__(self, size, gamma=0.95, epsilon=0.1, rate=1e-3, memory=1000, batch=32, updates=4, seed=0):
        torch.manual_seed(seed)
        self.rng = np.random.default_rng(seed)
        self.net = make_net(size)
        self.optimiser = torch.optim.Adam(self.net.parameters(), lr=rate)
        self.gamma = gamma
        self.epsilon = epsilon
        self.batch = batch
        self.updates = updates
        self.memory = ReplayMemory(memory, self.rng)

    def values(self, obs):
        with torch.no_grad():
            return self.net(torch.tensor(obs, dtype=torch.float32).reshape(1, -1))[0].numpy()

    def act(self, obs):
        if self.rng.random() < self.epsilon:
            return int(self.rng.integers(4))
        values = self.values(obs)
        return int(self.rng.choice(np.flatnonzero(values == values.max())))

    def learn(self, obs, action, reward, next_obs, terminated):
        self.memory.add((obs, action, reward, next_obs, terminated))
        if len(self.memory) >= self.batch:
            for _ in range(self.updates):
                self.update(self.memory.sample(self.batch))

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

The changes from last lesson are all in `__init__` and `learn`. `update` is unchanged: it already took a list of transitions, and now it gets 32 of them.

- **`memory=1000`**, the tutorial's `max_memory`: the last thousand steps.
- **`batch=32`**: transitions per gradient step.
- **`updates=4`**: gradient steps per move. Each move adds one memory and then learns four times from four different random batches. That makes each move's experience go further, and it mattered: on this maze, measured with three seeds each, 4 updates solved the maze in 140 to 230 episodes, while 1 update needed 290 episodes or more, and once failed within 400.
- **`learn`** stores the step, and learns only once the memory holds at least a full batch (32 steps).

Predict, then run `.venv\Scripts\python dqn.py`:

```predict
question: With replay, around which episode will the network first solve all 33 starts?
answer: 180
tolerance: 60
explain: For seed 0, at episode 180, after about 46 seconds. Seeds 1 to 4 solved it at episodes 140, 140, 170, 80, in 17 to 36 seconds. Without replay, the same network got nowhere in 400 episodes. With it, every seed solves every start in under 200 episodes. For comparison, Chapter 3's table agent solved the bigger 10 × 10 maze in 500 episodes and about a fifth of a second. Each network update is far more work than nudging one number, so on a maze small enough for a table, the table wins. The network earns its cost where tables can't go: CartPole without bins, and many mazes at once.
verify: script replay_solves.py
```

```text
episode  10: solves 2 of 33 starts  (3 s)
episode  20: solves 9 of 33 starts  (6 s)
…
episode 150: solves 5 of 33 starts  (41 s)
episode 160: solves 23 of 33 starts  (42 s)
episode 170: solves 22 of 33 starts  (44 s)
episode 180: solves 33 of 33 starts  (46 s)
solved every start at episode 180
```

The same network, the same learning rule and the same targets. The only change is **which experiences each update learns from**. Notice also the dips on the way: a network can solve 23 starts, then 22, then all 33. It's always moving all its values together, so progress isn't smooth.

```check
run ".venv/Scripts/python -m pytest -q tests/test_replay.py -k batches" label="learn stores every step and learns from batches once there are enough"
run ".venv/Scripts/python -m pytest -q tests/test_replay.py" label="all lesson 5.2 tests pass"
run ".venv/Scripts/python -m pytest -q tests/test_dqn.py" label="and the lesson 5.1 tests still pass"
```

### What you have

A deep Q-learning agent that solves the small maze from every start: a network for the values, Q-learning targets, and a replay memory to learn from. Next lesson saves it to a file, judges it against the shortest routes, and draws what it learned.
