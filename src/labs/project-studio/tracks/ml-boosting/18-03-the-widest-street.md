---
title: 18.3 — The Widest Street: Support Vector Machines and Kernels
track: Boosting and SVMs — Surface Finish and a Tolerance Zone
runtime: none
support: data/positions.csv
concepts: svm
revisits: logistic-regression, classification-metrics, feature-scaling, dot-product, distance, cross-validation, scikit-learn, testing
notebook: ml-svm
lab: 15
problem: A drilled hole passes inspection if its true position is inside a circle of diameter 0.2 mm. A linear classifier can only draw straight lines, and no straight line draws a circle. Chapter 12 needed a hidden layer to bend the boundary. A support vector machine bends it a different way, with an idea called the kernel. What is a kernel, and when is it worth using?
---

A **support vector machine** (SVM) is a classifier, like lesson 8.4's logistic regression: it draws a boundary and calls one side reject and the other side ok. What's different is **which** boundary it chooses, and a trick that lets the boundary bend without adding a single layer.

The worked example is one of GD&T's most common callouts. A hole is drilled to a nominal position; the CMM reports how far off it is in x and y (`dx`, `dy`, in mm). The **true position** deviation is the diameter of the circle, centred on the nominal position, that the hole's centre lies on:

$$\text{true position} = 2\sqrt{dx^2 + dy^2}$$

With a tolerance of ⌀0.2 mm, a hole is ok when that's at most 0.2, which means its centre is inside a circle of radius 0.1 mm. The file has 400 holes and the inspector's verdicts. Chapter 12 learned a tolerance zone with a neural network; this lesson does it with an SVM, and compares three ways of getting a curved boundary.

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/positions.csv`, with columns `hole`, `dx`, `dy` and `verdict` (`ok` or `reject`). Keep working in the `boosting-and-svms` folder.

```python file=tests/test_svm.py provided
# Tests for positions.py, margins.py and kernels.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_svm.py
import numpy as np
from pytest import approx
from sklearn.metrics.pairwise import rbf_kernel as sklearn_rbf
from sklearn.svm import SVC

SIX = np.array([[-1.0, 0.0], [-2.0, 1.0], [-2.0, -1.0], [1.0, 0.0], [2.0, 1.0], [2.0, -1.0]])
SIDES = np.array([-1, -1, -1, 1, 1, 1])


def test_positions_load_with_reject_as_plus_one():
    import positions
    X, y = positions.load("data/positions.csv")
    assert X.shape == (400, 2) and X[0].tolist() == [0.089, -0.061]
    assert y[0] == 1 and y[1] == -1 and set(y) == {-1, 1}


def test_distances_from_a_line():
    import margins
    w, b = np.array([3.0, 4.0]), -5.0                     # the line 3x + 4y = 5
    assert margins.scores(w, b, np.array([[3.0, 4.0]])) == approx([20.0])
    assert margins.distances(w, b, np.array([[3.0, 4.0], [0.0, 0.0]])) == approx([4.0, -1.0])


def test_hinge_is_zero_only_with_room_to_spare():
    import margins
    w, b = np.array([1.0, 0.0]), 0.0
    X = np.array([[2.0, 0.0], [1.0, 0.0], [0.5, 0.0], [-1.0, 0.0]])
    assert margins.hinge(w, b, X, np.array([1, 1, 1, 1])) == approx([0.0, 0.0, 0.5, 2.0])


def test_the_widest_street_through_six_points():
    import margins
    svm = SVC(kernel="linear", C=1000).fit(SIX, SIDES)
    w, b = svm.coef_[0], svm.intercept_[0]
    assert w == approx([1.0, 0.0], abs=1e-3) and b == approx(0.0, abs=1e-3)
    assert margins.distances(w, b, SIX[[0, 3]]) == approx([-1.0, 1.0], abs=1e-3)
    assert margins.hinge(w, b, SIX, SIDES) == approx(np.zeros(6), abs=1e-3)


def test_scikit_learn_minimises_your_objective():
    import margins
    X = SIX + np.array([[0.0, 0.0], [1.5, 0.0], [0.0, 0.0], [0.0, 0.0], [-1.5, 0.0], [0.0, 0.0]])
    svm = SVC(kernel="linear", C=0.5).fit(X, SIDES)
    w, b = svm.coef_[0], svm.intercept_[0]
    best = margins.objective(w, b, X, SIDES, C=0.5)
    nudges = np.random.default_rng(0).normal(0, 0.05, (50, 3))
    assert all(margins.objective(w + n[:2], b + n[2], X, SIDES, C=0.5) >= best - 1e-6 for n in nudges)


