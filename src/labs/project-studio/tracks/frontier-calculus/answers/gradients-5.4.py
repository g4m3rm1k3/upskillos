"""Gradients: the slope along every input of a function of several numbers."""
from collections.abc import Callable

import numpy as np

from frontier.arrays import Vector

Surface = Callable[[Vector], float]


def partial(f: Surface, point: Vector, i: int, h: float = 1e-5) -> float:
    """f's slope along input i at point, every other input held still: a nudge both ways."""
    up = point.copy()
    up[i] += h
    down = point.copy()
    down[i] -= h
    return (f(up) - f(down)) / (2 * h)


def gradient(f: Surface, point: Vector, h: float = 1e-5) -> Vector:
    """Every partial slope of f at point, as one vector: the direction of steepest climb."""
    return np.array([partial(f, point, i, h) for i in range(len(point))])
