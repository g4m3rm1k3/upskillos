# The perceptron

In 1958 the psychologist Frank Rosenblatt demonstrated a program, and soon afterwards built a machine, that learned to tell shapes apart, and newspapers reported that the navy had created the embryo of a computer that would "walk, talk, see, write, reproduce itself and be conscious of its existence". The machine was the **perceptron**, and although the headlines were absurd, the idea was real: a simple mathematical model of a brain cell that improves itself from its mistakes. It is the ancestor of every neural network in use today, and its learning rule is so simple that you can follow it on paper.

This lesson turns from regression, predicting numbers, to **classification**: sorting examples into categories. The perceptron handles the simplest case, two classes. You will see how it draws a straight line between them, how its learning rule nudges that line after every mistake, and why the rule works. Then you will build it from scratch and train it on real measurements of flowers.

## Classifying with a line

Suppose each example has two features and belongs to one of two classes, labelled `+1` and `−1` (this labelling makes the maths neat, as you will see). A **linear classifier** scores each example with a weighted sum, exactly like linear regression:

\[
s = w \cdot x + b
\]

and predicts the class from the **sign** of the score: `+1` if `s > 0`, and `−1` otherwise. The examples where the score is exactly zero, `w · x + b = 0`, form a straight line (a flat plane, with more features) that divides the space in two. That line is the **decision boundary**: everything on one side is predicted `+1`, everything on the other `−1`.

The vectors lesson explains the geometry. The score `w · x` measures how far `x` lies in the direction of `w`, so the weight vector `w` points **across** the boundary, at right angles to it, towards the `+1` side. The bias `b` slides the boundary back and forth without turning it.

```python type
import numpy as np
import matplotlib.pyplot as plt

w = np.array([1.0, 2.0])
b = -2.0

rng = np.random.default_rng(0)
points = rng.uniform(-3, 3, size=(150, 2))
scores = points @ w + b
predicted = np.where(scores > 0, 1, -1)

fig, ax = plt.subplots(figsize=(5, 5))
ax.scatter(*points[predicted == 1].T, s=12, label="predicted +1")
ax.scatter(*points[predicted == -1].T, s=12, label="predicted −1")
grid = np.linspace(-3, 3, 10)
ax.plot(grid, -(w[0] * grid + b) / w[1], "k-", label="boundary w·x + b = 0")
ax.annotate("", xy=(0.4 + w[0] * 0.6, 0.8 + w[1] * 0.6), xytext=(0.4, 0.8), arrowprops=dict(arrowstyle="->", lw=2))
ax.text(1.1, 2.1, "w")
ax.set_xlim(-3, 3)
ax.set_ylim(-3, 3)
ax.set_aspect("equal")
ax.legend(fontsize=8)
plt.show()
```

`points[predicted == 1].T` selects the rows predicted `+1` and transposes them into two rows, x-coordinates and y-coordinates, which `*` unpacks into the two arguments `scatter` wants. The boundary line comes from solving `w₁x₁ + w₂x₂ + b = 0` for `x₂`. The arrow shows `w`, perpendicular to the boundary, pointing into the `+1` region.

Learning a linear classifier means finding a `w` and `b` whose boundary separates the two classes.

## The perceptron learning rule

Rosenblatt's rule is disarmingly simple. Go through the training examples one at a time. For each example `(x, y)`:

- if the prediction is **right**, do nothing;
- if it is **wrong**, update:

\[
w \leftarrow w + y\,x \qquad b \leftarrow b + y
\]

That is the whole algorithm. Repeat passes (epochs) through the data until an entire pass makes no mistakes.

Why does it work? Take a mistake on an example whose true label is `y = +1`, so its score was too low (zero or negative). After the update, its new score is

\[
(w + x) \cdot x + (b + 1) = w \cdot x + b + (\|x\|^2 + 1)
\]

which is the old score plus a positive amount: the example has been pushed towards the correct side. For `y = −1` the update subtracts, lowering the score. Each mistake turns and shifts the boundary to do a little better on the example it got wrong. (It might make other examples worse, which is why several passes are needed.) Notice what the `±1` labels bought: one formula handles both kinds of mistake, because multiplying by `y` flips the direction of the update.

