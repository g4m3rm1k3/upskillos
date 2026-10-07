# k-nearest neighbours

Every model so far has learned **weights**: training adjusted numbers until a formula fitted the data, and afterwards the data could be thrown away. This lesson's model works the opposite way. **k-nearest neighbours** (kNN) does no training at all. It simply keeps every training example, and when asked about a new one, finds the `k` most similar examples it has stored and lets them vote. Is this new flower like the ones labelled "setosa"? Is this house like the ones that sold for about £300,000?

It is the simplest learning method there is, and also a surprisingly good one, which makes it an essential baseline. Building it from scratch also exposes three ideas that matter for every model: what "similar" means and why the **scale** of features matters, how one setting (`k`) moves a model between overfitting and underfitting, and why high-dimensional data behaves strangely, the **curse of dimensionality**.

## The algorithm

To classify a new point:

1. Compute its distance to every training example.
2. Find the `k` training examples with the smallest distances: its nearest neighbours.
3. Predict the most common label among them (for regression: the average of their values).

The usual distance is the ordinary straight-line (**Euclidean**) distance: for points `a` and `b`, the square root of the sum of squared differences in each feature, `np.sqrt(((a - b) ** 2).sum())`, the length of `a − b` from the vectors lesson.

For many new points at once, broadcasting computes every distance in one expression. If `X_new` has shape `(m, d)` and `X_train` has shape `(n, d)`, then `X_new[:, None, :] - X_train[None, :, :]` has shape `(m, n, d)`: every new point minus every training point. Squaring, summing over the last axis and taking the square root gives an `(m, n)` table of distances.

```python type
import numpy as np

X_train = np.array([[1.0, 1.0], [2.0, 1.0], [6.0, 5.0], [7.0, 6.0], [6.5, 7.0]])
y_train = np.array([0, 0, 1, 1, 1])
X_new = np.array([[1.5, 2.0], [5.0, 5.0]])

diffs = X_new[:, None, :] - X_train[None, :, :]
print("differences shape:", diffs.shape)
dist = np.sqrt((diffs ** 2).sum(axis=2))
print(dist.round(2))

nearest = np.argsort(dist, axis=1)[:, :3]
print("three nearest training examples:", nearest)
print("their labels:", y_train[nearest])
```

```output
differences shape: (2, 5, 2)
[[1.12 1.12 5.41 6.8  7.07]
 [5.66 5.   1.   2.24 2.5 ]]
three nearest training examples: [[0 1 2]
 [2 3 4]]
their labels: [[0 0 1]
 [1 1 1]]
```

`np.argsort(dist, axis=1)` sorts each row's training-example numbers from closest to farthest, and `[:, :3]` keeps the three closest. `y_train[nearest]` looks up their labels. The first new point has labels `[0, 0, 1]` among its neighbours, so its vote is 0. The second has `[1, 1, 1]`, so it is 1.

To count the votes, `np.bincount` counts how many times each whole number appears (`np.bincount([0, 0, 1])` is `[2, 1]`), and `argmax` picks the winner. Putting it together:

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split

def knn_predict(X_train, y_train, X_new, k):
    dist = np.sqrt(((X_new[:, None, :] - X_train[None, :, :]) ** 2).sum(axis=2))
    nearest = np.argsort(dist, axis=1)[:, :k]
    votes = y_train[nearest]
    return np.array([np.bincount(row).argmax() for row in votes])

X, y = make_moons(300, noise=0.3, random_state=0)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=0)

g1, g2 = np.meshgrid(np.linspace(-2, 3, 120), np.linspace(-1.5, 2, 90))
grid = np.column_stack([g1.ravel(), g2.ravel()])
fig, axes = plt.subplots(1, 3, figsize=(10, 3.2))
for ax, k in zip(axes, [1, 15, 149]):
    regions = knn_predict(X_train, y_train, grid, k).reshape(g1.shape)
    ax.contourf(g1, g2, regions, levels=[-0.5, 0.5, 1.5], colors=["tab:blue", "tab:red"], alpha=0.25)
    ax.scatter(*X_train.T, c=y_train, cmap="coolwarm", s=8)
    train_acc = (knn_predict(X_train, y_train, X_train, k) == y_train).mean()
    test_acc = (knn_predict(X_train, y_train, X_test, k) == y_test).mean()
    ax.set_title(f"k = {k}: train {train_acc:.2f}, test {test_acc:.2f}", fontsize=9)
