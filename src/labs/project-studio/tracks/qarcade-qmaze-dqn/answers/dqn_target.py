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
        self.steps += 1
        if self.sync and self.steps % self.sync == 0:
            self.target.load_state_dict(self.net.state_dict())

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
