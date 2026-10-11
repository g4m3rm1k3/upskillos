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


def advantage(reward, value, next_value, terminated, gamma=0.99):
    future = 0.0 if terminated else gamma * next_value
    return reward + future - value


def a2c_loss(logits, values, actions, returns, value_coef=0.5, entropy_coef=0.01):
    dist = torch.distributions.Categorical(logits=logits)
    advantages = returns - values
    policy_loss = -(dist.log_prob(actions) * advantages.detach()).mean()
    value_loss = advantages.pow(2).mean()
    entropy_bonus = dist.entropy().mean()
    loss = policy_loss + value_coef * value_loss - entropy_coef * entropy_bonus
    return loss, {"policy": policy_loss.item(), "value": value_loss.item(), "entropy": entropy_bonus.item()}
