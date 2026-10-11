import numpy as np


def make_table(n_states, n_actions):
    return np.zeros((n_states, n_actions))


def greedy(row, rng):
    best = np.flatnonzero(row == row.max())
    return int(rng.choice(best))
