# Overfitting and the bias–variance trade-off

The "what learning is" lesson showed a polynomial of degree 12 that fitted its training points beautifully and predicted new points terribly. That failure, **overfitting**, is the central practical problem of machine learning, and its opposite, **underfitting**, is nearly as common. Every model you ever train sits somewhere between the two, and a large part of the craft is finding the right spot.

This lesson builds the tools to understand where a model sits. First, a way to make linear regression fit curves, so that model flexibility becomes a dial you can turn. Then the **bias–variance decomposition**, which splits a model's error into two parts with opposite causes, measured here by simulating many datasets. And finally **learning curves**, which tell you whether more data would help. Together they answer the question every project asks: is my model too simple, too complex, or starved of data?

## Curves from linear regression

Linear regression fits `ŷ = w · x + b`: a weighted sum of the features. Nothing says the features must be the raw measurements. Give it `x`, `x²` and `x³` as three separate features, and it fits

\[
\hat{y} = w_1 x + w_2 x^2 + w_3 x^3 + b
\]

a curve in `x`, while still being **linear in the parameters**: the weights still just multiply features and add up, so the normal equation and gradient descent work exactly as before. Creating new features from old ones like this is called **feature engineering**, and powers of a feature are called **polynomial features**.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
x = rng.uniform(-3, 3, 50)
y = 0.5 * x ** 3 - 2 * x + rng.normal(0, 1.5, 50)

def poly_features(x, degree):
    return np.column_stack([x ** k for k in range(1, degree + 1)])

A = np.column_stack([np.ones(len(x)), poly_features(x, 3)])
theta = np.linalg.lstsq(A, y)[0]
print("fitted bias and weights:", theta.round(2))

grid = np.linspace(-3, 3, 200)
fig, ax = plt.subplots()
ax.scatter(x, y, s=12, color="black")
ax.plot(grid, np.column_stack([np.ones(200), poly_features(grid, 3)]) @ theta, color="tab:red")
plt.show()
```

```output
fitted bias and weights: [ 0.07 -1.81 -0.02  0.49]
```

The data was made from `0.5x³ − 2x` plus noise, and the fitted weights come out close to 0, −2, 0 and 0.5. (`np.polyfit(x, y, 3)` does exactly this fit; building the features yourself shows what it does inside.) The degree of the polynomial is now a dial controlling how flexible the model is. (With high degrees, powers like `x¹²` become enormous and cause numerical trouble; standardising `x` first, or keeping it near the range −1 to 1, avoids that.)

## The complexity curve

Turn the dial from simple to complex and measure the error on training data and on held-out validation data at every setting. Predict before running: at degree 15, where will the training error be, and where the validation error?

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(1)
x = rng.uniform(-1, 1, 200)
y = np.sin(3 * x) + rng.normal(0, 0.3, 200)
x_train, y_train, x_val, y_val = x[:30], y[:30], x[30:], y[30:]

degrees = range(1, 16)
train_err, val_err = [], []
for d in degrees:
    coefficients = np.polyfit(x_train, y_train, d)
    train_err.append(np.mean((np.polyval(coefficients, x_train) - y_train) ** 2))
    val_err.append(np.mean((np.polyval(coefficients, x_val) - y_val) ** 2))

fig, ax = plt.subplots()
ax.plot(degrees, train_err, "o-", label="training error")
ax.plot(degrees, val_err, "o-", label="validation error")
ax.axhline(0.09, color="gray", ls=":", label="noise level (0.3²)")
ax.set_yscale("log")
ax.set_xlabel("polynomial degree (model complexity)")
ax.set_ylabel("MSE")
ax.legend()
plt.show()
print("best degree by validation error:", list(degrees)[int(np.argmin(val_err))])
```

```output
best degree by validation error: 3
```

This is the picture to carry in your head:

