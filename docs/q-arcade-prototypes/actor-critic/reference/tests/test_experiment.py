# Tests for experiment.py (lesson 4.7).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_experiment.py
import csv

import numpy as np
from pytest import approx

FAKE = [
    {"variant": "A2C", "seed": 0, "curve": [(100, 10.0), (200, 20.0)], "greedy": 500.0},
    {"variant": "A2C", "seed": 1, "curve": [(100, 30.0), (200, 40.0)], "greedy": 300.0},
    {"variant": "other", "seed": 0, "curve": [(100, 5.0), (200, 5.0)], "greedy": 9.0},
]


def test_summary_is_the_mean_and_standard_error_at_each_point():
    from experiment import summarise
    steps, mean, error = summarise(FAKE, "A2C")
    assert list(steps) == [100, 200]
    assert list(mean) == approx([20.0, 30.0])
    assert list(error) == approx([10.0, 10.0]), "sd of 10 and 30 is 14.14; divided by the square root of 2 seeds"


def test_summary_of_one_seed_has_no_error_bar():
    from experiment import summarise
    _, mean, error = summarise(FAKE, "other")
    assert list(mean) == approx([5.0, 5.0]) and list(error) == approx([0.0, 0.0])


def test_csv_has_one_row_per_run(tmp_path):
    from experiment import save_csv
    path = tmp_path / "results.csv"
    save_csv(FAKE, path)
    with open(path, newline="") as f:
        rows = list(csv.reader(f))
    assert rows[0] == ["variant", "seed", "greedy_mean_length"] and len(rows) == 4
    assert rows[2] == ["A2C", "1", "300.0"]


def test_plot_is_saved_as_a_picture(tmp_path):
    from experiment import plot
    path = tmp_path / "results.png"
    plot(FAKE, path)
    assert path.exists() and path.read_bytes()[:4] == b"\x89PNG"


def test_runs_go_through_a_pool_of_two():
    from experiment import run_experiment
    results = run_experiment(seeds=2, total_steps=400, variants={"A2C": {}})
    assert sorted(r["seed"] for r in results) == [0, 1]
    assert all(set(r) == {"variant", "seed", "curve", "greedy"} for r in results)
    assert np.isfinite([r["greedy"] for r in results]).all()
