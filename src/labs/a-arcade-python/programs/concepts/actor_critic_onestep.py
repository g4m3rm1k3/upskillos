# One-step actor-critic, on CartPole: learn after every single step, not at the end of the game.
# The critic estimates V(s). After each step, the TD error, r + γV(s') − V(s), says how much better
# the step went than the critic expected. That number is the advantage: it trains the critic
# (shrink the error) and the actor (make the action likelier if positive, less likely if negative).
import gymnasium as gym
import torch
from torch import nn

GAMMA = 0.99


def make_actor():
    return nn.Sequential(nn.Linear(4, 32), nn.ReLU(), nn.Linear(32, 2), nn.Softmax(dim=-1))


def make_critic():
    return nn.Sequential(nn.Linear(4, 32), nn.ReLU(), nn.Linear(32, 1))


def train(episodes=300, seed=0):
    torch.manual_seed(seed)
    env = gym.make("CartPole-v1")
    actor = make_actor()
    critic = make_critic()
    actor_opt = torch.optim.Adam(actor.parameters(), lr=0.001)
    critic_opt = torch.optim.Adam(critic.parameters(), lr=0.005)
    lengths = []
    for episode in range(episodes):
        obs, _ = env.reset(seed=seed + episode)
        steps = 0
        while True:
            state = torch.tensor(obs, dtype=torch.float32)
            probs = actor(state)
            dist = torch.distributions.Categorical(probs)
            action = dist.sample()
            obs, reward, terminated, truncated, _ = env.step(action.item())
            next_state = torch.tensor(obs, dtype=torch.float32)
            value = critic(state).squeeze()
            next_value = 0.0 if terminated else critic(next_state).squeeze().item()
            td_target = reward + GAMMA * next_value
            td_error = td_target - value
            critic_loss = td_error.pow(2)
            actor_loss = -dist.log_prob(action) * td_error.detach()
            critic_opt.zero_grad()
            critic_loss.backward()
            critic_opt.step()
            actor_opt.zero_grad()
            actor_loss.backward()
            actor_opt.step()
            steps += 1
            if terminated or truncated:
                break
        lengths.append(steps)
    return lengths
