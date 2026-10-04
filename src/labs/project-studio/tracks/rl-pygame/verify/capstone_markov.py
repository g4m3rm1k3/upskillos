# Lesson 8.4: in the reference delivery task, what does Q-learning learn if the state forgets the parcel?
# Self-contained (a copy of the reference rules), because this runs before capstone_env.py is written.
import numpy as np

from evaluation import greedy_returns
from grid import GridWorld
from learners import QLearning
from training import train

LAYOUT = ["S...P", ".##..", "...#.", ".#...", "D...."]


class ForgetfulDelivery:
    def __init__(self):
        self.grid = GridWorld(LAYOUT, max_steps=10**9)
        self.parcel, self.depot = self.grid.find("P"), self.grid.find("D")
        self.carrying = False
        self.steps = 0

    def reset(self, seed=None):
        self.grid.reset(seed=seed)
        self.carrying, self.steps = False, 0
        return self.grid.state_of(self.grid.cell), {}

    def step(self, action):
        self.grid.cell = self.grid.next_cell(self.grid.cell, int(action))
        self.steps += 1
        self.carrying = self.carrying or self.grid.cell == self.parcel
        delivered = self.carrying and self.grid.cell == self.depot
        reward = 1.0 if delivered else -0.01
        return self.grid.state_of(self.grid.cell), reward, delivered, not delivered and self.steps >= 200, {}


scores = []
for seed in range(5):
    agent = QLearning(25, 4, np.random.default_rng(seed), epsilon=0.1, gamma=0.95, step=0.1)
    train(ForgetfulDelivery(), agent, 2000, seed=seed)
    scores.append(greedy_returns(ForgetfulDelivery(), agent.Q, 100, 1.0, seed=10_000 + seed).mean())
print("It never delivers the parcel" if max(scores) < -1.5 else scores)
