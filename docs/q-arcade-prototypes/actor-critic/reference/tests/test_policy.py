# Tests for policy.py (lesson 4.1).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_policy.py
import numpy as np
import torch
from pytest import approx


def three_to_one_net():
    from policy import make_policy
    net = make_policy()
    with torch.no_grad():
        net[-1].weight.zero_()
        net[-1].bias[:] = torch.tensor([0.0, float(np.log(3.0))])
    return net


def test_probs_are_two_numbers_that_add_up_to_one():
    from policy import make_policy, probabilities
    torch.manual_seed(0)
    p = probabilities(make_policy(), np.zeros(4))
    assert p.shape == (2,) and p.sum() == approx(1.0) and (p > 0).all()


def test_probs_follow_the_scores():
    from policy import probabilities
    assert probabilities(three_to_one_net(), np.zeros(4)) == approx([0.25, 0.75]), "scores 0 and log 3: odds of 1 to 3"


def test_returns_add_up_from_the_end():
    from policy import discounted_returns
    assert discounted_returns([1.0, 1.0, 1.0], 0.5) == approx([1.75, 1.5, 1.0])
    assert discounted_returns([1.0, 1.0, 1.0], 1.0) == approx([3.0, 2.0, 1.0])


def test_returns_of_a_reward_only_at_the_end():
    from policy import discounted_returns
    assert discounted_returns([0.0, 0.0, 10.0], 0.9) == approx([8.1, 9.0, 10.0])


def test_returns_are_an_array_of_the_same_length():
    from policy import discounted_returns
    out = discounted_returns([1.0] * 5, 0.99)
    assert isinstance(out, np.ndarray) and out.shape == (5,)


def test_choose_follows_the_probabilities():
    from policy import choose
    net = three_to_one_net()
    torch.manual_seed(0)
    rights = sum(choose(net, np.zeros(4))[0] for _ in range(4000))
    assert rights / 4000 == approx(0.75, abs=0.03), "action 1 should be chosen 3 times in 4"


def test_choose_gives_an_int_and_the_log_of_its_probability():
    from policy import choose
    action, log_prob = choose(three_to_one_net(), np.zeros(4))
    assert type(action) is int and log_prob.item() == approx(np.log([0.25, 0.75][action]), abs=1e-6)


def test_choose_log_probability_carries_slopes():
    from policy import choose, make_policy
    net = make_policy()
    _, log_prob = choose(net, np.zeros(4))
    log_prob.backward()
    assert any(p.grad is not None and p.grad.abs().sum() > 0 for p in net.parameters())


def test_reinforce_gives_a_network_and_episode_lengths():
    from policy import reinforce
    net, lengths = reinforce(episodes=5)
    assert isinstance(net, torch.nn.Module) and len(lengths) == 5 and min(lengths) >= 8


def test_reinforce_is_repeatable_with_a_seed():
    from policy import reinforce
    assert reinforce(episodes=5, seed=3)[1] == reinforce(episodes=5, seed=3)[1]


def test_reinforce_learns_to_balance():
    from policy import greedy_lengths, reinforce
    net, lengths = reinforce(episodes=120)
    assert np.mean(lengths[-20:]) > 3 * np.mean(lengths[:20]), "the games should get much longer"
    assert greedy_lengths(net, episodes=3).shape == (3,)
