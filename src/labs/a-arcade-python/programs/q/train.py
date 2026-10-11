def run_episode(env, agent, learn=True, seed=None):
    state, _ = env.reset(seed=seed)
    total = 0.0
    while True:
        action = agent.act(state)
        next_state, reward, terminated, truncated, _ = env.step(action)
        if learn:
            agent.learn(state, action, reward, next_state, terminated)
        total += reward
        state = next_state
        if terminated or truncated:
            return total


def train(env, agent, episodes, seed=None):
    totals = []
    for i in range(episodes):
        totals.append(run_episode(env, agent, seed=seed if i == 0 else None))
    return totals
