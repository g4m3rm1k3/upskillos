# Softmax regression

Logistic regression answers yes-or-no questions: malignant or benign, spam or not. Many real questions have more than two answers. Which digit, 0 to 9, is in this image? Which of three species is this flower? Is this news article about sport, politics, business or science? This lesson extends logistic regression to any number of classes. The result is called **softmax regression** (also **multinomial logistic regression**), and it matters well beyond this lesson: the last layer of almost every neural network that classifies things is exactly this model.

The plan mirrors the logistic regression lesson. Give each class a score, turn the scores into probabilities (with the **softmax** function instead of the sigmoid), measure the loss with **cross-entropy**, find its gradient, and train by gradient descent. Then you will train it from scratch to read handwritten digits.

## One score per class

With two classes, logistic regression computed one score, `w · x + b`, and the sigmoid turned it into the probability of class 1. With `k` classes, give **each class its own weights**, and so its own score. For an example `x`, class `j` gets the score

\[
z_j = \mathbf{w}_j \cdot \mathbf{x} + b_j
\]

A higher score means "this looks more like class `j`". Stack the weight vectors as the columns of a matrix `W`, with the biases as an extra first row, and add a column of ones to the data as before. Then one matrix product scores every example against every class: if `A` has one row per example, `A @ W` has one row per example and one column per class.

## The softmax function

Scores can be any numbers, negative or positive. To turn a row of scores into probabilities, which must be positive and add up to 1, **softmax** exponentiates each score and divides by the total:

\[
p_j = \frac{e^{z_j}}{\sum_{i=1}^{k} e^{z_i}}
\]

Exponentiating makes everything positive, and dividing by the sum makes the results add to 1. Because the exponential grows so fast, the class with the highest score gets the largest share, and big score differences become very confident probabilities. The name comes from this: it is a "soft" version of picking the maximum.

```python type
import numpy as np

scores = np.array([2.0, 1.0, 0.1])
exps = np.exp(scores)
probs = exps / exps.sum()
print("probabilities:", probs.round(3), "sum:", probs.sum())

shifted = scores + 100
print("shifted by 100:", (np.exp(shifted) / np.exp(shifted).sum()).round(3))
```

```output
probabilities: [0.659 0.242 0.099] sum: 1.0
shifted by 100: [0.659 0.242 0.099]
```

A score of 2 against 1 and 0.1 gives about 66%, 24% and 10%. The second line shows an important property: **adding the same number to every score does not change the probabilities**, because the common factor `e^100` cancels between top and bottom. Only the differences between scores matter.

That property solves a practical problem. `np.exp(1000)` is too large for a float and becomes `inf`, and `inf / inf` is `nan`, so softmax on large scores would break. Since shifting doesn't matter, first **subtract the largest score** from every score. Then the largest becomes 0, every exponential is at most 1, and nothing overflows. Every real softmax implementation does this.

For a whole matrix of scores, one row per example, apply it row by row with `axis=1`:

```python type
import numpy as np

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

Z = np.array([[2.0, 1.0, 0.1],
              [1000.0, 1000.0, 990.0],
              [-5.0, 0.0, 5.0]])
P = softmax(Z)
print(P.round(4))
print("row sums:", P.sum(axis=1))
```

```output
[[0.659  0.2424 0.0986]
 [0.5    0.5    0.    ]
 [0.     0.0067 0.9933]]
row sums: [1. 1. 1.]
```

`keepdims=True` keeps the maxima and sums as a column (shape `(3, 1)` instead of `(3,)`), so broadcasting subtracts and divides each row by its own value. The second row, with scores near 1000, works fine.

With two classes, softmax is the old sigmoid in disguise. For scores `z0` and `z1`, dividing top and bottom by `e^(z1)` gives the probability of class 1 as 1/(1 + e^(−(z1 − z0))), which is the sigmoid of the score difference. So softmax regression with two classes **is** logistic regression.

## One-hot labels and the cross-entropy loss

The labels are now class numbers, 0 to `k − 1`. For the loss it is convenient to write each label as a **one-hot** vector: `k` entries, all 0 except a 1 at the true class. With three classes, label 2 becomes `[0, 0, 1]`. The identity matrix has these vectors as its rows, so `np.eye(k)[y]` converts a whole array of labels at once:

```python type
import numpy as np

y = np.array([2, 0, 1, 2])
Y = np.eye(3)[y]
print(Y)

P = np.array([[0.1, 0.2, 0.7],
              [0.8, 0.1, 0.1],
              [0.3, 0.4, 0.3],
              [0.5, 0.4, 0.1]])
p_correct = P[np.arange(len(y)), y]
print("probability given to the true class:", p_correct)
print("cross-entropy:", round(-np.mean(np.log(p_correct)), 4))
```

```output
[[0. 0. 1.]
 [1. 0. 0.]
 [0. 1. 0.]
 [0. 0. 1.]]
probability given to the true class: [0.7 0.8 0.4 0.1]
cross-entropy: 0.9497
```

The loss is the same idea as log loss: **minus the log of the probability the model gave to the correct class**, averaged over examples. This is the **cross-entropy** loss. `P[np.arange(len(y)), y]` is fancy indexing: from row 0 it takes column `y[0]`, from row 1 column `y[1]`, and so on, which picks out exactly the probability given to each true class. The last example is the costly one: its true class is 2, and the model gave that only 0.1, so it adds −ln 0.1 ≈ 2.3, while the first example, with 0.7 on the right answer, adds only 0.36. With two classes, this loss is exactly the log loss from the logistic regression lesson.

## The gradient, and training

The gradient of the cross-entropy with respect to the weight matrix has the same shape as logistic regression's:

\[
\nabla_W L = \frac{1}{n} A^{\mathsf{T}} (P - Y)
\]

`P − Y` is the matrix of errors: predicted probabilities minus one-hot labels. For each example it is positive for the wrong classes (too much probability) and negative for the true class (too little). Multiplying by `Aᵀ` turns those errors into weight changes, just as before. The derivation takes a page of calculus; instead of trusting it, check it numerically, as you did in the gradients lesson, by nudging each weight a little and watching the loss:

```python type
import numpy as np

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def loss(A, y, W):
    P = softmax(A @ W)
    return -np.mean(np.log(P[np.arange(len(y)), y]))

rng = np.random.default_rng(0)
A = np.column_stack([np.ones(20), rng.normal(size=(20, 2))])
y = rng.integers(0, 3, 20)
W = rng.normal(size=(3, 3))

formula = A.T @ (softmax(A @ W) - np.eye(3)[y]) / len(y)
numeric = np.zeros_like(W)
h = 1e-6
for i in range(3):
    for j in range(3):
        W_up, W_down = W.copy(), W.copy()
        W_up[i, j] += h
        W_down[i, j] -= h
        numeric[i, j] = (loss(A, y, W_up) - loss(A, y, W_down)) / (2 * h)
print("largest difference:", np.abs(formula - numeric).max())
```

```output
largest difference: 2.5530220298941586e-10
```

The formula and the nudging agree to about ten decimal places. Like logistic regression's, this loss is convex, so any minimum gradient descent settles into is the best one, with the same caveat: on separable data the weights grow without limit unless a penalty stops them. One more quirk follows from the shifting property: adding the same vector to every column of `W` adds the same amount to every class's score, which changes no probability. So the best weights are never unique; a ridge penalty (as scikit-learn applies by default) picks one. Now train on three groups of points in the plane:

```python type
import numpy as np
import matplotlib.pyplot as plt

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

rng = np.random.default_rng(2)
centres = np.array([[0, 3], [-3, -2], [3, -2]])
X = np.vstack([rng.normal(c, 1.2, size=(50, 2)) for c in centres])
y = np.repeat([0, 1, 2], 50)
A = np.column_stack([np.ones(len(X)), X])
Y = np.eye(3)[y]

W = np.zeros((3, 3))
for step in range(1000):
    P = softmax(A @ W)
    W -= 0.5 * A.T @ (P - Y) / len(y)
print("training accuracy:", (softmax(A @ W).argmax(axis=1) == y).mean())

g1, g2 = np.meshgrid(np.linspace(-7, 7, 200), np.linspace(-6, 7, 200))
grid = np.column_stack([np.ones(g1.size), g1.ravel(), g2.ravel()])
regions = softmax(grid @ W).argmax(axis=1).reshape(g1.shape)
fig, ax = plt.subplots(figsize=(5, 4.5))
ax.contourf(g1, g2, regions, levels=[-0.5, 0.5, 1.5, 2.5], colors=["tab:red", "tab:blue", "tab:green"], alpha=0.25)
for k, colour in enumerate(["tab:red", "tab:blue", "tab:green"]):
    ax.scatter(*X[y == k].T, s=12, color=colour, label=f"class {k}")
ax.legend(fontsize=8)
plt.show()
```

