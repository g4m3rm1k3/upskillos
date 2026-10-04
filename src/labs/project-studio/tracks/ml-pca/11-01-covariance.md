---
title: 11.1 — Ten Measurements, How Many Facts? Covariance
track: Dimensionality Reduction — Inspection Data
trackOrder: 31
runtime: none
support: data/measurements.csv
concepts: pca
revisits: correlation, descriptive-statistics, matrices, dot-product, numpy, testing
notebook: ml-eigenvectors-and-svd
lab: 18
problem: A coordinate measuring machine reports ten measurements for every part. Nobody can look at ten numbers per part across 400 parts and see what's going on. But if several measurements always move together, they may be telling you the same thing. How do you measure which columns move together, all at once?
---

A machined part comes off the line and goes onto a **CMM** (coordinate measuring machine), which probes it and reports ten features as deviations from nominal, in micrometres: four bore diameters, length, width, height, a slot width, flatness and a hole position. This chapter has 400 parts' worth.

Ten numbers per part is too many to watch. A control chart for each would be ten charts, and they'd all be telling overlapping stories, because the features don't vary independently: one cutting tool makes all four bores, and the same shop temperature expands the whole part. The question for this chapter is **how many independent things are really going on**, and which. This lesson measures how the columns move together; the next finds the underlying directions.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `inspection-pca`.
2. `python -m venv .venv`
3. `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

```check
run ".venv/Scripts/python -c \"import sklearn, numpy, pytest\"" label="NumPy, scikit-learn and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/measurements.csv`: one row per part, in the order they were made.

```python file=tests/test_spread.py provided
# Tests for measurements.py and spread.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_spread.py
import numpy as np
from pytest import approx

SMALL = np.array([[1.0, 2.0], [3.0, 6.0], [5.0, 10.0]])


def data():
    import measurements
    return measurements.load("data/measurements.csv")


def test_load_reads_ten_features_for_every_part():
    parts, features, X = data()
    assert len(parts) == 400 and X.shape == (400, 10)
    assert features[:2] == ["bore_1", "bore_2"] and features[-1] == "hole_position"
    assert parts[0] == "P001" and X[0, 0] == 31.7


def test_standardise_gives_mean_zero_and_spread_one():
    import spread
    Z = spread.standardise(data()[2])
    assert Z.mean(axis=0) == approx(np.zeros(10), abs=1e-12)
    assert Z.std(axis=0) == approx(np.ones(10))


def test_covariance_on_a_small_example():
    import spread
    assert spread.covariance(SMALL) == approx(np.array([[8 / 3, 16 / 3], [16 / 3, 32 / 3]]))


def test_covariance_matches_numpy():
    import spread
    X = data()[2]
    assert np.allclose(spread.covariance(X), np.cov(X, rowvar=False, bias=True))


def test_covariance_of_standardised_columns_is_correlation():
    import spread
    X = data()[2]
    assert np.allclose(spread.covariance(spread.standardise(X)), np.corrcoef(X, rowvar=False))
```

`SMALL` has two columns where the second is always exactly twice the first: the most "moving together" two columns can be. Keep it in mind for the formula below.

```check
file tests/test_spread.py -- Click "Create provided tests/test_spread.py" above.
file data/measurements.csv
```

## Load the measurements

This file has ten feature columns, and a program shouldn't need to be changed if an eleventh is added. So read the header row to find out what the columns are, rather than naming them in the code. Create `measurements.py`:

```python file=measurements.py
import csv

import numpy as np


def load(path: str) -> tuple[list[str], list[str], np.ndarray]:
    """(part names, feature names, one row of measurements per part)."""
    with open(path, newline="") as file:
        reader = csv.reader(file)
        features = next(reader)[1:]
        parts, rows = [], []
        for row in reader:
            parts.append(row[0])
            rows.append([float(value) for value in row[1:]])
    return parts, features, np.array(rows)
```

- **`csv.reader`** (not `DictReader`) gives each row as a plain list of strings.
- **`next(reader)`** takes just the *next* row from the reader: here the first, the header. The `for` loop then carries on from the row after it. **`[1:]`** drops the first column, `part`, which is a name, not a measurement.

```check
run ".venv/Scripts/python -m pytest -q tests/test_spread.py -k load" label="400 parts, ten features each, feature names from the header"
```

## Covariance: do two columns move together?

Lesson 2.1 measured how alike two columns are with the **correlation**: centre each column, then take the cosine of the angle between them. Correlation's parent is the **covariance**, the same idea before dividing out the sizes.

> **Covariance** of two columns: the average, over all rows, of (this row's deviation from the first column's mean) × (this row's deviation from the second column's mean):
> $$\text{cov}(a, b) = \frac{1}{n}\sum_i (a_i - \bar{a})(b_i - \bar{b})$$
> Positive when the two tend to be above their means together (and below together); negative when one tends to be high as the other is low; near 0 when they're unrelated. The covariance of a column with itself is its **variance** (lesson 1.2).
>
> *Picture it as* two gauges on the same part. If, part after part, both read high together and low together, the product of their deviations is positive almost every time, and so is its average. If one gauge's swings have nothing to do with the other's, the products are as often negative as positive, and they average out to about zero.

Every pair of columns has a covariance. Arranged in a table, with row *i* and column *j* holding the covariance of feature *i* with feature *j*, that's the **covariance matrix**: 10 × 10 here, with the variances down the diagonal.

There's a neat way to compute the whole table at once. Centre every column (subtract its mean); call the result $X_c$. Then entry $(i, j)$ of $X_c^\top X_c$ is the dot product of centred column *i* with centred column *j* (lesson 2.2's matrix multiplication), which is exactly the sum in the formula. Divide by *n*:

