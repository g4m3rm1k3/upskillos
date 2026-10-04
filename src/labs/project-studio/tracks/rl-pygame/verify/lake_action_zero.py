# Lesson 8.2: which way is FrozenLake's action 0? Step right from the start, then take action 0.
import gymnasium as gym

env = gym.make("FrozenLake-v1", is_slippery=False)
env.reset(seed=0)
env.step(2)
state, *_ = env.step(0)
print("left" if state == 0 else state)
