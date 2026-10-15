"""The chain rule: the slope of functions applied one after another."""
from frontier.slopes import Function

Piece = tuple[Function, Function]


def forward(pieces: list[Piece], x: float) -> list[float]:
    """x, then each piece's output in turn: every value along the chain."""
    values = [x]
    for f, _ in pieces:
        values.append(f(values[-1]))
    return values


def chain_slope(pieces: list[Piece], x: float) -> float:
    """The whole chain's slope at x: each piece's slope at its own input, multiplied, last piece first."""
    values = forward(pieces, x)
    slope = 1.0
    for i in reversed(range(len(pieces))):
        _, df = pieces[i]
        slope *= df(values[i])
    return slope
