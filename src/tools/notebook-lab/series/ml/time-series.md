# Time series

Daily sales, hourly electricity demand, a patient's heart rate, a stock price: a **time series** is a sequence of measurements in time order, and forecasting its next values is one of the most common jobs in applied machine learning. It breaks an assumption that most of this series has quietly relied on: that examples are **independent**. Today's sales are strongly related to yesterday's and to last Saturday's. That relationship is what makes forecasting possible, and also what makes the usual ways of evaluating models dangerously misleading.

This lesson works through a realistic simulated sales series: its components (trend, seasonality, noise), **autocorrelation**, the simple **baselines** any model must beat, **autoregressive** models built from lagged values, honest **time-ordered validation**, and what happens to errors when forecasting further ahead.

## Anatomy of a series

Two years of daily sales, simulated from three parts: a slow upward **trend**, a **weekly pattern** (quiet on Monday and Tuesday, busy on Friday and Saturday), and **noise** that is itself correlated: a busy-for-no-reason day tends to be followed by another (each day's noise is 0.6 times yesterday's plus a fresh random amount).

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
n = 730
day = np.arange(n)
weekly = np.array([0, -5, -3, 0, 6, 18, 14])
noise = np.zeros(n)
for i in range(1, n):
    noise[i] = 0.6 * noise[i - 1] + rng.normal(0, 4)
sales = 100 + 0.05 * day + weekly[day % 7] + noise

for lag in [1, 2, 7, 14]:
    print(f"correlation between each day and the day {lag:>2} before: {np.corrcoef(sales[:-lag], sales[lag:])[0, 1]:.2f}")

fig, axes = plt.subplots(2, 1, figsize=(8, 5))
axes[0].plot(day, sales, linewidth=0.7)
axes[0].set_title("two years of daily sales", fontsize=9)
axes[1].plot(day[:56], sales[:56], marker=".")
axes[1].set_title("the first eight weeks", fontsize=9)
plt.show()
```

```output
correlation between each day and the day  1 before: 0.79
correlation between each day and the day  2 before: 0.48
correlation between each day and the day  7 before: 0.88
correlation between each day and the day 14 before: 0.88
```

`weekly[day % 7]` picks the weekly effect for each day: `day % 7` cycles through 0 to 6. The correlation between a series and itself shifted by k steps is its **autocorrelation** at lag k. Here it is 0.79 at lag 1 (yesterday says a lot about today), drops to 0.48 at lag 2, and jumps back to 0.88 at lags 7 and 14: the same weekday last week is the best single clue. Looking at autocorrelations is the first thing to do with any series; they say which past values a model should use.

## Split by time, and set baselines

Evaluating a forecast means pretending to stand at some moment, forecasting what came after, and comparing. So the test set must be the **last** part of the series: here, the final 90 days, with the first 640 for training. A random split would let the model learn from days after the ones it is tested on, the time leakage from the leakage lesson.

Before any model, compute **baselines**. They are often embarrassingly hard to beat:

- **Mean**: predict the training average every day.
- **Naive**: predict that each day equals the day before (the "last value").
- **Seasonal naive**: predict that each day equals the same weekday one week earlier.

The error measure used here is the **mean absolute error** (MAE), the average size of the miss in units of sales, which is easy to explain to the people using a forecast. The naive baselines below use the **actual** previous values, so each is a one-step-ahead forecast. Predict before running: which baseline will win?

```python type
import numpy as np

rng = np.random.default_rng(0)
n = 730
day = np.arange(n)
weekly = np.array([0, -5, -3, 0, 6, 18, 14])
noise = np.zeros(n)
for i in range(1, n):
    noise[i] = 0.6 * noise[i - 1] + rng.normal(0, 4)
sales = 100 + 0.05 * day + weekly[day % 7] + noise
train, test = sales[:640], sales[640:]

def mae(forecast, actual):
    return np.mean(np.abs(forecast - actual))

