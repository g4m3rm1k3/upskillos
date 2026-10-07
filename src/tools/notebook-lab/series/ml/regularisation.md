# Regularisation

The last lesson ended with a choice for fighting overfitting: collect more data, or use a simpler model. There is a third option, and it is often the best. Keep the flexible model, but change the loss so that it **penalises** the model for being too extreme. This is called **regularisation**, and some form of it is used in almost every serious model, from linear regression to the largest neural networks.

The idea rests on an observation about what overfitting looks like inside a model: an overfitted model usually has **huge weights**, large positive and negative numbers that nearly cancel out, which is how it manages to swing wildly through every training point. Penalise large weights, and the model is pushed towards smoother, calmer fits. This lesson builds **ridge regression** from scratch, then **lasso**, which can switch useless features off entirely, and shows how to choose the strength of the penalty.

## What overfitting looks like inside the model

Here is a degree-12 polynomial, as in the last two lessons, fitted to 20 noisy points. Look at the size of its fitted weights compared with a degree-3 fit:

```python type
import numpy as np

rng = np.random.default_rng(0)
x = rng.uniform(-1, 1, 20)
y = np.sin(3 * x) + rng.normal(0, 0.3, 20)

for degree in [3, 12]:
    weights = np.polyfit(x, y, degree)
    print(f"degree {degree:>2}: largest weight {np.abs(weights).max():,.0f}")
```

```output
degree  3: largest weight 2
degree 12: largest weight 492
```

The degree-3 weights are small, a few units at most. The degree-12 weights run into the hundreds, large positive and negative terms fighting each other so that the curve can bend sharply enough to pass near every noisy point. A smooth curve does not need weights like that. So large weights are a symptom of overfitting, and discouraging them is a cure.

## Ridge regression

**Ridge regression** adds a penalty on the sum of the squared weights to the loss:

\[
L(\theta) = \sum_i (\hat{y}_i - y_i)^2 + \lambda \sum_j w_j^2
\]

The first term is the usual sum of squared errors: fit the data. The second is the **penalty**: keep the weights small. The number λ (lambda), the **regularisation strength**, sets the balance between them. With λ = 0 it is ordinary least squares. As λ grows, the model accepts a slightly worse fit to the training data in exchange for smaller weights. The bias `b` is not penalised: shifting every prediction up or down does nothing to make the curve wiggly, so there is no reason to discourage it. (Using the sum rather than the mean of the squared errors here matches the convention scikit-learn uses, so its λ, which it calls `alpha`, means the same thing.)

The penalty `Σ wⱼ²` is the squared length of the weight vector, its **L2 norm** squared, which is why ridge is also called **L2 regularisation**.

## Ridge from scratch

Setting the gradient to zero, as for the normal equation, gives ridge an exact solution too. The penalty's gradient is `2λw`, which adds `λ` to the diagonal of `X̃ᵀX̃` for every weight, but not for the bias:

