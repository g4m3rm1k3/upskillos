# Multiple regression, vectorised

A house's price depends on more than its area: bedrooms, age, location and more all matter. Diabetes progression depends on BMI, but also on blood pressure and blood chemistry. Real predictions combine many features, and linear regression extends to any number of them naturally: instead of a line through points in a plane, it fits a flat surface (called a **hyperplane**) through points in many dimensions.

The key to doing this cleanly is to write everything with vectors and matrices, which is where the linear algebra lessons pay off. Written that way, the model, its loss, its gradient and its exact solution are each one line of NumPy, and the same code works for 2 features or 2,000. This lesson builds that vectorised form, uses it to fit a model on all ten diabetes measurements, and shows how to read, and how not to read, the fitted weights.

## The model with many features

With `d` features, each example is a vector `x = (x₁, ..., x_d)`, and the model has one weight per feature plus a bias:

\[
\hat{y} = w_1 x_1 + w_2 x_2 + \dots + w_d x_d + b = w \cdot x + b
\]

That is the weighted sum from the vectors lesson: the dot product of a weight vector with the feature vector. For a whole dataset `X`, with one example per row and shape `(n, d)`, every prediction at once is `X @ w + b`, as in the "score every example" challenge of that lesson.

One trick makes this even tidier: add a column of ones to `X`. Then the bias becomes just another weight, the one multiplying that constant column, and the whole model is a single matrix product:

\[
\hat{y} = \tilde{X} \theta
\]

where `X̃` ("X tilde") is `X` with an extra column of ones, and θ (theta) holds all `d + 1` parameters, the bias included. You used exactly this trick in the linear systems lesson, when a column of ones let the line have an intercept.

```python type
import numpy as np

X = np.array([[120.0, 3], [80, 2], [150, 4]])
X_tilde = np.column_stack([np.ones(len(X)), X])
theta = np.array([50_000.0, 2_000, 10_000])
print(X_tilde)
print(X_tilde @ theta)
```

```output
[[  1. 120.   3.]
 [  1.  80.   2.]
 [  1. 150.   4.]]
[320000. 230000. 390000.]
```

`theta[0]` is the bias (here 50,000) and the others are the weights for area and bedrooms. One matrix product scores every house.

## The loss and its gradient as matrices

The mean squared error, written with vectors, is the squared length of the error vector, divided by `n`:

\[
L(\theta) = \frac{1}{n} \| \tilde{X}\theta - y \|^2
\]

Its gradient, one partial derivative per parameter, comes from the chain rule just as in the gradients lesson. For parameter `j`, each squared error contributes `2 × (error of example i) × (feature j of example i)`. Collecting all the parameters at once, that is exactly a matrix product with the transpose:

\[
\nabla L(\theta) = \frac{2}{n} \tilde{X}^T (\tilde{X}\theta - y)
\]

Row `j` of `X̃ᵀ` is feature `j` for every example, so its dot product with the error vector adds up "error times feature `j`" over all examples, which is exactly the sum the chain rule asked for. One line of NumPy computes the whole gradient. As always, check a gradient formula numerically:

```python type
import numpy as np

rng = np.random.default_rng(0)
X_tilde = np.column_stack([np.ones(20), rng.normal(size=(20, 3))])
y = rng.normal(size=20)
theta = rng.normal(size=4)

def loss(t):
    return np.mean((X_tilde @ t - y) ** 2)

formula = 2 / len(y) * X_tilde.T @ (X_tilde @ theta - y)
h = 1e-5
numerical = np.array([(loss(theta + h * e) - loss(theta - h * e)) / (2 * h) for e in np.eye(4)])
print(formula.round(6))
print(numerical.round(6))
```

```output
[-0.590479 -2.790824 -0.94501  -0.813496]
[-0.590479 -2.790824 -0.94501  -0.813496]
```

`np.eye(4)` supplies the four unit vectors, so each one nudges a single parameter. The formula matches.

## The exact solution: the normal equation

Setting the gradient to zero, as in the least squares lesson, gives the bottom of the bowl directly. `X̃ᵀ(X̃θ − y) = 0` rearranges to

