import numpy as np


def q_from_v(P, V, state, gamma):
    """Q(s, a) for every action: what each move is worth if values after it are V."""
    q = np.zeros(len(P[state]))
    for action, outcomes in P[state].items():
        for probability, next_state, reward, terminated in outcomes:
            future = 0.0 if terminated else gamma * V[next_state]
            q[action] += probability * (reward + future)
    return q


def evaluate_policy(P, policy, gamma, theta=1e-10, max_sweeps=10_000):
    """V for one fixed policy: policy[s][a] is the probability of choosing a in s."""
    V = np.zeros(len(P))
    for sweep in range(max_sweeps):
        biggest_change = 0.0
        for state in range(len(P)):
            new_value = np.dot(policy[state], q_from_v(P, V, state, gamma))
            biggest_change = max(biggest_change, abs(new_value - V[state]))
            V[state] = new_value
        if biggest_change < theta:
            break
    return V, sweep + 1


def value_iteration(P, gamma, theta=1e-10, max_sweeps=10_000):
    """V* and Q*: the best that can be expected from each state, and from each move."""
    V = np.zeros(len(P))
    for sweep in range(max_sweeps):
        biggest_change = 0.0
        for state in range(len(P)):
            new_value = q_from_v(P, V, state, gamma).max()
            biggest_change = max(biggest_change, abs(new_value - V[state]))
            V[state] = new_value
        if biggest_change < theta:
            break
    Q = np.array([q_from_v(P, V, state, gamma) for state in range(len(P))])
    return V, Q, sweep + 1


def greedy_policy(Q):
    """The best action in each state (the first one when several tie)."""
    return Q.argmax(axis=1)
