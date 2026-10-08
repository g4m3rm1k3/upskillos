import numpy as np


def make_curve(n=64, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-2.0, 2.0, n)
    y = x ** 2 + rng.normal(0.0, 0.05, n)
    return x, y


def relu(z):
    return np.maximum(z, 0.0)


def init(hidden=16, seed=0):
    rng = np.random.default_rng(seed)
    return {
        "W1": rng.normal(0.0, 1.0, (1, hidden)),
        "b1": np.zeros(hidden),
        "W2": rng.normal(0.0, 1.0 / np.sqrt(hidden), (hidden, 1)),
        "b2": np.zeros(1),
    }


def forward(params, x):
    X = x.reshape(-1, 1)
    z = X @ params["W1"] + params["b1"]
    h = relu(z)
    out = h @ params["W2"] + params["b2"]
    return out[:, 0], (X, z, h)

