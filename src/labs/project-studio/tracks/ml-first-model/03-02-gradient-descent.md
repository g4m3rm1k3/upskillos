---
title: 3.2 — Learning: Gradient Descent on Real Data
track: Your First Model — Predict a Number
runtime: none
concepts: gradient-descent, feature-scaling
revisits: gradients, derivatives, loss, linear-model, classes
notebook: ml-gradient-descent, ml-multiple-regression
lab: 1
problem: Grid search tried 441 lines and still only got "somewhere near 155". How does a model find its best parameters directly, and why does the obvious way fail on real data?
---

Last lesson's grid search was blind: it tried every line, because it had no idea which direction was better. Lesson 2.4 built the tool that does know: the gradient points uphill on the loss landscape, so stepping against it goes downhill. This lesson computes the exact gradient of the mean squared error, writes the training loop, and runs it on the houses. It will fail, in exactly the way lesson 2.4 predicted, and then you'll fix it.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_train.py provided
# Tests for gradients, training and scaling. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_train.py
import numpy as np
from pytest import approx

from houses import model


def numerical_gradient(X, y, w, b, h=1e-6):
    """Central differences, one parameter at a time: the slow, obviously-right way."""
    def loss(w, b):
        return model.mse(y, model.predict(X, w, b))
    grad_w = np.zeros_like(w)
    for j in range(len(w)):
        step = np.zeros_like(w)
        step[j] = h
        grad_w[j] = (loss(w + step, b) - loss(w - step, b)) / (2 * h)
    grad_b = (loss(w, b + h) - loss(w, b - h)) / (2 * h)
    return grad_w, grad_b


def test_gradient_formula_matches_the_numerical_gradient():
    rng = np.random.default_rng(1)
    X = rng.normal(size=(20, 3))
    y = rng.normal(size=20)
    w = rng.normal(size=3)
    grad_w, grad_b = model.gradients(X, y, w, 0.5)
    check_w, check_b = numerical_gradient(X, y, w, 0.5)
    assert grad_w == approx(check_w, rel=1e-5)
    assert grad_b == approx(check_b, rel=1e-5)


def test_gradient_is_zero_on_a_perfect_fit():
    X = np.array([[0.0], [1.0], [2.0]])
    grad_w, grad_b = model.gradients(X, 3 * X[:, 0] + 2, np.array([3.0]), 2.0)
    assert grad_w == approx([0]) and grad_b == approx(0)


def test_descent_recovers_a_known_line():
    from houses import train
    X = np.array([[0.0], [1.0], [2.0], [3.0]])
    w, b, _ = train.gradient_descent(X, 3 * X[:, 0] + 2, rate=0.05, steps=2000)
    assert w == approx([3], abs=1e-3)
    assert b == approx(2, abs=1e-3)


def test_descent_history_starts_at_zero_weights_and_only_goes_down():
    from houses import train
    X = np.array([[0.0], [1.0], [2.0], [3.0]])
    y = 3 * X[:, 0] + 2
    _, _, history = train.gradient_descent(X, y, rate=0.05, steps=50)
    assert len(history) == 51, "the loss before training, then once per step"
    assert history[0] == approx(np.mean(y ** 2)), "all weights start at 0, so every prediction starts at 0"
    assert all(later <= earlier for earlier, later in zip(history, history[1:]))


def test_scaling_gives_each_column_mean_zero_and_standard_deviation_one():
    from houses import scaling
    X = np.array([[1000.0, 1.0], [2000.0, 3.0], [3000.0, 5.0]])
    Z = scaling.Standardizer().fit(X).transform(X)
    assert Z.mean(axis=0) == approx([0, 0], abs=1e-12)
    assert Z.std(axis=0) == approx([1, 1])


def test_scaling_reuses_the_statistics_it_was_fitted_on():
    from houses import scaling
    scaler = scaling.Standardizer().fit(np.array([[0.0], [10.0]]))
    assert scaler.transform(np.array([[5.0], [15.0]])) == approx(np.array([[0.0], [2.0]]))


def test_scaling_leaves_a_constant_column_finite():
    from houses import scaling
    Z = scaling.Standardizer().fit(np.array([[7.0], [7.0]])).transform(np.array([[7.0], [7.0]]))
    assert np.all(np.isfinite(Z))


def test_scaling_unscale_gives_the_same_predictions_in_original_units():
    from houses import scaling
    rng = np.random.default_rng(2)
    X = rng.normal(loc=[1500, 3], scale=[400, 1], size=(10, 2))
    scaler = scaling.Standardizer().fit(X)
    w_scaled, b_scaled = np.array([60000.0, -4000.0]), 250000.0
    w, b = scaler.unscale(w_scaled, b_scaled)
    assert model.predict(X, w, b) == approx(model.predict(scaler.transform(X), w_scaled, b_scaled))
