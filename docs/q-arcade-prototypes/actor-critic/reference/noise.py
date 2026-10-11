import gymnasium as gym
import numpy as np
import torch

from policy import centre_and_scale, choose, discounted_returns, reinforce


def episode_gradient(net, env, gamma=0.99, baseline=False):
    obs, _ = env.reset()
    log_probs, rewards = [], []
    while True:
        action, log_prob = choose(net, obs)
        obs, reward, terminated, truncated, _ = env.step(action)
        log_probs.append(log_prob)
        rewards.append(reward)
        if terminated or truncated:
            break
    returns = discounted_returns(rewards, gamma)
    if baseline:
        returns = centre_and_scale(returns)
    net.zero_grad()
    loss = -(torch.stack(log_probs) * torch.tensor(returns, dtype=torch.float32)).sum()
    loss.backward()
    return torch.cat([p.grad.flatten() for p in net.parameters()]).numpy().copy()


def signal_to_noise(gradients):
    gradients = np.asarray(gradients)
    return float(np.linalg.norm(gradients.mean(axis=0)) / gradients.std(axis=0).mean())


def gradient_spread(net, baseline, episodes=100, seed=1):
    torch.manual_seed(seed)
    env = gym.make("CartPole-v1")
    env.reset(seed=seed)
    return signal_to_noise([episode_gradient(net, env, baseline=baseline) for _ in range(episodes)])


if __name__ == "__main__":
    torch.set_num_threads(1)
    net, lengths = reinforce(episodes=80)
    print(f"after 80 episodes of training, the last 10 games averaged {np.mean(lengths[-10:]):.1f} steps")
    for baseline in (False, True):
        print(f"baseline={baseline!s:5}  signal-to-noise {gradient_spread(net, baseline):.2f}")
