---
title: 7.1 — Too Good to Be True: Overfitting
track: Evaluation — Is the Model Any Good?
trackOrder: 27
runtime: none
support: data/houses.csv
concepts: regularization
revisits: generalization, linear-regression, scikit-learn, regression-metrics, numpy
notebook: ml-overfitting
lab: 7
problem: A more flexible model always fits the training data better. So why does it so often predict new data worse, and how would you notice?
---

Lesson 3.3 found the first warning sign: error on held-out houses was higher than on the houses the model learned from, and it jumped around by thousands depending on which houses were held out. This chapter takes that seriously. The studio will soon offer many kinds of model, and choosing between them is only as good as the way you measure them.

This lesson shows the central problem of all machine learning in its clearest form. You'll give a model more and more freedom to bend, watch its training error fall towards zero, and watch its error on new data go the other way, by a factor of fifty.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `model-evaluation`.
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

**This step: create the supplied files and read them. No code yet.** The button also creates `data/houses.csv`, used later in the chapter.

```python file=tests/test_overfit.py provided
# Tests for waves.py and poly.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_overfit.py
import numpy as np
from pytest import approx


def test_wave_is_the_same_for_the_same_seed():
    import waves
    first, again, other = waves.wave(12, seed=0), waves.wave(12, seed=0), waves.wave(12, seed=1)
    assert np.array_equal(first[0], again[0]) and np.array_equal(first[1], again[1])
    assert not np.array_equal(first[0], other[0])


def test_wave_x_is_between_minus_one_and_one():
    import waves
    x, _ = waves.wave(1000, seed=3)
    assert x.min() >= -1 and x.max() <= 1


def test_wave_noise_has_the_requested_size():
    import waves
    x, y = waves.wave(10000, seed=5)
    assert np.std(y - np.sin(np.pi * x)) == approx(0.3, abs=0.01)


def test_powers_are_one_column_each():
    import poly
    assert poly.powers(np.array([2.0, 3.0]), 3).tolist() == [[2, 4, 8], [3, 9, 27]]


def test_errors_fall_on_training_data_as_the_degree_rises():
    import poly, waves
    table = poly.errors_by_degree(waves.wave(12, seed=0), waves.wave(1000, seed=100), [1, 3, 10])
    train = [row[1] for row in table]
    assert train[0] > train[1] > train[2]
    assert train[2] < 0.05


def test_errors_on_new_data_are_lowest_in_between():
    import poly, waves
    table = poly.errors_by_degree(waves.wave(12, seed=0), waves.wave(1000, seed=100), [1, 3, 10])
    assert [row[0] for row in table] == [1, 3, 10]
    test = [row[2] for row in table]
    assert test[1] == approx(0.314, abs=0.001)
    assert test[1] < test[0] < test[2]
    assert test[2] > 5
```

The tests use made-up data on purpose. With real data you never know the true answer, so you can't tell how far off a model is from the truth, only from other data. Here the data comes from a curve you choose, plus noise of a size you choose, so you know exactly what the best possible model would achieve.

```check
file tests/test_overfit.py -- Click "Create provided tests/test_overfit.py" above.
file data/houses.csv
```

## Data with a known answer

Create `waves.py`:

```python file=waves.py
import numpy as np


def wave(n: int, seed: int, noise: float = 0.3) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    x = rng.uniform(-1, 1, n)
    y = np.sin(np.pi * x) + rng.normal(0, noise, n)
    return x, y
```

Each call makes `n` points: `x` spread evenly at random between −1 and 1 (`uniform`), and `y` the curve $\sin(\pi x)$ plus random **noise** drawn from a normal distribution with standard deviation 0.3 (`normal(0, noise, n)`): the bell-shaped scatter you'd see in any real measurement.

> **Noise** (in data): the part of each measurement that no model could predict from the features, however good: measurement error, and everything that matters but wasn't measured.
>
> *Picture it as* repeatability on a gauge study: measure the same part twenty times and the readings still scatter a little. No process improvement makes a part *measure* better than the gauge's own repeatability.

