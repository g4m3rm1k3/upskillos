---
title: 9.1 — Like the Runs Before It: k-Nearest Neighbours
track: Trees and Neighbours — Predicting Defects
trackOrder: 29
runtime: none
support: data/parts.csv
concepts: nearest-neighbours
revisits: distance, feature-scaling, cross-validation, classification-metrics, numpy, scikit-learn
notebook: ml-knn
lab: 10
problem: A moulding run has just finished with these settings. Will its parts fail inspection? The simplest possible idea is to look up the past runs most like this one and see how they turned out. How do you measure "most like", and why does the unit you record pressure in change the answer?
---

This chapter's data is from a shop floor: 500 injection-moulding runs, each with its process settings (melt temperature, injection pressure, cooling time, shop humidity, and which of two materials was used) and whether its parts **failed inspection**. The job is to predict a defect from the settings, before the parts reach inspection, and, just as importantly, to understand *which* settings cause defects.

The data is made up for the course, from rules about what makes a part fail plus randomness, like real process variation. The rules are hidden, and in lesson 9.2 you'll recover them from the data.

Start with the most direct idea there is: **find the past runs closest to this one, and go with what usually happened to them.**

> **k-nearest neighbours** (k-NN): a classifier that keeps the whole training set, and for a new example finds the *k* training examples nearest to it (by distance between their feature vectors) and predicts the class most of them had. There's no training step beyond storing the data.
>
> *Picture it as* asking the setters with the most similar jobs. "Last time we ran something at about this temperature and cooling time, what happened?" Ask five of them and go with the majority.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `defect-predictor`.
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

**This step: create the supplied files and read them. No code yet.** The button also creates `data/parts.csv`. Open it: one row per run, `defect` is 1 if the run's parts failed inspection.

```python file=tests/test_neighbours.py provided
# Tests for parts.py and knn.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_neighbours.py
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler


def data():
    import parts
    return parts.split(*parts.load("data/parts.csv"))


def test_load_turns_each_run_into_five_numbers():
    import parts
    X, y = parts.load("data/parts.csv")
    assert X.shape == (500, 5) and y.shape == (500,)
    assert X[0].tolist() == [215.4, 777, 11.9, 44, 1]
    assert y.sum() == 183


def test_split_holds_out_a_quarter_with_the_same_defect_rate():
    X_train, X_test, y_train, y_test = data()
    assert (len(y_train), len(y_test)) == (375, 125)
    assert (y_train.sum(), y_test.sum()) == (137, 46)


def test_neighbours_vote():
    import knn
    X_train = np.array([[0.0], [1.0], [2.0], [10.0], [11.0]])
    y_train = np.array([0, 0, 1, 1, 1])
    assert knn.predict(X_train, y_train, np.array([[0.4], [10.6]]), k=3).tolist() == [0, 1]
    assert knn.predict(X_train, y_train, np.array([[0.4]]), k=5).tolist() == [1]


def test_neighbours_match_scikit_learn():
    import knn
    X_train, X_test, y_train, _ = data()
    theirs = KNeighborsClassifier(n_neighbors=5).fit(X_train, y_train).predict(X_test)
    assert knn.predict(X_train, y_train, X_test, k=5).tolist() == theirs.tolist()
    scaler = StandardScaler().fit(X_train)
    Z_train, Z_test = scaler.transform(X_train), scaler.transform(X_test)
    theirs = KNeighborsClassifier(n_neighbors=5).fit(Z_train, y_train).predict(Z_test)
    assert knn.predict(Z_train, y_train, Z_test, k=5).tolist() == theirs.tolist()
```

The second `knn` test: with `k=5` every training point is a neighbour, and three of the five are class 1, so the answer is 1 however close the new point is to the 0s. *k* matters.

```check
file tests/test_neighbours.py -- Click "Create provided tests/test_neighbours.py" above.
file data/parts.csv
```

## Runs as vectors

Each run becomes a vector of five numbers, as each house did in lesson 2.1. Four columns are already numbers; `material` is a letter, so turn it into a number: 1 for material B, 0 for A. A column like this, 1 or 0 for "is it this category?", is an **indicator** (or **dummy**) variable.

