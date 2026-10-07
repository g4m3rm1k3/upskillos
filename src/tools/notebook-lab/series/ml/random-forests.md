# Bagging and random forests

The last lesson ended on a weakness: a decision tree is **unstable**. Leave out a few training examples and the root question can change, and with it the whole tree. Its predictions have high **variance**: they depend heavily on the particular sample it happened to be trained on.

This lesson turns that weakness into one of the most reliable methods in machine learning. The idea is the one behind every opinion poll: a single person's view is noisy, but the average of many is steady. Train many trees, each on a slightly different version of the data, and let them vote. The individual trees still overfit, but their errors point in different directions and largely cancel. This is **bagging**, and with one extra trick it becomes the **random forest**: a model that is accurate out of the box, never made worse by adding more trees, needs almost no tuning, and even comes with a free estimate of its own test accuracy.

## Why averaging reduces variance

From the expectation and variance lesson: if you average `n` **independent** random quantities, each with variance σ², the average has variance σ²/n. Averaging 100 independent noisy predictions would cut the variance a hundredfold.

But trees trained on the same data are not independent: they tend to make similar mistakes. If each pair of predictions has correlation ρ (from 0, unrelated, to 1, identical), the variance of the average of `n` of them is

\[
\rho \sigma^2 + \frac{1 - \rho}{n} \sigma^2
\]

As `n` grows, the second part shrinks towards zero, but the first part, ρσ², stays no matter how many trees you add. Two lessons follow, and they are the whole design of a random forest. First, more trees help but with diminishing returns, and never hurt. Second, the way to keep improving is to make the trees **less correlated**, even at some cost to each tree individually.

## Bootstrap samples

To get different trees from one dataset, train each on a **bootstrap sample**, the resampling you used in the estimation lesson to measure uncertainty: draw `n` examples from the `n` training examples **with replacement**, so some examples appear several times and others not at all. There it produced many versions of a statistic; here it produces many versions of the training set.

```python type
import numpy as np

rng = np.random.default_rng(0)
n = 10
rows = rng.integers(0, n, n)
print("bootstrap sample of rows:", np.sort(rows))
print("left out:", sorted(set(range(n)) - set(rows)))

fractions = [len(np.unique(rng.integers(0, 1000, 1000))) / 1000 for _ in range(200)]
print("average fraction of distinct examples in a sample of 1000:", round(np.mean(fractions), 3))
```

```output
bootstrap sample of rows: [0 0 0 1 2 3 5 6 8 8]
left out: [4, 7, 9]
average fraction of distinct examples in a sample of 1000: 0.633
```

`rng.integers(0, n, n)` draws `n` row numbers, each from 0 to n − 1, independently, so repeats are allowed. On average a bootstrap sample contains about **63%** of the distinct examples. The reason: each draw misses a given example with probability 1 − 1/n, so all `n` draws miss it with probability (1 − 1/n)ⁿ, which for large `n` is about 1/e ≈ 0.368. Each sample therefore leaves out about 37% of the examples, which will turn out to be useful.

## Bagging from scratch

**Bagging** (short for **b**ootstrap **agg**regat**ing**) trains one model per bootstrap sample and combines their predictions by voting (classification) or averaging (regression). Here it is with scikit-learn's `DecisionTreeClassifier` as the tree, grown with no depth limit, on the noisy half-moons from the last lesson. Predict first: will the vote of 200 trees beat the average single tree? Will it beat the best one?

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

X, y = make_moons(300, noise=0.4, random_state=2)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=0)

g1, g2 = np.meshgrid(np.linspace(-2.5, 3.5, 150), np.linspace(-2, 2.5, 120))
grid = np.column_stack([g1.ravel(), g2.ravel()])

rng = np.random.default_rng(1)
test_votes = np.zeros(len(X_test))
grid_votes = np.zeros(len(grid))
single_scores = []
for b in range(1, 201):
    rows = rng.integers(0, len(X_train), len(X_train))
    tree = DecisionTreeClassifier(random_state=b).fit(X_train[rows], y_train[rows])
    prediction = tree.predict(X_test)
    single_scores.append((prediction == y_test).mean())
    test_votes += prediction
    grid_votes += tree.predict(grid)
    if b in (1, 10, 50, 200):
        accuracy = ((test_votes / b > 0.5) == y_test).mean()
        print(f"{b:>3} trees: test accuracy of the vote {accuracy:.3f}")