- **Training error** falls steadily as complexity rises. A more flexible model can always fit its own training data at least as well. On its own, training error cannot tell you when to stop.
- **Validation error** falls at first, as the model becomes flexible enough to capture the real pattern, then rises again once it starts fitting the noise. Its lowest point is the best complexity.
- The dotted line marks the **noise level**: the error that even a perfect model would make, because the labels contain random noise. Validation error can never beat it on average. Training error usually sits a little below it even for a good model (the fit has used up some of the noise), but training error sinking **far** below it as complexity rises is a sure sign of fitting noise.

On the left of the minimum the model **underfits**: too simple, high error everywhere. On the right it **overfits**: low training error, high validation error, a large gap between them.

## Bias and variance

Why does validation error make a U shape? Imagine collecting a fresh training set, again and again, from the same source, and fitting the same kind of model to each one. Two different things can go wrong.

- **Bias**: even averaged over all those training sets, the model's prediction is systematically off, because the model family cannot represent the true pattern. A straight line fitted to a curve is wrong in the same way every time.
- **Variance**: the predictions change a lot from one training set to another, because the model is flexible enough to chase whatever noise each particular training set happens to contain.

Simulation shows both directly. Draw 30 training sets, fit a simple and a complex model to each, and overlay all the fitted curves:

```python type
import numpy as np
import matplotlib.pyplot as plt

def true_function(x):
    return np.sin(3 * x)

rng = np.random.default_rng(2)
grid = np.linspace(-1, 1, 200)
fig, axes = plt.subplots(1, 2, figsize=(11, 3.8), sharey=True)
for ax, degree in zip(axes, [1, 12]):
    for _ in range(30):
        x = rng.uniform(-1, 1, 25)
        y = true_function(x) + rng.normal(0, 0.3, 25)
        ax.plot(grid, np.polyval(np.polyfit(x, y, degree), grid), color="tab:blue", alpha=0.25)
    ax.plot(grid, true_function(grid), color="black", lw=2, label="true function")
    ax.set_title(f"degree {degree}")
    ax.set_ylim(-2.5, 2.5)
axes[0].legend()
plt.show()
```

The degree-1 lines all look alike, a tight bundle, but the whole bundle misses the curve: **high bias, low variance**. The degree-12 curves follow the true function on average, but each one wiggles differently, a wild tangle: **low bias, high variance**. Neither is good. The best model has enough flexibility to keep bias low, but not so much that variance explodes.

## The decomposition

This is not just a picture; it is exact. At any input `x₀`, the expected squared error of the model's prediction, averaged over all possible training sets and over the noise, splits into three parts:

\[
\text{expected error} = \text{bias}^2 + \text{variance} + \text{noise}
\]

where **bias** is the gap between the average prediction and the true value, **variance** is how much the predictions spread around their own average, and **noise** is the variance of the random noise in the labels, which no model can remove. You can estimate the first two by simulation. Predict which degree will have the smallest total before running it:

```python type
import numpy as np

def true_function(x):
    return np.sin(3 * x)

rng = np.random.default_rng(3)
x0 = 0.5
for degree in [1, 3, 6, 12]:
    predictions = []
    for _ in range(500):
        x = rng.uniform(-1, 1, 25)
        y = true_function(x) + rng.normal(0, 0.3, 25)
        predictions.append(np.polyval(np.polyfit(x, y, degree), x0))
    predictions = np.array(predictions)
    bias_sq = (predictions.mean() - true_function(x0)) ** 2
    variance = predictions.var()
    print(f"degree {degree:>2}: bias² {bias_sq:.4f}   variance {variance:.4f}   sum {bias_sq + variance:.4f}")
```

```output
degree  1: bias² 0.2224   variance 0.0178   sum 0.2402
degree  3: bias² 0.0001   variance 0.0121   sum 0.0122
degree  6: bias² 0.0001   variance 0.0235   sum 0.0236
degree 12: bias² 0.1753   variance 91.3955   sum 91.5707
```

