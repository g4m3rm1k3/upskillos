# Logistic regression

The perceptron answers every question with a flat yes or no. An email just across the boundary is "spam" with exactly as much conviction as one that is obviously spam. That is a real limitation. A doctor wants to know whether a tumour has a 51% or a 99% chance of being malignant. A spam filter should send borderline emails to a "check this" folder, not treat them the same as certain ones. And as the last lesson showed, the perceptron's all-or-nothing step has no useful gradient, so it cannot be trained with the gradient methods that everything else in this series uses.

**Logistic regression** fixes all of this with one change: it replaces the hard step with a smooth S-shaped curve that turns the score into a **probability**. Despite the name, it is a classification method, and it is one of the most widely used in practice: simple, fast and interpretable, and the same calculation sits at the output of most neural network classifiers. This lesson builds it from scratch: the model, the loss it is trained with, and a gradient so simple it almost looks like a mistake.

## From a score to a probability

Logistic regression computes the same score as the perceptron, `z = w · x + b`, and then squashes it into the range 0 to 1 with the **sigmoid** function (also called the logistic function, which gives the method its name):

\[
\sigma(z) = \frac{1}{1 + e^{-z}}
\]

```python type
import numpy as np
import matplotlib.pyplot as plt

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

z = np.linspace(-8, 8, 200)
fig, ax = plt.subplots()
ax.plot(z, sigmoid(z), label="sigmoid σ(z)")
ax.plot(z, np.where(z > 0, 1, 0), "--", label="perceptron step")
ax.axhline(0.5, color="gray", lw=0.8)
ax.set_xlabel("score z = w·x + b")
ax.set_ylabel("output")
ax.legend()
plt.show()
print("σ(−3), σ(0), σ(3):", sigmoid(np.array([-3.0, 0.0, 3.0])).round(3))
```

```output
σ(−3), σ(0), σ(3): [0.047 0.5   0.953]
```

The sigmoid is a smoothed version of the step. A very negative score gives a probability near 0, a very positive one gives near 1, and a score of 0, on the boundary, gives exactly 0.5. In between it changes gradually, so an example near the boundary gets a probability near 0.5: uncertain, which is honest.

The model's output is read as the probability that the example belongs to class 1:

\[
p = P(y = 1 \mid x) = \sigma(w \cdot x + b)
\]

For logistic regression the labels are written as **0 and 1** rather than −1 and +1, because they are compared directly with a probability. To make a yes-or-no prediction, predict 1 when `p > 0.5`, which happens exactly when the score is positive: the decision boundary is the same kind of straight line as the perceptron's.

## What the weights mean: log-odds

The **odds** of an event are its probability divided by the probability that it does not happen: a probability of 0.8 is odds of 0.8 / 0.2 = 4, "four to one". Undo the sigmoid, and the score turns out to be the **logarithm of the odds**:

\[
w \cdot x + b = \ln\frac{p}{1 - p}
\]

(Solve `p = 1 / (1 + e^(−z))` for `z` to see it.) So each weight says how much one unit of its feature adds to the log-odds; equivalently, it multiplies the odds by `e^w`. A weight of 0.7 on "number of links in the email" means each extra link multiplies the odds of spam by `e^0.7 ≈ 2`. This is why logistic regression is the standard model in medicine and social science: its weights can be read and explained.

## A loss for probabilities

Training needs a loss. The mean squared error between `p` and the 0/1 label is a poor choice here: its gradients become tiny exactly when the model is confidently wrong, so learning stalls when it most needs to move, and combined with the sigmoid, its surface has awkward flat regions. The right loss for predicted probabilities is the **log loss**, also called **binary cross-entropy**:

\[
\ell(p, y) = -\big[\, y \ln p + (1 - y) \ln(1 - p) \,\big]
\]

It looks complicated but it is simple case by case. When the true label is 1, only the first term is left: the loss is `−ln p`. When it is 0, only the second: `−ln(1 − p)`. In words: **the loss is minus the log of the probability the model gave to the correct answer.**

