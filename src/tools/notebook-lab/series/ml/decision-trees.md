# Decision trees

Every model so far has combined all the features at once: a weighted sum, a distance, a product of probabilities. A **decision tree** works the way a person filling in a flowchart does: ask one question about one feature, go left or right depending on the answer, ask another question, and so on until reaching an answer. "Is proline above 755? Yes. Are flavanoids above 2.17? Yes. Then it's a wine from cultivar 0."

Trees are popular because they are easy to read: you can print one and follow its reasoning. They handle features on any scale without standardising, can handle categories once they are encoded as numbers (a later lesson shows how), and capture interactions ("this matters only when that is high") without being told. On their own they overfit easily and are unstable, but they are the building block of the two most successful methods for tabular data, **random forests** and **gradient boosting**, which come in the next two lessons. This lesson builds a tree from scratch: how to measure a good question, how to find the best one, and how to grow the tree.

## What a tree looks like

Here is a small tree for the wine data, trained by scikit-learn and printed as text:

```python type
from sklearn.datasets import load_wine
from sklearn.tree import DecisionTreeClassifier, export_text

wine = load_wine()
tree = DecisionTreeClassifier(max_depth=2, random_state=0).fit(wine.data, wine.target)
print(export_text(tree, feature_names=list(wine.feature_names)))
```

```output
|--- proline <= 755.00
|   |--- od280/od315_of_diluted_wines <= 2.11
|   |   |--- class: 2
|   |--- od280/od315_of_diluted_wines >  2.11
|   |   |--- class: 1
|--- proline >  755.00
|   |--- flavanoids <= 2.17
|   |   |--- class: 2
|   |--- flavanoids >  2.17
|   |   |--- class: 0
```

Each line with a `<=` or `>` is a question, called a **split**, and the indentation shows which answer leads where. The lines ending in `class: ...` are **leaves**, where a prediction is made. The first question, at the top, is the **root**. `max_depth=2` limits the tree to two questions on any path. To classify a wine, start at the root and follow the answers down to a leaf.

Two things to notice. Each question compares **one feature with one threshold**. And the questions on the right branch differ from those on the left: after learning that proline is high, the useful next question is about flavanoids; after learning it is low, it's about a different measurement (`od280/od315_of_diluted_wines`, a ratio of the light the wine absorbs at two wavelengths, used as a measure of its protein content). This is how trees capture interactions.

## Measuring a good question: Gini impurity

Training a tree means choosing the questions. A good question splits the examples into groups that are each as **pure** as possible: mostly one class. The usual measure of impurity is the **Gini impurity**. If a group's classes have proportions `p₁, p₂, …`:

\[
G = 1 - \sum_k p_k^2
\]

A pure group (all one class) has G = 0. A 50/50 mix of two classes has G = 1 − (0.25 + 0.25) = 0.5. An even mix of three classes has 1 − 3 × (1/9) ≈ 0.667. Gini impurity has a concrete meaning: it is the chance that two examples drawn at random from the group (with replacement) have different classes.

```python type
import numpy as np

def gini(y):
    p = np.bincount(y) / len(y)
    return 1 - np.sum(p ** 2)

print(gini(np.array([0, 0, 0, 0])))
print(gini(np.array([0, 0, 1, 1])))
print(gini(np.array([0, 1, 2])))
print(gini(np.array([0, 0, 0, 1])))
```

```output
0.0
0.5
0.6666666666666667
0.375
```

A split divides a group into a left part and a right part. Its quality is the **weighted average** of the two parts' impurities, weighted by how many examples each part gets:

\[
\text{split score} = \frac{n_{\text{left}}}{n} G_{\text{left}} + \frac{n_{\text{right}}}{n} G_{\text{right}}
\]

The weighting matters: a split that peels off one example into a perfectly pure group has achieved almost nothing for the other 99. The best split is the one with the lowest score.

(Another common impurity measure is **entropy**, −Σ p log₂ p, from information theory; scikit-learn offers both with `criterion="gini"` or `"entropy"`. They almost always choose the same splits.)

