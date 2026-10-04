# Lesson 8.3: how many steps does a random agent keep the pole up, on average (500 episodes)?
import gymnasium as gym
import numpy as np

from agents import RandomAgent
from training import train

lengths = train(gym.make("CartPole-v1"), RandomAgent(2, np.random.default_rng(0)), 500, seed=0)
print(round(lengths.mean()))
