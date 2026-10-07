# Deep Q-learning

Q-learning stores one number for every state and action. The grid worlds had a few dozen states, so a table was fine. But most interesting problems have far too many states for a table, or states that are not even a list: a game screen is a grid of thousands of pixels, a robot's state is a set of angles and speeds, any of infinitely many real numbers. Two such states are almost never exactly the same, so a table would never see the same entry twice.

The answer is to **approximate** Q with a function that **generalises**: a neural network that takes the state as input and outputs one Q value per action. Similar states then share what has been learned. In 2013–2015, DeepMind's **deep Q-network** (DQN) did exactly this and learned to play 49 Atari games from the screen pixels alone, many at human level. Making it work needed two tricks, **experience replay** and a **target network**, because naively combining Q-learning with a neural network is unstable. This lesson builds a DQN in NumPy and trains it to balance a pole on a moving cart.

## The task: CartPole

A pole is hinged on top of a cart that can move along a track. Each step, the agent pushes the cart left or right. The pole starts nearly upright and falls unless the pushes keep it balanced. The episode ends when the pole tilts more than about 12° or the cart leaves the track; the reward is +1 for every step survived, up to a maximum of 200. The state is four real numbers: the cart's position and velocity, and the pole's angle and angular velocity.

```python type
import numpy as np

class CartPole:
    def __init__(self, seed=0):
        self.rng = np.random.default_rng(seed)

    def reset(self):
        self.state = self.rng.uniform(-0.05, 0.05, 4)
        self.steps = 0
        return self.state.copy()

    def step(self, action):
        x, x_dot, theta, theta_dot = self.state
        force = 10.0 if action == 1 else -10.0
        cos, sin = np.cos(theta), np.sin(theta)
        temp = (force + 0.05 * theta_dot ** 2 * sin) / 1.1
        theta_acc = (9.8 * sin - cos * temp) / (0.5 * (4 / 3 - 0.1 * cos ** 2 / 1.1))
        x_acc = temp - 0.05 * theta_acc * cos / 1.1
        self.state = np.array([x + 0.02 * x_dot, x_dot + 0.02 * x_acc, theta + 0.02 * theta_dot, theta_dot + 0.02 * theta_acc])
        self.steps += 1
        fell = abs(self.state[0]) > 2.4 or abs(self.state[2]) > 0.21
        return self.state.copy(), 1.0, fell or self.steps >= 200, fell

env = CartPole(seed=0)
rng = np.random.default_rng(0)
lengths = []
for episode in range(200):
    env.reset()
    for t in range(1, 201):
        _, _, done, _ = env.step(int(rng.integers(2)))
        if done:
            break
    lengths.append(t)
print(f"random pushes keep the pole up for {np.mean(lengths):.1f} steps on average")
```

```output
random pushes keep the pole up for 22.9 steps on average
```

The `step` method is the standard physics of a cart and pole (masses 1 kg and 0.1 kg, pole half-length 0.5 m, 0.02 seconds per step), integrated one small time step at a time; you do not need to follow the formulas. It returns the new state, the reward, whether the episode is over, and whether the pole actually **fell** (as opposed to the episode simply reaching its 200-step limit), which matters for the learning target.

Pushing at random keeps the pole up for only about 23 steps. There is no table to fill: the four numbers are continuous.

## Q-learning with a network

