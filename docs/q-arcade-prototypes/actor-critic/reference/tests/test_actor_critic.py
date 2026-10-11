# Tests for actor_critic.py (lesson 4.3).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_actor_critic.py
import numpy as np
import torch
from pytest import approx


def test_heads_give_two_scores_and_one_value_per_observation():
    from actor_critic import ActorCritic
    logits, values = ActorCritic()(torch.zeros(5, 4))
    assert logits.shape == (5, 2) and values.shape == (5,)


def test_heads_share_one_body():
    from actor_critic import ActorCritic
    torch.manual_seed(0)
    net = ActorCritic()
    obs = torch.ones(1, 4)
    logits, value = net(obs)
    with torch.no_grad():
        net.body[0].bias += 1.0
    new_logits, new_value = net(obs)
    assert not torch.equal(logits, new_logits) and not torch.equal(value, new_value), "changing the body changes both heads"


def test_entropy_of_a_fair_coin_is_log_two():
    from actor_critic import entropy
    assert entropy([0.5, 0.5]) == approx(np.log(2))


def test_entropy_of_a_certain_choice_is_zero():
    from actor_critic import entropy
    assert entropy([1.0, 0.0]) == 0.0 and entropy([0.0, 1.0]) == 0.0


def test_entropy_grows_with_more_equal_choices():
    from actor_critic import entropy
    assert entropy([0.25] * 4) == approx(np.log(4)) and entropy([0.9, 0.1]) < entropy([0.6, 0.4])


def test_advantage_compares_what_happened_with_what_was_expected():
    from actor_critic import advantage
    assert advantage(1.0, 5.0, 6.0, False, gamma=0.9) == approx(1.4), "1 + 0.9 x 6 - 5"


def test_advantage_has_no_future_after_an_ending():
    from actor_critic import advantage
    assert advantage(1.0, 5.0, 6.0, True, gamma=0.9) == approx(-4.0)


def test_loss_parts_are_reported():
    from actor_critic import a2c_loss
    logits = torch.zeros(2, 2)
    values = torch.tensor([1.0, 2.0])
    returns = torch.tensor([3.0, 2.0])
    loss, parts = a2c_loss(logits, values, torch.tensor([0, 1]), returns)
    assert parts["value"] == approx(2.0), "misses 2 and 0: (4 + 0) / 2"
    assert parts["entropy"] == approx(np.log(2)), "equal scores: a fair coin"
    assert parts["policy"] == approx(-np.log(0.5) * 1.0), "-(log 0.5 x 2 + log 0.5 x 0) / 2"
    assert loss.item() == approx(np.log(2) + 0.5 * 2.0 - 0.01 * np.log(2), abs=1e-5), "policy + 0.5 x value - 0.01 x entropy"


def test_loss_policy_part_does_not_move_the_critic():
    from actor_critic import ActorCritic, a2c_loss
    torch.manual_seed(0)
    net = ActorCritic()
    logits, values = net(torch.randn(6, 4))
    loss, _ = a2c_loss(logits, values, torch.zeros(6, dtype=torch.long), torch.ones(6), value_coef=0.0, entropy_coef=0.0)
    loss.backward()
    assert net.critic.weight.grad is None or net.critic.weight.grad.abs().sum() == 0, "advantages must be detached"
