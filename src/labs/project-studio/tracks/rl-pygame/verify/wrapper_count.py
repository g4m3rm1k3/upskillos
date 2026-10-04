# Lesson 8.1: how many wrappers does gym.make put around GymGrid?
import gymnasium as gym

import gym_grid  # noqa: F401

env = gym.make("GridWorld-v0")
count = 0
while isinstance(env, gym.Wrapper):
    env, count = env.env, count + 1
print(count)