## Finding the best split

Which thresholds are worth trying? For one feature, only the places **between** neighbouring values matter: any threshold between 2.1 and 2.4 splits the examples identically. So sort the distinct values and try each midpoint. Do that for every feature and keep the best:

```python type
import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split

def gini(y):
    p = np.bincount(y) / len(y)
    return 1 - np.sum(p ** 2)

def best_split(X, y):
    best_feature, best_threshold, best_score = None, None, gini(y)
    for j in range(X.shape[1]):
        values = np.unique(X[:, j])
        for t in (values[:-1] + values[1:]) / 2:
            left = X[:, j] <= t
            score = (left.sum() * gini(y[left]) + (~left).sum() * gini(y[~left])) / len(y)
            if score < best_score:
                best_feature, best_threshold, best_score = j, t, score
    return best_feature, best_threshold, best_score

X, y = make_moons(300, noise=0.4, random_state=2)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=0)
print("impurity before splitting:", round(gini(y_train), 3))
feature, threshold, score = best_split(X_train, y_train)
print(f"best first question: is feature {feature} <= {threshold:.3f}?  impurity after: {score:.3f}")
```

```output
impurity before splitting: 0.5
best first question: is feature 1 <= 0.170?  impurity after: 0.320
```

`np.unique` returns the sorted distinct values, and `(values[:-1] + values[1:]) / 2` gives the midpoints between neighbours (each value plus the next, halved). The search starts with `best_score` set to the impurity of not splitting at all, so a split is only accepted if it actually improves things. If the group is already pure, nothing beats a score of 0 and `best_split` returns `None`.

For the noisy half-moons, the best single question is about feature 1 (the vertical position), and it lowers the impurity from 0.50 to 0.32: a real improvement, though each side is still far from pure.

## Growing the tree

Now apply the same idea to each part, and again to each of their parts, until the parts are pure or a depth limit is reached. A function that solves a problem by calling **itself** on smaller pieces of the same problem is called **recursive**, and a tree is the natural example: the left branch of a tree is itself a tree.

```python type
import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split

def gini(y):
    p = np.bincount(y) / len(y)
    return 1 - np.sum(p ** 2)

def best_split(X, y):
    best_feature, best_threshold, best_score = None, None, gini(y)
    for j in range(X.shape[1]):
        values = np.unique(X[:, j])
        for t in (values[:-1] + values[1:]) / 2:
            left = X[:, j] <= t
            score = (left.sum() * gini(y[left]) + (~left).sum() * gini(y[~left])) / len(y)
            if score < best_score:
                best_feature, best_threshold, best_score = j, t, score
    return best_feature, best_threshold

def build(X, y, depth=0, max_depth=None):
    feature, threshold = best_split(X, y)
    if feature is None or depth == max_depth:
        return {"leaf": int(np.bincount(y).argmax())}
    left = X[:, feature] <= threshold
    return {"feature": feature, "threshold": float(threshold),
            "left": build(X[left], y[left], depth + 1, max_depth),
            "right": build(X[~left], y[~left], depth + 1, max_depth)}

def predict(tree, X):
    predictions = []
    for x in X:
        node = tree
        while "leaf" not in node:
            node = node["left"] if x[node["feature"]] <= node["threshold"] else node["right"]
        predictions.append(node["leaf"])
    return np.array(predictions)

X, y = make_moons(300, noise=0.4, random_state=2)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=0)
small = build(X_train, y_train, max_depth=1)
print(small)
print("depth-1 test accuracy:", (predict(small, X_test) == y_test).mean().round(3))
```

```output
{'feature': 1, 'threshold': 0.17038331949653762, 'left': {'leaf': 1}, 'right': {'leaf': 0}}
depth-1 test accuracy: 0.753
```

The tree is stored as nested dictionaries. A leaf is `{"leaf": class}`; a split is a dictionary holding the feature, the threshold, and two more trees under `"left"` and `"right"`.

