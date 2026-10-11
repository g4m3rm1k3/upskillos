# REINFORCE: the simplest policy gradient, on CartPole. Play a whole game with the current
# policy, then make every action in it more likely in proportion to the (discounted) reward
# that followed it. The update happens once per game, after it has ended.
import gymnasium as gym
import torch
from torch import nn

GAMMA = 0.99


class Policy(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = nn.Sequential(nn.Linear(4, 32), nn.ReLU(), nn.Linear(32, 2))

    def forward(self, obs):
        return torch.softmax(self.layers(obs), dim=-1)


def returns_to_go(rewards):
    returns = []
    running = 0.0
    for r in reversed(rewards):
        running = r + GAMMA * running
        returns.insert(0, running)
    return returns


def play_episode(env, policy):
    obs, _ = env.reset()
    log_probs = []
    rewards = []
    while True:
        probs = policy(torch.tensor(obs, dtype=torch.float32))
        dist = torch.distributions.Categorical(probs)
        action = dist.sample()
        log_probs.append(dist.log_prob(action))
        obs, reward, terminated, truncated, _ = env.step(action.item())
        rewards.append(reward)
        if terminated or truncated:
            return log_probs, rewards


def train(episodes=300, normalise=True, seed=0):
    torch.manual_seed(seed)
    env = gym.make("CartPole-v1")
    env.reset(seed=seed)
    policy = Policy()
    optimiser = torch.optim.Adam(policy.parameters(), lr=0.01)
    lengths = []
    for episode in range(episodes):
        log_probs, rewards = play_episode(env, policy)
        returns = torch.tensor(returns_to_go(rewards))
        if normalise:
            returns = (returns - returns.mean()) / (returns.std() + 1e-8)
        loss = -(torch.stack(log_probs) * returns).sum()
        optimiser.zero_grad()
        loss.backward()
        optimiser.step()
        lengths.append(len(rewards))
    return lengths
