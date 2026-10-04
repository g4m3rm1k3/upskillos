---
title: 11.2 — The Directions That Matter: Principal Components
track: Dimensionality Reduction — Inspection Data
runtime: none
concepts: pca
revisits: matrices, dot-product, vectors, descriptive-statistics, numpy, scikit-learn, testing
notebook: ml-pca
lab: 18
problem: The correlation matrix showed blocks of features that move together. Is there a way to find, automatically, the few directions in ten-dimensional space along which the parts really vary, and how much of the variation each one accounts for?
---

Each part is a point in ten-dimensional space: one axis per feature. You can't draw that, but you can reason about it. The 400 points form a cloud, and because the features move in blocks, the cloud isn't round: it's stretched out a long way in a few directions and barely at all in most others.

The idea of **principal component analysis** is to find those directions: the one along which the cloud is longest, then the longest one at right angles to it, and so on. If the first two or three account for nearly all the spread, then two or three numbers per part say nearly everything the ten did.

> **Principal components**: a set of directions (unit vectors) in feature space, ordered by how much of the data's variance lies along each. The first is the direction of greatest variance; each later one is the direction of greatest variance at right angles (**orthogonal**) to all the earlier ones.
>
> *Picture it as* turning a part in your hand to find the view where it looks longest, then, keeping that view's axis fixed, turning it to find where it looks widest across. Those two viewing directions are the part's most informative ones; a third view adds only its thickness.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_components.py provided
# Tests for pca.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_components.py
import numpy as np
from pytest import approx
from sklearn.decomposition import PCA

import measurements
import spread

_, _, X = measurements.load("data/measurements.csv")
Z = spread.standardise(X)
C = spread.covariance(Z)


def test_variance_along_a_direction_equals_the_variance_of_the_projections():
    import pca
    direction = np.ones(10) / np.sqrt(10)
    assert pca.variance_along(C, direction) == approx(np.var(Z @ direction))


def test_power_iteration_finds_the_most_stretched_direction():
    import pca
    v, stretch = pca.power_iteration(np.array([[2.0, 1.0], [1.0, 2.0]]))
    assert np.abs(v) == approx([np.sqrt(0.5), np.sqrt(0.5)])
    assert stretch == approx(3.0)


def test_power_iteration_returns_a_unit_vector():
    import pca
    v, _ = pca.power_iteration(C)
    assert np.linalg.norm(v) == approx(1.0)


def test_components_match_numpy_eigh():
    import pca
    directions, variances = pca.components(C, 3)
    values, vectors = np.linalg.eigh(C)
    assert variances == approx(values[::-1][:3])
    assert np.allclose(np.abs(directions), np.abs(vectors[:, ::-1][:, :3].T), atol=1e-6)


def test_components_match_scikit_learn_pca():
    import pca
    directions, variances = pca.components(C, 3)
    theirs = PCA(n_components=3).fit(Z)
    assert np.allclose(np.abs(directions), np.abs(theirs.components_), atol=1e-6)
    assert variances / np.trace(C) == approx(theirs.explained_variance_ratio_)
```

- The comparisons use **`np.abs`**: a direction and its exact opposite describe the same line through the cloud, and different methods may return either one. Only the sign can differ.
- **`np.linalg.eigh`** is NumPy's built-in method for exactly this problem, for a symmetric matrix like a covariance matrix. It returns the answers smallest first, so the test reverses them with `[::-1]`.

```check
file tests/test_components.py -- Click "Create provided tests/test_components.py" above.
```

## Variance along a direction

To measure how spread out the cloud is along a direction $\mathbf{v}$ (a unit vector, length 1), **project** every part onto it: the dot product $\mathbf{z} \cdot \mathbf{v}$ (lesson 2.1) gives how far along that direction the part lies. For all parts at once, that's $Z\mathbf{v}$, one number per part. Its variance is the spread along $\mathbf{v}$.

There's a shortcut that doesn't need the data at all, only the covariance matrix:

$$\text{variance along } \mathbf{v} = \mathbf{v}^\top C\,\mathbf{v}$$

Why: the projections are centred (the columns of $Z$ have mean 0), so their variance is $\frac{1}{n}(Z\mathbf{v})^\top(Z\mathbf{v}) = \mathbf{v}^\top \left(\frac{1}{n}Z^\top Z\right)\mathbf{v} = \mathbf{v}^\top C\,\mathbf{v}$. The covariance matrix holds the spread of the cloud in *every* direction at once, and $\mathbf{v}^\top C\mathbf{v}$ reads off one of them.

Create `pca.py`:

```python file=pca.py
import numpy as np