$$C = \frac{1}{n} X_c^\top X_c$$

Check it on `SMALL`. The column means are 3 and 6, so the centred table is `[[-2, -4], [0, 0], [2, 4]]`. Then:

- variance of column 1: ((−2)² + 0² + 2²) / 3 = 8/3;
- covariance of the two columns: ((−2)(−4) + 0 + (2)(4)) / 3 = 16/3;
- variance of column 2: ((−4)² + 0 + 4²) / 3 = 32/3.

Create `spread.py`:

```python file=spread.py
import numpy as np


def standardise(X: np.ndarray) -> np.ndarray:
    return (X - X.mean(axis=0)) / X.std(axis=0)


def covariance(X: np.ndarray) -> np.ndarray:
    centred = X - X.mean(axis=0)
    return centred.T @ centred / len(X)
```

- **`standardise`** is lesson 3.2's, once more: every column to mean 0 and spread 1.
- **`centred.T @ centred`**: `.T` turns the 400 × 10 table into 10 × 400, and multiplying by the 400 × 10 table gives 10 × 10, every pair of columns' dot product at once.

NumPy's version is `np.cov(X, rowvar=False, bias=True)`. **`rowvar=False`** says the variables are the columns (NumPy's default assumes rows), and **`bias=True`** divides by *n*, as here. Without it, NumPy divides by *n* − 1, a small correction used when estimating the covariance of a whole population from a sample; with 400 parts the difference is a quarter of a percent.

```check
run ".venv/Scripts/python -m pytest -q tests/test_spread.py" label="covariance by matrix multiplication matches np.cov; on standardised columns it is the correlation"
```

The last test shows why standardising matters here: on standardised columns (spread 1), the covariance **is** the correlation, between −1 and 1, regardless of whether a feature varies by 2 µm or 20. Without standardising, the features with the biggest swings would dominate everything that follows, the same trap as lessons 9.1 and 10.2.

## The picture in the numbers

Create `look.py` to print the whole correlation matrix:

```python file=look.py
import measurements
import spread

SHORT = ["bore1", "bore2", "bore3", "bore4", "len", "wid", "ht", "slot", "flat", "hole"]

parts, features, X = measurements.load("data/measurements.csv")
C = spread.covariance(spread.standardise(X))

print(" " * 13 + " ".join(f"{name:>5}" for name in SHORT))
for name, row in zip(features, C):
    print(f"{name:<13}" + " ".join(f"{value:>5.2f}" for value in row))
```

```powershell
.venv\Scripts\python look.py
```

```text
             bore1 bore2 bore3 bore4   len   wid    ht  slot  flat  hole
bore_1        1.00  0.95  0.94  0.94  0.03  0.04  0.04  0.94 -0.04  0.02
bore_2        0.95  1.00  0.94  0.93  0.03  0.04  0.05  0.93 -0.03  0.02
bore_3        0.94  0.94  1.00  0.93  0.03  0.04  0.03  0.92 -0.02  0.03
bore_4        0.94  0.93  0.93  1.00  0.00  0.01  0.01  0.93 -0.02 -0.00
length        0.03  0.03  0.03  0.00  1.00  0.97  0.95  0.00  0.02  0.87
width         0.04  0.04  0.04  0.01  0.97  1.00  0.94  0.01  0.03  0.86
height        0.04  0.05  0.03  0.01  0.95  0.94  1.00  0.02  0.03  0.84
slot_width    0.94  0.93  0.92  0.93  0.00  0.01  0.02  1.00 -0.02  0.00
flatness     -0.04 -0.03 -0.02 -0.02  0.02  0.03  0.03 -0.02  1.00  0.02
hole_position 0.02  0.02  0.03 -0.00  0.87  0.86  0.84  0.00  0.02  1.00
```

Look for blocks of large numbers:

- **The four bores and the slot** correlate at 0.92–0.95 with each other, and about 0 with everything else. They are, in effect, one measurement taken five times. Something makes all five big or small together.
- **Length, width, height and hole position** form a second block (0.84–0.97), unrelated to the first.
- **Flatness** correlates with nothing: it's its own thing.

So ten columns, but roughly **three** independent things going on. The matrix is **symmetric** (entry (*i*, *j*) equals (*j*, *i*): the covariance of a with b is the covariance of b with a), with 1s down the diagonal.

```predict
question: What physical causes would make the bores and slot move together, and length, width, height and hole position move together?
choice: Random measurement error on each feature
choice: One cause per block: something that changes cut sizes (like tool wear) for the bores and slot, and something that changes the whole part's size (like temperature) for the outer dimensions
choice: The CMM probing the features in that order
answer: One cause per block: something that changes cut sizes (like tool wear) for the bores and slot, and something that changes the whole part's size (like temperature) for the outer dimensions
explain: Measurement error is independent from feature to feature, so it produces correlations near 0, not 0.95. A shared cause produces a block: a wearing tool cuts every bore and the slot slightly small, and a warm part measures long in every outer dimension. That's exactly how this data was made. With real data you'd only have the blocks, and would go and find the causes; the next lesson finds the directions in the data that correspond to them.
```

```check
run ".venv/Scripts/python look.py" stdout="slot_width    0.94  0.93  0.92  0.93  0.00  0.01  0.02  1.00 -0.02  0.00" label="look.py prints the correlation matrix, showing its blocks"
```

With 10 features, the blocks are visible by eye. With 200 features, or blocks that overlap, they wouldn't be. The next lesson finds them automatically.
