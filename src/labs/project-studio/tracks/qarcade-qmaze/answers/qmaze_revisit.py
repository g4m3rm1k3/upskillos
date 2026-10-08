import numpy as np

LEFT, UP, RIGHT, DOWN = 0, 1, 2, 3
MOVES = {LEFT: (0, -1), UP: (-1, 0), RIGHT: (0, 1), DOWN: (1, 0)}
FREE, WALL = 1.0, 0.0
REWARDS = {"cheese": 1.0, "move": -0.04, "revisit": -0.25, "wall": -0.75}

MAZE = np.array([
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
    [0, 0, 1, 0, 0, 1, 0, 1, 1, 1],
    [1, 1, 0, 1, 0, 1, 0, 0, 0, 1],
    [1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
], dtype=float)


class QMaze:
    n_actions = 4

    def __init__(self, maze=MAZE, start=(0, 0), rewards=REWARDS):
        self.maze = np.array(maze, dtype=float)
        self.rows, self.cols = self.maze.shape
        self.n_states = self.rows * self.cols
        self.target = (self.rows - 1, self.cols - 1)
        self.free_cells = [(r, c) for r in range(self.rows) for c in range(self.cols)
                           if self.maze[r, c] == FREE and (r, c) != self.target]
        self.start = start
        self.rewards = rewards
        self.reset()

    def reset(self, seed=None):
        self.cell = self.start
        self.visited = set()
        self.total = 0.0
        return self.state(), {}

    def state(self):
        row, col = self.cell
        return row * self.cols + col

    def is_free(self, row, col):
        return 0 <= row < self.rows and 0 <= col < self.cols and self.maze[row, col] == FREE

    def step(self, action):
        self.visited.add(self.cell)
        row, col = self.cell
        d_row, d_col = MOVES[action]
        if self.is_free(row + d_row, col + d_col):
            self.cell = (row + d_row, col + d_col)
            if self.cell == self.target:
                reward = self.rewards["cheese"]
            elif self.cell in self.visited:
                reward = self.rewards["revisit"]
            else:
                reward = self.rewards["move"]
        else:
            reward = self.rewards["wall"]
        self.total += reward
        terminated = self.cell == self.target
        truncated = False
        return self.state(), reward, terminated, truncated, {}
