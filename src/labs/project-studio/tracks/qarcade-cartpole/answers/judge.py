import numpy as np

from train import run_episode


def evaluate(agent, env, episodes=20, seed=1000):
    saved = agent.epsilon
    agent.epsilon = 0.0
    lengths = [run_episode(env, agent, learn=False, seed=seed if i == 0 else None) for i in range(episodes)]
    agent.epsilon = saved
    return np.array(lengths)


def standard_error(values):
    values = np.asarray(values, dtype=float)
    return values.std(ddof=1) / np.sqrt(len(values))