print(f"single trees on their own: average {np.mean(single_scores):.3f}, range {min(single_scores):.2f} to {max(single_scores):.2f}")

single = DecisionTreeClassifier(random_state=0).fit(X_train, y_train)
fig, axes = plt.subplots(1, 2, figsize=(9, 3.4))
for ax, regions, title in [(axes[0], single.predict(grid), "one tree"), (axes[1], grid_votes / 200 > 0.5, "vote of 200 bagged trees")]:
    ax.contourf(g1, g2, regions.reshape(g1.shape), levels=[-0.5, 0.5, 1.5], colors=["tab:blue", "tab:red"], alpha=0.25)
    ax.scatter(*X_train.T, c=y_train, cmap="coolwarm", s=8)
    ax.set_title(title, fontsize=9)
plt.show()
```

```output
  1 trees: test accuracy of the vote 0.787
 10 trees: test accuracy of the vote 0.827
 50 trees: test accuracy of the vote 0.813
200 trees: test accuracy of the vote 0.807
single trees on their own: average 0.766, range 0.69 to 0.84
```

With two classes labelled 0 and 1, adding up the predictions counts the votes for class 1, and `votes / b > 0.5` is the majority. The individual trees average 0.77 on the test set, ranging from 0.69 to 0.84 depending on their bootstrap sample. Their vote reaches about 0.81 to 0.83: well above the typical tree. The luckiest tree did a little better still, but there is no way to know in advance which tree that will be; picking it by its test score would be using the test set to choose the model. The vote gets most of the way there reliably, without anyone choosing which tree to trust. The boundary of the vote is smoother than a single tree's: the slivers built around individual noisy points differ from tree to tree, so they are outvoted.

Notice that the accuracy wobbles a little between 10 and 200 trees (0.83, then 0.81). That is a difference of 3 test points out of 150, well within the test set's own noise from the estimation lesson. What the formula explains is why it stops climbing: adding trees reduces the randomness of the vote, but cannot remove the trees' shared mistakes, the ρσ² term.

## Random forests: decorrelating the trees

Bagged trees are still quite similar. If one feature is very informative, almost every tree will ask about it at the root, so their mistakes are correlated. A **random forest** adds one change: at **each split**, the tree may only choose among a **random subset** of the features, typically √d of the `d` features for classification. Each tree is forced to find other routes to the answer, which makes it individually a little worse but much less like its neighbours.

On the 64-pixel digits, compare bagging (every split may use all 64 features, `max_features=None`) with a random forest (`max_features="sqrt"`, 8 features per split):

```python type
import numpy as np
from sklearn.datasets import load_digits
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

digits = load_digits()
X_train, X_test, y_train, y_test = train_test_split(digits.data, digits.target, test_size=0.3, random_state=0)
print(f"one tree: {DecisionTreeClassifier(random_state=0).fit(X_train, y_train).score(X_test, y_test):.3f}")

for max_features in [None, "sqrt"]:
    forest = RandomForestClassifier(n_estimators=100, max_features=max_features, random_state=0).fit(X_train, y_train)
    tree_predictions = np.array([forest.classes_[tree.predict(X_test).astype(int)] for tree in forest.estimators_[:50]])
    tree_accuracy = (tree_predictions == y_test).mean()
    agreement = np.mean([(tree_predictions[i] == tree_predictions[j]).mean() for i in range(10) for j in range(i + 1, 10)])
    print(f"max_features={str(max_features):<5}: average tree {tree_accuracy:.3f}, trees agree {agreement:.3f}, forest {forest.score(X_test, y_test):.3f}")
