"""A collection of texts as a matrix: one row per text, one column per word."""
import numpy as np
import numpy.typing as npt

from frontier.arrays import Vector, unit
from frontier.text import split_words
from frontier.vectors import count_vector, vocabulary

Matrix = npt.NDArray[np.float64]


def text_vector(text: str, vocab: list[str]) -> Vector:
    """text's count vector over vocab, scaled to length 1. Words outside vocab are left out."""
    return unit(np.array(count_vector(split_words(text), vocab)))


def text_matrix(texts: list[str]) -> tuple[Matrix, list[str]]:
    """Every text as a row of unit length, and the vocabulary that names the columns."""
    vocab = vocabulary([split_words(text) for text in texts])
    return np.array([text_vector(text, vocab) for text in texts]), vocab


def times_vector(m: Matrix, v: Vector) -> Vector:
    """m @ v by hand: each row of m dotted with v."""
    return np.array([float(row @ v) for row in m])


def times(a: Matrix, b: Matrix) -> Matrix:
    """a @ b by hand: entry i, j is row i of a dotted with column j of b."""
    out = np.zeros((a.shape[0], b.shape[1]))
    for i in range(a.shape[0]):
        for j in range(b.shape[1]):
            out[i, j] = a[i] @ b[:, j]
    return out
