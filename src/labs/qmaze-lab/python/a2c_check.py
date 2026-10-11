import torch
from torch.distributions import Categorical

from a2c import ActorCritic


def check_gradients(seed=0):
    """One small batch: PyTorch's gradients (autograd) beside the formulas derived by hand."""
    torch.manual_seed(seed)
    net = ActorCritic(n_states=16, n_actions=4)
    states = torch.tensor([0, 1, 1, 2])
    actions = torch.tensor([2, 3, 2, 2])
    returns = torch.tensor([0.5, -0.2, 0.1, 0.9])

    logits, values = net(states)
    policy = Categorical(logits=logits)
    advantages = returns - values
    actor_loss = -(policy.log_prob(actions) * advantages.detach()).mean()
    critic_loss = advantages.pow(2).mean()
    loss = actor_loss + 0.5 * critic_loss
    loss.backward()

    n = len(states)
    probabilities = torch.softmax(logits, dim=-1).detach()
    one_hot = torch.nn.functional.one_hot(actions, 4).float()
    hand_actor = torch.zeros(4, 16)
    hand_critic = torch.zeros(1, 16)
    for i in range(n):
        s = states[i]
        hand_actor[:, s] += -advantages[i].detach() * (one_hot[i] - probabilities[i]) / n
        hand_critic[0, s] += -0.5 * 2 * advantages[i].detach() / n

    actor_gap = (net.actor.weight.grad - hand_actor).abs().max().item()
    critic_gap = (net.critic.weight.grad - hand_critic).abs().max().item()
    print("actor gradient, column of state 1 (autograd):", net.actor.weight.grad[:, 1].tolist())
    print("actor gradient, column of state 1 (by hand): ", hand_actor[:, 1].tolist())
    print("largest difference: actor", actor_gap, "critic", critic_gap)
    return actor_gap, critic_gap
