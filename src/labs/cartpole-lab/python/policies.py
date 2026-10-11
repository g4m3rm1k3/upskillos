import random

from cartpole import CartPole, LEFT, RIGHT


def always_left(state, rng):
    """The same push every time, whatever happens."""
    return LEFT


def random_push(state, rng):
    """A coin toss: left or right, each half the time."""
    return rng.randrange(2)


def lean(state, rng):
    """Push the way the pole leans, so the cart runs back underneath it."""
    x, x_dot, theta, theta_dot = state
    if theta > 0:
        return RIGHT
    return LEFT


def lean_ahead(state, rng):
    """Push the way the pole will be leaning a moment from now: angle plus a little of its spin."""
    x, x_dot, theta, theta_dot = state
    if theta + 0.25 * theta_dot > 0:
        return RIGHT
    return LEFT


def play(policy, seed=0, env=None):
    """One game with a rule: how many steps the pole stayed up, and every state on the way."""
    if env is None:
        env = CartPole()
    rng = random.Random(seed)
    state, info = env.reset(seed=seed)
    trail = [state]
    total = 0.0
    done = False
    while not done:
        action = policy(state, rng)
        state, reward, terminated, truncated, info = env.step(action)
        total += reward
        trail.append(state)
        done = terminated or truncated
    return total, trail


def average_length(policy, games=100):
    """The rule's average game length over games played from seeds 0, 1, 2, ..."""
    lengths = []
    for seed in range(games):
        total, trail = play(policy, seed)
        lengths.append(total)
    return sum(lengths) / len(lengths), lengths
