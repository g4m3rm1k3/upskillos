# Loss functions

Training finds the parameters that make the loss as small as possible. So the loss is not a detail: it **defines** what the model is trying to do. Change the loss and you change what counts as a good answer, and therefore what the model learns. So far every regression has used mean squared error, because it gave neat formulas. But squared error has a strong opinion built into it: it cares enormously about big mistakes, and one wild data point can drag the whole fit, as the last lesson showed.

This lesson compares the main losses for regression: squared error, absolute error, and the Huber loss that combines them. It shows what each one's "best answer" really is, how they react to outliers, and how an asymmetric loss handles situations where over-predicting and under-predicting cost different amounts. The lesson to take away: choose the loss that matches what a mistake actually costs you.

## Three ways to measure an error

For a single prediction, the **error** (or residual) is `e = ŷ − y`. A loss turns each error into a penalty, and the model's total loss is the average penalty.

- **Squared error**, e²: the mean of these is the MSE.
- **Absolute error**, |e|: the mean of these is the **mean absolute error** (MAE).
- **Huber loss**: squared for small errors, absolute for large ones, with a threshold `δ` (delta) where it switches:

\[
\text{Huber}(e) = \begin{cases} \tfrac12 e^2 & \text{if } |e| \le \delta \\ \delta\,(|e| - \tfrac12 \delta) & \text{otherwise} \end{cases}
\]

(The halves are there so the two pieces join smoothly at `δ`.) The threshold `δ` is in the same units as the labels, and it marks what counts as a normal-sized error: set it around the typical size of the noise, so ordinary errors are squared and only unusually large ones are treated leniently. Plotting the three penalties against the error shows their personalities. Predict first: for an error of 5, which penalty is largest?

```python type
import numpy as np
import matplotlib.pyplot as plt

def huber(e, delta=1.0):
    return np.where(np.abs(e) <= delta, 0.5 * e ** 2, delta * (np.abs(e) - 0.5 * delta))

e = np.linspace(-5, 5, 300)
fig, ax = plt.subplots()
ax.plot(e, e ** 2, label="squared")
ax.plot(e, np.abs(e), label="absolute")
ax.plot(e, huber(e), label="Huber (δ = 1)")
ax.set_ylim(0, 10)
ax.set_xlabel("error")
ax.set_ylabel("penalty")
ax.legend()
plt.show()
print("penalty for an error of 5:", 5 ** 2, abs(5), huber(np.array(5.0)).item())
```

```output
penalty for an error of 5: 25 5 4.5
```

Squared error grows faster and faster: an error of 5 costs 25, twenty-five times the cost of an error of 1. Absolute error grows steadily: an error of 5 costs exactly 5 times an error of 1. Huber follows the squared curve near zero and the straight line beyond `δ`. (`.item()` turns a one-element array into a plain number for printing.)

## What each loss thinks "best" means

The simplest possible model predicts the same number `c` for every example, as the baseline did. Which `c` is best? That depends entirely on the loss. Try every candidate and see where each loss is smallest:

```python type
import numpy as np

y = np.array([2.0, 3.0, 3.0, 4.0, 5.0, 6.0, 30.0])
candidates = np.linspace(0, 30, 3001)
mse = [np.mean((c - y) ** 2) for c in candidates]
mae = [np.mean(np.abs(c - y)) for c in candidates]
print("best constant for squared error: ", candidates[np.argmin(mse)].round(2), "  mean:", y.mean().round(2))
print("best constant for absolute error:", candidates[np.argmin(mae)].round(2), "  median:", np.median(y))
```

```output
best constant for squared error:  7.57   mean: 7.57
best constant for absolute error: 4.0   median: 4.0
```

The squared-error answer is the **mean**, and the absolute-error answer is the **median**. This is always true (with an even number of values, any number between the two middle ones ties for best absolute error, and the median is the one halfway between them), and it explains everything about how the two losses behave. The mean of these values, about 7.6, is pulled far up by the single 30; the median, 4, ignores it. Six of the seven values are between 2 and 6, and the median describes them; the mean describes none of them.

