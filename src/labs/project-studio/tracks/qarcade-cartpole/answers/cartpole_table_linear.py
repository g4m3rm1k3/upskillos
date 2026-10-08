import gymnasium as gym
import numpy as np

from bins import COUNTS, LIMITS, make_edges, state_index


class TableCartPole:
    n_actions = 2

    def __init__(self, counts=COUNTS, limits=LIMITS):
        self.env = gym.make("CartPole-v1")
        self.counts = counts
        self.edges = [make_edges(count, limit) for count, limit in zip(counts, limits)]
        self.n_states = int(np.prod(counts))
        self.obs = None

    def reset(self, seed=None):
        self.obs, info = self.env.reset(seed=seed)
        return state_index(self.obs, self.edges, self.counts), info

    def step(self, action):
        self.obs, reward, terminated, truncated, info = self.env.step(action)
        return state_index(self.obs, self.edges, self.counts), reward, terminated, truncated, info


def linear(start, end, progress):
    return start + (end - start) * min(progress, 1.0)
