"""A first loss: how wrong a single guess is about a list of numbers."""


def guess_loss(w: float, data: list[float]) -> float:
    """The mean squared error of guessing w for every number in data."""
    return sum((w - d) ** 2 for d in data) / len(data)


def guess_slope(w: float, data: list[float]) -> float:
    """guess_loss's slope at w, by the rules: twice the gap between w and the average of data."""
    return 2 * (w - sum(data) / len(data))
