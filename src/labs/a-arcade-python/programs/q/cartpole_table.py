import gymnasium as gym
import numpy as np

from agent import QAgent
from bins import COUNTS, LIMITS, make_edges, state_index
from train import run_episode


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


def train_cartpole(episodes=500, seed=0, alpha=0.1, alpha_end=None, gamma=0.99, counts=COUNTS):
    env = TableCartPole(counts)
    agent = QAgent(env.n_states, env.n_actions, alpha=alpha, gamma=gamma, epsilon=1.0, seed=seed)
    lengths = []
    for episode in range(episodes):
        agent.epsilon = linear(1.0, 0.01, episode / (0.8 * episodes))
        if alpha_end is not None:
            agent.alpha = linear(alpha, alpha_end, episode / episodes)
        lengths.append(run_episode(env, agent, seed=seed if episode == 0 else None))
    return agent, env, lengths


if __name__ == "__main__":
    agent, env, lengths = train_cartpole()
    for start in range(0, len(lengths), 50):
        block = lengths[start:start + 50]
        print(f"episodes {start + 1:3}-{start + len(block):3}: average {np.mean(block):5.1f} steps")
