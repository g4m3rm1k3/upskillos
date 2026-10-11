import time

import gymnasium as gym
import numpy as np
import torch
from torch import nn

from actor_critic import ActorCritic, a2c_loss


def n_step_returns(rewards, ended, last_values, gamma):
    returns = np.zeros(np.shape(rewards))
    running = np.asarray(last_values, dtype=float)
    for t in reversed(range(len(rewards))):
        running = rewards[t] + gamma * (1 - ended[t]) * running
        returns[t] = running
    return returns


def cut_short(rewards, truncated, final_values, gamma):
    rewards = np.array(rewards, dtype=float)
    rewards[truncated] += gamma * np.asarray(final_values, dtype=float)
    return rewards


def make_envs(n_envs):
    return gym.vector.SyncVectorEnv([lambda: gym.make("CartPole-v1") for _ in range(n_envs)],
                                    autoreset_mode=gym.vector.AutoresetMode.SAME_STEP)


def train_a2c(total_steps=200_000, seed=0, n_envs=8, n_steps=5, gamma=0.99, rate=0.002,
              value_coef=0.5, entropy_coef=0.01, report_every=20_000, quiet=False, net=None):
    torch.manual_seed(seed)
    envs = make_envs(n_envs)
    if net is None:
        net = ActorCritic()
    optimiser = torch.optim.Adam(net.parameters(), lr=rate)
    obs, _ = envs.reset(seed=seed)
    curve = []
    steps = 0
    start = time.perf_counter()
    while steps < total_steps:
        batch_obs, batch_actions, batch_rewards, batch_ended = [], [], [], []
        for _ in range(n_steps):
            with torch.no_grad():
                logits, _ = net(torch.tensor(obs, dtype=torch.float32))
            actions = torch.distributions.Categorical(logits=logits).sample().numpy()
            next_obs, rewards, terminated, truncated, info = envs.step(actions)
            if truncated.any():
                final_obs = np.stack(info["final_obs"][truncated])
                with torch.no_grad():
                    final_values = net(torch.tensor(final_obs, dtype=torch.float32))[1].numpy()
                rewards = cut_short(rewards, truncated, final_values, gamma)
            batch_obs.append(obs)
            batch_actions.append(actions)
            batch_rewards.append(rewards)
            batch_ended.append(terminated | truncated)
            obs = next_obs
            steps += n_envs
        with torch.no_grad():
            last_values = net(torch.tensor(obs, dtype=torch.float32))[1].numpy()
        returns = n_step_returns(np.array(batch_rewards), np.array(batch_ended), last_values, gamma)
        logits, values = net(torch.tensor(np.array(batch_obs), dtype=torch.float32))
        loss, _ = a2c_loss(logits, values, torch.tensor(np.array(batch_actions)),
                           torch.tensor(returns, dtype=torch.float32), value_coef, entropy_coef)
        optimiser.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(net.parameters(), 0.5)
        optimiser.step()
        if steps % report_every < n_envs * n_steps:
            score = float(play_greedy(net, episodes=5, seed=10_000 + steps).mean())
            curve.append((steps, score))
            if not quiet:
                print(f"{steps:7} steps: greedy score {score:5.1f}  ({time.perf_counter() - start:.0f} s)", flush=True)
    return net, curve


def play_greedy(net, episodes=20, seed=1000):
    env = gym.make("CartPole-v1")
    lengths = []
    for i in range(episodes):
        obs, _ = env.reset(seed=seed + i)
        steps = 0
        while True:
            with torch.no_grad():
                logits, _ = net(torch.tensor(obs, dtype=torch.float32))
            obs, _, terminated, truncated, _ = env.step(int(logits.argmax()))
            steps += 1
            if terminated or truncated:
                break
        lengths.append(steps)
    return np.array(lengths)


if __name__ == "__main__":
    torch.set_num_threads(1)
    net, curve = train_a2c()
    print("greedy, 20 new games:", play_greedy(net).mean())
