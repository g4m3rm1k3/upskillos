# Support vector machines

When two classes can be separated by a straight line, there are usually infinitely many lines that do it. The perceptron stops at whichever one it reaches first. Logistic regression picks the line that makes the labels most probable. A **support vector machine** (SVM) asks a different, geometric question: which line leaves the **widest gap** between the two classes? A line that passes right next to some training points is fragile: a new point slightly to one side of them would be misclassified. A line down the middle of the widest empty corridor is the safest bet.

That idea, the **maximum margin**, leads to a new loss function, the **hinge loss**, and to a property that makes SVMs special: the final line depends only on a few training points, the **support vectors**, that sit at the edge of the corridor. And it leads to the **kernel trick**, which lets a linear method draw curved boundaries by quietly working in a higher-dimensional space. SVMs were the leading classification method of the late 1990s and 2000s, and they remain excellent for small and medium datasets with many features.

## The margin

A linear classifier computes a score `f(x) = w · x + b` and predicts by its sign. With labels −1 and +1, as in AdaBoost, a point is classified correctly when `y · f(x) > 0`.

From geometry, the distance from a point `x` to the line `w · x + b = 0` is `|w · x + b| / ‖w‖`, the score divided by the length of `w`. Notice that multiplying `w` and `b` by any positive number gives the same line, so the scale of `w` is ours to choose. The SVM convention fixes it so that the closest points on each side have a score of exactly ±1, meaning `y · f(x) = 1`. Those points then lie at distance 1/‖w‖ from the line, and the **margin**, the full width of the empty corridor between the two classes, is

\[
\text{margin} = \frac{2}{\lVert \mathbf{w} \rVert}
\]

So **a wider margin means a shorter `w`**. The hard-margin SVM finds the shortest `w` such that every training point satisfies `y · f(x) ≥ 1`: every point on the correct side, and outside the corridor.

## The hinge loss and the soft margin

Real data is rarely perfectly separable, so the requirement is softened: points may violate the margin, at a cost. For each point, the **hinge loss** is

\[
\text{hinge}(y, f) = \max(0,\; 1 - y \cdot f(x))
\]

It is 0 for points safely outside the corridor on the correct side (`y · f ≥ 1`), grows linearly for points inside the corridor, and keeps growing for points on the wrong side. The soft-margin SVM minimises

\[
\frac{\lambda}{2} \lVert \mathbf{w} \rVert^2 + \frac{1}{n} \sum_i \max(0,\; 1 - y_i f(x_i))
\]

The first term wants a wide margin (a short `w`); the second wants few and small violations. λ sets the balance, exactly as in ridge regression: the penalty term **is** a ridge penalty. Compare the hinge with the losses you have met, all as functions of `y · f`:

```python type
import numpy as np
import matplotlib.pyplot as plt

margin = np.linspace(-2, 3, 200)
fig, ax = plt.subplots(figsize=(6, 3.5))
ax.plot(margin, (margin <= 0).astype(float), label="0/1 loss (mistake or not)")
ax.plot(margin, np.maximum(0, -margin), label="perceptron: max(0, −y·f)")
ax.plot(margin, np.maximum(0, 1 - margin), label="hinge: max(0, 1 − y·f)")
ax.plot(margin, np.log2(1 + np.exp(-margin)), label="logistic (log loss, in bits)")
ax.set_xlabel("y · f(x)   (negative = wrong side)")
ax.set_ylabel("loss")
ax.legend(fontsize=8)
plt.show()
```

The 0/1 loss, which is what accuracy measures, has no useful slope. The perceptron's loss is zero as soon as a point is on the right side, however close to the line, which is why the perceptron is happy with any separating line. The hinge loss keeps pushing until points are a full unit of score away from the line: that demand for a safety margin is the whole difference. The logistic loss is a smooth cousin of the hinge; it never quite reaches zero, so every point has some influence.

## Training a linear SVM from scratch

