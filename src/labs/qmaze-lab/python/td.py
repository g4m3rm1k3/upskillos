import random

import numpy as np


def td0_evaluate(env, episodes=500, alpha=0.1, gamma=0.95, seed=0):
    """Estimate V for the random policy from experience alone: TD(0), one update per move."""
    rng = random.Random(seed)
    V = np.zeros(env.n_states)
    for episode in range(episodes):
        state, info = env.reset(seed=seed if episode == 0 else None)
        done = False
        while not done:
            action = rng.randrange(env.n_actions)
            next_state, reward, terminated, truncated, info = env.step(action)
            target = reward if terminated else reward + gamma * V[next_state]
            V[state] += alpha * (target - V[state])
            state = next_state
            done = terminated or truncated
    return V