plt.show()
```

`make_moons` makes two interleaving half-moons with noise, a shape no straight line can separate, and kNN handles it without any special effort. (When votes tie, `argmax` picks the smaller label; an odd `k` avoids ties with two classes.)

## k controls the complexity

The three panels are the overfitting lesson again, with `k` as the dial:

- **k = 1**: every training point is its own nearest neighbour, so training accuracy is a perfect 1.00, but the boundary wraps around every noisy point, making islands of red in blue territory. Test accuracy is 0.89. This is overfitting: high variance.
- **k = 15**: the boundary is smooth and follows the moons. Test accuracy is about 0.93.
- **k = 149**: 149 of the 150 training points vote, so the prediction hardly depends on where the new point is: the whole plane goes to class 0, the training majority (85 of 150). The test half happens to be mostly class 1, so test accuracy drops to 0.43, worse than guessing. This is underfitting: high bias.

Small `k` means a flexible, jumpy model; large `k`, a rigid, smooth one. As with the polynomial degree and the regularisation strength, the right value is chosen on validation data, typically by cross-validation, never by training accuracy (which always prefers `k = 1`).

## Distance needs scale

kNN is even more sensitive to units than the weight-based models. There, a feature in large units could simply get a small weight (though, as the regularisation lesson showed, the penalty then treats it unfairly); here, raw differences go straight into the distance. The wine dataset (`load_wine`) has 178 wines made from three cultivars (grape varieties), each described by 13 chemical measurements. Alcohol ranges from about 11 to 15 (percent), while **proline** (an amino acid) ranges from 278 to 1680. A difference of 100 in proline is ordinary; a difference of 100 in alcohol is impossible. But the distance formula just adds squared differences, so proline dominates every distance, and the other twelve measurements barely count.

```python type
import numpy as np
from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

def knn_predict(X_train, y_train, X_new, k):
    dist = np.sqrt(((X_new[:, None, :] - X_train[None, :, :]) ** 2).sum(axis=2))
    nearest = np.argsort(dist, axis=1)[:, :k]
    return np.array([np.bincount(row).argmax() for row in y_train[nearest]])

wine = load_wine()
print("feature ranges:")
for name, low, high in zip(wine.feature_names[:3] + wine.feature_names[-1:], wine.data.min(axis=0)[[0, 1, 2, 12]], wine.data.max(axis=0)[[0, 1, 2, 12]]):
    print(f"  {name:<12} {low:8.2f} to {high:8.2f}")

X_train, X_test, y_train, y_test = train_test_split(wine.data, wine.target, test_size=0.3, random_state=0)
raw = (knn_predict(X_train, y_train, X_test, 5) == y_test).mean()
scaler = StandardScaler().fit(X_train)
scaled = (knn_predict(scaler.transform(X_train), y_train, scaler.transform(X_test), 5) == y_test).mean()
print(f"test accuracy, raw features: {raw:.2f}   standardised: {scaled:.2f}")
```

```output
feature ranges:
  alcohol         11.03 to    14.83
  malic_acid       0.74 to     5.80
  ash              1.36 to     3.23
  proline        278.00 to  1680.00
test accuracy, raw features: 0.72   standardised: 1.00
```

Standardising (each feature minus its training mean, divided by its training standard deviation, as in the multiple regression lesson) puts every feature on the same footing, and accuracy jumps from 0.72 to 1.00 on this split. For any distance-based method, **scale the features first**. And as always, fit the scaler on the training data only.

Whether equal footing is right is itself a choice. If you know one feature matters more, you can deliberately give it a larger scale. kNN has no weights to learn which features matter, so irrelevant features hurt it too: each one adds noise to every distance.

## Choosing k with scikit-learn

scikit-learn's `KNeighborsClassifier` does the same thing (with smarter search for large datasets). Combined with a scaler in a **pipeline**, which runs the steps in order and refits the scaler inside each fold, it can be cross-validated in one line:

```python type
from sklearn.datasets import load_wine
from sklearn.model_selection import cross_val_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

wine = load_wine()
for k in [1, 3, 5, 9, 15, 25, 45]:
    model = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=k))
    scores = cross_val_score(model, wine.data, wine.target, cv=5)
    print(f"k = {k:>2}: mean accuracy {scores.mean():.3f}")