Here is a single update, before and after. Predict which way the boundary will turn:

```python type
import numpy as np
import matplotlib.pyplot as plt

w, b = np.array([1.0, -1.0]), 0.0
x, y = np.array([1.0, 2.0]), 1

print("score before:", x @ w + b, "→ predicted", 1 if x @ w + b > 0 else -1, "(true label +1)")
w_new, b_new = w + y * x, b + y
print("score after: ", x @ w_new + b_new)

grid = np.linspace(-3, 3, 10)
fig, ax = plt.subplots(figsize=(4.5, 4.5))
ax.plot(grid, -(w[0] * grid + b) / w[1], "--", color="gray", label="before")
ax.plot(grid, -(w_new[0] * grid + b_new) / w_new[1], "-", color="tab:blue", label="after")
ax.plot(*x, "o", color="tab:orange", markersize=10, label="misclassified +1 point")
ax.set_xlim(-3, 3)
ax.set_ylim(-3, 3)
ax.set_aspect("equal")
ax.legend(fontsize=8)
plt.show()
```

```output
score before: -1.0 → predicted -1 (true label +1)
score after:  5.0
```

The point was on the wrong side of the dashed boundary. One update turns the boundary so the point ends up on the correct side.

## Training from scratch

Now the full algorithm on a dataset with two separated groups, shuffled into a random order. Predict before running: how many passes will it need, and how will the number of mistakes change from pass to pass?

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(3)
positives = rng.normal([1.5, 1.5], 0.8, size=(40, 2))
negatives = rng.normal([-1, -1], 0.8, size=(40, 2))
X = np.vstack([positives, negatives])
y = np.array([1] * 40 + [-1] * 40)
order = rng.permutation(80)
X, y = X[order], y[order]

w, b = np.zeros(2), 0.0
for epoch in range(1, 21):
    mistakes = 0
    for xi, yi in zip(X, y):
        prediction = 1 if xi @ w + b > 0 else -1
        if prediction != yi:
            w += yi * xi
            b += yi
            mistakes += 1
    print(f"epoch {epoch}: mistakes {mistakes}")
    if mistakes == 0:
        break

fig, ax = plt.subplots(figsize=(5, 5))
ax.scatter(*X[y == 1].T, s=12, label="+1")
ax.scatter(*X[y == -1].T, s=12, label="−1")
grid = np.linspace(-4, 5, 10)
ax.plot(grid, -(w[0] * grid + b) / w[1], "k-", label="learned boundary")
ax.set_xlim(-4, 5)
ax.set_ylim(-4, 5)
ax.legend(fontsize=8)
plt.show()
```

```output
epoch 1: mistakes 7
epoch 2: mistakes 3
epoch 3: mistakes 1
epoch 4: mistakes 0
```

`np.vstack` stacks the two groups of rows into one array, and `rng.permutation` shuffles the examples, so the classes arrive mixed up, as in real data. The number of mistakes falls from pass to pass (7, then 3, then 1) until a pass makes none, and the loop stops: the boundary separates every training example correctly. The perceptron found it with nothing but additions and subtractions. Unlike gradient descent, there is no learning rate: starting from zero, scaling every update by the same number would scale `w` and `b` together, which changes nothing about where the boundary is.

## Many boundaries, one answer

Look closely at the learned boundary: it separates the groups, but it may pass quite close to some points. There are infinitely many lines that separate these two groups, and the perceptron stops at the **first** one it finds, whichever that happens to be. Shuffle the order of the examples and you usually get a different line. Nothing in the rule prefers a boundary with a comfortable gap on both sides, which would be more likely to classify new points correctly. Later methods fix this: logistic regression gives each point a probability, and support vector machines explicitly seek the widest gap.

## A real example: telling flowers apart

The **iris** dataset, collected in the 1930s and used in a famous 1936 paper by the statistician Ronald Fisher, records four measurements (sepal length and width, petal length and width, in centimetres) for 150 iris flowers of three species. It is one of the most used datasets in machine learning, and it comes with scikit-learn. Take two species, *setosa* and *versicolor*, and two features, the petal measurements. Predict: will those two measurements be enough to separate the species perfectly?

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_iris

iris = load_iris()
keep = iris.target < 2
X = iris.data[keep][:, 2:4]
y = np.where(iris.target[keep] == 0, 1, -1)
print(X.shape, "flowers;", iris.feature_names[2:4])

w, b = np.zeros(2), 0.0
for epoch in range(1, 51):
    mistakes = 0
    for xi, yi in zip(X, y):
        if (1 if xi @ w + b > 0 else -1) != yi:
            w, b = w + yi * xi, b + yi
            mistakes += 1
    if mistakes == 0:
        break
print(f"stopped after {epoch} epochs; weights {w}, bias {b}")
accuracy = (np.where(X @ w + b > 0, 1, -1) == y).mean()
print("training accuracy:", accuracy)

fig, ax = plt.subplots()
ax.scatter(*X[y == 1].T, label="setosa")
ax.scatter(*X[y == -1].T, label="versicolor")
grid = np.linspace(0.5, 5.5, 10)
ax.plot(grid, -(w[0] * grid + b) / w[1], "k-")
ax.set_xlabel("petal length (cm)")
ax.set_ylabel("petal width (cm)")
ax.set_ylim(-0.5, 2.5)
ax.legend()
plt.show()
```

