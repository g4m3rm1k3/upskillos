# Q-learning on the 5-cell corridor: a 5 × 2 table, small enough to watch every number.
# Action 0 is left, 1 is right. Reaching cell 4 pays 1 and ends the game.
import random

GAMMA = 0.9
ALPHA = 0.5
EPSILON = 0.2
GOAL = 4


def transition(state, action):
    if action == 1:
        return min(state + 1, GOAL)
    return max(state - 1, 0)


def choose(Q, state, rng):
    if rng.random() < EPSILON:
        return rng.randrange(2)
    if Q[state][0] > Q[state][1]:
        return 0
    if Q[state][1] > Q[state][0]:
        return 1
    return rng.randrange(2)


def train(episodes=20, seed=0):
    rng = random.Random(seed)
    Q = [[0.0, 0.0] for _ in range(5)]
    for episode in range(episodes):
        state = 0
        while state != GOAL:
            action = choose(Q, state, rng)
            next_state = transition(state, action)
            reward = 1.0 if next_state == GOAL else 0.0
            future = 0.0 if next_state == GOAL else max(Q[next_state])
            target = reward + GAMMA * future
            Q[state][action] = Q[state][action] + ALPHA * (target - Q[state][action])
            state = next_state
    return Q
