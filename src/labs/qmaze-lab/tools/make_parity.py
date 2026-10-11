"""Records what the real Python programs produce, for engine/parity.test.js to compare with the
JavaScript engine. Regenerate after changing any program in python/:

    python src/labs/qmaze-lab/tools/make_parity.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

from gridworld import GridWorld          # noqa: E402
from maps import MAPS                    # noqa: E402
from planning import value_iteration     # noqa: E402
from qlearning import train_q_learning   # noqa: E402
from sarsa import train_sarsa            # noqa: E402
from td import td0_evaluate              # noqa: E402
from averages import running_mean, constant_step  # noqa: E402

RUNS = [
    {"map": "corridor", "episodes": 20, "seed": 0},
    {"map": "cheese_and_cat", "episodes": 60, "seed": 3},
    {"map": "qmaze", "episodes": 40, "seed": 1},
    {"map": "cliff", "episodes": 50, "seed": 2, "gamma": 1.0, "epsilon_start": 0.1, "epsilon_end": 0.1},
    {"map": "frozen_lake", "episodes": 200, "seed": 4, "alpha": 0.1, "gamma": 0.99},
    {"map": "cats_and_cheese", "episodes": 80, "seed": 5, "initial_q": 1.0},
]


def main():
    out = {"maps": MAPS, "P": {}, "planning": {}, "runs": []}
    for name in MAPS:
        env = GridWorld(name)
        out["P"][name] = [[[list(o) for o in env.P[s][a]] for a in range(4)] for s in range(env.n_states)]
        V, Q, sweeps = value_iteration(env.P, 0.95)
        out["planning"][name] = {"V": V.tolist(), "Q": Q.tolist(), "sweeps": sweeps}
    for run in RUNS:
        options = {k: v for k, v in run.items() if k != "map"}
        for algorithm, train in (("q_learning", train_q_learning), ("sarsa", train_sarsa)):
            Q, totals = train(GridWorld(run["map"]), **options)
            out["runs"].append({**run, "algorithm": algorithm, "Q": Q.tolist(), "totals": totals})
    out["td"] = []
    for name, episodes, alpha in (("cheese_and_cat", 300, 0.1), ("frozen_lake", 300, 0.05)):
        out["td"].append({"map": name, "episodes": episodes, "alpha": alpha, "V": td0_evaluate(GridWorld(name), episodes=episodes, alpha=alpha).tolist()})
    samples = [1, 0, 0, 1, 0.5, -2, 3]
    out["averages"] = {"samples": samples, "mean": running_mean(samples), "step": constant_step(samples, 0.3)}
    path = os.path.join(HERE, "..", "engine", "parity.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(out, handle)
    print(f"wrote {os.path.relpath(path)}: {len(out['P'])} maps, {len(out['runs'])} runs")


if __name__ == "__main__":
    main()