Degree 1 is dominated by bias: it is wrong in the same way every time. By degree 3, bias has all but vanished while variance is still small, giving the smallest total. Beyond that, variance grows, and at degree 12 it explodes; a few wildly swinging fits even drag the average prediction off, so its bias² rises too. The smallest sum, in the middle, is the bottom of the U. The **bias–variance trade-off** is the name for this tension, and it shapes every choice about model complexity.

## Learning curves: would more data help?

Variance comes from fitting the particular noise of a small sample, so more data reduces it; bias comes from the model family, so more data cannot fix it. A **learning curve** plots training and validation error against the size of the training set, and tells you which situation you are in. Predict: for which model will the gap between the two curves close as data grows?

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(4)
x_all = rng.uniform(-1, 1, 3000)
y_all = np.sin(3 * x_all) + rng.normal(0, 0.3, 3000)
x_val, y_val = x_all[2000:], y_all[2000:]

sizes = [15, 25, 40, 70, 120, 250, 500, 1000, 2000]
fig, axes = plt.subplots(1, 2, figsize=(11, 3.8), sharey=True)
for ax, degree in zip(axes, [1, 9]):
    train_err, val_err = [], []
    for n in sizes:
        c = np.polyfit(x_all[:n], y_all[:n], degree)
        train_err.append(np.mean((np.polyval(c, x_all[:n]) - y_all[:n]) ** 2))
        val_err.append(np.mean((np.polyval(c, x_val) - y_val) ** 2))
    ax.plot(sizes, train_err, "o-", label="training")
    ax.plot(sizes, val_err, "o-", label="validation")
    ax.axhline(0.09, color="gray", ls=":")
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_title(f"degree {degree}")
    ax.set_xlabel("training set size")
axes[0].legend()
plt.show()
```

- For **degree 1** (high bias), the two curves gradually meet and flatten at a high error, far above the noise level. Beyond the first few dozen points, more data does not help: the line simply cannot represent the curve. The fix is a more flexible model.
- For **degree 9** (high variance with little data), the validation error starts enormous, with a huge gap above training error, but falls as data is added (a little unevenly at first), until both curves settle near the noise level. More data is exactly what this model needs.

## What to do about it

- **High training error, and validation error about as high**: underfitting (high bias). Remedies: a more flexible model, more or better features (and, once you have met it in the next lesson, less regularisation).
- **Low training error, much higher validation error**: overfitting (high variance). Remedies: more data, a simpler model, fewer features, **regularisation**.

The last remedy, regularisation, keeps a flexible model but penalises it for using its flexibility too freely. It is often the best of all, and it is the subject of the next lesson.

::: challenge Polynomial features [easy]
Write a function `polynomial_features(x, degree)` that takes a 1D array `x` and returns a 2D array with `degree` columns: `x`, `x²`, ..., `x^degree`, in that order, without a column of ones.

```python starter
import numpy as np

def polynomial_features(x, degree):
    return x.reshape(-1, 1)

print(polynomial_features(np.array([1.0, 2.0, 3.0]), 3))
```

```python solution
import numpy as np

def polynomial_features(x, degree):
    return np.column_stack([x ** k for k in range(1, degree + 1)])

print(polynomial_features(np.array([1.0, 2.0, 3.0]), 3))
```

```python test
import numpy as _np
assert "polynomial_features" in dir(), "Keep the function's name as polynomial_features."
_x = _np.array([1.0, 2.0, 3.0, -1.5])
for _d in [1, 2, 4]:
    _got = _np.asarray(polynomial_features(_x, _d))
    _want = _np.column_stack([_x ** k for k in range(1, _d + 1)])
    assert _got.shape == (4, _d), f"For degree {_d} the result should have shape (4, {_d}), but has {_got.shape}."
    assert _np.allclose(_got, _want), f"For degree {_d} the columns should be x, x², ... x^{_d}."
