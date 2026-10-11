import random

import numpy as np

from choosing import epsilon_greedy, linear


def q_learning_update(Q, state, action, reward, next_state, terminated, alpha, gamma):
    """Move Q[state, action] a step of size alpha towards the Q-learning target."""
    if terminated:
        target = reward
    else:
        target = reward + gamma * Q[next_state].max()
    td_error = target - Q[state, action]
    Q[state, action] += alpha * td_error
    return td_error


def train_q_learning(env, episodes=300, alpha=0.5, gamma=0.95,
                     epsilon_start=1.0, epsilon_end=0.05, initial_q=0.0, seed=0):
    rng = random.Random(seed)
    Q = np.full((env.n_states, env.n_actions), initial_q)
    totals = []
    for episode in range(episodes):
        epsilon = linear(epsilon_start, epsilon_end, episode / (0.8 * episodes))
        state, info = env.reset(seed=seed if episode == 0 else None)
        total = 0.0
        done = False
        while not done:
            action = epsilon_greedy(Q[state], epsilon, rng)
            next_state, reward, terminated, truncated, info = env.step(action)
            q_learning_update(Q, state, action, reward, next_state, terminated, alpha, gamma)
            total += reward
            state = next_state
            done = terminated or truncated
        totals.append(total)
    return Q, totals