Create `parts.py`:

```python file=parts.py
import csv

import numpy as np
from sklearn.model_selection import train_test_split

FEATURES = ["temperature", "pressure", "cooling", "humidity", "material_b"]


def load(path: str) -> tuple[np.ndarray, np.ndarray]:
    """Settings (one row per run, in the order of FEATURES) and whether each run failed inspection."""
    rows, defects = [], []
    with open(path, newline="") as file:
        for row in csv.DictReader(file):
            rows.append([float(row["temperature"]), float(row["pressure"]), float(row["cooling"]),
                         float(row["humidity"]), 1.0 if row["material"] == "B" else 0.0])
            defects.append(int(row["defect"]))
    return np.array(rows), np.array(defects)


def split(X: np.ndarray, y: np.ndarray):
    return train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
```

`split` is lesson 8.2's stratified split. 183 of the 500 runs failed, 36.6%; a model that always says "pass" is right 63.4% of the time, so that's the number to beat.

```check
run ".venv/Scripts/python -m pytest -q tests/test_neighbours.py -k \"load or split\"" label="500 runs as rows of five numbers; 375 for training and 125 held out"
```

## Nearest neighbours, by hand

Create `knn.py`:

```python file=knn.py
import numpy as np


def predict(X_train: np.ndarray, y_train: np.ndarray, X_new: np.ndarray, k: int) -> np.ndarray:
    """For each row of X_new, the majority class of its k nearest training rows."""
    predictions = []
    for x in X_new:
        distances = np.sqrt(((X_train - x) ** 2).sum(axis=1))
        nearest = np.argsort(distances, kind="stable")[:k]
        predictions.append(int(y_train[nearest].mean() > 0.5))
    return np.array(predictions)
```

Line by line, for one new run `x`:

- **`X_train - x`** subtracts `x` from *every* training row at once (broadcasting, lesson 2.2): a table of differences, 375 rows × 5.
- **`(…) ** 2).sum(axis=1)`** squares each difference and adds along each row; **`np.sqrt`** finishes the Euclidean distance of lesson 2.1, one per training run.
- **`np.argsort(distances, kind="stable")[:k]`**: the positions of the *k* smallest distances (lesson 7.4). `kind="stable"` means that if two runs are exactly the same distance away, the one earlier in the data comes first, which is what scikit-learn does; without it, a tie could be broken differently and the test would fail on that one run.
- **`y_train[nearest].mean() > 0.5`**: the neighbours' labels are 0s and 1s, so their mean is the fraction that were defects. More than half means the majority failed.

```check
run ".venv/Scripts/python -m pytest -q tests/test_neighbours.py -k vote" label="the k nearest training points vote" -- distances = np.sqrt(((X_train - x) ** 2).sum(axis=1)); nearest = np.argsort(distances, kind="stable")[:k]
```

## Who are the neighbours?

Look at one test run and its five nearest training runs. At the Python prompt:

```text
>>> import numpy as np, parts
>>> np.set_printoptions(suppress=True)
>>> X_train, X_test, y_train, y_test = parts.split(*parts.load("data/parts.csv"))
>>> x = X_test[0]
>>> x, y_test[0]
(array([ 221.5, 1003. ,    8.3,   32. ,    1. ]), np.int64(1))
>>> nearest = np.argsort(np.sqrt(((X_train - x) ** 2).sum(axis=1)))[:5]
>>> X_train[nearest]
array([[ 227.9,  996. ,   14.4,   35. ,    1. ],
       [ 229.3, 1006. ,   20.7,   41. ,    1. ],
       [ 214.7,  993. ,   12.1,   45. ,    1. ],
       [ 224.4,  983. ,   11.3,   35. ,    0. ],
       [ 213.5,  992. ,   17. ,   49. ,    1. ]])
>>> y_train[nearest]
array([1, 0, 0, 0, 0])
```

(**`np.set_printoptions(suppress=True)`** makes NumPy print ordinary decimals rather than `2.215e+02`-style scientific notation.)

