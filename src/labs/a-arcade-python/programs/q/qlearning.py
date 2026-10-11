def nudge(estimate, target, alpha):
    return estimate + alpha * (target - estimate)


def q_target(reward, next_row, terminated, gamma):
    if terminated:
        return reward
    return reward + gamma * next_row.max()


def q_update(Q, state, action, reward, next_state, terminated, alpha, gamma):
    target = q_target(reward, Q[next_state], terminated, gamma)
    Q[state, action] = nudge(Q[state, action], target, alpha)
