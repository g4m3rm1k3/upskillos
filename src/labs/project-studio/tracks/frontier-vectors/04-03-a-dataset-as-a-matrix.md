---
title: 4.3 — A Dataset as a Matrix
runtime: python
support: tests/conftest.py
---

Lesson 4.2 ended with unit vectors: divide a text's counts by the vector's length, and comparing two texts is a single dot product. This lesson stacks many of those vectors into one table, one text per row. A table of numbers like that is a **matrix**. Then one multiplication compares a question with every text at once, which is how a search finds the texts closest to a question (Chapter 69 does exactly this to search your documents for a language model). A second multiplication compares every text with every other.

Matrix multiplication is the operation every model in this series spends most of its time on. Lesson 0.3 used it, as `@` on two tables of random numbers, without saying what it computes. Here you write it by hand, with loops, out of the dot product from 4.1, and check it against NumPy's `@`.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_matrix.py**:

```python file=tests/test_matrix.py provided
# Tests for frontier.matrix (lesson 4.3): texts as the rows of a matrix, and multiplying by hand.
import math

import numpy as np
import pytest

TEXTS = ["the cat sat on the mat", "the dog sat on the log", "a cat chased a dog"]


def test_rows_one_per_text_one_column_per_word():
    from frontier.matrix import text_matrix
    m, vocab = text_matrix(TEXTS)
    assert vocab == ["a", "cat", "chased", "dog", "log", "mat", "on", "sat", "the"]
    assert m.shape == (3, 9)


def test_rows_have_length_one():
    from frontier.matrix import text_matrix
    m, _ = text_matrix(TEXTS)
    for i in range(3):
        assert math.isclose(float(np.linalg.norm(m[i])), 1.0)


def test_rows_are_the_texts_in_order():
    from frontier.arrays import unit
    from frontier.matrix import text_matrix
    m, _ = text_matrix(TEXTS)
    cat = np.array([0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 2.0])
    assert np.allclose(m[0], unit(cat))


def test_question_leaves_out_unknown_words():
    from frontier.arrays import unit
    from frontier.matrix import text_vector
    vocab = ["cat", "mat", "the"]
    assert np.allclose(text_vector("the cat flew", vocab), unit(np.array([1.0, 0.0, 1.0])))


def test_product_by_hand_matches_numpy():
    from frontier.matrix import times_vector
    rng = np.random.default_rng(1)
    m = rng.random((4, 6))
    v = rng.random(6)
    assert times_vector(m, v).shape == (4,)
    assert np.allclose(times_vector(m, v), m @ v)


def test_product_refuses_mismatched_sizes():
    from frontier.matrix import times_vector
    with pytest.raises(ValueError):
        times_vector(np.zeros((2, 3)), np.zeros(4))


def test_multiply_small_by_hand():
    from frontier.matrix import times
    a = np.array([[1.0, 2.0], [3.0, 4.0]])
    b = np.array([[5.0, 6.0], [7.0, 8.0]])
    assert times(a, b).tolist() == [[19.0, 22.0], [43.0, 50.0]]


def test_multiply_answer_shape():
    from frontier.matrix import times
    assert times(np.zeros((2, 3)), np.zeros((3, 5))).shape == (2, 5)


def test_multiply_matches_numpy():
    from frontier.matrix import times
    rng = np.random.default_rng(2)
    a = rng.random((3, 4))
    b = rng.random((4, 2))
    assert np.allclose(times(a, b), a @ b)


def test_multiply_refuses_mismatched_shapes():
    from frontier.matrix import times
    with pytest.raises(ValueError):
        times(np.zeros((2, 3)), np.zeros((4, 2)))
```

- **`text_matrix`** turns a list of texts into a matrix, plus the vocabulary: one row per text, in order, one column per vocabulary word, and every row of length 1. `m[i]` is row `i`; the next step shows how a matrix is read. `np.allclose(x, y)` is `math.isclose` for two whole arrays: true when every pair of matching numbers is close.
- **`text_vector`** turns one text, a question, into a unit vector over a vocabulary it's given. A word outside the vocabulary ("flew") is left out.
- **`times_vector`** and **`times`** are multiplication by hand: a matrix times a vector, then a matrix times a matrix. Each is checked against NumPy's own `@` on random numbers, where `rng.random((4, 6))` is a table of random numbers 4 rows by 6 columns. Each must also refuse sizes that don't fit, with a `ValueError`. `times` is your Your turn.

