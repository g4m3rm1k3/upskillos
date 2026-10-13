"""The same arithmetic in a Python loop and in NumPy, and how far apart their speeds are."""
import numpy as np
import numpy.typing as npt


def sum_of_squares_loop(xs: list[float]) -> float:
    """Each number squared, all added up, one number at a time."""
    total = 0.0
    for x in xs:
        total += x * x
    return total


def sum_of_squares_numpy(xs: npt.NDArray[np.float64]) -> float:
    """The same sum, done by NumPy on the whole array at once."""
    return float(np.sum(xs * xs))


def softmax_numpy(scores: npt.NDArray[np.float64]) -> npt.NDArray[np.float64]:
    """Lesson 2.6's softmax for a whole array: the largest score subtracted, then exp and divide."""
    exps = np.exp(scores - scores.max())
    probabilities: npt.NDArray[np.float64] = exps / np.sum(exps)
    return probabilities