```

The first test is a **gradient check**, as in lesson 2.3, now for every parameter: `numerical_gradient` nudges each weight and the bias by a tiny $h$ in both directions and measures the change in loss. It's slow (two loss calculations per parameter) but too simple to get wrong, so it's the reference your exact formula must match, on random data where there's no pattern to get lucky with.

```check
file tests/test_train.py -- Click "Create provided tests/test_train.py" above.
```

## The gradient of the loss

The loss depends on every weight $w_j$ and on $b$. Take the partial derivative with respect to one weight. For one house, the error is $e_i = \hat{y}_i - y_i$ where $\hat{y}_i = \sum_j w_j x_{ij} + b$. Changing $w_j$ changes $\hat{y}_i$ at the rate $x_{ij}$ (the feature it multiplies), and $e_i^2$ changes at the rate $2e_i$ per unit of $e_i$. The chain rule multiplies them, as in lesson 2.3:

$$\frac{\partial\,\text{MSE}}{\partial w_j} = \frac{1}{n}\sum_{i=1}^{n} 2\,e_i\,x_{ij} \qquad \frac{\partial\,\text{MSE}}{\partial b} = \frac{1}{n}\sum_{i=1}^{n} 2\,e_i$$

($b$ is multiplied by nothing, so its rate is 1.)

Now look at the first sum for every $j$ at once. For each feature $j$ it's the dot product of the errors with column $j$ of $X$: a dot product with every **column** of $X$, which is a dot product with every **row** of $X^\top$. So the whole weight gradient is one matrix–vector product:

$$\nabla_{\mathbf{w}}\,\text{MSE} = \frac{2}{n}\,X^\top \mathbf{e}$$

Add it to `houses/model.py`:

```python file=houses/model.py
import numpy as np


def predict(X: np.ndarray, w: np.ndarray, b: float) -> np.ndarray:
    return X @ w + b


def mse(y: np.ndarray, predictions: np.ndarray) -> float:
    return float(np.mean((predictions - y) ** 2))


def rmse(y: np.ndarray, predictions: np.ndarray) -> float:
    return float(np.sqrt(mse(y, predictions)))


def gradients(X: np.ndarray, y: np.ndarray, w: np.ndarray, b: float) -> tuple[np.ndarray, float]:
    errors = predict(X, w, b) - y
    n = len(y)
    return 2 / n * (X.T @ errors), 2 / n * float(errors.sum())
```

`X.T` is NumPy's transpose. Check the shapes: `X.T` is (features × houses), `errors` is (houses,), so `X.T @ errors` is (features,): one number per weight, as a gradient must be.

Read the formula as a sentence, because it says something real: **each weight is pushed by the errors, in proportion to its feature.** If the model under-predicts big houses (negative errors where `sqft` is large), the gradient for the `sqft` weight is strongly negative, and the step raises that weight. Houses the model already gets right contribute nothing.

```check
run ".venv/Scripts/python -m pytest -q tests/test_train.py -k test_gradient" label="the gradient formula matches the numerical gradient" -- grad_w is 2 / n * (X.T @ errors); grad_b is 2 / n times the sum of the errors.
```

## The training loop

Now gradient descent, exactly as in lesson 2.4: start somewhere, step against the gradient, repeat. Create `houses/train.py`:

```python file=houses/train.py
import numpy as np

from houses import model


def gradient_descent(X: np.ndarray, y: np.ndarray, rate: float, steps: int) -> tuple[np.ndarray, float, list[float]]:
    w = np.zeros(X.shape[1])
    b = 0.0
    history = [model.mse(y, model.predict(X, w, b))]
    for _ in range(steps):
        grad_w, grad_b = model.gradients(X, y, w, b)
        w = w - rate * grad_w
        b = b - rate * grad_b
        history.append(model.mse(y, model.predict(X, w, b)))
    return w, b, history
```

- **Start at zero.** `np.zeros(X.shape[1])`: one weight per column of `X`, all 0. Every prediction starts at 0.
- **Step.** Each parameter moves against its own partial derivative, scaled by the learning rate.
- **Record.** `history` holds the loss before training and after every step. A training loop that doesn't record its loss is a black box: the history is how you see whether it's learning, stuck or exploding.

On the tiny test data, a perfect line $y = 3x + 2$, 2,000 steps at rate 0.05 recover $w = 3$ and $b = 2$ to three decimal places, and the loss never rises.

```check
run ".venv/Scripts/python -m pytest -q tests/test_train.py -k descent" label="gradient descent recovers a known line, and its loss only goes down" -- Each step: w = w - rate * grad_w and b = b - rate * grad_b, then record the loss.
```

## Train on the houses

Now real data. Create `fit.py`, which trains on the houses with a learning rate and number of steps from the command line:

```python file=fit.py
import sys

