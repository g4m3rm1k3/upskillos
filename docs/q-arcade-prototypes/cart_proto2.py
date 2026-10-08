import json, os, sys, time
from collections import deque

import gymnasium as gym
import numpy as np
import torch
from torch import nn

torch.set_num_threads(1)


def mlp(hidden):
    return nn.Sequential(nn.Linear(4, hidden), nn.ReLU(), nn.Linear(hidden, hidden), nn.ReLU(), nn.Linear(hidden, 2))


class Agent:
    def __init__(self, hidden=128, gamma=0.99, rate=1e-3, memory=50000, batch=64, tau=0.005, double=True, clip=10.0, seed=0):
        torch.manual_seed(seed)
        self.rng = np.random.default_rng(seed)
        self.net, self.target = mlp(hidden), mlp(hidden)
        self.target.load_state_dict(self.net.state_dict())
        self.opt = torch.optim.Adam(self.net.parameters(), lr=rate)
        self.gamma, self.batch, self.tau, self.double, self.clip = gamma, batch, tau, double, clip
        self.memory = deque(maxlen=memory)
        self.epsilon = 1.0

    def act(self, obs):
        if self.rng.random() < self.epsilon:
            return int(self.rng.integers(2))
        with torch.no_grad():
            return int(self.net(torch.tensor(obs, dtype=torch.float32)).argmax())

    def learn(self, obs, a, r, nxt, term):
        self.memory.append((obs, a, r, nxt, term))
        if len(self.memory) < 1000:
            return
        idx = self.rng.choice(len(self.memory), self.batch, replace=False)
        o, ac, rw, nx, te = (np.array(c) for c in zip(*[self.memory[i] for i in idx]))
        o = torch.tensor(o, dtype=torch.float32); nx = torch.tensor(nx, dtype=torch.float32)
        with torch.no_grad():
            if self.double:
                best = self.net(nx).argmax(1, keepdim=True)
                nextv = self.target(nx).gather(1, best)[:, 0]
            else:
                nextv = self.target(nx).max(1).values
            tgt = torch.tensor(rw, dtype=torch.float32) + self.gamma * (1 - torch.tensor(te, dtype=torch.float32)) * nextv
        q = self.net(o).gather(1, torch.tensor(ac).reshape(-1, 1))[:, 0]
        loss = nn.functional.smooth_l1_loss(q, tgt)
        self.opt.zero_grad(); loss.backward()
        if self.clip:
            nn.utils.clip_grad_norm_(self.net.parameters(), self.clip)
        self.opt.step()
        with torch.no_grad():
            for p, tp in zip(self.net.parameters(), self.target.parameters()):
                tp.mul_(1 - self.tau).add_(self.tau * p)


def evaluate(agent, episodes=20, seed=1000):
    env = gym.make("CartPole-v1"); saved = agent.epsilon; agent.epsilon = 0.0; out = []
    obs, _ = env.reset(seed=seed)
    for i in range(episodes):
        if i: obs, _ = env.reset()
        n = 0
        while True:
            obs, r, te, tr, _ = env.step(agent.act(obs)); n += 1
            if te or tr: break
        out.append(n)
    agent.epsilon = saved
    return float(np.mean(out))


def train(steps=60000, seed=0, explore_steps=15000, eps_end=0.02, check=2500, **kw):
    env = gym.make("CartPole-v1"); agent = Agent(seed=seed, **kw)
    obs, _ = env.reset(seed=seed); t = time.time(); curve = []
    for step in range(1, steps + 1):
        agent.epsilon = max(eps_end, 1.0 - step / explore_steps)
        a = agent.act(obs); nxt, r, te, tr, _ = env.step(a); agent.learn(obs, a, r, nxt, te); obs = nxt
        if te or tr:
            obs, _ = env.reset()
        if step % check == 0:
            curve.append(round(evaluate(agent)))
    return {"best": max(curve), "last": curve[-1], "curve": curve, "seconds": round(time.time() - t)}


if __name__ == "__main__":
    kw = json.loads(sys.argv[1])
    for seed in range(int(sys.argv[2])):
        print(kw, seed, train(seed=seed, **kw), flush=True)
