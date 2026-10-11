import gymnasium as gym
import numpy as np
import torch
from torch import nn


def make_policy(hidden=64):
    return nn.Sequential(nn.Linear(4, hidden), nn.Tanh(), nn.Linear(hidden, 2))


def probabilities(net, obs):
    with torch.no_grad():
        return torch.softmax(net(torch.tensor(obs, dtype=torch.float32)), dim=-1).numpy()


def choose(net, obs):
    dist = torch.distributions.Categorical(logits=net(torch.tensor(obs, dtype=torch.float32)))
    action = dist.sample()
    return int(action), dist.log_prob(action)


def discounted_returns(rewards, gamma):
    returns = np.zeros(len(rewards))
    running = 0.0
    for t in reversed(range(len(rewards))):
        running = rewards[t] + gamma * running
        returns[t] = running
    return returns


def reinforce(episodes=300, seed=0, gamma=0.99, rate=0.01):
    torch.manual_seed(seed)
    env = gym.make("CartPole-v1")
    net = make_policy()
    optimiser = torch.optim.Adam(net.parameters(), lr=rate)
    lengths = []
    obs, _ = env.reset(seed=seed)
    for episode in range(episodes):
        if episode > 0:
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
        loss = -(torch.stack(log_probs) * torch.tensor(returns, dtype=torch.float32)).sum()
        optimiser.zero_grad()
        loss.backward()
        optimiser.step()
        lengths.append(len(rewards))
    return net, lengths


def greedy_lengths(net, episodes=20, seed=1000):
    env = gym.make("CartPole-v1")
    lengths = []
    for i in range(episodes):
        obs, _ = env.reset(seed=seed + i)
        steps = 0
        while True:
            action = int(probabilities(net, obs).argmax())
            obs, _, terminated, truncated, _ = env.step(action)
            steps += 1
            if terminated or truncated:
                break
        lengths.append(steps)
    return np.array(lengths)


if __name__ == "__main__":
    torch.set_num_threads(1)
    net, lengths = reinforce()
    for start in range(0, len(lengths), 25):
        print(f"episodes {start + 1:3}-{start + 25:3}: average length {np.mean(lengths[start:start + 25]):6.1f}")
    print("greedy, 20 new games:", greedy_lengths(net).mean())
