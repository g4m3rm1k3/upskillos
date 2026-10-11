import torch
from torch import nn
from torch.distributions import Categorical

from cartpole import CartPole
from returns import all_returns


class PolicyNet(nn.Module):
    """The 4 numbers in; a score for each push out."""

    def __init__(self, hidden=32):
        super().__init__()
        self.layers = nn.Sequential(nn.Linear(4, hidden), nn.Tanh(), nn.Linear(hidden, 2))

    def forward(self, states):
        return self.layers(states)


def train_reinforce(episodes=300, gamma=0.99, lr=0.01, seed=0):
    torch.manual_seed(seed)
    env = CartPole()
    net = PolicyNet()
    optimizer = torch.optim.Adam(net.parameters(), lr=lr)
    lengths = []
    for episode in range(episodes):
        state, info = env.reset(seed=seed if episode == 0 else None)
        log_probs, rewards = [], []
        done = False
        while not done:
            policy = Categorical(logits=net(torch.tensor(state)))
            action = policy.sample()
            state, reward, terminated, truncated, info = env.step(action.item())
            log_probs.append(policy.log_prob(action))
            rewards.append(reward)
            done = terminated or truncated
        returns = torch.tensor(all_returns(rewards, gamma))
        advantages = (returns - returns.mean()) / (returns.std() + 1e-8)
        loss = -(torch.stack(log_probs) * advantages).mean()
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        lengths.append(len(rewards))
    return net, lengths
