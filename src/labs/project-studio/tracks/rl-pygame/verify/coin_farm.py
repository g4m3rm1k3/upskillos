# Lesson 7.5: what does Q-learning's greedy policy do on the coin map after 2000 episodes?
import numpy as np

from learners import QLearning
from reward_lab import make_scenario
from training import train

env, base = make_scenario("coin")
agent = QLearning(base.n_states, base.n_actions, np.random.default_rng(0), epsilon=0.1, gamma=0.9)
train(env, agent, 2000, seed=0)
env, _ = make_scenario("coin")
state, _ = env.reset()
cells = []
for _ in range(10):
    state, *_ = env.step(int(agent.Q[state].argmax()))
    cells.append(env.cell)
stays = all(cell == env.find("c") for cell in cells[2:])
print("Walks onto the coin and pushes against the edge until time runs out" if stays else cells)