```python type
import numpy as np

for p in [0.99, 0.9, 0.6, 0.5, 0.1, 0.01]:
    print(f"true label 1, model says p = {p:<4}: loss {-np.log(p):.3f}")
```

```output
true label 1, model says p = 0.99: loss 0.010
true label 1, model says p = 0.9 : loss 0.105
true label 1, model says p = 0.6 : loss 0.511
true label 1, model says p = 0.5 : loss 0.693
true label 1, model says p = 0.1 : loss 2.303
true label 1, model says p = 0.01: loss 4.605
```

Predict the pattern before you run it. A confident, correct prediction (p = 0.99) costs almost nothing. An uncertain one (p = 0.5) costs a moderate amount. A confident **wrong** prediction (p = 0.01) is punished heavily, and the loss grows without limit as p approaches 0. That is what you want: being sure and wrong should be very costly. The training loss is the average of this over all examples.

Where does this loss come from? It is not arbitrary. The probability the model assigns to the whole training set's labels, if the examples are independent, is the **product** of the probability it gives each correct label. Choosing the weights that make that product as large as possible is called **maximum likelihood**, and taking minus its logarithm turns the product into a sum, which is exactly the total log loss. So minimising log loss means finding the weights under which the observed labels were most probable.

## The gradient

Now the calculus pays off. Differentiate the log loss for one example with respect to the score `z`, using the chain rule. Two derivatives are needed. The loss for one example is ℓ = −[y ln p + (1 − y) ln(1 − p)], so

\[
\frac{\partial \ell}{\partial p} = -\frac{y}{p} + \frac{1 - y}{1 - p}
\]

and the sigmoid has the tidy derivative σ′(z) = σ(z)(1 − σ(z)), which is `p(1 − p)`. Multiply them, as the chain rule says:

\[
\frac{\partial \ell}{\partial z} = \left(-\frac{y}{p} + \frac{1 - y}{1 - p}\right) p(1 - p) = -y(1 - p) + (1 - y)p = p - y
\]

The gradient with respect to the score is simply the **error**: the predicted probability minus the true label. Then, since `z = w · x + b`, the chain rule gives `∂ℓ/∂w = (p − y) x` and `∂ℓ/∂b = p − y`. For the whole dataset, in matrix form (with a column of ones for the bias):

\[
\nabla L(\theta) = \frac{1}{n} \tilde{X}^T (p - y)
\]

Compare with linear regression's gradient, `(2/n) X̃ᵀ(ŷ − y)`: it is the same shape, predictions minus labels, multiplied by the features. Both losses measure how improbable the labels are under the model, one assuming normal noise and the other yes/no outcomes, and in both cases the calculus collapses to the same simple form. As always, check it numerically:

```python type
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

rng = np.random.default_rng(0)
A = np.column_stack([np.ones(30), rng.normal(size=(30, 2))])
y = rng.integers(0, 2, 30)
theta = rng.normal(size=3)

def loss(t):
    p = sigmoid(A @ t)
    return -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))

formula = A.T @ (sigmoid(A @ theta) - y) / len(y)
numerical = np.array([(loss(theta + 1e-5 * e) - loss(theta - 1e-5 * e)) / 2e-5 for e in np.eye(3)])
print(formula.round(6))
print(numerical.round(6))
```

```output
[-0.057852  0.365496 -0.009538]
[-0.057852  0.365496 -0.009538]
```

Unlike least squares, there is no formula for the best weights. But the log loss for logistic regression is **convex**: a bowl with no false dips, so any minimum gradient descent settles into is the best one.

There is one catch, and it involves the perceptron's favourite case. If the classes are **linearly separable**, the bowl has no bottom. A line that separates every point can always be made more confident by multiplying its weights by 2: every correct probability moves closer to 1, and the loss shrinks, forever. Watch the weights on separable data, without and then with a small ridge penalty (the regularisation lesson's idea, added to every weight except the bias):

