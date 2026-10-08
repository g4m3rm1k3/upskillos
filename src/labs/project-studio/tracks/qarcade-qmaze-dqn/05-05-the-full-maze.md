---
title: 5.5 — The Full Maze, and a Frozen Copy
runtime: python
run: big_maze.py
---

Back to the tutorial's 10 × 10 maze: 74 starts, 100 inputs and 20,804 knobs. The agent that solved the small maze in under a minute struggles badly here. While this series was being written, five different settings were each given 600 episodes on this maze, and three of them never solved it.

The fix that worked is the second idea in DeepMind's Atari agent, after experience replay: a **target network**. This lesson explains the problem it solves, builds it, and then sets the big maze training, which takes ten minutes or more. Start it and read the explanation while it runs.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_target.py** above.

```python file=tests/test_target.py provided
# Tests for the target network in dqn.py, and big_maze.py (lesson 5.5).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_target.py
import numpy as np
import torch


def same_numbers(a, b):
    return all(torch.equal(x, y) for x, y in zip(a.parameters(), b.parameters()))


def fill(agent, steps):
    for i in range(steps):
        obs = np.zeros(49)
        obs[i % 49] = 0.5
        agent.learn(obs, i % 4, -0.04, obs, False)


def test_frozen_copy_starts_equal_to_the_network():
    from dqn import DQNAgent
    agent = DQNAgent(49, sync=100)
    assert same_numbers(agent.net, agent.target) and agent.net is not agent.target


def test_frozen_copy_stays_put_between_syncs():
    from dqn import DQNAgent
    agent = DQNAgent(49, sync=100)
    start = [p.detach().clone() for p in agent.target.parameters()]
    fill(agent, 60)
    assert all(torch.equal(a, b) for a, b in zip(start, agent.target.parameters())), "60 steps: not synced yet"
    assert not same_numbers(agent.net, agent.target), "while the network itself has learned"


def test_frozen_copy_catches_up_every_sync_steps():
    from dqn import DQNAgent
    agent = DQNAgent(49, sync=100)
    fill(agent, 100)
    assert same_numbers(agent.net, agent.target), "step 100: copied"
    fill(agent, 50)
    assert not same_numbers(agent.net, agent.target), "step 150: the network has moved on again"


def test_frozen_copy_never_syncs_when_switched_off():
    from dqn import DQNAgent
    agent = DQNAgent(49, sync=0)
    fill(agent, 120)
    assert not same_numbers(agent.net, agent.target)


def test_big_maze_script_uses_the_tutorials_maze():
    import big_maze
    from qmaze import MAZE
    assert np.array_equal(big_maze.MAZE, MAZE) and big_maze.SETTINGS["sync"] > 0
```

`fill(agent, steps)` feeds the agent `steps` made-up transitions, each in a different cell, so the memory fills and learning starts. The tests then compare the two networks' numbers to see when the copy is refreshed.

```check
file tests/test_target.py -- Click "Create provided tests/test_target.py" above.
```

## A target that keeps moving

Look again at the target in `update`:

```text
target = reward + γ × (the best value the NETWORK predicts for the next view)
```

The target is computed **by the network being trained**. Every gradient step changes the network, so it changes the targets too, including the targets of the very next update. It's like trying to hit a mark that moves every time you adjust your aim, and moves because you adjusted it. In the table this hardly mattered: an update changed one number, and a target read a different one. A network's update changes its values everywhere at once, the next state's included. Errors can feed on themselves: a value that's too high makes the targets that use it too high, which pushes other values up, which raises the first value's own target.

The fix is to compute targets with a **frozen copy** of the network, the **target network**, and to refresh the copy only every so often, here every 500 moves. Between refreshes the targets stand still, so each stretch of training is ordinary supervised learning against fixed labels, the problem Chapter 4 showed networks are good at. Every 500 moves the copy catches up, and the next stretch aims at better labels.

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
    def __init__(self, size, gamma=0.95, epsilon=0.1, rate=1e-3, memory=1000, batch=32, updates=4, sync=0, seed=0):
        torch.manual_seed(seed)
        self.rng = np.random.default_rng(seed)
        self.net = make_net(size)
        self.optimiser = torch.optim.Adam(self.net.parameters(), lr=rate)
        self.gamma = gamma
        self.epsilon = epsilon
        self.batch = batch
        self.updates = updates
        self.memory = ReplayMemory(memory, self.rng)
        self.sync = sync
        self.steps = 0
        self.target = make_net(size)
        self.target.load_state_dict(self.net.state_dict())

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
            judge = self.target if self.sync else self.net
            targets = rewards + self.gamma * (1 - ended) * judge(next_obs).max(dim=1).values
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

The new parts:

- **`sync=0`**: how many moves between refreshes. 0 means no target network, which is how every earlier lesson ran, so their results don't change.
- **`self.target = make_net(size)`**, then **`load_state_dict(self.net.state_dict())`**: a second network with exactly the first one's numbers (lesson 5.3's saving and loading, without a file in between). It is never trained: nothing ever calls an optimiser on it.
- **`judge = self.target if self.sync else self.net`** in `update`: with a sync interval, targets come from the frozen copy; without one, from the network itself, as before. Note that `chosen`, the value being corrected, always comes from `self.net`: only the **labels** are frozen.