def test_the_square_kernel_is_a_dot_product_of_square_features():
    import kernels
    A, B = np.array([[1.0, 2.0], [3.0, -1.0]]), np.array([[0.5, 4.0]])
    assert kernels.square_kernel(A, B) == approx(kernels.square_features(A) @ kernels.square_features(B).T)


def test_rbf_kernel_matches_scikit_learn():
    import kernels
    A = np.array([[0.0, 0.0], [1.0, 1.0], [3.0, -2.0]])
    assert kernels.rbf_kernel(A, A, gamma=0.5) == approx(sklearn_rbf(A, A, gamma=0.5))
    assert np.diag(kernels.rbf_kernel(A, A, gamma=0.5)) == approx(np.ones(3))
```

- **SVMs label the two classes −1 and +1**, not 0 and 1 as logistic regression did. You'll see why in the hinge loss: the sign does the work.
- **`SIX`** is six points, three on each side of the y axis, with the nearest ones at x = −1 and x = +1. The widest gap between the two groups is the y axis itself, 1 unit from each.
- **`test_scikit_learn_minimises_your_objective`** is a different kind of test: it doesn't know the right answer, but it knows scikit-learn's answer is the lowest point of the function you'll write. Nudging the answer in 50 random directions must never go lower.

```check
file tests/test_svm.py -- Click "Create provided tests/test_svm.py" above.
file data/positions.csv
```

## Load the holes

Create `positions.py`:

```python file=positions.py
import csv

import numpy as np


def load(path: str) -> tuple[np.ndarray, np.ndarray]:
    """Each hole's x and y deviation (mm), and its verdict: +1 for reject, -1 for ok."""
    X, verdicts = [], []
    with open(path, newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            X.append([float(row["dx"]), float(row["dy"])])
            verdicts.append(1 if row["verdict"] == "reject" else -1)
    return np.array(X), np.array(verdicts)
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_svm.py -k positions" label="400 holes, with reject as +1 and ok as -1"
```

## The widest street

Any line that separates two groups perfectly would do for logistic regression. An SVM is pickier. Picture the boundary as the middle of a street, with the two groups on the pavements on either side: the SVM chooses the line that makes the **street as wide as possible**.

> **Margin**: the distance from the boundary to the nearest training points. A **maximum-margin classifier** chooses the boundary with the widest margin. The points on the edges of the street, the ones that fix where it runs, are the **support vectors**; every other point could move (without crossing onto the street) and the boundary wouldn't change.
>
> *Picture it as* setting a go/no-go limit between good parts and bad. You'd put it halfway between the worst good part and the best bad part, as far from both as you can, so the next part that's slightly off doesn't land on the wrong side.

A linear boundary is the line where the **score** $w \cdot x + b$ is 0 (lesson 8.4 called it the linear score). The score is positive on one side and negative on the other, and dividing it by the length of $w$ gives the actual **distance** from the line (lesson 2.1's length of a vector):

$$\text{distance} = \frac{w \cdot x + b}{\lVert w \rVert}$$

For the line $3x + 4y = 5$ (so $w = (3, 4)$, $b = -5$, and $\lVert w \rVert = 5$): the point (3, 4) has score $9 + 16 - 5 = 20$ and distance 4; the origin has score −5 and distance −1, one unit away on the other side.

An SVM scales $w$ and $b$ so that the support vectors have scores of exactly +1 and −1. The street's edges are then the lines where the score is ±1, and its half-width is $1 / \lVert w \rVert$. So **a wider street means a smaller $w$**.

Real data rarely separates perfectly, so points are allowed onto the street, or even onto the wrong side, at a price. With classes $y = \pm 1$, the quantity $y \times \text{score}$ is at least 1 for a point safely on its own side of the street. The **hinge loss** charges for every point that falls short:

$$\text{hinge} = \max(0,\; 1 - y \times \text{score})$$

Zero for a point with room to spare; growing in a straight line the further a point intrudes. A soft-margin SVM minimises:

$$\tfrac{1}{2}\lVert w\rVert^2 + C \sum \text{hinge}$$

The first term wants a wide street; the second wants few intruders. **`C`** sets the balance: a large `C` makes intruders expensive (a narrow street that fits the training data closely); a small `C` tolerates them (a wide, smooth street). It's lesson 7.2's regularisation turned around: there, a bigger penalty meant a simpler model; here, a bigger `C` means a *less* simple one.

Create `margins.py`:

```python file=margins.py
import numpy as np


def scores(w: np.ndarray, b: float, X: np.ndarray) -> np.ndarray:
    """Each point's score w·x + b: positive on one side of the line, negative on the other."""
    return X @ w + b


def distances(w: np.ndarray, b: float, X: np.ndarray) -> np.ndarray:
    """Each point's signed distance from the line w·x + b = 0."""
    return scores(w, b, X) / np.linalg.norm(w)


def hinge(w: np.ndarray, b: float, X: np.ndarray, y: np.ndarray) -> np.ndarray:
    """0 for a point on the right side with room to spare (y × score at least 1), more the further it falls short."""
    return np.maximum(0, 1 - y * scores(w, b, X))


def objective(w: np.ndarray, b: float, X: np.ndarray, y: np.ndarray, C: float) -> float:
    """What a linear SVM minimises: a wide street (small w) plus C times the points that break its rule."""
    return float(0.5 * w @ w + C * hinge(w, b, X, y).sum())
```

- **`np.linalg.norm(w)`** is the length of `w`: $\sqrt{w_1^2 + w_2^2}$.
- **`np.maximum(0, ...)`** compares element by element and keeps the larger, so every negative value becomes 0. (`np.max` would instead return the single largest value in the array.)
- **`w @ w`** is $w \cdot w = \lVert w \rVert^2$.

```check
run ".venv/Scripts/python -m pytest -q tests/test_svm.py -k \"distances or hinge or street or minimises\"" label="scores, distances, the hinge loss and the SVM objective, which scikit-learn's SVC minimises" -- distances = scores / np.linalg.norm(w); hinge = np.maximum(0, 1 - y * scores); objective = 0.5 * w @ w + C * hinge.sum()
```

On `SIX`, scikit-learn's `SVC(kernel="linear")` finds $w = (1, 0)$, $b = 0$: the y axis, with the nearest points at distance exactly 1 on either side, and no hinge loss at all. Two of the six points are support vectors; the other four could move further away and nothing would change.

## A straight line can't draw a circle

Now try a linear SVM on the holes. Create `linear.py`:

```python file=linear.py
from sklearn.dummy import DummyClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import positions

X, y = positions.load("data/positions.csv")
folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)

