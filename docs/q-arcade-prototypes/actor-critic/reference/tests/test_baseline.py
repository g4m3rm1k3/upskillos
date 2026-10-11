# Tests for policy.py's centre_and_scale and baseline option, and noise.py (lesson 4.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_baseline.py
import numpy as np
import torch
from pytest import approx


def test_centre_gives_average_zero_and_spread_one():
    from policy import centre_and_scale
    out = centre_and_scale([1.0, 2.0, 3.0, 4.0])
    assert out.mean() == approx(0.0, abs=1e-9) and out.std() == approx(1.0, abs=1e-6)


def test_centre_keeps_the_order():
    from policy import centre_and_scale
    out = centre_and_scale([10.0, 30.0, 20.0])
    assert out[1] > out[2] > out[0], "the best return stays the best"


def test_centre_of_equal_returns_is_all_zero():
    from policy import centre_and_scale
    out = centre_and_scale([5.0, 5.0, 5.0])
    assert np.isfinite(out).all() and out == approx([0.0, 0.0, 0.0]), "no dividing by zero"


def test_option_switches_the_baseline_on():
    from policy import reinforce
    plain = reinforce(episodes=10, seed=1)[1]
    with_baseline = reinforce(episodes=10, seed=1, baseline=True)[1]
    assert len(with_baseline) == 10 and plain != with_baseline, "a different update gives different games"
    assert with_baseline == reinforce(episodes=10, seed=1, baseline=True)[1]


def test_noise_ratio_of_known_gradients():
    from noise import signal_to_noise
    assert signal_to_noise([[1.0, 0.0], [3.0, 0.0]]) == approx(4.0), "average [2, 0], length 2; spreads 1 and 0, average 0.5"


def test_noise_measurement_gives_a_positive_number():
    from noise import gradient_spread
    from policy import make_policy
    torch.manual_seed(0)
    assert gradient_spread(make_policy(), baseline=True, episodes=5) > 0
