---
title: 2.1 — A House Is a Vector
track: Mathematics Through Computation
trackOrder: 22
runtime: none
support: data/houses.csv
concepts: vectors, dot-product, distance, correlation, numpy
revisits: tabular-data, descriptive-statistics, testing
notebook: ml-vectors, ml-numpy-arrays
lab: 3
problem: A model has to compare houses and combine their features into one prediction. What arithmetic works on a whole row of numbers at once?
---

Here is one house from the dataset, with only its numerical features:

```text
sqft = 1540, bedrooms = 3, age = 54
```

Write it as a list, `[1540, 3, 54]`, and it becomes something mathematics has studied for centuries: a **vector**, an ordered list of numbers. Every house is a vector with three entries. Every model in this series works on vectors: it adds them, compares them, and combines them with weights. This chapter teaches the mathematics models are built from, but only the parts a model needs, and each one through code you write.

> **Vector**: an ordered list of numbers, where the position of each number gives it its meaning. `[1540, 3, 54]` means "1540 square feet, 3 bedrooms, 54 years" only because everyone agreed the first entry is area, the second bedrooms, the third age. The number of entries is the vector's **dimension**.
>
> *Picture it as* two things at once, and both are useful. A row on an inspection sheet: one part, its measurements in fixed columns. And an arrow: with two entries, `[3, 4]` is an arrow from the origin to the point (3, 4), with a direction and a length. With three entries it's an arrow in space; with 48, nobody can draw it, but the arithmetic is identical. **Where the picture stops working:** an arrow suggests the entries are all the same kind of quantity (distances along each axis). A house's entries are square feet, bedrooms and years, which is why distances between houses need care (later in this lesson).

This chapter's project is a **maths workbench**: small, separate modules you can read in a minute, each tested. No package, no command line: these are experiments, and a package's structure would only get in the way of reading them.

## A new project

Set up the project as before:

1. **Choose folder…** → in **Documents**, a **New folder** named `math-lab`.
2. `python -m venv .venv`
3. Create `requirements.txt` with pytest only (NumPy arrives later in this lesson, once you've seen why):

```text file=requirements.txt
pytest==9.1.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

```check
run ".venv/Scripts/python -c \"import pytest\"" label="pytest is installed in the project's own Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/houses.csv`, the dataset from Chapter 1.

```python file=tests/test_vectors.py provided
# Tests for vectors.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_vectors.py
import math

import pytest
from pytest import approx

import vectors

HOUSE_1 = [1540, 3, 54]   # sqft, bedrooms, age
HOUSE_2 = [1350, 2, 28]


def test_add_and_subtract_work_entry_by_entry():
    assert vectors.add([1, 2, 3], [10, 20, 30]) == [11, 22, 33]
    assert vectors.subtract(HOUSE_1, HOUSE_2) == [190, 1, 26]


def test_add_rejects_vectors_of_different_sizes():
    with pytest.raises(ValueError):
        vectors.add([1, 2, 3], [1, 2])


def test_scale_multiplies_every_entry():
    assert vectors.scale(2, [1, -2, 3]) == [2, -4, 6]
    assert vectors.scale(0.5, HOUSE_1) == [770, 1.5, 27]


def test_dot_is_the_sum_of_products():
    assert vectors.dot([1, 2, 3], [4, 5, 6]) == 32
    assert vectors.dot([140, 6000, -700], HOUSE_1) == 195800


def test_dot_rejects_vectors_of_different_sizes():
    with pytest.raises(ValueError):
        vectors.dot([1, 2, 3], [1, 2])


def test_magnitude_is_pythagoras():
    assert vectors.magnitude([3, 4]) == 5
    assert vectors.magnitude([1, 2, 2]) == 3


def test_distance_between_two_houses():
    assert vectors.distance(HOUSE_1, HOUSE_2) == approx(191.7733, abs=1e-4)
    assert vectors.distance(HOUSE_1, HOUSE_1) == 0


def test_cosine_measures_direction_only():
    assert vectors.cosine([1, 0], [0, 1]) == approx(0)
    assert vectors.cosine([1, 2], [2, 4]) == approx(1), "same direction, different length"
    assert vectors.cosine([1, 2], [-1, -2]) == approx(-1)


def test_correlation_is_the_cosine_of_centred_columns():
    assert vectors.centre([1, 2, 3]) == [-1, 0, 1]
    assert vectors.correlation([1, 2, 3], [10, 20, 30]) == approx(1)
    assert vectors.correlation([1, 2, 3], [5, 3, 1]) == approx(-1)
```

There's no expected value here you can't check with pencil and paper, and that's deliberate. `dot([1, 2, 3], [4, 5, 6])` is 1×4 + 2×5 + 3×6 = 32. `magnitude([3, 4])` is the hypotenuse of a 3-4-5 triangle. When a test can be checked by hand, a failure means the code is wrong, not the test.

```check
file tests/test_vectors.py -- Click "Create provided tests/test_vectors.py" above.
```

## Adding and scaling

Two vectors of the same size add **entry by entry**: $[1, 2, 3] + [10, 20, 30] = [11, 22, 33]$. Multiplying by a single number (a **scalar**) multiplies every entry: $2 \times [1, -2, 3] = [2, -4, 6]$. Create `vectors.py`:

```python file=vectors.py
def add(u: list[float], v: list[float]) -> list[float]:
    return [a + b for a, b in zip(u, v, strict=True)]


def subtract(u: list[float], v: list[float]) -> list[float]:
    return [a - b for a, b in zip(u, v, strict=True)]


def scale(c: float, v: list[float]) -> list[float]:
    return [c * a for a in v]
```

`zip(u, v)` walks two lists in step, giving pairs: `(1, 10), (2, 20), (3, 30)`. Plain `zip` has a dangerous habit: given lists of different lengths, it **stops at the shorter one, silently**. `add([1, 2, 3], [1, 2])` would return `[2, 4]` and carry on. Adding a house with three features to one with two is a bug, and `strict=True` turns it into a `ValueError` at the moment it happens rather than a wrong number somewhere later.

What does subtracting two houses mean? `subtract(HOUSE_1, HOUSE_2)` is `[190, 1, 26]`: house 1 is 190 square feet bigger, has 1 more bedroom and is 26 years older. The difference of two vectors is the step from one to the other.

```check
run ".venv/Scripts/python -m pytest -q tests/test_vectors.py -k \"add or scale\"" label="add, subtract and scale work entry by entry, and reject mismatched sizes" -- zip(u, v, strict=True) raises ValueError when the lengths differ.
```

## The dot product

The **dot product** of two vectors multiplies them entry by entry and adds the results:

$$\mathbf{u} \cdot \mathbf{v} = \sum_{i=1}^{n} u_i v_i = u_1 v_1 + u_2 v_2 + \cdots + u_n v_n$$

Add it to `vectors.py`:

```python file=vectors.py
def add(u: list[float], v: list[float]) -> list[float]:
    return [a + b for a, b in zip(u, v, strict=True)]


def subtract(u: list[float], v: list[float]) -> list[float]:
    return [a - b for a, b in zip(u, v, strict=True)]


def scale(c: float, v: list[float]) -> list[float]:
    return [c * a for a in v]


def dot(u: list[float], v: list[float]) -> float:
    return sum(a * b for a, b in zip(u, v, strict=True))
```

> **Dot product**: for two vectors of the same dimension, multiply the entries in matching positions and add up the products. The result is one number.
>
> *Picture it as* totalling an invoice. One vector is the quantities ordered (3 bolts, 2 brackets, 5 washers), the other is the unit prices (0.40, 2.10, 0.05). Quantity times price for each line, then add the lines: 3 × 0.40 + 2 × 2.10 + 5 × 0.05 = 5.65. That's a dot product, and it's exactly how a model prices a house.

That one line is the most important operation in machine learning, and the second test shows why. Suppose each square foot adds 140 dollars to a house's price, each bedroom 6,000, and each year of age *subtracts* 700. Then for house 1:

```text
  [  140,  6000, -700 ]   weights: what each feature is worth
· [ 1540,     3,   54 ]   features: what this house has
= 140×1540 + 6000×3 + (−700)×54
= 215600   + 18000  − 37800
= 195800
```

A **weighted sum** of the features: an estimate of the price (before adding a base amount). This is exactly what a **linear model** computes, and in Chapter 3 you'll build one: the model *is* a vector of weights, a prediction *is* a dot product, and "learning" means finding the weights that make the dot products close to the real prices. Neural networks, in Part XXIII, are made of thousands of dot products.

```predict
question: The weights are [140, 6000, -700]. House 2 is [1350, 2, 28]. What is their dot product?
answer: 181400
explain: 140 × 1350 = 189,000; 6000 × 2 = 12,000; −700 × 28 = −19,600. Total: 181,400. House 2 is smaller, has fewer bedrooms and is younger: two of those lower the estimate and one raises it.
verify: .venv/Scripts/python -c "import vectors; print(vectors.dot([140, 6000, -700], [1350, 2, 28]))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_vectors.py -k dot" label="dot multiplies entry by entry and adds" -- sum(a * b for a, b in zip(u, v, strict=True))
```

## Length and distance

A vector with two entries, $[3, 4]$, is an arrow from the origin to the point $(3, 4)$. Its length, by Pythagoras, is $\sqrt{3^2 + 4^2} = 5$. In any number of dimensions the length (the **magnitude**, or **norm**) is the same formula:

$$\lVert \mathbf{v} \rVert = \sqrt{v_1^2 + v_2^2 + \cdots + v_n^2} = \sqrt{\mathbf{v} \cdot \mathbf{v}}$$

The sum of squares is the dot product of the vector with itself, so magnitude reuses `dot`. The **distance** between two vectors is the length of the step between them: $\lVert \mathbf{u} - \mathbf{v} \rVert$. Add both:

```python file=vectors.py
import math


def add(u: list[float], v: list[float]) -> list[float]:
    return [a + b for a, b in zip(u, v, strict=True)]


def subtract(u: list[float], v: list[float]) -> list[float]:
    return [a - b for a, b in zip(u, v, strict=True)]


def scale(c: float, v: list[float]) -> list[float]:
    return [c * a for a in v]


def dot(u: list[float], v: list[float]) -> float:
    return sum(a * b for a, b in zip(u, v, strict=True))


def magnitude(v: list[float]) -> float:
    return math.sqrt(dot(v, v))


def distance(u: list[float], v: list[float]) -> float:
    return magnitude(subtract(u, v))
```

Distance is how a model decides that two houses are **similar**: the k-nearest-neighbours algorithm (Part XVI) predicts a house's price from the houses closest to it. *Picture it as* the straight-line distance between two points on a map, measured with a ruler, except the map can have as many directions as there are features. But look at the numbers:

```predict
question: The two houses differ by [190, 1, 26]: 190 sqft, 1 bedroom, 26 years. Their distance is about 191.8. Which feature decides that distance?
choice: sqft
choice: bedrooms
choice: age
choice: All three equally
answer: sqft
explain: The distance is √(190² + 1² + 26²) = √(36100 + 1 + 676) ≈ 191.8. Square feet contributes 36,100 of the 36,777 under the square root, 98%. The extra bedroom contributes 1. Distance, as computed, says "these houses are similar if their floor areas are similar", and bedrooms barely matter.

That's not a fact about houses; it's an accident of **units**. Square feet are counted in hundreds or thousands, bedrooms in ones. Measure area in square metres and the answer changes. This is why models that use distances need their features put on comparable scales first (**feature scaling**), and you'll do it in Chapter 3, when gradient descent fails without it.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_vectors.py -k \"magnitude or distance\"" label="magnitude and distance work" -- magnitude is math.sqrt(dot(v, v)); distance is magnitude(subtract(u, v)).
```

## Direction: cosine and correlation

The dot product has a geometric meaning:

$$\mathbf{u} \cdot \mathbf{v} = \lVert \mathbf{u} \rVert \, \lVert \mathbf{v} \rVert \cos\theta$$

where $\theta$ is the angle between the two arrows. Rearranged, the dot product divided by both lengths is the **cosine** of the angle: 1 when the vectors point the same way, 0 when they're at right angles, −1 when they point opposite ways. It measures **direction only**: $[1, 2]$ and $[2, 4]$ have cosine 1, though one is twice as long.

Now the connection that makes this more than geometry. Take two columns of the dataset, `sqft` and `price`, each a vector of 48 numbers. **Centre** each one by subtracting its mean, so each entry says "how far above or below average is this house?". Then the cosine of the two centred vectors is the **correlation** between the columns:

- close to **1**: houses above average in one tend to be above average in the other (the vectors point the same way);
- close to **0**: no linear relationship;
- close to **−1**: above average in one, below in the other.

Add these:

```python file=vectors.py
import math


def add(u: list[float], v: list[float]) -> list[float]:
    return [a + b for a, b in zip(u, v, strict=True)]


def subtract(u: list[float], v: list[float]) -> list[float]:
    return [a - b for a, b in zip(u, v, strict=True)]


def scale(c: float, v: list[float]) -> list[float]:
    return [c * a for a in v]


def dot(u: list[float], v: list[float]) -> float:
    return sum(a * b for a, b in zip(u, v, strict=True))


def magnitude(v: list[float]) -> float:
    return math.sqrt(dot(v, v))


def distance(u: list[float], v: list[float]) -> float:
    return magnitude(subtract(u, v))


def cosine(u: list[float], v: list[float]) -> float:
    return dot(u, v) / (magnitude(u) * magnitude(v))


def centre(v: list[float]) -> list[float]:
    mean = sum(v) / len(v)
    return [a - mean for a in v]


def correlation(u: list[float], v: list[float]) -> float:
    return cosine(centre(u), centre(v))
```

This is the same mathematical idea appearing in two disguises: the angle between two arrows, and how strongly two columns of a table move together. You'll meet it a third time in Part XXVIII, where the cosine between two **embedding** vectors measures how similar two pieces of text are.

```check
run ".venv/Scripts/python -m pytest -q tests/test_vectors.py" label="every vector test passes" -- correlation is the cosine of the two centred vectors.
```

## Correlations in the houses

Create `explore.py`, which reads three columns and correlates each with the price:

```python file=explore.py
import csv

import vectors

with open("data/houses.csv", newline="", encoding="utf-8") as f:
    rows = [row for row in csv.DictReader(f) if row["age"] != ""]

price = [float(row["price"]) for row in rows]
for name in ["sqft", "bedrooms", "age"]:
    feature = [float(row[name]) for row in rows]
    print(f"{name:<9} {vectors.correlation(feature, price):+.3f}")
```

The 3 houses with no recorded age are left out of all three correlations, so each one uses the same 45 houses. `:+.3f` prints the sign even when it's positive.

```powershell
.venv\Scripts\python explore.py
```

```text
sqft      +0.923
bedrooms  +0.846
age       -0.130
```

Bigger houses cost more, strongly; more bedrooms too (bigger houses have more bedrooms); and older houses cost slightly less, weakly. These three numbers are a first answer to "which features will help predict price?", and a warning: `sqft` and `bedrooms` are both strongly correlated with price *and with each other*, so they carry much of the same information. You'll see that matter in Chapter 3.

```check
run ".venv/Scripts/python explore.py" stdout="sqft      +0.923" label="explore.py prints the correlation of sqft with price"
run ".venv/Scripts/python explore.py" stdout="age       -0.130" label="and of age with price"
```

## Why NumPy

Your `vectors.py` is correct and readable, and it has the problem Chapter 1 ended with: every operation is a Python loop. A real dataset might have a million houses and a hundred features; a neural network multiplies vectors with millions of entries, millions of times. **NumPy** stores a vector as one block of raw numbers and runs the loops in compiled code.

Add it to `requirements.txt` and install:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

Then try every operation you wrote, in NumPy, at the interactive prompt:

```powershell
.venv\Scripts\python
```

```python
>>> import numpy as np
>>> u = np.array([1540, 3, 54])
>>> v = np.array([1350, 2, 28])
>>> u + v                      # add: entry by entry, no loop written
array([2890,    5,   82])
>>> u - v
array([190,   1,  26])
>>> 0.5 * u                    # scale
array([770. ,   1.5,  27. ])
>>> np.dot([140, 6000, -700], u)
np.int64(195800)
>>> w = np.array([140, 6000, -700])
>>> w @ u                      # @ is the dot product operator
np.int64(195800)
>>> np.linalg.norm(u - v)      # magnitude of the difference: the distance
np.float64(191.77330366868065)
>>> u + np.array([1, 2])
ValueError: operands could not be broadcast together with shapes (3,) (2,)
```

> **NumPy array**: a grid of numbers, all of one type, stored side by side in one block of memory, with arithmetic that works on every element at once.
>
> *Picture it as* the stamping press from lesson 1.3 again: the work you wrote as a loop over entries is done in one operation over the whole array. Your `vectors.py` and NumPy compute the same things; NumPy just doesn't make Python visit each number.

Every one matches your function. In NumPy, `+`, `-` and `*` work **elementwise** on arrays, so `u + v` *is* your `add`, written as arithmetic. `@` is the dot product. And mismatched sizes are an error, like your `strict=True`. (The error mentions *broadcasting*, NumPy's rule for combining arrays of different shapes; `0.5 * u` used it, stretching one number across three entries. You'll use more of it in the next lesson.)

Notice what `np.dot` did *not* need: a loop, a `zip`, a `sum`. When you read `w @ u` in a library's code from now on, you know exactly what's being computed: 140 × 1540 + 6000 × 3 + (−700) × 54.

```check
run ".venv/Scripts/python -c \"import numpy as np; print(np.__version__)\"" stdout="2.5.3" label="NumPy 2.5.3 is installed" -- Add numpy==2.5.3 to requirements.txt and install it.
run ".venv/Scripts/python -c \"import numpy as np, vectors; u, v = [1540, 3, 54], [1350, 2, 28]; assert np.isclose(np.linalg.norm(np.subtract(u, v)), vectors.distance(u, v)); assert np.dot(u, v) == vectors.dot(u, v); print('agree')\"" stdout="agree" label="NumPy's dot and norm agree with yours"
```