```

```output
k =  1: mean accuracy 0.950
k =  3: mean accuracy 0.944
k =  5: mean accuracy 0.949
k =  9: mean accuracy 0.966
k = 15: mean accuracy 0.955
k = 25: mean accuracy 0.961
k = 45: mean accuracy 0.961
```

`make_pipeline(StandardScaler(), KNeighborsClassifier(...))` bundles the two into one model with `fit` and `predict`. Passing the pipeline to `cross_val_score` matters: each fold fits the scaler on that fold's training part only, so no information from the held-out part leaks in. Every `k` here scores between 0.94 and 0.97, with `k = 9` slightly ahead; the differences are only a wine or two, well within the noise you met in the cross-validation lesson. With only 178 wines, any of these is a reasonable choice.

## The curse of dimensionality

kNN rests on an assumption: that nearby points have similar labels, and that a new point's nearest neighbours are genuinely **near**. In many dimensions, that second part quietly fails. Scatter 500 random points in a unit cube and measure their distances from another random point, in 2, 10, 100 and 1000 dimensions:

```python type
import numpy as np

rng = np.random.default_rng(0)
for dim in [2, 10, 100, 1000]:
    points = rng.random((500, dim))
    query = rng.random(dim)
    dist = np.sqrt(((points - query) ** 2).sum(axis=1))
    print(f"{dim:>4} dimensions: nearest {dist.min():6.2f}, farthest {dist.max():6.2f}, ratio {dist.min() / dist.max():.2f}")
```

```output
   2 dimensions: nearest   0.03, farthest   1.27, ratio 0.02
  10 dimensions: nearest   0.34, farthest   1.91, ratio 0.18
 100 dimensions: nearest   3.39, farthest   4.60, ratio 0.74
1000 dimensions: nearest  12.32, farthest  13.63, ratio 0.90
```

In two dimensions the nearest point is 0.03 away and the farthest 1.27: "near" means something. In 1000 dimensions the nearest is 12.3 and the farthest 13.6: every point is roughly the same distance away, and the "nearest" neighbour is barely nearer than the farthest. Each extra dimension adds a little random difference to every distance, and with enough dimensions those additions swamp everything else. To keep neighbours close in high dimensions you would need astronomically more data.

Real data is rarely as bad as uniform random points: images and text, for instance, have many features but lie close to much lower-dimensional structure. Still, this is why kNN on raw high-dimensional features often disappoints, and why later lessons spend time on reducing dimensions and learning better representations before measuring similarity.

## The cost of not training

kNN's training is instant: store the data. The cost moves to prediction: each new point must be compared with every stored example, `n` distances of `d` numbers each. For a few thousand examples that is nothing; for millions, every prediction is slow, and the whole training set must be kept in memory. Data structures such as k-d trees (which scikit-learn uses automatically when they help) and approximate nearest-neighbour search speed this up, and they are what powers "find similar items" features in search and recommendation systems.

::: challenge All the distances [easy]
Write a function `distances(A, B)` that returns the matrix of Euclidean distances between every row of `A` (shape `(m, d)`) and every row of `B` (shape `(n, d)`): entry `[i, j]` is the distance from `A[i]` to `B[j]`. Use broadcasting, without any Python loop.

```python starter
import numpy as np

def distances(A, B):
    return np.zeros((len(A), len(B)))

A = np.array([[0.0, 0.0], [3.0, 4.0]])
B = np.array([[0.0, 0.0], [6.0, 8.0], [3.0, 0.0]])
print(distances(A, B))
```

```python solution
import numpy as np

def distances(A, B):
    return np.sqrt(((A[:, None, :] - B[None, :, :]) ** 2).sum(axis=2))