```output
(100, 2) flowers; ['petal length (cm)', 'petal width (cm)']
stopped after 3 epochs; weights [-0.5 -0.8], bias 2.0
training accuracy: 1.0
```

Setosa flowers have much smaller petals, so the two species are cleanly separable, and the perceptron separates every flower within a few epochs. (Here it is judged only on its training data; the classes are so far apart that any separating line would do nearly as well on new flowers.)

scikit-learn has a perceptron too, following the usual `fit`, `predict`, `score` pattern:

```python type
from sklearn.datasets import load_iris
from sklearn.linear_model import Perceptron

iris = load_iris()
keep = iris.target < 2
model = Perceptron().fit(iris.data[keep], iris.target[keep])
print("accuracy with all four features:", model.score(iris.data[keep], iris.target[keep]))
```

```output
accuracy with all four features: 1.0
```

It accepts labels as 0 and 1 and handles the conversion itself.

::: challenge Predict with a line [easy]
Write a function `perceptron_predict(X, w, b)` that returns a NumPy array of predictions, `1` where the score `x · w + b` is greater than 0 and `−1` otherwise, for every row of `X` at once, without a loop.

```python starter
import numpy as np

def perceptron_predict(X, w, b):
    return np.ones(len(X))

print(perceptron_predict(np.array([[1.0, 2.0], [-1.0, -1.0], [2.0, -1.0]]), np.array([1.0, 1.0]), -0.5))
```

```python solution
import numpy as np

def perceptron_predict(X, w, b):
    return np.where(X @ w + b > 0, 1, -1)

print(perceptron_predict(np.array([[1.0, 2.0], [-1.0, -1.0], [2.0, -1.0]]), np.array([1.0, 1.0]), -0.5))
```

```python test
import numpy as _np
import ast as _ast
assert "perceptron_predict" in dir(), "Keep the function's name as perceptron_predict."
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp)) for _n in _ast.walk(_ast.parse(_source))), "Predict every row at once, without a loop."
_X = _np.array([[1.0, 2.0], [-1.0, -1.0], [2.0, -1.0], [0.25, 0.25]])
_got = _np.asarray(perceptron_predict(_X, _np.array([1.0, 1.0]), -0.5))
assert _got.tolist() == [1, -1, 1, -1], f"The predictions should be [1, -1, 1, -1] (a score of exactly 0 predicts −1), but got {_got.tolist()}."
"SUCCESS: One matrix product and a sign: a linear classifier's prediction."
```

Hint: `X @ w + b` gives every score at once; `np.where(condition, 1, -1)` turns them into labels.
:::

