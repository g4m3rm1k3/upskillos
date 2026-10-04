import numpy as np


def relu(z: np.ndarray) -> np.ndarray:
    return np.maximum(0, z)


def layer(X: np.ndarray, W: np.ndarray, b: np.ndarray) -> np.ndarray:
    """One layer: every unit's weighted sum of the inputs plus its bias, then ReLU."""
    return relu(X @ W + b)


def diamond(X: np.ndarray, size: float) -> np.ndarray:
    """A hand-made network: four hidden units measuring |dx| and |dy|, then pass if they add up to at most size."""
    W = np.array([[1.0, -1.0, 0.0, 0.0], [0.0, 0.0, 1.0, -1.0]])
    hidden = layer(X, W, np.zeros(4))
    return (hidden.sum(axis=1) <= size).astype(int)
