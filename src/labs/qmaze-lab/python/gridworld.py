import random

from maps import MAPS

LEFT, UP, RIGHT, DOWN = 0, 1, 2, 3
ACTION_NAMES = ["left", "up", "right", "down"]
MOVES = [(0, -1), (-1, 0), (0, 1), (1, 0)]


class GridWorld:
    """One map as an MDP: numbered states, four actions, and the transition table P."""

    def __init__(self, name):
        layout = MAPS[name]
        self.name = name
        self.rows = layout["rows"]
        self.n_rows = len(self.rows)
        self.n_cols = len(self.rows[0])
        self.n_states = self.n_rows * self.n_cols
        self.n_actions = 4
        self.step_reward = layout["step"]
        self.bump_reward = layout.get("bump", layout["step"])
        self.revisit_reward = layout.get("revisit")
        self.intended = layout.get("intended", 1.0)
        self.cells = layout["cells"]
        self.max_steps = layout.get("max_steps", 100)
        self.start = self.find("S")
        self.P = self.build_transitions()
        self.rng = random.Random()
        self.state = self.start

    def to_state(self, row, col):
        return row * self.n_cols + col

    def to_cell(self, state):
        return divmod(state, self.n_cols)

    def letter(self, state):
        row, col = self.to_cell(state)
        return self.rows[row][col]

    def find(self, letter):
        for row in range(self.n_rows):
            for col in range(self.n_cols):
                if self.rows[row][col] == letter:
                    return self.to_state(row, col)
        return None

    def is_end(self, state):
        return self.cells.get(self.letter(state), {}).get("end", False)

    def move(self, state, action):
        """Where one move really goes, and what entering there pays."""
        row, col = self.to_cell(state)
        d_row, d_col = MOVES[action]
        new_row, new_col = row + d_row, col + d_col
        off_grid = not (0 <= new_row < self.n_rows and 0 <= new_col < self.n_cols)
        if off_grid or self.rows[new_row][new_col] == "#":
            return state, self.bump_reward, False
        new_state = self.to_state(new_row, new_col)
        rule = self.cells.get(self.letter(new_state))
        if rule is None:
            return new_state, self.step_reward, False
        if rule.get("to_start"):
            return self.start, rule["reward"], False
        return new_state, rule["reward"], rule.get("end", False)

    def build_transitions(self):
        """P[s][a] = list of (probability, next_state, reward, terminated)."""
        side = (1 - self.intended) / 2
        P = {}
        for state in range(self.n_states):
            P[state] = {}
            for action in range(self.n_actions):
                if self.is_end(state) or self.letter(state) == "#":
                    P[state][action] = [(1.0, state, 0.0, True)]
                elif self.intended == 1.0:
                    P[state][action] = [(1.0, *self.move(state, action))]
                else:
                    P[state][action] = [
                        (side, *self.move(state, (action - 1) % 4)),
                        (self.intended, *self.move(state, action)),
                        (side, *self.move(state, (action + 1) % 4)),
                    ]
        return P

    def reset(self, seed=None):
        if seed is not None:
            self.rng.seed(seed)
        self.state = self.start
        self.steps = 0
        self.visited = {self.start}
        return self.state, {}

    def step(self, action):
        outcomes = self.P[self.state][action]
        u = self.rng.random()
        for probability, next_state, reward, terminated in outcomes:
            u -= probability
            if u < 0:
                break
        if self.revisit_reward is not None and next_state in self.visited and next_state != self.state:
            reward = self.revisit_reward
        self.visited.add(next_state)
        self.state = next_state
        self.steps += 1
        truncated = self.steps >= self.max_steps and not terminated
        return next_state, reward, terminated, truncated, {}