```check
file tests/test_matrix.py -- Click "Create provided tests/test_matrix.py" above.
```

## A table of numbers

A matrix is a table of numbers: rows across, columns down. In NumPy it's an array made from a list of rows, each row a list of numbers, and its `shape` has two numbers: `(rows, columns)`. Reading from it takes up to two positions, the row first:

- `m[1]` is row 1 (counting from 0, as always): a vector.
- `m[:, 2]` is column 2. The `:` alone is a slice with no start and no end, so it means "every row", and the 2 then picks position 2 from each of them.
- `m[1, 2]` is the single number in row 1, column 2.

Many NumPy operations can work along one direction of a matrix. `m.sum()` adds up every number; `m.sum(axis=0)` adds along **axis 0**, the rows, the first number in the shape. Adding along the rows collapses them, leaving one total per column. `axis=1` collapses the columns instead, leaving one total per row. Create `experiments/matrix_basics.py`:

```python file=experiments/matrix_basics.py
"""A matrix: a table of numbers, as a 2-D NumPy array."""
import numpy as np

m = np.array([
    [1.0, 2.0, 3.0],
    [4.0, 5.0, 6.0],
])
print("shape:", m.shape)
print("row 1:", m[1])
print("column 2:", m[:, 2])
print("row 1, column 2:", m[1, 2])
print("each column added up:", m.sum(axis=0))
print("each row added up:", m.sum(axis=1))
```

The matrix is written over several lines so its rows line up, which Python allows inside brackets. It has 2 rows of 3 numbers, so its shape is `(2, 3)`. The last two lines add it up in the two directions.

```predict
question: What does `m.sum(axis=0)` print?
choice: [ 6. 15.]
choice: [5. 7. 9.]
choice: 21.0
answer: [5. 7. 9.]
explain: `axis=0` is the rows, and adding along them collapses them: 1 + 4, 2 + 5 and 3 + 6, one total per column. `[ 6. 15.]` is `axis=1`, one total per row, and 21.0 is `m.sum()` with no axis at all.
verify: script columns_added.py
```

Run it:

```powershell
.venv\Scripts\python experiments/matrix_basics.py
```

```text
shape: (2, 3)
row 1: [4. 5. 6.]
column 2: [3. 6.]
row 1, column 2: 6.0
each column added up: [5. 7. 9.]
each row added up: [ 6. 15.]
```

A row and a column both come out as plain vectors, printed the same way. NumPy doesn't keep a column standing up: `m[:, 2]` is just the numbers 3 and 6.

```check
run ".venv/Scripts/python experiments/matrix_basics.py" stdout="column 2: [3. 6.]" label="a column is read with m[:, 2]" -- The comma matters: m[:, 2] is column 2, while m[:2] is the first two rows.
run ".venv/Scripts/python experiments/matrix_basics.py" stdout="each column added up: [5. 7. 9.]" label="axis=0 gives one total per column" -- m.sum(axis=0) adds along the rows, leaving a total for each column.
```

## Texts as rows

Now the real matrix. Every text becomes one row: its count vector over a vocabulary shared by all the texts, scaled to length 1 with 4.2's `unit`. The vocabulary has to be shared, so that column 5, say, means the same word in every row; otherwise comparing two rows would mean nothing.

Two functions do it:

- `text_vector(text, vocab)` makes one text's row. It splits the text into words with lesson 1.3's `split_words`, counts them with 4.1's `count_vector`, makes an array with `np.array`, and scales it with `unit`. A word that isn't in the vocabulary has no column, so `count_vector` leaves it out. That's what lets a question with new words in it still become a vector the matrix can be compared with.
- `text_matrix(texts)` builds the vocabulary from all the texts with 4.1's `vocabulary`, makes every text's row, and turns the list of rows into one matrix with `np.array`, as the experiment did with its list of lists. It returns both as a tuple: the matrix, and the vocabulary that says what each column means.

`Matrix` is a type alias like 4.2's `Vector`, and the same array type: NumPy's type hints don't record how many dimensions an array has, but the name tells a reader which to expect. Create `src/frontier/matrix.py`:

```python file=src/frontier/matrix.py
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
    """Every text as a row of length 1, and the vocabulary that names the columns."""
    vocab = vocabulary([split_words(text) for text in texts])
    return np.array([text_vector(text, vocab) for text in texts]), vocab
```

For the tests' three texts the vocabulary has 9 words, so the matrix is 3 rows by 9 columns, shape `(3, 9)`. `text_matrix` splits each text twice, once for the vocabulary and once in `text_vector`. That's simpler than passing lists of words around, and for a handful of texts it costs nothing worth measuring.

```check
run ".venv/Scripts/python -m pytest -q tests/test_matrix.py -k rows" label="one row of length 1 per text" -- Build vocab from every text first, then one text_vector(text, vocab) per text, and np.array the list of rows.
run ".venv/Scripts/python -m pytest -q tests/test_matrix.py -k question" label="a question leaves out words it can't place" -- text_vector is unit(np.array(count_vector(split_words(text), vocab))).
run ".venv/Scripts/python -m mypy --strict src/frontier/matrix.py" stdout="Success" label="mypy --strict passes" -- Matrix = npt.NDArray[np.float64]; text_matrix returns tuple[Matrix, list[str]].
```

## A matrix times a vector

Here's what the matrix is for. Take a question, made into a unit vector over the same vocabulary. Its dot product with row 0 is its cosine with text 0, since both have length 1 (4.2's Your turn showed why). Its dot product with row 1 is its cosine with text 1. Do that for every row, and you have the question compared with every text: a vector of answers, one per row.

That is what **a matrix times a vector** means: each row of the matrix dotted with the vector. A matrix of 5 rows and 18 columns times a vector of 18 numbers gives a vector of 5. The vector's length must equal the matrix's number of columns, since every row has to pair up with it number for number.

By hand first. A `for` loop over a matrix visits its rows, one vector at a time: `m[0]`, then `m[1]`, and so on. So a list comprehension over `m` dots each row with `v`, `float` turns each answer into a plain Python float, and `np.array` makes the list of answers into a vector. Add `times_vector` at the end of `src/frontier/matrix.py`:

```python file=src/frontier/matrix.py
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
    """Every text as a row of length 1, and the vocabulary that names the columns."""
    vocab = vocabulary([split_words(text) for text in texts])
    return np.array([text_vector(text, vocab) for text in texts]), vocab


def times_vector(m: Matrix, v: Vector) -> Vector:
    """m @ v by hand: each row of m dotted with v."""
    return np.array([float(row @ v) for row in m])
```

If `v` has the wrong length, `row @ v` raises a `ValueError` itself, as `@` did in 4.2, so there's nothing extra to check. The test compares your `times_vector(m, v)` with NumPy's `m @ v`: `@` between a matrix and a vector does exactly this, every row dotted with the vector, in C.

```check
run ".venv/Scripts/python -m pytest -q tests/test_matrix.py -k product" label="times_vector matches m @ v, and refuses a wrong size" -- One dot product per row: np.array([float(row @ v) for row in m]).
```

## One question, every text

Now use it. This experiment builds a matrix from five texts, three about animals and two about the stock market. It turns a question into a vector over the same vocabulary, then compares it with all five texts in one step, `m @ question`. Each score is a cosine: 1 means the same words in the same proportions, 0 means no word in common. Create `experiments/search_texts.py`:

```python file=experiments/search_texts.py
"""One question against every text at once: a matrix times a vector."""
from frontier.matrix import text_matrix, text_vector

texts = [
    "the cat sat on the mat",
    "the dog sat on the log",
    "a cat chased a dog",
    "the stock market fell today",
    "markets rose as stocks recovered",
]
m, vocab = text_matrix(texts)
question = text_vector("a cat on a mat", vocab)
scores = m @ question
for score, text in zip(scores, texts):
    print(f"{score:.3f}  {text}")
```

`m` has 5 rows, one per text, and 18 columns, one per word in the five texts. `scores` is a vector of 5 cosines, and `zip` pairs each with its text so they print side by side.

