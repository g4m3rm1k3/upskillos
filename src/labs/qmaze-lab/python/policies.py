import numpy as np


def uniform_policy(n_states, n_actions=4):
    """Every action equally likely in every state: pi(a|s) = 1 / n_actions."""
    return np.full((n_states, n_actions), 1.0 / n_actions)


def deterministic_policy(actions, n_actions=4):
    """One chosen action per state, written as a table of probabilities (1 for it, 0 for the rest)."""
    table = np.zeros((len(actions), n_actions))
    for state, action in enumerate(actions):
        table[state, action] = 1.0
    return table


def epsilon_greedy_policy(Q, epsilon):
    """The probabilities epsilon_greedy really uses: epsilon / n on every action, and the rest
    shared equally by the actions tied for best (greedy_action picks one of them at random)."""
    n_states, n_actions = Q.shape
    table = np.full((n_states, n_actions), epsilon / n_actions)
    for state in range(n_states):
        best = Q[state].max()
        ties = [action for action in range(n_actions) if Q[state, action] == best]
        for action in ties:
            table[state, action] += (1.0 - epsilon) / len(ties)
    return table
