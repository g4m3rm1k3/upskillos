import random

from gridworld import GridWorld


def play_random(name="cheese_and_cat", seed=7):
    """One episode with an agent that picks every move at random."""
    env = GridWorld(name)
    rng = random.Random(seed)
    state, info = env.reset(seed=seed)
    total = 0.0
    trail = [state]
    done = False
    while not done:
        action = rng.randrange(env.n_actions)
        next_state, reward, terminated, truncated, info = env.step(action)
        total += reward
        trail.append(next_state)
        state = next_state
        done = terminated or truncated
    return total, trail