```predict
question: The question is "a cat on a mat". Which text gets the highest score?
choice: the cat sat on the mat
choice: a cat chased a dog
choice: the dog sat on the log
answer: a cat chased a dog
explain: The question has "a" twice, and so does "a cat chased a dog": 2 × 2 = 4 in the dot product from that one small word, plus 1 for "cat", so 5. Both vectors have length √7, so the cosine is 5 / 7 = 0.714. "the cat sat on the mat" shares "cat", "on" and "mat", 1 each, so only 3, and its two "the"s make it longer without matching anything in the question: 3 / (√7 × √8) = 0.401.
verify: script top_text.py
```

```powershell
.venv\Scripts\python experiments/search_texts.py
```

```text
0.401  the cat sat on the mat
0.134  the dog sat on the log
0.714  a cat chased a dog
0.000  the stock market fell today
0.000  markets rose as stocks recovered
```

Counting words has limits, and this output shows one: the commonest words, "a" and "the", weigh as much as the words that carry the meaning, and here "a" decides the winner. The next step shows another. The arithmetic is still the right arithmetic: Chapter 29 learns vectors in which words with similar meanings point in similar directions, and comparing a question with every text is still a matrix times a vector.

```check
run ".venv/Scripts/python experiments/search_texts.py" stdout="0.714  a cat chased a dog" label="the question is compared with every text" -- m, vocab = text_matrix(texts); question = text_vector("a cat on a mat", vocab); scores = m @ question.
```

## Your turn: a matrix times a matrix

A matrix times a vector compares one question with every text. To compare several questions at once, put them in a matrix too, one question per **column**, and multiply matrix by matrix. Each column of the second matrix gets the matrix-times-a-vector treatment, and the answers sit side by side, one column each.

So in `a @ b`, the entry in row `i`, column `j` of the answer is row `i` of `a` dotted with column `j` of `b`. That's the whole of matrix multiplication. Click any entry of the answer in the figure to see the row and column it comes from:

```figure
name: frontier/MatrixTimes
caption: A 2 × 3 matrix times a 3 × 2 one. Each entry of the answer is one row of a dotted with one column of b.
props: {"a": [[1, 2, 3], [4, 5, 6]], "b": [[1, 0], [0, 1], [1, 1]]}
```

Two rules follow from that one. A row of `a` must pair up number for number with a column of `b`, so `a`'s number of columns must equal `b`'s number of rows. And the answer has an entry for every row of `a` and every column of `b`, so its shape is (rows of `a`, columns of `b`): a `(2, 3)` matrix times a `(3, 2)` one gives a `(2, 2)`.

Lesson 0.3 multiplied two 64 × 64 matrices. That's 4,096 entries, each a dot product of 64 pairs: 262,144 multiplications. Models multiply far bigger matrices than that, over and over, which is why NumPy's and PyTorch's `@`, and the GPUs of later chapters, are built to do this one operation fast.

**Build, on your own:** `times(a, b)` at the end of `src/frontier/matrix.py`: `a @ b` by hand, taking two `Matrix` arguments and returning a `Matrix`. Three things you'll need:

- `np.zeros` with a two-number shape makes a matrix of zeros to fill in: `np.zeros((2, 5))` is 2 rows by 5 columns. The shape is a tuple, hence the two pairs of brackets.
- `a.shape[0]` is `a`'s number of rows, and `b.shape[1]` is `b`'s number of columns.
- `out[i, j] = ...` sets one entry, written the same way `m[1, 2]` reads one.

Use two loops, one inside the other: every row `i` of the answer, and within each row every column `j`. When the shapes don't fit, `@` between a row of `a` and a column of `b` raises the `ValueError` the tests expect, as in `times_vector`, so there's no separate check to write.