```python type
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

rng = np.random.default_rng(3)
X = np.vstack([rng.normal([2, 2], 0.8, size=(30, 2)), rng.normal([-2, -2], 0.8, size=(30, 2))])
y = np.array([1] * 30 + [0] * 30)
A = np.column_stack([np.ones(60), X])

for penalty in [0.0, 0.01]:
    theta = np.zeros(3)
    for step in range(1, 100_001):
        gradient = A.T @ (sigmoid(A @ theta) - y) / len(y)
        gradient[1:] += penalty * theta[1:]
        theta -= 0.5 * gradient
        if step in (100, 1_000, 10_000, 100_000):
            print(f"penalty {penalty}: after {step:>6} steps, size of the weights {np.linalg.norm(theta[1:]):.2f}")
```

```output
penalty 0.0: after    100 steps, size of the weights 2.37
penalty 0.0: after   1000 steps, size of the weights 3.66
penalty 0.0: after  10000 steps, size of the weights 5.16
penalty 0.0: after 100000 steps, size of the weights 6.79
penalty 0.01: after    100 steps, size of the weights 1.95
penalty 0.01: after   1000 steps, size of the weights 1.99
penalty 0.01: after  10000 steps, size of the weights 1.99
penalty 0.01: after 100000 steps, size of the weights 1.99
```

Without a penalty the weights keep growing (2.37, 3.66, 5.16, 6.79) and would never stop; with it they settle at 1.99 and stay there. On separable data, unpenalised logistic regression has no best answer, only ever-more-confident ones, and any fixed number of steps just stops somewhere along the way. This is one reason scikit-learn's `LogisticRegression` adds a ridge penalty by default (its strength is set by `C`; smaller `C` means a stronger penalty). Many real datasets with many features are separable, including the breast cancer training set used below.

## Training from scratch

```python type
import numpy as np
import matplotlib.pyplot as plt

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

rng = np.random.default_rng(1)
X = np.vstack([rng.normal([2, 2], 1.1, size=(60, 2)), rng.normal([-1, -1], 1.1, size=(60, 2))])
y = np.array([1] * 60 + [0] * 60)
A = np.column_stack([np.ones(len(X)), X])

theta = np.zeros(3)
for step in range(2000):
    p = sigmoid(A @ theta)
    theta -= 0.5 * A.T @ (p - y) / len(y)
p = sigmoid(A @ theta)
print("weights:", theta.round(3))
print("log loss:", round(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)), 4))
print("accuracy:", ((p > 0.5) == y).mean())

g1, g2 = np.meshgrid(np.linspace(-5, 6, 200), np.linspace(-5, 6, 200))
grid_p = sigmoid(theta[0] + theta[1] * g1 + theta[2] * g2)
fig, ax = plt.subplots(figsize=(5.5, 4.5))
contours = ax.contourf(g1, g2, grid_p, levels=20, cmap="RdBu_r", alpha=0.6)
fig.colorbar(contours, ax=ax, label="P(class 1)")
ax.contour(g1, g2, grid_p, levels=[0.5], colors="black")
ax.scatter(*X[y == 1].T, s=12, color="tab:red", label="class 1")
ax.scatter(*X[y == 0].T, s=12, color="tab:blue", label="class 0")
ax.legend(fontsize=8)
plt.show()
```

```output
weights: [-1.347  1.793  1.85 ]
log loss: 0.0796
accuracy: 0.9833333333333333
```

`contourf` fills the plane with colour according to the predicted probability, and the black line is the decision boundary, where it is exactly 0.5. Unlike the perceptron's picture, this one shows **confidence**: deep red or blue far from the boundary, pale near it. These groups overlap a little, so no line gets every point right, but logistic regression does not need to: it finds the line that makes the observed labels most probable, and assigns honest, middling probabilities to the points in the overlap.

## A real example: diagnosing tumours

scikit-learn includes the Wisconsin breast cancer dataset: 569 tumours, each described by 30 measurements of the cell nuclei in a sample, and labelled malignant or benign. Train logistic regression on a training split and test it:

