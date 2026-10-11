"""Records real PyTorch runs of python/a2c.py (linear) for engine/a2c-parity.test.js: the network's
starting weights, every action PyTorch sampled, every result the world returned, and the weights
after each update. The test replays the same moves through engine/a2c.js and compares the weights.
python/a2c.py is not changed: the recording hooks are added from outside.

    python src/labs/qmaze-lab/tools/make_a2c_parity.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

import torch                          # noqa: E402
from torch.distributions import Categorical  # noqa: E402
import a2c                            # noqa: E402
import gridworld                      # noqa: E402

RUNS = [("cheese_and_cat", 25), ("frozen_lake", 25), ("cliff", 25)]


def record(name, updates):
    log = {"map": name, "updates": updates, "actions": [], "steps": [], "after": []}
    original_init, original_step, original_sample = a2c.ActorCritic.__init__, gridworld.GridWorld.step, Categorical.sample
    original_adam_step = torch.optim.Adam.step

    def init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        log["W"] = self.actor.weight.detach().double().tolist()
        log["c"] = self.critic.weight.detach().double()[0].tolist()
        log["net"] = self

    def step(self, action):
        result = original_step(self, action)
        log["steps"].append([int(result[0]), float(result[1]), bool(result[2]), bool(result[3])])
        return result

    def sample(self, *args, **kwargs):
        actions = original_sample(self, *args, **kwargs)
        log["actions"].append(actions.tolist())
        return actions

    def adam_step(self, *args, **kwargs):
        out = original_adam_step(self, *args, **kwargs)
        net = log["net"]
        log["after"].append({"W": net.actor.weight.detach().double().tolist(), "c": net.critic.weight.detach().double()[0].tolist()})
        return out

    a2c.ActorCritic.__init__, gridworld.GridWorld.step, Categorical.sample, torch.optim.Adam.step = init, step, sample, adam_step
    try:
        a2c.train_a2c(name, updates=updates, seed=0)
    finally:
        a2c.ActorCritic.__init__, gridworld.GridWorld.step, Categorical.sample, torch.optim.Adam.step = original_init, original_step, original_sample, original_adam_step
    del log["net"]
    return log


if __name__ == "__main__":
    out = [record(name, updates) for name, updates in RUNS]
    path = os.path.join(HERE, "..", "engine", "a2c-parity.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(out, handle)
    print(f"wrote {os.path.relpath(path)}: {len(out)} runs, torch {torch.__version__}")
