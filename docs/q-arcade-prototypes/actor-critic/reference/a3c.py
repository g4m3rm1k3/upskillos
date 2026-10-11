import time

import gymnasium as gym
import numpy as np
import torch
import torch.multiprocessing as mp
from torch import nn

from a2c import n_step_returns, play_greedy
from actor_critic import ActorCritic, a2c_loss

MAX_WORKERS = 2


def hand_over(local, shared):
    for local_param, shared_param in zip(local.parameters(), shared.parameters()):
        shared_param.grad = local_param.grad.clone()


def worker(rank, shared, counter, total_steps, seed, n_steps, gamma, rate, value_coef, entropy_coef):
    torch.set_num_threads(1)
    torch.manual_seed(seed + rank)
    env = gym.make("CartPole-v1")
    local = ActorCritic()
    optimiser = torch.optim.Adam(shared.parameters(), lr=rate)
    obs, _ = env.reset(seed=seed + rank)
    while counter.value < total_steps:
        local.load_state_dict(shared.state_dict())
        batch_obs, batch_actions, batch_rewards, batch_ended = [], [], [], []
        for _ in range(n_steps):
            with torch.no_grad():
                logits, _ = local(torch.tensor(obs, dtype=torch.float32))
            action = int(torch.distributions.Categorical(logits=logits).sample())
            next_obs, reward, terminated, truncated, _ = env.step(action)
            if truncated:
                with torch.no_grad():
                    reward += gamma * float(local(torch.tensor(next_obs, dtype=torch.float32))[1])
            batch_obs.append(obs)
            batch_actions.append(action)
            batch_rewards.append(reward)
            batch_ended.append(terminated or truncated)
            obs = next_obs
            if terminated or truncated:
                obs, _ = env.reset()
                break
        with counter.get_lock():
            counter.value += len(batch_rewards)
        with torch.no_grad():
            last_value = float(local(torch.tensor(obs, dtype=torch.float32))[1])
        returns = n_step_returns(np.array(batch_rewards), np.array(batch_ended, dtype=float), last_value, gamma)
        logits, values = local(torch.tensor(np.array(batch_obs), dtype=torch.float32))
        loss, _ = a2c_loss(logits, values, torch.tensor(batch_actions),
                           torch.tensor(returns, dtype=torch.float32), value_coef, entropy_coef)
        local.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(local.parameters(), 0.5)
        hand_over(local, shared)
        optimiser.step()


def train_a3c(workers=2, total_steps=200_000, seed=0, n_steps=5, gamma=0.99, rate=0.002,
              value_coef=0.5, entropy_coef=0.01):
    if not 1 <= workers <= MAX_WORKERS:
        raise ValueError(f"workers must be 1 to {MAX_WORKERS}: more processes than that can freeze the computer")
    torch.manual_seed(seed)
    shared = ActorCritic()
    shared.share_memory()
    counter = mp.Value("i", 0)
    args = (shared, counter, total_steps, seed, n_steps, gamma, rate, value_coef, entropy_coef)
    processes = [mp.Process(target=worker, args=(rank, *args)) for rank in range(workers)]
    for process in processes:
        process.start()
    for process in processes:
        process.join()
    return shared, counter.value


if __name__ == "__main__":
    mp.set_start_method("spawn")
    torch.set_num_threads(1)
    start = time.perf_counter()
    net, steps = train_a3c()
    print(f"{steps} steps in {time.perf_counter() - start:.0f} s")
    print("greedy, 20 new games:", play_greedy(net).mean())