The hinge loss has a corner at `y · f = 1`, but gradient descent still works if you use the slope from either side there (this is called a **subgradient**). For points with `y · f < 1`, the hinge term's slope with respect to `w` is `−y · x` and with respect to `b` is `−y`; for the other points it is 0. Adding the penalty's gradient `λ w`:

```python type
import numpy as np
import matplotlib.pyplot as plt

def train_svm(X, y, lam, lr=0.1, epochs=5000):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epochs):
        violating = y * (X @ w + b) < 1
        grad_w = lam * w - (y[violating, None] * X[violating]).sum(axis=0) / len(y)
        grad_b = -y[violating].sum() / len(y)
        w -= lr * grad_w
        b -= lr * grad_b
    return w, b

rng = np.random.default_rng(1)
X = np.vstack([rng.normal([2, 2], 0.7, size=(25, 2)), rng.normal([-1, -1], 0.7, size=(25, 2))])
y = np.array([1] * 25 + [-1] * 25)

fig, axes = plt.subplots(1, 2, figsize=(9, 3.8))
for ax, lam in zip(axes, [0.01, 1.0]):
    w, b = train_svm(X, y, lam)
    margins = y * (X @ w + b)
    on_or_inside = margins <= 1.001
    print(f"lambda {lam}: w = {w.round(3)}, b = {b:.3f}, margin width {2 / np.linalg.norm(w):.2f}, "
          f"points on or inside the margin: {on_or_inside.sum()}, training accuracy {(np.sign(X @ w + b) == y).mean():.2f}")
    xs = np.linspace(-3.5, 4, 2)
    for level, style in [(0, "-"), (1, "--"), (-1, "--")]:
        ax.plot(xs, (level - b - w[0] * xs) / w[1], "k" + style, linewidth=1)
    ax.scatter(*X.T, c=y, cmap="coolwarm", s=14)
    ax.scatter(*X[on_or_inside].T, s=80, facecolors="none", edgecolors="black")
    ax.set_ylim(-3.5, 4)
    ax.set_title(f"lambda = {lam}", fontsize=9)
plt.show()
```

```output
lambda 0.01: w = [0.577 1.431], b = -0.028, margin width 1.30, points on or inside the margin: 2, training accuracy 1.00
lambda 1.0: w = [0.362 0.372], b = -0.348, margin width 3.86, points on or inside the margin: 18, training accuracy 0.98
```

`y[violating, None] * X[violating]` multiplies each violating row by its label (the `None` makes the labels a column, so they broadcast across the row), and the sum adds up their gradients. The plots show the line (solid), the edges of the margin where the score is ±1 (dashed), and circles around the points on or inside the margin.

With a small penalty (λ = 0.01), the SVM insists on a clean separation: the margin is 1.30 wide and exactly 2 points lie on its edges, with none inside. With a large penalty (λ = 1), a short `w` matters more than violations, so the margin widens to 3.86 and 18 points are allowed inside it; one is even misclassified. Which is better depends on how noisy the data is, so λ is chosen by cross-validation.

## Support vectors

Look again at the left plot. Only the 2 circled points touch the margin. Move any other point a little (without crossing the dashed lines) and nothing changes: their hinge loss stays 0, so they contribute nothing to the gradient. The line is determined entirely by the points on or inside the margin. These are the **support vectors**: they "support" the line the way posts support a fence.

This sparsity is very different from logistic regression, where every point pulls on the line a little. It makes SVMs robust to points far from the boundary, and, as you will see, it is what makes the kernel trick practical.

scikit-learn's `SVC` (support vector classifier) uses a parameter `C` instead of λ, playing the inverse role: `C` = 1/(λn), so **large `C` means a small penalty**, a narrow margin with few violations, and small `C` a wide, tolerant margin. With the 50 points above, λ = 0.01 corresponds to `C` = 1/(0.01 × 50) = 2, and `SVC(kernel="linear", C=2).fit(X, y)` finds the same line, with `w` ≈ [0.576, 1.432]; its `support_` attribute lists the 2 support vectors. Likewise `C` = 0.02 reproduces the λ = 1 line.

## The kernel trick

