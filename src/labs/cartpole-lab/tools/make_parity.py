"""Records what the real Python programs produce, for engine/parity.test.js to compare with the
JavaScript engine. Plain Python and NumPy only (no PyTorch). Regenerate after changing any program
in python/:

    python src/labs/cartpole-lab/tools/make_parity.py
"""
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

from bins import BinnedCartPole, make_edges, slot, to_state       # noqa: E402
from cartpole import CartPole                                       # noqa: E402
from evaluate import greedy_lengths                                 # noqa: E402
from linear_policy import train_linear                              # noqa: E402
from gradient_noise import compare_baselines                        # noqa: E402
from montecarlo import train_mc_control                             # noqa: E402
from neuron import train                                            # noqa: E402
from policies import always_left, average_length, lean, lean_ahead, random_push  # noqa: E402
from qlearning import train_q_learning                              # noqa: E402
from sarsa import train_sarsa                                       # noqa: E402

TABLE_RUNS = [
    {"episodes": 60, "seed": 0},
    {"episodes": 120, "seed": 3, "alpha": 0.2},
    {"episodes": 80, "seed": 5, "counts": [1, 1, 8, 8], "gamma": 0.95},
    {"episodes": 500, "seed": 0},
]


def main():
    out = {}
    # Seeded games with random pushes: every state on the way.
    out["games"] = []
    for seed in (0, 1, 42):
        env = CartPole()
        rng = random.Random(seed + 100)
        state, info = env.reset(seed=seed)
        states, actions = [list(state)], []
        done = False
        while not done:
            action = rng.randrange(2) if rng.random() < 0.3 else int(state[2] + 0.25 * state[3] > 0)
            state, reward, terminated, truncated, info = env.step(action)
            actions.append(action)
            states.append(list(state))
            done = terminated or truncated
        out["games"].append({"seed": seed, "actions": actions, "states": states, "terminated": terminated, "truncated": truncated})
    out["rules"] = {}
    for rule in (always_left, random_push, lean, lean_ahead):
        mean, lengths = average_length(rule, 100)
        out["rules"][rule.__name__] = {"mean": mean, "lengths": lengths}
    out["bins"] = {"edges": [make_edges(l, c) for l, c in ((2.4, 1), (3.0, 1), (0.21, 6), (3.5, 12))],
                   "slots": [slot(v, make_edges(0.21, 6)) for v in (-0.3, -0.14, -0.1, 0.0, 0.069, 0.07, 0.2, 0.25)],
                   "state": to_state([0, 0, 3, 7], (1, 1, 6, 12))}
    out["tables"] = []
    for run in TABLE_RUNS:
        settings = {k: v for k, v in run.items() if k != "counts"}
        counts = tuple(run.get("counts", (1, 1, 6, 12)))
        for algorithm, learn in (("q_learning", train_q_learning), ("sarsa", train_sarsa)):
            env = BinnedCartPole(counts)
            Q, totals = learn(env, **settings)
            out["tables"].append({**run, "algorithm": algorithm, "Q": Q.tolist(), "totals": totals,
                                  "greedy": greedy_lengths(Q, BinnedCartPole(counts))})
    out["mc_control"] = []
    for run in ({"episodes": 60, "seed": 0}, {"episodes": 150, "seed": 1, "alpha": 0.1}):
        env = BinnedCartPole()
        Q, totals = train_mc_control(env, **run)
        out["mc_control"].append({**run, "Q": Q.tolist(), "totals": totals, "greedy": greedy_lengths(Q, BinnedCartPole())})
    samples = compare_baselines(games=200)
    out["gradient"] = {"games": 200, "baselines": {str(b): g for b, g in samples.items()}}
    weights, lengths = train_linear(episodes=120, seed=0)
    out["linear"] = {"episodes": 120, "seed": 0, "weights": weights, "lengths": lengths}
    out["neuron"] = list(train())
    path = os.path.join(HERE, "..", "engine", "parity.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(out, handle)
    print(f"wrote {os.path.relpath(path)}: {len(out['games'])} games, {len(out['tables'])} table runs")


if __name__ == "__main__":
    main()
