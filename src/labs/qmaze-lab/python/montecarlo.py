import random

import numpy as np

from choosing import epsilon_greedy, linear


def play_episode(env, choose, seed=None):
    """One whole game, played by the function choose(state): (state, action, reward) for every move."""
    episode = []
    state, info = env.reset(seed=seed)
    done = False
    while not done:
        action = choose(state)
        next_state, reward, terminated, truncated, info = env.step(action)
        episode.append((state, action, reward))
        state = next_state
        done = terminated or truncated
    return episode


def mc_evaluate(env, episodes=500, gamma=0.95, first_visit=True, alpha=None, seed=0):
    """Estimate V for the random policy by averaging the whole return that followed each visit."""
    rng = random.Random(seed)
    V = np.zeros(env.n_states)
    counts = np.zeros(env.n_states)
    for e in range(episodes):
        episode = play_episode(env, lambda state: rng.randrange(env.n_actions), seed if e == 0 else None)
        first = {}
        for t, (state, action, reward) in enumerate(episode):
            first.setdefault(state, t)
        G = 0.0
        for t in reversed(range(len(episode))):
            state, action, reward = episode[t]
            G = reward + gamma * G
            if first_visit and first[state] < t:
                continue
            counts[state] += 1
            step = 1 / counts[state] if alpha is None else alpha
            V[state] += step * (G - V[state])
    return V


def train_mc_control(env, episodes=300, gamma=0.95, alpha=None,
                     epsilon_start=1.0, epsilon_end=0.05, seed=0):
    """Monte Carlo control: play a whole epsilon-greedy game, then move every Q[s, a] it used
    towards the return that followed its first use."""
    rng = random.Random(seed)
    Q = np.zeros((env.n_states, env.n_actions))
    counts = np.zeros((env.n_states, env.n_actions))
    totals = []
    for e in range(episodes):
        epsilon = linear(epsilon_start, epsilon_end, e / (0.8 * episodes))
        episode = play_episode(env, lambda state: epsilon_greedy(Q[state], epsilon, rng), seed if e == 0 else None)
        first = {}
        for t, (state, action, reward) in enumerate(episode):
            first.setdefault((state, action), t)
        G = 0.0
        for t in reversed(range(len(episode))):
            state, action, reward = episode[t]
            G = reward + gamma * G
            if first[(state, action)] < t:
                continue
            counts[state, action] += 1
            step = 1 / counts[state, action] if alpha is None else alpha
            Q[state, action] += step * (G - Q[state, action])
        total = 0.0
        for state, action, reward in episode:
            total += reward
        totals.append(total)
    return Q, totals