Follow `build` carefully, because recursion can feel like magic the first time. It finds the best split of the examples it was given. If there is no useful split, or the depth limit is reached, it **stops**: it returns a leaf predicting the majority class. Otherwise it divides the examples and, to make the two branches, calls `build` again on each part, with `depth + 1`. Those calls do the same thing on their smaller groups, and so on. Every call works on fewer examples or a greater depth, so the process always reaches leaves and stops. The rule "stop when there is nothing left to split" is called the **base case**, and every recursive function needs one, or it would call itself forever.

`predict` needs no recursion: for each example it starts at the root and walks down with a `while` loop, going left or right at each split, until it reaches a leaf.

The depth-1 tree printed above is a single question, a "decision stump", and it already scores about 75%.

To watch the recursion happen, here is the same `build` with one `print` added at the start of each call, indented by the call's depth, and allowed two levels. Before running it, predict: how many times will `build` be called, and how many leaves can a depth-2 tree have at most?

```python type
import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split

def gini(y):
    p = np.bincount(y) / len(y)
    return 1 - np.sum(p ** 2)

def best_split(X, y):
    best_feature, best_threshold, best_score = None, None, gini(y)
    for j in range(X.shape[1]):
        values = np.unique(X[:, j])
        for t in (values[:-1] + values[1:]) / 2:
            left = X[:, j] <= t
            score = (left.sum() * gini(y[left]) + (~left).sum() * gini(y[~left])) / len(y)
            if score < best_score:
                best_feature, best_threshold, best_score = j, t, score
    return best_feature, best_threshold

def build(X, y, depth=0, max_depth=None):
    indent = "    " * depth
    print(f"{indent}build at depth {depth}: {len(y)} examples, class counts {np.bincount(y, minlength=2)}")
    feature, threshold = best_split(X, y)
    if feature is None or depth == max_depth:
        print(f"{indent}  -> leaf predicting {np.bincount(y).argmax()}")
        return {"leaf": int(np.bincount(y).argmax())}
    print(f"{indent}  -> split on feature {feature} <= {threshold:.2f}")
    left = X[:, feature] <= threshold
    return {"feature": feature, "threshold": float(threshold),
            "left": build(X[left], y[left], depth + 1, max_depth),
            "right": build(X[~left], y[~left], depth + 1, max_depth)}

X, y = make_moons(300, noise=0.4, random_state=2)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=0)
tree = build(X_train, y_train, max_depth=2)
print(tree)
```

```output
build at depth 0: 150 examples, class counts [77 73]
  -> split on feature 1 <= 0.17
    build at depth 1: 69 examples, class counts [13 56]
      -> split on feature 0 <= -0.48
        build at depth 2: 9 examples, class counts [8 1]
          -> leaf predicting 0
        build at depth 2: 60 examples, class counts [ 5 55]
          -> leaf predicting 1
    build at depth 1: 81 examples, class counts [64 17]
      -> split on feature 0 <= 1.63
        build at depth 2: 76 examples, class counts [64 12]
          -> leaf predicting 0
        build at depth 2: 5 examples, class counts [0 5]
          -> leaf predicting 1
{'feature': 1, 'threshold': 0.17038331949653762, 'left': {'feature': 0, 'threshold': -0.4832984626212422, 'left': {'leaf': 0}, 'right': {'leaf': 1}}, 'right': {'feature': 0, 'threshold': 1.6330133085908283, 'left': {'leaf': 0}, 'right': {'leaf': 1}}}
```

Read the trace from the top. The first call, at depth 0, gets all 150 examples and splits them. Before it can return, it has to build its left branch, so the second call (indented once) runs to completion, including **its** two calls at depth 2, which are leaves because the depth limit is reached. Only then does the right branch start. Seven calls in all: one root, two at depth 1, four leaves at depth 2. Each call's dictionary is assembled from the dictionaries its two inner calls returned, which is why the printed tree is nested exactly like the trace.

## Depth and overfitting

Without a depth limit, `build` usually keeps splitting until every leaf is pure, which means every training example is classified correctly, however noisy. (Usually, because it only accepts a split that improves the impurity right now. On XOR-shaped data, from the perceptron limits lesson, no single split helps on its own, so this greedy search stops at the root, even though two splits together would be perfect. Practical tree libraries share this greedy limitation.) Watch training and test accuracy as the limit grows:

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split

