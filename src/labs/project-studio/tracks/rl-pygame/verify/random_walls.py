# Lesson 4.2: how a random agent's episodes end on the walls map, over 2000 episodes.
import numpy as np

from agents import RandomAgent
from grid import MAPS, GridWorld

name = "walls"
env = GridWorld(MAPS[name], max_steps=100)
env.reset(seed=0)
agent = RandomAgent(env.n_actions, np.random.default_rng(1))
goals = 0
for _ in range(2000):
    state, _ = env.reset()
    while True:
        state, reward, terminated, truncated, _ = env.step(agent.act(state))
        if terminated or truncated:
            goals += terminated and reward > 0
            break
share = goals / 2000
print({"walls": "about 1 in 5", "lake": "about 1 in 100"}[name] if (0.12 < share < 0.28 if name == "walls" else share < 0.03) else share)