import numpy as np

from houses import data, model, train

X, y = data.load("data/houses.csv", ["sqft"])
rate = float(sys.argv[1])
steps = int(sys.argv[2])

with np.errstate(over="ignore", invalid="ignore"):
    w, b, history = train.gradient_descent(X, y, rate, steps)

print(f"loss after 0, 1, 2, 3 steps: {[f'{loss:.3g}' for loss in history[:4]]}")
print(f"after {steps} steps at rate {rate:g}: w = {w[0]:.2f}, b = {b:,.2f}, RMSE {model.rmse(y, model.predict(X, w, b)):,.0f}")
```

`np.errstate(over="ignore", invalid="ignore")` stops NumPy printing warnings about numbers too large to store. You're about to make some, on purpose. Start with an ordinary-looking learning rate:

```powershell
.venv\Scripts\python fit.py 0.001 100
```

```predict
question: The house data, rate 0.001, 100 steps. What happens?
choice: It converges to about w = 157, b = 8,000
choice: It converges, but slowly: about halfway there after 100 steps
choice: The loss explodes, and w, b and the RMSE all end up nan
answer: The loss explodes, and w, b and the RMSE all end up nan
explain: The loss goes 6.6e10, 1.6e18, 4.0e25, 9.8e32: multiplying by about 25 million every step, until the numbers overflow what a float can hold and become `inf`, and then `nan` ("not a number", from inf − inf).

The first gradient tells you why. At w = 0, b = 0, ∂MSE/∂w is about −805,000,000 (the errors are hundreds of thousands of dollars, and each is multiplied by an area of about 1,500 square feet). A rate of 0.001 times that is a step of 805,000 dollars per square foot. This is lesson 2.4's "steepest direction limits the learning rate", with a landscape a million times steeper in w than in b.
```

So use a far smaller rate:

```powershell
.venv\Scripts\python fit.py 0.0000001 1000
```

```text
loss after 0, 1, 2, 3 steps: ['6.6e+10', '1.73e+10', '4.98e+09', '1.87e+09']
after 1000 steps at rate 1e-07: w = 161.90, b = 0.22, RMSE 28,611
```

It converges, and the RMSE looks good. But look at $b$: **0.22 dollars**, after a thousand steps. The grid search said about 10,000. The weight has been learned; the bias has barely moved, because its gradient is about 1,600 times smaller than the weight's (an error of 1,000 dollars pushes $b$ by 1,000 and $w$ by 1,000 × 1,500), so with a rate small enough not to explode in $w$, $b$ takes millions of steps to get anywhere. The model has compensated by making $w$ too steep. It's a wrong model that happens to score reasonably on this data, which is the most dangerous kind.

```check
run ".venv/Scripts/python fit.py 0.001 100" stdout="RMSE nan" label="at rate 0.001, training on raw square feet explodes"
run ".venv/Scripts/python fit.py 0.0000001 1000" stdout="b = 0.22" label="at rate 1e-7, the bias barely moves"
```

## Standardise the features

The fix is to change the landscape, not the learning rate. If every feature were on the same scale, roughly between −2 and 2, every direction of the landscape would have similar steepness and one learning rate would suit them all.

**Standardising** a feature subtracts its mean and divides by its standard deviation:

$$z = \frac{x - \mu}{\sigma}$$

A house of average area gets $z = 0$; one standard deviation bigger gets $z = 1$. This is a **z-score**, and it's lesson 1.2's mean and standard deviation, used to measure each value in "standard deviations from typical". Create `houses/scaling.py`:

```python file=houses/scaling.py
import numpy as np


class Standardizer:
    def fit(self, X: np.ndarray) -> "Standardizer":
        self.mean_ = X.mean(axis=0)
        std = X.std(axis=0)
        self.std_ = np.where(std == 0, 1.0, std)
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        return (X - self.mean_) / self.std_

    def unscale(self, w: np.ndarray, b: float) -> tuple[np.ndarray, float]:
        w_original = w / self.std_
        return w_original, b - float(w_original @ self.mean_)
