import numpy as np

from layers import relu


def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-z))


def init(inputs: int, hidden: int, seed: int) -> dict:
    """Random starting weights, scaled to the number of inputs each unit has; biases start at 0."""
    rng = np.random.default_rng(seed)
    return {
        "W1": rng.normal(0, np.sqrt(2 / inputs), (inputs, hidden)),
        "b1": np.zeros(hidden),
        "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 1)),
        "b2": np.zeros(1),
    }


def forward(params: dict, X: np.ndarray) -> tuple[np.ndarray, dict]:
    """P(pass) for each row, and the in-between values that backward needs."""
    z1 = X @ params["W1"] + params["b1"]
    hidden = relu(z1)
    z2 = hidden @ params["W2"] + params["b2"]
    return sigmoid(z2[:, 0]), {"z1": z1, "hidden": hidden}


def loss(params: dict, X: np.ndarray, y: np.ndarray) -> float:
    p = np.clip(forward(params, X)[0], 1e-15, 1 - 1e-15)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def gradients(params: dict, X: np.ndarray, y: np.ndarray) -> dict:
    """The slope of the loss with respect to every weight and bias, by backpropagation."""
    p, saved = forward(params, X)
    error_out = (p - y)[:, None] / len(y)
    error_hidden = (error_out @ params["W2"].T) * (saved["z1"] > 0)
    return {
        "W2": saved["hidden"].T @ error_out,
        "b2": error_out.sum(axis=0),
        "W1": X.T @ error_hidden,
        "b1": error_hidden.sum(axis=0),
    }


def train(params: dict, X: np.ndarray, y: np.ndarray, rate: float, steps: int,
          batch: int | None = None, momentum: float = 0.0, seed: int = 0) -> list[float]:
    """Gradient descent, on random mini-batches if batch is given, with optional momentum.
    Returns the loss on all of X after each step."""
    rng = np.random.default_rng(seed)
    velocity = {name: np.zeros_like(value) for name, value in params.items()}
    history = []
    for _ in range(steps):
        rows = rng.choice(len(y), size=batch, replace=False) if batch else np.arange(len(y))
        grads = gradients(params, X[rows], y[rows])
        for name in params:
            velocity[name] = momentum * velocity[name] - rate * grads[name]
            params[name] = params[name] + velocity[name]
        history.append(loss(params, X, y))
    return history