def gini(y):
    p = np.bincount(y) / len(y)
    return 1 - np.sum(p ** 2)

def best_split(X, y):
    best_feature, best_threshold, best_score = None, None, gini(y)
    for j in range(X.shape[1]):
        values = np.unique(X[:, j])
        for t in (values[:-1] + values[1:]) / 2:
            left = X[:, j] <= t
            score = (left.sum() * gini(y[left]) + (~left).sum() * gini(y[~left])) / len(y)
            if score < best_score:
                best_feature, best_threshold, best_score = j, t, score
    return best_feature, best_threshold

def build(X, y, depth=0, max_depth=None):
    feature, threshold = best_split(X, y)
    if feature is None or depth == max_depth:
        return {"leaf": int(np.bincount(y).argmax())}
    left = X[:, feature] <= threshold
    return {"feature": feature, "threshold": float(threshold),
            "left": build(X[left], y[left], depth + 1, max_depth),
            "right": build(X[~left], y[~left], depth + 1, max_depth)}

def predict(tree, X):
    predictions = []
    for x in X:
        node = tree
        while "leaf" not in node:
            node = node["left"] if x[node["feature"]] <= node["threshold"] else node["right"]
        predictions.append(node["leaf"])
    return np.array(predictions)

X, y = make_moons(300, noise=0.4, random_state=2)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=0)

g1, g2 = np.meshgrid(np.linspace(-2.5, 3.5, 150), np.linspace(-2, 2.5, 120))
grid = np.column_stack([g1.ravel(), g2.ravel()])
fig, axes = plt.subplots(1, 3, figsize=(10, 3.2))
for max_depth in [1, 2, 3, 6, None]:
    tree = build(X_train, y_train, max_depth=max_depth)
    train_acc = (predict(tree, X_train) == y_train).mean()
    test_acc = (predict(tree, X_test) == y_test).mean()
    print(f"max_depth {str(max_depth):>4}: train {train_acc:.3f}, test {test_acc:.3f}")
    if max_depth in (1, 3, None):
        ax = axes[[1, 3, None].index(max_depth)]
        regions = predict(tree, grid).reshape(g1.shape)
        ax.contourf(g1, g2, regions, levels=[-0.5, 0.5, 1.5], colors=["tab:blue", "tab:red"], alpha=0.25)
        ax.scatter(*X_train.T, c=y_train, cmap="coolwarm", s=8)
        ax.set_title(f"max_depth = {max_depth}", fontsize=9)
plt.show()
```

```output
max_depth    1: train 0.800, test 0.753
max_depth    2: train 0.880, test 0.840
max_depth    3: train 0.887, test 0.840
max_depth    6: train 0.913, test 0.813
max_depth None: train 1.000, test 0.767
```

The pattern is the overfitting lesson once more. A single question underfits (test 0.75). Depth 2 or 3 does best on unseen data (0.84). With no limit, the tree grows until it gets every training point right (train 1.000) and the test accuracy falls back to about 0.77: the right-hand plot is full of thin slivers built around single noisy points.

Notice the shape of the regions: every boundary is made of horizontal and vertical lines, because every question compares one feature with a threshold. A tree draws boundaries like a staircase.

Trees have several ways to limit their growth, all available in scikit-learn's `DecisionTreeClassifier`: `max_depth`; `min_samples_leaf`, the smallest number of examples allowed in a leaf (so no leaf can be built around one noisy point); and `min_samples_split`. As always, choose them by cross-validation.

## Reading what a tree learned

A fitted tree records how much each feature reduced impurity, summed over all the splits that used it and scaled to add up to 1. These are its **feature importances**:

```python type
import numpy as np
from sklearn.datasets import load_wine
from sklearn.model_selection import cross_val_score
from sklearn.tree import DecisionTreeClassifier

