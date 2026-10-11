"""How much does each episode's REINFORCE gradient vary, with and without a baseline? Same policy throughout."""
import time

import gymnasium as gym
import numpy as np
import torch

from proto import discounted_returns, make_policy

torch.set_num_threads(1)


def episode_gradient(net, env, gamma, scale):
    obs, _ = env.reset()
    log_probs, rewards = [], []
    while True:
        dist = torch.distributions.Categorical(logits=net(torch.tensor(obs, dtype=torch.float32)))
        a = dist.sample()
        log_probs.append(dist.log_prob(a))
        obs, r, term, trunc, _ = env.step(int(a))
        rewards.append(r)
        if term or trunc:
            break
    G = torch.tensor(discounted_returns(rewards, gamma), dtype=torch.float32)
    if scale == "mean":
        G = G - G.mean()
    elif scale == "normalise":
        G = (G - G.mean()) / (G.std() + 1e-8)
    net.zero_grad()
    (-(torch.stack(log_probs) * G).sum()).backward()
    return torch.cat([p.grad.flatten() for p in net.parameters()]).numpy().copy()


import sys
from proto import reinforce
start = time.perf_counter()
pre = int(sys.argv[1]) if len(sys.argv) > 1 else 0
if pre:
    net, lengths = reinforce(episodes=pre, seed=0)
    print("pretrained", pre, "episodes; last 10 average", sum(lengths[-10:]) / 10)
else:
    torch.manual_seed(0)
    net = make_policy()
env = gym.make("CartPole-v1")
env.reset(seed=0)
for scale in ("none", "mean", "normalise"):
    torch.manual_seed(1)
    grads = np.array([episode_gradient(net, env, 0.99, scale) for _ in range(100)])
    mean = grads.mean(axis=0)
    spread = grads.std(axis=0)
    cos = float(mean @ grads.mean(axis=0) / (np.linalg.norm(mean) ** 2 + 1e-12))
    print(scale, "mean |g|", round(float(np.linalg.norm(mean)), 3), "avg sd per knob", round(float(spread.mean()), 3),
          "signal/noise", round(float(np.linalg.norm(mean) / spread.mean()), 3))
print("seconds", round(time.perf_counter() - start, 1))
