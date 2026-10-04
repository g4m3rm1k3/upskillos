# Lesson 8.2: does the learned policy (seed 0) match the optimal policy's arrows?
from frozen import GAMMA, arrow_map, make_lake, tables_from_gym, trained_agent
from planning import q_from_v, value_iteration

env = make_lake()
P, R, terminal = tables_from_gym(env.unwrapped.P, 16, 4)
V, _ = value_iteration(P, R, terminal, GAMMA, tolerance=1e-10)
same = arrow_map(trained_agent(0).Q) == arrow_map(q_from_v(P, R, V, GAMMA))
print("The same arrows, cell for cell" if same else "different")
