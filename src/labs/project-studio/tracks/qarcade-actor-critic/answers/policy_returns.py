import gymnasium as gym
import numpy as np
import torch
from torch import nn


def make_policy(hidden=64):
    return nn.Sequential(nn.Linear(4, hidden), nn.Tanh(), nn.Linear(hidden, 2))


def probabilities(net, obs):
    with torch.no_grad():
        return torch.softmax(net(torch.tensor(obs, dtype=torch.float32)), dim=-1).numpy()


def discounted_returns(rewards, gamma):
    returns = np.zeros(len(rewards))
    running = 0.0
    for t in reversed(range(len(rewards))):
        running = rewards[t] + gamma * running
        returns[t] = running
    return returns