```check
run ".venv/Scripts/python -m pytest -q tests/test_target.py -k frozen_copy_starts" label="the frozen copy starts with exactly the network's numbers"
```

## Your turn: refreshing the copy

**Build, on your own:** the refresh, in `learn`.

At the end of `learn`, after the updates, count the move: `self.steps += 1`. Then, if `self.sync` is not 0 and `self.steps` is a multiple of `self.sync`, copy the network's numbers into the target network, the same way `__init__` did. `self.steps % self.sync == 0` is true exactly every `self.sync` moves.

```hints
nudge: Two things every move: count it, and maybe copy. When exactly should the copy happen?
concept: `self.steps += 1`, then `if self.sync and self.steps % self.sync == 0:` with `self.target.load_state_dict(self.net.state_dict())` inside. `if self.sync` is False for 0, so a switched-off agent never copies.
answer: The end of `learn` becomes:
~~~python
    def learn(self, obs, action, reward, next_obs, terminated):
        self.memory.add((obs, action, reward, next_obs, terminated))
        if len(self.memory) >= self.batch:
            for _ in range(self.updates):
                self.update(self.memory.sample(self.batch))
        self.steps += 1
        if self.sync and self.steps % self.sync == 0:
            self.target.load_state_dict(self.net.state_dict())
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_target.py -k frozen" label="the copy stays frozen between refreshes, catches up every sync moves, and never when switched off" -- self.steps += 1; if self.sync and self.steps % self.sync == 0: self.target.load_state_dict(self.net.state_dict()).
run ".venv/Scripts/python -m pytest -q tests/test_replay.py" label="and the replay tests still pass"
```

## The full maze

Create `big_maze.py`:

```python file=big_maze.py
from dqn import train_dqn
from qmaze import MAZE
from trained import save_agent

SETTINGS = {"sync": 500, "updates": 4}


if __name__ == "__main__":
    agent, solved_at = train_dqn(MAZE, episodes=600, check_every=20, **SETTINGS)
    save_agent(agent, "big_maze_dqn.pt")
    print("solved every start at episode", solved_at)
```

It trains on the tutorial's maze with a frozen copy refreshed every 500 moves, checks completion every 20 episodes, gives up after 600, and saves the network to `big_maze_dqn.pt`. Start it in the terminal and leave it running:

```powershell
.venv\Scripts\python big_maze.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_target.py -k big" label="big_maze.py trains on the tutorial's maze with a frozen copy"
run ".venv/Scripts/python -m pytest -q tests/test_target.py" label="all lesson 5.5 tests pass"
```

What was measured while this series was written:

| settings | seed | result after up to 600 episodes | time |
|---|---|---|---|
| no frozen copy (`sync=0`) | 0 | **15 of 74** starts solved at episode 600: not solved | 811 s |
| frozen copy, refreshed every 500 moves | 0 | every start solved at **episode 320** | 512 s |
| frozen copy, refreshed every 500 moves | 1 | every start solved at **episode 400** | 452 s |

(The three ran at the same time, sharing the computer, so each alone would be somewhat faster.) Without the frozen copy, 600 episodes weren't enough. With it, both seeds solved every start. On the small maze the frozen copy made no difference (lesson 5.2 solved it without one), because a small network on a small maze has less room for its errors to feed on each other. The bigger the problem, the more it matters, which is why every serious DQN uses one.

```predict
question: With a frozen copy refreshed every 500 moves, roughly how long will the full maze take on your machine?
explain: There's no right answer; it depends on your computer. On the machine this series was written on, it took about 8 minutes (512 seconds for seed 0, while two other trainings ran alongside). Every move does 4 gradient steps on batches of 32 through a network of 20,804 knobs, and an episode on this maze can be well over a hundred moves. That's why the small maze was used for learning, and why real deep reinforcement learning is run on graphics cards. If yours is still far from solving it after 600 episodes, that's an honest result too: DQN on this maze depends on the seed. Try another (`train_dqn(..., seed=1)`).
```

### What you've learned in this chapter

- deep Q-learning: Q-learning's target with a network's values, nudged by a gradient step on the action taken;
- why learning from each step as it happens fails (0 to 3 of 33 starts), and how **experience replay** fixes it (every start, by episode 80 to 180);
- saving and loading a network, judging it against breadth-first search, and drawing its policy;
- that a network trained on one maze learns one maze (0 of 33 starts on the flipped maze);
- the tutorial's Keras version, `Experience` and `qtrain`, mapped line by line onto yours;
- the **target network**, the second ingredient of DeepMind's DQN, and what it took to solve the full maze.

Both school problems are now solved twice: with tables, and with networks. Chapter 6 returns to CartPole, where networks have a real advantage: no bins, the four numbers go straight in.
