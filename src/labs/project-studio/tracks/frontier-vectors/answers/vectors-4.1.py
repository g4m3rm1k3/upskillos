"""Documents as vectors: lists of numbers that can be compared."""
import math

from frontier.text import tally


def vocabulary(documents: list[list[str]]) -> list[str]:
    """Every word in any of the documents, once each, in alphabetical order."""
    return sorted({word for words in documents for word in words})


def count_vector(words: list[str], vocab: list[str]) -> list[float]:
    """How often each vocabulary word occurs in words, in the vocabulary's order."""
    counts = tally(words)
    return [float(counts.get(word, 0)) for word in vocab]


def dot(a: list[float], b: list[float]) -> float:
    """The dot product: each pair of matching numbers multiplied, then all added up."""
    return sum(x * y for x, y in zip(a, b, strict=True))


def length(v: list[float]) -> float:
    """How long the vector is as an arrow: the square root of its dot product with itself."""
    return math.sqrt(dot(v, v))


def cosine(a: list[float], b: list[float]) -> float:
    """How alike two vectors' directions are: 1 for the same direction, 0 for nothing shared."""
    if length(a) == 0 or length(b) == 0:
        raise ValueError("a vector of zeros has no direction")
    return dot(a, b) / (length(a) * length(b))
