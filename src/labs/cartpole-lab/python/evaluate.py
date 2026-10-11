import random

from choosing import greedy_action


def greedy_lengths(Q, env, games=20, seed=1000):
    """Play with no exploring at all, always the table's best push: how long each game lasts."""
    rng = random.Random(seed)
    lengths = []
    for game in range(games):
        state, info = env.reset(seed=seed + game)
        total = 0.0
        done = False
        while not done:
            action = greedy_action(Q[state], rng)
            state, reward, terminated, truncated, info = env.step(action)
            total += reward
            done = terminated or truncated
        lengths.append(total)
    return lengths