```output
training accuracy: 0.9733333333333334
```

The prediction is the class with the highest probability, `argmax(axis=1)`. Since softmax preserves order, that is simply the class with the highest score. The plot colours every point of the plane by its predicted class. The boundaries between regions are straight lines: between classes `i` and `j`, the boundary is where their scores are equal, `w_i · x + b_i = w_j · x + b_j`, a linear equation. Softmax regression is still a **linear** classifier; it just carves the space into `k` regions instead of two.

## Reading handwritten digits

scikit-learn's `load_digits` has 1,797 handwritten digits, each an 8×8 image of grey levels from 0 to 16, flattened into 64 numbers. Here are a few:

```python type
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits

digits = load_digits()
print(digits.data.shape)
fig, axes = plt.subplots(1, 8, figsize=(8, 1.4))
for ax, image, label in zip(axes, digits.images, digits.target):
    ax.imshow(image, cmap="gray_r")
    ax.set_title(label)
    ax.axis("off")
plt.show()
```

```output
(1797, 64)
```

`digits.images` holds the 8×8 grids and `digits.data` the same pixels as rows of 64, and `imshow` draws a grid as an image. Each pixel is a feature, so the model has 64 inputs (65 with the bias) and 10 classes: a 65 × 10 weight matrix. Train it from scratch, dividing the pixels by 16 so they run from 0 to 1. Before running it, guess: a model that only weighs up pixels, with no idea what a digit is, what fraction of unseen digits will it read correctly?

```python type
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

digits = load_digits()
X_train, X_test, y_train, y_test = train_test_split(digits.data / 16, digits.target, test_size=0.3, random_state=0)
A_train = np.column_stack([np.ones(len(X_train)), X_train])
A_test = np.column_stack([np.ones(len(X_test)), X_test])
Y_train = np.eye(10)[y_train]

W = np.zeros((65, 10))
for step in range(500):
    P = softmax(A_train @ W)
    W -= 1.0 * A_train.T @ (P - Y_train) / len(y_train)
    if step + 1 in (1, 10, 100, 500):
        loss = -np.mean(np.log(P[np.arange(len(y_train)), y_train]))
        print(f"step {step + 1:>3}: training loss {loss:.3f}")

pred = softmax(A_test @ W).argmax(axis=1)
print("test accuracy:", round((pred == y_test).mean(), 3))

confusion = np.zeros((10, 10), dtype=int)
np.add.at(confusion, (y_test, pred), 1)
print(confusion)
```

```output
step   1: training loss 2.303
step  10: training loss 1.150
step 100: training loss 0.266
step 500: training loss 0.116
test accuracy: 0.959
[[45  0  0  0  0  0  0  0  0  0]
 [ 0 48  0  0  0  1  1  0  1  1]
 [ 0  2 50  0  0  0  0  1  0  0]
 [ 0  0  0 51  0  0  0  0  2  1]
 [ 0  0  0  0 47  0  0  1  0  0]
 [ 0  0  0  0  0 54  1  0  0  2]
 [ 0  1  0  0  0  0 59  0  0  0]
 [ 0  0  0  0  0  0  0 53  0  0]
 [ 0  3  1  0  0  1  0  0 56  0]
 [ 0  0  0  0  0  2  0  0  0 55]]
```

The first loss is 2.303, which is ln 10: with all weights zero, every digit gets probability 1/10. By step 500 the loss is about 0.12, and the model reads about **96%** of the unseen test digits correctly: a model with no idea what a "digit" is, just a weighted vote over pixels.