Some classes cannot be separated by any line. Points inside a ring and points around it, for example: in two dimensions every line fails. But add a third feature, the squared distance from the centre, `x₁² + x₂²`, and the inner points are low and the outer points high, so a flat plane separates them perfectly:

```python type
import numpy as np
from sklearn.datasets import make_circles
from sklearn.model_selection import cross_val_score
from sklearn.svm import SVC

X, y = make_circles(200, noise=0.1, factor=0.4, random_state=0)
lifted = np.column_stack([X, (X ** 2).sum(axis=1)])
print("linear SVM on the original 2 features:", cross_val_score(SVC(kernel="linear"), X, y, cv=5).mean().round(3))
print("linear SVM with x1² + x2² added:       ", cross_val_score(SVC(kernel="linear"), lifted, y, cv=5).mean().round(3))
print("RBF-kernel SVM on the original features:", cross_val_score(SVC(kernel="rbf"), X, y, cv=5).mean().round(3))
```

```output
linear SVM on the original 2 features: 0.55
linear SVM with x1² + x2² added:        0.995
RBF-kernel SVM on the original features: 1.0
```

The linear SVM manages 0.55 (no better than guessing) on the original features and 0.995 with the extra feature. Adding features by hand is the "lifting" idea from the lesson on what a perceptron cannot learn, where an extra product feature made XOR separable. The problem is that useful lifts can need enormous numbers of features: all the products of pairs, triples and so on.

The **kernel trick** avoids building them. It turns out (the derivation goes through the SVM's "dual" form) that training and prediction only ever need **dot products** between pairs of points, never the lifted features themselves. So if a function `K(a, b)` gives the dot product of the lifted versions of `a` and `b` directly, the SVM can work in the lifted space without ever computing it. Such a function is a **kernel**. The prediction becomes a weighted sum over the support vectors, where each αᵢ is a weight learned in training (zero for every point that is not a support vector; a different α from AdaBoost's):

\[
f(x) = \sum_{i \in \text{support vectors}} \alpha_i \, y_i \, K(x_i, x) + b
\]

The most popular kernel is the **RBF** (radial basis function, or Gaussian) kernel:

\[
K(a, b) = e^{-\gamma \lVert a - b \rVert^2}
\]

It is 1 when the points coincide and fades towards 0 as they move apart, so it measures **similarity**, and γ (gamma) sets how quickly similarity fades. Its lifted space is infinite-dimensional, which no amount of hand-built features could match, yet each kernel value is one line of arithmetic. Read the prediction formula with this kernel and it looks like k-nearest neighbours with learned weights: a new point is classified by its similarity to each support vector, weighted by how much each one matters.

## Choosing gamma and C

γ controls how far each support vector's influence reaches. Small γ: wide, smooth influence and a gentle boundary. Large γ: each support vector only affects its immediate neighbourhood, so the boundary can wrap around individual points. Predict before running: which gamma will score best on the test set, and what happens to training accuracy as gamma grows?

```python type
import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC

X, y = make_moons(300, noise=0.3, random_state=0)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=0)
for gamma in [0.1, 1, 10, 100]:
    model = SVC(kernel="rbf", gamma=gamma, C=1).fit(X_train, y_train)
    print(f"gamma {gamma:>5}: train {model.score(X_train, y_train):.3f}, test {model.score(X_test, y_test):.3f}, support vectors {len(model.support_)}")
```

```output
gamma   0.1: train 0.800, test 0.880, support vectors 84
gamma     1: train 0.927, test 0.953, support vectors 60
gamma    10: train 0.947, test 0.933, support vectors 85
gamma   100: train 0.993, test 0.747, support vectors 144
```

γ = 0.1 underfits (test 0.88): the boundary is nearly straight. γ = 1 does best (0.953). γ = 100 overfits badly: training accuracy 0.993 and test 0.747, using 144 of the 150 training points as support vectors, effectively memorising them. As always, choose γ and `C` together by cross-validation, usually over a grid of values spaced by factors of 10.

