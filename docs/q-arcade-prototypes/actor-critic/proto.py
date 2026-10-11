"""Prototype for Q-Arcade Chapter 4: REINFORCE, baseline, A2C on CartPole. Measure before writing."""
import json
import sys
import time

import gymnasium as gym
import numpy as np
import torch
from torch import nn

torch.set_num_threads(1)


def discounted_returns(rewards, gamma):
    out = np.zeros(len(rewards))
    running = 0.0
    for t in reversed(range(len(rewards))):
        running = rewards[t] + gamma * running
        out[t] = running
    return out


def make_policy(hidden=64):
    return nn.Sequential(nn.Linear(4, hidden), nn.Tanh(), nn.Linear(hidden, 2))


def evaluate(net_logits, episodes=20, seed=1000):
    env = gym.make("CartPole-v1")
    lengths = []
    for i in range(episodes):
        obs, _ = env.reset(seed=seed + i)
        total = 0
        while True:
            with torch.no_grad():
                a = int(net_logits(torch.tensor(obs, dtype=torch.float32)).argmax())
            obs, r, term, trunc, _ = env.step(a)
            total += r
            if term or trunc:
                break
        lengths.append(total)
    return np.array(lengths)


def reinforce(episodes=500, seed=0, baseline=False, gamma=0.99, lr=1e-2):
    torch.manual_seed(seed)
    env = gym.make("CartPole-v1")
    net = make_policy()
    opt = torch.optim.Adam(net.parameters(), lr=lr)
    lengths = []
    obs, _ = env.reset(seed=seed)
    for ep in range(episodes):
        if ep:
            obs, _ = env.reset()
        logps, rewards = [], []
        while True:
            dist = torch.distributions.Categorical(logits=net(torch.tensor(obs, dtype=torch.float32)))
            a = dist.sample()
            logps.append(dist.log_prob(a))
            obs, r, term, trunc, _ = env.step(int(a))
            rewards.append(r)
            if term or trunc:
                break
        G = torch.tensor(discounted_returns(rewards, gamma), dtype=torch.float32)
        if baseline:
            G = (G - G.mean()) / (G.std() + 1e-8)
        loss = -(torch.stack(logps) * G).sum()
        opt.zero_grad()
        loss.backward()
        opt.step()
        lengths.append(len(rewards))
    return net, lengths


class ActorCritic(nn.Module):
    def __init__(self, hidden=64):
        super().__init__()
        self.body = nn.Sequential(nn.Linear(4, hidden), nn.Tanh())
        self.policy = nn.Linear(hidden, 2)
        self.value = nn.Linear(hidden, 1)

    def forward(self, obs):
        h = self.body(obs)
        return self.policy(h), self.value(h).squeeze(-1)


def a2c(total_steps=100_000, seed=0, n_envs=8, n_steps=5, gamma=0.99, lr=7e-4, value_coef=0.5, entropy_coef=0.01):
    torch.manual_seed(seed)
    envs = gym.vector.SyncVectorEnv([lambda: gym.make("CartPole-v1") for _ in range(n_envs)])
    net = ActorCritic()
    opt = torch.optim.Adam(net.parameters(), lr=lr)
    obs, _ = envs.reset(seed=seed)
    ep_len = np.zeros(n_envs)
    finished = []
    steps = 0
    curve = []
    while steps < total_steps:
        logps, values, rewards, masks, ents = [], [], [], [], []
        for _ in range(n_steps):
            logits, value = net(torch.tensor(obs, dtype=torch.float32))
            dist = torch.distributions.Categorical(logits=logits)
            a = dist.sample()
            obs, r, term, trunc, _ = envs.step(a.numpy())
            logps.append(dist.log_prob(a))
            values.append(value)
            ents.append(dist.entropy())
            rewards.append(torch.tensor(r, dtype=torch.float32))
            masks.append(torch.tensor(1.0 - term, dtype=torch.float32))
            ep_len += 1
            for i in np.flatnonzero(term | trunc):
                finished.append(ep_len[i])
                ep_len[i] = 0
            steps += n_envs
        with torch.no_grad():
            _, nxt = net(torch.tensor(obs, dtype=torch.float32))
        R = nxt
        rets = []
        for t in reversed(range(n_steps)):
            R = rewards[t] + gamma * masks[t] * R
            rets.append(R)
        rets = torch.stack(rets[::-1])
        values = torch.stack(values)
        adv = rets - values
        policy_loss = -(torch.stack(logps) * adv.detach()).mean()
        value_loss = adv.pow(2).mean()
        entropy = torch.stack(ents).mean()
        loss = policy_loss + value_coef * value_loss - entropy_coef * entropy
        opt.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(net.parameters(), 0.5)
        opt.step()
        if steps % 20_000 < n_envs * n_steps:
            curve.append((steps, float(np.mean(finished[-20:])) if finished else 0.0))
    return net, curve


if __name__ == "__main__":
    which, seed = sys.argv[1], int(sys.argv[2])
    start = time.perf_counter()
    if which.startswith("reinforce"):
        net, lengths = reinforce(seed=seed, baseline=which.endswith("baseline"))
        ev = evaluate(net)
        out = {"last50": float(np.mean(lengths[-50:])), "eval": float(ev.mean()), "first500": next((i for i, l in enumerate(lengths) if l >= 500), None)}
    else:
        settings = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        net, curve = a2c(seed=seed, **settings)
        ev = evaluate(lambda o: net(o)[0])
        out = {"curve": curve[-5:], "eval": float(ev.mean()), "eval_min": float(ev.min())}
    out["seconds"] = round(time.perf_counter() - start, 1)
    print(which, seed, json.dumps(out), flush=True)
