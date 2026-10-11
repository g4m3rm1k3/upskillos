import random

import numpy as np

from choosing import epsilon_greedy, linear


def sarsa_update(Q, state, action, reward, next_state, next_action, terminated, alpha, gamma):
    """Move Q[state, action] a step of size alpha towards the SARSA target."""
    if terminated:
        target = reward
    else:
        target = reward + gamma * Q[next_state, next_action]
    td_error = target - Q[state, action]
    Q[state, action] += alpha * td_error
    return td_error


def train_sarsa(env, episodes=500, alpha=0.1, gamma=0.99,
                epsilon_start=1.0, epsilon_end=0.01, initial_q=0.0, seed=0):
    rng = random.Random(seed)
    Q = np.full((env.n_states, env.n_actions), initial_q)
    totals = []
    for episode in range(episodes):
        epsilon = linear(epsilon_start, epsilon_end, episode / (0.8 * episodes))
        state, info = env.reset(seed=seed if episode == 0 else None)
        action = epsilon_greedy(Q[state], epsilon, rng)
        total = 0.0
        done = False
        while not done:
            next_state, reward, terminated, truncated, info = env.step(action)
            next_action = epsilon_greedy(Q[next_state], epsilon, rng)
            sarsa_update(Q, state, action, reward, next_state, next_action, terminated, alpha, gamma)
            total += reward
            state, action = next_state, next_action
            done = terminated or truncated
        totals.append(total)
    return Q, totals