```

```output
one tree: 0.857
max_features=None : average tree 0.806, trees agree 0.728, forest 0.956
max_features=sqrt : average tree 0.748, trees agree 0.615, forest 0.978
```

`forest.estimators_` is the list of fitted trees inside the forest. (Each tree reports class positions rather than the labels themselves, hence `forest.classes_[...]`.) The numbers tell the whole story:

- With all features available, the average tree scores about 0.81, any two trees agree on 73% of the test digits, and the vote scores 0.956.
- With 8 random features per split, each tree is **worse**, 0.75, but the trees agree on only about 62% of the digits, and the vote is **better**, 0.978.

Weaker but more varied voters make a better committee. That is the ρ in the formula at work. A single tree scores 0.857 here, so the forest cuts the error rate by a factor of about six.

## A free test score: out-of-bag error

Each tree's bootstrap sample leaves out about 37% of the training examples. For each training example, about 37 of every 100 trees never saw it (some 74 of the 200 trees used below). Let only those trees vote on it, and you get an honest prediction for every training example, without a separate validation set. The resulting accuracy is the **out-of-bag** (OOB) score:

```python type
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
forest = RandomForestClassifier(n_estimators=200, oob_score=True, random_state=0).fit(X_train, y_train)
print(f"out-of-bag accuracy: {forest.oob_score_:.3f}")
print(f"test accuracy:       {forest.score(X_test, y_test):.3f}")

for n_trees in [1, 5, 20, 100, 300]:
    model = RandomForestClassifier(n_estimators=n_trees, random_state=0).fit(X_train, y_train)
    print(f"{n_trees:>3} trees: test accuracy {model.score(X_test, y_test):.3f}")
```

```output
out-of-bag accuracy: 0.957
test accuracy:       0.959
  1 trees: test accuracy 0.918
  5 trees: test accuracy 0.953
 20 trees: test accuracy 0.959
100 trees: test accuracy 0.959
300 trees: test accuracy 0.959
```

The OOB estimate, 0.957, is close to the true test accuracy, 0.959, and it came free with training. The second part shows the effect of the number of trees: accuracy climbs quickly (0.918 with 1 tree, 0.953 with 5) and then levels off by about 20 trees. More trees never cause overfitting; they just cost time. The usual advice is to use as many as you can afford and stop when the OOB score stops improving.

## Using random forests

Random forests are among the best "first serious model" choices for tabular data:

- They need no feature scaling (each split looks at one feature at a time).
- They work well with default settings. The main ones are `n_estimators` (more is better, up to a point), `max_features` (the size of the random subset), and the tree limits from the last lesson, such as `min_samples_leaf`, though the trees are usually grown deep, because averaging handles their variance.
- They give feature importances, averaged over all the trees, more stable than a single tree's. The same caution applies: correlated features split the credit between them, and the impurity-based importances favour features with many distinct values. A more reliable method, permutation importance, appears in the lesson on interpreting models.

What they give up is the single tree's readability: no one can follow 200 trees. And because each tree predicts with leaf averages, a forest can never predict a value outside the range it saw in training, which matters for regression on data that keeps growing, such as prices over time.

::: challenge Left out of the bag [easy]
Write a function `out_of_bag_fraction(n, trials, seed)` that estimates, by simulation, the average fraction of `n` examples left out of a bootstrap sample. For each of `trials` trials, draw a bootstrap sample of `n` row numbers with `rng.integers(0, n, n)` (using one generator, `rng = np.random.default_rng(seed)`, created once), and compute the fraction of the `n` rows that do **not** appear. Return the average over the trials.

Then store, in `fractions`, a dictionary mapping each `n` in `[2, 10, 1000]` to `out_of_bag_fraction(n, 2000, 0)`, and in `formula`, a dictionary mapping the same `n` values to the exact answer, (1 − 1/n)ⁿ.

```python starter
import numpy as np

def out_of_bag_fraction(n, trials, seed):
    return 0.0

fractions = {}
formula = {}
print(fractions, formula)
```

```python solution
import numpy as np

def out_of_bag_fraction(n, trials, seed):
    rng = np.random.default_rng(seed)
    left_out = []
    for _ in range(trials):
        rows = rng.integers(0, n, n)
        left_out.append(1 - len(np.unique(rows)) / n)
    return float(np.mean(left_out))