A = np.array([[0.0, 0.0], [3.0, 4.0]])
B = np.array([[0.0, 0.0], [6.0, 8.0], [3.0, 0.0]])
print(distances(A, B))
```

```python test
import ast as _ast
import numpy as _np
assert "distances" in dir(), "Keep the function's name as distances."
_A = _np.array([[0.0, 0.0], [3.0, 4.0]])
_B = _np.array([[0.0, 0.0], [6.0, 8.0], [3.0, 0.0]])
_got = distances(_A, _B)
assert _np.shape(_got) == (2, 3), f"The result should have one row per row of A and one column per row of B: shape (2, 3), not {_np.shape(_got)}."
assert _np.allclose(_got, [[0, 10, 3], [5, 5, 4]]), f"For the example the distances should be [[0, 10, 3], [5, 5, 4]], but got {_np.round(_got, 3).tolist()}."
_rng = _np.random.default_rng(2)
_P, _Q = _rng.normal(size=(7, 4)), _rng.normal(size=(5, 4))
_want = _np.array([[_np.linalg.norm(_p - _q) for _q in _Q] for _p in _P])
assert _np.allclose(distances(_P, _Q), _want), "Wrong distances for points in 4 dimensions: sum the squared differences over the feature axis (axis=2), then take the square root."
_fn = [_n for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.FunctionDef) and _n.name == "distances"][0]
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp, _ast.GeneratorExp)) for _n in _ast.walk(_fn)), "Use broadcasting instead of a loop."
"SUCCESS: One broadcast, every distance."
```

Hint: `A[:, None, :] - B[None, :, :]` has shape `(m, n, d)`. Square it, sum over `axis=2`, and take the square root.
:::

::: challenge Neighbours for numbers [medium]
kNN also does regression: predict the **average** of the `k` nearest neighbours' values. Write `knn_regress(X_train, y_train, X_new, k)` that returns an array of predictions, one per row of `X_new`.

Then use it on the starter's noisy sine data (one feature) and store, in `errors`, a dictionary mapping each `k` in `[1, 10, 100]` to the mean squared error on the **test** points. Finally set `best_k` to the `k` with the smallest test error.

```python starter
import numpy as np

def knn_regress(X_train, y_train, X_new, k):
    return np.zeros(len(X_new))

rng = np.random.default_rng(1)
X_train = rng.uniform(0, 6, (200, 1))
y_train = np.sin(X_train[:, 0]) + rng.normal(0, 0.3, 200)
X_test = rng.uniform(0, 6, (100, 1))
y_test = np.sin(X_test[:, 0]) + rng.normal(0, 0.3, 100)

errors = {}
best_k = None
print(errors, best_k)
```

```python solution
import numpy as np

def knn_regress(X_train, y_train, X_new, k):
    dist = np.sqrt(((X_new[:, None, :] - X_train[None, :, :]) ** 2).sum(axis=2))
    nearest = np.argsort(dist, axis=1)[:, :k]
    return y_train[nearest].mean(axis=1)

rng = np.random.default_rng(1)
X_train = rng.uniform(0, 6, (200, 1))
y_train = np.sin(X_train[:, 0]) + rng.normal(0, 0.3, 200)
X_test = rng.uniform(0, 6, (100, 1))
y_test = np.sin(X_test[:, 0]) + rng.normal(0, 0.3, 100)

errors = {}
for k in [1, 10, 100]:
    errors[k] = float(np.mean((knn_regress(X_train, y_train, X_test, k) - y_test) ** 2))
best_k = min(errors, key=errors.get)
print(errors, best_k)
```

```python test
import numpy as _np
from sklearn.neighbors import KNeighborsRegressor as _KNR
assert "knn_regress" in dir(), "Keep the function's name as knn_regress."
_rng = _np.random.default_rng(1)
_Xtr = _rng.uniform(0, 6, (200, 1))
_ytr = _np.sin(_Xtr[:, 0]) + _rng.normal(0, 0.3, 200)
_Xte = _rng.uniform(0, 6, (100, 1))
_yte = _np.sin(_Xte[:, 0]) + _rng.normal(0, 0.3, 100)
_r2 = _np.random.default_rng(9)
_A, _ya, _B = _r2.normal(size=(40, 3)), _r2.normal(size=40), _r2.normal(size=(6, 3))
assert _np.allclose(knn_regress(_A, _ya, _B, 4), _KNR(n_neighbors=4).fit(_A, _ya).predict(_B)), "knn_regress gives the wrong predictions on a 3-feature example: average the values of the k nearest training points."
_want = {k: float(_np.mean((_KNR(n_neighbors=k).fit(_Xtr, _ytr).predict(_Xte) - _yte) ** 2)) for k in [1, 10, 100]}
assert isinstance(errors, dict) and sorted(errors) == [1, 10, 100], "errors should be a dictionary with keys 1, 10 and 100."
for _k in [1, 10, 100]:
    assert _np.isclose(errors[_k], _want[_k]), f"The test MSE for k = {_k} should be {_want[_k]:.4f}, but errors[{_k}] is {errors[_k]}. Use the test points, not the training points."