print(f"mean of the training data:          MAE {mae(np.full(90, train.mean()), test):.2f}")
print(f"naive (yesterday's value):          MAE {mae(sales[639:729], test):.2f}")
print(f"seasonal naive (same day last week): MAE {mae(sales[633:723], test):.2f}")
```

```output
mean of the training data:          MAE 18.86
naive (yesterday's value):          MAE 7.68
seasonal naive (same day last week): MAE 5.14
```

`sales[639:729]` is the series shifted by one day, lined up with the test days; `sales[633:723]` is shifted by seven. The training mean misses by about 19 on average: it ignores the trend (sales have grown since the start of training) and the weekly pattern. Yesterday's value does much better (7.7), and the same day last week is best (5.1), because it captures the weekly pattern. Any model worth deploying must beat 5.1.

## Autoregressive models

An **autoregressive** model predicts the next value from the previous ones, with learned weights. In its simplest form, AR(p), it is linear regression on the last p values (the **lags**):

\[
\hat y_t = c + w_1 y_{t-1} + w_2 y_{t-2} + \cdots + w_p y_{t-p}
\]

Turning a series into a regression problem just means building a table: one row per day, with that day's previous values as the features and the day's value as the target. Other features can join the lags: the day of the week, one-hot encoded, and the day number, for the trend. Then any regression model can be used.

```python type
import numpy as np
from sklearn.linear_model import LinearRegression

rng = np.random.default_rng(0)
n = 730
day = np.arange(n)
weekly = np.array([0, -5, -3, 0, 6, 18, 14])
noise = np.zeros(n)
for i in range(1, n):
    noise[i] = 0.6 * noise[i - 1] + rng.normal(0, 4)
sales = 100 + 0.05 * day + weekly[day % 7] + noise

lags = 14
lagged = np.column_stack([sales[lags - k - 1:n - k - 1] for k in range(lags)])
target = sales[lags:]
days = np.arange(lags, n)
features = np.column_stack([lagged, np.eye(7)[days % 7], days])

split = 640 - lags
model = LinearRegression().fit(features[:split], target[:split])
forecast = model.predict(features[split:])
print(f"one-step-ahead MAE on the last 90 days: {np.mean(np.abs(forecast - target[split:])):.2f}")
print("weights on the previous 1, 2 and 3 days:", model.coef_[:3].round(2))
```

```output
one-step-ahead MAE on the last 90 days: 3.13
weights on the previous 1, 2 and 3 days: [ 0.6  -0.   -0.02]
```

Column `k` of `lagged` holds the value from `k + 1` days earlier: for target day `t`, the features are days t − 1, t − 2, …, t − 14. `np.eye(7)[days % 7]` one-hot encodes the weekday. Because the first 14 days have no complete history, the table starts at day 14, so the train/test split moves back by 14 rows to keep the same 90 test days.

The model's error is 3.13, well below the seasonal naive 5.14. Its weights recover the structure of the noise: about 0.6 on yesterday (the simulation's 0.6) and nearly 0 on the days before, since the weekday features already handle the weekly pattern. And 3.13 is about as good as it can get: the fresh noise each day has standard deviation 4, and the average absolute size of normal noise with standard deviation σ is σ√(2/π) ≈ 0.8σ, here about 3.2. What is left is unpredictable by any model.

## Validation that respects time

To tune or compare models, use cross-validation whose folds respect time. scikit-learn's `TimeSeriesSplit` makes folds that always train on an earlier stretch and test on the stretch right after it, with an expanding training window. Compare it with ordinary shuffled folds on the same lag table, for a gradient-boosted tree model and the linear model. Before running, predict: which kind of fold will make the trees look better?

```python type
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, TimeSeriesSplit, cross_val_score

rng = np.random.default_rng(0)
n = 730
day = np.arange(n)
weekly = np.array([0, -5, -3, 0, 6, 18, 14])
noise = np.zeros(n)
for i in range(1, n):
    noise[i] = 0.6 * noise[i - 1] + rng.normal(0, 4)
sales = 100 + 0.05 * day + weekly[day % 7] + noise
lags = 14
lagged = np.column_stack([sales[lags - k - 1:n - k - 1] for k in range(lags)])
days = np.arange(lags, n)
features = np.column_stack([lagged, np.eye(7)[days % 7], days])
target = sales[lags:]

for name, model in [("boosted trees", HistGradientBoostingRegressor(random_state=0)), ("linear AR", LinearRegression())]:
    for fold_name, folds in [("shuffled folds", KFold(5, shuffle=True, random_state=0)), ("time-ordered folds", TimeSeriesSplit(5))]:
        error = -cross_val_score(model, features, target, cv=folds, scoring="neg_mean_absolute_error").mean()
        print(f"{name:<14} {fold_name:<19} MAE {error:.2f}")
```

```output
boosted trees  shuffled folds      MAE 3.86
boosted trees  time-ordered folds  MAE 4.78
linear AR      shuffled folds      MAE 3.23
linear AR      time-ordered folds  MAE 3.29
```

`scoring="neg_mean_absolute_error"` reports the MAE as a negative number (scikit-learn always maximises scores), hence the minus sign.

The shuffled folds flatter the trees: 3.86, against an honest 4.78 with time-ordered folds. Shuffled folds let the trees see days just before and just after every test day, so they interpolate; forecasting really requires extrapolating. The gap is also a lesson about the models: trees **cannot extrapolate a trend**, because tree models cannot predict far outside the range of targets they were trained on, so as sales keep growing past anything seen in training, the trees fall behind. The linear model, which can extend the trend, scores 3.29 with honest folds. Here both kinds of fold happen to rank the linear model first, but shuffled folds understate the trees' error by almost 1, hiding exactly the weakness (failing to extrapolate) that would hurt in real forecasting; with closer competitors, that bias could easily reverse a decision.

## Forecasting further ahead

A one-step forecast uses yesterday's **actual** value. To forecast 30 days ahead, those values do not exist yet. The common solution is a **recursive** forecast: predict tomorrow, append the prediction to the history as if it were real, predict the next day from that, and so on. Errors then feed on themselves, and uncertainty grows with the horizon. In this series (the second challenge builds the recursive forecast), the error stays fairly flat, about 3.1 for the first week and 3.4 after that, because the trend and the weekly pattern are perfectly regular and only the noise, whose memory fades quickly (0.6 per day), is lost; on real data, where the pattern itself drifts, multi-step errors grow much faster. A forecast should always come with the horizon it was evaluated at.

## Beyond this lesson

Classical statistical forecasting has a large toolkit: ARIMA models (autoregression on a differenced series, plus moving-average terms), exponential smoothing, and seasonal decomposition, in packages such as `statsmodels`. Machine learning approaches turn the series into a lag table, as here, and use boosted trees (with the trend removed first) or neural networks such as the recurrent networks and transformers from earlier lessons. For many business series, a well-tuned seasonal baseline or exponential smoothing is hard to beat; always measure against one.

::: challenge Build a lag table [easy]
Write `lag_table(series, lags)` returning a tuple `(X, y)`: `y` is the series from position `lags` onwards, and `X` has one row per target and `lags` columns, where column `k` holds the value `k + 1` steps before the target (so column 0 is the previous value).

```python starter
import numpy as np

def lag_table(series, lags):
    return np.zeros((0, lags)), np.zeros(0)

X, y = lag_table(np.arange(10.0), 3)
print(X[:3], y[:3])
```

```python solution
import numpy as np

def lag_table(series, lags):
    series = np.asarray(series, dtype=float)
    n = len(series)
    X = np.column_stack([series[lags - k - 1:n - k - 1] for k in range(lags)])
    return X, series[lags:]

X, y = lag_table(np.arange(10.0), 3)
print(X[:3], y[:3])
```

```python test
import numpy as _np
assert "lag_table" in dir(), "Keep the function's name as lag_table."
_X, _y = lag_table(_np.arange(10.0), 3)
assert _np.shape(_X) == (7, 3) and _np.shape(_y) == (7,), f"For 10 values and 3 lags there are 7 targets: X should be (7, 3) and y (7,), not {_np.shape(_X)} and {_np.shape(_y)}."
assert _np.array_equal(_y, _np.arange(3.0, 10.0)), "y should be the series from position 3 onwards."
assert _np.array_equal(_X[0], [2.0, 1.0, 0.0]) and _np.array_equal(_X[-1], [8.0, 7.0, 6.0]), "Row 0 (target 3) should hold [2, 1, 0]: the previous value first."
_s = _np.random.default_rng(0).normal(size=30)
_X2, _y2 = lag_table(_s, 5)
assert all(_np.array_equal(_X2[i], _s[i:i + 5][::-1]) for i in range(len(_y2))), "Each row should hold the 5 values before its target, most recent first."
"SUCCESS: A series turned into an ordinary regression table: past values as features, the next value as the target."
```

Hint: Column `k` is the series shifted by `k + 1`: `series[lags - k - 1:n - k - 1]`. Stack the columns with `np.column_stack`.
:::

::: challenge Seasonal naive, far ahead [medium]
A seasonal naive forecast for many steps ahead repeats the **last complete season** of the history. Write `seasonal_naive(history, season, horizon)` returning `horizon` forecasts: the last `season` values of `history`, repeated as often as needed (and cut to length).

Then compare it with a **recursive** forecast from the lesson's linear AR model over the 90 test days, both starting from the end of the 640 training days, with no access to any test values. The starter builds the series and trains the model on the lag table (lags, weekday and day number, as in the lesson). Store the seasonal naive MAE over the 90 days in `mae_seasonal` and the recursive AR forecast's MAE in `mae_recursive`. For the recursive forecast, keep a list of the history; for each future day, build that day's feature row from the last 14 values of the list (most recent first), its weekday one-hot and its day number, predict, and append the prediction.

```python starter
import numpy as np
from sklearn.linear_model import LinearRegression

def seasonal_naive(history, season, horizon):
    return np.zeros(horizon)

rng = np.random.default_rng(0)
n = 730
day = np.arange(n)
weekly = np.array([0, -5, -3, 0, 6, 18, 14])
noise = np.zeros(n)
for i in range(1, n):
    noise[i] = 0.6 * noise[i - 1] + rng.normal(0, 4)
sales = 100 + 0.05 * day + weekly[day % 7] + noise
lags = 14
lagged = np.column_stack([sales[lags - k - 1:n - k - 1] for k in range(lags)])
days = np.arange(lags, n)
features = np.column_stack([lagged, np.eye(7)[days % 7], days])
model = LinearRegression().fit(features[:640 - lags], sales[lags:640])

mae_seasonal = 0.0
mae_recursive = 0.0
print(mae_seasonal, mae_recursive)
```

```python solution
import numpy as np
from sklearn.linear_model import LinearRegression

def seasonal_naive(history, season, horizon):
    last = np.asarray(history)[-season:]
    return np.resize(last, horizon)

rng = np.random.default_rng(0)
n = 730
day = np.arange(n)
weekly = np.array([0, -5, -3, 0, 6, 18, 14])
noise = np.zeros(n)
for i in range(1, n):
    noise[i] = 0.6 * noise[i - 1] + rng.normal(0, 4)
sales = 100 + 0.05 * day + weekly[day % 7] + noise
lags = 14
lagged = np.column_stack([sales[lags - k - 1:n - k - 1] for k in range(lags)])
days = np.arange(lags, n)
features = np.column_stack([lagged, np.eye(7)[days % 7], days])
model = LinearRegression().fit(features[:640 - lags], sales[lags:640])

test = sales[640:]
mae_seasonal = np.mean(np.abs(seasonal_naive(sales[:640], 7, 90) - test))
history = list(sales[:640])
forecast = []
for d in range(640, 730):
    row = np.concatenate([np.array(history[::-1][:lags]), np.eye(7)[d % 7], [d]])
    prediction = model.predict(row[None, :])[0]
    forecast.append(prediction)
    history.append(prediction)
mae_recursive = np.mean(np.abs(np.array(forecast) - test))
print(mae_seasonal, mae_recursive)
```

```python test
import numpy as _np
from sklearn.linear_model import LinearRegression as _LR
assert "seasonal_naive" in dir(), "Keep the function's name as seasonal_naive."
assert _np.array_equal(seasonal_naive(_np.arange(10.0), 3, 7), [7, 8, 9, 7, 8, 9, 7]), "With history 0..9, season 3 and horizon 7, the forecast repeats [7, 8, 9] and is cut to 7 values."
assert _np.array_equal(seasonal_naive(_np.arange(10.0), 4, 2), [6, 7]), "A horizon shorter than the season uses just the start of the last season."
_r = _np.random.default_rng(0)
_n = 730; _day = _np.arange(_n); _w = _np.array([0, -5, -3, 0, 6, 18, 14]); _nz = _np.zeros(_n)
for _i in range(1, _n):
    _nz[_i] = 0.6 * _nz[_i - 1] + _r.normal(0, 4)
_s = 100 + 0.05 * _day + _w[_day % 7] + _nz
_lag = _np.column_stack([_s[14 - k - 1:_n - k - 1] for k in range(14)])
_dd = _np.arange(14, _n)
_F = _np.column_stack([_lag, _np.eye(7)[_dd % 7], _dd])
_m = _LR().fit(_F[:626], _s[14:640])
_test = _s[640:]
assert _np.isclose(mae_seasonal, _np.mean(_np.abs(_np.resize(_s[633:640], 90) - _test))), "mae_seasonal should repeat the last 7 training days across all 90 test days."
_h = list(_s[:640]); _fc = []
for _d in range(640, 730):
    _row = _np.concatenate([_np.array(_h[::-1][:14]), _np.eye(7)[_d % 7], [_d]])
    _p = _m.predict(_row[None, :])[0]; _fc.append(_p); _h.append(_p)
_want = _np.mean(_np.abs(_np.array(_fc) - _test))
assert not _np.isclose(mae_recursive, 3.13, atol=0.01), "That looks like the one-step error: the recursive forecast must feed its own predictions back in, never the test values."
assert _np.isclose(mae_recursive, _want), f"mae_recursive should be about {_want:.2f}. Build each row from the last 14 values of the growing history, most recent first."
f"SUCCESS: Forecasting all 90 days from the end of training, repeating last week scores MAE {mae_seasonal:.2f}; the recursive AR forecast scores {mae_recursive:.2f}: the trend term keeps it on track as sales grow, while the repeated week falls behind."
```

Hint: `np.resize(last, horizon)` repeats an array cyclically to a given length. For the recursive loop, `history[::-1][:lags]` gives the last 14 values with the most recent first.
:::

::: challenge Estimate the noise's memory [medium]
After removing the trend and the weekly pattern, what remains of the lesson's series is the noise, which was simulated as noise_t = 0.6 · noise_(t−1) + fresh noise with standard deviation 4. Recover both numbers from the data.

Write `fit_ar1(residuals)` returning a tuple `(phi, sigma)`: φ by least squares, regressing each residual on the one before it without an intercept (φ = Σ rₜrₜ₋₁ / Σ rₜ₋₁²), and σ as the standard deviation of the leftover errors rₜ − φ·rₜ₋₁. Then compute the residuals yourself: fit `LinearRegression` on the training days (the first 640) with features day number and weekday one-hot, take its residuals on those days, and store the result of `fit_ar1` in `estimate`.

```python starter
import numpy as np
from sklearn.linear_model import LinearRegression

def fit_ar1(residuals):
    return 0.0, 1.0

rng = np.random.default_rng(0)
n = 730
day = np.arange(n)
weekly = np.array([0, -5, -3, 0, 6, 18, 14])
noise = np.zeros(n)
for i in range(1, n):
    noise[i] = 0.6 * noise[i - 1] + rng.normal(0, 4)
sales = 100 + 0.05 * day + weekly[day % 7] + noise

estimate = (0.0, 1.0)
print(estimate)
```

```python solution
import numpy as np
from sklearn.linear_model import LinearRegression

def fit_ar1(residuals):
    r = np.asarray(residuals, dtype=float)
    phi = np.sum(r[1:] * r[:-1]) / np.sum(r[:-1] ** 2)
    sigma = np.std(r[1:] - phi * r[:-1])
    return float(phi), float(sigma)

rng = np.random.default_rng(0)
n = 730
day = np.arange(n)
weekly = np.array([0, -5, -3, 0, 6, 18, 14])
noise = np.zeros(n)
for i in range(1, n):
    noise[i] = 0.6 * noise[i - 1] + rng.normal(0, 4)
sales = 100 + 0.05 * day + weekly[day % 7] + noise

X = np.column_stack([day[:640], np.eye(7)[day[:640] % 7]])
residuals = sales[:640] - LinearRegression().fit(X, sales[:640]).predict(X)
estimate = fit_ar1(residuals)
print(estimate)
```

```python test
import numpy as _np
from sklearn.linear_model import LinearRegression as _LR
assert "fit_ar1" in dir(), "Keep the function's name as fit_ar1."
_r = _np.random.default_rng(9)
_e = _np.zeros(5000)
for _i in range(1, 5000):
    _e[_i] = -0.4 * _e[_i - 1] + _r.normal(0, 2)
_phi, _sig = fit_ar1(_e)
assert abs(_phi + 0.4) < 0.03 and abs(_sig - 2) < 0.06, f"On a long simulated series with φ = −0.4 and σ = 2, fit_ar1 gave ({_phi:.3f}, {_sig:.3f})."
_x = _np.array([1.0, 2.0, 1.0, 2.0])
assert _np.isclose(fit_ar1(_x)[0], (2 + 2 + 2) / (1 + 4 + 1)), "φ should be sum(r_t × r_(t−1)) / sum(r_(t−1)²), with no intercept."
_rng = _np.random.default_rng(0)
_n = 730; _day = _np.arange(_n); _w = _np.array([0, -5, -3, 0, 6, 18, 14]); _nz = _np.zeros(_n)
for _i in range(1, _n):
    _nz[_i] = 0.6 * _nz[_i - 1] + _rng.normal(0, 4)
_s = 100 + 0.05 * _day + _w[_day % 7] + _nz
_X = _np.column_stack([_day[:640], _np.eye(7)[_day[:640] % 7]])
_res = _s[:640] - _LR().fit(_X, _s[:640]).predict(_X)
_want = fit_ar1(_res)
assert _np.allclose(estimate, _want), f"estimate should be about ({_want[0]:.3f}, {_want[1]:.3f}): fit trend and weekday on the first 640 days, then fit_ar1 to the residuals."
f"SUCCESS: From 640 days of sales you recovered the noise's memory φ ≈ {estimate[0]:.2f} and its fresh variation σ ≈ {estimate[1]:.2f} (simulated with 0.6 and 4)."
```

Hint: With `r = residuals`, the pairs are `r[1:]` (each value) and `r[:-1]` (the one before). For the residuals, the features are the day number and `np.eye(7)[day % 7]` for the first 640 days.
:::

## What you learned

- A time series combines trend, seasonality and noise; autocorrelation at each lag shows which past values matter (here lag 1 and lag 7).
- Test on the last stretch of time, never a random sample. Compute baselines first: the mean, the naive last value and the seasonal naive (same time last season) are often hard to beat.
- Autoregressive models regress each value on its lags, plus features such as weekday and trend; on the simulated sales, MAE 3.13 against the seasonal naive's 5.14, close to the noise floor.
- Shuffled cross-validation is optimistic for time series; use `TimeSeriesSplit`. Trees cannot extrapolate a trend, which honest folds reveal.
- Multi-step forecasts feed predictions back in recursively, so errors can grow with the horizon (only slightly here, much more on real data whose patterns drift); always report the horizon.

The rest of the series turns to a different kind of learning altogether. Instead of learning from a fixed dataset, a **reinforcement learning** agent learns by acting in a world and receiving rewards. The next lesson sets up the problem: agents, environments, states, actions and rewards, in a small grid world.