```python type
import numpy as np
from sklearn.datasets import load_breast_cancer

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

data = load_breast_cancer()
X, y = data.data, data.target
order = np.random.default_rng(0).permutation(len(X))
train, test = order[:400], order[400:]
mean, std = X[train].mean(axis=0), X[train].std(axis=0)
A_train = np.column_stack([np.ones(len(train)), (X[train] - mean) / std])
A_test = np.column_stack([np.ones(len(test)), (X[test] - mean) / std])

theta = np.zeros(A_train.shape[1])
for _ in range(3000):
    theta -= 0.1 * A_train.T @ (sigmoid(A_train @ theta) - y[train]) / len(train)

p_test = sigmoid(A_test @ theta)
print("test accuracy:", ((p_test > 0.5) == y[test]).mean().round(3))
print("baseline (always predict the most common class):", max(y[test].mean(), 1 - y[test].mean()).round(3))
```

```output
test accuracy: 0.964
baseline (always predict the most common class): 0.615
```

In this dataset label 1 means benign. With 30 standardised features the model classifies about 96% of unseen tumours correctly, far above the baseline of always guessing the more common diagnosis. The next lesson looks harder at what "96% correct" hides, since the two kinds of mistake here, missing a cancer and raising a false alarm, have very different costs.

scikit-learn's version takes a few lines, and applies its default ridge penalty. This one uses `train_test_split`, so the split is different from the one above and the accuracy differs a little too:

```python type
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0)
scaler = StandardScaler().fit(X_train)
model = LogisticRegression().fit(scaler.transform(X_train), y_train)
print("test accuracy:", round(model.score(scaler.transform(X_test), y_test), 3))
print("probabilities for three tumours:", model.predict_proba(scaler.transform(X_test[:3])).round(3))
```

```output
test accuracy: 0.977
probabilities for three tumours: [[0.999 0.001]
 [0.04  0.96 ]
 [0.001 0.999]]
```

`train_test_split` does the shuffling and splitting, and `StandardScaler` standardises with the training statistics (`fit` learns the mean and standard deviation, `transform` applies them). `predict_proba` returns, for each example, the probability of each class: column 0 for class 0 (malignant) and column 1 for class 1 (benign).

## A practical detail: logs of zero

If the model becomes certain and wrong, `p` can round to exactly 0 or 1, and `np.log(0)` is minus infinity, which turns the loss into `inf` or `nan`. Code that computes log loss therefore **clips** the probabilities slightly away from 0 and 1 first, with `np.clip(p, 1e-12, 1 - 1e-12)`. Libraries do this, or use equivalent formulas that never take the log of zero.

::: challenge Sigmoid and log loss [easy]
Write two functions:

- `sigmoid(z)`, working on numbers or arrays;
- `log_loss(y, p)`, the mean binary cross-entropy for arrays of 0/1 labels `y` and predicted probabilities `p`. Clip `p` to the range `[1e-12, 1 − 1e-12]` first, so that a probability of exactly 0 or 1 does not produce an infinite loss.

```python starter
import numpy as np

def sigmoid(z):
    return z

def log_loss(y, p):
    return 0.0

print(sigmoid(0.0), log_loss(np.array([1, 0]), np.array([0.9, 0.2])))
```

```python solution
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def log_loss(y, p):
    p = np.clip(p, 1e-12, 1 - 1e-12)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))

print(sigmoid(0.0), log_loss(np.array([1, 0]), np.array([0.9, 0.2])))
```