Why? Moving `c` up by a small amount changes the absolute loss of each point by the same small amount, whether the point is near or far. So the best `c` balances the **number** of points above and below it, which is the median. For squared loss, far points pull harder in proportion to their distance, so they drag `c` towards themselves until the pulls balance at the mean.

## Outliers

The same thing happens when fitting a line. Here is data with a few badly wrong points, fitted by minimising each loss in turn. To minimise a loss that has no neat formula, this uses `scipy.optimize.minimize`, a general-purpose function that finds the lowest point of any function you give it. By default it uses gradients, much like gradient descent; the `Nelder-Mead` method chosen below instead compares the loss at a few trial points and moves them downhill, needing no derivatives at all. You give it the function and a starting guess, and it returns the best parameters in `.x`.

```python type
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import minimize

rng = np.random.default_rng(0)
x = rng.uniform(0, 10, 40)
y = 2 * x + 1 + rng.normal(0, 1, 40)
y[:4] += 25

def huber(e, delta=1.0):
    return np.where(np.abs(e) <= delta, 0.5 * e ** 2, delta * (np.abs(e) - 0.5 * delta))

losses = {
    "squared": lambda p: np.mean((p[0] * x + p[1] - y) ** 2),
    "absolute": lambda p: np.mean(np.abs(p[0] * x + p[1] - y)),
    "Huber": lambda p: np.mean(huber(p[0] * x + p[1] - y)),
}
fig, ax = plt.subplots()
ax.scatter(x, y, color="black", s=15)
grid = np.linspace(0, 10, 50)
for name, loss in losses.items():
    w, b = minimize(loss, x0=[0.0, 0.0], method="Nelder-Mead").x
    ax.plot(grid, w * grid + b, label=f"{name}: w = {w:.2f}, b = {b:.2f}")
    print(f"{name:>8}: w = {w:.2f}, b = {b:.2f}")
ax.legend(fontsize=8)
plt.show()
```

```output
 squared: w = 1.23, b = 7.93
absolute: w = 2.01, b = 1.39
   Huber: w = 2.04, b = 1.22
```

`y[:4] += 25` corrupts four of the forty points, pushing them far above the line. (`method="Nelder-Mead"` chooses a search method that does not need derivatives, which suits the absolute loss with its sharp corner at zero.) The true line is `2x + 1`. The squared-error fit is lifted and tilted towards the four bad points, with a slope near 1.2 instead of 2; the absolute and Huber fits stay close to the true line, because to them a far-away point is just one more point, not a disaster to be avoided at all costs. Losses that are not thrown off by a few extreme values are called **robust**.

## So why is squared error so common?

If absolute error is more robust, why use squared error at all? Three good reasons:

- **Smooth gradients.** The squared loss has a smooth bowl shape, with a gradient that shrinks as you approach the bottom, so gradient descent slows down and settles neatly. The absolute loss has a sharp corner at zero error, where its gradient jumps from −1 to +1, which makes gradient descent jitter around the minimum.
- **Exact solutions.** Squared error gives the least squares formulas: no searching at all.
- **It suits normal noise.** If the noise in the data really is normally distributed, the squared-error fit is the most likely line given the data, called the maximum-likelihood fit. (The Bayesian inference lesson explains what that means and why.)

Huber loss is the practical compromise: smooth and squared near zero, where the noise is ordinary, and linear for large errors, so outliers cannot dominate. scikit-learn offers it as `HuberRegressor`.

## When mistakes are not symmetric

Squared and absolute error both treat over-predicting and under-predicting the same way. Real costs often are not symmetric. A bakery forecasting tomorrow's demand: bake too few, and you lose sales and disappoint customers; bake too many, and you throw away bread, which costs less. The right forecast should lean high.

