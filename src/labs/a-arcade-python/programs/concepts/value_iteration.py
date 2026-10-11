# Values by the Bellman equation: the same 5-cell corridor, solved without playing at all.
# Each sweep, every cell's value becomes the best "reward + discounted value of where it leads".
STATES = [0, 1, 2, 3, 4]
ACTIONS = ["left", "right"]
GAMMA = 0.9
GOAL = 4


def transition(state, action):
    if action == "right":
        return min(state + 1, GOAL)
    return max(state - 1, 0)


def reward(next_state):
    if next_state == GOAL:
        return 1.0
    return 0.0


def value_iteration(sweeps=5):
    V = [0.0, 0.0, 0.0, 0.0, 0.0]
    for sweep in range(sweeps):
        new_V = [0.0, 0.0, 0.0, 0.0, 0.0]
        for state in STATES:
            if state == GOAL:
                continue
            best = None
            for action in ACTIONS:
                next_state = transition(state, action)
                value = reward(next_state) + GAMMA * V[next_state]
                if best is None or value > best:
                    best = value
            new_V[state] = best
        V = new_V
    return V
