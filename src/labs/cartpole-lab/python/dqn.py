import random
from collections import deque

import torch
from torch import nn

from cartpole import CartPole
from choosing import linear


class QNet(nn.Module):
    """The 4 numbers in; Q(s, push left) and Q(s, push right) out: a Q-table row, computed instead of looked up."""

    def __init__(self, hidden=64):
        super().__init__()
        self.layers = nn.Sequential(nn.Linear(4, hidden), nn.ReLU(), nn.Linear(hidden, hidden), nn.ReLU(), nn.Linear(hidden, 2))

    def forward(self, states):
        return self.layers(states)


class ReplayBuffer:
    """The last `capacity` moves, kept so that learning can draw a random handful of old ones."""

    def __init__(self, capacity, rng):
        self.memory = deque(maxlen=capacity)
        self.rng = rng

    def add(self, state, action, reward, next_state, terminated):
        self.memory.append((state, action, reward, next_state, terminated))

    def sample(self, n):
        batch = self.rng.sample(self.memory, n)
        states, actions, rewards, next_states, ends = zip(*batch)
        return (torch.tensor(states), torch.tensor(actions), torch.tensor(rewards),
                torch.tensor(next_states), torch.tensor(ends, dtype=torch.float32))

    def __len__(self):
        return len(self.memory)


def train_dqn(steps=50000, batch_size=64, gamma=0.99, lr=0.0005, buffer_size=50000,
              start_learning=1000, sync_every=1000, epsilon_start=1.0, epsilon_end=0.05,
              explore_steps=15000, seed=0):
    torch.manual_seed(seed)
    rng = random.Random(seed)
    env = CartPole()
    net = QNet()
    target_net = QNet()
    target_net.load_state_dict(net.state_dict())
    optimizer = torch.optim.Adam(net.parameters(), lr=lr)
    buffer = ReplayBuffer(buffer_size, rng)
    state, info = env.reset(seed=seed)
    lengths = []
    for step in range(steps):
        epsilon = linear(epsilon_start, epsilon_end, step / explore_steps)
        if rng.random() < epsilon:
            action = rng.randrange(2)
        else:
            with torch.no_grad():
                action = int(net(torch.tensor(state)).argmax())
        next_state, reward, terminated, truncated, info = env.step(action)
        buffer.add(state, action, reward, next_state, terminated)
        state = next_state
        if terminated or truncated:
            lengths.append(env.steps)
            state, info = env.reset()

        if len(buffer) >= start_learning:
            states, actions, rewards, next_states, ends = buffer.sample(batch_size)
            q = net(states)[torch.arange(batch_size), actions]
            with torch.no_grad():
                best_next = target_net(next_states).max(dim=1).values
                targets = rewards + gamma * (1 - ends) * best_next
            loss = ((q - targets) ** 2).mean()
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        if step % sync_every == 0:
            target_net.load_state_dict(net.state_dict())
    return net, lengths