::: challenge One pass of learning [easy]
Write a function `perceptron_epoch(X, y, w, b)` that performs one pass of the perceptron rule over the examples **in order**, and returns `(w, b, mistakes)`: the updated weights, the updated bias, and the number of mistakes made during the pass. Use the lesson's rule: an example is a mistake if its prediction (1 when the score is greater than 0, otherwise −1) differs from its label. Do not change the `w` array passed in; work on a copy.

```python starter
import numpy as np

def perceptron_epoch(X, y, w, b):
    return w, b, 0
```

```python solution
import numpy as np

def perceptron_epoch(X, y, w, b):
    w = w.astype(float).copy()
    mistakes = 0
    for xi, yi in zip(X, y):
        prediction = 1 if xi @ w + b > 0 else -1
        if prediction != yi:
            w += yi * xi
            b += yi
            mistakes += 1
    return w, b, mistakes
```

```python test
import numpy as _np
assert "perceptron_epoch" in dir(), "Keep the function's name as perceptron_epoch."
_X = _np.array([[1.0, 2.0], [2.0, 0.5], [-1.0, -1.5], [-2.0, 1.0]])
_y = _np.array([1, 1, -1, -1])
_w0 = _np.zeros(2)
_w, _b, _m = perceptron_epoch(_X, _y, _w0, 0.0)
assert _np.allclose(_w0, 0), "perceptron_epoch changed the w array it was given. Work on a copy."
assert _m == 2, f"Starting from zeros, this pass makes 2 mistakes (the first and the last examples), but you counted {_m}."
assert _np.allclose(_w, [3.0, 1.0]) and _b == 0, f"After the pass, w should be [3, 1] and b 0, but got {_w} and {_b}."
_w2, _b2, _m2 = perceptron_epoch(_X, _y, _w, _b)
assert _m2 == 0, "A second pass from the updated weights makes no mistakes."
"SUCCESS: That is the entire learning rule of the first neural network."
```

Hint: Loop over `zip(X, y)`. For each example compute the prediction; if it is wrong, add `yi * xi` to `w` and `yi` to `b`, and count the mistake. `w.astype(float).copy()` gives a private copy to update.
:::

::: challenge Order matters [medium]
The lesson said the perceptron stops at the first separating line it finds, and that a different order of examples usually gives a different line. Check it.

Write a function `train_perceptron(X, y, max_epochs)` that starts from `w = 0`, `b = 0` and repeats passes over the data (in the given order) until a pass makes no mistakes, or `max_epochs` passes have run. Return `(w, b, history)`, where `history` is a list of the number of mistakes in each pass.

Then, on the iris *setosa* vs *versicolor* flowers with the two **petal** features (labels `+1` for setosa, `−1` for versicolor), train twice with `max_epochs = 100`: once in the original order, storing the weights in `w1` and bias in `b1`, and once in the order given by `np.random.default_rng(0).permutation(len(X))`, storing `w2` and `b2`. Finally set `same_line` to `True` if the two boundaries are the same line (their `(w, b)` are exact multiples of each other), and `False` otherwise. Do both boundaries separate the flowers?

```python starter
import numpy as np
from sklearn.datasets import load_iris

def train_perceptron(X, y, max_epochs):
    return np.zeros(X.shape[1]), 0.0, []

iris = load_iris()
keep = iris.target < 2
X = iris.data[keep][:, 2:4]
y = np.where(iris.target[keep] == 0, 1, -1)

w1, b1, w2, b2 = np.zeros(2), 0.0, np.zeros(2), 0.0
same_line = True
print(w1, b1, w2, b2, same_line)
```

```python solution
import numpy as np
from sklearn.datasets import load_iris

def train_perceptron(X, y, max_epochs):
    w, b = np.zeros(X.shape[1]), 0.0
    history = []
    for _ in range(max_epochs):
        mistakes = 0
        for xi, yi in zip(X, y):
            if (1 if xi @ w + b > 0 else -1) != yi:
                w = w + yi * xi
                b += yi
                mistakes += 1
        history.append(mistakes)
        if mistakes == 0:
            break
    return w, b, history

iris = load_iris()
keep = iris.target < 2
X = iris.data[keep][:, 2:4]
y = np.where(iris.target[keep] == 0, 1, -1)

w1, b1, _ = train_perceptron(X, y, 100)
order = np.random.default_rng(0).permutation(len(X))
w2, b2, _ = train_perceptron(X[order], y[order], 100)
v1, v2 = np.append(w1, b1), np.append(w2, b2)
same_line = bool(np.allclose(v1 / np.linalg.norm(v1), v2 / np.linalg.norm(v2)))
print(w1, b1, w2, b2, same_line)
```

