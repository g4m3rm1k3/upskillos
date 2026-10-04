# Lesson 6.3: which route does SARSA's greedy policy take on the cliff, in most of 20 runs?
from training import train
from watch_cliff import greedy_route, make_cliff, make_sarsa

top_row = 0
for seed in range(20):
    env = make_cliff()
    agent = make_sarsa(env, seed)
    train(env, agent, 500, seed=seed)
    route = greedy_route(make_cliff(), agent.Q)
    top_row += route is not None and min(row for row, _ in route) == 0
print("Along the top row, as far from the cliff as it can get" if top_row >= 12 else top_row)
