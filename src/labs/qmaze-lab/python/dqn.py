import math
import random
from collections import deque

import torch
from torch import nn

from choosing import linear
from gridworld import GridWorld


def picture(env, marks=True):
    """What the network sees: two layers of numbers, one number per cell in each. First where the
    rat has been this game (1 = visited; all 0 if marks is False), then where it is now (1 in one cell)."""
    visited = [1.0 if marks and s in env.visited else 0.0 for s in range(env.n_states)]
    here = [1.0 if s == env.state else 0.0 for s in range(env.n_states)]
    return visited + here


def init_weights(layers, rng):
    """PyTorch's own starting rule for nn.Linear (uniform between -1/sqrt(inputs) and +1/sqrt(inputs)),
    drawn from Python's random numbers so that the browser's copy can draw exactly the same ones."""
    with torch.no_grad():
        for layer in layers:
            if isinstance(layer, nn.Linear):
                bound = 1 / math.sqrt(layer.in_features)
                rows, cols = layer.weight.shape
                weights = [[rng.uniform(-bound, bound) for _ in range(cols)] for _ in range(rows)]
                layer.weight.copy_(torch.tensor(weights, dtype=torch.float64))
                biases = [rng.uniform(-bound, bound) for _ in range(rows)]
                layer.bias.copy_(torch.tensor(biases, dtype=torch.float64))


class QNet(nn.Module):
    """A picture of the maze in; Q for each of the four moves out: a row of the Q-table, computed."""

    def __init__(self, n_inputs, hidden=64, rng=None):
        super().__init__()
        self.layers = nn.Sequential(nn.Linear(n_inputs, hidden), nn.ReLU(), nn.Linear(hidden, 4)).double()
        if rng is not None:
            init_weights(self.layers, rng)

    def forward(self, pictures):
        return self.layers(pictures)


class ReplayBuffer:
    """The last `capacity` moves, so that each update can learn from a random handful of old ones."""

    def __init__(self, capacity, rng):
        self.memory = deque(maxlen=capacity)
        self.rng = rng

    def add(self, seen, action, reward, next_seen, terminated):
        self.memory.append((seen, action, reward, next_seen, terminated))

    def sample(self, n):
        batch = [self.memory[self.rng.randrange(len(self.memory))] for _ in range(n)]
        seens, actions, rewards, next_seens, ends = zip(*batch)
        return (torch.tensor(seens, dtype=torch.float64), torch.tensor(actions),
                torch.tensor(rewards, dtype=torch.float64), torch.tensor(next_seens, dtype=torch.float64),
                torch.tensor(ends, dtype=torch.float64))

    def __len__(self):
        return len(self.memory)


def train_dqn(name="qmaze", steps=20000, hidden=64, batch_size=32, gamma=0.95, lr=0.001,
              buffer_size=10000, start_learning=500, sync_every=500,
              epsilon_start=1.0, epsilon_end=0.05, explore_steps=10000, marks=True, seed=0):
    rng = random.Random(seed)
    env = GridWorld(name)
    net = QNet(2 * env.n_states, hidden, rng)
    target_net = QNet(2 * env.n_states, hidden)
    target_net.load_state_dict(net.state_dict())
    optimizer = torch.optim.Adam(net.parameters(), lr=lr)
    buffer = ReplayBuffer(buffer_size, rng)
    env.reset(seed=seed)
    seen = picture(env, marks)
    totals = []
    total = 0.0
    for step in range(steps):
        epsilon = linear(epsilon_start, epsilon_end, step / explore_steps)
        if rng.random() < epsilon:
            action = rng.randrange(4)
        else:
            with torch.no_grad():
                action = int(net(torch.tensor(seen, dtype=torch.float64)).argmax())
        next_state, reward, terminated, truncated, info = env.step(action)
        total += reward
        next_seen = picture(env, marks)
        buffer.add(seen, action, reward, next_seen, terminated)
        seen = next_seen
        if terminated or truncated:
            totals.append(total)
            total = 0.0
            env.reset()
            seen = picture(env, marks)

        if len(buffer) >= start_learning:
            seens, actions, rewards, next_seens, ends = buffer.sample(batch_size)
            q = net(seens)[torch.arange(batch_size), actions]
            with torch.no_grad():
                best_next = target_net(next_seens).max(dim=1).values
                targets = rewards + gamma * (1 - ends) * best_next
            loss = ((q - targets) ** 2).mean()
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        if step % sync_every == 0:
            target_net.load_state_dict(net.state_dict())
    return net, totals


def greedy_game(net, name="qmaze", marks=True, seed=1000):
    """One game with no exploring, always the network's best move: its return and the cells visited."""
    env = GridWorld(name)
    env.reset(seed=seed)
    trail = [env.state]
    total = 0.0
    done = False
    while not done:
        with torch.no_grad():
            action = int(net(torch.tensor(picture(env, marks), dtype=torch.float64)).argmax())
        next_state, reward, terminated, truncated, info = env.step(action)
        total += reward
        trail.append(next_state)
        done = terminated or truncated
    return total, trail


def learn_dqn(name="qmaze", **settings):
    """DQN on one map, then one greedy game: the network, the training returns and the greedy result."""
    net, totals = train_dqn(name, **settings)
    total, trail = greedy_game(net, name, settings.get("marks", True))
    return net, totals, total, trail
