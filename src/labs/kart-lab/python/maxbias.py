"""Maximisation bias on the smallest possible problem (Sutton and Barto's Example 6.7), and Double Q-learning's fix.

State 0 is A, state 1 is B. From A, Right (action 1) ends the episode with reward 0; Left (action 0)
goes to B with reward 0. In B, each of 10 actions ends the episode with a random reward that averages
−0.1. So Left is the worse choice, but its rewards are noisy."""
import random


def best(values, rng):
    """The index of the biggest value, ties broken at random."""
    top = max(values)
    return rng.choice([i for i in range(len(values)) if values[i] == top])


def act(tables, method, s, epsilon, rng):
    """ε-greedy in state s, by one table's values or, for Double Q-learning, both tables added."""
    if method == "double":
        values = [x + y for x, y in zip(tables[0][s], tables[1][s])]
    else:
        values = tables[0][s]
    if rng.random() < epsilon:
        return rng.randrange(len(values))
    return best(values, rng)


def update(tables, method, s, a, reward, next_s, alpha, rng):
    """One Q-learning or Double Q-learning update. next_s is None when the episode has ended."""
    Q, other = tables[0], tables[0]
    if method == "double":
        if rng.random() < 0.5:
            Q, other = tables[0], tables[1]
        else:
            Q, other = tables[1], tables[0]
    future = 0.0
    if next_s is not None:
        chosen = best(Q[next_s], rng)
        future = other[next_s][chosen]
    Q[s][a] += alpha * (reward + future - Q[s][a])


def run(method="q", episodes=300, alpha=0.1, epsilon=0.1, actions=10, seed=0):
    """One run: for each episode, 1 if the agent went Left from A, else 0."""
    rng = random.Random(seed)
    tables = [[[0.0, 0.0], [0.0] * actions], [[0.0, 0.0], [0.0] * actions]]
    lefts = []
    for episode in range(episodes):
        a = act(tables, method, 0, epsilon, rng)
        lefts.append(1 if a == 0 else 0)
        if a == 1:
            update(tables, method, 0, 1, 0.0, None, alpha, rng)
            continue
        update(tables, method, 0, 0, 0.0, 1, alpha, rng)
        b = act(tables, method, 1, epsilon, rng)
        update(tables, method, 1, b, rng.uniform(-1.1, 0.9), None, alpha, rng)
    return lefts


def left_rate(method="q", runs=1000, episodes=300):
    """The fraction of runs that went Left, at each episode, averaged over many runs."""
    totals = [0] * episodes
    for seed in range(runs):
        for i, left in enumerate(run(method, episodes, seed=seed)):
            totals[i] += left
    return [t / runs for t in totals]
