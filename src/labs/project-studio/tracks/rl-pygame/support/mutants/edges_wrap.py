# Mutant edges_wrap: walking off one edge brings you back on the opposite edge
import numpy as np

from chance import sample, slip_distribution
from qtable import ACTIONS

# What arriving on a tile pays. Every other tile pays the step reward.
REWARDS = {"G": 1.0, "H": -1.0}
ENDS = "GH"          # tiles that end an episode

MAPS = {
    "open": ["S....",
             ".....",
             ".....",
             ".....",
             "....G"],
    "walls": ["S..#.",
              ".#.#.",
              ".#...",
              ".##H.",
              "....G"],
    "lake": ["S...",
             ".H.H",
             "...H",
             "H..G"],
}


class GridWorld:
    def __init__(self, layout, slip=0.0, max_steps=100, step_reward=0.0, rewards=None):
        if len({len(row) for row in layout}) != 1:
            raise ValueError("every row of the map must be the same length")
        self.layout = list(layout)
        self.rows, self.cols = len(layout), len(layout[0])
        self.slip = slip
        self.max_steps = max_steps
        self.step_reward = step_reward
        self.rewards = REWARDS if rewards is None else rewards
        self.start = self.find("S")
        self.rng = np.random.default_rng()
        self.cell = self.start
        self.steps = 0

    @property
    def n_states(self):
        return self.rows * self.cols

    @property
    def n_actions(self):
        return len(ACTIONS)

    def find(self, tile):
        for row, line in enumerate(self.layout):
            col = line.find(tile)
            if col >= 0:
                return (row, col)
        raise ValueError(f"the map has no {tile!r} tile")

    def tile(self, cell):
        return self.layout[cell[0]][cell[1]]

    def state_of(self, cell):
        return cell[0] * self.cols + cell[1]

    def cell_of(self, state):
        return divmod(state, self.cols)

    def next_cell(self, cell, action):
        row = cell[0] + ACTIONS[action][0]
        col = cell[1] + ACTIONS[action][1]
        row, col = row % self.rows, col % self.cols
        if self.tile((row, col)) == "#":
            return cell
        return (row, col)

    def reset(self, seed=None):
        if seed is not None:
            self.rng = np.random.default_rng(seed)
        self.cell = self.start
        self.steps = 0
        return self.state_of(self.cell), {}

    def step(self, action):
        actual = action
        if self.slip > 0:
            actual = sample(slip_distribution(action, self.slip), self.rng)
        self.cell = self.next_cell(self.cell, actual)
        self.steps += 1
        tile = self.tile(self.cell)
        reward = self.rewards.get(tile, self.step_reward)
        terminated = tile in ENDS
        truncated = not terminated and self.steps >= self.max_steps
        return self.state_of(self.cell), reward, terminated, truncated, {"slid": actual != action}