The **pinball loss** (also called the **quantile loss**) builds this in. For a chosen level `q` between 0 and 1, it charges `q` per unit for under-predicting and `1 − q` per unit for over-predicting:

\[
\text{pinball}_q(e) = \begin{cases} q \cdot (y - \hat{y}) & \text{if } \hat{y} < y \text{ (too low)} \\ (1 - q)(\hat{y} - y) & \text{if } \hat{y} \ge y \text{ (too high)} \end{cases}
\]

With `q = 0.5` it is just half the absolute error, whose best constant is the median. With other `q`, the best constant is the `q`-th **quantile**: the value with a fraction `q` of the data below it (the percentiles of the distributions lesson, written as fractions). Predict the best constant for `q = 0.9`:

```python type
import numpy as np

rng = np.random.default_rng(1)
demand = rng.poisson(lam=100, size=1000)

def pinball(c, y, q):
    return np.mean(np.where(c < y, q * (y - c), (1 - q) * (c - y)))

candidates = np.arange(60, 141)
for q in [0.5, 0.9]:
    best = candidates[np.argmin([pinball(c, demand, q) for c in candidates])]
    print(f"q = {q}: best forecast {best}, the {q:.0%} quantile of demand is {np.quantile(demand, q)}")
```

```output
q = 0.5: best forecast 100, the 50% quantile of demand is 100.0
q = 0.9: best forecast 112, the 90% quantile of demand is 112.0
```

With `q = 0.9`, under-predicting costs nine times as much as over-predicting, and the best forecast becomes the 90th percentile of demand: bake enough to meet demand on 9 days out of 10. Choosing `q` is a business decision about the relative costs, and the loss turns that decision into the model's target. Models trained with the pinball loss, called **quantile regression**, are how forecasts come with ranges ("between 85 and 118 on 80% of days").

## Losses for classification

Classification needs different losses, because the prediction is a category or a probability, not a number to subtract. The most natural loss, counting mistakes (the **0-1 loss**: 1 for a wrong answer, 0 for a right one), is useless for training: it is flat almost everywhere, so its gradient is zero and gradient descent has nowhere to go. Classification models are instead trained with smooth losses on predicted **probabilities**, above all the **log loss** (cross-entropy), which the logistic regression lesson develops.

## Choosing a loss

- **MSE** when large errors really are much worse than small ones, the noise is roughly normal, and outliers have been dealt with. It predicts the mean.
- **MAE** when every unit of error costs the same and you want robustness to outliers. It predicts the median.
- **Huber** for a robust fit that still trains smoothly.
- **Pinball (quantile)** when over- and under-predicting cost different amounts, or when you want a range rather than a single number.

The loss used to train a model and the measure used to report it can differ, too: you might train with MSE for its smooth gradients but report MAE because it is in plain units ("off by 12 on average") and easier to explain.

::: challenge Three losses [easy]
Write three functions, each taking a NumPy array of errors `e` (predictions minus labels) and returning the **mean** penalty as a float:

- `mse(e)`: the mean squared error;
- `mae(e)`: the mean absolute error;
- `huber(e, delta=1.0)`: the mean Huber loss, using the formula from the lesson.

```python starter
import numpy as np

def mse(e):
    return 0.0

def mae(e):
    return 0.0

def huber(e, delta=1.0):
    return 0.0

e = np.array([0.5, -2.0, 3.0])
print(mse(e), mae(e), huber(e))
```

```python solution
import numpy as np

def mse(e):
    return float(np.mean(e ** 2))

def mae(e):
    return float(np.mean(np.abs(e)))

def huber(e, delta=1.0):
    penalties = np.where(np.abs(e) <= delta, 0.5 * e ** 2, delta * (np.abs(e) - 0.5 * delta))
    return float(np.mean(penalties))

e = np.array([0.5, -2.0, 3.0])
print(mse(e), mae(e), huber(e))
```

