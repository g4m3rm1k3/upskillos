import torch
from torch import nn
from torch.distributions import Categorical

from cartpole import CartPole


class ActorCritic(nn.Module):
    """The 4 numbers in; a score for each push (the actor) and a value V(s) (the critic) out."""

    def __init__(self, hidden=64):
        super().__init__()
        self.body = nn.Sequential(nn.Linear(4, hidden), nn.Tanh())
        self.actor = nn.Linear(hidden, 2)
        self.critic = nn.Linear(hidden, 1)

    def forward(self, states):
        h = self.body(states)
        logits = self.actor(h)
        values = self.critic(h).squeeze(-1)
        return logits, values


def train_a2c(updates=5000, n_envs=8, n_steps=5, gamma=0.99, lr=0.002,
              value_coef=0.5, entropy_coef=0.01, seed=0):
    torch.manual_seed(seed)
    envs = [CartPole() for _ in range(n_envs)]
    states = [env.reset(seed=seed + i)[0] for i, env in enumerate(envs)]
    net = ActorCritic()
    optimizer = torch.optim.Adam(net.parameters(), lr=lr)
    lengths = []
    for update in range(updates):
        log_probs, values, entropies = [], [], []
        rewards, ended, end_values = [], [], []
        for t in range(n_steps):
            logits, value = net(torch.tensor(states))
            policy = Categorical(logits=logits)
            actions = policy.sample()
            log_probs.append(policy.log_prob(actions))
            entropies.append(policy.entropy())
            values.append(value)
            step_rewards, step_ended, step_end_values = [], [], []
            for i, env in enumerate(envs):
                next_state, reward, terminated, truncated, info = env.step(actions[i].item())
                end_value = 0.0
                if truncated and not terminated:
                    with torch.no_grad():
                        end_value = net(torch.tensor([next_state]))[1].item()
                if terminated or truncated:
                    lengths.append(env.steps)
                    next_state, info = env.reset()
                states[i] = next_state
                step_rewards.append(reward)
                step_ended.append(terminated or truncated)
                step_end_values.append(end_value)
            rewards.append(torch.tensor(step_rewards))
            ended.append(torch.tensor(step_ended))
            end_values.append(torch.tensor(step_end_values))

        with torch.no_grad():
            R = net(torch.tensor(states))[1]
        returns = []
        for t in reversed(range(n_steps)):
            R = rewards[t] + gamma * torch.where(ended[t], end_values[t], R)
            returns.insert(0, R)
        returns = torch.stack(returns)
        values = torch.stack(values)
        log_probs = torch.stack(log_probs)

        advantages = returns - values
        actor_loss = -(log_probs * advantages.detach()).mean()
        critic_loss = advantages.pow(2).mean()
        entropy = torch.stack(entropies).mean()
        loss = actor_loss + value_coef * critic_loss - entropy_coef * entropy

        optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(net.parameters(), 0.5)
        optimizer.step()
    return net, lengths


def play_greedy(net, games=20, seed=1000):
    """Games with the actor's most likely push every time: how long each lasts."""
    env = CartPole()
    lengths = []
    for game in range(games):
        state, info = env.reset(seed=seed + game)
        done = False
        while not done:
            with torch.no_grad():
                logits, value = net(torch.tensor(state))
            state, reward, terminated, truncated, info = env.step(int(logits.argmax()))
            done = terminated or truncated
        lengths.append(env.steps)
    return lengths
