"""Lesson 4.1's vector arithmetic on NumPy arrays."""
import numpy as np
import numpy.typing as npt

Vector = npt.NDArray[np.float64]


def cosine_array(a: Vector, b: Vector) -> float:
    """How alike two vectors' directions are, with NumPy doing the arithmetic."""
    lengths = float(np.linalg.norm(a) * np.linalg.norm(b))
    if lengths == 0:
        raise ValueError("a vector of zeros has no direction")
    return float(a @ b) / lengths


def unit(v: Vector) -> Vector:
    """v scaled to length 1: the same direction, with the length taken out."""
    size = float(np.linalg.norm(v))
    if size == 0:
        raise ValueError("a vector of zeros has no direction")
    return v / size
