import random

import gymnasium as gym
import numpy as np

from cartpole import CartPole


def compare(steps=5000, seed=0):
    """Play this lab's CartPole and Gymnasium's side by side with the same pushes, from the same states."""
    ours = CartPole()
    theirs = gym.make("CartPole-v1").unwrapped
    rng = random.Random(seed)
    state, info = ours.reset(seed=seed)
    theirs.reset(seed=seed)
    theirs.state = np.array(state)
    largest_gap = 0.0
    disagreements = 0
    games = 0
    for t in range(steps):
        x, x_dot, theta, theta_dot = state
        action = rng.randrange(2) if rng.random() < 0.3 else int(theta + 0.25 * theta_dot > 0)
        state, reward, terminated, truncated, info = ours.step(action)
        observation, their_reward, their_terminated, their_truncated, their_info = theirs.step(action)
        gap = max(abs(a - b) for a, b in zip(state, theirs.state))
        largest_gap = max(largest_gap, gap)
        if reward != their_reward or terminated != their_terminated:
            disagreements += 1
        if terminated or truncated:
            games += 1
            state, info = ours.reset()
            theirs.reset()
            theirs.state = np.array(state)
    print("games:", games, "largest difference in any number:", largest_gap, "disagreements:", disagreements)
    return largest_gap, disagreements, games