\[
\tilde{X}^T \tilde{X}\, \theta = \tilde{X}^T y
\]

This is called the **normal equation**. It is an ordinary square system of `d + 1` equations in `d + 1` unknowns, `A θ = b` with `A = X̃ᵀX̃`, which `np.linalg.solve` handles. It is what `np.linalg.lstsq` and scikit-learn's `LinearRegression` solve (they use more careful methods internally, which matter when features are nearly collinear, but get the same answer).

```python type
import numpy as np

rng = np.random.default_rng(1)
n = 200
X = rng.normal(size=(n, 3))
y = X @ np.array([2.0, -1.0, 0.5]) + 4 + rng.normal(0, 0.3, n)

X_tilde = np.column_stack([np.ones(n), X])
theta = np.linalg.solve(X_tilde.T @ X_tilde, X_tilde.T @ y)
print("normal equation:", theta.round(3))
print("lstsq:          ", np.linalg.lstsq(X_tilde, y)[0].round(3))
```

```output
normal equation: [ 3.951  2.007 -1.004  0.474]
lstsq:           [ 3.951  2.007 -1.004  0.474]
```

Both recover a bias near 4 and weights near 2, −1 and 0.5, the values used to make the data. The normal equation needs `X̃ᵀX̃` to be invertible: if two features are exactly collinear (one a multiple of another), its rank drops and there is no unique solution, exactly as in the linear systems lesson.

## Many features on real data

Now fit all ten diabetes measurements. The workflow from the "what learning is" lesson applies: split first, then fit on the training set only, then evaluate on the test set.

One habit matters a great deal. Features are standardised before fitting, so their weights are comparable and gradient descent behaves. The mean and standard deviation used for standardising must be computed from the **training set only**, and then applied to both sets, because they are part of what the model learns. For plain least squares it happens to make no difference to the predictions: shifting and rescaling the features only changes the weights to compensate. But for gradient descent with a fixed number of steps, for the regularised models of the next lessons, and for methods based on distances, standardising with statistics that include the test set lets information about it **leak** into training and flatters the test score. So the habit is kept everywhere.

```python type
import numpy as np
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
X = df.drop(columns="target").to_numpy(dtype=float)
y = df["target"].to_numpy(dtype=float)

order = np.random.default_rng(7).permutation(len(X))
train, test = order[:350], order[350:]
mean, std = X[train].mean(axis=0), X[train].std(axis=0)
Z_train = (X[train] - mean) / std
Z_test = (X[test] - mean) / std

def with_ones(Z):
    return np.column_stack([np.ones(len(Z)), Z])

A = with_ones(Z_train)
theta = np.linalg.solve(A.T @ A, A.T @ y[train])

def r_squared(y_true, y_pred):
    return 1 - np.sum((y_true - y_pred) ** 2) / np.sum((y_true - y_true.mean()) ** 2)

print("train R²:", round(r_squared(y[train], A @ theta), 3))
print("test R²: ", round(r_squared(y[test], with_ones(Z_test) @ theta), 3))
```

```output
train R²: 0.523
test R²:  0.488
```

Predict before running: will the test R² be higher or lower than the training R²?

On the training patients, the ten features explain about 52% of the variation; on the 92 test patients, about 49%, well above BMI's 34% alone. The training score is a little higher, as it always tends to be: the weights were chosen to fit those very patients, noise included. The gap is small because ten weights are few compared with 350 patients. But a test set of 92 patients is small, so its R² is itself uncertain, as the estimation lesson would predict: other random splits of this data give test scores anywhere from about 0.32 to 0.54. The validation lesson shows how to average over many splits to get a steadier estimate. Either way, the honest number to report is the test one.

Gradient descent reaches the same answer. With standardised features it converges quickly, and the vectorised gradient makes each step a single line:

```python type
import numpy as np
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
X = df.drop(columns="target").to_numpy(dtype=float)
y = df["target"].to_numpy(dtype=float)
Z = (X - X.mean(axis=0)) / X.std(axis=0)
A = np.column_stack([np.ones(len(Z)), Z])

theta = np.zeros(A.shape[1])
for step in range(3000):
    theta -= 0.1 * 2 / len(y) * A.T @ (A @ theta - y)

exact = np.linalg.solve(A.T @ A, A.T @ y)
print("gradient descent:", theta.round(1))
print("exact:           ", exact.round(1))
```

