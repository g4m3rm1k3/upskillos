def greedy_action(q_row, rng):
    """The best action in one row of the Q-table; a tie is settled at random."""
    best = max(q_row)
    ties = [action for action in range(len(q_row)) if q_row[action] == best]
    return rng.choice(ties)


def epsilon_greedy(q_row, epsilon, rng):
    """Explore with probability epsilon, otherwise take the best action."""
    if rng.random() < epsilon:
        return rng.randrange(len(q_row))
    return greedy_action(q_row, rng)


def linear(start, end, progress):
    """A value that slides from start to end as progress goes from 0 to 1."""
    progress = min(progress, 1.0)
    return start + (end - start) * progress
