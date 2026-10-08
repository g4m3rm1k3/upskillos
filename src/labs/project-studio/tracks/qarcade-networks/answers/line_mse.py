import numpy as np


def make_points(n=50, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-2.0, 2.0, n)
    y = 2.0 * x + 1.0 + rng.normal(0.0, 0.1, n)
    return x, y


def predict(w, b, x):
    return w * x + b


def mse(predictions, targets):
    return float(np.mean((predictions - targets) ** 2))