One more practical rule: **scale the features first**. The RBF kernel is built on distances, so, as with kNN, a feature measured in large units would dominate. On the breast cancer data, `SVC()` scores 0.912 in cross-validation on the raw features and 0.974 inside `make_pipeline(StandardScaler(), SVC())`.

## Strengths and limits

SVMs give strong results on small and medium datasets, especially with many features (text classification was a classic success), and the maximum-margin principle makes them resistant to overfitting in high dimensions. Their limits: training time grows faster than the square of the number of examples, so beyond tens of thousands of rows they become slow; they give scores, not probabilities (`SVC(probability=True)` adds a slow calibration step); and they need scaling and tuning of `C` and γ. For large tabular data, boosted trees usually win; for images and text at scale, neural networks took over.

::: challenge Hinge and margin [easy]
Write `hinge_loss(y, scores)`, the **mean** hinge loss for labels `y` (−1 and +1) and scores `f(x)`, and `margin_width(w)`, the width of the margin, 2/‖w‖.

```python starter
import numpy as np

def hinge_loss(y, scores):
    return 0.0

def margin_width(w):
    return 0.0

print(hinge_loss(np.array([1, -1, 1]), np.array([2.0, -0.5, -1.0])), margin_width(np.array([3.0, 4.0])))
```

```python solution
import numpy as np

def hinge_loss(y, scores):
    return float(np.mean(np.maximum(0, 1 - y * scores)))

def margin_width(w):
    return float(2 / np.linalg.norm(w))

print(hinge_loss(np.array([1, -1, 1]), np.array([2.0, -0.5, -1.0])), margin_width(np.array([3.0, 4.0])))
```

```python test
import numpy as _np
assert "hinge_loss" in dir() and "margin_width" in dir(), "Keep both function names."
assert _np.isclose(hinge_loss(_np.array([1, -1, 1]), _np.array([2.0, -0.5, -1.0])), (0 + 0.5 + 2) / 3), "For labels [1, −1, 1] and scores [2, −0.5, −1], the hinge losses are 0, 0.5 and 2, so the mean is 2.5/3."
assert _np.isclose(hinge_loss(_np.array([1, -1]), _np.array([1.0, -1.0])), 0.0), "Points exactly on the margin edge (y · f = 1) have zero hinge loss."
assert _np.isclose(hinge_loss(_np.array([1]), _np.array([0.5])), 0.5), "A point on the right side but inside the margin (y · f = 0.5) still costs 0.5: that is what makes it different from the perceptron loss."
assert _np.isclose(margin_width(_np.array([3.0, 4.0])), 0.4), "‖[3, 4]‖ = 5, so the margin is 2/5 = 0.4."
"SUCCESS: The hinge charges for being inside the corridor, not just for being wrong."
```

Hint: `np.maximum(0, 1 - y * scores)` applies the hinge to every point at once (unlike `max`, it works element by element). `np.linalg.norm(w)` is the length of `w`.
:::

::: challenge Only the support vectors matter [easy]
Test the claim that the line depends only on the support vectors. Write `support_indices(X, y, w, b, tol)` that returns the indices (an array, in increasing order) of the points with `y · (X @ w + b) <= 1 + tol`.

Then, on the starter's data: fit `SVC(kernel="linear", C=100)` on all the points and take its `w` (`model.coef_[0]`) and `b` (`model.intercept_[0]`); find the support vectors with your function and `tol=1e-3`, storing the indices in `support`; refit the same SVC on **only** those points, and store the refitted `w` and `b` in `w_small` and `b_small`.

```python starter
import numpy as np
from sklearn.svm import SVC

def support_indices(X, y, w, b, tol):
    return np.arange(len(X))

rng = np.random.default_rng(1)
X = np.vstack([rng.normal([2, 2], 0.7, size=(25, 2)), rng.normal([-1, -1], 0.7, size=(25, 2))])
y = np.array([1] * 25 + [-1] * 25)

support = None
w_small, b_small = None, None
print(support, w_small, b_small)
```