So here's a number to keep in mind for the whole lesson: the noise has standard deviation 0.3, so even the **true curve** itself, used as a model, would be off by about 0.3 on new points. An RMSE of 0.3 on new data is perfect. Anything better on *training* data means the model has started fitting the noise.

`seed` makes the "random" data repeatable (lesson 3.3): the training data is always `wave(12, seed=0)`, twelve points; the test data `wave(1000, seed=100)`, a thousand fresh points from the same curve, standing in for "every house that will ever come to market".

```check
run ".venv/Scripts/python -m pytest -q tests/test_overfit.py -k wave" label="the data is repeatable, in range, and has noise of size 0.3" -- rng = np.random.default_rng(seed); x from rng.uniform(-1, 1, n); y = sin(pi x) + rng.normal(0, noise, n)
```

## Curves from a linear model

A straight line can't follow a sine wave. But linear regression doesn't care what its features *are*: give it $x$, $x^2$ and $x^3$ as three separate features, and the "linear" model is

$$\hat{y} = w_1 x + w_2 x^2 + w_3 x^3 + b$$

a **cubic** curve. It's still linear in the **weights** (each weight just multiplies a column), which is all least squares needs. These made-up columns are **polynomial features**, and the highest power is the **degree**. More degrees, more freedom to bend.

Create `poly.py`:

```python file=poly.py
import numpy as np
from sklearn.linear_model import LinearRegression


def powers(x: np.ndarray, degree: int) -> np.ndarray:
    return np.column_stack([x ** p for p in range(1, degree + 1)])


def rmse(y: np.ndarray, predictions: np.ndarray) -> float:
    return float(np.sqrt(np.mean((y - predictions) ** 2)))


def errors_by_degree(train, test, degrees: list[int]) -> list[tuple[int, float, float]]:
    (x_train, y_train), (x_test, y_test) = train, test
    table = []
    for degree in degrees:
        model = LinearRegression().fit(powers(x_train, degree), y_train)
        table.append((
            degree,
            rmse(y_train, model.predict(powers(x_train, degree))),
            rmse(y_test, model.predict(powers(x_test, degree))),
        ))
    return table
```

- **`powers`**: `x ** p` raises every element of the array to the power `p` (elementwise, lesson 2.1); `np.column_stack` puts the resulting columns side by side, so `powers(x, 3)` has columns $x, x^2, x^3$. No column of ones: `LinearRegression` adds the bias $b$ itself.
- **`(x_train, y_train), (x_test, y_test) = train, test`** unpacks two pairs at once: `train` is the `(x, y)` tuple that `wave` returns.
- **`errors_by_degree`** fits one model per degree on the **training** points only, then measures RMSE twice: on the points it learned from, and on the thousand it never saw.

```check
run ".venv/Scripts/python -m pytest -q tests/test_overfit.py -k powers" label="powers makes one column per power of x"
```

## Training error and test error

Create `curve.py` to print the whole table:

```python file=curve.py
import poly
import waves

train = waves.wave(12, seed=0)
test = waves.wave(1000, seed=100)

print("degree   train RMSE   test RMSE")
for degree, train_error, test_error in poly.errors_by_degree(train, test, list(range(1, 11))):
    print(f"{degree:>6} {train_error:>12.3f} {test_error:>11.3f}")
print("noise in the data: 0.300 (the best any model can do on new points)")
```

Before running it, predict:

```predict
question: Twelve training points, degrees 1 to 10. Which degree will have the lowest error on the 1,000 new points?
choice: Degree 1: the simplest model generalises best
choice: Degree 3: flexible enough for one S-shaped wave, no more
choice: Degree 10: the most flexible model fits best everywhere
answer: Degree 3: flexible enough for one S-shaped wave, no more
explain: Degree 3 has test RMSE 0.314, almost exactly the noise floor of 0.300. A cubic can make one S-shaped bend, which is what sin(πx) looks like between −1 and 1. Degree 1, a straight line, can't bend at all (0.579). Degree 10 fits the twelve training points almost perfectly (0.019) and is wildly wrong between them (15.4 on new points).
```

