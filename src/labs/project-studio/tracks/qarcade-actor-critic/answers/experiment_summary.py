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
