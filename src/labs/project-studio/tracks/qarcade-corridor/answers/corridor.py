LEFT, RIGHT = 0, 1
COIN, START, TREASURE = 0, 1, 4


class Corridor:
    n_states = 5
    n_actions = 2

    def __init__(self, max_steps=20):
        self.max_steps = max_steps
        self.cell = START
        self.steps = 0

    def reset(self, seed=None):
        self.cell = START
        self.steps = 0
        return self.cell, {}

    def step(self, action):
        if action == RIGHT:
            self.cell += 1
        else:
            self.cell -= 1
        self.steps += 1
        reward = 0.0
        terminated = False
        if self.cell == COIN:
            reward = 0.1
            terminated = True
        elif self.cell == TREASURE:
            reward = 1.0
            terminated = True
        truncated = not terminated and self.steps >= self.max_steps
        return self.cell, reward, terminated, truncated, {}