```powershell
.venv\Scripts\python curve.py
```

```text
degree   train RMSE   test RMSE
     1        0.437       0.579
     2        0.432       0.566
     3        0.264       0.314
     4        0.251       0.357
     5        0.250       0.364
     6        0.228       0.478
     7        0.200       1.105
     8        0.199       1.110
     9        0.182       0.699
    10        0.019      15.425
noise in the data: 0.300 (the best any model can do on new points)
```

Read the two columns separately, and then together.

**Training error only ever goes down.** Every extra degree adds a column, and a model with more columns can always do at least as well as before (it could set the new weight to 0). At degree 10, with 11 numbers to choose (10 weights and a bias) and 12 points to fit, it can almost thread a curve through every point: 0.019, *far* below the noise floor of 0.3. It's matching the noise, the part that by definition can't be predicted.

**Test error goes down, then up.** From degree 1 to 3 the model gains the flexibility the curve really has. After that, every extra degree mostly adds flexibility to chase noise, and the curve starts to swing between the training points. At degree 10 it swings so far that new points are, on average, 15 units off, for data whose whole range is about −1.6 to 1.6.

> **Underfitting**: a model too rigid to capture the real pattern: high error on training data *and* new data. **Overfitting**: a model so flexible that it learns the noise in its training data as if it were pattern: low training error, high error on new data.
>
> *Picture it as* tailoring. An off-the-rack suit in one size (underfit) fits nobody well. A suit tailored to the exact creases of one photo of the customer, including the way they were slouching that day (overfit), fits the photo perfectly and the actual person badly. The suit you want fits the customer's real shape and ignores the slouch.

The gap between the columns is the measurement that matters: **training error says how well the model memorised; test error says how well it learned.**

```check
run ".venv/Scripts/python -m pytest -q tests/test_overfit.py" label="training error falls with every degree; test error is lowest at degree 3"
run ".venv/Scripts/python curve.py" stdout="    10        0.019      15.425" label="curve.py prints the table, ending in the overfit degree-10 model"
```

## Bias and variance

There's a standard vocabulary for the two ways the table goes wrong, and it applies to every model in this series:

> **Bias**: error from a model being systematically wrong in the same way however much data it sees, because it can't represent the real pattern (a straight line through a wave). **Variance**: error from a model changing a lot depending on exactly which training points it happened to get, because it's flexible enough to follow their noise.
>
> *Picture it as* shots at a target. High bias: a tight group, but off-centre: the sights are wrong, and more shots won't fix it. High variance: shots centred on average, but scattered all over: each one depends on the wobble of that moment. You want a tight group in the centre.

Degree 1 has high bias. Degree 10 has huge variance: train it on a different twelve points (`wave(12, seed=1)`) and you get a completely different wild curve. Making a model more flexible lowers bias and raises variance; the best test error is where the two together are smallest. That's the **bias–variance trade-off**, and choosing the degree is choosing where to stand on it.

Try it: change `seed=0` to `seed=2` for the training data in `curve.py` and run it again. The best degree is still around 3, but the high degrees' test errors change by hundreds: that instability *is* variance. (Put it back to `seed=0` afterwards; the check uses it.)

Two problems remain, and they're the next two lessons:

1. You picked degree 3 by looking at the **test** set. But the test set was supposed to stand for data nobody has seen, and you've now used it to make a decision. Choosing with it means its score is no longer an honest estimate. You need a separate set for choosing.
2. Twelve points is little data, so any single set of held-out points gives a noisy answer. And sometimes you need a flexible model (a real problem may need degree 10's freedom somewhere). Next lesson: keeping the flexibility while stopping the wild swings, with **regularisation**.
