# An MDP written out in full: a corridor of 5 cells. Start in cell 0; the goal is cell 4.
# The five parts: the states, the actions, P (transition), R (reward) and the discount.
STATES = [0, 1, 2, 3, 4]
ACTIONS = ["left", "right"]
GAMMA = 0.9
GOAL = 4


def transition(state, action):
    if action == "right":
        next_state = min(state + 1, GOAL)
    else:
        next_state = max(state - 1, 0)
    return next_state


def reward(next_state):
    if next_state == GOAL:
        return 1.0
    return 0.0


def play(policy, max_steps=8):
    state = 0
    rewards = []
    for t in range(max_steps):
        action = policy[state]
        next_state = transition(state, action)
        r = reward(next_state)
        rewards.append(r)
        state = next_state
        if state == GOAL:
            break
    return rewards


def discounted_return(rewards):
    total = 0.0
    for k in range(len(rewards)):
        total = total + GAMMA ** k * rewards[k]
    return total


def main():
    always_right = {0: "right", 1: "right", 2: "right", 3: "right"}
    goes_back = {0: "right", 1: "left", 2: "right", 3: "right"}
    rewards_right = play(always_right)
    rewards_back = play(goes_back)
    return discounted_return(rewards_right), discounted_return(rewards_back)
