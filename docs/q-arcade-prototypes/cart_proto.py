import json, sys, time
from collections import deque

import gymnasium as gym
import numpy as np
import torch
from torch import nn

torch.set_num_threads(int(__import__('os').environ.get('QA_THREADS', '1')))


class Agent:
    def __init__(self, hidden=64, gamma=0.99, rate=1e-3, memory=10000, batch=64, sync=500, huber=True, seed=0, updates=1):
        torch.manual_seed(seed)
        self.rng = np.random.default_rng(seed)
        self.net = nn.Sequential(nn.Linear(4, hidden), nn.ReLU(), nn.Linear(hidden, hidden), nn.ReLU(), nn.Linear(hidden, 2))
        self.target = nn.Sequential(nn.Linear(4, hidden), nn.ReLU(), nn.Linear(hidden, hidden), nn.ReLU(), nn.Linear(hidden, 2))
        self.target.load_state_dict(self.net.state_dict())
        self.opt = torch.optim.Adam(self.net.parameters(), lr=rate)
        self.gamma, self.batch, self.sync, self.huber, self.updates = gamma, batch, sync, huber, updates
        self.memory = deque(maxlen=memory)
        self.epsilon = 1.0
        self.steps = 0

    def act(self, obs):
        if self.rng.random() < self.epsilon:
            return int(self.rng.integers(2))
        with torch.no_grad():
            return int(self.net(torch.tensor(obs, dtype=torch.float32)).argmax())

    def learn(self, obs, a, r, nxt, term):
        self.memory.append((obs, a, r, nxt, term))
        if len(self.memory) >= 1000:
            for _ in range(self.updates):
                idx = self.rng.choice(len(self.memory), self.batch, replace=False)
                o, ac, rw, nx, te = (np.array(c) for c in zip(*[self.memory[i] for i in idx]))
                o = torch.tensor(o, dtype=torch.float32); nx = torch.tensor(nx, dtype=torch.float32)
                with torch.no_grad():
                    judge = self.target if self.sync else self.net
                    tgt = torch.tensor(rw, dtype=torch.float32) + self.gamma * (1 - torch.tensor(te, dtype=torch.float32)) * judge(nx).max(1).values
                q = self.net(o).gather(1, torch.tensor(ac).reshape(-1, 1))[:, 0]
                loss = (nn.functional.smooth_l1_loss if self.huber else nn.functional.mse_loss)(q, tgt)
                self.opt.zero_grad(); loss.backward(); self.opt.step()
        self.steps += 1
        if self.sync and self.steps % self.sync == 0:
            self.target.load_state_dict(self.net.state_dict())


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


def train(episodes=300, seed=0, eps_episodes=100, **kw):
    env = gym.make("CartPole-v1"); agent = Agent(seed=seed, **kw)
    obs, _ = env.reset(seed=seed); t = time.time(); lengths = []; evals = []
    for ep in range(episodes):
        agent.epsilon = max(0.02, 1.0 - ep / eps_episodes)
        if ep: obs, _ = env.reset()
        n = 0
        while True:
            a = agent.act(obs); nxt, r, te, tr, _ = env.step(a); agent.learn(obs, a, r, nxt, te); obs = nxt; n += 1
            if te or tr: break
        lengths.append(n)
        if (ep + 1) % 25 == 0:
            evals.append((ep + 1, round(evaluate(agent))))
    best = max(e for _, e in evals)
    return {'best': best, 'last': evals[-1][1], 'curve': [e for _, e in evals], 'seconds': round(time.time() - t)}


if __name__ == "__main__":
    kw = json.loads(sys.argv[1])
    for seed in range(int(sys.argv[2])):
        print(kw, seed, train(seed=seed, **kw), flush=True)