wine = load_wine()
for depth in [1, 2, 3, 4, None]:
    scores = cross_val_score(DecisionTreeClassifier(max_depth=depth, random_state=0), wine.data, wine.target, cv=5)
    print(f"max_depth {str(depth):>4}: mean accuracy {scores.mean():.3f}")

tree = DecisionTreeClassifier(max_depth=3, random_state=0).fit(wine.data, wine.target)
order = np.argsort(tree.feature_importances_)[::-1]
for i in order[:4]:
    print(f"{wine.feature_names[i]:<30} {tree.feature_importances_[i]:.2f}")
```

```output
max_depth    1: mean accuracy 0.646
max_depth    2: mean accuracy 0.821
max_depth    3: mean accuracy 0.893
max_depth    4: mean accuracy 0.916
max_depth None: mean accuracy 0.888
proline                        0.41
od280/od315_of_diluted_wines   0.33
flavanoids                     0.13
hue                            0.06
```

On the wine data a depth-4 tree scores about 92% in cross-validation, below Gaussian Naive Bayes (97%) and scaled kNN (95–97%) from earlier lessons. The importances show it relies mostly on proline and the light-absorption measurement. (`[::-1]` reverses the `argsort` order, so the most important features come first.) Importances are a useful summary, but they share the weakness you have seen before: when two features carry the same information, the tree may use one and give the other no credit at all.

## Weaknesses: staircases and instability

Because every split is horizontal or vertical, a tree struggles with boundaries that run diagonally:

```python type
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

rng = np.random.default_rng(0)
X = rng.uniform(-3, 3, (400, 2))
y = (X[:, 0] + X[:, 1] > 0).astype(int)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=0)

tree = DecisionTreeClassifier(random_state=0).fit(X_train, y_train)
print(f"tree: test accuracy {tree.score(X_test, y_test):.2f} using {tree.get_n_leaves()} leaves")
print(f"logistic regression: test accuracy {LogisticRegression().fit(X_train, y_train).score(X_test, y_test):.2f}")
```

```output
tree: test accuracy 0.93 using 18 leaves
logistic regression: test accuracy 0.99
```

The true boundary is the diagonal line x₁ + x₂ = 0, which logistic regression learns almost perfectly (0.99). The tree needs 18 leaves to build a staircase approximating it, and still gets only 0.93.

The second weakness is **instability**. The best split depends on exactly which examples are present, and the choice at the root changes everything below it. Train trees on four random samples of 160 of the 178 wines and look at their first question:

```python type
import numpy as np
from sklearn.datasets import load_wine
from sklearn.tree import DecisionTreeClassifier

wine = load_wine()
for seed in range(4):
    rows = np.random.default_rng(seed).choice(len(wine.data), 160, replace=False)
    tree = DecisionTreeClassifier(max_depth=2, random_state=0).fit(wine.data[rows], wine.target[rows])
    root_feature = wine.feature_names[tree.tree_.feature[0]]
    print(f"sample {seed}: first question is about {root_feature}, threshold {tree.tree_.threshold[0]:.2f}")
```

```output
sample 0: first question is about proline, threshold 755.00
sample 1: first question is about color_intensity, threshold 3.46
sample 2: first question is about color_intensity, threshold 3.82
sample 3: first question is about color_intensity, threshold 3.46
```

(`tree.tree_.feature[0]` and `tree.tree_.threshold[0]` are the root's feature and threshold, in scikit-learn's internal storage.) Leaving out 18 different wines changes the very first question from proline to colour intensity, and with it the whole tree. A model that changes this much with small changes in the data has **high variance**. That sounds like bad news, but it is exactly the property that the next lesson exploits: average many different trees, and the variance cancels out.

## Trees for regression

Trees predict numbers just as easily. A regression tree's leaves predict the **average** of their training values, and splits are chosen to minimise the squared error around the leaf averages instead of the Gini impurity. The prediction is a step function, one flat step per leaf. scikit-learn's version is `DecisionTreeRegressor`. Gradient boosting, two lessons from now, is built from these small regression trees.

::: challenge Weighing a split [easy]
Write `gini(y)`, the Gini impurity of an array of class labels (whole numbers from 0 up), and `split_score(y_left, y_right)`, the weighted average of the two parts' impurities, weighted by how many labels each part has.

```python starter
import numpy as np