baseline = cross_val_score(DummyClassifier(), X, y, cv=folds).mean()
print(f"always 'ok' (the baseline)   accuracy {baseline:.3f}")
for C in [0.1, 1, 10, 100]:
    model = make_pipeline(StandardScaler(), SVC(kernel="linear", C=C))
    print(f"linear SVM, C = {C:<5}        accuracy {cross_val_score(model, X, y, cv=folds).mean():.3f}")
```

- **`make_pipeline(StandardScaler(), SVC(...))`** standardises the features (lesson 3.2) inside each fold, as lesson 7.4 taught. An SVM measures distances, so features must be on comparable scales, exactly like k-NN in lesson 9.1.
- **`StratifiedKFold`** keeps the share of rejects the same in every fold (lesson 8.2).
- **`DummyClassifier()`** always predicts the most common class: here, ok.

```powershell
.venv\Scripts\python linear.py
```

```text
always 'ok' (the baseline)   accuracy 0.713
linear SVM, C = 0.1          accuracy 0.713
linear SVM, C = 1            accuracy 0.713
linear SVM, C = 10           accuracy 0.713
linear SVM, C = 100          accuracy 0.713
```

Every linear SVM scores exactly the same as "always ok". The rejects lie all the way round the circle, on every side, so any straight line that puts some rejects on one side puts more good holes there too. The best a line can do is put every hole on the ok side.

```check
run ".venv/Scripts/python linear.py" stdout="linear SVM, C = 100          accuracy 0.713" label="linear.py: a straight boundary does no better than calling every hole ok"
```

## Give it the right feature

You know the rule: reject when $dx^2 + dy^2$ is too big. So give the model $dx^2 + dy^2$ as a third column. In three dimensions (dx, dy, and the squared distance), the good holes sit low and the rejects sit high, and a flat plane separates them. A plane in those three columns is a circle in the original two. Create `circle.py`:

```python file=circle.py
import numpy as np
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import positions

X, y = positions.load("data/positions.csv")
folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
with_radius = np.column_stack([X, (X ** 2).sum(axis=1)])     # dx, dy, and dx² + dy²

for C in [0.1, 1, 10, 100]:
    model = make_pipeline(StandardScaler(), SVC(kernel="linear", C=C))
    print(f"linear SVM + squared distance, C = {C:<5}  accuracy {cross_val_score(model, with_radius, y, cv=folds).mean():.3f}")
