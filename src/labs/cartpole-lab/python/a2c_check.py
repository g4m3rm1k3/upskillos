import torch
from torch.distributions import Categorical


def check_gradients(seed=0):
    """A linear actor and critic on 4 CartPole states: autograd's gradients beside the formulas worked out by hand."""
    torch.manual_seed(seed)
    actor = torch.nn.Linear(4, 2, bias=False)
    critic = torch.nn.Linear(4, 1, bias=False)
    states = torch.tensor([[0.01, 0.2, -0.03, -0.4], [0.0, -0.1, 0.05, 0.3], [-0.2, 0.4, 0.1, 0.6], [0.1, 0.0, -0.08, -0.2]])
    actions = torch.tensor([1, 0, 1, 0])
    returns = torch.tensor([9.0, 4.0, 1.0, 6.0])

    logits = actor(states)
    values = critic(states).squeeze(-1)
    policy = Categorical(logits=logits)
    advantages = returns - values
    actor_loss = -(policy.log_prob(actions) * advantages.detach()).mean()
    critic_loss = advantages.pow(2).mean()
    loss = actor_loss + 0.5 * critic_loss
    loss.backward()

    n = len(states)
    probabilities = torch.softmax(logits, dim=-1).detach()
    one_hot = torch.nn.functional.one_hot(actions, 2).float()
    A = advantages.detach()
    hand_actor = torch.zeros(2, 4)
    hand_critic = torch.zeros(1, 4)
    for i in range(n):
        hand_actor += -A[i] * torch.outer(one_hot[i] - probabilities[i], states[i]) / n
        hand_critic[0] += -0.5 * 2 * A[i] * states[i] / n

    actor_gap = (actor.weight.grad - hand_actor).abs().max().item()
    critic_gap = (critic.weight.grad - hand_critic).abs().max().item()
    print("actor gradient (autograd):", actor.weight.grad.tolist())
    print("actor gradient (by hand): ", hand_actor.tolist())
    print("largest difference: actor", actor_gap, "critic", critic_gap)
    return actor_gap, critic_gap
