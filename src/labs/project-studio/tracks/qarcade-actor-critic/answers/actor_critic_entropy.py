import numpy as np
import torch
from torch import nn


class ActorCritic(nn.Module):
    def __init__(self, hidden=64):
        super().__init__()
        self.body = nn.Sequential(nn.Linear(4, hidden), nn.Tanh())
        self.actor = nn.Linear(hidden, 2)
        self.critic = nn.Linear(hidden, 1)

    def forward(self, obs):
        h = self.body(obs)
        return self.actor(h), self.critic(h).squeeze(-1)


def entropy(probs):
    probs = np.asarray(probs, dtype=float)
    used = probs[probs > 0]
    return float((used * np.log(1 / used)).sum())