The confusion matrix works as in the last lesson, now 10 × 10: row = true digit, column = predicted digit, so correct answers lie on the diagonal. `np.add.at(confusion, (y_test, pred), 1)` adds 1 at position (true, predicted) for every test example (a plain `confusion[y_test, pred] += 1` would count repeated positions only once). The off-diagonal entries show which mistakes happen. The largest is 3 eights read as ones; several other pairs have 2. With counts this small the ranking could easily be chance, so look for patterns across several splits before reading much into a single confusion matrix.

For comparison, scikit-learn's `LogisticRegression` fits softmax regression automatically whenever there are more than two classes. On this split, `LogisticRegression(max_iter=1000).fit(X_train, y_train).score(X_test, y_test)` gives about 96% too.

## What the model looks at

Each class's weights are 64 numbers, one per pixel, so they can be drawn as an 8×8 image. Red pixels push the score for that digit up when they are inked; blue pixels push it down:

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

digits = load_digits()
A = np.column_stack([np.ones(len(digits.data)), digits.data / 16])
Y = np.eye(10)[digits.target]
W = np.zeros((65, 10))
for step in range(500):
    W -= 1.0 * A.T @ (softmax(A @ W) - Y) / len(Y)

fig, axes = plt.subplots(2, 5, figsize=(7, 3))
for digit, ax in enumerate(axes.ravel()):
    weights = W[1:, digit].reshape(8, 8)
    limit = np.abs(weights).max()
    ax.imshow(weights, cmap="RdBu_r", vmin=-limit, vmax=limit)
    ax.set_title(digit)
    ax.axis("off")
plt.show()
```

`W[1:, digit]` skips the bias row. Several templates look faintly like their digit: the 0's weights form a red ring with a blue centre, since ink in the middle is evidence **against** a zero. This is both the strength and the limit of a linear model: each class is one fixed template of good and bad pixels. A 7 written a little to the left, or a 4 with an open top, matches its template less well, and there is no way to express "a loop **or** a line". Beating 96% by a wide margin needs models that combine features non-linearly, which is where neural networks come in later in the series.

::: challenge Stable softmax [easy]
Write a function `softmax(Z)` that takes a 2-D array of scores (one row per example) and returns the matrix of probabilities, applying softmax to each row. It must work even for huge scores: subtract each row's largest score first.

```python starter
import numpy as np

def softmax(Z):
    E = np.exp(Z)
    return E / E.sum()

print(softmax(np.array([[1.0, 2.0, 3.0], [0.0, 0.0, 0.0]])).round(3))
```

```python solution
import numpy as np

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

print(softmax(np.array([[1.0, 2.0, 3.0], [0.0, 0.0, 0.0]])).round(3))
```

```python test
import numpy as _np
assert "softmax" in dir(), "Keep the function's name as softmax."
_Z = _np.array([[1.0, 2.0, 3.0], [0.0, 0.0, 0.0], [-1.0, 5.0, 2.0]])
_E = _np.exp(_Z)
_want = _E / _E.sum(axis=1, keepdims=True)
_got = softmax(_Z)
assert _np.shape(_got) == _Z.shape, f"The result should have the same shape as Z, {_Z.shape}, but has shape {_np.shape(_got)}."
assert _np.allclose(_got, _want), "Each row should be exp(row) divided by the sum of exp(row). Did you sum over each row separately, with axis=1 and keepdims=True?"
with _np.errstate(over="ignore", invalid="ignore"):
    _big = softmax(_np.array([[1000.0, 1001.0, 999.0]]))
assert not _np.isnan(_big).any(), "Scores near 1000 gave nan: subtract each row's maximum before exponentiating."
assert _np.allclose(_big, softmax(_np.array([[1.0, 2.0, 0.0]]))), "Shifting every score in a row by the same amount should not change the probabilities."
with _np.errstate(over="ignore", invalid="ignore", under="ignore"):
    _mixed = softmax(_np.array([[1000.0, 1001.0], [-1000.0, -999.0]]))