assert best_k == min(_want, key=_want.get), f"best_k should be the k with the smallest test error, {min(_want, key=_want.get)}."
"SUCCESS: k = 1 copies the noise, k = 100 averages away the shape of the sine, and a middle k does best."
```

Hint: Find the nearest neighbours exactly as for classification, then replace the vote with `y_train[nearest].mean(axis=1)`. For `best_k`, `min(errors, key=errors.get)` finds the key with the smallest value.
:::

::: challenge Leave one out [medium]
kNN allows a neat trick for judging `k` without a separate validation set: predict each training example from **all the others**. This is **leave-one-out** validation. The catch is that each point is its own nearest neighbour at distance 0, so it must be excluded from its own vote.

Write `leave_one_out_accuracy(X, y, k)`: compute the distances between every pair of points in `X`, set each point's distance to itself to infinity (`np.inf`) so it is never chosen, take the `k` nearest of the rest, vote, and return the fraction of points predicted correctly. Then store, in `loo`, a dictionary mapping each `k` in `[1, 5, 15, 51]` to the leave-one-out accuracy on the starter's moons data.

```python starter
import numpy as np
from sklearn.datasets import make_moons

def leave_one_out_accuracy(X, y, k):
    return 1.0

X, y = make_moons(200, noise=0.3, random_state=3)
loo = {}
print(loo)
```

```python solution
import numpy as np
from sklearn.datasets import make_moons

def leave_one_out_accuracy(X, y, k):
    dist = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))
    np.fill_diagonal(dist, np.inf)
    nearest = np.argsort(dist, axis=1)[:, :k]
    predictions = np.array([np.bincount(row).argmax() for row in y[nearest]])
    return float((predictions == y).mean())

X, y = make_moons(200, noise=0.3, random_state=3)
loo = {}
for k in [1, 5, 15, 51]:
    loo[k] = leave_one_out_accuracy(X, y, k)
print(loo)
```

```python test
import numpy as _np
from sklearn.datasets import make_moons as _mm
from sklearn.model_selection import cross_val_score as _cvs, LeaveOneOut as _LOO
from sklearn.neighbors import KNeighborsClassifier as _KNC
assert "leave_one_out_accuracy" in dir(), "Keep the function's name as leave_one_out_accuracy."
_X, _y = _mm(200, noise=0.3, random_state=3)
_want = {k: float(_cvs(_KNC(n_neighbors=k), _X, _y, cv=_LOO()).mean()) for k in [1, 5, 15, 51]}
assert leave_one_out_accuracy(_X, _y, 1) < 1.0, "With k = 1 you got perfect accuracy: each point is still voting for itself. Set the diagonal of the distance matrix to np.inf."
for _k in [1, 5, 15, 51]:
    _got = leave_one_out_accuracy(_X, _y, _k)
    assert _np.isclose(_got, _want[_k]), f"Leave-one-out accuracy for k = {_k} should be {_want[_k]:.3f}, but got {_got:.3f}."
assert isinstance(loo, dict) and sorted(loo) == [1, 5, 15, 51], "loo should be a dictionary with keys 1, 5, 15 and 51."
assert all(_np.isclose(loo[_k], _want[_k]) for _k in loo), "Fill loo using your function on the starter's data."
"SUCCESS: Every point judged by its neighbours alone: n validation runs for the price of one distance matrix."
```

Hint: Build the full `(n, n)` distance matrix of `X` with itself. `np.fill_diagonal(dist, np.inf)` puts infinity at every `[i, i]`, so `argsort` puts each point last in its own list.
:::

## What you learned

- k-nearest neighbours stores the training data and predicts by a vote (or, for regression, an average) of the `k` closest training examples. Training is instant; prediction compares with every stored example.
- Broadcasting `X_new[:, None, :] - X_train[None, :, :]` gives every pairwise difference; `argsort` along each row finds the nearest; `np.bincount(...).argmax()` counts the vote.
- Small `k` overfits (k = 1 has perfect training accuracy and a jagged boundary); large `k` underfits. Choose `k` by cross-validation.
- Distances add up raw feature differences, so features with large units dominate. Standardise first (on the wine data: 0.72 → 1.00). Irrelevant features add noise to every distance.
- `make_pipeline(StandardScaler(), KNeighborsClassifier(k))` bundles scaling with the model, so cross-validation refits the scaler on each fold.
- In high dimensions, all points end up at nearly the same distance (the curse of dimensionality), so "nearest" loses its meaning without huge amounts of data.

kNN asks "what did similar examples have?". The next model asks a different question: "given these features, which class is most probable?", using Bayes' rule to turn word counts into a spam filter.