def gini(y):
    return 0.0

def split_score(y_left, y_right):
    return 0.0

print(gini(np.array([0, 0, 1, 1])), split_score(np.array([0, 0, 0]), np.array([1, 1, 0])))
```

```python solution
import numpy as np

def gini(y):
    p = np.bincount(y) / len(y)
    return float(1 - np.sum(p ** 2))

def split_score(y_left, y_right):
    n = len(y_left) + len(y_right)
    return len(y_left) / n * gini(y_left) + len(y_right) / n * gini(y_right)

print(gini(np.array([0, 0, 1, 1])), split_score(np.array([0, 0, 0]), np.array([1, 1, 0])))
```

```python test
import numpy as _np
assert "gini" in dir() and "split_score" in dir(), "Keep both function names."
assert _np.isclose(gini(_np.array([2, 2, 2])), 0.0), "A pure group has Gini impurity 0."
assert _np.isclose(gini(_np.array([0, 0, 1, 1])), 0.5), "A 50/50 mix of two classes has Gini impurity 0.5."
assert _np.isclose(gini(_np.array([0, 1, 2])), 2 / 3), "An even mix of three classes has Gini impurity 2/3."
assert _np.isclose(gini(_np.array([0, 0, 0, 1])), 0.375), "Proportions 0.75 and 0.25 give 1 − (0.5625 + 0.0625) = 0.375."
assert _np.isclose(split_score(_np.array([0, 0, 0]), _np.array([1, 1, 0])), 0.5 * 0 + 0.5 * (4 / 9)), "split_score([0, 0, 0], [1, 1, 0]) should be 0.5 × 0 + 0.5 × 0.444 ≈ 0.222."
_lop = split_score(_np.array([1]), _np.array([0] * 50 + [1] * 49))
assert _np.isclose(_lop, 99 / 100 * gini(_np.array([0] * 50 + [1] * 49))), "Weight each part by its share of the examples: a tiny pure part should barely lower the score."
"SUCCESS: Peeling off one pure example barely changes the score, because each part counts in proportion to its size."
```

Hint: `np.bincount(y) / len(y)` gives the class proportions. For `split_score`, each part's weight is its length divided by the total length.
:::

::: challenge A regression stump [medium]
Regression trees choose splits by **squared error** instead of Gini impurity. For a group of values, the error is the sum of squared differences from the group's mean, and the mean is what the leaf predicts. A split's score is the left part's error plus the right part's error.

Write `fit_stump(X, y)`, a depth-1 regression tree, for a 2-D feature array `X` and numeric targets `y`. Search every feature and every midpoint between neighbouring distinct values (with `x <= threshold` going left), and return a dictionary with the best split: `{"feature": j, "threshold": t, "left": mean of y on the left, "right": mean of y on the right}`. Then write `predict_stump(stump, X)`, which returns the left or right value for each row.

Use it on the starter's data, in which only one of the two features matters, and store the fitted stump in `stump`. (Stumps like this are the building blocks of gradient boosting, two lessons from now.)

```python starter
import numpy as np

def fit_stump(X, y):
    return {"feature": 0, "threshold": 0.0, "left": 0.0, "right": 0.0}

def predict_stump(stump, X):
    return np.zeros(len(X))

rng = np.random.default_rng(4)
X = rng.uniform(0, 10, (60, 2))
y = np.where(X[:, 1] > 6.3, 5.0, 1.0) + rng.normal(0, 0.5, 60)

stump = None
print(stump)
```

```python solution
import numpy as np

def fit_stump(X, y):
    best, best_score = None, np.inf
    for j in range(X.shape[1]):
        values = np.unique(X[:, j])
        for t in (values[:-1] + values[1:]) / 2:
            left = X[:, j] <= t
            score = np.sum((y[left] - y[left].mean()) ** 2) + np.sum((y[~left] - y[~left].mean()) ** 2)
            if score < best_score:
                best_score = score
                best = {"feature": j, "threshold": float(t), "left": float(y[left].mean()), "right": float(y[~left].mean())}
    return best

