# Lesson 7.3: after 3000 episodes (step 1/N, epsilon 0.1), how do the estimates compare with the true Q?
import numpy as np

from evaluate_view import make_env
from grid import ENDS
from learners import QLearning
from mdp import tables
from planning import q_from_v, value_iteration
from training import greedy_value, train

env = make_env()
P, R, terminal = tables(env)
V, _ = value_iteration(P, R, terminal, 0.9)
true_Q = q_from_v(P, R, V, 0.9)
live = [s for s in range(env.n_states) if env.tile(env.cell_of(s)) not in ENDS + "#"]
gaps, values = [], []
for seed in range(5):
    env = make_env()
    agent = QLearning(env.n_states, env.n_actions, np.random.default_rng(seed), epsilon=0.1, gamma=0.9)
    train(env, agent, 3000, seed=seed)
    gaps.append((agent.Q[live] - true_Q[live]).mean())
    values.append(greedy_value(env, agent.Q, 0.9)[0])
ok = np.mean(gaps) < -0.15 and np.mean(values) > 0.25
print("Well below the truth, yet the policy is close to optimal" if ok else (np.mean(gaps), np.mean(values)))