```output
gradient descent: [152.1  -0.5 -11.4  24.7  15.4 -37.5  22.5   4.7   8.4  35.7   3.2]
exact:            [152.1  -0.5 -11.4  24.7  15.4 -37.7  22.7   4.8   8.4  35.7   3.2]
```

(This cell standardises with the whole dataset only to compare the two methods; it is not evaluating anything.) Most weights agree to the printed precision. A few differ a little, because one pair of features is so strongly correlated that the bowl is very flat along one direction, and gradient descent creeps along it slowly. That flatness is the next section's subject.

## Reading the weights, carefully

With standardised features, each weight is "the change in the prediction for a one standard deviation increase in that feature, **holding all the other features fixed**". Their sizes can then be compared directly. Predict which feature will have the largest weight before running the cell:

```python type
import numpy as np
import pandas as pd
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
features = df.drop(columns="target")
Z = (features - features.mean()) / features.std(ddof=0)
A = np.column_stack([np.ones(len(Z)), Z.to_numpy()])
theta = np.linalg.solve(A.T @ A, A.T @ df["target"].to_numpy())
weights = pd.Series(theta[1:], index=features.columns)
print(weights.sort_values(key=abs, ascending=False).round(1))
```

```output
s1    -37.7
s5     35.7
bmi    24.7
s2     22.7
bp     15.4
sex   -11.4
s4      8.4
s3      4.8
s6      3.2
age    -0.5
dtype: float64
```

BMI and `s5` have large positive weights, as the exploration predicted. But look at `s1` and `s2`: huge weights of **opposite** sign. The exploration found that these two features are correlated at 0.9, carrying almost the same information. The model can raise one weight and lower the other by almost the same amount with hardly any change to its predictions, so the individual values are poorly determined. This is the flat direction of the loss bowl mentioned above: moving along it barely changes the loss, which is also why gradient descent crept along it so slowly. Taken alone, a large negative weight on total cholesterol might look like a medical finding, but it is really an accident of collinearity. This is the most important caution about reading regression weights: **correlated features make individual weights unreliable**, even when the predictions are fine. The regularisation lesson shows a way to calm them down.

Two more cautions:

- "Holding the other features fixed" may describe a situation that never happens in reality, when features naturally move together.
- A weight describes an association in this data, not a cause. Changing a feature in the real world will not necessarily change the outcome by the weight's amount.

## The same in scikit-learn

```python type
from sklearn.datasets import load_diabetes
from sklearn.linear_model import LinearRegression

df = load_diabetes(as_frame=True, scaled=False).frame
X = df.drop(columns="target")
model = LinearRegression().fit(X, df["target"])
print(model.intercept_.round(1))
print(dict(zip(X.columns, model.coef_.round(2))))
```

```output
-334.6
{'age': np.float64(-0.04), 'sex': np.float64(-22.86), 'bmi': np.float64(5.6), 'bp': np.float64(1.12), 's1': np.float64(-1.09), 's2': np.float64(0.75), 's3': np.float64(0.37), 's4': np.float64(6.53), 's5': np.float64(68.48), 's6': np.float64(0.28)}
```

(`fit` returns the model itself, so the two lines can be chained.) These weights are in the original units, since the features were not standardised, so they cannot be compared with each other directly: a weight per year of age and a weight per unit of blood fat measure different things.

::: challenge Predictions with a bias column [easy]
Write two functions:

- `add_ones(X)` returns `X` with a column of ones added at the **front**;
- `predict(X, theta)` returns the predictions `add_ones(X) @ theta` for a 2D feature array `X` and a parameter vector `theta` whose first element is the bias.

```python starter
import numpy as np

def add_ones(X):
    return X

def predict(X, theta):
    return np.zeros(len(X))

print(predict(np.array([[1.0, 2.0], [3.0, 4.0]]), np.array([0.5, 1.0, -1.0])))
```

