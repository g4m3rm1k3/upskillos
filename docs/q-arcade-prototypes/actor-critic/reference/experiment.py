import csv
import multiprocessing as mp
import time

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch

from a2c import play_greedy, train_a2c

VARIANTS = {
    "A2C": {},
    "no entropy bonus": {"entropy_coef": 0.0},
    "1-step returns": {"n_steps": 1},
}


def summarise(results, variant):
    curves = np.array([[length for _, length in r["curve"]] for r in results if r["variant"] == variant])
    steps = [s for s, _ in next(r["curve"] for r in results if r["variant"] == variant)]
    mean = curves.mean(axis=0)
    error = curves.std(axis=0, ddof=1) / np.sqrt(len(curves)) if len(curves) > 1 else np.zeros_like(mean)
    return steps, mean, error


def save_csv(results, path="results.csv"):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["variant", "seed", "greedy_mean_length"])
        for r in results:
            writer.writerow([r["variant"], r["seed"], r["greedy"]])


def plot(results, path="results.png"):
    fig, ax = plt.subplots(figsize=(7, 4))
    for variant in dict.fromkeys(r["variant"] for r in results):
        steps, mean, error = summarise(results, variant)
        ax.plot(steps, mean, label=variant)
        ax.fill_between(steps, mean - error, mean + error, alpha=0.25)
    ax.set_xlabel("environment steps")
    ax.set_ylabel("greedy score (5 fresh games)")
    ax.set_title("A2C on CartPole-v1: mean ± standard error over seeds")
    ax.legend()
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def run(job):
    name, settings, seed, total_steps = job
    torch.set_num_threads(1)
    net, curve = train_a2c(seed=seed, total_steps=total_steps, quiet=True, **settings)
    return {"variant": name, "seed": seed, "curve": curve, "greedy": float(play_greedy(net).mean())}


def run_experiment(seeds=5, total_steps=200_000, workers=2, variants=VARIANTS):
    jobs = [(name, settings, seed, total_steps) for name, settings in variants.items() for seed in range(seeds)]
    with mp.get_context("spawn").Pool(min(workers, 2)) as pool:
        return pool.map(run, jobs)


if __name__ == "__main__":
    start = time.perf_counter()
    results = run_experiment()
    save_csv(results)
    plot(results)
    for variant in VARIANTS:
        scores = [r["greedy"] for r in results if r["variant"] == variant]
        print(f"{variant:18} greedy score {np.mean(scores):6.1f} ± {np.std(scores, ddof=1) / np.sqrt(len(scores)):5.1f}  (seeds: {scores})")
    print(f"saved results.csv and results.png in {time.perf_counter() - start:.0f} s")