def predict_stump(stump, X):
    return np.where(X[:, stump["feature"]] <= stump["threshold"], stump["left"], stump["right"])

rng = np.random.default_rng(4)
X = rng.uniform(0, 10, (60, 2))
y = np.where(X[:, 1] > 6.3, 5.0, 1.0) + rng.normal(0, 0.5, 60)

stump = fit_stump(X, y)
print(stump)
```

```python test
import numpy as _np
from sklearn.tree import DecisionTreeRegressor as _DTR
assert "fit_stump" in dir() and "predict_stump" in dir(), "Keep both function names."
_X = _np.array([[1.0, 0.0], [2.0, 9.0], [3.0, 1.0], [4.0, 8.0]])
_y = _np.array([1.0, 1.2, 3.0, 3.4])
_st = fit_stump(_X, _y)
assert _st["feature"] == 0 and _np.isclose(_st["threshold"], 2.5), f"For this small example the best split is feature 0 at 2.5 (separating the low values from the high), but you returned feature {_st['feature']} at {_st['threshold']}."
assert _np.isclose(_st["left"], 1.1) and _np.isclose(_st["right"], 3.2), "The leaf values should be the means of y on each side: 1.1 and 3.2."
assert _np.allclose(predict_stump(_st, _np.array([[0.0, 5.0], [2.5, 5.0], [9.0, 5.0]])), [1.1, 1.1, 3.2]), "predict_stump should give the left value when the feature is <= the threshold, and the right value otherwise."
_r = _np.random.default_rng(12)
for _ in range(3):
    _XX = _r.uniform(0, 5, (40, 3))
    _yy = _np.sin(_XX[:, 2]) + 0.3 * _XX[:, 0] + _r.normal(0, 0.3, 40)
    _sk = _DTR(max_depth=1).fit(_XX, _yy).tree_
    _got = fit_stump(_XX, _yy)
    assert _got["feature"] == _sk.feature[0] and _np.isclose(_got["threshold"], _sk.threshold[0]), f"On a random 3-feature example the best split is feature {_sk.feature[0]} at {_sk.threshold[0]:.4f}, as scikit-learn's stump finds, but you returned feature {_got['feature']} at {_got['threshold']:.4f}. Score each split by the squared errors around each part's own mean, and search every feature."
    assert _np.isclose(_got["left"], _sk.value[1].ravel()[0]) and _np.isclose(_got["right"], _sk.value[2].ravel()[0]), "The leaf values should be the mean of y on each side."
assert stump is not None and stump["feature"] == 1, "On the starter's data, the stump should split on feature 1, the one that matters."
"SUCCESS: The stump ignores the useless feature, splits near the true step at 6.3, and predicts the average on each side."
```

Hint: Loop over the features and their midpoints as in the lesson's `best_split`, scoring each split with `np.sum((part - part.mean()) ** 2)` on each side, and remember the best as a dictionary. `np.where(condition, left_value, right_value)` predicts for all rows at once.
:::

::: challenge Explain a prediction [medium]
A tree can say **why** it made a prediction: the list of questions answered on the way to the leaf. Write `explain(tree, x, names)` for a tree stored as the lesson's nested dictionaries. It should return a tuple `(steps, prediction)`, where `steps` is a list of strings, one per question on the path, in the form `"petal width <= 0.80"` if the example went left or `"petal width > 0.80"` if it went right (the feature's name from `names`, and the threshold with two decimal places), and `prediction` is the leaf's class.

```python starter
tree = {"feature": 1, "threshold": 0.8,
        "left": {"leaf": 0},
        "right": {"feature": 0, "threshold": 4.95,
                  "left": {"leaf": 1},
                  "right": {"leaf": 2}}}
names = ["petal length", "petal width"]

def explain(tree, x, names):
    return [], None

