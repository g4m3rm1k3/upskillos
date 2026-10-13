"""Floats: comparing them, and a softmax that survives huge and tiny scores."""
import math


def close(a: float, b: float, tolerance: float = 1e-9) -> bool:
    """Whether a and b differ by at most tolerance, as a fraction of the bigger one."""
    return abs(a - b) <= tolerance * max(abs(a), abs(b))


def softmax_naive(scores: list[float]) -> list[float]:
    """Turn scores into probabilities that add up to 1, the textbook way."""
    exps = [math.exp(score) for score in scores]
    total = sum(exps)
    return [e / total for e in exps]


def softmax(scores: list[float]) -> list[float]:
    """The same probabilities, with the largest score subtracted first so exp can't overflow."""
    biggest = max(scores)
    exps = [math.exp(score - biggest) for score in scores]
    total = sum(exps)
    return [e / total for e in exps]