```python solution
import numpy as np
from sklearn.svm import SVC

def support_indices(X, y, w, b, tol):
    return np.flatnonzero(y * (X @ w + b) <= 1 + tol)

rng = np.random.default_rng(1)
X = np.vstack([rng.normal([2, 2], 0.7, size=(25, 2)), rng.normal([-1, -1], 0.7, size=(25, 2))])
y = np.array([1] * 25 + [-1] * 25)

model = SVC(kernel="linear", C=100).fit(X, y)
support = support_indices(X, y, model.coef_[0], model.intercept_[0], 1e-3)
small = SVC(kernel="linear", C=100).fit(X[support], y[support])
w_small, b_small = small.coef_[0], small.intercept_[0]
print(support, w_small, b_small)
```

```python test
import numpy as _np
from sklearn.svm import SVC as _SVC
assert "support_indices" in dir(), "Keep the function's name as support_indices."
_Xa = _np.array([[0.0, 2.0], [0.0, 1.0], [0.0, -1.0], [0.0, -3.0]])
_ya = _np.array([1, 1, -1, -1])
assert list(support_indices(_Xa, _ya, _np.array([0.0, 1.0]), 0.0, 1e-3)) == [1, 2], "With w = [0, 1] and b = 0, the points at heights 1 and −1 are exactly on the margin and are the support vectors; the others are outside it."
assert list(support_indices(_Xa, _ya, _np.array([0.0, 1.0]), 0.5, 1e-3)) == [2], "With b = 0.5, only the point at height −1 has y · f ≤ 1 (y · f = 0.5)."
_r = _np.random.default_rng(1)
_X = _np.vstack([_r.normal([2, 2], 0.7, size=(25, 2)), _r.normal([-1, -1], 0.7, size=(25, 2))])
_y = _np.array([1] * 25 + [-1] * 25)
_m = _SVC(kernel="linear", C=100).fit(_X, _y)
_s = _np.flatnonzero(_y * (_X @ _m.coef_[0] + _m.intercept_[0]) <= 1 + 1e-3)
assert support is not None and list(support) == list(_s), f"support should be the indices {list(_s)}."
assert len(_s) < 10, "Only a few points should be support vectors."
_sm = _SVC(kernel="linear", C=100).fit(_X[_s], _y[_s])
assert w_small is not None and _np.allclose(w_small, _sm.coef_[0]) and _np.isclose(b_small, _sm.intercept_[0]), "w_small and b_small should come from refitting on only the support vectors."
assert _np.allclose(w_small, _m.coef_[0], atol=1e-2) and _np.isclose(b_small, _m.intercept_[0], atol=1e-2), "The refitted line should match the original one."
f"SUCCESS: {len(_s)} points out of 50 determine the line; throw the other {50 - len(_s)} away and the SVM finds the same answer."
```

Hint: `np.flatnonzero(condition)` returns the indices where a boolean array is `True`. Select the support vectors with `X[support]` and `y[support]` before refitting.
:::

::: challenge A kernel machine by hand [medium]
Reproduce an RBF-kernel SVM's predictions from its parts. A fitted `SVC` stores its support vectors in `support_vectors_`, the products αᵢyᵢ in `dual_coef_[0]`, and `b` in `intercept_[0]`, so its score for a new point is `f(x) = Σ dual_coef[i] · K(support_vectors[i], x) + b`.

Write `rbf_kernel(A, B, gamma)` returning the matrix with entry `[i, j]` equal to e^(−γ‖A[i] − B[j]‖²) (use broadcasting, as for the distance matrix in the kNN lesson). Then write `svm_scores(model, X, gamma)` that computes the score for every row of `X` from the model's parts and your kernel. The check compares your scores with `model.decision_function(X)`.

```python starter
import numpy as np
from sklearn.datasets import make_moons
from sklearn.svm import SVC

def rbf_kernel(A, B, gamma):
    return np.zeros((len(A), len(B)))

def svm_scores(model, X, gamma):
    return np.zeros(len(X))

X, y = make_moons(200, noise=0.3, random_state=0)
model = SVC(kernel="rbf", gamma=1.0, C=1.0).fit(X, y)
print(svm_scores(model, X[:3], 1.0), model.decision_function(X[:3]))
```

