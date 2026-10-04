# Lesson 7.5: with a 0.2 bonus beside the goal, how many of 20 learners never enter the goal?
import numpy as np

from grid import GridWorld
from learners import QLearning
from shaping import MAZE, NearGoalBonus
from training import train
from watch_cliff import greedy_route

hover = 0
for seed in range(20):
    maze = GridWorld(MAZE, max_steps=200)
    agent = QLearning(maze.n_states, maze.n_actions, np.random.default_rng(seed), epsilon=0.1, gamma=0.9)
    train(NearGoalBonus(maze, 0.2), agent, 500, seed=seed)
    hover += greedy_route(GridWorld(MAZE, max_steps=200), agent.Q, limit=100) is None
print("Shuffling beside it for ever" if 6 <= hover <= 14 else hover)