print(explain(tree, [5.1, 1.8], names))
```

```python solution
tree = {"feature": 1, "threshold": 0.8,
        "left": {"leaf": 0},
        "right": {"feature": 0, "threshold": 4.95,
                  "left": {"leaf": 1},
                  "right": {"leaf": 2}}}
names = ["petal length", "petal width"]

def explain(tree, x, names):
    steps = []
    node = tree
    while "leaf" not in node:
        name = names[node["feature"]]
        if x[node["feature"]] <= node["threshold"]:
            steps.append(f"{name} <= {node['threshold']:.2f}")
            node = node["left"]
        else:
            steps.append(f"{name} > {node['threshold']:.2f}")
            node = node["right"]
    return steps, node["leaf"]

print(explain(tree, [5.1, 1.8], names))
```

```python test
assert "explain" in dir(), "Keep the function's name as explain."
_tree = {"feature": 1, "threshold": 0.8, "left": {"leaf": 0},
         "right": {"feature": 0, "threshold": 4.95, "left": {"leaf": 1}, "right": {"leaf": 2}}}
_names = ["petal length", "petal width"]
_s, _p = explain(_tree, [5.1, 1.8], _names)
assert list(_s) == ["petal width > 0.80", "petal length > 4.95"] and _p == 2, f"For [5.1, 1.8] the path is ['petal width > 0.80', 'petal length > 4.95'] ending at class 2, but got {(_s, _p)}."
_s, _p = explain(_tree, [1.4, 0.2], _names)
assert list(_s) == ["petal width <= 0.80"] and _p == 0, f"For [1.4, 0.2] the path is one question, ['petal width <= 0.80'], ending at class 0, but got {(_s, _p)}."
_s, _p = explain(_tree, [4.95, 0.8], _names)
assert list(_s) == ["petal width <= 0.80"] and _p == 0, "A value exactly equal to the threshold goes left (<=)."
_deep = {"feature": 0, "threshold": 1.0, "left": {"feature": 0, "threshold": 0.5, "left": {"leaf": 7}, "right": {"feature": 1, "threshold": 2.25, "left": {"leaf": 8}, "right": {"leaf": 9}}}, "right": {"leaf": 3}}
_s, _p = explain(_deep, [0.7, 3.0], ["a", "b"])
assert list(_s) == ["a <= 1.00", "a > 0.50", "b > 2.25"] and _p == 9, f"On a deeper tree the path should be ['a <= 1.00', 'a > 0.50', 'b > 2.25'] ending at 9, but got {(_s, _p)}."
_s, _p = explain({"leaf": 4}, [0.0], ["a"])
assert list(_s) == [] and _p == 4, "A tree that is just a leaf asks no questions."
"SUCCESS: Every prediction comes with its reasons, the thing that makes trees easy to trust and to check."
```

Hint: Walk down the tree with a `while` loop, as `predict` does. At each split, compare, append the matching string (an f-string with `:.2f` formats the threshold), and move to the left or right branch. When you reach a leaf, return the steps and `node["leaf"]`.
:::

## What you learned

- A decision tree asks one question at a time, each comparing one feature with a threshold, and predicts at a leaf. `export_text` prints a fitted tree.
- Gini impurity, 1 − Σ pₖ², measures how mixed a group is (0 when pure). A split is scored by the size-weighted average impurity of its two parts; the best split has the lowest score. Entropy is an alternative.
- For each feature, only the midpoints between neighbouring distinct values need to be tried.
- Trees are grown recursively: split, then build a tree on each part, stopping at a base case (a pure group or the depth limit). Predicting walks from the root to a leaf.
- Unlimited trees fit the training data perfectly and overfit; limit them with `max_depth`, `min_samples_leaf` or `min_samples_split`, chosen by cross-validation.
- Trees need no feature scaling and capture interactions, but their boundaries are staircases of horizontal and vertical lines, and they are unstable: small changes in the data can change the whole tree.
- Feature importances total each feature's impurity reduction. Regression trees predict leaf averages and split by squared error.

A single tree is unstable. The next lesson turns that weakness into a strength: grow hundreds of different trees on random variations of the data, and let them vote.
