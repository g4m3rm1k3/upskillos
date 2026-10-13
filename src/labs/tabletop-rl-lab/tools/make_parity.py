"""Records what the real Python programs produce, for engine/parity.test.js to compare with the
JavaScript engine. Plain Python only. Regenerate after changing any program in python/:

    python3 src/labs/tabletop-rl-lab/tools/make_parity.py
"""
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

from afterstate import train as train_value                         # noqa: E402
from dice import HANDS, roll                                         # noqa: E402
from exact import solve, start_value                                 # noqa: E402
from game import play_games                                          # noqa: E402
from learn import train, train_after                                 # noqa: E402
from players import Chaser, Planner                                  # noqa: E402
from probability import chase_matrix, chase_yahtzee, outcomes, ways  # noqa: E402
from scoring import score                                            # noqa: E402
from simulate import estimate                                        # noqa: E402
from stats import compare                                            # noqa: E402
from turn import keeps                                               # noqa: E402


def hand_key(hand):
    return "".join(str(d) for d in hand)


def main():
    out = {}
    out["rolls"] = {str(seed): [roll(5, rng) for rng in [random.Random(seed)] for _ in range(10)] for seed in (0, 1, 2)}
    out["scores"] = [[score(hand, box) for box in range(13)] for hand in HANDS]
    out["ways"] = [ways(hand) for hand in HANDS]
    out["keeps"] = [[hand_key(k) for k in keeps(hand)] for hand in HANDS]
    out["outcomes"] = {hand_key(kept): [[hand_key(h), p] for h, p in outcomes(kept)] for kept in [(), (6,), (3, 3), (1, 2, 3, 4), (5, 5, 5, 5, 5)]}
    out["chase"] = {"matrix": chase_matrix(), "dist": chase_yahtzee()}
    out["estimates"] = [estimate(2000, seed) for seed in range(5)]
    out["exact"] = {}
    for box in range(13):
        V, Q = solve(box)
        out["exact"][str(box)] = {"start": start_value(V[2]), "V1": [V[1][h] for h in HANDS], "V2": [V[2][h] for h in HANDS]}
    out["learn"] = []
    for config in [
        {"box": 5, "episodes": 3000, "method": "q", "seed": 0, "every": 1000},
        {"box": 9, "episodes": 3000, "method": "sarsa", "seed": 1, "every": 1000},
        {"box": 12, "episodes": 2000, "method": "q", "alpha": None, "seed": 2, "every": 1000},
        {"box": 11, "episodes": 2000, "method": "q", "epsilon": 0.3, "gamma": 0.9, "seed": 3, "every": 1000},
    ]:
        Q, curve = train(**config)
        table = [[hand_key(h), r, hand_key(k), v] for (h, r), row in Q.items() for k, v in row.items() if v != 0.0]
        out["learn"].append({"config": config, "curve": curve, "table": table})
    out["after"] = []
    for config in [
        {"box": 5, "episodes": 3000, "seed": 0, "every": 1000},
        {"box": 8, "episodes": 3000, "alpha": 0.1, "epsilon": 0.2, "seed": 4, "every": 1000},
    ]:
        W, curve = train_after(**config)
        out["after"].append({"config": config, "curve": curve, "W": [[r, hand_key(k), v] for (r, k), v in W.items()]})
    out["games"] = {"chaser": play_games(Chaser(), 30, 5), "planner": play_games(Planner(), 12, 7)}
    out["value"] = []
    for config in [{"games": 15, "seed": 0}, {"games": 12, "bonus": True, "alpha": 0.02, "seed": 3}]:
        weights, history = train_value(**config)
        out["value"].append({"config": config, "weights": weights, "history": history[:3]})
    mean, se, se_a = compare(Planner(), Chaser(), games=15, seed=11)
    out["compare"] = {"mean": mean, "se": se, "seA": se_a}
    with open(os.path.join(HERE, "..", "engine", "parity.json"), "w") as f:
        json.dump(out, f)


if __name__ == "__main__":
    main()
