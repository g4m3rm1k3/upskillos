"""Records what the real Python programs produce, for engine/parity.test.js to compare with the
JavaScript engine. Plain Python only. Regenerate after changing any program in python/:

    python3 src/labs/kart-lab/tools/make_parity.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

import linear                                                     # noqa: E402
import maxbias                                                    # noqa: E402
import race                                                       # noqa: E402
import tabular                                                    # noqa: E402
from drivers import careful, flat_out, measure, random_driver     # noqa: E402
from kart import HARBOUR, SUNLIT, drive, reset, scripted_traffic, step  # noqa: E402
from observe import hazard_mask, observe, sensor_key, sensors     # noqa: E402


def trace(policy, seed, track):
    """Every state of one lap, with its observations."""
    state = reset(seed)
    out = []
    while not state["done"]:
        cars = scripted_traffic(state["ticks"], seed, track)
        action = policy(state, cars, track)
        out.append({"state": state, "action": action, "mask": hazard_mask(state, cars, track), "key": observe(state, cars, track),
                    "near": sensors(state, cars, track), "sensor": sensor_key(state, cars, track), "x": linear.features(state, cars, track)})
        state = step(state, action, track, cars)
    out.append({"state": state})
    return out


def table_list(tables):
    return [[[k, v] for k, v in Q.items()] for Q in tables]


def main():
    out = {}
    out["laps"] = [{"seed": s, "track": t["name"], "steps": trace(p, s, t)} for s, t, p in [
        (1, SUNLIT, careful), (7, SUNLIT, random_driver(3)), (11, HARBOUR, careful), (5, HARBOUR, flat_out)]]
    out["rules"] = {"careful": measure(careful), "careful_harbour": measure(careful, track=HARBOUR), "random": measure(random_driver(0)), "flat": measure(flat_out)}
    out["train"] = []
    for config in [{"episodes": 60, "seed": 19}, {"episodes": 60, "seed": 73, "method": "sarsa", "penalty": 2},
                   {"episodes": 60, "seed": 137, "method": "double"}, {"episodes": 80, "seed": 5, "view": "sensors", "traffic": False}]:
        tables, totals = tabular.train(config)
        out["train"].append({"config": config, "totals": totals, "tables": table_list(tables), "eval": tabular.evaluate(tables, config, laps=10)})
    weights = linear.train(episodes=40, seed=3)
    out["linear"] = {"weights": weights, "eval": linear.evaluate(weights, laps=10), "harbour": linear.evaluate(weights, HARBOUR, laps=10)}
    out["maxbias"] = {"q": maxbias.left_rate("q", runs=40, episodes=100), "double": maxbias.left_rate("double", runs=40, episodes=100)}
    q, _ = tabular.train({"episodes": 200, "seed": 19})
    s, _ = tabular.train({"episodes": 200, "seed": 4, "view": "sensors"})
    policies = [tabular.driver(q), tabular.driver(s, "sensors"), linear.driver(weights)]
    r = race.run_race(policies)
    out["race"] = {"cars": r["cars"], "tick": r["tick"], "rank": race.rank_race(r), "tournament": race.tournament(policies)}
    with open(os.path.join(HERE, "..", "engine", "parity.json"), "w") as f:
        json.dump(out, f)


if __name__ == "__main__":
    main()