```python test
import numpy as _np
for _f in ["mse", "mae", "huber"]:
    assert _f in dir(), f"Define the function {_f}."
_e = _np.array([0.5, -2.0, 3.0])
assert _np.isclose(mse(_e), (0.25 + 4 + 9) / 3), f"mse([0.5, -2, 3]) should be {(0.25 + 4 + 9) / 3:.4f}, got {mse(_e)}."
assert _np.isclose(mae(_e), 5.5 / 3), f"mae([0.5, -2, 3]) should be {5.5 / 3:.4f}, got {mae(_e)}."
assert _np.isclose(huber(_e), (0.125 + 1.5 + 2.5) / 3), f"huber([0.5, -2, 3]) with delta 1 should be {(0.125 + 1.5 + 2.5) / 3:.4f}, got {huber(_e)}."
assert _np.isclose(huber(_e, delta=5.0), mse(_e) / 2), "With a large delta every error is small, so Huber is half the MSE."
assert _np.isclose(huber(_np.array([1.0])), 0.5) and _np.isclose(huber(_np.array([-1.0])), 0.5), "At the threshold the two pieces of Huber must agree (0.5 for an error of 1)."
"SUCCESS: Three views of the same errors."
```

Hint: Each is a mean over the array. For Huber, `np.where(np.abs(e) <= delta, small_case, large_case)` picks the right formula for each error.
:::

::: challenge The best constant [easy]
Write a function `best_constant(y, loss, candidates)` that returns the candidate value `c` that minimises `loss(c - y)`, where `loss` is a function taking an array of errors and returning a number (like your functions above). Then, with the starter's `y`, check the lesson's claims: set `best_for_mse` using your `mse` and `best_for_mae` using your `mae`, searching `np.linspace(0, 50, 5001)`.

```python starter
import numpy as np

def mse(e):
    return float(np.mean(e ** 2))

def mae(e):
    return float(np.mean(np.abs(e)))

def best_constant(y, loss, candidates):
    return 0.0

y = np.array([1.0, 2.0, 2.0, 3.0, 50.0])
best_for_mse = 0.0
best_for_mae = 0.0
print(best_for_mse, best_for_mae)
```

```python solution
import numpy as np

def mse(e):
    return float(np.mean(e ** 2))

def mae(e):
    return float(np.mean(np.abs(e)))

def best_constant(y, loss, candidates):
    losses = [loss(c - y) for c in candidates]
    return float(candidates[int(np.argmin(losses))])

y = np.array([1.0, 2.0, 2.0, 3.0, 50.0])
grid = np.linspace(0, 50, 5001)
best_for_mse = best_constant(y, mse, grid)
best_for_mae = best_constant(y, mae, grid)
print(best_for_mse, best_for_mae)
```

```python test
import numpy as _np
assert "best_constant" in dir(), "Keep the function's name as best_constant."
_grid = _np.linspace(0, 10, 1001)
assert _np.isclose(best_constant(_np.array([1.0, 2.0, 6.0]), lambda e: float(_np.mean(e ** 2)), _grid), 3.0), "For [1, 2, 6] the squared-error best constant is the mean, 3."
assert _np.isclose(best_constant(_np.array([1.0, 2.0, 6.0]), lambda e: float(_np.mean(_np.abs(e))), _grid), 2.0), "For [1, 2, 6] the absolute-error best constant is the median, 2."
assert _np.isclose(best_for_mse, 11.6), f"The mean of [1, 2, 2, 3, 50] is 11.6, but best_for_mse is {best_for_mse}."
assert _np.isclose(best_for_mae, 2.0), f"The median of [1, 2, 2, 3, 50] is 2, but best_for_mae is {best_for_mae}."
"SUCCESS: Squared error chose the mean, dragged to 11.6 by one value; absolute error chose the median, 2."
```

Hint: Compute the loss for every candidate, remembering that the errors are `c − y` (a whole array for each `c`), then return the candidate at the position of the smallest loss.
:::