fractions = {n: out_of_bag_fraction(n, 2000, 0) for n in [2, 10, 1000]}
formula = {n: (1 - 1 / n) ** n for n in [2, 10, 1000]}
print(fractions, formula)
```

```python test
import numpy as _np
assert "out_of_bag_fraction" in dir(), "Keep the function's name as out_of_bag_fraction."
def _oob(n, trials, seed):
    r = _np.random.default_rng(seed)
    return float(_np.mean([1 - len(_np.unique(r.integers(0, n, n))) / n for _ in range(trials)]))
assert _np.isclose(out_of_bag_fraction(10, 300, 5), _oob(10, 300, 5)), "out_of_bag_fraction(10, 300, 5) gave a different answer from the expected simulation. Create the generator once with the seed, draw rng.integers(0, n, n) in each trial, and average the fraction of rows that never appear."
assert sorted(fractions) == [2, 10, 1000] and sorted(formula) == [2, 10, 1000], "Both dictionaries should have the keys 2, 10 and 1000."
assert _np.isclose(formula[2], 0.25) and _np.isclose(formula[1000], (1 - 1 / 1000) ** 1000), "formula[n] should be (1 − 1/n) ** n: 0.25 for n = 2."
for _n in [2, 10, 1000]:
    assert _np.isclose(fractions[_n], _oob(_n, 2000, 0)), f"fractions[{_n}] should be out_of_bag_fraction({_n}, 2000, 0)."
    assert abs(fractions[_n] - formula[_n]) < 0.02, f"For n = {_n}, the simulation ({fractions[_n]:.3f}) should be close to the formula ({formula[_n]:.3f})."
"SUCCESS: With 2 examples a quarter are left out; with 1000, about 36.8%, which is 1/e. Every tree in a forest sits out about a third of the data."
```

Hint: `len(np.unique(rows))` counts the distinct rows drawn, so `1 - len(np.unique(rows)) / n` is the fraction left out. A dictionary comprehension builds each dictionary in one line.
:::

::: challenge A committee for three classes [medium]
The lesson's bagging counted votes by adding up 0/1 predictions, which only works for two classes. Write bagging for any number of classes:

- `bag_trees(X, y, n_trees, seed)` creates `rng = np.random.default_rng(seed)` once, then for each tree draws a bootstrap sample with `rng.integers(0, len(X), len(X))` and fits `DecisionTreeClassifier(random_state=0)` on it. It returns the list of fitted trees.
- `vote(trees, X)` returns, for each row of `X`, the class predicted by the most trees (if classes tie, the smaller class number). Classes are whole numbers from 0 up.

Then, on the starter's wine split, store the test accuracy of a single `DecisionTreeClassifier(random_state=0)` in `one_tree`, and of the vote of `bag_trees(X_train, y_train, 50, 0)` in `committee`.

```python starter
import numpy as np
from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

def bag_trees(X, y, n_trees, seed):
    return []

def vote(trees, X):
    return np.zeros(len(X), dtype=int)

wine = load_wine()
X_train, X_test, y_train, y_test = train_test_split(wine.data, wine.target, test_size=0.4, random_state=3)
one_tree = 0.0
committee = 0.0
print(one_tree, committee)
```

```python solution
import numpy as np
from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

def bag_trees(X, y, n_trees, seed):
    rng = np.random.default_rng(seed)
    trees = []
    for _ in range(n_trees):
        rows = rng.integers(0, len(X), len(X))
        trees.append(DecisionTreeClassifier(random_state=0).fit(X[rows], y[rows]))
    return trees

def vote(trees, X):
    predictions = np.array([tree.predict(X) for tree in trees]).astype(int)
    return np.array([np.bincount(column).argmax() for column in predictions.T])

wine = load_wine()
X_train, X_test, y_train, y_test = train_test_split(wine.data, wine.target, test_size=0.4, random_state=3)
one_tree = DecisionTreeClassifier(random_state=0).fit(X_train, y_train).score(X_test, y_test)
committee = (vote(bag_trees(X_train, y_train, 50, 0), X_test) == y_test).mean()
print(one_tree, committee)
```

```python test
import numpy as _np
from sklearn.datasets import load_wine as _lw
from sklearn.model_selection import train_test_split as _tts
from sklearn.tree import DecisionTreeClassifier as _DTC
assert "bag_trees" in dir() and "vote" in dir(), "Keep both function names."
class _Fixed:
    def __init__(self, out):
        self.out = _np.array(out)
    def predict(self, X):
        return self.out