Replace the table with a network Q(s; θ) with weights θ: 4 inputs, a hidden layer of 64 ReLU units, and 2 outputs, one Q value per action. The Q-learning update becomes a regression problem: for a transition (s, a, r, s'), the **target** is

\[
y = r + \gamma \max_{a'} Q(s', a'; \theta)
\]

(or just r if the pole fell), and the network is trained to make Q(s, a; θ) close to y, by gradient descent on the squared error (Q(s, a; θ) − y)², exactly as in the regression lessons. Only the output for the action actually taken gets an error signal; the other output is left alone.

Done naively, one update per transition as it happens, this is unstable, for two reasons:

- **Correlated data**: consecutive transitions are nearly identical (the cart barely moves in 0.02 seconds), so the network sees long runs of near-duplicate examples and overfits to whatever situation it is currently in, forgetting the rest. Gradient descent assumes roughly independent examples.
- **A moving target**: the target y is computed with the same network that is being updated, so every update shifts the targets too. The network chases its own tail, and values can spiral out of control.

## Experience replay and the target network

DQN's two fixes:

- **Experience replay**: store every transition in a large **replay buffer** (here, the last 10,000), and train on **random mini-batches** drawn from it. Random sampling breaks the correlations, and each transition is reused many times, which makes learning far more data-efficient.
- **A target network**: keep a second, frozen copy of the network, θ⁻, used only to compute the targets: y = r + γ maxₐ' Q(s', a'; θ⁻). Copy the main network's weights into it only every few hundred steps. Between copies, the targets hold still, and the problem looks like ordinary supervised regression.

The agent acts ε-greedily on the main network, with ε decaying from 1 (pure exploration) to 0.05 over the first 3,000 steps. The inputs are scaled by typical magnitudes so they are all of similar size, as the networks lessons recommended. Training stops when the last 20 episodes average at least 195 steps. Before running, predict: roughly how many episodes will it take? (The cell takes several seconds.)

```python type
import numpy as np

class CartPole:
    def __init__(self, seed=0):
        self.rng = np.random.default_rng(seed)

    def reset(self):
        self.state = self.rng.uniform(-0.05, 0.05, 4)
        self.steps = 0
        return self.state.copy()

    def step(self, action):
        x, x_dot, theta, theta_dot = self.state
        force = 10.0 if action == 1 else -10.0
        cos, sin = np.cos(theta), np.sin(theta)
        temp = (force + 0.05 * theta_dot ** 2 * sin) / 1.1
        theta_acc = (9.8 * sin - cos * temp) / (0.5 * (4 / 3 - 0.1 * cos ** 2 / 1.1))
        x_acc = temp - 0.05 * theta_acc * cos / 1.1
        self.state = np.array([x + 0.02 * x_dot, x_dot + 0.02 * x_acc, theta + 0.02 * theta_dot, theta_dot + 0.02 * theta_acc])
        self.steps += 1
        fell = abs(self.state[0]) > 2.4 or abs(self.state[2]) > 0.21
        return self.state.copy(), 1.0, fell or self.steps >= 200, fell

def init(rng, hidden=64):
    return {"W1": rng.normal(0, np.sqrt(2 / 4), (4, hidden)), "b1": np.zeros(hidden),
            "W2": rng.normal(0, 0.01, (hidden, 2)), "b2": np.zeros(2)}

def forward(p, X):
    z = X @ p["W1"] + p["b1"]
    h = np.maximum(0, z)
    return z, h, h @ p["W2"] + p["b2"]

scale = np.array([2.4, 3.0, 0.21, 3.5])
rng = np.random.default_rng(0)
env = CartPole(seed=0)
online = init(rng)
target = {k: v.copy() for k, v in online.items()}
first = {k: np.zeros_like(v) for k, v in online.items()}
second = {k: np.zeros_like(v) for k, v in online.items()}
buffer, lengths, steps, updates = [], [], 0, 0

while len(lengths) < 400:
    state, length = env.reset() / scale, 0
    while True:
        epsilon = max(0.05, 1 - steps / 3000)
        action = int(rng.integers(2)) if rng.random() < epsilon else int(np.argmax(forward(online, state[None])[2][0]))
        nxt, reward, done, fell = env.step(action)
        nxt = nxt / scale
        buffer.append((state, action, reward, nxt, fell))
        buffer = buffer[-10000:]
        state, length, steps = nxt, length + 1, steps + 1

        if len(buffer) >= 500:
            batch = [buffer[i] for i in rng.integers(0, len(buffer), 64)]
            S, A, R, N, F = (np.array(column) for column in zip(*batch))
            y = R + 0.99 * (1 - F) * forward(target, N)[2].max(axis=1)
            z, h, q = forward(online, S)
            dq = np.zeros_like(q)
            dq[np.arange(64), A] = (q[np.arange(64), A] - y) / 64
            grads = {"W2": h.T @ dq, "b2": dq.sum(axis=0)}
            dz = dq @ online["W2"].T * (z > 0)
            grads["W1"], grads["b1"] = S.T @ dz, dz.sum(axis=0)
            updates += 1
            for k in online:
                first[k] = 0.9 * first[k] + 0.1 * grads[k]
                second[k] = 0.999 * second[k] + 0.001 * grads[k] ** 2
                online[k] -= 1e-3 * (first[k] / (1 - 0.9 ** updates)) / (np.sqrt(second[k] / (1 - 0.999 ** updates)) + 1e-8)
            if steps % 500 == 0:
                target = {k: v.copy() for k, v in online.items()}
        if done:
            break
    lengths.append(length)
    if len(lengths) >= 20 and np.mean(lengths[-20:]) >= 195:
        break

print(f"solved after {len(lengths)} episodes ({steps} steps); average length of the first 20 episodes {np.mean(lengths[:20]):.1f}, of the last 20 {np.mean(lengths[-20:]):.1f}")

test_env, test_lengths = CartPole(seed=99), []
for _ in range(20):
    state = test_env.reset() / scale
    for t in range(1, 201):
        state, _, done, _ = test_env.step(int(np.argmax(forward(online, state[None])[2][0])))
        state = state / scale
        if done:
            break
    test_lengths.append(t)
print(f"greedy policy on 20 new episodes: average {np.mean(test_lengths):.1f} steps (maximum 200)")
```

```output
solved after 135 episodes (6669 steps); average length of the first 20 episodes 21.6, of the last 20 199.9
greedy policy on 20 new episodes: average 199.5 steps (maximum 200)
```

`zip(*batch)` turns a list of transitions into columns (all states, all actions, …), which `np.array` stacks into arrays. The target uses `F`, "the pole fell": only a real failure has no future value. When an episode merely hits the 200-step limit, the pole was still up and its future was still worth something, so that transition keeps its bootstrapped target. The backward pass is the regression one from the networks lessons, applied only to the output of the action taken, and the update is Adam. Every 500 steps the target network is refreshed with a copy of the online network.

Training starts with random-looking episodes of about 20 steps. Once the buffer has enough experience and ε has fallen, episode lengths climb, and after a little over a hundred episodes the last 20 average 195 or more. The final test runs the **greedy** policy, with no exploration, on 20 fresh episodes: it keeps the pole up for the full 200 steps or close to it, against about 23 for random pushing. The network learned to balance from rewards alone.

## Notes from practice

- **Stability**: even with replay and a target network, DQN training is noisy; performance can collapse and recover. Common further fixes are the **Huber loss** (squared error for small errors, absolute error for large ones, so one bad target cannot produce a huge gradient), gradient clipping, and **double DQN**, the previous lesson's fix for maximisation bias: choose the next action with the online network but evaluate it with the target network.
- **From pixels**: for Atari, the network is a convolutional network reading the last four screen frames (stacked, so that it can see motion), with the same algorithm on top.
- **Limits**: DQN needs a small, discrete set of actions, since it takes a max over them. For continuous actions, like the force on a robot joint, other methods are used, including the policy gradients of the next lesson.

::: challenge Decaying exploration [easy]
Write `epsilon_at(step, start, end, decay_steps)` returning the exploration rate for a given step: falling linearly from `start` at step 0 to `end` at step `decay_steps`, and staying at `end` afterwards.

```python starter
def epsilon_at(step, start, end, decay_steps):
    return start

print([epsilon_at(s, 1.0, 0.05, 1000) for s in (0, 500, 1000, 5000)])
```

```python solution
def epsilon_at(step, start, end, decay_steps):
    if step >= decay_steps:
        return end
    return start + (end - start) * step / decay_steps

print([epsilon_at(s, 1.0, 0.05, 1000) for s in (0, 500, 1000, 5000)])
```

```python test
import math as _m
assert "epsilon_at" in dir(), "Keep the function's name as epsilon_at."
assert _m.isclose(epsilon_at(0, 1.0, 0.05, 1000), 1.0), "At step 0, epsilon should be the start value."
assert _m.isclose(epsilon_at(500, 1.0, 0.05, 1000), 0.525), "Halfway through the decay, epsilon should be halfway between start and end: 0.525."
assert _m.isclose(epsilon_at(1000, 1.0, 0.05, 1000), 0.05) and _m.isclose(epsilon_at(99999, 1.0, 0.05, 1000), 0.05), "From decay_steps onwards, epsilon stays at the end value."
assert _m.isclose(epsilon_at(250, 0.5, 0.1, 500), 0.3), "It should work for any start and end values."
"SUCCESS: Explore a lot while knowing nothing, less as the estimates become trustworthy."
```

Hint: Before `decay_steps`, the value is `start + (end - start) * step / decay_steps`; after, it is `end`.
:::

::: challenge A replay buffer [medium]
Write a class `ReplayBuffer` with a fixed `capacity`. `add(state, action, reward, next_state, done)` stores a transition; when full, it overwrites the **oldest** transition (a circular buffer: keep a position that wraps round with `% capacity`, instead of slicing a list). `__len__` returns how many transitions are stored. `sample(batch_size, rng)` draws `batch_size` stored transitions at random with `rng.integers(0, len(self), batch_size)` and returns five NumPy arrays: states, actions, rewards, next states and dones.

```python starter
import numpy as np

class ReplayBuffer:
    def __init__(self, capacity):
        self.capacity = capacity

    def add(self, state, action, reward, next_state, done):
        pass

    def __len__(self):
        return 0

    def sample(self, batch_size, rng):
        return None
```

```python solution
import numpy as np

class ReplayBuffer:
    def __init__(self, capacity):
        self.capacity = capacity
        self.items = []
        self.position = 0

    def add(self, state, action, reward, next_state, done):
        item = (state, action, reward, next_state, done)
        if len(self.items) < self.capacity:
            self.items.append(item)
        else:
            self.items[self.position] = item
        self.position = (self.position + 1) % self.capacity

    def __len__(self):
        return len(self.items)

    def sample(self, batch_size, rng):
        chosen = [self.items[i] for i in rng.integers(0, len(self), batch_size)]
        return tuple(np.array(column) for column in zip(*chosen))
```

```python test
import numpy as _np
assert "ReplayBuffer" in dir(), "Keep the class name ReplayBuffer."
_b = ReplayBuffer(3)
assert len(_b) == 0, "A new buffer is empty."
for _i in range(5):
    _b.add(_np.array([_i, _i]), _i % 2, float(_i), _np.array([_i + 1, _i + 1]), _i == 4)
assert len(_b) == 3, "A buffer of capacity 3 holds at most 3 transitions."
_S, _A, _R, _N, _D = _b.sample(200, _np.random.default_rng(0))
assert _np.shape(_S) == (200, 2) and _np.shape(_A) == (200,) and _np.shape(_D) == (200,), "sample should return arrays with one row per sampled transition."
assert set(_R.tolist()) == {2.0, 3.0, 4.0}, f"After adding 5 transitions to a buffer of 3, only the newest three (rewards 2, 3, 4) should remain; samples contained rewards {sorted(set(_R.tolist()))}."
assert all(_np.array_equal(_N[k], _S[k] + 1) for k in range(200)), "Each sampled row's next state should belong to the same transition as its state."
_b2 = ReplayBuffer(4)
for _i in range(6):
    _b2.add(_np.array([_i]), 0, float(_i), _np.array([_i]), False)
_r = _np.random.default_rng(1)
_idx = _np.random.default_rng(1).integers(0, 4, 10)
_s = _b2.sample(10, _r)
_stored = [4.0, 5.0, 2.0, 3.0]
assert _np.allclose(_s[2], [_stored[i] for i in _idx]), "Overwrite the oldest slot in place (position wraps with % capacity), and sample with rng.integers(0, len(self), batch_size)."
"SUCCESS: A fixed-size memory of recent experience, sampled at random to break up the correlations between consecutive steps."
```

Hint: Keep a list and a `position`. While the list is shorter than the capacity, append; afterwards, assign to `self.items[self.position]`. Either way, advance `position` with `(position + 1) % capacity`. For `sample`, `zip(*chosen)` groups the chosen transitions' fields into columns.
:::

::: challenge DQN and double DQN targets [medium]
Write `dqn_targets(rewards, next_q_target, dones, gamma)` returning the DQN targets for a batch: reward + γ × (the largest target-network Q value of the next state), with no future term where `done` is 1. Here `dones` is a float array of 0s and 1s, so `(1 - dones)` switches the future term off. (A buffer that stores `True`/`False` gives a boolean array; convert it with `dones.astype(float)` first.) `next_q_target` has one row per transition and one column per action.

Then write `double_dqn_targets(rewards, next_q_online, next_q_target, dones, gamma)`: choose each next action with the **online** network's values (`argmax` of `next_q_online`), but take its value from the **target** network's row.

```python starter
import numpy as np

def dqn_targets(rewards, next_q_target, dones, gamma):
    return np.asarray(rewards, dtype=float)

def double_dqn_targets(rewards, next_q_online, next_q_target, dones, gamma):
    return np.asarray(rewards, dtype=float)
```

```python solution
import numpy as np

def dqn_targets(rewards, next_q_target, dones, gamma):
    return rewards + gamma * (1 - dones) * next_q_target.max(axis=1)

def double_dqn_targets(rewards, next_q_online, next_q_target, dones, gamma):
    best = next_q_online.argmax(axis=1)
    return rewards + gamma * (1 - dones) * next_q_target[np.arange(len(best)), best]
```

```python test
import numpy as _np
assert "dqn_targets" in dir() and "double_dqn_targets" in dir(), "Keep both function names."
_r = _np.array([1.0, 1.0, 0.0])
_qt = _np.array([[2.0, 5.0], [3.0, 1.0], [9.0, 9.0]])
_qo = _np.array([[4.0, 0.0], [3.0, 1.0], [0.0, 0.0]])
_d = _np.array([0.0, 0.0, 1.0])
assert _np.allclose(dqn_targets(_r, _qt, _d, 0.9), [1 + 0.9 * 5, 1 + 0.9 * 3, 0.0]), "DQN targets use the largest target-network value of the next state, and nothing after a terminal transition."
assert _np.allclose(double_dqn_targets(_r, _qo, _qt, _d, 0.9), [1 + 0.9 * 2, 1 + 0.9 * 3, 0.0]), "Double DQN picks the next action with the online values (action 0 for the first row) but takes its value from the target network (2, not 5)."
_g = _np.random.default_rng(3)
_R, _QO, _QT = _g.normal(size=50), _g.normal(size=(50, 4)), _g.normal(size=(50, 4))
_D = (_g.random(50) < 0.2).astype(float)
assert (double_dqn_targets(_R, _QO, _QT, _D, 0.99) <= dqn_targets(_R, _QT, _D, 0.99) + 1e-12).all(), "A double DQN target can never exceed the plain DQN target: it evaluates one particular action, never more than the max."
"SUCCESS: The plain target takes the max of the target network's estimates; the double target lets the online network choose and the target network judge, which removes most of the overestimation."
```

Hint: `next_q_target.max(axis=1)` is the best value per row; `(1 - dones)` zeroes the future for terminal transitions. For double DQN, `next_q_online.argmax(axis=1)` gives the chosen actions, and `next_q_target[np.arange(n), chosen]` picks their values.
:::

## What you learned

- Large or continuous state spaces need function approximation: a neural network Q(s; θ) with one output per action generalises across similar states.
- The update is regression towards y = r + γ maxₐ' Q(s', a'), on the taken action's output only; a failure (not a time limit) has no future value.
- Naive online training is unstable (correlated data, moving targets). Experience replay trains on random mini-batches from a buffer of past transitions; a target network, copied every few hundred steps, holds the targets still.
- A NumPy DQN learned to balance CartPole from about 23 steps (random) to about 200 in a little over a hundred episodes.
- Further fixes include the Huber loss, gradient clipping and double DQN (online network chooses, target network evaluates). DQN needs discrete actions.

Every method so far learns values and acts by choosing the best one. The next lesson learns the policy itself: a network that outputs action probabilities, trained by pushing up the probability of actions that led to high returns.