"SUCCESS: A curve, built from a straight-line model and new features."
```

Hint: A list comprehension can build the columns `x ** k` for `k` from 1 to `degree`, and `np.column_stack` puts them side by side.
:::

::: challenge Measure bias and variance [easy]
Write a function `bias_variance(degree, x0, n_sets, seed)` that estimates the squared bias and the variance of a polynomial model's prediction at the point `x0`, returning `(bias_squared, variance)`. Follow this exact procedure, so the result can be checked:

1. `rng = np.random.default_rng(seed)`;
2. `n_sets` times: `x = rng.uniform(-1, 1, 25)`, then `y = np.sin(3 * x) + rng.normal(0, 0.3, 25)` (in that order), fit `np.polyfit(x, y, degree)`, and record the prediction at `x0`;
3. bias² is `(mean prediction − sin(3 × x0))²`; variance is the variance of the predictions (NumPy's default `var`).

Then set `best_degree` to whichever of degrees 1, 3, 6 and 12 has the smallest `bias² + variance` at `x0 = 0.5`, using `n_sets = 300` and `seed = 0`.

```python starter
import numpy as np

def bias_variance(degree, x0, n_sets, seed):
    return 0.0, 0.0

best_degree = 1
print(best_degree)
```

```python solution
import numpy as np

def bias_variance(degree, x0, n_sets, seed):
    rng = np.random.default_rng(seed)
    predictions = []
    for _ in range(n_sets):
        x = rng.uniform(-1, 1, 25)
        y = np.sin(3 * x) + rng.normal(0, 0.3, 25)
        predictions.append(np.polyval(np.polyfit(x, y, degree), x0))
    predictions = np.array(predictions)
    return float((predictions.mean() - np.sin(3 * x0)) ** 2), float(predictions.var())

totals = {d: sum(bias_variance(d, 0.5, 300, 0)) for d in [1, 3, 6, 12]}
best_degree = min(totals, key=totals.get)
print(totals, best_degree)
```

```python test
import numpy as _np
assert "bias_variance" in dir(), "Keep the function's name as bias_variance."
def _bv(d, x0, n, s):
    r = _np.random.default_rng(s)
    p = []
    for _ in range(n):
        x = r.uniform(-1, 1, 25)
        y = _np.sin(3 * x) + r.normal(0, 0.3, 25)
        p.append(_np.polyval(_np.polyfit(x, y, d), x0))
    p = _np.array(p)
    return (p.mean() - _np.sin(3 * x0)) ** 2, p.var()
for _args in [(1, 0.8, 100, 0), (6, 0.5, 100, 1)]:
    assert _np.allclose(bias_variance(*_args), _bv(*_args)), f"bias_variance{_args} should be {tuple(round(v, 5) for v in _bv(*_args))}, but got {bias_variance(*_args)}. Follow the procedure exactly: draw x, then the noise, in that order."
_b1, _v1 = bias_variance(1, 0.5, 300, 0)
_b12, _v12 = bias_variance(12, 0.5, 300, 0)
assert _b1 > _b12 and _v1 < _v12, "With your function, degree 1 should show more bias and less variance than degree 12."
_tot = {d: sum(_bv(d, 0.5, 300, 0)) for d in [1, 3, 6, 12]}
assert best_degree == min(_tot, key=_tot.get), f"best_degree should be {min(_tot, key=_tot.get)}, the degree with the smallest bias² + variance, but it is {best_degree}."
"SUCCESS: You measured both halves of the trade-off directly."
```

Hint: Collect the 25-point fits' predictions at `x0` in a list, then turn it into an array. The bias compares their mean with the true value; the variance is their spread.
:::

::: challenge Would more data help? [easy]
Write a function `validation_errors(degree, sizes, seed)` that returns a list of validation MSEs, one per training size in `sizes`. Follow this procedure:

1. `rng = np.random.default_rng(seed)`, then `x_all = rng.uniform(-1, 1, 3000)` and `y_all = np.sin(3 * x_all) + rng.normal(0, 0.3, 3000)`;
2. the validation set is the last 1000 points, `x_all[2000:]` and `y_all[2000:]`;
3. for each size `n`, fit `np.polyfit` of the given degree to the first `n` points, and record the MSE on the validation set.

Then compute `gain_simple` and `gain_complex`: how much the validation error **falls** (first error minus last error) from 15 to 2000 training points, for degree 1 and for degree 9, with `sizes = [15, 2000]` and `seed = 4`. Which model gains more from extra data?

```python starter
import numpy as np

