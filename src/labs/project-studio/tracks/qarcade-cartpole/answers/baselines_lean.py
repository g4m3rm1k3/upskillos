import gymnasium as gym
import numpy as np


def random_policy(obs, rng):
    return int(rng.integers(2))


def always_right(obs, rng):
    return 1


def lean(obs, rng):
    return 1 if obs[2] > 0 else 0


def play(policy, episodes=100, seed=0):
    env = gym.make("CartPole-v1")
    rng = np.random.default_rng(seed)
    lengths = []
    obs, _ = env.reset(seed=seed)
    for i in range(episodes):
        if i > 0:
            obs, _ = env.reset()
        steps = 0
        while True:
            obs, reward, terminated, truncated, _ = env.step(policy(obs, rng))
            steps += 1
            if terminated or truncated:
                break
        lengths.append(steps)
    return np.array(lengths)


if __name__ == "__main__":
    for policy in (random_policy, always_right, lean):
        lengths = play(policy)
        print(f"{policy.__name__:14} mean {lengths.mean():6.1f}  shortest {lengths.min()}  longest {lengths.max()}")
