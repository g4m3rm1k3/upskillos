"""Records real PyTorch runs of python/dqn.py for engine/dqn-parity.test.js: the returns of every
game and the network's weights at the end. The browser's copy (engine/dqn.js) starts from the same
weights and makes the same random draws, so it must end with the same numbers.

    python src/labs/qmaze-lab/tools/make_dqn_parity.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

import torch                       # noqa: E402
from dqn import train_dqn, greedy_game  # noqa: E402

torch.set_num_threads(2)
RUNS = [
    {"name": "cheese_and_cat", "steps": 1500, "start_learning": 200, "sync_every": 300, "explore_steps": 1000, "seed": 0},
    {"name": "qmaze", "steps": 1200, "start_learning": 300, "sync_every": 400, "hidden": 16, "seed": 2},
    {"name": "cheese_and_cat", "steps": 800, "start_learning": 100, "marks": False, "seed": 1},
]


def main():
    out = []
    for run in RUNS:
        net, totals = train_dqn(**run)
        layers = net.layers
        total, trail = greedy_game(net, run["name"], run.get("marks", True))
        out.append({**run, "totals": totals, "greedy": total, "trail": trail,
                    "W1": layers[0].weight.tolist(), "b1": layers[0].bias.tolist(),
                    "W2": layers[2].weight.tolist(), "b2": layers[2].bias.tolist()})
    path = os.path.join(HERE, "..", "engine", "dqn-parity.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(out, handle)
    print(f"wrote {os.path.relpath(path)}: {len(out)} runs")


if __name__ == "__main__":
    main()