```python solution
import numpy as np

def add_ones(X):
    return np.column_stack([np.ones(len(X)), X])

def predict(X, theta):
    return add_ones(X) @ theta

print(predict(np.array([[1.0, 2.0], [3.0, 4.0]]), np.array([0.5, 1.0, -1.0])))
```

```python test
import numpy as _np
assert "add_ones" in dir() and "predict" in dir(), "Keep both function names."
_X = _np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])
_A = add_ones(_X)
assert _np.shape(_A) == (3, 3) and _np.allclose(_A[:, 0], 1) and _np.allclose(_A[:, 1:], _X), "add_ones should put a column of ones in front of X."
assert _np.allclose(predict(_X, _np.array([0.5, 1.0, -1.0])), [-0.5, -0.5, -0.5]), "predict with theta (0.5, 1, −1) gives 0.5 + x1 − x2 for each row."
_rng = _np.random.default_rng(1)
_Xr = _rng.normal(size=(10, 4))
_t = _rng.normal(size=5)
assert _np.allclose(predict(_Xr, _t), _Xr @ _t[1:] + _t[0]), "predict should equal X @ weights + bias."
"SUCCESS: One matrix product scores every example, bias included."
```

Hint: `np.column_stack([np.ones(len(X)), X])` puts the ones first. Then `predict` is a single `@`.
:::

::: challenge The vectorised gradient [easy]
Write a function `mse_gradient(A, y, theta)` that returns the gradient of the mean squared error `mean((A @ theta − y)²)` with respect to `theta`, using the matrix formula from the lesson, with no loop. `A` already includes the column of ones.

Then write `gradient_descent(A, y, lr, steps)` that starts from `theta = 0` and returns `theta` after `steps` updates.

```python starter
import numpy as np

def mse_gradient(A, y, theta):
    return np.zeros(len(theta))

def gradient_descent(A, y, lr, steps):
    return np.zeros(A.shape[1])
```

```python solution
import numpy as np

def mse_gradient(A, y, theta):
    return 2 / len(y) * A.T @ (A @ theta - y)

def gradient_descent(A, y, lr, steps):
    theta = np.zeros(A.shape[1])
    for _ in range(steps):
        theta = theta - lr * mse_gradient(A, y, theta)
    return theta
```

```python test
import numpy as _np
import ast as _ast
assert "mse_gradient" in dir() and "gradient_descent" in dir(), "Keep both function names."
_tree = _ast.parse(_source)
_grad_fn = [n for n in _ast.walk(_tree) if isinstance(n, _ast.FunctionDef) and n.name == "mse_gradient"][0]
assert not any(isinstance(n, (_ast.For, _ast.While, _ast.ListComp)) for n in _ast.walk(_grad_fn)), "Compute the gradient with the matrix formula, without a loop."
_rng = _np.random.default_rng(2)
_A = _np.column_stack([_np.ones(30), _rng.normal(size=(30, 3))])
_y = _rng.normal(size=30)
_t = _rng.normal(size=4)
_L = lambda t: _np.mean((_A @ t - _y) ** 2)
_num = _np.array([(_L(_t + 1e-5 * e) - _L(_t - 1e-5 * e)) / 2e-5 for e in _np.eye(4)])
assert _np.allclose(mse_gradient(_A, _y, _t), _num, atol=1e-6), "Your gradient does not match a numerical gradient. The formula is (2/n) Aᵀ(Aθ − y)."
_exact = _np.linalg.lstsq(_A, _y)[0]
assert _np.allclose(gradient_descent(_A, _y, 0.1, 2000), _exact, atol=1e-4), "gradient_descent should converge to the least squares solution."
"SUCCESS: The gradient for any number of features, in one line."
```

Hint: The error vector is `A @ theta − y`. Multiply by `A.T` and scale by `2 / n`.
:::

::: challenge A proper evaluation [medium]
Write two functions:

1. `standardise_split(X_train, X_test)` returns `(Z_train, Z_test)`: both feature arrays standardised using the mean and standard deviation (NumPy's default `std`) of **`X_train` only**. The test set must be transformed with the training statistics, not its own.
2. `fit_and_test(X_train, y_train, X_test, y_test)` uses `standardise_split`, adds a column of ones, solves the normal equation on the training set, and returns the R² on the **test** set.

```python starter
import numpy as np

def standardise_split(X_train, X_test):
    return X_train, X_test

def fit_and_test(X_train, y_train, X_test, y_test):
    return 0.0
```

```python solution
import numpy as np

def standardise_split(X_train, X_test):
    mean, std = X_train.mean(axis=0), X_train.std(axis=0)
    return (X_train - mean) / std, (X_test - mean) / std

def fit_and_test(X_train, y_train, X_test, y_test):
    Z_train, Z_test = standardise_split(X_train, X_test)
    A_train = np.column_stack([np.ones(len(Z_train)), Z_train])
    A_test = np.column_stack([np.ones(len(Z_test)), Z_test])
    theta = np.linalg.solve(A_train.T @ A_train, A_train.T @ y_train)
    predictions = A_test @ theta
    return float(1 - np.sum((y_test - predictions) ** 2) / np.sum((y_test - y_test.mean()) ** 2))
```

```python test
import numpy as _np
assert "standardise_split" in dir() and "fit_and_test" in dir(), "Keep both function names."
_rng = _np.random.default_rng(3)
_X = _rng.normal([10, 200, -5], [2, 50, 1], size=(120, 3))
_y = _X @ _np.array([1.5, 0.02, -3.0]) + _rng.normal(0, 1, 120)
_Xtr, _Xte, _ytr, _yte = _X[:80], _X[80:], _y[:80], _y[80:]
_m, _s = _Xtr.mean(axis=0), _Xtr.std(axis=0)
_Ztr, _Zte = standardise_split(_Xtr, _Xte)
assert _np.allclose(_Ztr, (_Xtr - _m) / _s), "Z_train should be X_train standardised with its own mean and standard deviation."
assert not _np.allclose(_Zte, (_Xte - _Xte.mean(axis=0)) / _Xte.std(axis=0)), "Z_test was standardised with the test set's own statistics. Use the training set's mean and standard deviation for both."
assert _np.allclose(_Zte, (_Xte - _m) / _s), "Z_test should be X_test standardised with the TRAINING mean and standard deviation."
_Atr = _np.column_stack([_np.ones(80), (_Xtr - _m) / _s])
_Ate = _np.column_stack([_np.ones(40), (_Xte - _m) / _s])
_th = _np.linalg.solve(_Atr.T @ _Atr, _Atr.T @ _ytr)
_p = _Ate @ _th
_want = 1 - _np.sum((_yte - _p) ** 2) / _np.sum((_yte - _yte.mean()) ** 2)
assert _np.isclose(fit_and_test(_Xtr, _ytr, _Xte, _yte), _want), f"The test R² should be {_want:.5f}, but fit_and_test returned {fit_and_test(_Xtr, _ytr, _Xte, _yte)}."
"SUCCESS: Split, standardise with training statistics, fit, evaluate on unseen data: the whole workflow."
```

Hint: Compute the mean and standard deviation from `X_train` once, and apply them to both arrays. Then `fit_and_test` is the lesson's diabetes cell, packaged as a function.
:::

## What you learned

- With `d` features, `ŷ = w · x + b`; for a whole dataset, `X @ w + b`. Adding a column of ones makes the bias a weight, so the model is `X̃ θ`.
- The loss is `‖X̃θ − y‖² / n`, and its gradient is `(2/n) X̃ᵀ(X̃θ − y)`: one line of NumPy for any number of features.
- Setting the gradient to zero gives the normal equation, `X̃ᵀX̃ θ = X̃ᵀy`, solved with `np.linalg.solve`; `lstsq` and scikit-learn solve the same problem more carefully.
- Split first; standardise with the training set's statistics only, applied to both sets; evaluate on the test set.
- With standardised features, a weight is the change in prediction per standard deviation of that feature, holding the others fixed. Correlated features make individual weights unreliable, and weights describe associations, not causes.
- scikit-learn's `LinearRegression().fit(X, y)` gives `intercept_` and `coef_`.

A straight line or flat plane can only do so much. Next you will make linear regression fit curves, by adding polynomial features, and meet head-on the trade-off between underfitting and overfitting that the "what learning is" lesson previewed.