```python test
import numpy as _np
from sklearn.datasets import load_iris as _li
assert "train_perceptron" in dir(), "Keep the function's name as train_perceptron."
def _ref(X, y, m):
    w, b, h = _np.zeros(X.shape[1]), 0.0, []
    for _ in range(m):
        k = 0
        for xi_, yi_ in zip(X, y):
            if (1 if xi_ @ w + b > 0 else -1) != yi_:
                w = w + yi_ * xi_
                b += yi_
                k += 1
        h.append(k)
        if k == 0:
            break
    return w, b, h
_Xs = _np.array([[1.0, 2.0], [2.0, 0.5], [-1.0, -1.5], [-2.0, 1.0]])
_ys = _np.array([1, 1, -1, -1])
_got = train_perceptron(_Xs, _ys, 10)
_want = _ref(_Xs, _ys, 10)
assert _np.allclose(_got[0], _want[0]) and _got[1] == _want[1] and list(_got[2]) == _want[2], f"For the small example, train_perceptron should return {_want}, but returned {_got}. history should include the final pass with no mistakes."
_Xx = _np.array([[0.0, 1.0], [1.0, 0.0], [0.0, 0.0], [1.0, 1.0]])
assert len(train_perceptron(_Xx, _np.array([1, 1, -1, -1]), 7)[2]) == 7, "When the data cannot be separated, it should stop after max_epochs."
_iris = _li()
_k = _iris.target < 2
_X = _iris.data[_k][:, 2:4]
_y = _np.where(_iris.target[_k] == 0, 1, -1)
_a = _ref(_X, _y, 100)
_o = _np.random.default_rng(0).permutation(len(_X))
_b = _ref(_X[_o], _y[_o], 100)
assert _np.allclose(w1, _a[0]) and _np.isclose(b1, _a[1]), "w1 and b1 should come from training in the original order."
assert _np.allclose(w2, _b[0]) and _np.isclose(b2, _b[1]), "w2 and b2 should come from training in the permuted order."
_v1, _v2 = _np.append(_a[0], _a[1]), _np.append(_b[0], _b[1])
assert bool(same_line) == bool(_np.allclose(_v1 / _np.linalg.norm(_v1), _v2 / _np.linalg.norm(_v2))), "same_line should say whether the two (w, b) vectors point the same way."
"SUCCESS: Two orders, two different boundaries, and both separate the flowers perfectly. The perceptron has no preference among separating lines."
```

Hint: Build the history by appending each pass's mistake count before checking whether it was zero. To compare the two boundaries, put each `(w, b)` into one vector with `np.append(w, b)` and scale both to length 1; if the results are equal, it is the same line.
:::

## What you learned

- Classification sorts examples into categories. A linear classifier scores `w · x + b` and predicts `+1` if the score is positive, `−1` otherwise.
- The decision boundary `w · x + b = 0` is a line (a hyperplane in more dimensions); `w` points across it towards the `+1` side, and `b` slides it.
- The perceptron rule: on a mistake, `w ← w + y x` and `b ← b + y`; do nothing on a correct prediction. Each update pushes the misclassified example towards the correct side. The `±1` labels make one formula cover both kinds of mistake.
- Repeat passes until a pass makes no mistakes. No learning rate is needed.
- The perceptron stops at the first separating line it finds, which may pass close to the data; later methods look for better boundaries.
- scikit-learn's `Perceptron` follows the usual `fit`, `predict`, `score` pattern.

The perceptron always found a line in this lesson. That is not luck: next you will see when it is guaranteed to succeed, when it is guaranteed to fail, and the famous failure that nearly ended research into neural networks.