def variance_along(C: np.ndarray, direction: np.ndarray) -> float:
    """The variance of the data along a unit-length direction, from its covariance matrix."""
    return float(direction @ C @ direction)
```

With one-dimensional arrays, `direction @ C @ direction` does both multiplications: `direction @ C` is a row of 10 numbers, and `@ direction` dots it with the direction again, giving one number.

```check
run ".venv/Scripts/python -m pytest -q tests/test_components.py -k variance_along" label="v·C·v equals the variance of the parts projected onto v"
```

## Finding the longest direction: power iteration

Multiplying a vector by $C$ stretches and turns it. But some special directions aren't turned at all, only stretched:

> **Eigenvector** of a matrix $C$: a direction $\mathbf{v}$ that $C$ only stretches, without turning: $C\mathbf{v} = \lambda\mathbf{v}$. The stretch factor $\lambda$ ("lambda") is its **eigenvalue**. For a covariance matrix, the eigenvectors are the principal components, and each eigenvalue is the variance along its component.
>
> *Picture it as* stretching a sheet of rubber with a grid drawn on it. Most lines on the grid get both longer and twisted. A few directions only get longer, staying exactly in line: those are the eigenvectors, and how much longer they get is the eigenvalue.

How to find the most-stretched direction: start with *any* vector, multiply it by $C$, and repeat. Each multiplication stretches the part of the vector lying along the top eigenvector more than any other part, so that part grows fastest and soon dominates. To stop the numbers growing without limit, scale the vector back to length 1 after every step. This is **power iteration**.

Trace it on the test's matrix $C = \begin{pmatrix}2 & 1\\ 1 & 2\end{pmatrix}$, starting from $(1, 0)$:

| step | $C\mathbf{v}$ | scaled to length 1 |
|---|---|---|
| 1 | (2, 1) | (0.894, 0.447) |
| 2 | (2.236, 1.789) | (0.781, 0.625) |
| 3 | (2.186, 2.030) | (0.733, 0.680) |
| 4 | (2.146, 2.094) | (0.716, 0.698) |

It's turning towards (0.707, 0.707), the diagonal. Check: $C$ times (1, 1) is (3, 3), the same direction, 3 times longer. So the diagonal is an eigenvector with eigenvalue 3, and the test expects exactly that.

Add `power_iteration` to `pca.py`:

```python file=pca.py
import numpy as np


def variance_along(C: np.ndarray, direction: np.ndarray) -> float:
    """The variance of the data along a unit-length direction, from its covariance matrix."""
    return float(direction @ C @ direction)


def power_iteration(C: np.ndarray, steps: int = 500, seed: int = 0) -> tuple[np.ndarray, float]:
    """The direction C stretches most (its top eigenvector, length 1), and how much (its eigenvalue)."""
    v = np.random.default_rng(seed).normal(size=len(C))
    for _ in range(steps):
        v = C @ v
        v = v / np.linalg.norm(v)
    return v, variance_along(C, v)
```

- **Start from a random vector**, not (1, 0, 0, …): a start that happened to be exactly at right angles to the top eigenvector would have no part along it to grow. A random start almost never is.
- **`np.linalg.norm(v)`** is the length of `v` (lesson 2.1); dividing by it scales `v` to length 1.
- **The eigenvalue** is the variance along the final direction: `variance_along(C, v)`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_components.py -k power" label="power iteration turns any start towards the most-stretched direction" -- repeat: v = C @ v; v = v / np.linalg.norm(v); then the eigenvalue is v @ C @ v
```

## The next directions: take away what's found

To find the second component, remove the first from the matrix, then run power iteration again: with the top direction gone, the most-stretched direction that's left is the second.

"Removing" a direction $\mathbf{v}$ with variance $\lambda$ means subtracting $\lambda\,\mathbf{v}\mathbf{v}^\top$ from $C$. That matrix stretches only along $\mathbf{v}$ (by exactly $\lambda$), so subtracting it sets the stretch along $\mathbf{v}$ to 0 and leaves every direction at right angles to $\mathbf{v}$ unchanged. This is called **deflation**.

```python file=pca.py
import numpy as np


def variance_along(C: np.ndarray, direction: np.ndarray) -> float:
    """The variance of the data along a unit-length direction, from its covariance matrix."""
    return float(direction @ C @ direction)


def power_iteration(C: np.ndarray, steps: int = 500, seed: int = 0) -> tuple[np.ndarray, float]:
    """The direction C stretches most (its top eigenvector, length 1), and how much (its eigenvalue)."""
    v = np.random.default_rng(seed).normal(size=len(C))
    for _ in range(steps):
        v = C @ v
        v = v / np.linalg.norm(v)
    return v, variance_along(C, v)


def components(C: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
    """The top k principal directions (one per row) and the variance along each."""
    directions, variances = [], []
    for _ in range(k):
        v, variance = power_iteration(C)
        directions.append(v)
        variances.append(variance)
        C = C - variance * np.outer(v, v)
    return np.array(directions), np.array(variances)
```