```python test
import numpy as _np
assert "sigmoid" in dir() and "log_loss" in dir(), "Keep both function names."
assert _np.isclose(sigmoid(0.0), 0.5) and _np.isclose(sigmoid(2.0), 1 / (1 + _np.exp(-2.0))), "sigmoid(0) should be 0.5, and sigmoid(z) = 1 / (1 + e^(−z))."
assert _np.allclose(sigmoid(_np.array([-1.0, 1.0])), [0.26894142, 0.73105858]), "sigmoid should work on arrays."
_want = -_np.mean([_np.log(0.9), _np.log(0.8)])
assert _np.isclose(log_loss(_np.array([1, 0]), _np.array([0.9, 0.2])), _want), f"log_loss([1, 0], [0.9, 0.2]) should be {_want:.5f}."
_big = log_loss(_np.array([1]), _np.array([0.0]))
assert _np.isfinite(_big) and _big > 20, "A certain, wrong prediction should give a large but finite loss (about 27.6): clip p to [1e-12, 1 − 1e-12]."
assert log_loss(_np.array([1, 1]), _np.array([0.99, 0.99])) < log_loss(_np.array([1, 1]), _np.array([0.6, 0.6])), "Confident correct predictions should cost less than uncertain ones."
"SUCCESS: The model's squashing function and the loss it is trained with."
```

Hint: The log loss is minus the mean of `y * log(p) + (1 − y) * log(1 − p)`. `np.clip(p, low, high)` keeps every value inside the range.
:::

::: challenge A penalised gradient [medium]
Add a ridge penalty to logistic regression. The penalised loss is the mean log loss plus `(lam / 2)` times the sum of the squared weights, **not** counting the bias `theta[0]`. Its gradient is the ordinary gradient, `Aᵀ(p − y) / n`, plus `lam * theta`, but with nothing added to the bias entry.

Write `penalised_gradient(A, y, theta, lam)` (with `A` already including the column of ones; no loop), and `train_penalised(A, y, lam, lr, steps)`, which runs gradient descent from zeros and returns the final `theta`.

Then, on the starter's separable data, train for 20,000 steps with learning rate 0.5, once with `lam=0` and once with `lam=0.05`, and store the size of the weights (the length of `theta[1:]`, with `np.linalg.norm`) in `size_free` and `size_penalised`.

```python starter
import numpy as np

def penalised_gradient(A, y, theta, lam):
    return np.zeros(len(theta))

def train_penalised(A, y, lam, lr, steps):
    return np.zeros(A.shape[1])

rng = np.random.default_rng(3)
X = np.vstack([rng.normal([2, 2], 0.8, size=(30, 2)), rng.normal([-2, -2], 0.8, size=(30, 2))])
y = np.array([1] * 30 + [0] * 30)
A = np.column_stack([np.ones(60), X])

size_free = 0.0
size_penalised = 0.0
print(size_free, size_penalised)
```

```python solution
import numpy as np

def penalised_gradient(A, y, theta, lam):
    p = 1 / (1 + np.exp(-(A @ theta)))
    gradient = A.T @ (p - y) / len(y)
    penalty = lam * theta
    penalty[0] = 0.0
    return gradient + penalty

def train_penalised(A, y, lam, lr, steps):
    theta = np.zeros(A.shape[1])
    for _ in range(steps):
        theta = theta - lr * penalised_gradient(A, y, theta, lam)
    return theta

rng = np.random.default_rng(3)
X = np.vstack([rng.normal([2, 2], 0.8, size=(30, 2)), rng.normal([-2, -2], 0.8, size=(30, 2))])
y = np.array([1] * 30 + [0] * 30)
A = np.column_stack([np.ones(60), X])

size_free = float(np.linalg.norm(train_penalised(A, y, 0.0, 0.5, 20_000)[1:]))
size_penalised = float(np.linalg.norm(train_penalised(A, y, 0.05, 0.5, 20_000)[1:]))
print(size_free, size_penalised)
```