assert not _np.isnan(_mixed).any() and _np.allclose(_mixed, [[0.26894142, 0.73105858], [0.26894142, 0.73105858]]), "Rows on very different scales went wrong: subtract each row's own maximum (axis=1, keepdims=True), not the overall maximum."
"SUCCESS: Row by row, and safe from overflow."
```

Hint: `Z.max(axis=1, keepdims=True)` gives each row's maximum as a column, which broadcasting subtracts from each row. Sum the exponentials the same way.
:::

::: challenge Per-class precision and recall [medium]
With many classes, precision and recall are computed for **each class** in turn, treating that class as positive and all others as negative. Write a function `per_class_report(y_true, y_pred, k)` that returns a pair of arrays `(precision, recall)`, each of length `k`, where entry `j` is the precision or recall for class `j`. Build a `k × k` confusion matrix first (row = true class, column = predicted class) and compute both arrays from it with column and row sums. If a class is never predicted, its precision is 0; if it never occurs, its recall is 0.

```python starter
import numpy as np

def per_class_report(y_true, y_pred, k):
    return np.zeros(k), np.zeros(k)

y_true = np.array([0, 0, 1, 1, 2, 2, 2])
y_pred = np.array([0, 1, 1, 1, 2, 0, 2])
print(per_class_report(y_true, y_pred, 3))
```

```python solution
import numpy as np

def per_class_report(y_true, y_pred, k):
    confusion = np.zeros((k, k), dtype=int)
    np.add.at(confusion, (y_true, y_pred), 1)
    correct = np.diag(confusion)
    predicted = confusion.sum(axis=0)
    actual = confusion.sum(axis=1)
    precision = np.where(predicted > 0, correct / np.maximum(predicted, 1), 0.0)
    recall = np.where(actual > 0, correct / np.maximum(actual, 1), 0.0)
    return precision, recall

y_true = np.array([0, 0, 1, 1, 2, 2, 2])
y_pred = np.array([0, 1, 1, 1, 2, 0, 2])
print(per_class_report(y_true, y_pred, 3))
```

```python test
import numpy as _np
from sklearn.metrics import precision_score as _ps, recall_score as _rs
assert "per_class_report" in dir(), "Keep the function's name as per_class_report."
_yt = _np.array([0, 0, 1, 1, 2, 2, 2])
_yp = _np.array([0, 1, 1, 1, 2, 0, 2])
_p, _r = per_class_report(_yt, _yp, 3)
assert _np.allclose(_p, [0.5, 2 / 3, 1.0]), f"For the example, precision should be [0.5, 0.667, 1.0] (e.g. class 1 was predicted 3 times, 2 correctly), but got {_np.round(_p, 3)}. Did you swap rows and columns? Rows are true classes, columns predicted ones."
assert _np.allclose(_r, [0.5, 1.0, 2 / 3]), f"For the example, recall should be [0.5, 1.0, 0.667] (e.g. class 2 occurs 3 times, 2 were caught), but got {_np.round(_r, 3)}. Did you swap rows and columns?"
_rng = _np.random.default_rng(6)
_yt = _rng.integers(0, 5, 200)
_yp = _np.where((_rng.random(200) < 0.6) & (_yt < 4), _yt, _rng.integers(0, 4, 200))
_p, _r = per_class_report(_yt, _yp, 5)
assert _np.allclose(_p, _ps(_yt, _yp, labels=range(5), average=None, zero_division=0)), "Precision is wrong on a larger example. Precision for class j is the diagonal entry divided by column j's sum."
assert _np.allclose(_r, _rs(_yt, _yp, labels=range(5), average=None, zero_division=0)), "Recall is wrong on a larger example. Recall for class j is the diagonal entry divided by row j's sum."
assert _p[4] == 0.0, "Class 4 is never predicted in the larger example, so its precision should be 0."
"SUCCESS: One precision and one recall per class, straight from the confusion matrix."
```

Hint: The diagonal of the confusion matrix (`np.diag`) holds the correct predictions for each class. A column sum counts how often a class was predicted; a row sum counts how often it really occurred. To avoid dividing by zero, divide by `np.maximum(counts, 1)` and use `np.where` to put 0 where the count was 0.
:::

::: challenge Top-k accuracy [medium]
When there are many classes, a softer measure is often reported: **top-k accuracy**, the fraction of examples whose true class is among the model's `k` most probable classes. (Image classifiers with 1,000 classes are usually quoted with "top-5 accuracy".) Write a function `top_k_accuracy(P, y, k)` where `P` is a matrix of probabilities (one row per example) and `y` the true labels. Use `np.argsort` to find each row's `k` most probable classes: with `axis=1`, it returns, for each row, the column numbers arranged so that their values increase (so `np.argsort([[0.5, 0.2, 0.3]], axis=1)` is `[[1, 2, 0]]`). Do not use a Python loop over the examples.

```python starter
import numpy as np