This run failed. It has a very short cooling time, 8.3 s. Its "nearest" neighbours have cooling times from 11.3 to 20.7 s, mostly fine runs, so the vote says pass. What they share with it is **pressure**: every one is within 20 bar of 1003.

The reason is units. Pressure is recorded in bar and varies by about ±100; cooling time varies by about ±5 seconds. In the distance, a 20-bar pressure difference counts 400 (20²), while a whole 6-second cooling difference counts 36. **Pressure decides who's "near" simply because its numbers are bigger.** Record pressure in MPa instead (÷10) and the neighbours change completely. A good model shouldn't depend on which units someone chose.

```predict
question: How would you make every setting count fairly in the distance?
choice: Remove the pressure column
choice: Standardise every column (subtract its mean, divide by its spread), as in lesson 3.2
choice: Use more neighbours
answer: Standardise every column (subtract its mean, divide by its spread), as in lesson 3.2
explain: After standardising, a difference of 1 in any column means "one typical spread of that setting", whatever its units. Pressure still counts (it does affect defects, below about 680 bar), but no longer drowns out cooling time. Removing it would throw away real information; more neighbours just averages over more of the wrong runs.
```

## Scaling, inside the pipeline

The rule from lesson 7.4 applies: the scaler learns a mean and spread, so it's part of the model and must be fitted on training data only. A `Pipeline` does that automatically. The test checks your `knn.predict` against scikit-learn on raw and on scaled data:

```check
run ".venv/Scripts/python -m pytest -q tests/test_neighbours.py" label="your k-NN makes exactly scikit-learn's predictions, raw and scaled"
```

Now measure. The data is small and k-NN's scores are noisy, so use **repeated** cross-validation: 5-fold, done 10 times with different shuffles, 50 scores averaged. Create `neighbours.py`:

```python file=neighbours.py
from sklearn.model_selection import RepeatedKFold, cross_val_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

import parts

X, y = parts.load("data/parts.csv")
folds = RepeatedKFold(n_splits=5, n_repeats=10, random_state=0)

print(f"always 'pass': {1 - y.mean():.3f}")
print("  k   raw   scaled")
for k in [1, 5, 9, 15, 25]:
    raw = cross_val_score(KNeighborsClassifier(n_neighbors=k), X, y, cv=folds).mean()
    scaled = cross_val_score(make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=k)), X, y, cv=folds).mean()
    print(f"{k:>3} {raw:>6.3f} {scaled:>7.3f}")
```

- **`RepeatedKFold(n_splits=5, n_repeats=10)`** is lesson 7.3's shuffled `KFold`, repeated with 10 different shuffles. More scores, so a steadier average.
- **`cross_val_score`** with no `scoring=` uses the model's default, which for a classifier is **accuracy**.

```powershell
.venv\Scripts\python neighbours.py
```

```text
always 'pass': 0.634
  k   raw   scaled
  1  0.682   0.700
  5  0.718   0.741
  9  0.705   0.741
 15  0.695   0.730
 25  0.679   0.711
```

- **Scaling helps at every k**, by 2 to 4 points: the neighbours are now chosen by all the settings, not mostly by pressure.
- ***k* is a dial from overfitting to underfitting** (lesson 7.1 again). *k* = 1 copies the single nearest run, noise and all. *k* = 25 averages over runs that aren't really similar any more. Somewhere between (5 to 9 here) is best.
- **74% is only 11 points above always saying "pass"**. k-NN treats every setting as equally important and every direction as equally relevant; it can't learn that *cooling below 12 seconds* is what matters, rather than how far the cooling is from this run's. That's what the next lesson's model does.

```check
run ".venv/Scripts/python neighbours.py" stdout="  9  0.705   0.741" label="neighbours.py compares raw and scaled k-NN for each k"
```

k-NN is still worth knowing: it needs no training, it's easy to explain ("these five past runs are most like yours"), and it's the basis of the similarity search in Chapter 14. Its weaknesses are the ones you just saw: it needs scaling, it slows down as the data grows (every prediction measures the distance to every training run), and it can't tell you *why*.