```python test
import numpy as _np
import ast as _ast
assert "penalised_gradient" in dir() and "train_penalised" in dir(), "Keep both function names."
_fn = [n for n in _ast.walk(_ast.parse(_source)) if isinstance(n, _ast.FunctionDef) and n.name == "penalised_gradient"][0]
assert not any(isinstance(n, (_ast.For, _ast.While, _ast.ListComp)) for n in _ast.walk(_fn)), "Compute the gradient with the matrix formula, without a loop."
_rng = _np.random.default_rng(2)
_A = _np.column_stack([_np.ones(40), _rng.normal(size=(40, 3))])
_y = _rng.integers(0, 2, 40)
_t = _rng.normal(size=4)
_sig = lambda z: 1 / (1 + _np.exp(-z))
_L = lambda t, lam: -_np.mean(_y * _np.log(_sig(_A @ t)) + (1 - _y) * _np.log(1 - _sig(_A @ t))) + lam / 2 * _np.sum(t[1:] ** 2)
for _lam in (0.0, 0.3):
    _num = _np.array([(_L(_t + 1e-5 * e, _lam) - _L(_t - 1e-5 * e, _lam)) / 2e-5 for e in _np.eye(4)])
    _got = penalised_gradient(_A, _y, _t.copy(), _lam)
    assert _np.allclose(_got[0], _num[0], atol=1e-6), "The bias entry of the gradient is wrong. The bias is not penalised, so its entry is just the ordinary gradient."
    assert _np.allclose(_got, _num, atol=1e-6), f"With lam = {_lam}, your gradient does not match a numerical gradient of the penalised loss. Add lam * theta to every entry except the first."
_t_before = _t.copy()
penalised_gradient(_A, _y, _t, 0.3)
assert _np.array_equal(_t, _t_before), "penalised_gradient changed theta itself. Build the penalty as a new array (lam * theta makes one) rather than editing theta."
_ref = _np.zeros(4)
for _ in range(300):
    _g = _A.T @ (_sig(_A @ _ref) - _y) / 40
    _g[1:] += 0.2 * _ref[1:]
    _ref = _ref - 0.3 * _g
assert _np.allclose(train_penalised(_A, _y, 0.2, 0.3, 300), _ref), "train_penalised should run gradient descent from zeros with your penalised gradient."
_rs = _np.random.default_rng(3)
_Xs = _np.vstack([_rs.normal([2, 2], 0.8, size=(30, 2)), _rs.normal([-2, -2], 0.8, size=(30, 2))])
_As = _np.column_stack([_np.ones(60), _Xs])
_ys = _np.array([1] * 30 + [0] * 30)
def _train(lam):
    t = _np.zeros(3)
    for _ in range(20_000):
        g = _As.T @ (_sig(_As @ t) - _ys) / 60
        g[1:] += lam * t[1:]
        t = t - 0.5 * g
    return float(_np.linalg.norm(t[1:]))
_free, _pen = _train(0.0), _train(0.05)
assert _np.isclose(size_free, _free), f"size_free should be about {_free:.3f} (the unpenalised weights after 20,000 steps), but it is {size_free}."
assert _np.isclose(size_penalised, _pen), f"size_penalised should be about {_pen:.3f}, but it is {size_penalised}."
"SUCCESS: The penalty gives the bowl a bottom: on separable data the weights now settle instead of growing forever."
```

Hint: Compute the ordinary gradient, then build `penalty = lam * theta` (a new array), set `penalty[0] = 0.0`, and add the two.
:::

::: challenge Read the odds [medium]
Using the lesson's breast cancer setup (the same split with seed 0, standardising with the training statistics, and 3000 steps of gradient descent with learning rate 0.1 from zeros), train the model, then answer three questions about it:

- `strongest`: the **name** of the feature whose weight has the largest absolute value (the names are in `data.feature_names`, in column order; the weights exclude the bias);
- `odds_factor`: the factor by which the odds of "benign" are multiplied when that feature increases by one standard deviation, which is `e` to the power of its weight;
- `halving_change`: how much that feature must increase **in its original units** to halve the odds of "benign". The model works in standard deviations, so a change of `d` original units is `d / std` standard deviations, which multiplies the odds by `e^(w · d / std)`. Solve `e^(w · d / std) = 0.5` for `d`.

```python starter
import numpy as np
from sklearn.datasets import load_breast_cancer

data = load_breast_cancer()
X, y = data.data, data.target

strongest = ""
odds_factor = 1.0
halving_change = 0.0
print(strongest, odds_factor, halving_change)
```