::: challenge Forecast for asymmetric costs [medium]
A shop sells a product whose daily demand varies. Running out costs the shop 4 times as much per missing item as having one unsold item left over. With costs in that ratio, the right `q` for the pinball loss is 4 / (4 + 1) = 0.8.

Write a function `pinball(c, y, q)` returning the mean pinball loss of forecasting `c` for every value in the array `y`, and `best_forecast(y, q)` returning the whole number from `y.min()` to `y.max()` (inclusive) with the lowest pinball loss. Then store the best forecast for the starter's demand, with `q = 0.8`, in `order_quantity`.

```python starter
import numpy as np

def pinball(c, y, q):
    return 0.0

def best_forecast(y, q):
    return 0

rng = np.random.default_rng(7)
demand = rng.poisson(lam=40, size=500)
order_quantity = 0
print(order_quantity)
```

```python solution
import numpy as np

def pinball(c, y, q):
    return float(np.mean(np.where(c < y, q * (y - c), (1 - q) * (c - y))))

def best_forecast(y, q):
    candidates = np.arange(y.min(), y.max() + 1)
    losses = [pinball(c, y, q) for c in candidates]
    return int(candidates[int(np.argmin(losses))])

rng = np.random.default_rng(7)
demand = rng.poisson(lam=40, size=500)
order_quantity = best_forecast(demand, 0.8)
print(order_quantity)
```

```python test
import numpy as _np
assert "pinball" in dir() and "best_forecast" in dir(), "Keep both function names."
_y = _np.array([10.0, 20.0, 30.0])
assert _np.isclose(pinball(20.0, _y, 0.5), (5 + 0 + 5) / 3), "With q = 0.5, forecasting 20 for [10, 20, 30] costs (0.5×10 + 0 + 0.5×10)/3."
assert _np.isclose(pinball(20.0, _y, 0.8), (0.2 * 10 + 0 + 0.8 * 10) / 3), "With q = 0.8, over-forecasting 10 costs 0.2 per unit and under-forecasting 10 costs 0.8 per unit."
_rng = _np.random.default_rng(7)
_d = _rng.poisson(lam=40, size=500)
_cands = _np.arange(_d.min(), _d.max() + 1)
_want = int(_cands[_np.argmin([_np.mean(_np.where(c < _d, 0.8 * (_d - c), 0.2 * (c - _d))) for c in _cands])])
assert order_quantity == _want, f"The best forecast for q = 0.8 is {_want}, but order_quantity is {order_quantity}."
assert order_quantity > _np.median(_d), "With running out costing more, the best forecast should be above the median demand."
"SUCCESS: The loss turned a business cost into the right forecast: about the 80th percentile of demand."
```

Hint: Inside `pinball`, `np.where(c < y, ..., ...)` picks the under-forecast cost or the over-forecast cost for each value of `y`. For `best_forecast`, try every whole number from the smallest demand to the largest with `np.arange`.
:::

## What you learned

- The loss defines what "best" means. For errors `e = ŷ − y`: squared error e², absolute error |e|, and Huber (squared near zero, linear beyond δ).
- The best constant prediction is the mean under squared error and the median under absolute error. That is why squared error is dragged by outliers and absolute error is robust.
- Robust losses (absolute, Huber) keep a fit close to the bulk of the data when a few points are wildly wrong. `scipy.optimize.minimize` finds the minimum of any loss.
- Squared error stays popular for its smooth gradients, exact solutions, and suitability for normal noise; Huber combines smoothness and robustness.
- The pinball loss with level `q` charges under- and over-prediction differently; its best constant is the `q` quantile. Set `q` from the relative costs.
- Classification is trained with smooth losses on probabilities (log loss), because counting mistakes gives no gradient.
- Choose the loss that matches what a mistake really costs; the reported metric can differ from the training loss.

The last few lessons found the best line with formulas. Next you will study the general method that works for every model, including ones with no formula at all: gradient descent, in depth.
