import torch
from torch import nn
from torch.distributions import Categorical

from gridworld import GridWorld


class ActorCritic(nn.Module):
    """State number in; action scores (the actor) and a state value (the critic) out."""

    def __init__(self, n_states, n_actions, hidden=0):
        super().__init__()
        self.n_states = n_states
        if hidden:
            self.body = nn.Sequential(nn.Linear(n_states, hidden), nn.Tanh())
            width = hidden
        else:
            self.body = nn.Identity()
            width = n_states
        self.actor = nn.Linear(width, n_actions, bias=hidden > 0)
        self.critic = nn.Linear(width, 1, bias=hidden > 0)

    def forward(self, states):
        x = nn.functional.one_hot(states, self.n_states).float()
        h = self.body(x)
        logits = self.actor(h)
        values = self.critic(h).squeeze(-1)
        return logits, values


def train_a2c(name, updates=1500, n_envs=8, n_steps=5, gamma=0.95, lr=0.05,
              value_coef=0.5, entropy_coef=0.01, hidden=0, seed=0):
    torch.manual_seed(seed)
    envs = [GridWorld(name) for _ in range(n_envs)]
    states = [env.reset(seed=seed + i)[0] for i, env in enumerate(envs)]
    net = ActorCritic(envs[0].n_states, envs[0].n_actions, hidden)
    optimizer = torch.optim.Adam(net.parameters(), lr=lr)
    totals = []
    running = [0.0] * n_envs
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
                running[i] += reward
                end_value = 0.0
                if truncated and not terminated:
                    with torch.no_grad():
                        end_value = net(torch.tensor([next_state]))[1].item()
                if terminated or truncated:
                    totals.append(running[i])
                    running[i] = 0.0
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
        optimizer.step()
    return net, totals


def policy_table(net):
    """pi(a|s) and V(s) for every state, as plain lists, for drawing on the map."""
    with torch.no_grad():
        logits, values = net(torch.arange(net.n_states))
        probabilities = torch.softmax(logits, dim=-1)
    return probabilities.tolist(), values.tolist()