```

- **`(X ** 2).sum(axis=1)`** squares every value and adds along each row: $dx^2 + dy^2$ for every hole.
- **`np.column_stack`** puts it next to the original two columns.

```powershell
.venv\Scripts\python circle.py
```

```text
linear SVM + squared distance, C = 0.1    accuracy 0.963
linear SVM + squared distance, C = 1      accuracy 0.985
linear SVM + squared distance, C = 10     accuracy 0.988
linear SVM + squared distance, C = 100    accuracy 1.000
```

From 71% to **100%**, with one extra column. The verdicts in this file were made by exactly this rule, so the right feature makes the problem easy, and a large `C` (few intruders allowed) is right because there's no noise to tolerate. It's lesson 16.2 again: **if you know the physics, give it to the model**.

```check
run ".venv/Scripts/python circle.py" stdout="C = 100    accuracy 1.000" label="circle.py: with dx² + dy² as a feature, a straight boundary is perfect"
```

## The kernel trick

When you *don't* know the right feature, you could add lots of candidates: every square and every product of the columns, and their cubes, and so on. The number of columns explodes. The **kernel trick** gets the benefit without building them.

The key fact about SVMs (which takes more mathematics than this lesson to prove) is that training and prediction only ever need the **dot products** between pairs of points, never the points' features on their own. So if you can compute the dot product of two points' *expanded* features directly from the original points, you never need to build the expanded features at all.

Take the **square features** of a point $(x, y)$: $(x^2,\; \sqrt{2}\,xy,\; y^2)$. Multiply out the dot product of two points' square features:

$$a_x^2 b_x^2 + 2\,a_x a_y b_x b_y + a_y^2 b_y^2 = (a_x b_x + a_y b_y)^2 = (a \cdot b)^2$$

So the dot product in the three-column space is just the ordinary dot product, squared. That function, $K(a, b) = (a \cdot b)^2$, is a **kernel**.

> **Kernel**: a function $K(a, b)$ that gives the dot product of two points after some expansion of their features, computed straight from the original points. An SVM that uses a kernel in place of the dot product draws a straight boundary in the expanded space, which is a curved boundary in the original one.
>
> *Picture it as* a gauge that measures how alike two parts are directly, without anyone having to list and measure every one of the features it takes into account.

The kernel used most is the **RBF kernel** (radial basis function):

$$K(a, b) = e^{-\gamma\,\lVert a - b \rVert^2}$$

It's 1 when $a$ and $b$ are the same point and falls towards 0 as they move apart: it measures **closeness**. Its expanded space has infinitely many dimensions, so it could never be built as columns, but the kernel is one line of code. With it, an SVM's prediction for a new hole is a weighted vote of the support vectors, each weighted by how close it is to the new hole. **`gamma`** ($\gamma$) sets how quickly closeness fades with distance: a large `gamma` means only very near support vectors count, so the boundary can bend tightly around individual points (and overfit); a small one means far-away points count too, so the boundary is smooth.

Create `kernels.py`:

```python file=kernels.py
import numpy as np


def square_features(X: np.ndarray) -> np.ndarray:
    """(x, y) → (x², √2·x·y, y²): every product of two coordinates."""
    x, y = X[:, 0], X[:, 1]
    return np.column_stack([x ** 2, np.sqrt(2) * x * y, y ** 2])


def square_kernel(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    """(a·b)² for every pair: the dot products of the square features, without making them."""
    return (A @ B.T) ** 2


def rbf_kernel(A: np.ndarray, B: np.ndarray, gamma: float) -> np.ndarray:
    """exp(-gamma × squared distance) for every pair: 1 for the same point, near 0 for distant ones."""
    squared = ((A[:, None, :] - B[None, :, :]) ** 2).sum(axis=2)
    return np.exp(-gamma * squared)
```

- **`A @ B.T`** is every row of `A` dotted with every row of `B` at once (lesson 2.2), and `** 2` squares each one.
- **`A[:, None, :] - B[None, :, :]`** uses broadcasting (lesson 2.2): `None` adds a new axis of length 1, so a 3 × 1 × 2 array minus a 1 × 3 × 2 array gives 3 × 3 × 2, every point in `A` minus every point in `B`. Squaring and summing over the last axis gives every squared distance.

```check
run ".venv/Scripts/python -m pytest -q tests/test_svm.py -k kernel" label="the square kernel equals the dot product of the square features; the RBF kernel matches scikit-learn's" -- square_kernel = (A @ B.T) ** 2; rbf_kernel = np.exp(-gamma * squared distances)
```

## Let the kernel find the circle

Now an RBF-kernel SVM on the original two columns, with no hand-made feature, trying a grid of `C` and `gamma` values (lesson 7.3's cross-validation chooses). Create `rbf.py`:

```python file=rbf.py
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import positions

X, y = positions.load("data/positions.csv")
folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
GAMMAS = [0.01, 0.1, 1, 10, 100]

print("accuracy        gamma: " + "".join(f"{gamma:>7}" for gamma in GAMMAS))
for C in [0.1, 1, 10, 100]:
    row = []
    for gamma in GAMMAS:
        model = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=C, gamma=gamma))
        row.append(cross_val_score(model, X, y, cv=folds).mean())
    print(f"C = {C:<5}               " + "".join(f"{accuracy:7.3f}" for accuracy in row))

best = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=10, gamma=1)).fit(X, y)
print(f"\nwith C = 10 and gamma = 1: {len(best[-1].support_)} of {len(X)} holes are support vectors")
```

- **`best[-1]`** is the last step of the pipeline, the SVC itself; **`.support_`** lists the positions of its support vectors.

```powershell
.venv\Scripts\python rbf.py
```

```text
accuracy        gamma:    0.01    0.1      1     10    100
C = 0.1                   0.713  0.757  0.940  0.713  0.713
C = 1                     0.713  0.948  0.970  0.970  0.757
C = 10                    0.847  0.963  0.988  0.965  0.785
C = 100                   0.948  0.988  0.975  0.963  0.785

with C = 10 and gamma = 1: 44 of 400 holes are support vectors
```

The grid tells the whole story of `gamma`:

- **`gamma` too small (0.01)**: closeness hardly fades, every hole influences every other, and the boundary is too stiff to curve round the circle. Back to 71%, unless a large `C` forces it.
- **`gamma` too large (100)**: each support vector only influences holes right next to it. The boundary wraps tightly round individual training holes, and new holes that aren't close to any support vector are mostly called ok: 79% at best.
- **In between**, the kernel finds the circle on its own: **98.8%** (C = 10, gamma = 1), close to the hand-made feature's result, with nothing about circles in the code.

Only **44 of the 400 holes** are support vectors: the ones near the tolerance circle. The SVM's whole decision rests on the borderline parts, which is exactly where an inspector would look too.

```check
run ".venv/Scripts/python rbf.py" stdout="C = 10                    0.847  0.963  0.988  0.965  0.785" label="rbf.py: an RBF-kernel SVM finds the circular zone with no hand-made feature"
```

```predict
question: For a tolerance zone you can write down (like true position), which approach should go into production: the squared-distance feature or the RBF kernel?
choice: The RBF kernel, because it's more general
choice: The squared-distance feature: it's exact, it can't bend wrongly between training holes, and anyone can check it against the drawing
choice: Neither: a neural network is always better
answer: The squared-distance feature: it's exact, it can't bend wrongly between training holes, and anyone can check it against the drawing
explain: When the rule is known, a model that encodes it is more accurate (100% against 98.8% here), needs fewer examples, and can be checked against the drawing by a quality engineer. In fact, for a rule this exact you don't need a model at all: you compute the true position and compare it with 0.2. Kernels earn their place when the boundary's shape is unknown, for example when the verdict depends on several measurements interacting in ways no drawing spells out.
```

## Choosing between them

| | random forest / boosting | SVM with an RBF kernel | logistic regression |
|---|---|---|---|
| best on | tables of mixed features, thousands to millions of rows | small to medium data (up to tens of thousands of rows) with smooth boundaries | when you need the weights explained |
| scaling needed | no | **yes**, always | for gradient descent, yes |
| probabilities | yes | not directly (`probability=True` adds an extra fitting step) | yes |
| slow when | rarely | rows go past about 50,000: kernel SVMs compare pairs of rows, so the work grows with the *square* of the number of rows | rarely |

## Your own problem

1. **For a pass/fail decision with a known rule** (a tolerance, a limit), compute the rule. Use machine learning only for what the rule leaves out.
2. **On tabular data, try boosting first**, then an SVM if the data is small and the features are all numbers on comparable scales.
3. **Always put the scaler in a pipeline with the SVM**, and search `C` and `gamma` together on a grid like `rbf.py`'s (scikit-learn's `GridSearchCV` does the same loop for you).
4. **Look at the support vectors.** They're the borderline cases, and they're the examples worth showing to the people who make the decisions.