```python solution
import numpy as np
from sklearn.datasets import make_moons
from sklearn.svm import SVC

def rbf_kernel(A, B, gamma):
    squared = ((A[:, None, :] - B[None, :, :]) ** 2).sum(axis=2)
    return np.exp(-gamma * squared)

def svm_scores(model, X, gamma):
    K = rbf_kernel(model.support_vectors_, X, gamma)
    return model.dual_coef_[0] @ K + model.intercept_[0]

X, y = make_moons(200, noise=0.3, random_state=0)
model = SVC(kernel="rbf", gamma=1.0, C=1.0).fit(X, y)
print(svm_scores(model, X[:3], 1.0), model.decision_function(X[:3]))
```

```python test
import numpy as _np
from sklearn.datasets import make_moons as _mm
from sklearn.svm import SVC as _SVC
assert "rbf_kernel" in dir() and "svm_scores" in dir(), "Keep both function names."
_A = _np.array([[0.0, 0.0], [1.0, 1.0]])
_B = _np.array([[0.0, 0.0], [3.0, 4.0]])
_K = rbf_kernel(_A, _B, 0.5)
assert _np.shape(_K) == (2, 2), f"rbf_kernel(A, B) should have shape (len(A), len(B)), here (2, 2), not {_np.shape(_K)}."
assert _np.allclose(_K, [[1.0, _np.exp(-12.5)], [_np.exp(-1.0), _np.exp(-6.5)]]), "rbf_kernel is wrong: entry [i, j] is exp(−gamma × squared distance between A[i] and B[j]). Use the squared distance, not the distance."
_X, _y = _mm(200, noise=0.3, random_state=0)
for _g, _c in [(1.0, 1.0), (5.0, 10.0)]:
    _m = _SVC(kernel="rbf", gamma=_g, C=_c).fit(_X, _y)
    _pts = _np.random.default_rng(2).uniform(-1.5, 2.5, (25, 2))
    assert _np.allclose(svm_scores(_m, _pts, _g), _m.decision_function(_pts)), f"With gamma = {_g}, your scores differ from decision_function. The score is dual_coef_[0] @ K + intercept_[0], with K comparing each support vector with each point."
_m = _SVC(kernel="rbf", gamma=1.0, C=1.0).fit(_X, _y)
f"SUCCESS: The whole trained model is {len(_m.support_vectors_)} remembered points, a weight for each, and one number: a similarity-weighted vote."
```

Hint: `rbf_kernel(model.support_vectors_, X, gamma)` has one row per support vector and one column per point, so `model.dual_coef_[0] @ K` sums the weighted similarities for every point at once. Then add the intercept.
:::

## What you learned

- An SVM picks the separating line with the widest margin. With the scale fixed so the closest points have y · f(x) = 1, the margin is 2/‖w‖, so a wide margin means a short `w`.
- The soft margin minimises (λ/2)‖w‖² plus the mean hinge loss, max(0, 1 − y · f). Unlike the perceptron's loss, the hinge charges points that are correct but inside the margin. It can be trained by (sub)gradient descent.
- The solution depends only on the support vectors, the points on or inside the margin. In scikit-learn, `C` plays the role of 1/λ: large `C`, narrow margin.
- The kernel trick replaces dot products with a kernel K(a, b), working implicitly in a lifted feature space. The RBF kernel e^(−γ‖a − b‖²) measures similarity; predictions are similarity-weighted votes of support vectors.
- γ and `C` control flexibility (large γ overfits) and are chosen by cross-validation; scale the features first.
- SVMs are strong on small and medium data with many features, but slow on large datasets and give no probabilities by default.

You now have a full toolbox of classifiers: linear models, neighbours, Bayes, trees, forests, boosting and SVMs. The next lesson steps back from individual models to the machinery around them: scikit-learn's estimators, pipelines and column transformers, which make a whole modelling workflow reproducible and leak-free.
