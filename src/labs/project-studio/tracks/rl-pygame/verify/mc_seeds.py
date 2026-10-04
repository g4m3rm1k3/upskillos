# Lesson 6.1: of 10 seeds, how many Monte Carlo learners end with a greedy policy worth the optimum?
from watch_mc import GAMMA, make
from training import greedy_value, train

optimal = 0
for seed in range(10):
    env, agent = make(seed)
    train(env, agent, 2000, seed=seed)
    optimal += abs(greedy_value(env, agent.Q, GAMMA)[0] - 0.9 ** 7) < 1e-6
print("About 8 of 10" if 7 <= optimal <= 9 else optimal)