_fake = [_Fixed([0, 2, 1]), _Fixed([2, 2, 1]), _Fixed([2, 1, 0]), _Fixed([1, 1, 0])]
assert list(vote(_fake, _np.zeros((3, 1)))) == [2, 1, 0], f"With four trees voting [0,2,1], [2,2,1], [2,1,0] and [1,1,0], the winners are [2, 1, 0] (ties go to the smaller class), but got {list(vote(_fake, _np.zeros((3, 1))))}. Count the votes for each example, that is, down each column."
_w = _lw()
_Xtr, _Xte, _ytr, _yte = _tts(_w.data, _w.target, test_size=0.4, random_state=3)
_trees = bag_trees(_Xtr, _ytr, 5, 1)
assert len(_trees) == 5, "bag_trees should return a list with one fitted tree per n_trees."
_r = _np.random.default_rng(1)
for _t in _trees:
    _rows = _r.integers(0, len(_Xtr), len(_Xtr))
    _ref = _DTC(random_state=0).fit(_Xtr[_rows], _ytr[_rows])
    assert (_t.predict(_Xte) == _ref.predict(_Xte)).all(), "Your trees differ from the expected ones. Create the generator once with the seed, and draw a new bootstrap sample of rows for each tree."
_one = _DTC(random_state=0).fit(_Xtr, _ytr).score(_Xte, _yte)
_r = _np.random.default_rng(0)
_ps = []
for _ in range(50):
    _rows = _r.integers(0, len(_Xtr), len(_Xtr))
    _ps.append(_DTC(random_state=0).fit(_Xtr[_rows], _ytr[_rows]).predict(_Xte))
_ps = _np.array(_ps).astype(int)
_com = (_np.array([_np.bincount(c, minlength=3).argmax() for c in _ps.T]) == _yte).mean()
assert _np.isclose(one_tree, _one), f"one_tree should be {_one:.3f}."
assert _np.isclose(committee, _com), f"committee should be {_com:.3f}, but it is {committee}."
f"SUCCESS: One tree scores {_one:.2f}; the committee of 50 scores {_com:.2f}."
```

Hint: Stack the predictions into an array with one row per tree and one column per example. Each **column** holds the votes for one example: `np.bincount(column).argmax()` picks the winner, and `predictions.T` lets you loop over columns.
:::

::: challenge Out-of-bag from scratch [medium]
Compute the out-of-bag accuracy yourself. Write `oob_accuracy(X, y, n_trees, seed)` which builds trees exactly as `bag_trees` did in the previous challenge (one generator, a bootstrap sample of rows per tree, `DecisionTreeClassifier(random_state=0)`) and **also remembers which rows each tree saw**. Then, for each training example, collect the predictions only of the trees whose sample did **not** contain it, take the majority (ties to the smaller class), and compare with its label. Skip examples that every tree saw. Return the fraction of the remaining examples predicted correctly.

Use it on the breast cancer training split from the starter with 50 trees and seed 0, storing the result in `oob`, and store the test accuracy of the vote of the same 50 trees in `test`.

```python starter
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

def oob_accuracy(X, y, n_trees, seed):
    return 1.0

X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
oob = oob_accuracy(X_train, y_train, 50, 0)
test = 0.0
print(oob, test)
```

```python solution
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

def grow(X, y, n_trees, seed):
    rng = np.random.default_rng(seed)
    trees, samples = [], []
    for _ in range(n_trees):
        rows = rng.integers(0, len(X), len(X))
        trees.append(DecisionTreeClassifier(random_state=0).fit(X[rows], y[rows]))
        samples.append(set(rows.tolist()))
    return trees, samples

def oob_accuracy(X, y, n_trees, seed):
    trees, samples = grow(X, y, n_trees, seed)
    correct, counted = 0, 0
    for i in range(len(X)):
        votes = [int(tree.predict(X[i:i + 1])[0]) for tree, seen in zip(trees, samples) if i not in seen]
        if votes:
            counted += 1
            correct += np.bincount(votes).argmax() == y[i]
    return correct / counted

