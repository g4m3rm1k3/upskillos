"""Trains the PyTorch learners (REINFORCE, A2C, DQN) on three seeds each and records their learning
curves and greedy results in engine/measured.json, for the lessons' charts. One run at a time, two
threads, CPU only. Takes about 15 minutes:

    python src/labs/cartpole-lab/tools/measure.py
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))

import torch  # noqa: E402

from a2c import play_greedy, train_a2c  # noqa: E402
from cartpole import CartPole            # noqa: E402
from dqn import train_dqn                # noqa: E402
from reinforce import train_reinforce    # noqa: E402

SEEDS = (0, 1, 2)


def greedy_policy_lengths(net, games=20, seed=1000):
    """20 new games, always the network's top-scoring push (for networks with one output)."""
    env = CartPole()
    lengths = []
    for game in range(games):
        state, info = env.reset(seed=seed + game)
        done = False
        while not done:
            with torch.no_grad():
                action = int(net(torch.tensor(state)).argmax())
            state, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
        lengths.append(env.steps)
    return lengths


def main():
    torch.set_num_threads(2)
    out = {"reinforce": [], "a2c": [], "dqn": []}
    for seed in SEEDS:
        for name, train, greedy in (("reinforce", lambda s: train_reinforce(seed=s), greedy_policy_lengths),
                                    ("a2c", lambda s: train_a2c(seed=s), play_greedy),
                                    ("dqn", lambda s: train_dqn(seed=s), greedy_policy_lengths)):
            start = time.perf_counter()
            net, lengths = train(seed)
            seconds = time.perf_counter() - start
            out[name].append({"seed": seed, "lengths": lengths, "greedy": greedy(net), "seconds": round(seconds, 1),
                              "steps": int(sum(lengths))})
            print(name, seed, f"{seconds:.0f} s", "greedy", sum(out[name][-1]["greedy"]) / 20, flush=True)
    path = os.path.join(HERE, "..", "engine", "measured.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(out, handle)
    print("wrote", os.path.relpath(path))


if __name__ == "__main__":
    main()