def validation_errors(degree, sizes, seed):
    return [0.0 for _ in sizes]

gain_simple = 0.0
gain_complex = 0.0
print(gain_simple, gain_complex)
```

```python solution
import numpy as np

def validation_errors(degree, sizes, seed):
    rng = np.random.default_rng(seed)
    x_all = rng.uniform(-1, 1, 3000)
    y_all = np.sin(3 * x_all) + rng.normal(0, 0.3, 3000)
    x_val, y_val = x_all[2000:], y_all[2000:]
    errors = []
    for n in sizes:
        c = np.polyfit(x_all[:n], y_all[:n], degree)
        errors.append(float(np.mean((np.polyval(c, x_val) - y_val) ** 2)))
    return errors

simple = validation_errors(1, [15, 2000], 4)
complex_ = validation_errors(9, [15, 2000], 4)
gain_simple = simple[0] - simple[1]
gain_complex = complex_[0] - complex_[1]
print(gain_simple, gain_complex)
```

```python test
import numpy as _np
assert "validation_errors" in dir(), "Keep the function's name as validation_errors."
def _ve(d, sizes, s):
    r = _np.random.default_rng(s)
    xa = r.uniform(-1, 1, 3000)
    ya = _np.sin(3 * xa) + r.normal(0, 0.3, 3000)
    out = []
    for n in sizes:
        c = _np.polyfit(xa[:n], ya[:n], d)
        out.append(_np.mean((_np.polyval(c, xa[2000:]) - ya[2000:]) ** 2))
    return out
for _args in [(1, [20, 100, 2000], 0), (4, [30, 500], 1)]:
    assert _np.allclose(validation_errors(*_args), _ve(*_args)), f"validation_errors{_args} should be {[round(v, 5) for v in _ve(*_args)]}, but got {validation_errors(*_args)}."
_s = _ve(1, [15, 2000], 4)
_c = _ve(9, [15, 2000], 4)
assert _np.isclose(gain_simple, _s[0] - _s[1]) and _np.isclose(gain_complex, _c[0] - _c[1]), "gain_simple and gain_complex should be the fall in validation error from 15 to 2000 points."
assert gain_complex > gain_simple, "The complex model should gain far more from extra data."
"SUCCESS: More data cures variance, not bias: the degree-9 model went from wildly wrong to near the noise level, while the line improved only a little and stayed far above it."
```

Hint: Draw all the data once, at the top of the function. Then loop over the sizes, fitting on the first `n` points each time and always measuring on the same last 1000.
:::

## What you learned

- Polynomial features (`x`, `x²`, ...) let linear regression fit curves while staying linear in its parameters; the degree is a dial for model complexity.
- As complexity rises, training error always falls, but validation error falls and then rises: a U shape whose bottom is the best complexity. Training error sinking far below the noise level means fitting noise.
- Underfitting is high bias: consistently wrong, whatever the data. Overfitting is high variance: predictions swing with each training set.
- Expected error = bias² + variance + noise; complexity trades one for the other.
- Learning curves plot error against training size. If both errors meet high, more data will not help (bias); if there is a large gap that closes as data grows, it will (variance).
- Fix underfitting with more flexibility or features; fix overfitting with more data, a simpler model, or regularisation.

Next you will meet regularisation: a way to keep a flexible model and still stop it from overfitting, by penalising large weights.