```python solution
import numpy as np
from sklearn.datasets import load_breast_cancer

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

data = load_breast_cancer()
X, y = data.data, data.target
order = np.random.default_rng(0).permutation(len(X))
train = order[:400]
mean, std = X[train].mean(axis=0), X[train].std(axis=0)
A_train = np.column_stack([np.ones(len(train)), (X[train] - mean) / std])

theta = np.zeros(A_train.shape[1])
for _ in range(3000):
    theta -= 0.1 * A_train.T @ (sigmoid(A_train @ theta) - y[train]) / len(train)

weights = theta[1:]
index = int(np.argmax(np.abs(weights)))
strongest = data.feature_names[index]
odds_factor = float(np.exp(weights[index]))
halving_change = float(std[index] * np.log(0.5) / weights[index])
print(strongest, odds_factor, halving_change)
```

```python test
import numpy as _np
from sklearn.datasets import load_breast_cancer as _lb
_d = _lb()
_X, _y = _d.data, _d.target
_o = _np.random.default_rng(0).permutation(len(_X))
_tr = _o[:400]
_m, _s = _X[_tr].mean(axis=0), _X[_tr].std(axis=0)
_A = _np.column_stack([_np.ones(400), (_X[_tr] - _m) / _s])
_t = _np.zeros(31)
_sig = lambda z: 1 / (1 + _np.exp(-z))
for _ in range(3000):
    _t -= 0.1 * _A.T @ (_sig(_A @ _t) - _y[_tr]) / 400
_i = int(_np.argmax(_np.abs(_t[1:])))
assert str(strongest) == _d.feature_names[_i], f"The feature with the largest absolute weight is {_d.feature_names[_i]!r}, but strongest is {strongest!r}. Leave the bias out."
assert _np.isclose(odds_factor, _np.exp(_t[1:][_i])), f"The odds factor should be e^{_t[1:][_i]:.3f} ≈ {_np.exp(_t[1:][_i]):.3f}, but it is {odds_factor}."
_want = _s[_i] * _np.log(0.5) / _t[1:][_i]
assert not _np.isclose(halving_change, _np.log(0.5) / _t[1:][_i]), "That is the change in standard deviations. Multiply by the feature's standard deviation to get original units."
assert _np.isclose(halving_change, _want), f"halving_change should be std × ln(0.5) / w ≈ {_want:.4f}, but it is {halving_change}."
"SUCCESS: An increase of about 0.13 in radius error halves the odds of benign. A caution before reading this medically: radius error is strongly correlated with other size measurements in the data, and, as the multiple regression lesson showed, correlated features share credit unreliably, so a single weight is not the whole story."
```

Hint: Train exactly as in the lesson. The weights are `theta[1:]`; `np.argmax(np.abs(weights))` finds the strongest. Taking logs of `e^(w · d / std) = 0.5` gives `w · d / std = ln 0.5`, so `d = std × ln(0.5) / w`, using that feature's entry of `std`.
:::

## What you learned

- Logistic regression turns the score `w · x + b` into a probability with the sigmoid, σ(z) = 1/(1 + e^(−z)), which runs from 0 to 1 and is 0.5 on the boundary. Labels are 0 and 1.
- The score is the log of the odds, ln(p/(1 − p)); a weight `w` multiplies the odds by `e^w` per unit of its feature.
- The loss is the log loss (binary cross-entropy), −[y ln p + (1 − y) ln(1 − p)]: minus the log of the probability given to the correct answer. It punishes confident mistakes heavily, and minimising it is maximum likelihood.
- Its gradient is (1/n) X̃ᵀ(p − y): predictions minus labels, times the inputs. The loss is convex, so any minimum is the best one; but on linearly separable data there is no minimum and the weights grow forever unless a penalty (like scikit-learn's default) stops them.
- scikit-learn's `LogisticRegression` (with default regularisation, `C`), `train_test_split`, `StandardScaler` and `predict_proba` do the same.
- Clip probabilities away from 0 and 1 before taking logs.

"96% accurate" sounds excellent, but it hides which mistakes were made. Next you will take classification results apart with the confusion matrix, precision, recall and the ROC curve.
