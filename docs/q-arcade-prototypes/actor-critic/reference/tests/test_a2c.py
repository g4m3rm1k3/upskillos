# Tests for a2c.py (lesson 4.4).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_a2c.py
import numpy as np
import torch
from pytest import approx


def test_bootstrap_adds_up_from_the_last_value():
    from a2c import n_step_returns
    assert n_step_returns([1.0, 1.0, 1.0], [0, 0, 0], 10.0, 0.5) == approx([3.0, 4.0, 6.0]), "6 = 1 + 0.5 x 10"


def test_bootstrap_stops_at_an_ending():
    from a2c import n_step_returns
    assert n_step_returns([1.0, 1.0, 1.0], [0, 1, 0], 10.0, 0.5) == approx([1.5, 1.0, 6.0])


def test_bootstrap_handles_many_cartpoles_at_once():
    from a2c import n_step_returns
    rewards = np.ones((2, 3))
    ended = np.array([[0, 0, 1], [0, 0, 0]])
    out = n_step_returns(rewards, ended, np.array([2.0, 4.0, 6.0]), 0.5)
    assert out.shape == (2, 3)
    assert out[:, 0] == approx([2.0, 2.0]) and out[:, 2] == approx([1.0, 4.0])


def test_truncated_games_keep_their_future():
    from a2c import cut_short
    rewards = np.array([1.0, 1.0, 1.0])
    truncated = np.array([False, True, False])
    assert cut_short(rewards, truncated, np.array([7.0]), 0.5) == approx([1.0, 4.5, 1.0])
    assert rewards[1] == 1.0, "the original rewards are left alone"


def test_envs_run_side_by_side_and_restart_on_their_own():
    from a2c import make_envs
    envs = make_envs(3)
    obs, _ = envs.reset(seed=0)
    assert obs.shape == (3, 4)
    for _ in range(200):
        obs, _, terminated, truncated, info = envs.step(np.zeros(3, dtype=int))
        if terminated.any():
            assert "final_obs" in info and obs.shape == (3, 4)
            return
    raise AssertionError("pushing left every step should end a game within 200 steps")


def test_training_gives_a_network_and_a_learning_curve():
    from a2c import train_a2c
    net, curve = train_a2c(total_steps=2000, report_every=400, quiet=True)
    assert len(curve) == 5 and [s for s, _ in curve] == [400, 800, 1200, 1600, 2000]


def test_training_is_repeatable_with_a_seed():
    from a2c import train_a2c
    a = train_a2c(total_steps=800, report_every=400, quiet=True, seed=2)[1]
    b = train_a2c(total_steps=800, report_every=400, quiet=True, seed=2)[1]
    assert a == b


def test_training_learns_to_balance():
    from a2c import play_greedy, train_a2c
    net, curve = train_a2c(total_steps=120_000, report_every=40_000, quiet=True)
    assert curve[-1][1] >= 400, "after 120,000 steps the greedy agent should balance (nearly) every game"
    assert play_greedy(net, episodes=3).shape == (3,)