def top_k_accuracy(P, y, k):
    return float((P.argmax(axis=1) == y).mean())

P = np.array([[0.5, 0.3, 0.2],
              [0.1, 0.3, 0.6],
              [0.2, 0.5, 0.3]])
y = np.array([1, 0, 2])
print(top_k_accuracy(P, y, 1), top_k_accuracy(P, y, 2))
```

```python solution
import numpy as np

def top_k_accuracy(P, y, k):
    top = np.argsort(P, axis=1)[:, -k:]
    return float((top == y.reshape(-1, 1)).any(axis=1).mean())

P = np.array([[0.5, 0.3, 0.2],
              [0.1, 0.3, 0.6],
              [0.2, 0.5, 0.3]])
y = np.array([1, 0, 2])
print(top_k_accuracy(P, y, 1), top_k_accuracy(P, y, 2))
```

```python test
import ast as _ast
import numpy as _np
from sklearn.metrics import top_k_accuracy_score as _tk
assert "top_k_accuracy" in dir(), "Keep the function's name as top_k_accuracy."
_P = _np.array([[0.5, 0.3, 0.2], [0.1, 0.3, 0.6], [0.2, 0.5, 0.3]])
_y = _np.array([1, 0, 2])
assert _np.isclose(top_k_accuracy(_P, _y, 1), 0.0), "For the example, top-1 accuracy should be 0: no row's most probable class is its true class."
assert _np.isclose(top_k_accuracy(_P, _y, 2), 2 / 3), f"For the example, top-2 accuracy should be 2/3, but got {top_k_accuracy(_P, _y, 2)}."
_rng = _np.random.default_rng(8)
_Pr = _rng.dirichlet(_np.ones(10), size=300)
_yr = _rng.integers(0, 10, 300)
for _k in (1, 3, 5):
    assert _np.isclose(top_k_accuracy(_Pr, _yr, _k), _tk(_yr, _Pr, k=_k, labels=range(10))), f"top_k_accuracy is wrong for k = {_k} on a larger example. Did you take the k LARGEST probabilities (the end of argsort's order)?"
_fn = [_n for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.FunctionDef) and _n.name == "top_k_accuracy"][0]
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp, _ast.GeneratorExp)) for _n in _ast.walk(_fn)), "Solve it without looping over the examples: argsort and broadcasting handle every row at once."
"SUCCESS: Top-k accuracy with no loops."
```

Hint: `np.argsort(P, axis=1)` sorts each row's class numbers from least to most probable, so `[:, -k:]` keeps the `k` most probable. Compare that `(n, k)` array with `y.reshape(-1, 1)` and ask whether any entry in each row matches, with `.any(axis=1)`.
:::

## What you learned

- Softmax regression gives each of the `k` classes its own weights and score, `z_j = w_j · x + b_j`; with a column of ones, `A @ W` scores every example against every class.
- Softmax turns a row of scores into probabilities: e^(z_j) divided by the sum of the exponentials. Only score differences matter, so subtract the row maximum first to avoid overflow. With two classes it is the sigmoid of the score difference.
- One-hot labels (`np.eye(k)[y]`) have a 1 at the true class. The cross-entropy loss is minus the log of the probability given to the true class, `P[np.arange(n), y]`.
- The gradient is (1/n) Aᵀ(P − Y), the same form as logistic regression, and a numerical check confirms it. The loss is convex.
- The prediction is the class with the highest score; the boundaries between classes are straight, so it is still a linear classifier.
- Trained from scratch on 8×8 handwritten digits, it reaches about 96% test accuracy, as does scikit-learn's `LogisticRegression`. Its weights for each class form a pixel template.
- For many classes, report a confusion matrix (built with `np.add.at`), per-class precision and recall, and sometimes top-k accuracy.

Every model so far has learned weights. Next is a model that learns nothing at all in advance: k-nearest neighbours, which classifies a new example by looking at the most similar examples it has already seen.
