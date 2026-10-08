---
title: 5.4 — The Tutorial's Way, in Keras
runtime: python
run: tutorial_keras.py
---

Your PyTorch agent and the tutorial's Keras one learn the same way: Q-learning targets, a network and a replay memory. They differ in how they turn a batch of memories into a gradient step. This lesson builds the tutorial's version, its `Experience` class and its `qtrain` loop, so that your course's code will hold no surprises, and so you can see that two quite different-looking programs compute nearly the same thing.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_tutorial_keras.py** above.

```python file=tests/test_tutorial_keras.py provided
# Tests for tutorial_keras.py (lesson 5.4).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_tutorial_keras.py
import numpy as np
import pytest
from pytest import approx

pytestmark = pytest.mark.filterwarnings("ignore::DeprecationWarning:keras")


def small_model():
    from maze_net import build_model
    return build_model(49)


def test_remember_keeps_the_newest_episodes():
    from tutorial_keras import Experience
    experience = Experience(small_model(), max_memory=3)
    for i in range(5):
        experience.remember(i)
    assert experience.memory == [2, 3, 4]


def test_predicts_four_values_for_one_maze_view():
    from tutorial_keras import Experience
    values = Experience(small_model()).predict(np.zeros(49))
    assert values.shape == (4,)


def test_targets_change_only_the_action_taken():
    from tutorial_keras import Experience
    model = small_model()
    experience = Experience(model)
    view = np.zeros(49)
    view[3] = 0.5
    experience.remember((view, 2, 1.0, view, True))
    inputs, targets = experience.get_data(1)
    before = experience.predict(view)
    assert np.allclose(np.delete(targets[0], 2), np.delete(before, 2), atol=1e-6), "the other three keep the network's own values"
    assert targets[0, 2] == approx(1.0), "the game ended: the target is the reward"


def test_targets_add_the_discounted_best_next_value():
    from tutorial_keras import Experience
    model = small_model()
    experience = Experience(model, discount=0.5)
    view, after = np.zeros(49), np.zeros(49)
    after[5] = 0.5
    experience.remember((view, 0, -0.04, after, False))
    _, targets = experience.get_data(1)
    assert targets[0, 0] == approx(-0.04 + 0.5 * experience.predict(after).max(), abs=1e-5)


def test_targets_batch_is_at_most_the_memory():
    from tutorial_keras import Experience
    experience = Experience(small_model())
    for i in range(3):
        experience.remember((np.zeros(49), i, 0.0, np.zeros(49), False))
    inputs, targets = experience.get_data(10)
    assert inputs.shape == (3, 49) and targets.shape == (3, 4)


def test_qtrain_runs_and_reports():
    from tutorial_keras import qtrain
    model, solved_at = qtrain(episodes=2, check_every=1)
    assert solved_at is None or solved_at <= 2
```

`test_targets_change_only_the_action_taken` is the key one. `np.delete(targets[0], 2)` is the target row with position 2 removed, so it compares the **other three** targets with what the network itself predicts. They must be equal: the tutorial's targets leave every action but the one taken exactly where the network already is.

```check
file tests/test_tutorial_keras.py -- Click "Create provided tests/test_tutorial_keras.py" above.
```

## The tutorial's memory

Create `tutorial_keras.py`:

```python file=tutorial_keras.py
import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras
import numpy as np


class Experience:
    def __init__(self, model, max_memory=1000, discount=0.95):
        self.model = model
        self.max_memory = max_memory
        self.discount = discount
        self.memory = []

    def remember(self, episode):
        self.memory.append(episode)
        if len(self.memory) > self.max_memory:
            del self.memory[0]

    def predict(self, envstate):
        return keras.ops.convert_to_numpy(self.model(envstate.reshape(1, -1)))[0]

```

This is the tutorial's `Experience` class, almost word for word:

- **`remember(episode)`**: despite the name, an "episode" here is one **transition**, `[envstate, action, reward, envstate_next, game_over]`. It's the same five things your `ReplayMemory` stores. A plain list with `del self.memory[0]` keeps the newest `max_memory`, as your `deque(maxlen=…)` does.
- **`predict(envstate)`** is your `values(obs)`: the network's four values for one view of the maze. The tutorial writes `self.model.predict(envstate)[0]`. Calling the model directly, `self.model(…)`, gives the same numbers without `predict`'s per-call overhead, which matters when it's called thousands of times. `convert_to_numpy` turns the backend's tensor into an array.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tutorial_keras.py -k remember" label="remember keeps the newest transitions"
run ".venv/Scripts/python -m pytest -q tests/test_tutorial_keras.py -k predicts" label="predict gives four values for one view of the maze"
```

## Your turn: the tutorial's targets

**Build, on your own:** `get_data(self, data_size=10)` in `Experience`.

Keras's `fit` wants **inputs and full target rows**: for each input, the four outputs the network should give. But a transition only says something about the one action that was taken. The tutorial's trick is to make the target row **the network's own current prediction, with one entry replaced**:

```text
network's values for this view:   [ 0.31,  0.12,  0.40, -0.05 ]     the rat went RIGHT (2)
target row:                       [ 0.31,  0.12,  0.73, -0.05 ]     only the RIGHT entry changes
```

For the three untouched actions, prediction and target are equal, so their error is zero and they contribute nothing to the slopes. Only the action taken is pushed towards its Q-learning target. It's a different way to write what your PyTorch `update` does with `gather`, which picks out the taken action's value and ignores the rest.

Write `get_data` so that it:

1. chooses `min(len(self.memory), data_size)` different memories at random (`np.random.choice(…, replace=False)`, as the tutorial does);
2. makes `inputs` (each chosen memory's `envstate`) and the starting `targets` (the model's predictions for all of them, in one call: `keras.ops.convert_to_numpy(self.model(inputs))`);
3. for each chosen memory, replaces its taken action's entry with `reward` if `game_over`, otherwise `reward + self.discount * (the best value the model predicts for envstate_next)`;
4. returns `inputs, targets`.

The tutorial calls `self.predict` twice **per memory**, inside its loop. Predicting all the views in two calls, one for the current views and one for the next (`self.model(next_inputs)`, then `.max(axis=1)`), gives the same numbers with two calls instead of two per memory.

```hints
nudge: The new part is step 3: a loop that changes one entry per row.
concept: `targets[i, action] = reward if game_over else reward + self.discount * best_next[i]`, where `best_next` is the model's output for all the next views, maxed over the four actions.
answer: Add to `Experience`:
~~~python
    def get_data(self, data_size=10):
        chosen = np.random.choice(len(self.memory), min(len(self.memory), data_size), replace=False)
        inputs = np.array([self.memory[j][0] for j in chosen])
        next_inputs = np.array([self.memory[j][3] for j in chosen])
        targets = keras.ops.convert_to_numpy(self.model(inputs))
        best_next = keras.ops.convert_to_numpy(self.model(next_inputs)).max(axis=1)
        for i, j in enumerate(chosen):
            _, action, reward, _, game_over = self.memory[j]
            targets[i, action] = reward if game_over else reward + self.discount * best_next[i]
        return inputs, targets
~~~
`enumerate(chosen)` gives `i`, the row in this batch, alongside `j`, the position in the memory.
```

**One real difference from `gather`.** Keras's `"mse"` averages the squared error over **all four** outputs of each row, three of which are zero. So the loss, and every slope, is a quarter of what your PyTorch `update` computes for the same batch, which works like a learning rate four times smaller. The direction of every step is the same.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tutorial_keras.py -k targets" label="get_data builds target rows that change only the action taken" -- Start from the model's own predictions for the chosen views, then set targets[i, action] to the reward, plus discount times the best next value unless the game ended.
```

## The tutorial's training loop

Make `tutorial_keras.py` this:

```python file=tutorial_keras.py
import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import time

import keras
import numpy as np

from maze_net import NetworkAgent, build_model
from maze_tools import completion
from new_maze import observe
from qmaze import QMaze
from seen_maze import SMALL_MAZE


class Experience:
    def __init__(self, model, max_memory=1000, discount=0.95):
        self.model = model
        self.max_memory = max_memory
        self.discount = discount
        self.memory = []

    def remember(self, episode):
        self.memory.append(episode)
        if len(self.memory) > self.max_memory:
            del self.memory[0]

    def predict(self, envstate):
        return keras.ops.convert_to_numpy(self.model(envstate.reshape(1, -1)))[0]

    def get_data(self, data_size=10):
        chosen = np.random.choice(len(self.memory), min(len(self.memory), data_size), replace=False)
        inputs = np.array([self.memory[j][0] for j in chosen])
        next_inputs = np.array([self.memory[j][3] for j in chosen])
        targets = keras.ops.convert_to_numpy(self.model(inputs))
        best_next = keras.ops.convert_to_numpy(self.model(next_inputs)).max(axis=1)
        for i, j in enumerate(chosen):
            _, action, reward, _, game_over = self.memory[j]
            targets[i, action] = reward if game_over else reward + self.discount * best_next[i]
        return inputs, targets


def qtrain(maze=SMALL_MAZE, episodes=400, epochs_per_step=1, data_size=32, epsilon=0.1, seed=0, check_every=10):
    keras.utils.set_random_seed(seed)
    rng = np.random.default_rng(seed)
    env = QMaze(maze, random_start=True)
    env.reset(seed=seed)
    model = build_model(maze.size)
    experience = Experience(model)
    start = time.perf_counter()
    for episode in range(1, episodes + 1):
        if episode > 1:
            env.reset()
        envstate = observe(env)
        while True:
            if rng.random() < epsilon:
                action = int(rng.integers(4))
            else:
                action = int(np.argmax(experience.predict(envstate)))
            _, reward, terminated, truncated, _ = env.step(action)
            next_envstate = observe(env)
            experience.remember((envstate, action, reward, next_envstate, terminated))
            envstate = next_envstate
            inputs, targets = experience.get_data(data_size)
            model.fit(inputs, targets, epochs=epochs_per_step, batch_size=16, verbose=0)
            if terminated or truncated:
                break
        if episode % check_every == 0:
            wins, total = completion(NetworkAgent(model, maze), maze)
            print(f"episode {episode:3}: solves {wins} of {total} starts  ({time.perf_counter() - start:.0f} s)", flush=True)
            if wins == total:
                return model, episode
    return model, None


if __name__ == "__main__":
    model, solved_at = qtrain()
    print("solved every start at episode", solved_at)
```

`qtrain` follows the tutorial's loop, step for step. Every move:

1. choose an action: random with probability ε, otherwise the best predicted;
2. take it, and **remember** the transition;
3. **`get_data`**: a batch of up to `data_size` random memories, with their target rows;
4. **`model.fit(inputs, targets, epochs=…, batch_size=16)`**: one or more passes of gradient steps over that batch, in minibatches of 16.

Then every 10 episodes, the completion check, with lesson 4.5's `NetworkAgent`.

Where it differs from the published `qtrain`, and why:

| the tutorial | here | why |
|---|---|---|
| `epochs=8` in `fit`: 8 passes over each batch, every move | `epochs_per_step=1` by default | 8 passes cost 8 times as much per move. Measured on this maze with an earlier draft of this file, 8 epochs solved it in only 50 episodes, but took 175 seconds to do so. This file, with 1 epoch, took 170 to 230 episodes and two to three minutes. Pass `epochs_per_step=8` to try the tutorial's setting |
| random actions from `valid_actions()` only | any of the four | your agent pays for walls (lesson 3.2) and learns not to bump them |
| a win counter, then ε lowered to 0.05 at a 90% win rate | fixed ε, completion check every 10 episodes | the same stopping test, simpler bookkeeping |
| `game_over` is True for a loss as well | `terminated`: only reaching the cheese | lesson 3.5: running out of reward isn't an ending |

Run it: `.venv\Scripts\python tutorial_keras.py`. It takes two to three minutes.

```predict
question: The PyTorch agent solved the small maze around episode 180 (seed 0). Around which episode will the tutorial's Keras method?
choice: Much sooner, around 50
choice: About the same, around 200
choice: Never, within 400
answer: About the same, around 200
explain: Episode 210 for seed 0; seeds 1 and 2 solved it at 170 and 230. That's the same learning: memories, targets and gradient steps, written two ways. It took longer on the clock, 122 to 155 seconds (measured with other training running at the same time), against 17 to 46 seconds for PyTorch. Each Keras `fit` call has a fixed overhead, and this loop calls it after every move, thousands of times.
verify: script keras_episode.py
```

```text
episode  10: solves 1 of 33 starts  (8 s)
episode  20: solves 7 of 33 starts  (12 s)
…
episode 200: solves 29 of 33 starts  (152 s)
episode 210: solves 33 of 33 starts  (155 s)
solved every start at episode 210
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_tutorial_keras.py -k qtrain" label="qtrain plays, remembers, fits and checks completion"
run ".venv/Scripts/python -m pytest -q tests/test_tutorial_keras.py" label="all lesson 5.4 tests pass"
```

### What you have

The tutorial's agent, as published apart from the four changes in the table above, each explained. You can now read any of the many QMaze variants that started from it, and map every line onto your own PyTorch agent. Last lesson in this chapter: the full 10 × 10 maze, and what it takes to make deep Q-learning stable on it.