**`np.outer(v, v)`** is the matrix $\mathbf{v}\mathbf{v}^\top$: entry $(i, j)$ is $v_i \times v_j$. Reassigning `C` inside the function only changes the function's local copy; the caller's matrix is untouched.

```check
run ".venv/Scripts/python -m pytest -q tests/test_components.py" label="your components equal np.linalg.eigh's and scikit-learn PCA's, up to sign"
```

## What the components are

Create `directions.py`:

```python file=directions.py
import numpy as np

import measurements
import pca
import spread

parts, features, X = measurements.load("data/measurements.csv")
C = spread.covariance(spread.standardise(X))
directions, variances = pca.components(C, 3)
total = np.trace(C)

print("component  variance  share  cumulative")
for number, variance in enumerate(variances, start=1):
    print(f"{number:>9} {variance:>9.2f} {variance / total:>6.3f} {variances[:number].sum() / total:>11.3f}")

print("\nfeature          PC1    PC2    PC3")
for name, weights in zip(features, directions.T):
    print(f"{name:<13} " + " ".join(f"{weight:>6.2f}" for weight in weights))
```

- **`np.trace(C)`** adds up the diagonal: the total variance of all features together. Standardised, each feature has variance 1, so the total is 10.
- **`enumerate(variances, start=1)`** numbers the components from 1 instead of 0.
- **`directions.T`**: each row of `directions` is a component; transposed, each row is a *feature*, with its weight in each of the three components.

```powershell
.venv\Scripts\python directions.py
```

```text
component  variance  share  cumulative
        1      4.75  0.475       0.475
        2      3.71  0.371       0.846
        3      1.00  0.100       0.946

feature          PC1    PC2    PC3
bore_1          0.45   0.04   0.00
bore_2          0.45   0.03  -0.01
bore_3          0.45   0.04  -0.01
bore_4          0.44   0.05  -0.01
length          0.05  -0.51   0.02
width           0.05  -0.51   0.00
height          0.05  -0.50   0.00
slot_width      0.44   0.05  -0.01
flatness       -0.01  -0.02  -1.00
hole_position   0.04  -0.48   0.01
```

The weights of a component are called its **loadings**. Read them down each column:

- **PC1**, 47.5% of all the variation: equal weight on the four bores and the slot, nothing else. It's "how big were the cut features on this part": the first block from lesson 11.1.
- **PC2**, 37.1%: length, width, height and hole position, all with the same sign. "How big was the part overall": the second block. (Its signs are negative; the opposite direction is the same line, so you could flip them all.)
- **PC3**, 10.0%: flatness alone.

Three directions, **94.6%** of the variation in ten features. The remaining seven components share the last 5.4%, and that's measurement noise: each feature's own small, independent scatter.

The data was made from two hidden causes: **tool wear**, which shrinks the cut features (bores and slot) as the tool dulls, and **shop temperature**, which expands the whole part. PCA, given only the 400 × 10 table of numbers, found one component for each, plus flatness, which was generated independently of both. Turning ten correlated measurements into a few independent, interpretable factors is what PCA is for.

```predict
question: If you skipped standardising and ran PCA on the raw micrometre values, what would change?
choice: Nothing: PCA finds the same directions either way
choice: Features with bigger swings in micrometres would dominate the first components, whether or not they share a cause with anything
choice: PCA would fail to run
answer: Features with bigger swings in micrometres would dominate the first components, whether or not they share a cause with anything
explain: PCA finds directions of greatest variance, and raw variance depends on units and on how much each feature happens to swing. Length moves by about ±8 µm and hole position by ±2.5 µm; unstandardised, length would count about eight times as much. Standardising first (PCA on the correlation matrix) asks "which features move together", which is usually the question. When all features are already in the same units and their sizes are meaningful, unstandardised PCA can be the right choice; it's a decision, not a default.
```

```check
run ".venv/Scripts/python directions.py" stdout="        3      1.00  0.100       0.946" label="directions.py shows three components carrying 94.6% of the variation"
```

From now on, `PCA(n_components=3).fit(Z)` from `sklearn.decomposition` does all of this; its `components_` are your `directions` (up to sign) and its `explained_variance_ratio_` your shares. Internally it uses a different method (the **singular value decomposition**, covered in the eigenvectors-and-SVD notebook linked from lesson 11.1), which is faster and more accurate than power iteration, but it finds the same directions.