```hints
nudge: Make the answer with np.zeros((a.shape[0], b.shape[1])). Loop i over range(a.shape[0]), and inside that, j over range(b.shape[1]).
concept: Entry i, j is a[i] @ b[:, j]: row i of a dotted with column j of b. Set out[i, j] to it inside both loops, and return out after them.
answer: At the end of `src/frontier/matrix.py`:
~~~python
def times(a: Matrix, b: Matrix) -> Matrix:
    """a @ b by hand: entry i, j is row i of a dotted with column j of b."""
    out = np.zeros((a.shape[0], b.shape[1]))
    for i in range(a.shape[0]):
        for j in range(b.shape[1]):
            out[i, j] = a[i] @ b[:, j]
    return out
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_matrix.py -k multiply" label="times matches a @ b, with the right shape" -- Entry i, j is row i of a dotted with column j of b, and the answer is np.zeros((a.shape[0], b.shape[1])) filled in.
run ".venv/Scripts/python -m pytest -q tests/test_matrix.py tests/test_arrays.py tests/test_vectors.py" label="every vector and matrix test passes" -- Leave text_vector, text_matrix and times_vector as they were.
run ".venv/Scripts/python -m mypy --strict src/frontier/matrix.py" stdout="Success" label="mypy --strict still passes" -- times takes two Matrix arguments and returns a Matrix.
```

## Every text against every other, and onto GitHub

Last, the whole table: every text compared with every other. That's a matrix multiplication with the texts on both sides. `m` has one text per row, and to dot every row with every row, the second matrix needs the texts as its **columns**. `m.T` is `m` **transposed**, rows turned into columns: column `j` of `m.T` is row `j` of `m`. With `m` at `(5, 18)`, `m.T` is `(18, 5)`, and `m @ m.T` is `(5, 5)`. Its entry `i, j` is text `i` dotted with text `j`: their cosine. Like a slice, `m.T` is a view, so no numbers are copied.

The experiment prints the table rounded to 2 places with `np.round(array, 2)`, which rounds every number in an array, and checks your `times` against `@` with `np.allclose`. It needs only the matrix, so the vocabulary goes into `_`. Create `experiments/all_pairs.py`, with the same five texts as `search_texts.py` (copy the list across):

```python file=experiments/all_pairs.py
"""Every text against every other: a matrix times its own transpose."""
import numpy as np

from frontier.matrix import text_matrix, times

texts = [
    "the cat sat on the mat",
    "the dog sat on the log",
    "a cat chased a dog",
    "the stock market fell today",
    "markets rose as stocks recovered",
]
m, _ = text_matrix(texts)
print("m:", m.shape, " m.T:", m.T.shape)
similar = m @ m.T
print(np.round(similar, 2))
print("by hand agrees:", np.allclose(times(m, m.T), similar))
```

Row `i` of the table is text `i` compared with all five, in the same order as the list.

```powershell
.venv\Scripts\python experiments/all_pairs.py
```

```text
m: (5, 18)  m.T: (18, 5)
[[1.   0.75 0.13 0.32 0.  ]
 [0.75 1.   0.13 0.32 0.  ]
 [0.13 0.13 1.   0.   0.  ]
 [0.32 0.32 0.   1.   0.  ]
 [0.   0.   0.   0.   1.  ]]
by hand agrees: True
```

What the table shows:

- **The diagonal is all 1s.** Entry `i, i` is a text against itself.
- **It's symmetric**, the same either side of the diagonal: text `i` dotted with text `j` is text `j` dotted with text `i`.
- **0.75** for the cat and dog sentences is 4.1's cosine again, now one entry among 25.
- **0.32** links the stock market to the cat and the dog, all from the word "the".
- **The last text matches nothing**, not even the other market text: "markets" and "stocks" aren't "market" and "stock", and counting words can't tell that they mean the same. That's the second limit, and Chapter 29's learned vectors are the fix.

Commit and push:

```powershell
git add .
git commit -m "Texts as a matrix, and matrix multiplication by hand"
git push
```

```check
run ".venv/Scripts/python experiments/all_pairs.py" stdout="by hand agrees: True" label="your times agrees with m @ m.T" -- similar = m @ m.T, then np.allclose(times(m, m.T), similar).
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  matrix.py              Matrix, text_vector, text_matrix, times_vector, times
experiments/
  matrix_basics.py       shape, rows, columns, single entries, and sums along each axis
  search_texts.py        one question against five texts: a matrix times a vector
  all_pairs.py           every text against every other: m @ m.T, checked against your times
tests/
  test_matrix.py         -k rows, question, product, multiply
```

Next lesson: `text_matrix` scales its rows one at a time, in a Python loop. **Broadcasting** lets NumPy do arithmetic between arrays of different shapes, such as a whole matrix divided by a vector of row lengths, so every row is scaled at once.