X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
oob = oob_accuracy(X_train, y_train, 50, 0)
trees, _ = grow(X_train, y_train, 50, 0)
predictions = np.array([tree.predict(X_test) for tree in trees]).astype(int)
test = (np.array([np.bincount(c).argmax() for c in predictions.T]) == y_test).mean()
print(oob, test)
```

```python test
import numpy as _np
from sklearn.datasets import load_breast_cancer as _lb
from sklearn.model_selection import train_test_split as _tts
from sklearn.tree import DecisionTreeClassifier as _DTC
assert "oob_accuracy" in dir(), "Keep the function's name as oob_accuracy."
def _ref(X, y, n_trees, seed):
    r = _np.random.default_rng(seed)
    P, seen = [], []
    for _ in range(n_trees):
        rows = r.integers(0, len(X), len(X))
        P.append(_DTC(random_state=0).fit(X[rows], y[rows]).predict(X).astype(int))
        m = _np.zeros(len(X), bool); m[rows] = True; seen.append(m)
    P, seen = _np.array(P), _np.array(seen)
    ok, cnt = 0, 0
    for i in range(len(X)):
        v = P[~seen[:, i], i]
        if len(v):
            cnt += 1; ok += _np.bincount(v).argmax() == y[i]
    return ok / cnt, P
_X, _y = _lb(return_X_y=True)
_Xtr, _Xte, _ytr, _yte = _tts(_X, _y, test_size=0.3, random_state=0)
_small = _ref(_Xtr[:120], _ytr[:120], 7, 4)[0]
assert _np.isclose(oob_accuracy(_Xtr[:120], _ytr[:120], 7, 4), _small), f"On a small example (120 rows, 7 trees, seed 4) the out-of-bag accuracy should be {_small:.4f}. Only trees that did not see an example may vote on it."
assert oob_accuracy(_Xtr[:120], _ytr[:120], 7, 4) < 1.0, "An accuracy of 1.0 means trees are voting on examples they were trained on."
_want, _ = _ref(_Xtr, _ytr, 50, 0)
assert _np.isclose(oob, _want), f"oob should be {_want:.4f}, but it is {oob}."
_r = _np.random.default_rng(0)
_tp = []
for _ in range(50):
    _rows = _r.integers(0, len(_Xtr), len(_Xtr))
    _tp.append(_DTC(random_state=0).fit(_Xtr[_rows], _ytr[_rows]).predict(_Xte).astype(int))
_tw = (_np.array([_np.bincount(c, minlength=2).argmax() for c in _np.array(_tp).T]) == _yte).mean()
assert _np.isclose(test, _tw), f"test should be the vote's test accuracy, {_tw:.4f}, but it is {test}."
f"SUCCESS: The out-of-bag estimate ({_want:.3f}) lands close to the real test accuracy ({_tw:.3f}), without setting aside any data."
```

Hint: Keep each tree's rows as a `set`, so `i not in seen` is a fast check. For example `i`, `X[i:i + 1]` is a one-row 2-D array, which is what `predict` expects. Count only the examples that received at least one vote.
:::

## What you learned

- Averaging `n` predictions with variance σ² and pairwise correlation ρ gives variance ρσ² + (1 − ρ)σ²/n: more models help, but correlation sets a floor.
- A bootstrap sample draws `n` examples with replacement; it contains about 63% of the distinct examples and leaves out about 37% (1/e).
- Bagging trains one model per bootstrap sample and votes or averages. Deep, high-variance trees benefit most; the vote is smoother and more accurate than a typical tree.
- A random forest also limits each split to a random subset of features (`max_features`, typically √d). Each tree gets worse, but the trees become less correlated, so the forest gets better (digits: 0.956 → 0.978).
- The out-of-bag score lets each example be judged only by trees that never saw it: a free estimate of test accuracy.
- More trees never overfit; accuracy levels off. Forests need no scaling and little tuning, but are hard to read and cannot extrapolate beyond the training range.

Bagging builds its trees independently and averages away their variance. Boosting builds trees one after another, each correcting the mistakes of those before it, and attacks bias instead. That is the next lesson.
