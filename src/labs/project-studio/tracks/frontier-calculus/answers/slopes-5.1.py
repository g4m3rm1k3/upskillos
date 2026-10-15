"""Slopes measured by nudging: how fast a function's output changes as its input changes."""
from collections.abc import Callable

Function = Callable[[float], float]


def nudge_slope(f: Function, x: float, h: float = 1e-6) -> float:
    """f's slope at x, measured by nudging x up by h: the rise, divided by the run h."""
    return (f(x + h) - f(x)) / h


def central_slope(f: Function, x: float, h: float = 1e-5) -> float:
    """f's slope at x, measured from x - h to x + h: a nudge both ways."""
    return (f(x + h) - f(x - h)) / (2 * h)
