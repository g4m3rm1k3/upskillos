import numpy as np

COUNTS = (1, 1, 6, 12)
LIMITS = (2.4, 3.0, 0.21, 3.5)


def make_edges(count, limit):
    return np.linspace(-limit, limit, count + 1)[1:-1]


def bin_index(value, edges):
    return int(np.digitize(value, edges))


def state_index(obs, edges, counts):
    index = 0
    for value, value_edges, count in zip(obs, edges, counts):
        index = index * count + bin_index(value, value_edges)
    return index
