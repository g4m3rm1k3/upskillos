"""Gradient descent: walking downhill, one step at a time."""
from collections.abc import Callable

from frontier.arrays import Vector
from frontier.slopes import Function


def downhill(slope: Function, start: float, rate: float, steps: int) -> list[float]:
    """Every guess walking downhill from start: each step moves rate times the slope, against it."""
    path = [start]
    for _ in range(steps):
        w = path[-1]
        path.append(w - rate * slope(w))
    return path


def descend(grad: Callable[[Vector], Vector], start: Vector, rate: float, steps: int) -> list[Vector]:
    """downhill for a vector: each step moves rate times the gradient, against it."""
    path = [start]
    for _ in range(steps):
        point = path[-1]
        path.append(point - rate * grad(point))
    return path
