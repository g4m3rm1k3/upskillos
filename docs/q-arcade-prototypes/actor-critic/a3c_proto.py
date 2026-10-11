"""A3C prototype: 2 workers, shared network, Windows spawn. Measure before writing."""
import json
import os
import sys
import time

import gymnasium as gym
import numpy as np
import torch
import torch.multiprocessing as mp
from torch import nn

from proto import ActorCritic, evaluate


def worker(rank, shared, counter, total_steps, seed, n_steps, gamma, lr, value_coef, entropy_coef):
    torch.set_num_threads(1)
    torch.manual_seed(seed + rank)
    env = gym.make("CartPole-v1")
    local = ActorCritic()
    optimiser = torch.optim.Adam(shared.parameters(), lr=lr)
    obs, _ = env.reset(seed=seed + rank)
    while counter.value < total_steps:
        local.load_state_dict(shared.state_dict())
        logps, values, rewards, masks, ents = [], [], [], [], []
        for _ in range(n_steps):
            logits, value = local(torch.tensor(obs, dtype=torch.float32))
            dist = torch.distributions.Categorical(logits=logits)
            a = dist.sample()
            obs, r, term, trunc, _ = env.step(int(a))
            logps.append(dist.log_prob(a))
            values.append(value)
            ents.append(dist.entropy())
            rewards.append(r)
            masks.append(0.0 if term else 1.0)
            if term or trunc:
                obs, _ = env.reset()
                if term:
                    break
        with counter.get_lock():
            counter.value += len(rewards)
        with torch.no_grad():
            R = 0.0 if masks[-1] == 0.0 else float(local(torch.tensor(obs, dtype=torch.float32))[1])
        rets = []
        for t in reversed(range(len(rewards))):
            R = rewards[t] + gamma * masks[t] * R
            rets.append(R)
        rets = torch.tensor(rets[::-1], dtype=torch.float32)
        values = torch.stack(values)
        adv = rets - values
        loss = -(torch.stack(logps) * adv.detach()).mean() + value_coef * adv.pow(2).mean() - entropy_coef * torch.stack(ents).mean()
        local.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(local.parameters(), 0.5)
        for shared_p, local_p in zip(shared.parameters(), local.parameters()):
            shared_p._grad = local_p.grad
        optimiser.step()


def train_a3c(workers=2, total_steps=200_000, seed=0, n_steps=5, gamma=0.99, lr=7e-4, value_coef=0.5, entropy_coef=0.01):
    torch.manual_seed(seed)
    shared = ActorCritic()
    shared.share_memory()
    counter = mp.Value("i", 0)
    procs = [mp.Process(target=worker, args=(r, shared, counter, total_steps, seed, n_steps, gamma, lr, value_coef, entropy_coef)) for r in range(workers)]
    for p in procs:
        p.start()
    for p in procs:
        p.join()
    return shared


if __name__ == "__main__":
    mp.set_start_method("spawn")
    torch.set_num_threads(1)
    seed = int(sys.argv[1])
    settings = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    start = time.perf_counter()
    net = train_a3c(seed=seed, **settings)
    ev = evaluate(lambda o: net(o)[0])
    print("a3c", seed, json.dumps({"settings": settings, "eval": float(ev.mean()), "eval_min": float(ev.min()), "seconds": round(time.perf_counter() - start, 1)}), flush=True)