\[
(\tilde{X}^T \tilde{X} + \lambda I') \, \theta = \tilde{X}^T y
\]

where `I'` is the identity matrix with its first diagonal entry (the bias's) set to zero. Adding λ to the diagonal has a second benefit: it makes the matrix invertible even when features are collinear, which fixes the unstable weights you saw in the multiple regression lesson.

The next cell fits the degree-12 polynomial with four strengths of penalty. Predict before running: what will the curve look like with a tiny λ, and with a large one?

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
x = rng.uniform(-1, 1, 20)
y = np.sin(3 * x) + rng.normal(0, 0.3, 20)

def poly(x, degree):
    return np.column_stack([np.ones(len(x))] + [x ** k for k in range(1, degree + 1)])

def ridge(A, y, lam):
    penalty = lam * np.eye(A.shape[1])
    penalty[0, 0] = 0
    return np.linalg.solve(A.T @ A + penalty, A.T @ y)

grid = np.linspace(-1, 1, 200)
fig, ax = plt.subplots()
ax.scatter(x, y, color="black", s=15)
for lam in [0, 0.001, 0.1, 10]:
    theta = ridge(poly(x, 12), y, lam)
    ax.plot(grid, poly(grid, 12) @ theta, label=f"λ = {lam}, largest weight {np.abs(theta[1:]).max():.1f}")
ax.plot(grid, np.sin(3 * grid), "k--", label="true function")
ax.set_ylim(-2, 2)
ax.legend(fontsize=8)
plt.show()
```

With λ = 0 it swings wildly. A tiny penalty, λ = 0.001, already tames it, and λ = 0.1 gives a smooth curve close to the true function. But λ = 10 is too strong: the weights are squashed so hard that the curve flattens towards a horizontal line and **underfits**. λ is itself a dial between overfitting and underfitting, exactly like the polynomial degree, but a much smoother one.

## The weights shrink smoothly

A plot of every weight against λ, called a **regularisation path**, shows the shrinking:

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(1)
X = rng.normal(size=(60, 6))
y = X @ np.array([3.0, -2.0, 1.5, 0.0, 0.0, 0.5]) + rng.normal(0, 1, 60)
A = np.column_stack([np.ones(60), X])

lams = np.logspace(-2, 4, 60)
paths = []
for lam in lams:
    penalty = lam * np.eye(7)
    penalty[0, 0] = 0
    paths.append(np.linalg.solve(A.T @ A + penalty, A.T @ y)[1:])

fig, ax = plt.subplots()
ax.plot(lams, np.array(paths))
ax.set_xscale("log")
ax.set_xlabel("λ")
ax.set_ylabel("weight")
ax.set_title("Ridge shrinks every weight smoothly towards zero")
plt.show()
```

`np.logspace(-2, 4, 60)` makes 60 values spread evenly on a logarithmic scale from 10⁻² to 10⁴, the natural way to try regularisation strengths. The weights shrink smoothly towards zero overall as λ grows, the large ones fastest in absolute terms (a small one may cross zero on the way), but none of them settles at exactly zero.

## Ridge and collinear features

The multiple regression lesson found that `s1` and `s2` in the diabetes data, correlated at 0.9, got huge weights of opposite sign. Ridge calms them down, because two large opposing weights pay a large penalty, while two moderate ones that make almost the same predictions pay much less. Predict what happens to the `s1` and `s2` weights as λ grows, and to BMI's:

```python type
import numpy as np
import pandas as pd
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
features = df.drop(columns="target")
Z = ((features - features.mean()) / features.std(ddof=0)).to_numpy()
A = np.column_stack([np.ones(len(Z)), Z])
y = df["target"].to_numpy()

for lam in [0, 10, 100]:
    penalty = lam * np.eye(A.shape[1])
    penalty[0, 0] = 0
    theta = np.linalg.solve(A.T @ A + penalty, A.T @ y)
    w = pd.Series(theta[1:], index=features.columns)
    print(f"λ = {lam:>3}: s1 {w['s1']:7.1f}, s2 {w['s2']:6.1f}, bmi {w['bmi']:5.1f}")
```

```output
λ =   0: s1   -37.7, s2   22.7, bmi  24.7
λ =  10: s1   -11.3, s2    1.8, bmi  24.6
λ = 100: s1    -2.1, s2   -3.7, bmi  21.4
```

As λ grows, the opposing `s1` and `s2` weights move towards each other and towards modest values, while BMI's weight, which carries real information, changes only a little.

## Standardise first

The penalty treats every weight equally, but a weight's size depends on its feature's units. A feature measured in millimetres needs a weight a thousand times smaller than the same feature in metres, and since the penalty squares the weight, it is penalised a **million** times less. The same information, in different units, gets a completely different amount of regularisation:

```python type
import numpy as np

rng = np.random.default_rng(4)
X = rng.normal(size=(50, 2))
y = X @ np.array([2.0, 2.0]) + rng.normal(0, 0.5, 50)

def ridge(X, y, lam):
    A = np.column_stack([np.ones(len(X)), X])
    penalty = lam * np.eye(A.shape[1])
    penalty[0, 0] = 0
    return np.linalg.solve(A.T @ A + penalty, A.T @ y)

print("same units:            ", ridge(X, y, 20)[1:].round(3))
X_mixed = X * np.array([1.0, 1000.0])
w = ridge(X_mixed, y, 20)[1:]
print("second feature × 1000: ", w.round(5), "→ back in the original units:", (w * [1, 1000]).round(3))
```

```output
same units:             [1.411 1.388]
second feature × 1000:  [1.44518 0.00194] → back in the original units: [1.445 1.937]
```

Both features matter equally. With the same units, ridge shrinks both weights by the same amount. When the second feature is measured in units a thousand times smaller, its weight becomes tiny, the penalty barely touches it, and in effect only the first feature is regularised. To make the penalty fair, **standardise the features** before fitting a regularised model, so every weight is on the same scale. (As before: compute the standardisation from the training set only.) The polynomial demos in this lesson skip this step only because every power of an `x` between −1 and 1 already stays between −1 and 1.

## Lasso: switching features off

**Lasso** (short for "least absolute shrinkage and selection operator") uses the sum of the **absolute** weights as its penalty, the **L1 norm**:

\[
L(\theta) = \sum_i (\hat{y}_i - y_i)^2 + \lambda \sum_j |w_j|
\]

The change looks small, but its effect is striking: lasso drives many weights to **exactly zero**, switching those features off completely. It performs **feature selection** automatically. There is no exact formula for lasso, because the absolute value has a corner at zero, so it is fitted by an iterative method; scikit-learn's `Lasso` does it. (Its `alpha` is scaled differently from ridge's, dividing the squared errors by `2n`, so the two are not directly comparable.)

```python type
import numpy as np
from sklearn.linear_model import Lasso, Ridge

rng = np.random.default_rng(2)
X = rng.normal(size=(100, 10))
y = X @ np.array([4.0, -3.0, 2.0, 0, 0, 0, 0, 0, 0, 0]) + rng.normal(0, 1, 100)

print("ridge:", Ridge(alpha=10).fit(X, y).coef_.round(2))
print("lasso:", Lasso(alpha=0.3).fit(X, y).coef_.round(2))
```

```output
ridge: [ 3.65 -2.68  1.74  0.08  0.18 -0.02  0.01  0.17 -0.04  0.02]
lasso: [ 3.73 -2.69  1.61  0.    0.   -0.   -0.    0.   -0.    0.  ]
```

Before looking at the output, predict how many of the ten weights each method will set to exactly zero. Only the first three features matter; the other seven are pure noise. Ridge shrinks all ten weights a little but keeps every one non-zero. Lasso sets all seven useless weights to exactly 0, leaving a simpler model that says clearly which features matter. When you suspect most features are irrelevant, lasso is the natural choice.

Why the difference? Near zero, the squared penalty `w²` becomes tiny, so ridge has almost no reason to push a small weight the last bit of the way to zero. The absolute penalty `|w|` keeps pulling with the same strength all the way down, so lasso pushes a weakly useful weight right to zero. (A method called **elastic net** mixes both penalties.)

## Choosing λ

λ is a hyperparameter, so it is chosen the same way as the polynomial degree: fit with several values on the training data, measure on a validation set, keep the best. Try values spread over several powers of ten.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(3)
x = rng.uniform(-1, 1, 200)
y = np.sin(3 * x) + rng.normal(0, 0.3, 200)
x_train, y_train, x_val, y_val = x[:25], y[:25], x[25:], y[25:]

def poly(x, degree=12):
    return np.column_stack([np.ones(len(x))] + [x ** k for k in range(1, degree + 1)])

lams = np.logspace(-6, 2, 40)
train_err, val_err = [], []
for lam in lams:
    penalty = lam * np.eye(13)
    penalty[0, 0] = 0
    A = poly(x_train)
    theta = np.linalg.solve(A.T @ A + penalty, A.T @ y_train)
    train_err.append(np.mean((A @ theta - y_train) ** 2))
    val_err.append(np.mean((poly(x_val) @ theta - y_val) ** 2))

fig, ax = plt.subplots()
ax.plot(lams, train_err, label="training")
ax.plot(lams, val_err, label="validation")
ax.set_xscale("log")
ax.set_yscale("log")
ax.set_xlabel("λ (regularisation strength)")
ax.set_ylabel("MSE")
ax.legend()
plt.show()
print("best λ:", lams[int(np.argmin(val_err))].round(5))
```

```output
best λ: 0.03257
```

This is the complexity curve from the last lesson, mirrored: **small** λ means a flexible model (overfitting, on the left), **large** λ a constrained one (underfitting, on the right). Training error rises steadily with λ, since the penalty always costs some fit, while validation error falls to a minimum and rises again. Pick the λ at the minimum.

::: challenge Ridge from scratch [easy]
Write a function `ridge_fit(X, y, lam)` that takes a 2D feature array `X` (without a column of ones) and returns `theta`, whose first element is the bias and the rest the weights, minimising the ridge loss from the lesson, with the bias **not** penalised. Use the exact formula.

The check compares your answer with scikit-learn's `Ridge(alpha=lam)`, which minimises exactly this loss.

```python starter
import numpy as np

def ridge_fit(X, y, lam):
    A = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(A.T @ A, A.T @ y)
```

```python solution
import numpy as np

def ridge_fit(X, y, lam):
    A = np.column_stack([np.ones(len(X)), X])
    penalty = lam * np.eye(A.shape[1])
    penalty[0, 0] = 0
    return np.linalg.solve(A.T @ A + penalty, A.T @ y)
```

```python test
import numpy as _np
from sklearn.linear_model import Ridge as _Ridge
assert "ridge_fit" in dir(), "Keep the function's name as ridge_fit."
_rng = _np.random.default_rng(4)
_X = _rng.normal(size=(50, 4))
_y = _X @ _np.array([1.0, -2.0, 0.5, 3.0]) + 7 + _rng.normal(0, 0.5, 50)
for _lam in [0.0, 1.0, 50.0]:
    _t = ridge_fit(_X, _y, _lam)
    _m = _Ridge(alpha=_lam).fit(_X, _y) if _lam > 0 else None
    if _m is not None:
        assert _np.allclose(_t[1:], _m.coef_, atol=1e-6) and _np.isclose(_t[0], _m.intercept_, atol=1e-6), f"With λ = {_lam} the weights should be {_np.round(_m.coef_, 4)} and bias {_m.intercept_:.4f}, but got {_np.round(_t[1:], 4)} and {_t[0]:.4f}. Is the bias left unpenalised?"
    else:
        assert _np.allclose(_t, _np.linalg.lstsq(_np.column_stack([_np.ones(50), _X]), _y)[0]), "With λ = 0 ridge is ordinary least squares."
_big = ridge_fit(_X, _y, 1e6)
assert _np.abs(_big[1:]).max() < 0.05 and abs(_big[0] - _y.mean()) < 0.1, "With a huge λ the weights should be near 0 and the bias near the mean of y."
"SUCCESS: Ridge regression in four lines, matching scikit-learn exactly."
```

Hint: The only change from the normal equation is adding λ times the identity matrix to `AᵀA`, with the entry for the bias set to 0.
:::

::: challenge Fair ridge [medium]
Write a function `fair_ridge(X, y, lam)` that fits ridge regression **fairly**, as the lesson recommends, and reports the answer in the original units:

1. standardise each column of `X` with its own mean and standard deviation (NumPy's default `std`);
2. fit ridge with strength `lam` on the standardised features, leaving the bias unpenalised;
3. convert the result back so that it applies to the **original**, unstandardised `X`, and return `theta`: the bias first, then one weight per original feature.

The returned `theta` must satisfy: `np.column_stack([np.ones(len(X)), X]) @ theta` equals the predictions of the standardised model. Because the penalty is applied after standardising, rescaling a feature (say, from metres to millimetres) must **not** change the predictions.

```python starter
import numpy as np

def fair_ridge(X, y, lam):
    A = np.column_stack([np.ones(len(X)), X])
    penalty = lam * np.eye(A.shape[1])
    penalty[0, 0] = 0
    return np.linalg.solve(A.T @ A + penalty, A.T @ y)
```

```python solution
import numpy as np

def fair_ridge(X, y, lam):
    mean, std = X.mean(axis=0), X.std(axis=0)
    Z = (X - mean) / std
    A = np.column_stack([np.ones(len(Z)), Z])
    penalty = lam * np.eye(A.shape[1])
    penalty[0, 0] = 0
    theta_z = np.linalg.solve(A.T @ A + penalty, A.T @ y)
    weights = theta_z[1:] / std
    bias = theta_z[0] - np.sum(theta_z[1:] * mean / std)
    return np.concatenate([[bias], weights])
```

```python test
import numpy as _np
assert "fair_ridge" in dir(), "Keep the function's name as fair_ridge."
_rng = _np.random.default_rng(7)
_X = _rng.normal([5, 100, -2], [1, 30, 0.5], size=(60, 3))
_y = _X @ _np.array([2.0, 0.05, -4.0]) + 3 + _rng.normal(0, 0.5, 60)
_m, _s = _X.mean(axis=0), _X.std(axis=0)
_Z = (_X - _m) / _s
_A = _np.column_stack([_np.ones(60), _Z])
_P = 10.0 * _np.eye(4)
_P[0, 0] = 0
_tz = _np.linalg.solve(_A.T @ _A + _P, _A.T @ _y)
_want_pred = _A @ _tz
_t = _np.asarray(fair_ridge(_X, _y, 10.0))
assert _t.shape == (4,), f"Return the bias followed by one weight per feature: 4 numbers, but got shape {_t.shape}."
assert _np.allclose(_np.column_stack([_np.ones(60), _X]) @ _t, _want_pred), "Applied to the original X, your theta should give the same predictions as ridge on the standardised features. Check the conversion of the weights and the bias."
_scaled = _X * _np.array([1.0, 1000.0, 1.0])
_ts = _np.asarray(fair_ridge(_scaled, _y, 10.0))
assert _np.allclose(_np.column_stack([_np.ones(60), _scaled]) @ _ts, _want_pred), "Rescaling a feature must not change the predictions of a fairly regularised model."
"SUCCESS: The penalty sees every feature on the same scale, and the answer comes back in the units you started with."
```

Hint: The conversion is the one from the gradient descent lesson's "Train a line" challenge, for several features at once: substitute `z = (x − mean) / std` into `b_z + Σ w_z z` and collect the terms in each `x` and the constant terms.
:::

::: challenge Let lasso choose the features [easy]
The starter makes a dataset with 20 features, only some of which actually affect `y`. Fit scikit-learn's `Lasso(alpha=0.2, max_iter=10000)` to it and store, in `chosen`, a sorted list of the **indexes** of the features whose weights are not zero. Then fit `Ridge(alpha=10)` and store in `ridge_nonzero` the number of its weights that are not zero.

`np.flatnonzero(array)` gives the positions of the non-zero entries of an array.

```python starter
import numpy as np
from sklearn.linear_model import Lasso, Ridge

rng = np.random.default_rng(6)
X = rng.normal(size=(150, 20))
true_weights = np.zeros(20)
true_weights[[2, 7, 11]] = [3.0, -2.0, 4.0]
y = X @ true_weights + rng.normal(0, 1, 150)

chosen = []
ridge_nonzero = 0
print(chosen, ridge_nonzero)
```

```python solution
import numpy as np
from sklearn.linear_model import Lasso, Ridge

rng = np.random.default_rng(6)
X = rng.normal(size=(150, 20))
true_weights = np.zeros(20)
true_weights[[2, 7, 11]] = [3.0, -2.0, 4.0]
y = X @ true_weights + rng.normal(0, 1, 150)

lasso = Lasso(alpha=0.2, max_iter=10000).fit(X, y)
chosen = sorted(np.flatnonzero(lasso.coef_).tolist())
ridge_nonzero = int(np.count_nonzero(Ridge(alpha=10).fit(X, y).coef_))
print(chosen, ridge_nonzero)
```

```python test
import numpy as _np
from sklearn.linear_model import Lasso as _L, Ridge as _R
_rng = _np.random.default_rng(6)
_X = _rng.normal(size=(150, 20))
_tw = _np.zeros(20)
_tw[[2, 7, 11]] = [3.0, -2.0, 4.0]
_y = _X @ _tw + _rng.normal(0, 1, 150)
_want = sorted(_np.flatnonzero(_L(alpha=0.2, max_iter=10000).fit(_X, _y).coef_).tolist())
assert list(chosen) == _want, f"Lasso keeps the features {_want}, but chosen is {list(chosen)}."
assert all(i in chosen for i in [2, 7, 11]), "The three real features should all be chosen."
assert ridge_nonzero == 20, f"Ridge keeps every weight non-zero, so ridge_nonzero should be 20, but it is {ridge_nonzero}."
"SUCCESS: Lasso found the features that matter, and ridge kept all twenty."
```

Hint: After fitting, `model.coef_` holds the weights. `np.flatnonzero(lasso.coef_)` gives the positions of the non-zero ones; `.tolist()` turns them into a list. For ridge, `np.count_nonzero` counts them.
:::

## What you learned

- Overfitted models tend to have huge, opposing weights. Regularisation adds a penalty on weight size to the loss: loss = fit + λ × penalty. The bias is not penalised.
- Ridge (L2) penalises the sum of squared weights. It has an exact solution, `(X̃ᵀX̃ + λI′)θ = X̃ᵀy`, and it also stabilises collinear features.
- As λ grows, ridge shrinks every weight smoothly towards zero but never exactly to zero; too large a λ underfits.
- Standardise features before regularising, so the penalty treats them fairly.
- Lasso (L1) penalises the sum of absolute weights and sets many weights to exactly zero, selecting features automatically. scikit-learn's `Ridge` and `Lasso` take the strength as `alpha`.
- Choose λ like any hyperparameter: try values spread over powers of ten and keep the one with the lowest validation error.

Every choice so far, the degree, λ, has used a single validation split. Next you will learn to make those choices more reliably, and to estimate a model's performance honestly, with cross-validation.
