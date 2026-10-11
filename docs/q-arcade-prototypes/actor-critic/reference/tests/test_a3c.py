# Tests for a3c.py (lesson 4.5).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_a3c.py
import pytest
import torch


def test_handover_gives_the_central_network_the_workers_slopes():
    from a3c import hand_over
    from actor_critic import ActorCritic
    local, shared = ActorCritic(), ActorCritic()
    logits, value = local(torch.randn(3, 4))
    (logits.sum() + value.sum()).backward()
    hand_over(local, shared)
    for l, s in zip(local.parameters(), shared.parameters()):
        assert torch.equal(l.grad, s.grad)


def test_handover_copies_rather_than_shares():
    from a3c import hand_over
    from actor_critic import ActorCritic
    local, shared = ActorCritic(), ActorCritic()
    logits, value = local(torch.randn(3, 4))
    (logits.sum() + value.sum()).backward()
    hand_over(local, shared)
    first = next(local.parameters())
    first.grad.zero_()
    assert next(shared.parameters()).grad.abs().sum() > 0, "zeroing the worker's slopes must not zero the central ones"


def test_cap_refuses_more_than_two_workers():
    from a3c import MAX_WORKERS, train_a3c
    assert MAX_WORKERS == 2
    with pytest.raises(ValueError):
        train_a3c(workers=3, total_steps=10)
    with pytest.raises(ValueError):
        train_a3c(workers=0, total_steps=10)


def test_shared_network_learns_from_both_workers():
    from a3c import train_a3c
    from actor_critic import ActorCritic
    torch.manual_seed(0)
    before = [p.detach().clone() for p in ActorCritic().parameters()]
    shared, steps = train_a3c(workers=2, total_steps=400, seed=0)
    assert steps >= 400
    assert any(not torch.equal(a, b) for a, b in zip(before, shared.parameters())), "the workers' steps must reach the shared network"
