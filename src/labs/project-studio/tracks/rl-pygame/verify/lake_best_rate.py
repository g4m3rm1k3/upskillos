# Lesson 8.2: how often does the optimal FrozenLake policy reach the goal (3000 judged episodes)?
from frozen import GAMMA, make_lake, success_rate, tables_from_gym
from planning import q_from_v, value_iteration

env = make_lake()
P, R, terminal = tables_from_gym(env.unwrapped.P, 16, 4)
V, _ = value_iteration(P, R, terminal, GAMMA, tolerance=1e-10)
rate, _ = success_rate(q_from_v(P, R, V, GAMMA), episodes=3000)
print(round(rate, 2))