```

This is your first class with **methods** that share **state**: `fit` computes and stores the means and standard deviations on the object (`self.mean_`), and `transform` and `unscale` use them later. That's why it's a class and not three functions: the three operations need to share the numbers `fit` learned. (The trailing underscore in `mean_` is scikit-learn's convention for "learned by `fit`"; you'll see the same names there in lesson 3.4.)

- **`X.mean(axis=0)`** takes the mean **down each column**: axis 0 is the rows, and averaging *across* rows leaves one number per column. So `mean_` has one entry per feature.
- **`(X - self.mean_) / self.std_`** is broadcasting: a (houses × features) matrix minus a (features,) vector subtracts each feature's mean from its own column.
- **`np.where(std == 0, 1.0, std)`**: a column that never varies has standard deviation 0, and dividing by 0 gives `nan`. Dividing it by 1 instead leaves it as all zeros after centring, which is harmless.
- **`fit` returns `self`**, so `Standardizer().fit(X).transform(X)` works in one line. scikit-learn's classes do the same.
- **`transform` uses the stored statistics, not new ones.** The second scaling test checks this, and it matters more than it looks: when a new house arrives, it must be scaled with the *training* data's mean and standard deviation, the ones the weights were learned with. Recomputing them from the new data would make the same house mean something different. (Part XIX calls the mistake in the other direction, computing them on data that includes the test set, **leakage**.)

**`unscale`** turns weights learned on standardised features back into dollars per square foot. Substituting $z = (x - \mu)/\sigma$ into $\hat{y} = wz + b$:

$$\hat{y} = w\frac{x - \mu}{\sigma} + b = \frac{w}{\sigma}\,x + \left(b - \frac{w}{\sigma}\mu\right)$$

So the original-units weight is $w/\sigma$ and the bias is $b - (w/\sigma)\cdot\mu$: exactly the two lines of `unscale`. The last test checks that both versions make identical predictions.

```check
run ".venv/Scripts/python -m pytest -q tests/test_train.py" label="every training and scaling test passes" -- transform must use the mean_ and std_ stored by fit.
```

## Train again, on standardised features

Update `fit.py` to standardise before training and unscale after:

```python file=fit.py
import sys

import numpy as np

from houses import data, model, scaling, train

X, y = data.load("data/houses.csv", ["sqft"])
rate = float(sys.argv[1])
steps = int(sys.argv[2])

scaler = scaling.Standardizer().fit(X)
with np.errstate(over="ignore", invalid="ignore"):
    w_scaled, b_scaled, history = train.gradient_descent(scaler.transform(X), y, rate, steps)
w, b = scaler.unscale(w_scaled, b_scaled)

print(f"loss after 0, 1, 2, 3 steps: {[f'{loss:.3g}' for loss in history[:4]]}")
print(f"after {steps} steps at rate {rate:g}: w = {w[0]:.2f}, b = {b:,.2f}, RMSE {model.rmse(y, model.predict(X, w, b)):,.0f}")

exact, *_ = np.linalg.lstsq(np.column_stack([X, np.ones(len(y))]), y, rcond=None)
print(f"exact least-squares answer:  w = {exact[0]:.2f}, b = {exact[1]:,.2f}")
```

The last two lines compute the **exact** best line, by a different method, to check against: `np.linalg.lstsq` solves the least-squares problem directly with linear algebra (lesson 3.4 explains how). `np.column_stack([X, np.ones(...)])` adds a column of 1s to `X`, so the bias becomes just another weight, the one multiplying 1.

```powershell
.venv\Scripts\python fit.py 0.1 100
```

```text
loss after 0, 1, 2, 3 steps: ['6.6e+10', '4.32e+10', '2.85e+10', '1.9e+10']
after 100 steps at rate 0.1: w = 156.79, b = 8,367.98, RMSE 28,521
exact least-squares answer:  w = 156.79, b = 8,367.98
```

A hundred steps at an ordinary learning rate, and gradient descent agrees with the exact answer to the cent: **156.79 dollars per square foot on top of 8,368 dollars**. The grid search's "155 and 10,000" was close; this is the actual minimum. And the RMSE, 28,521, is the smallest any straight line through these houses can achieve.

```predict
question: With standardised features, what happens at learning rate 1.1?
choice: It converges faster than at 0.1
choice: It explodes, like the raw features did at 0.001
choice: It converges to a different answer
answer: It explodes, like the raw features did at 0.001
explain: Standardising doesn't remove the limit on the learning rate; it makes the limit the same in every direction and puts it somewhere sensible. For one standardised feature the loss's curvature is 2 in both w and b, so each step multiplies the distance to the answer by (1 − 2 × rate): 0.8 at rate 0.1, 0 at rate 0.5 (one step, done), and −1.2 at rate 1.1: overshoot, growing. Try `fit.py 0.5 10` and `fit.py 1.1 20` to see both.
```

```check
run ".venv/Scripts/python fit.py 0.1 100" stdout="w = 156.79, b = 8,367.98, RMSE 28,521" label="with standardised features, gradient descent finds the exact best line"
run ".venv/Scripts/python fit.py 1.1 20" without="RMSE 28,521" label="and a learning rate above 1 still diverges"
```

You've now written the algorithm behind `fit()`. Next lesson wraps it in a class with `fit` and `predict`, gives it several features, and asks the question that matters most: does it work on houses it has never seen?
